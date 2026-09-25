// Size budget: 10 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the hooks that can STOP work.
//
// These are the highest-risk scripts in the install: a bug in pre-push-gate means you cannot
// ship, a bug in pre-write-governance-sweep means you cannot write a file, and a bug that
// fails OPEN means the rule it enforces quietly stops existing. Before this file none of them
// had a test. Each case states the behaviour it protects.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq } from './helpers.mjs';

const PUSH = ['git', 'push'].join(' '); // assembled so this file is not itself a push command
const COMMIT = ['git', 'commit'].join(' ');

describe('pre-push-gate.js — nothing reaches a remote unauthorised', () => {
  const bash = (command, env = {}) =>
    run('pre-push-gate.js', { session_id: 's', tool_name: 'Bash', tool_input: { command } }, env);

  test('blocks a push the operator has not authorised', () => {
    assert.equal(bash(`${PUSH} origin main`, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 2);
  });

  test('allows a push authorised through the environment', () => {
    assert.equal(bash(`${PUSH} origin main`, { CLAUDE_PUSH_AUTHORIZED: 'yes' }).code, 0);
  });

  // The harness env reflects the prior shell, so the inline form is what an operator types.
  test('allows the inline authorisation form', () => {
    const r = bash(`CLAUDE_PUSH_AUTHORIZED=yes ${PUSH} origin main`, { CLAUDE_PUSH_AUTHORIZED: '' });
    assert.equal(r.code, 0);
  });

  test('ignores commands that are not pushes', () => {
    for (const c of ['git status', 'ls -la', 'git log --oneline']) {
      assert.equal(bash(c, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 0, c);
    }
  });

  // WRITING ABOUT A PUSH IS NOT PUSHING. Measured 2026-09-21: creating this very test file
  // was blocked, because its fixtures contain a push command and the detector read the whole
  // command string. A heredoc redirected to a file is data.
  test('does not treat a push mentioned inside a file-written heredoc as a push', () => {
    const cmd = `cat > /tmp/x.md <<'EOF'\nrun ${PUSH} origin main to ship\nEOF`;
    assert.equal(bash(cmd, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 0);
  });

  // The file being written is not the command. Judged on the whole head, a `.sh` target
  // matched `sh` and a `.git/` target matched `git`, so saving a script that pushes was
  // blocked as a push. Found 2026-09-21 by the first direct test of lib/command-scan.js.
  for (const target of ['/tmp/deploy.sh', '.git/hooks/pre-push']) {
    test(`does not treat a push in a script being saved to ${target} as a push`, () => {
      const cmd = `cat > ${target} <<'EOF'\n${PUSH} origin main\nEOF`;
      assert.equal(bash(cmd, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 0);
    });
  }

  // ...but a heredoc piped to an interpreter really does execute it, so that must still block.
  test('still blocks a push inside a heredoc piped to a shell', () => {
    const cmd = `bash <<'EOF'\n${PUSH} origin main\nEOF`;
    assert.equal(bash(cmd, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 2);
  });

  test('blocks a commit carrying an AI-attribution trailer', () => {
    const trailer = 'Co-Authored-By: ' + 'Claude <noreply@anthropic.com>';
    assert.equal(bash(`${COMMIT} -m 'feat: x\n\n${trailer}'`, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 2);
  });

  test('allows a clean commit', () => {
    assert.equal(bash(`${COMMIT} -m 'feat: x'`, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 0);
  });

  // The same confusion in the other detector: editing the hook itself was blocked because the
  // edit contained the words the trailer pattern looks for.
  test('does not treat trailer text written into a file as a trailer', () => {
    const trailer = 'Co-Authored-By: ' + 'Claude <noreply@anthropic.com>';
    const cmd = `cat > /tmp/doc.md <<'EOF'\nNever add ${trailer} to a ${COMMIT}.\nEOF`;
    assert.equal(bash(cmd, { CLAUDE_PUSH_AUTHORIZED: '' }).code, 0);
  });
});

describe('pre-write-governance-sweep.js — secrets and hygiene at write time', () => {
  const write = (file, content = 'x', env = {}) =>
    run('pre-write-governance-sweep.js', { tool_name: 'Write',
      tool_input: { file_path: file, content } }, env);

  for (const f of ['/tmp/p/.env', '/tmp/p/server.pem', '/tmp/p/id_rsa', '/tmp/p/cert.key']) {
    test(`refuses to write a tracked-secret file: ${f}`, () => {
      assert.equal(write(f).code, 2);
    });
  }

  test('allows an ordinary source file', () => {
    assert.equal(write('/tmp/p/src/main.go', 'package main').code, 0);
  });

  test('respects the resource-hygiene off switch', () => {
    assert.equal(write('/tmp/p/.env', 'X=1', { CLAUDE_RESOURCE_HYGIENE: 'off' }).code, 0);
  });

  test('passes a non-Write tool through untouched', () => {
    assert.equal(run('pre-write-governance-sweep.js',
      { tool_name: 'Bash', tool_input: { command: 'ls' } }).code, 0);
  });
});

describe('model-ladder-gate.js — Fable is excluded from security work', () => {
  const sw = (model, prompt) => run('model-ladder-gate.js', { to_model: model, prompt });

  test('blocks a switch to Fable during security work', () => {
    const r = sw('claude-fable-5-1', 'review the auth credential handling for vulnerabilities');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /BLOCKED/);
  });

  test('allows a switch to Fable on ordinary work', () => {
    assert.equal(sw('claude-fable-5-1', 'refactor the invoice renderer').code, 0);
  });

  // Opus is the intended model FOR security review, so blocking it would invert the rule.
  test('never blocks a model that is not Fable', () => {
    assert.equal(sw('claude-opus-5', 'audit the OWASP exposure and CVE surface').code, 0);
    assert.equal(sw('claude-sonnet-5', 'check the PCI compliance path').code, 0);
  });
});

describe('supersede-proof.js — a net removal needs its proof', () => {
  const edit = (oldS, newS, env = {}) =>
    run('supersede-proof.js', { session_id: uniq('sid'), tool_name: 'Edit',
      tool_input: { file_path: '/tmp/p/a.go', old_string: oldS, new_string: newS } }, env);

  // Advisory BY DESIGN: the removal heuristic carries too much false-positive cost
  // mid-refactor, and a hard block there gets the hook switched off.
  test('stays advisory by default', () => {
    assert.equal(edit('func Removed() error { return nil }', '').code, 0);
  });

  test('blocks a net removal when explicitly set to block', () => {
    assert.equal(edit('func Removed() error { return nil }', '',
      { CLAUDE_SUPERSEDE_PROOF: 'block' }).code, 2);
  });

  test('respects its off switch', () => {
    assert.equal(edit('func Removed() error { return nil }', '',
      { CLAUDE_SUPERSEDE_PROOF: 'off' }).code, 0);
  });
});

describe('post-edit-no-discards.js — a discarded value is surfaced', () => {
  // This hook reads the file FROM DISK, not the edit payload — it runs after the write, so
  // the file is the truth. A test that only supplies new_string exercises nothing: the hook
  // finds no content and returns early, and the test passes for the wrong reason.
  const onDisk = (content, env = {}) => {
    const file = join(tmpdir(), `${uniq('nd')}.go`);
    writeFileSync(file, content);
    const r = run('post-edit-no-discards.js',
      { tool_name: 'Edit', tool_input: { file_path: file } }, env);
    rmSync(file, { force: true });
    return r;
  };

  const DISCARD = 'package p\n\nfunc F() {\n\tv, _ := doThing()\n\t_ = v\n}\n';

  test('flags a discarded Go error', () => {
    assert.equal(onDisk(DISCARD).code, 2);
  });

  test('passes code that handles its error', () => {
    const clean = 'package p\n\nfunc F() error {\n\tv, err := doThing()\n' +
      '\tif err != nil {\n\t\treturn err\n\t}\n\treturn use(v)\n}\n';
    assert.equal(onDisk(clean).code, 0);
  });

  test('respects its off switch', () => {
    assert.equal(onDisk(DISCARD, { CLAUDE_NO_DISCARDS_HOOK: 'off' }).code, 0);
  });
});

describe('every blocking hook degrades safely', () => {
  // A blocking hook that throws on malformed input either stops all work or fails open with
  // no signal. Neither may happen.
  for (const h of ['pre-push-gate.js', 'pre-write-governance-sweep.js', 'model-ladder-gate.js',
                   'supersede-proof.js', 'post-edit-no-discards.js', 'docs-sync-gate.js']) {
    test(`${h} exits 0 on empty and malformed stdin`, () => {
      assert.equal(run(h, '').code, 0, 'empty');
      assert.equal(run(h, 'not json').code, 0, 'malformed');
    });
  }
});
