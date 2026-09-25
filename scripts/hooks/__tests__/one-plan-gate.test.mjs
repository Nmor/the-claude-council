// Size budget: 14 KB. Check: wc -c; gate: token-budget.mjs --check.
// one-plan-gate.js (PreToolUse): one plan file per workspace; new work enriches that plan.
// Every test names the way a second plan would otherwise slip in, or the real work it must not stop.
// The Bash write forms are in bash-writes.test.mjs.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { run, advice, said } from './helpers.mjs';
import { memoryIndex, planWorkspace as ws } from './plan-world.mjs';

const HOOK = 'one-plan-gate.js';
const write = (w, file, env = {}, cwd = w.root) =>
  run(HOOK, { tool_name: 'Write', cwd, tool_input: { file_path: file, content: '# x\n' } }, { ...w.env, ...env });
const edit = (w, file) =>
  run(HOOK, { tool_name: 'Edit', cwd: w.root, tool_input: { file_path: file, old_string: 'a', new_string: 'b' } }, w.env);
const bash = (w, command) => run(HOOK, { tool_name: 'Bash', cwd: w.root, tool_input: { command } }, w.env);

describe('one-plan-gate.js — a workspace keeps exactly one plan', () => {
  test('refuses a Write that starts a second plan beside the existing one', () => {
    const w = ws();
    const r = write(w, join(w.dir, 'remediation.md'));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /remediation\.md/);
    assert.match(r.stderr, /master\.md/, 'the refusal must name the plan to enrich instead');
  });

  test('names the Active plan from the memory index as the place to add the work', () => {
    const w = ws();
    memoryIndex(w.home, w.root, `Active plan: ${join(w.dir, 'master.md')}`);
    assert.match(write(w, join(w.dir, 'audit.md')).stderr, /Active plan: .*master\.md/);
  });

  test("names the TARGET workspace's Active plan, not the session cwd's", () => {
    // Found live: a session in project A was told to enrich A's plan when creating one in B.
    const a = ws({ plans: ['a-master.md'] });
    memoryIndex(a.home, a.root, `Active plan: ${join(a.dir, 'a-master.md')}`);
    const b = ws();
    memoryIndex(a.home, b.root, `Active plan: ${join(b.dir, 'master.md')}`);
    const r = write(b, join(b.dir, 'x.md'), a.env, a.root);
    assert.equal(r.code, 2);
    assert.match(r.stderr, new RegExp(`Active plan: ${join(b.dir, 'master.md')}`));
    assert.doesNotMatch(r.stderr, /a-master/);
    // A nested repo with no pointer of its own is sent to the ENCLOSING workspace's plan.
    const n = write(b, join(b.root, 'app', '.claude', 'plans', 'x.md'), a.env);
    assert.equal(n.code, 2);
    assert.match(n.stderr, new RegExp(`Active plan: ${join(b.dir, 'master.md')}`));
  });

  test("a nested repo whose pointer names its workspace's plan is refused even from another project's session", () => {
    // The enclosing walk stays inside the session's workspace; the nested repo's own pointer covers the rest.
    const a = ws({ plans: ['a-master.md'] });
    const b = ws();
    const app = join(b.root, 'app');
    memoryIndex(a.home, app, `Active plan: ${join(b.dir, 'master.md')}`);
    const r = write(b, join(app, '.claude', 'plans', 'x.md'), a.env, a.root);
    assert.equal(r.code, 2);
    assert.match(r.stderr, new RegExp(`Active plan: ${join(b.dir, 'master.md')}`));
  });

  test('allows the first plan in an empty plans dir, and in one not created yet', () => {
    const w = ws({ plans: [] });
    const r = write(w, join(w.dir, 'master.md'));
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '', 'the first plan is the rule working, not a violation');
    assert.equal(write(w, join(w.root, 'sub', '.claude', 'plans', 'x.md')).code, 0);
  });

  test('rewriting the existing sole plan is an edit, not a second plan, and is silent', () => {
    const w = ws();
    const r = write(w, join(w.dir, 'master.md'));
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });

  test('editing a plan while siblings exist is allowed but told to consolidate', () => {
    // Blocking edits would freeze a workspace already in violation; it must still be workable.
    const w = ws({ plans: ['master.md', 'audit.md'] });
    const r = edit(w, join(w.dir, 'master.md'));
    assert.equal(r.code, 0);
    assert.match(advice(r), /audit\.md/);
    assert.match(advice(r), /consolidate/i);
  });

  test('a data file in a plans subfolder is not a plan', () => {
    const w = ws();
    const r = write(w, join(w.dir, 'manifests', 'wave1.md'));
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });

  test('a plans folder that is not under .claude is an ordinary docs folder', () => {
    // Without the `.claude` parent check, every repo's docs/plans would become a plan directory.
    const w = ws();
    mkdirSync(join(w.root, 'docs', 'plans'), { recursive: true });
    writeFileSync(join(w.root, 'docs', 'plans', 'a.md'), '# a\n');
    const r = write(w, join(w.root, 'docs', 'plans', 'b.md'));
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });

  test('an archive outside .claude/plans is allowed, so consolidation can move files out', () => {
    const w = ws();
    assert.equal(write(w, join(w.home, '.claude', '.local', 'plans', 'old', 'audit.md')).code, 0);
    assert.equal(write(w, join(w.root, '.claude', 'plans-archive', 'audit.md')).code, 0);
  });

  test('a nested repo cannot start its own plan under a workspace that already has one', () => {
    const w = ws();
    const r = write(w, join(w.root, 'frontend-app', '.claude', 'plans', 'fe.md'));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /enclosing workspace plan: .*master\.md/);
  });

  test('a stray plan in a folder of unrelated projects blocks none of them', () => {
    // The walk stops at the session's workspace: a plan above it belongs to no project inside it.
    const w = ws({ plans: [] });
    const top = join(w.base, 'top');
    mkdirSync(join(top, '.claude', 'plans'), { recursive: true });
    writeFileSync(join(top, '.claude', 'plans', 'stray.md'), '# stray\n');
    const proj = join(top, 'proj');
    mkdirSync(proj);
    assert.equal(write(w, join(proj, '.claude', 'plans', 'master.md'), {}, proj).code, 0);
  });

  test("the walk stops at $HOME: plan-mode drafts in the shared folder do not block a workspace's first plan", () => {
    const w = ws({ plans: [], underHome: true });
    writeFileSync(join(w.home, '.claude', 'plans', 'other-project.md'), '# draft\n');
    assert.equal(write(w, join(w.dir, 'master.md'), {}, w.home).code, 0);
  });

  test('a HOME reached through a symlink still stops the walk and is still the shared folder', () => {
    // Paths compare canonically; a HOME given as a symlink must resolve on both sides.
    const w = ws({ plans: [], underHome: true });
    writeFileSync(join(w.home, '.claude', 'plans', 'other-project.md'), '# draft\n');
    const link = join(w.base, 'home-link');
    symlinkSync(w.home, link);
    const env = { HOME: link };
    assert.equal(write(w, join(link, 'work', 'ws', '.claude', 'plans', 'master.md'), env, link).code, 0);
    assert.equal(write(w, join(link, '.claude', 'plans', 'draft.md'), env, link).code, 0);
  });

  test('ignores files that are not in a plans dir at all', () => {
    const w = ws();
    const r = write(w, join(w.root, 'src', 'app.go'));
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });
});

