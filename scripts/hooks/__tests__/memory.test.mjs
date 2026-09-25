// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// Project memory stays loadable, current and project-scoped.
//   lib/memory-lint.js      — findings that prove a memory entry stale or unloadable
//   lib/project-context.js  — which project a session is in, its memory, its active plan
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { lintMemory } = require('../lib/memory-lint.js');
const pc = require('../lib/project-context.js');

const fm = (name) => `---\nname: ${name}\ndescription: d\nmetadata:\n  type: project\n---\n\n`;

/** A memory directory holding `files` ({name: body}); MEMORY.md links every other file. */
function memory(files, { index } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mem-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  const links = Object.keys(files).map((f) => `- [${f}](${f}) — x`).join('\n');
  writeFileSync(join(dir, 'MEMORY.md'), index ?? `# Memory Index\n\n${links}\n`);
  return dir;
}
const kinds = (dir, opts) => lintMemory(dir, opts).map((f) => `${f.file}:${f.kind}`).sort();

describe('memory-lint — a memory entry that is wrong on its face is reported', () => {
  test('a clean directory has no findings', () => {
    assert.deepEqual(kinds(memory({ 'a.md': fm('a') + 'A fact.\n' })), []);
  });

  test('an index link to a file that does not exist', () => {
    const dir = memory({}, { index: '# Memory Index\n\n- [gone](gone.md) — x\n' });
    assert.deepEqual(kinds(dir), ['MEMORY.md:index-missing']);
  });

  test('a memory file the index never links is reported, since no session is pointed at it', () => {
    const dir = memory({ 'a.md': fm('a') }, { index: '# Memory Index\n' });
    assert.deepEqual(kinds(dir), ['a.md:index-unlisted']);
  });

  test('an index past what Claude Code loads: 201 lines, or 25 KB in fewer lines', () => {
    const long = memory({}, { index: Array.from({ length: 201 }, (_, i) => `line ${i}`).join('\n') + '\n' });
    assert.deepEqual(kinds(long), ['MEMORY.md:index-limit']);
    const wide = memory({}, { index: 'x'.repeat(25 * 1024 + 1) + '\n' });
    assert.deepEqual(kinds(wide), ['MEMORY.md:index-limit']);
    const edge = memory({}, { index: Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n') + '\n' });
    assert.deepEqual(kinds(edge), [], 'exactly 200 lines is loaded in full');
  });

  test('a memory file without name, description or type', () => {
    const dir = memory({ 'a.md': '---\nname: a\n---\nbody\n', 'b.md': 'no frontmatter\n' });
    const f = lintMemory(dir).filter((x) => x.kind === 'frontmatter');
    assert.deepEqual(f.map((x) => `${x.file}: ${x.message}`), [
      'a.md: frontmatter lacks description, type',
      'b.md: frontmatter lacks name, description, type',
    ]);
  });

  test('a cited absolute path that no longer exists, with its line; one that exists is not', () => {
    const real = mkdtempSync(join(tmpdir(), 'real-'));
    const dir = memory({ 'a.md': fm('a') + `Kept at ${real}/.\nMoved from /tmp/definitely-gone-${process.pid}/x.go:12.\n` });
    const f = lintMemory(dir).filter((x) => x.kind === 'dead-path');
    assert.equal(f.length, 1);
    assert.equal(f[0].line, 9);
    assert.match(f[0].message, new RegExp(`/tmp/definitely-gone-${process.pid}/x\\.go,`), 'the :12 line suffix is stripped');
  });

  test('placeholders and fenced examples are not claims about a real file', () => {
    const body = fm('a') + 'Stored at ~/.claude/projects/<project>/memory/.\n```\ncat /tmp/example-only/file\n```\n';
    assert.deepEqual(kinds(memory({ 'a.md': body })), []);
  });

  test('an example inside an HTML comment is not a link or a claim', () => {
    const index = '# Memory Index\n\n<!--\n- [example](not-real.md) — x\nSee /tmp/example-only-path/x.\n-->\n';
    assert.deepEqual(kinds(memory({}, { index })), []);
    const body = fm('a') + '<!-- was /tmp/gone-in-a-comment/x -->\nA fact.\n';
    assert.deepEqual(kinds(memory({ 'a.md': body })), []);
  });

  test('~ resolves against the home it is given', () => {
    const home = mkdtempSync(join(tmpdir(), 'home-'));
    mkdirSync(join(home, 'kept'));
    const dir = memory({ 'a.md': fm('a') + 'See ~/kept and ~/lost.\n' });
    assert.deepEqual(lintMemory(dir, { home }).map((f) => f.message), ['cites ~/lost, which no longer exists']);
  });

  test('progress copied out of a plan is reported, and marked as not proven', () => {
    const dir = memory({ 'a.md': fm('a') + '**Phase 2 — IN PROGRESS:**\nThe branch now points at abc123.\n' });
    const f = lintMemory(dir);
    assert.deepEqual(f.map((x) => x.kind), ['progress-state', 'progress-state']);
    assert.ok(f.every((x) => x.proven === false));
  });

  test('an Active plan line naming a plan that no longer exists', () => {
    const dir = memory({}, { index: `# Memory Index\n\nActive plan: /tmp/no-such-plan-${process.pid}.md\n` });
    assert.deepEqual(kinds(dir), ['MEMORY.md:dead-plan']);
    assert.deepEqual(kinds(memory({}, { index: '# Memory Index\n\nActive plan: none\n' })), []);
  });

  test('a directory that does not exist has no memory, so no findings', () => {
    assert.deepEqual(lintMemory(join(tmpdir(), `absent-${process.pid}`)), []);
  });
});

// ──────────────────────────────────────────────────────────────────────────
const git = (dir, ...args) =>
  execFileSync('git', ['-C', dir, ...args], { env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' }, stdio: 'pipe' }).toString();

/** A HOME and a git repo; the repo's memory index says `pointer`. */
function project(pointer, home = realpathSync(mkdtempSync(join(tmpdir(), 'home-')))) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'repo-')));
  git(repo, 'init', '-q');
  const mem = join(home, '.claude', 'projects', pc.projectKey(repo), 'memory');
  mkdirSync(mem, { recursive: true });
  if (pointer !== undefined) writeFileSync(join(mem, 'MEMORY.md'), `# Memory Index\n\n${pointer}\n`);
  return { home, repo, mem };
}

