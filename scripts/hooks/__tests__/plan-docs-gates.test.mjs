// Size budget: 16 KB. Check: wc -c; gate: token-budget.mjs --check.
// The plan-and-docs discipline, end to end: "plan update as tasks are completed and doc updates
// before code changes are committed or pushed" (owner directive, 2026-09-21).
//
//   docs-sync-gate.js  (Stop)       — in docs-sync-gate.test.mjs
//   commit-gate.js     (PreToolUse) — a commit carries an up-to-date plan and docs, or a `Docs:` line
//   pre-push-gate.js   (PreToolUse) — no commit reaches a remote without docs or a `Docs:` line
//
// These replace the TodoWrite-era docs-sync tests. That version ran on PostToolUse, which cannot
// block, keyed on a tool some harnesses do not offer, and saw only Edit/Write changes. Every
// intent those tests pinned is carried forward below and says which one it carries.
//
// Everything runs against real throwaway git repositories and a throwaway HOME, so the hooks
// ask real git the questions they ask in use, and no test reads this machine's own plans.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, marker, cleanup } from './helpers.mjs';
import { ISOLATED, git, setMtime, world, edit } from './plan-world.mjs';

// ──────────────────────────────────────────────────────────────────────────
describe('commit-gate.js — a commit carries a current plan, and docs or a Docs: line', () => {
  // Satisfy (a) and (b) so each test isolates the plan / docs checks.
  const commit = (w, message, { stage = true } = {}) => {
    if (stage) git(w.repo, 'add', '-A');
    const sid = uniq('sid');
    const pid = uniq('pid');
    writeFileSync(marker(`claude-council-gate-${sid}`), `${Date.now() + 5000}\n${pid}`);
    writeFileSync(marker(`claude-council-coverage-${sid}`), '80');
    try {
      return run('commit-gate.js', {
        session_id: sid, prompt_id: pid, cwd: w.repo,
        tool_name: 'Bash', tool_input: { command: `git commit -m "${message}"` },
      }, w.env);
    } finally {
      cleanup(`claude-council-gate-${sid}`, `claude-council-coverage-${sid}`);
    }
  };

  test('refuses code committed while the plan is older than the code', () => {
    const w = world();
    edit(w, 'service.go');
    edit(w, 'CHANGELOG.md', '# c\n');
    const r = commit(w, 'feat: x');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /plan was last updated BEFORE/);
  });

  test('refuses code committed with no docs and no Docs: line', () => {
    const w = world();
    edit(w, 'service.go');
    setMtime(w.plan, new Date(Date.now() + 1000));
    const r = commit(w, 'feat: x');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /no documentation/);
  });

  test('accepts code with a current plan and a staged doc', () => {
    const w = world();
    edit(w, 'service.go');
    edit(w, 'CHANGELOG.md', '# c\n');
    setMtime(w.plan, new Date(Date.now() + 1000));
    assert.equal(commit(w, 'feat: x').code, 0);
  });

  test('accepts code with a current plan and an explicit Docs: decision', () => {
    const w = world();
    edit(w, 'service.go');
    setMtime(w.plan, new Date(Date.now() + 1000));
    assert.equal(commit(w, 'refactor: x\n\nDocs: none — internal refactor, no behaviour change').code, 0);
  });

  test('a tests-only commit needs a current plan but no docs', () => {
    const w = world();
    edit(w, 'service_test.go');
    setMtime(w.plan, new Date(Date.now() + 1000));
    assert.equal(commit(w, 'test: x').code, 0);
  });

  test('a docs-only commit is not asked for anything', () => {
    const w = world();
    edit(w, 'README.md', '# changed\n');
    assert.equal(commit(w, 'docs: x').code, 0);
  });

  test('sees a change made through Bash, which the session edit-stamp never did', () => {
    // Before git was consulted, this commit had no "source changed" signal at all and passed
    // with no verification gate ever having run.
    const w = world();
    edit(w, 'service.go');
    git(w.repo, 'add', '-A');
    const r = run('commit-gate.js', {
      session_id: uniq('sid'), cwd: w.repo, tool_name: 'Bash',
      tool_input: { command: 'git commit -m "feat: x"' },
    }, w.env);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /no verification gate/);
  });

  test('checks the repo named by git -C, not the session directory', () => {
    const w = world();
    edit(w, 'service.go');
    git(w.repo, 'add', '-A');
    const sid = uniq('sid');
    const r = run('commit-gate.js', {
      session_id: sid, cwd: tmpdir(), tool_name: 'Bash',
      tool_input: { command: `git -C ${w.repo} commit -m "feat: x"` },
    }, w.env);
    assert.equal(r.code, 2, 'the staged code lives in the -C repo');
  });
});

// ──────────────────────────────────────────────────────────────────────────
describe('pre-push-gate.js — no commit reaches a remote without docs or a Docs: line', () => {
  /** A repo whose origin already has the base commit, so only new commits are unpushed. */
  function pushable() {
    const w = world();
    const bare = join(w.base, 'origin.git');
    execFileSync('git', ['init', '-q', '--bare', bare], { env: { ...process.env, ...ISOLATED } });
    git(w.repo, 'remote', 'add', 'origin', bare);
    git(w.repo, 'push', '-q', 'origin', 'HEAD:main');
    git(w.repo, 'fetch', '-q', 'origin');
    return w;
  }
  const push = (w, env = {}) =>
    run('pre-push-gate.js', {
      cwd: w.repo, tool_name: 'Bash',
      tool_input: { command: 'CLAUDE_PUSH_AUTHORIZED=yes git push origin HEAD:main' },
    }, { ...w.env, ...env });

  test('refuses an authorised push carrying an undocumented code commit, and names it', () => {
    const w = pushable();
    edit(w, 'service.go');
    git(w.repo, 'add', '-A');
    git(w.repo, 'commit', '-qm', 'feat: undocumented');
    const r = push(w);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /feat: undocumented/);
  });

  test('accepts a commit that carries its docs', () => {
    const w = pushable();
    edit(w, 'service.go');
    edit(w, 'CHANGELOG.md', '# c\n');
    git(w.repo, 'add', '-A');
    git(w.repo, 'commit', '-qm', 'feat: documented');
    assert.equal(push(w).code, 0);
  });

  test('accepts a commit whose message records a Docs: decision', () => {
    const w = pushable();
    edit(w, 'service.go');
    git(w.repo, 'add', '-A');
    git(w.repo, 'commit', '-qm', 'refactor: x', '-m', 'Docs: none — internal refactor');
    assert.equal(push(w).code, 0);
  });

  test('does not re-judge commits the remote already has', () => {
    const w = pushable(); // the base commit is on origin and has no docs question to answer
    assert.equal(push(w).code, 0);
  });

  test('still requires authorisation once the docs are in order', () => {
    const w = pushable();
    const r = run('pre-push-gate.js', {
      cwd: w.repo, tool_name: 'Bash', tool_input: { command: 'git push origin HEAD:main' },
    }, w.env);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /requires explicit authorisation/);
  });
});
