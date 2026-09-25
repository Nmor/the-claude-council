// Size budget: 4 KB. Check: wc -c; gate: token-budget.mjs --check.
// commit-gate.js's documented override, `CLAUDE_COMMIT_GATE=off git commit ...`, could not
// work: the hook read process.env, which is the HOOK's environment, not the command's. Its
// own refusal message told people to use it (2026-09-21). These pin that the override now
// works when written on the commit, and only there.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, cleanup } from './helpers.mjs';

describe('commit-gate.js — the inline override', () => {
  // A gate from an earlier turn: the state the gate refuses.
  const stale = () => {
    const sid = uniq('sid');
    writeFileSync(join(tmpdir(), `claude-council-coverage-${sid}`), 'x');
    run('test-coverage-gate.js', { session_id: sid, prompt_id: 't1', tool_name: 'Write',
      tool_input: { file_path: '/x/a.go', content: 'package main' } });
    run('gate-marker.js', { session_id: sid, prompt_id: 't1', tool_name: 'Bash',
      tool_input: { command: 'go test ./...' } });
    return sid;
  };
  const commit = (sid, command) => run('commit-gate.js', { session_id: sid, prompt_id: 't2',
    tool_name: 'Bash', tool_input: { command } });
  const clean = (sid) => cleanup(`claude-council-coverage-${sid}`, `claude-council-lastedit-${sid}`,
    `claude-council-gate-${sid}`, `claude-council-srcedits-${sid}`);

  test('without it, the stale gate still blocks (control)', () => {
    const sid = stale();
    assert.equal(commit(sid, 'git commit -m x').code, 2);
    clean(sid);
  });

  for (const cmd of [
    'CLAUDE_COMMIT_GATE=off git commit -m x',
    'cd /repo && CLAUDE_COMMIT_GATE=off git commit -m x',
    'LANG=C CLAUDE_COMMIT_GATE=off git -C /repo commit -m x',
  ]) {
    test(`is honoured when it prefixes the commit: ${cmd}`, () => {
      const sid = stale();
      assert.equal(commit(sid, cmd).code, 0);
      clean(sid);
    });
  }

  for (const cmd of [
    'echo CLAUDE_COMMIT_GATE=off && git commit -m x',
    'git commit -m "CLAUDE_COMMIT_GATE=off git commit"',
    "git commit -F - <<'EOF'\nsubject\n\nCLAUDE_COMMIT_GATE=off git commit\nEOF",
    'export CLAUDE_COMMIT_GATE=off; git commit -m x',
  ]) {
    test(`is not honoured when it is anywhere else: ${cmd.split('\n')[0]}`, () => {
      const sid = stale();
      assert.equal(commit(sid, cmd).code, 2, cmd);
      clean(sid);
    });
  }
});