describe('one-plan-gate.js — the same directory by another name is the same directory', () => {
  test('a case variant of .claude/plans is refused where the filesystem folds case', () => {
    const w = ws();
    const folds = existsSync(join(w.root, '.CLAUDE'));
    assert.equal(write(w, join(w.root, '.CLAUDE', 'PLANS', 'second.md')).code, folds ? 2 : 0);
  });

  test('a symlink to the plans dir is refused, and editing through it is still an edit', () => {
    const w = ws();
    symlinkSync(w.dir, join(w.base, 'plink'));
    assert.equal(write(w, join(w.base, 'plink', 'second.md')).code, 2);
    assert.equal(edit(w, join(w.base, 'plink', 'master.md')).code, 0);
  });

  test('a .markdown file is a plan too', () => {
    const w = ws();
    assert.equal(write(w, join(w.dir, 'second.markdown')).code, 2);
  });
});

describe('one-plan-gate.js — a rename is not a second plan', () => {
  test('renaming a plan beside its siblings is allowed and told to consolidate', () => {
    // Consolidation renames plans; refusing that would block the very step that fixes the violation.
    const w = ws({ plans: ['master.md', 'audit.md'] });
    for (const c of ['mv .claude/plans/audit.md .claude/plans/audit-old.md', 'git mv .claude/plans/audit.md .claude/plans/audit-old.md']) {
      const r = bash(w, c);
      assert.equal(r.code, 0, c);
      assert.match(advice(r), /consolidate/i, c);
    }
  });

  test("moving another workspace's plan in adds one, and is refused", () => {
    const w = ws();
    const other = ws({ plans: ['x.md'] });
    assert.equal(bash(w, `mv ${join(other.dir, 'x.md')} .claude/plans/x.md`).code, 2);
  });
});