describe('project-context — each project resolves its own memory and plan', () => {
  test("the memory key is Claude Code's: path separators become dashes (as the real directories show)", () => {
    assert.equal(pc.projectKey('/Users/someone/work/my-app'), '-Users-someone-work-my-app');
  });

  test('a subdirectory and a worktree share the main checkout\'s memory', () => {
    const p = project('Active plan: none');
    mkdirSync(join(p.repo, 'sub'));
    git(p.repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-qm', 'base');
    const wt = `${p.repo}-wt`;
    git(p.repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'worktree', 'add', '-q', wt);
    assert.equal(pc.memoryDir(join(p.repo, 'sub'), p.home), p.mem);
    assert.equal(pc.memoryDir(wt, p.home), p.mem);
  });

  test('autoMemoryDirectory in the repo\'s local settings moves the memory', () => {
    const p = project(undefined);
    mkdirSync(join(p.repo, '.claude'));
    writeFileSync(join(p.repo, '.claude', 'settings.local.json'), JSON.stringify({ autoMemoryDirectory: '~/shared-mem' }));
    assert.equal(pc.memoryDir(p.repo, p.home), join(p.home, 'shared-mem'));
  });

  test('two projects sharing one plans folder each resolve to their own plan, never the newest', () => {
    const home = realpathSync(mkdtempSync(join(tmpdir(), 'home-')));
    mkdirSync(join(home, '.claude', 'plans'), { recursive: true });
    const planA = join(home, '.claude', 'plans', 'a.md');
    const planB = join(home, '.claude', 'plans', 'b.md');
    writeFileSync(planA, '# A\n');
    writeFileSync(planB, '# B, written last\n');
    const a = project(`- Active plan: [A](${planA})`, home);
    const b = project(`Active plan: ${planB}`, home);
    assert.equal(pc.activePlan(a.repo, home).path, planA);
    assert.equal(pc.activePlan(b.repo, home).path, planB);
  });

  test('an Active plan line inside an HTML comment is an example, not the pointer', () => {
    const p = project('<!--\nActive plan: /tmp/example-plan.md\n-->');
    assert.equal(pc.activePlan(p.repo, p.home).state, 'unset');
  });

  test('no pointer is "unset" and names the index the line belongs in; none and missing are distinct', () => {
    const unset = project(undefined);
    assert.deepEqual(pc.activePlan(unset.repo, unset.home), { state: 'unset', index: join(unset.mem, 'MEMORY.md') });
    const none = project('Active plan: none');
    assert.equal(pc.activePlan(none.repo, none.home).state, 'none');
    const gone = project(`Active plan: /tmp/no-such-plan-${process.pid}.md`);
    assert.equal(pc.activePlan(gone.repo, gone.home).state, 'missing');
  });
});

// ──────────────────────────────────────────────────────────────────────────
const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'memory-lint.mjs');
const cli = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8' });
const cliIn = (cwd, home, ...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: 'utf8', cwd, env: { ...process.env, HOME: home } });

describe('memory-lint.mjs — the command a person runs', () => {
  test('--check fails on a finding and names the file and line', () => {
    const dir = memory({}, { index: '# Memory Index\n\n- [gone](gone.md) — x\n' });
    const r = cli('--dir', dir, '--check');
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes(`${join(dir, 'MEMORY.md')}:3  index-missing`), r.stdout);
  });

  test('with no argument it lints the memory of the project the command runs in', () => {
    const p = project('- [gone](gone.md) — x');
    const r = cliIn(p.repo, p.home, '--check');
    assert.equal(r.status, 1);
    assert.ok(r.stdout.includes(`${join(p.mem, 'MEMORY.md')}:3  index-missing`), r.stdout);
  });

  test('--all counts every project read-only and skips the clean ones', () => {
    const home = realpathSync(mkdtempSync(join(tmpdir(), 'home-')));
    const dirty = project('- [gone](gone.md) — x', home);
    project('Active plan: none', home);
    const r = cliIn(tmpdir(), home, '--all', '--check');
    assert.equal(r.status, 1);
    assert.deepEqual(r.stdout.split('\n').filter(Boolean), [`   1  ${pc.projectKey(dirty.repo)}  {"index-missing":1}`]);
  });

  test('--all with no projects folder says so rather than reporting a clean bill', () => {
    const r = cliIn(tmpdir(), realpathSync(mkdtempSync(join(tmpdir(), 'home-'))), '--all');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /no project memory to lint: .* is unreadable \(ENOENT\)/);
  });

  test('--check passes a clean directory, and without --check a finding does not fail the run', () => {
    assert.equal(cli('--dir', memory({ 'a.md': fm('a') }), '--check').status, 0);
    assert.equal(cli('--dir', memory({}, { index: '- [gone](gone.md)\n' })).status, 0);
  });
});
