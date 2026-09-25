// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// Tests for the destructive-command gate.
//
// This is the only gate here that blocks hard by default, so its false-positive set matters
// more than its true-positive set: if it fires on ordinary work it gets switched off, and then
// it protects nothing. The "must NOT block" cases below are therefore the important half.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './helpers.mjs';

const bash = (command, env = {}) =>
  run('destructive-command-gate.js', { tool_name: 'Bash', tool_input: { command } }, env);

const blocked = (c, env) => bash(c, env).code === 2;

describe('destructive-command-gate.js — irreversible commands are the operator\'s call', () => {
  const MUST_BLOCK = [
    ['filesystem root', 'rm -rf /'],
    ['home directory', 'rm -rf ~'],
    ['HOME variable', 'rm -rf $HOME'],
    ['drop database', 'psql -c "DROP DATABASE production"'],
    ['drop table', 'psql -c "DROP TABLE users"'],
    ['truncate', 'psql -c "TRUNCATE TABLE events"'],
    ['delete with no where', 'psql -c "DELETE FROM users;"'],
    ['update with no where', 'psql -c "UPDATE users SET active = false"'],
    ['world-writable', 'chmod 777 /etc/ssl/private/key.pem'],
    ['disk format', 'mkfs.ext4 /dev/sda1'],
    ['dd to device', 'dd if=/dev/zero of=/dev/sda bs=1M'],
    ['fork bomb', ':(){ :|:& };:'],
    ['force push', 'git push --force origin main'],
    ['hard reset onto shared branch', 'git reset --hard origin/main'],
    ['shred', 'shred -u secrets.txt'],
    ['s3 bucket removal', 'aws s3 rb s3://prod-data --force'],
    ['namespace deletion', 'kubectl delete namespace production'],
  ];

  for (const [name, cmd] of MUST_BLOCK) {
    test(`blocks ${name}`, () => {
      assert.equal(blocked(cmd), true, cmd);
    });
  }

  test('names the reason rather than just refusing', () => {
    const r = bash('rm -rf /');
    assert.match(r.stderr, /filesystem root|recursive delete/i);
    assert.match(r.stderr, /operator/i, 'it should say whose decision this is');
  });
});

describe('destructive-command-gate.js — it must not touch ordinary work', () => {
  const MUST_PASS = [
    ['building', 'go build ./...'],
    ['testing', 'go test -race ./...'],
    ['cleaning a build dir', 'rm -rf ./build'],
    ['cleaning node_modules', 'rm -rf node_modules'],
    ['removing a temp dir', 'rm -rf /tmp/scratch-1234'],
    ['a scoped delete', 'psql -c "DELETE FROM events WHERE created_at < now() - interval \'30 days\'"'],
    ['a scoped update', 'psql -c "UPDATE users SET active = false WHERE id = 7"'],
    ['sensible permissions', 'chmod 640 /etc/ssl/private/motion.key'],
    ['a safe force push', 'git push --force-with-lease origin feature/x'],
    ['an ordinary push', 'git push origin main'],
    ['a normal reset', 'git reset --soft HEAD~1'],
    ['listing', 'ls -la /'],
    ['grepping', 'grep -rn "DROP DATABASE" ./migrations'],
  ];

  for (const [name, cmd] of MUST_PASS) {
    test(`allows ${name}`, () => {
      assert.equal(blocked(cmd), false, cmd);
    });
  }

  // The lesson that cost three false positives in one session: writing ABOUT a thing is not
  // doing it. A heredoc redirected to a file is documentation.
  test('allows documenting a destructive command in a file', () => {
    const cmd = "cat > runbook.md <<'EOF'\nTo wipe the box: rm -rf / (never do this)\nEOF";
    assert.equal(blocked(cmd), false);
  });

  // ...but a heredoc piped to a shell or a database client really does run it.
  test('still blocks a destructive command piped to a shell', () => {
    assert.equal(blocked("bash <<'EOF'\nrm -rf /\nEOF"), true);
  });

  test('still blocks SQL piped to a database client', () => {
    assert.equal(blocked("psql <<'EOF'\nDROP DATABASE production;\nEOF"), true);
  });

  // A shell listing commands as DATA is ordinary work. This blocked within an hour of the
  // quote-boundary experiment, which is why that experiment was reverted: chasing obfuscation
  // cost a false positive on everyday shell, and a gate that fires on real work gets switched
  // off. The limit is stated in the hook header instead of chased.
  test('allows a for-loop that lists destructive commands as strings', () => {
    assert.equal(blocked("for c in 'rm -rf ~' 'rm -rf /'; do echo $c; done"), false);
  });

  test('allows printing a warning about a destructive command', () => {
    assert.equal(blocked('echo "never run rm -rf / on this box"'), false);
  });
});

describe('destructive-command-gate.js — home-directory targets', () => {
  // `rm -rf ~/` slipped through while `rm -rf ~` was blocked: the alternation listed `~` and
  // `~/*` but not `~/`. A trailing slash is a real target, not an obfuscation, so it counts.
  const HOME_TARGETS = ['rm -rf ~', 'rm -rf ~/', 'rm -rf $HOME', 'rm -rf $HOME/',
                        'rm -rf ${HOME}', 'rm -rf ${HOME}/'];
  for (const cmd of HOME_TARGETS) {
    test(`blocks ${cmd}`, () => assert.equal(blocked(cmd), true));
  }

  // A named path under home is ordinary cleanup, not a wipe.
  test('allows deleting a specific directory under home', () => {
    assert.equal(blocked('rm -rf ~/project/build'), false);
    assert.equal(blocked('rm -rf $HOME/.cache/tmp-build'), false);
  });
});

describe('destructive-command-gate.js — modes and safety', () => {
  test('warn mode reports without blocking', () => {
    const r = bash('rm -rf /', { CLAUDE_DESTRUCTIVE_GATE: 'warn' });
    assert.equal(r.code, 0);
    assert.match(r.stderr, /DESTRUCTIVE/);
  });

  test('off disables it entirely', () => {
    assert.equal(bash('rm -rf /', { CLAUDE_DESTRUCTIVE_GATE: 'off' }).code, 0);
  });

  test('degrades safely on empty and malformed stdin', () => {
    assert.equal(run('destructive-command-gate.js', '').code, 0);
    assert.equal(run('destructive-command-gate.js', 'not json').code, 0);
  });

  test('ignores a non-Bash payload', () => {
    assert.equal(run('destructive-command-gate.js',
      { tool_name: 'Write', tool_input: { file_path: '/x/a.go', content: 'rm -rf /' } }).code, 0);
  });
});
