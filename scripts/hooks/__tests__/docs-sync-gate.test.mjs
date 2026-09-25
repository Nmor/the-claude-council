// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
// docs-sync-gate.js (Stop): a turn does not end with THIS project's plan or memory describing the
// old world. Split out of plan-docs-gates.test.mjs, which keeps the commit and push gates.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, cleanup, advice, said } from './helpers.mjs';
import { pc, git, ago, setMtime, memoryIndex, world, edit } from './plan-world.mjs';

describe('docs-sync-gate.js (Stop) — a turn does not end with the plan describing the old world', () => {
  const stop = (w, extra = {}, env = {}) =>
    run('docs-sync-gate.js', { session_id: uniq('sid'), cwd: w.repo, transcript_path: w.transcript, stop_hook_active: false, ...extra }, { ...w.env, ...env });

  // carries: "blocks a completed todo when source changed and nothing else did"
  test('refuses to end a turn whose code changed after the plan was last updated', () => {
    const w = world();
    edit(w, 'service.go');
    const r = stop(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /plan was last updated/);
  });

  // carries: "names all three surfaces that were skipped"
  test('names the plan to update and the files that moved', () => {
    const w = world();
    edit(w, 'service.go');
    const r = stop(w);
    assert.match(r.stderr, /work\.md/);
    assert.match(r.stderr, /service\.go/);
  });

  // carries: "names only the surface actually missing when the other two were updated"
  test('is silent once the plan has been updated after the code', () => {
    const w = world();
    edit(w, 'service.go');
    setMtime(w.plan, new Date(Date.now() + 1000));
    assert.equal(stop(w).code, 0);
  });

  test('a test file counts as work that finished a task', () => {
    const w = world();
    edit(w, 'service_test.go');
    assert.equal(stop(w).code, 2);
  });

  test('ignores the owner\'s own uncommitted work that predates this session', () => {
    // Otherwise every turn would be blocked by edits this session never made.
    const w = world({ planAge: 7200 });
    edit(w, 'service.go');
    setMtime(join(w.repo, 'service.go'), ago(3600));
    // A transcript created now: this session began after that edit was made.
    w.transcript = join(w.base, 'later-session.jsonl');
    writeFileSync(w.transcript, '');
    assert.equal(stop(w).code, 0);
  });

  test('blocks at most once per stop, so it can never loop', () => {
    const w = world();
    edit(w, 'service.go');
    assert.equal(stop(w, { stop_hook_active: true }).code, 0);
  });

  // Replaces "stays out of the way when no plan exists anywhere": with several projects' plans
  // in one folder, "a plan exists somewhere" said nothing about THIS project.
  test('a project that names no plan is asked to name one, in its own memory index', () => {
    const w = world({ pointer: false });
    edit(w, 'service.go');
    const r = stop(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /Active plan:/);
    assert.ok(r.stderr.includes(join(pc.memoryDir(w.repo, w.home), 'MEMORY.md')), r.stderr);
  });

  test('a project that declares it runs without a plan is left alone', () => {
    const w = world({ pointer: false });
    memoryIndex(w.home, w.repo, 'Active plan: none');
    edit(w, 'service.go');
    assert.equal(stop(w).code, 0);
  });

  test('a named plan that no longer exists is reported, not silently skipped', () => {
    const w = world();
    rmSync(w.plan);
    edit(w, 'service.go');
    const r = stop(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /work\.md.*(no longer exists|does not exist)/);
  });

  test("another project's plan edit does not satisfy this project's gate", () => {
    const w = world();
    const other = join(w.home, '.claude', 'plans', 'other-project.md');
    writeFileSync(other, '# someone else\n');
    setMtime(other, new Date(Date.now() + 5000)); // newest plan in the shared folder
    edit(w, 'service.go');
    const r = stop(w);
    assert.equal(r.code, 2, 'the newest plan belongs to another project');
    assert.match(r.stderr, /work\.md/);
    assert.doesNotMatch(r.stderr, /other-project/);
  });

  test("a memory entry citing a file that no longer exists blocks, even with the plan current", () => {
    const w = world();
    writeFileSync(join(w.mem, 'fact.md'), `---\nname: f\ndescription: d\ntype: project\n---\nSee /tmp/gone-${process.pid}/x.go.\n`);
    writeFileSync(join(w.mem, 'MEMORY.md'), `# Memory Index\n\nActive plan: ${w.plan}\n- [f](fact.md) — x\n`);
    edit(w, 'service.go');
    setMtime(w.plan, new Date(Date.now() + 1000));
    const r = stop(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /dead-path/);
    assert.ok(r.stderr.includes(join(w.mem, 'fact.md')));
  });

  test('progress copied into memory blocks only when this session wrote it', () => {
    const w = world();
    const f = join(w.mem, 'status.md');
    writeFileSync(f, '---\nname: s\ndescription: d\ntype: project\n---\nPhase 2 IN PROGRESS.\n');
    writeFileSync(join(w.mem, 'MEMORY.md'), `# Memory Index\n\nActive plan: ${w.plan}\n- [s](status.md) — x\n`);
    setMtime(f, ago(7200)); // written before this session began
    edit(w, 'service.go');
    setMtime(w.plan, new Date(Date.now() + 1000));
    assert.equal(stop(w).code, 0, 'an old entry is not blocked on a pattern match');
    setMtime(f, new Date());
    const r = stop(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /progress-state/);
  });

  test('a turn that only edited memory is still checked', () => {
    const w = world();
    writeFileSync(join(w.mem, 'MEMORY.md'), `# Memory Index\n\nActive plan: ${w.plan}\n- [gone](gone.md) — x\n`);
    const r = stop(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /index-missing/);
  });

  test('says nothing when only docs changed', () => {
    const w = world();
    edit(w, 'README.md', '# changed\n');
    assert.equal(stop(w).code, 0);
  });

  // carries: "downgrades to a nudge when set to warn" + "says nothing at all when switched off"
  test('warn reports without blocking; off is silent', () => {
    const w = world();
    edit(w, 'service.go');
    const warned = stop(w, {}, { CLAUDE_DOCS_SYNC: 'warn' });
    assert.equal(warned.code, 0);
    assert.match(advice(warned), /docs-sync-gate/);
    const off = stop(w, {}, { CLAUDE_DOCS_SYNC: 'off' });
    assert.equal(off.code, 0);
    assert.equal(said(off).trim(), '');
  });

  // carries: "still reports the finding when the mode string is not one it recognises" — and
  // closes the defect that test could only record: an unknown value used to disable the block.
  test('an unrecognised mode fails CLOSED and still blocks', () => {
    const w = world();
    edit(w, 'service.go');
    assert.equal(stop(w, {}, { CLAUDE_DOCS_SYNC: 'true' }).code, 2);
  });

  // carries the marker integration: outside git, the Edit/Write marker is still the evidence
  test('outside a git repository it falls back to the Edit/Write marker', () => {
    const w = world();
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'nogit-')));
    memoryIndex(w.home, dir, `Active plan: ${w.plan}`);
    const sid = uniq('sid');
    try {
      run('docs-sync-marker.js', { session_id: sid, tool_name: 'Write', tool_input: { file_path: join(dir, 'app.go'), content: 'x' } });
      const r = run('docs-sync-gate.js', { session_id: sid, cwd: dir, transcript_path: w.transcript }, w.env);
      assert.equal(r.code, 2, 'the marker must reach the gate');
      setMtime(w.plan, new Date(Date.now() + 1000));
      assert.equal(run('docs-sync-gate.js', { session_id: sid, cwd: dir, transcript_path: w.transcript }, w.env).code, 0);
    } finally {
      cleanup(`claude-docs-sync-code-${sid}`);
    }
  });

  test('exits 0 on input it cannot read, including a bare null', () => {
    for (const junk of ['', 'null', '[]', '{not json']) assert.equal(run('docs-sync-gate.js', junk).code, 0, junk);
  });
});