describe('one-plan-gate.js — a shared-folder plan the pointer names is the workspace plan', () => {
  // Plan mode writes to the shared ~/.claude/plans; project-scoped-artifacts rule 9 binds the named one.
  const setup = () => {
    const w = ws({ plans: [] });
    const plan = join(w.home, '.claude', 'plans', 'glowing.md');
    writeFileSync(plan, '# plan\n');
    memoryIndex(w.home, w.root, `Active plan: ${plan}`);
    return { w, plan };
  };

  test('editing it is silent', () => {
    const { w, plan } = setup();
    const r = edit(w, plan);
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });

  test("a new plan in the workspace's own plans dir is a second plan, and refused", () => {
    const { w } = setup();
    const r = write(w, join(w.dir, 'remediation.md'));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /named by this workspace's Active plan pointer: .*glowing\.md/);
    assert.match(r.stderr, /Active plan: .*glowing\.md/);
  });

  test('a new draft beside it is advised to merge into it, not blocked', () => {
    const { w } = setup();
    const r = write(w, join(w.home, '.claude', 'plans', 'draft.md'));
    assert.equal(r.code, 0);
    assert.match(advice(r), /Merge it into this workspace's Active plan .*glowing\.md/);
  });

  test('moving it into the workspace is a rename, and repointing first also works', () => {
    const { w, plan } = setup();
    assert.equal(bash(w, `mv ${plan} .claude/plans/master.md`).code, 0);
    const target = join(w.dir, 'master.md');
    memoryIndex(w.home, w.root, `Active plan: ${target}`);
    assert.equal(write(w, target).code, 0);
  });
});

describe('one-plan-gate.js — the shared plan-mode folder is advised, never blocked', () => {
  test('a new draft beside other projects\' drafts is allowed and pointed at the Active plan', () => {
    const w = ws();
    const shared = join(w.home, '.claude', 'plans');
    writeFileSync(join(shared, 'another-project.md'), '# theirs\n');
    memoryIndex(w.home, w.root, `Active plan: ${join(w.dir, 'master.md')}`);
    const r = write(w, join(shared, 'draft.md'));
    assert.equal(r.code, 0);
    assert.match(advice(r), /Merge it into this workspace's Active plan/);
    assert.match(advice(r), /master\.md/);
  });

  test('says nothing about a draft when the workspace names no Active plan', () => {
    const w = ws();
    const r = write(w, join(w.home, '.claude', 'plans', 'draft.md'));
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
  });
});

describe('one-plan-gate.js — modes and failing open', () => {
  test('warn reports without blocking; off is silent', () => {
    const w = ws();
    const warned = write(w, join(w.dir, 'b.md'), { CLAUDE_ONE_PLAN_GATE: 'warn' });
    assert.equal(warned.code, 0);
    assert.match(advice(warned), /Refused/);
    const off = write(w, join(w.dir, 'b.md'), { CLAUDE_ONE_PLAN_GATE: 'off' });
    assert.equal(off.code, 0);
    assert.equal(said(off).trim(), '');
  });

  test('an unrecognised mode fails CLOSED and still blocks', () => {
    const w = ws();
    assert.equal(write(w, join(w.dir, 'b.md'), { CLAUDE_ONE_PLAN_GATE: 'true' }).code, 2);
  });

  test('exits 0 on input it cannot read', () => {
    for (const junk of ['', 'null', '[]', '{not json', '{"tool_name":"Bash","tool_input":{"command":7}}'])
      assert.equal(run(HOOK, junk).code, 0, junk);
  });

  test('fails open when the plans dir cannot be read', () => {
    const w = ws();
    chmodSync(w.dir, 0o000);
    try {
      assert.equal(write(w, join(w.dir, 'b.md')).code, 0);
    } finally {
      chmodSync(w.dir, 0o755);
    }
    assert.ok(existsSync(join(w.dir, 'master.md')));
  });
});

describe('settings.json — the gate is wired on both paths a plan can be created by', () => {
  // A gate registered only for Write would let `cat > second.md` through, and vice versa.
  const pre = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8')).hooks?.PreToolUse || [];
  const matchers = pre.filter((e) => (e.hooks || []).some((h) => String(h.command || '').includes(HOOK))).map((e) => e.matcher);
  test('registered for Edit|Write|MultiEdit and for Bash', () => {
    assert.deepEqual(matchers.sort(), ['Bash', 'Edit|Write|MultiEdit']);
  });
});
