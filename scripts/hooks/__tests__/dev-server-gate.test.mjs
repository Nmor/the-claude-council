// Size budget: 5 KB. Check: wc -c; gate: token-budget.mjs --check.
// dev-server-gate.js — a dev server runs as a background task, where its log can be read,
// instead of holding the turn in the foreground.
//
// Claude Code's own mechanism for this is `run_in_background: true` (tools reference, read
// 2026-09-21: "For long-running processes such as dev servers or watch builds, Claude can set
// run_in_background: true"), with the log readable from the task's output file and /tasks to
// stop it. The hook used to demand tmux instead, and refused the native path outright.
//
// Dev-server commands are assembled from parts so writing this file is not itself one.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { run, said } from './helpers.mjs';

const dev = (...p) => [...p, 'dev'].join(' ');
const bash = (command, extra = {}) =>
  run('dev-server-gate.js', { tool_name: 'Bash', tool_input: { command, ...extra } });

describe('dev-server-gate.js — a dev server is a background task', () => {
  for (const cmd of [dev('npm', 'run'), dev('pnpm'), dev('pnpm', 'run'), dev('yarn'), dev('bun', 'run'),
    `cd web && ${dev('npm', 'run')}`]) {
    test(`blocks it in the foreground: ${cmd}`, () => {
      const r = bash(cmd);
      assert.equal(r.code, 2);
      assert.match(r.stderr, /run_in_background/, 'the block names the fix Claude can apply');
      assert.doesNotMatch(r.stderr, /tmux/, 'tmux is no longer the recommended path');
    });
    test(`allows it as a background task: ${cmd}`, () => {
      const r = bash(cmd, { run_in_background: true });
      assert.equal(r.code, 0);
      assert.equal(said(r), '', 'the native path needs no comment');
    });
  }

  test('allows the tmux form for anyone who still prefers it', () =>
    assert.equal(bash(`tmux new-session -d -s dev "${dev('npm', 'run')}"`).code, 0));
  test('allows writing a file that mentions a dev server', () =>
    assert.equal(bash(`cat > README.md <<'EOF'\nstart it with ${dev('npm', 'run')}\nEOF`).code, 0));
  test('allows searching for one', () => assert.equal(bash(`grep -rn "${dev('npm', 'run')}" .`).code, 0));
  test('a block speaks on stderr only; stdout is parsed as hook output', () =>
    assert.equal(bash(dev('npm', 'run')).stdout, ''));
});

describe('dev-server-gate.js — nothing else', () => {
  // The build-and-test reminder that shared this hook is gone: Claude Code backgrounds a
  // command that outlives its timeout on its own, so the reminder bought nothing but tokens.
  for (const cmd of ['pytest -q', 'npm test', 'make build', 'docker compose up', 'yarn']) {
    test(`says nothing about: ${cmd}`, () => {
      const r = bash(cmd);
      assert.equal(r.code, 0);
      assert.equal(said(r), '');
    });
  }
  test('allows input it cannot read', () => {
    assert.equal(run('dev-server-gate.js', 'not json').code, 0);
    assert.equal(run('dev-server-gate.js', 'null').code, 0);
  });
});
