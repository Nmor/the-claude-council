// Size budget: 30 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the five write-boundary gates.
//
// These hooks decide whether a rule binds at the moment a file changes, so an untested one is
// the highest-leverage untested thing in the enforcement layer. Each gate below is exercised
// four ways: the condition that SHOULD fire it, the near-miss that must NOT (the half that
// matters, because a gate that fires on ordinary work gets switched off and then protects
// nothing), its off-switch, and its behaviour on input it cannot parse.
//
// Every assertion here was checked against the real binary before it was written down —
// the tests pin what these hooks DO, which in three places is not what their headers claim.
// Those three are reported separately, not papered over with an assertion.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, mkdirSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, marker, cleanup, advice, said } from './helpers.mjs';

const touchMarker = (name) => writeFileSync(marker(name), '');

// ──────────────────────────────────────────────────────────────────────────
// intake-gate.js — a plan precedes code mutation
// ──────────────────────────────────────────────────────────────────────────

describe('intake-gate.js — code does not get edited before anyone has planned it', () => {
  const edit = (file, { env = {}, sid = uniq('sid') } = {}) =>
    run('intake-gate.js', { session_id: sid, tool_name: 'Edit', tool_input: { file_path: file } }, env);

  for (const file of ['/srv/app/user.go', '/srv/app/src/api.ts', '/srv/app/main.py',
                      '/srv/app/lib/Widget.tsx', '/srv/app/db/schema.sql', '/srv/app/Main.java']) {
    test(`asks for the intake before a source file changes: ${file}`, () => {
      const r = edit(file);
      assert.match(advice(r), /\[intake-gate\]/);
      assert.equal(r.code, 0, 'the default mode nudges, it does not block');
    });
  }

  test('names the file it is about to let you change, so the nudge is not generic', () => {
    assert.match(advice(edit('/srv/app/billing/invoice.go')), /invoice\.go/);
  });

  // The false-positive half. Each of these is ordinary work that must never be interrupted.
  for (const [what, file] of [
    ['a README', '/srv/app/README.md'],
    ['a changelog', '/srv/app/CHANGELOG.md'],
    ['a JSON config', '/srv/app/tsconfig.json'],
    ['a YAML manifest', '/srv/app/k8s/deploy.yaml'],
    ['a lockfile', '/srv/app/go.sum'],
    ['a file whose name only looks like source', '/srv/app/notes.go.md'],
    ['a Council rule', '/Users/x/.claude/rules/common/no-bloat.md'],
    ['a Council hook', '/Users/x/.claude/scripts/hooks/intake-gate.js'],
    ['a project skill', '/srv/app/.claude/skills/thing/helper.ts'],
  ]) {
    test(`stays silent on ${what}`, () => {
      const r = edit(file);
      assert.equal(said(r), '', file);
      assert.equal(r.code, 0);
    });
  }

  test('goes quiet for the rest of the session once a TodoWrite plan exists', () => {
    const sid = uniq('sid');
    touchMarker(`claude-council-intake-${sid}`);
    const r = edit('/srv/app/user.go', { sid });
    cleanup(`claude-council-intake-${sid}`);
    assert.equal(said(r), '', 'the intake marker is the whole contract with intake-marker.js');
  });

  test('blocks the edit outright when set to block', () => {
    const r = edit('/srv/app/user.go', { env: { CLAUDE_INTAKE_GATE: 'block' } });
    assert.equal(r.code, 2);
    assert.match(r.stderr, /\[intake-gate\]/);
  });

  test('says nothing at all when switched off', () => {
    const r = edit('/srv/app/user.go', { env: { CLAUDE_INTAKE_GATE: 'off' } });
    assert.equal(said(r), '');
    assert.equal(r.code, 0);
  });

  // A typo in the env var must never be a silent disable: the failure would look exactly like
  // a gate that was never installed.
  test('treats an unrecognised mode as the nudge, not as off', () => {
    const r = edit('/srv/app/user.go', { env: { CLAUDE_INTAKE_GATE: 'bogus' } });
    assert.match(advice(r), /\[intake-gate\]/);
    assert.equal(r.code, 0);
  });

  // This test used to pin a defect: the header promised once per session and the code
  // repeated the nudge on every edit. The gate now records that it has spoken.
  test('nudges once per session, then stays quiet on the next unplanned edit', () => {
    const sid = uniq('sid');
    try {
      assert.match(advice(edit('/srv/app/a.go', { sid })), /\[intake-gate\]/);
      assert.equal(said(edit('/srv/app/b.go', { sid })), '', 'a nudge on every edit teaches people to ignore it');
    } finally {
      cleanup(`claude-council-intake-nudged-${sid}`);
    }
  });

  test('in block mode it refuses every unplanned edit, not only the first', () => {
    const sid = uniq('sid');
    const env = { CLAUDE_INTAKE_GATE: 'block' };
    assert.equal(edit('/srv/app/a.go', { sid, env }).code, 2);
    assert.equal(edit('/srv/app/b.go', { sid, env }).code, 2, 'block means block until a plan exists');
  });

  test('degrades safely on null, array and malformed input', () => {
    for (const payload of ['null', '[]', 'not json', '']) {
      const r = run('intake-gate.js', payload);
      assert.equal(r.code, 0, payload);
      assert.equal(said(r), '', payload);
    }
  });

  describe('a plan file written this session counts as the plan', () => {
    let root, home, transcript;
    before(() => {
      root = mkdtempSync(join(tmpdir(), 'intake-proj-'));
      home = mkdtempSync(join(tmpdir(), 'intake-home-')); // no ~/.claude/plans: the real one must not leak in
      mkdirSync(join(root, '.claude', 'plans'), { recursive: true });
      transcript = join(root, 'transcript.jsonl');
      writeFileSync(transcript, '');
    });
    after(() => {
      rmSync(root, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    });

    const planned = (sid) =>
      run('intake-gate.js', {
        session_id: sid, cwd: root, transcript_path: transcript,
        tool_name: 'Edit', tool_input: { file_path: join(root, 'svc', 'user.go') },
      }, { HOME: home, CLAUDE_INTAKE_GATE: 'block' });

    test('a plan older than the session does not count: the gate still blocks', () => {
      const plan = join(root, '.claude', 'plans', 'old.md');
      writeFileSync(plan, '# old');
      utimesSync(plan, new Date(2020, 0, 1), new Date(2020, 0, 1));
      assert.equal(planned(uniq('sid')).code, 2, 'last month\'s plan is not a plan for this work');
      rmSync(plan);
    });

    // The plan counts when this project's memory names it: plans for several projects share
    // ~/.claude/plans, so a fresh plan there may be another project's.
    const name = (plan) => {
      const mem = join(home, '.claude', 'projects', root.replace(/[^A-Za-z0-9]/g, '-'), 'memory');
      mkdirSync(mem, { recursive: true });
      writeFileSync(join(mem, 'MEMORY.md'), `# Memory Index\n\nActive plan: ${plan}\n`);
    };

    test('the named plan, written after the session began, satisfies the gate, even in block mode', () => {
      const plan = join(root, '.claude', 'plans', 'now.md');
      writeFileSync(plan, '# this session');
      name(plan);
      const r = planned(uniq('sid'));
      assert.equal(r.code, 0);
      assert.equal(said(r), '', 'where there is no TodoWrite, the plan file IS the task list');
    });

    test("a fresh plan this project does not name is not this project's plan", () => {
      const shared = join(home, '.claude', 'plans');
      mkdirSync(shared, { recursive: true });
      writeFileSync(join(shared, 'another-project.md'), '# written this session, elsewhere');
      name(join(root, '.claude', 'plans', 'old-and-named.md'));
      writeFileSync(join(root, '.claude', 'plans', 'old-and-named.md'), '# old');
      utimesSync(join(root, '.claude', 'plans', 'old-and-named.md'), new Date(2020, 0, 1), new Date(2020, 0, 1));
      assert.equal(planned(uniq('sid')).code, 2);
    });

    test('without a transcript there is no session start, so a plan file cannot count', () => {
      const r = run('intake-gate.js', {
        session_id: uniq('sid'), cwd: root,
        tool_name: 'Edit', tool_input: { file_path: join(root, 'svc', 'user.go') },
      }, { HOME: home, CLAUDE_INTAKE_GATE: 'block' });
      assert.equal(r.code, 2);
    });
  });

  test('cannot fire without a session id, and does not pretend otherwise', () => {
    const r = run('intake-gate.js', { tool_name: 'Edit', tool_input: { file_path: '/srv/app/user.go' } });
    assert.equal(said(r), '');
    assert.equal(r.code, 0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// research-gate.js — provider docs before provider code
// ──────────────────────────────────────────────────────────────────────────

describe('research-gate.js — integration code is not written from memory', () => {
  const edit = (file, { sid = uniq('sid'), env = {} } = {}) =>
    run('research-gate.js', { session_id: sid, tool_name: 'Edit', tool_input: { file_path: file } }, env);

  for (const file of ['/srv/app/payments/stripe_client.go', '/srv/app/providers/twilio.ts',
                      '/srv/app/integrations/paystack.py', '/srv/app/billing/webhook_handler.go',
                      '/srv/app/auth/oauth_flow.ts', '/srv/app/clients/api_client.rb',
                      '/srv/app/graph/msgraph.cs', '/srv/app/sync/calendar_push.go']) {
    test(`asks for the provider docs before editing: ${file}`, () => {
      const r = edit(file);
      assert.match(advice(r), /\[research-gate\]/, file);
    });
  }

  for (const [what, file] of [
    ['ordinary domain code', '/srv/app/internal/ledger.go'],
    ['a prose page about a provider', '/srv/app/docs/stripe.md'],
    ['a provider config file', '/srv/app/config/stripe.json'],
    ['a Council skill about a provider', '/Users/x/.claude/skills/stripe/helper.ts'],
    ['a path that merely contains the letters ses', '/srv/app/uses_service.go'],
    ['a path that merely contains the letters sdk', '/srv/app/sdkexamples.go'],
  ]) {
    test(`stays silent on ${what}`, () => {
      assert.equal(said(edit(file)), '', file);
    });
  }

  test('goes quiet once WebSearch or WebFetch has run this session', () => {
    const sid = uniq('sid');
    touchMarker(`claude-council-research-${sid}`);
    const r = edit('/srv/app/providers/twilio.ts', { sid });
    cleanup(`claude-council-research-${sid}`);
    assert.equal(said(r), '', 'research-marker.js is what clears this gate');
  });

  test('never blocks an edit, however loudly it nudges', () => {
    assert.equal(edit('/srv/app/payments/stripe_client.go').code, 0);
    assert.equal(edit('/srv/app/internal/ledger.go').code, 0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// docs-sync-gate.js — PostToolUse on TodoWrite, not an edit gate
// ──────────────────────────────────────────────────────────────────────────

// docs-sync-gate.js moved from PostToolUse:TodoWrite to Stop on 2026-09-21. Its tests now
// live in plan-docs-gates.test.mjs, each labelled with the TodoWrite-era test it carries.

// ──────────────────────────────────────────────────────────────────────────
// supersede-proof.js — "newer" is not "better"
// ──────────────────────────────────────────────────────────────────────────

describe('supersede-proof.js — code is not deleted on the word of a replacement', () => {
  const edit = (file, input, { env = {}, sid = uniq('sid') } = {}) =>
    run('supersede-proof.js', { session_id: sid, tool_name: 'Edit', tool_input: { file_path: file, ...input } }, env);

  const removals = [
    ['a Go handler', '/srv/app/handler.go', 'func GetCart(w http.ResponseWriter, r *http.Request) {\n\trender(w)\n}'],
    ['a Go method', '/srv/app/cart.go', 'func (s *Service) Total(ctx context.Context) int {\n\treturn 0\n}'],
    ['a TypeScript function', '/srv/app/cart.ts', 'export function getCart(id: string) {\n  return db.find(id);\n}'],
    ['a TypeScript export', '/srv/app/types.ts', 'export const CART_TTL = 900;'],
    ['a Python function', '/srv/app/cart.py', 'def get_cart(user_id):\n    return db.find(user_id)'],
    ['a Rust function', '/srv/app/cart.rs', 'pub fn get_cart(id: u64) -> Cart {\n    Cart::new()\n}'],
  ];

  for (const [what, file, body] of removals) {
    test(`asks for the proof when ${what} is deleted outright`, () => {
      const r = edit(file, { old_string: body, new_string: '' });
      assert.match(advice(r), /\[supersede-proof\]/, what);
      assert.equal(r.code, 0, 'warn is the default; a hard block on this heuristic is too costly');
    });
  }

  test('counts the declarations it is losing, so the nudge is checkable', () => {
    const r = edit('/srv/app/handler.go', {
      old_string: 'func A(w W) {}\nfunc B(w W) {}\nfunc C(w W) {}',
      new_string: 'func A(w W) {}',
    });
    assert.match(advice(r), /Net removal of 2 declaration/);
  });

  test('aggregates a MultiEdit across all of its edits', () => {
    const r = edit('/srv/app/handler.go', {
      edits: [
        { old_string: 'func Old(w W) {\n\tx()\n}', new_string: '' },
        { old_string: '\tregister(Old)', new_string: '' },
      ],
    });
    assert.match(advice(r), /\[supersede-proof\]/);
  });

  // The false-positive half: everything below is normal refactoring, and a gate that
  // interrupts it is a gate somebody turns off.
  test('stays silent on a rename, where the declaration count is unchanged', () => {
    const r = edit('/srv/app/handler.go', {
      old_string: 'func GetCart(w W) {\n\tx()\n}',
      new_string: 'func FetchCart(w W) {\n\tx()\n}',
    });
    assert.equal(said(r), '');
  });

  test('stays silent when only a function body changes', () => {
    const r = edit('/srv/app/handler.go', {
      old_string: '\ttotal := a + b\n\treturn total',
      new_string: '\treturn a + b',
    });
    assert.equal(said(r), '');
  });

  test('stays silent when code is only added', () => {
    const r = edit('/srv/app/handler.go', { old_string: '', new_string: 'func New(w W) {}' });
    assert.equal(said(r), '');
  });

  test('stays silent on a fresh Write, which removes nothing', () => {
    const r = run('supersede-proof.js', {
      session_id: uniq('sid'), tool_name: 'Write',
      tool_input: { file_path: '/srv/app/new.go', content: 'func New() {}' },
    });
    assert.equal(said(r), '');
  });

  test('stays silent when a test file loses a test', () => {
    const r = edit('/srv/app/handler_test.go', { old_string: 'func TestOld(t *testing.T) {\n}', new_string: '' });
    assert.equal(said(r), '');
  });

  test('stays silent on prose, where deleting a code sample is not a supersede', () => {
    const r = edit('/srv/docs/api.md', { old_string: 'def get_cart(u):\n    pass', new_string: '' });
    assert.equal(said(r), '');
  });

  test('stays silent on Council framework files', () => {
    const r = edit('/Users/x/.claude/scripts/hooks/old-gate.js',
      { old_string: 'function check(a) {\n  return a;\n}', new_string: '' });
    assert.equal(said(r), '');
  });

  test('accepts a SUPERSEDE PROOF written into the change itself', () => {
    const r = edit('/srv/app/handler.go', {
      old_string: 'func GetCart(w W) {\n\tx()\n}',
      new_string: '// SUPERSEDE PROOF: replaced by cart.Fetch — inputs, outputs, error branches,\n' +
                  '// audit write and ownership guard all carried forward; both callers migrated.',
    });
    assert.equal(said(r), '');
  });

  test('accepts a proof recorded earlier in the session, when the replacement landed elsewhere', () => {
    const sid = uniq('sid');
    touchMarker(`claude-supersede-proof-${sid}`);
    const r = edit('/srv/app/handler.go', { old_string: 'func GetCart(w W) {\n}', new_string: '' }, { sid });
    cleanup(`claude-supersede-proof-${sid}`);
    assert.equal(said(r), '');
  });

  test('blocks the deletion outright when set to block', () => {
    const r = edit('/srv/app/handler.go', { old_string: 'func GetCart(w W) {\n}', new_string: '' },
      { env: { CLAUDE_SUPERSEDE_PROOF: 'block' } });
    assert.equal(r.code, 2);
  });

  test('says nothing at all when switched off', () => {
    const r = edit('/srv/app/handler.go', { old_string: 'func GetCart(w W) {\n}', new_string: '' },
      { env: { CLAUDE_SUPERSEDE_PROOF: 'off' } });
    assert.equal(said(r), '');
    assert.equal(r.code, 0);
  });

  // Each hook gets its own copy of the payload on stdin, so echoing it passes nothing on;
  // Claude Code would instead read the echo as this hook's own JSON output.
  test('leaves stdout empty when it allows an edit', () => {
    const payload = {
      session_id: uniq('sid'), tool_name: 'Edit',
      tool_input: { file_path: '/srv/app/handler.go', old_string: 'x := 1', new_string: 'x := 2' },
    };
    assert.equal(run('supersede-proof.js', payload).stdout, '');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// pre-write-governance-sweep.js — family 1: governance-filename collision
// ──────────────────────────────────────────────────────────────────────────

describe('pre-write-governance-sweep.js — a second CONTRIBUTING.md is a mistake, not a file', () => {
  let repo;
  const write = (file, content = 'x', env = {}) =>
    run('pre-write-governance-sweep.js', { tool_name: 'Write', tool_input: { file_path: file, content } }, env);

  before(() => {
    repo = mkdtempSync(join(tmpdir(), 'gov-sweep-'));
    mkdirSync(join(repo, '.git'));
    mkdirSync(join(repo, 'sub'));
    mkdirSync(join(repo, 'templates'));
    writeFileSync(join(repo, 'CONTRIBUTING.md'), 'the real one');
    writeFileSync(join(repo, 'sub', 'notes.md'), 'not governance');
    writeFileSync(join(repo, 'templates', 'SECURITY.md'), 'a template, duplicate by design');
  });
  after(() => rmSync(repo, { recursive: true, force: true }));

  test('blocks a duplicate CONTRIBUTING.md elsewhere in the same repo', () => {
    const r = write(join(repo, 'sub', 'CONTRIBUTING.md'));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /governance-filename collision/);
  });

  test('names the file it collides with, so the fix is obvious', () => {
    const r = write(join(repo, 'sub', 'CONTRIBUTING.md'));
    assert.match(r.stderr, /collides with: .*CONTRIBUTING\.md/);
  });

  test('allows the first governance file of its name in a repo', () => {
    assert.equal(write(join(repo, 'sub', 'GOVERNANCE.md')).code, 0);
  });

  test('allows a duplicate that lives in a duplicate-by-design tree', () => {
    const r = write(join(repo, 'SECURITY.md'));
    assert.equal(r.code, 0, 'templates/ holds copies on purpose');
  });

  test('ignores a non-governance basename even when a duplicate exists', () => {
    const r = write(join(repo, 'notes.md'));
    assert.equal(r.code, 0);
  });

  test('allows a governance file outside any git repo, where there is nothing to collide with', () => {
    assert.equal(write('/private/tmp/no-such-repo-here/CONTRIBUTING.md').code, 0);
  });

  test('leaves Edit alone — it only guards the creation of a new file', () => {
    const r = run('pre-write-governance-sweep.js',
      { tool_name: 'Edit', tool_input: { file_path: join(repo, 'sub', 'CONTRIBUTING.md'), content: 'x' } });
    assert.equal(r.code, 0);
  });

  test('stands down when the governance sweep is switched off', () => {
    const r = write(join(repo, 'sub', 'CONTRIBUTING.md'), 'x', { CLAUDE_GOVERNANCE_SWEEP: 'off' });
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });

  test('switching off the governance sweep does not switch off resource hygiene', () => {
    const r = write('/srv/app/.env', 'SECRET=1', { CLAUDE_GOVERNANCE_SWEEP: 'off' });
    assert.equal(r.code, 2, 'the two bypasses are scoped separately for a reason');
    assert.match(r.stderr, /secrets-management/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// pre-write-governance-sweep.js — family 2: resource hygiene
// ──────────────────────────────────────────────────────────────────────────

describe('pre-write-governance-sweep.js — the five things a Write must never introduce', () => {
  const write = (file, content, env = {}) =>
    run('pre-write-governance-sweep.js', { tool_name: 'Write', tool_input: { file_path: file, content } }, env);

  const MUST_BLOCK = [
    ['a real secret file', '/srv/app/.env', 'STRIPE_KEY=sk_live_1', /secrets-management/],
    ['a private key', '/srv/app/certs/server.key', '-----BEGIN PRIVATE KEY-----', /secrets-management/],
    ['an ssh key', '/srv/app/id_rsa', 'ssh-rsa AAAA', /secrets-management/],
    ['a compose port open to the world', '/srv/app/docker-compose.yml',
      'services:\n  db:\n    ports:\n      - "5432:5432"\n', /docker-localhost-binding/],
    ['a compose port bound to 0.0.0.0', '/srv/app/docker-compose.yml',
      'services:\n  db:\n    ports:\n      - "0.0.0.0:5432:5432"\n', /docker-localhost-binding/],
    ['a Dockerfile base image pinned only by tag', '/srv/app/Dockerfile',
      'FROM node:24-alpine\nRUN echo hi\n', /dependency-pinning/],
    ['a workflow action pinned to a tag', '/srv/repo/.github/workflows/ci.yml',
      'jobs:\n  b:\n    steps:\n      - uses: actions/checkout@v4\n', /commit SHA/],
    ['a dependency on latest', '/srv/app/package.json',
      '{"dependencies":{"left-pad":"latest"}}', /dependency-pinning/],
    ['a wildcard dependency', '/srv/app/package.json',
      '{"devDependencies":{"typescript":"*"}}', /dependency-pinning/],
    ['a local filesystem write in Go', '/srv/app/internal/report.go',
      'func save(b []byte) error { return os.WriteFile("/tmp/r.pdf", b, 0o644) }', /no-local-fs/],
    ['a local filesystem write in TypeScript', '/srv/app/lib/report.ts',
      'export function save(b: Buffer) { fs.writeFileSync("/tmp/r.pdf", b); }', /no-local-fs/],
    ['a local filesystem write in Python', '/srv/app/lib/report.py',
      'def save(b):\n    open("/tmp/r.pdf", "wb").write(b)\n', /no-local-fs/],
  ];

  for (const [what, file, content, reason] of MUST_BLOCK) {
    test(`blocks ${what}`, () => {
      const r = write(file, content);
      assert.equal(r.code, 2, file);
      assert.match(r.stderr, reason);
    });
  }

  const MUST_PASS = [
    ['a placeholder env file', '/srv/app/.env.example', 'STRIPE_KEY=\n'],
    ['an env template', '/srv/app/.env.template', 'STRIPE_KEY=\n'],
    ['a public key', '/srv/app/certs/server.pub', 'ssh-rsa AAAA'],
    ['a compose port bound to loopback', '/srv/app/docker-compose.yml',
      'services:\n  db:\n    ports:\n      - "127.0.0.1:5432:5432"\n'],
    ['a compose port bound through the documented variable', '/srv/app/compose.yml',
      'services:\n  db:\n    ports:\n      - "${PUBLIC_BIND:-127.0.0.1}:5432:5432"\n'],
    ['compose long-form port syntax', '/srv/app/compose.yml',
      'services:\n  db:\n    ports:\n      - target: 5432\n        published: 5432\n'],
    ['a kubernetes manifest that maps ports', '/srv/app/k8s/deploy.yaml',
      'ports:\n  - "8080:80"\n'],
    ['a Dockerfile pinned by digest', '/srv/app/Dockerfile',
      'FROM node:24-alpine@sha256:' + 'a'.repeat(64) + '\n'],
    ['a Dockerfile building FROM scratch', '/srv/app/Dockerfile', 'FROM scratch\nCOPY bootstrap /\n'],
    ['a workflow action pinned to a full SHA', '/srv/repo/.github/workflows/ci.yml',
      'jobs:\n  b:\n    steps:\n      - uses: actions/checkout@' + 'a'.repeat(40) + ' # v4\n'],
    ['a workflow calling a local composite action', '/srv/repo/.github/workflows/ci.yml',
      'jobs:\n  b:\n    steps:\n      - uses: ./.github/actions/setup@main\n'],
    ['a package.json with real ranges', '/srv/app/package.json',
      '{"dependencies":{"left-pad":"^1.3.0"},"devDependencies":{"typescript":"5.9.2"}}'],
    ['a package.json that is not valid JSON yet', '/srv/app/package.json', '{"dependencies":{'],
    ['reading from the filesystem', '/srv/app/internal/report.go',
      'func load(p string) ([]byte, error) { return os.ReadFile(p) }'],
    ['a filesystem write in a test', '/srv/app/internal/tests/report_test.go',
      'func TestSave(t *testing.T) { os.WriteFile("/tmp/x", nil, 0o644) }'],
    ['a filesystem write in a migration', '/srv/app/migrations/002_seed.go',
      'func up() { os.MkdirAll("/tmp/seed", 0o755) }'],
    ['a filesystem write in a build script', '/srv/app/scripts/gen.ts',
      'fs.writeFileSync("out.json", JSON.stringify(x));'],
    ['an ordinary source file', '/srv/app/internal/ledger.go',
      'func Total(a, b int) int { return a + b }'],
  ];

  for (const [what, file, content] of MUST_PASS) {
    test(`allows ${what}`, () => {
      const r = write(file, content);
      assert.equal(r.code, 0, `${file}\n${r.stderr}`);
    });
  }

  test('reports every finding in one block rather than one per run', () => {
    const r = write('/srv/app/Dockerfile', 'FROM node:24\nRUN echo hi\n');
    assert.match(r.stderr, /BLOCKED: \d+ finding\(s\)/);
    assert.match(r.stderr, /fix:/, 'a block that does not say what to do instead gets bypassed');
  });

  test('stands down when resource hygiene is switched off', () => {
    const r = write('/srv/app/.env', 'STRIPE_KEY=sk_live_1', { CLAUDE_RESOURCE_HYGIENE: 'off' });
    assert.equal(r.code, 0);
  });

  test('leaves stdout empty when it allows the write', () => {
    const payload = { tool_name: 'Write', tool_input: { file_path: '/srv/app/ok.go', content: 'package main' } };
    const r = run('pre-write-governance-sweep.js', payload);
    assert.equal(r.stdout, '', 'an echoed payload would be read as this hook\'s own output');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Input the harness can hand any of them
// ──────────────────────────────────────────────────────────────────────────

describe('every edit gate survives input it cannot read', () => {
  const GATES = ['intake-gate.js', 'research-gate.js', 'docs-sync-gate.js',
                 'supersede-proof.js', 'pre-write-governance-sweep.js'];

  for (const hook of GATES) {
    test(`${hook} exits 0 on empty stdin`, () => {
      assert.equal(run(hook, '').code, 0);
    });

    test(`${hook} exits 0 on malformed JSON instead of failing the tool call`, () => {
      for (const junk of ['{not json', 'null', '[]', '{"tool_input":', 'plain text']) {
        assert.equal(run(hook, junk).code, 0, `${hook} <- ${junk}`);
      }
    });

    test(`${hook} exits 0 on a payload with no tool_input at all`, () => {
      assert.equal(run(hook, { session_id: uniq('sid'), tool_name: 'Edit' }).code, 0);
    });
  }

  // A parse failure must not masquerade as a finding: the blocking gates check for their own
  // "skipped:" prefix before exiting 2, and that is the line that keeps a mangled payload
  // from halting real work.
  for (const [hook, env] of [['docs-sync-gate.js', { CLAUDE_DOCS_SYNC: 'block' }],
                             ['supersede-proof.js', { CLAUDE_SUPERSEDE_PROOF: 'block' }],
                             ['intake-gate.js', { CLAUDE_INTAKE_GATE: 'block' }]]) {
    test(`${hook} does not block on unreadable input even in block mode`, () => {
      assert.equal(run(hook, '{broken', env).code, 0);
    });
  }
});
