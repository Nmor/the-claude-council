// Size budget: 27 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the six PostToolUse MARKERS.
//
// A marker is a recorder: it says research ran, a plan exists, coverage was measured, a real
// payload was looked at. Every gate that stays quiet stays quiet because a marker told it to.
// That makes the false-positive half of each hook the dangerous half: a marker that fires on
// text ABOUT the thing hands out a session-long bypass, and nothing ever reports it, because
// a silenced gate is indistinguishable from a satisfied one.
//
// Two of the six were doing exactly that when this suite was written, both confirmed by
// running the real binaries (2026-09-21):
//   * `grep -rn "go test -cover" .` wrote the coverage marker, so the "coverage was never
//     measured this session" arm of test-coverage-gate.js could be switched off by reading.
//   * Editing any markdown that quotes the words SUPERSEDE PROOF — no-bloat.md does, in its
//     own rule 6a — armed the session bypass for supersede-proof.js.
// Both are fixed in the hooks; the tests below hold the line.
//
// Tests drive the real binaries over stdin, never imports: the harness runs processes, and
// the gap between "the function works" and "the process does" is where these bugs live.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, marker, markerExists, markerText, cleanup, advice, said } from './helpers.mjs';

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

const edit = (file_path, new_string, extra = {}) => ({
  tool_name: 'Edit',
  tool_input: { file_path, old_string: 'x', new_string, ...extra },
});
const write = (file_path, content) => ({
  tool_name: 'Write',
  tool_input: { file_path, content },
});
const bash = (command, tool_response) => ({
  tool_name: 'Bash',
  tool_input: { command },
  ...(tool_response ? { tool_response } : {}),
});

// A source file that is integration-shaped, un-tested, and outside /.claude/ — i.e. the file
// every gate below cares about. Kept as one constant so a path tweak cannot quietly make a
// gate skip and turn a failing test green.
const PROVIDER_GO = '/repo/internal/providers/stripe_client.go';
const PLAIN_GO = '/repo/internal/service.go';

// ---------------------------------------------------------------------------
// research-marker.js
// ---------------------------------------------------------------------------

describe('research-marker.js — a WebSearch is what lets research-gate stop nudging', () => {
  test('records the search, so the next edit of an integration file is not nudged again', () => {
    const sid = uniq('sid');
    try {
      const before = run('research-gate.js', { session_id: sid, ...edit(PROVIDER_GO, 'x') });
      assert.match(advice(before), /research-gate/, 'gate must nudge before any research ran');

      run('research-marker.js', { session_id: sid, tool_name: 'WebSearch', tool_input: { query: 'stripe api version' } });
      assert.equal(markerExists(`claude-council-research-${sid}`), true, 'the marker file the gate looks for');

      const after = run('research-gate.js', { session_id: sid, ...edit(PROVIDER_GO, 'x') });
      assert.equal(said(after).trim(), '', 'gate must fall silent once research is recorded');
      assert.equal(after.code, 0);
    } finally {
      cleanup(`claude-council-research-${sid}`);
    }
  });

  test('does not let one session\'s research silence another session\'s gate', () => {
    const a = uniq('sid');
    const b = uniq('sid');
    try {
      run('research-marker.js', { session_id: a, tool_name: 'WebFetch', tool_input: { url: 'https://stripe.com/docs' } });
      const other = run('research-gate.js', { session_id: b, ...edit(PROVIDER_GO, 'x') });
      assert.match(advice(other), /research-gate/, 'a marker must not be readable by a session that did not earn it');
    } finally {
      cleanup(`claude-council-research-${a}`, `claude-council-research-${b}`);
    }
  });

  test('says it skipped instead of dying quietly when its input will not parse', () => {
    const r = run('research-marker.js', '{not json');
    assert.equal(r.code, 0, 'a marker must never fail the tool it follows');
    assert.match(r.stderr, /\[research-marker\] skipped/, 'a swallowed failure must still be visible');
  });
});

// ---------------------------------------------------------------------------
// intake-marker.js
// ---------------------------------------------------------------------------

describe('intake-marker.js — a TodoWrite plan is what disarms intake-gate', () => {
  const todos = [{ content: 'phase 1', status: 'in_progress' }];

  test('records the plan, so the next source edit is not warned about', () => {
    const sid = uniq('sid');
    try {
      const before = run('intake-gate.js', { session_id: sid, ...edit(PLAIN_GO, 'x') });
      assert.match(advice(before), /intake-gate/, 'gate must warn before a plan exists');

      run('intake-marker.js', { session_id: sid, tool_name: 'TodoWrite', tool_input: { todos } });
      assert.equal(markerExists(`claude-council-intake-${sid}`), true);

      const after = run('intake-gate.js', { session_id: sid, ...edit(PLAIN_GO, 'x') });
      assert.equal(said(after).trim(), '', 'gate must fall silent once a plan is recorded');
    } finally {
      cleanup(`claude-council-intake-${sid}`);
    }
  });

  test('disarms the gate even in block mode, so a planned edit is never refused', () => {
    const sid = uniq('sid');
    try {
      const blocked = run('intake-gate.js', { session_id: sid, ...edit(PLAIN_GO, 'x') }, { CLAUDE_INTAKE_GATE: 'block' });
      assert.equal(blocked.code, 2, 'block mode must actually block an unplanned edit');

      run('intake-marker.js', { session_id: sid, tool_name: 'TodoWrite', tool_input: { todos } });
      const allowed = run('intake-gate.js', { session_id: sid, ...edit(PLAIN_GO, 'x') }, { CLAUDE_INTAKE_GATE: 'block' });
      assert.equal(allowed.code, 0, 'the marker must clear a BLOCKING gate, not just a nudge');
    } finally {
      cleanup(`claude-council-intake-${sid}`);
    }
  });

  test('does not let one session\'s plan satisfy another session\'s gate', () => {
    const a = uniq('sid');
    const b = uniq('sid');
    try {
      run('intake-marker.js', { session_id: a, tool_name: 'TodoWrite', tool_input: { todos } });
      const other = run('intake-gate.js', { session_id: b, ...edit(PLAIN_GO, 'x') });
      assert.match(advice(other), /intake-gate/);
    } finally {
      cleanup(`claude-council-intake-${a}`, `claude-council-intake-${b}`);
    }
  });

  test('says it skipped instead of dying quietly when its input will not parse', () => {
    const r = run('intake-marker.js', 'nope');
    assert.equal(r.code, 0);
    assert.match(r.stderr, /\[intake-marker\] skipped/);
  });
});

// ---------------------------------------------------------------------------
// docs-sync-marker.js
// ---------------------------------------------------------------------------

describe('docs-sync-marker.js — it must classify a file as what it IS', () => {
  const KINDS = ['code', 'docs', 'plan', 'memory'];
  const kindsFor = (file) => {
    const sid = uniq('sid');
    run('docs-sync-marker.js', { session_id: sid, ...write(file, 'body') });
    const got = KINDS.filter((k) => markerExists(`claude-docs-sync-${k}-${sid}`));
    cleanup(...KINDS.map((k) => `claude-docs-sync-${k}-${sid}`));
    return got;
  };

  for (const [file, expected] of [
    ['/repo/internal/service.go', 'code'],
    ['/repo/src/app.ts', 'code'],
    ['/repo/api/handler.py', 'code'],
    ['/repo/README.md', 'docs'],
    ['/repo/CHANGELOG.md', 'docs'],
    ['/repo/docs/runbook.md', 'docs'],
    ['/repo/site/guide.mdx', 'docs'],
    ['/repo/.claude/plans/wave-two.md', 'plan'],
    ['/repo/.claude/memory/MEMORY.md', 'memory'],
  ]) {
    test(`counts ${file} as a ${expected} change`, () => {
      assert.deepEqual(kindsFor(file), [expected]);
    });
  }

  // The false-positive half. Editing the framework is not shipping product docs, and the
  // gate blocks on a code change with no docs — so a framework edit that counted as "docs"
  // would let a real code change close its todos with the docs still stale.
  for (const file of [
    `${homedir()}/.claude/rules/common/no-bloat.md`,
    `${homedir()}/.claude/skills/tdd-workflow/SKILL.md`,
    `${homedir()}/.claude/agents/code-reviewer.md`,
    '/repo/.claude/settings.json',
  ]) {
    test(`records nothing for framework file ${file.replace(homedir(), '~')}`, () => {
      assert.deepEqual(kindsFor(file), []);
    });
  }

  for (const file of ['/repo/package.json', '/repo/Dockerfile', '/repo/.env.example']) {
    test(`records nothing for ${file}, which is neither product code nor product docs`, () => {
      assert.deepEqual(kindsFor(file), []);
    });
  }

  // docs-sync-gate.js moved from PostToolUse:TodoWrite to Stop on 2026-09-21. Its tests now
  // live in plan-docs-gates.test.mjs, each labelled with the TodoWrite-era test it carries.

  test('writes nothing and exits 0 when handed no input at all', () => {
    const r = run('docs-sync-marker.js', '');
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });

  test('exits 0 rather than failing the edit when its input will not parse', () => {
    assert.equal(run('docs-sync-marker.js', '{{{').code, 0);
  });
});

// ---------------------------------------------------------------------------
// test-coverage-marker.js
// ---------------------------------------------------------------------------

describe('test-coverage-marker.js — measuring coverage is not reading about it', () => {
  const fire = (command, tool_response) => {
    const sid = uniq('sid');
    run('test-coverage-marker.js', { session_id: sid, ...bash(command, tool_response) });
    const name = `claude-council-coverage-${sid}`;
    const out = markerExists(name) ? markerText(name) : null;
    cleanup(name);
    return out;
  };

  // The defect this suite was written to kill: the regex matched a coverage command's TEXT
  // anywhere in the line, so any read-only command that merely quoted one silenced the
  // "coverage has never been measured this session" nudge for the rest of the session.
  for (const cmd of [
    'grep -rn "go test -cover" .',
    'rg "pytest --cov" Makefile',
    'cat notes.md | grep nyc',
    'echo "remember to run vitest --coverage"',
    'ls coverage/',
    'head -20 coverage.out',
    'git log --grep="coverage run"',
  ]) {
    test(`stays silent when a command merely mentions coverage: ${cmd}`, () => {
      assert.equal(fire(cmd), null);
    });
  }

  test('stays silent on a test run that measured nothing', () => {
    assert.equal(fire('go test ./...', { stdout: 'ok  repo/internal 0.4s' }), null);
  });

  for (const cmd of [
    'go test ./... -coverprofile=coverage.out',
    'go tool cover -func=coverage.out',
    'npx vitest run --coverage',
    'pytest --cov=app --cov-report=term',
    'npx nyc mocha',
    'cargo tarpaulin --out Xml',
  ]) {
    test(`records a real measurement: ${cmd}`, () => {
      assert.notEqual(fire(cmd, { stdout: 'ran' }), null);
    });
  }

  // The number is the point. A marker that records "measured" without the figure cannot
  // support rule 1 of functional-test-coverage.md ("report the real number").
  for (const [label, out, expected] of [
    ['go test', 'ok repo/x\tcoverage: 84.2% of statements', '84.2'],
    ['go tool cover', 'total:\t(statements)\t61.9%', '61.9'],
    ['istanbul table', 'All files |   72.5 |    50 |', '72.5'],
    ['pytest-cov', 'TOTAL   1200    300    75%', '75'],
  ]) {
    test(`carries the real percentage out of ${label} output, not just "it ran"`, () => {
      const text = fire('go test ./... -coverprofile=c.out', { stdout: out });
      assert.equal(JSON.parse(text).measured, expected);
    });
  }

  test('reads the figure from stderr too, where several runners print it', () => {
    const text = fire('pytest --cov=app', { stderr: 'TOTAL   10    2    80%' });
    assert.equal(JSON.parse(text).measured, '80');
  });

  test('the recorded marker is what stops the gate asking for a measurement', () => {
    const sid = uniq('sid');
    const dir = mkdtempSync(join(tmpdir(), 'covproj-'));
    const src = join(dir, 'mod.ts');
    const counter = `claude-council-srcedits-${sid}`;
    const covMarker = `claude-council-coverage-${sid}`;
    try {
      writeFileSync(src, 'export const a = 1;\n');
      writeFileSync(join(dir, 'mod.test.ts'), 'import "./mod";\n'); // so the no-companion-test arm stays quiet
      // The nudge fires once, late: prime the session's edit counter to just under the threshold.
      writeFileSync(marker(counter), '11');

      const asked = run('test-coverage-gate.js', { session_id: sid, ...write(src, 'export const a = 2;') });
      assert.match(advice(asked), /coverage has not\s+been measured/, 'the gate must ask when nothing was measured');

      writeFileSync(marker(counter), '11');
      run('test-coverage-marker.js', { session_id: sid, ...bash('go test ./... -coverprofile=c.out', { stdout: 'coverage: 91.0% of statements' }) });
      const quiet = run('test-coverage-gate.js', { session_id: sid, ...write(src, 'export const a = 3;') });
      assert.equal(said(quiet).trim(), '', 'the marker name must be exactly the one the gate reads');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      cleanup(counter, covMarker, `claude-council-covnudge-${sid}`, `claude-council-lastedit-${sid}`);
    }
  });

  test('says it skipped instead of dying quietly when its input will not parse', () => {
    const r = run('test-coverage-marker.js', 'not-json');
    assert.equal(r.code, 0);
    assert.match(r.stderr, /\[test-coverage-marker\] skipped/);
  });

  test('exits 0 and records nothing when handed no input at all', () => {
    const r = run('test-coverage-marker.js', '');
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });
});

// ---------------------------------------------------------------------------
// supersede-proof-marker.js
// ---------------------------------------------------------------------------

describe('supersede-proof-marker.js — quoting the words is not writing the proof', () => {
  const PROOF = '// SUPERSEDE PROOF: replaces OldThing; inputs, outputs, guards carried forward.';
  const fire = (payload) => {
    const sid = uniq('sid');
    run('supersede-proof-marker.js', { session_id: sid, ...payload });
    const wrote = markerExists(`claude-supersede-proof-${sid}`);
    cleanup(`claude-supersede-proof-${sid}`);
    return wrote;
  };

  test('records a proof landed on the replacement source file', () => {
    assert.equal(fire(write(PLAIN_GO, `${PROOF}\nfunc NewThing() {}\n`)), true);
  });

  test('records a proof landed inside a MultiEdit, not only a whole-file Write', () => {
    assert.equal(
      fire({
        tool_name: 'MultiEdit',
        tool_input: { file_path: PLAIN_GO, edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: PROOF }] },
      }),
      true,
    );
  });

  // The defect: the marker had no file scope at all, so writing prose that QUOTES the phrase
  // armed the session-wide bypass. no-bloat.md quotes it in its own rule 6a, so editing the
  // rule that demands the proof was enough to switch off the hook that enforces it.
  for (const [label, file] of [
    ['the rule that defines it', `${homedir()}/.claude/rules/common/no-bloat.md`],
    ['a plan that schedules one', '/repo/.claude/plans/wave-two.md'],
    ['a project README', '/repo/README.md'],
    ['a memory note', '/repo/.claude/memory/MEMORY.md'],
  ]) {
    test(`stays silent when ${label} merely mentions SUPERSEDE PROOF`, () => {
      assert.equal(fire(write(file, `Rule 6a. SUPERSEDE PROOF — the replacement must be a strict superset.`)), false);
    });
  }

  test('stays silent on an ordinary source edit that proves nothing', () => {
    assert.equal(fire(edit(PLAIN_GO, 'func NewThing() {}\n')), false);
  });

  test('the recorded proof is what lets a delete in another file through the gate', () => {
    const sid = uniq('sid');
    const removal = {
      session_id: sid,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/repo/internal/old_service.go',
        old_string: 'func OldThing(ctx context.Context) error {\n\treturn nil\n}\n',
        new_string: '',
      },
    };
    try {
      const refused = run('supersede-proof.js', removal, { CLAUDE_SUPERSEDE_PROOF: 'block' });
      assert.equal(refused.code, 2, 'an unproven net removal must be refused in block mode');

      run('supersede-proof-marker.js', { session_id: sid, ...write('/repo/internal/new_service.go', `${PROOF}\nfunc NewThing() {}\n`) });
      const allowed = run('supersede-proof.js', removal, { CLAUDE_SUPERSEDE_PROOF: 'block' });
      assert.equal(allowed.code, 0, 'the marker name must be exactly the one the gate reads');
    } finally {
      cleanup(`claude-supersede-proof-${sid}`);
    }
  });

  test('exits 0 and records nothing when handed no input at all', () => {
    const r = run('supersede-proof-marker.js', '');
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });

  test('exits 0 rather than failing the edit when its input will not parse', () => {
    assert.equal(run('supersede-proof-marker.js', '<html>').code, 0);
  });
});

// ---------------------------------------------------------------------------
// payload-marker.js
// ---------------------------------------------------------------------------

describe('payload-marker.js — looking at a payload is not grepping for one', () => {
  const fire = (command) => {
    const sid = uniq('sid');
    run('payload-marker.js', { session_id: sid, prompt_id: 'turn-1', ...bash(command) });
    const wrote = markerExists(`claude-council-payload-${sid}`);
    cleanup(`claude-council-payload-${sid}`);
    return wrote;
  };

  for (const cmd of [
    'curl -s https://api.example.com/v1/agreements',
    'curl -X GET "https://dev.provider.test/accounts" -H "Authorization: Bearer $T"',
    'wget -qO- https://dev.provider.test/openapi.json',
    'grpcurl -plaintext localhost:50051 list',
    'openssl s_client -connect api.provider.test:443',
    'jq ".rows | length" vendor/openapi.yaml',
    'jq . testdata/provider_response.json',
  ]) {
    test(`records that a real payload was seen: ${cmd.slice(0, 48)}`, () => {
      assert.equal(fire(cmd), true);
    });
  }

  // Reading our own code tells us what WE believe the shape is — the belief the rule exists
  // to check. A marker written by a grep would clear the gate with nothing confirmed.
  for (const cmd of [
    'grep -rn "curl" internal/providers/client.go',
    'cat internal/providers/client.go',
    'rg "json.Unmarshal" --type go',
    'find . -name "*openapi*.json"',
    'ls testdata/',
    'go test ./internal/providers/...',
    'sed -n "1,40p" internal/providers/client.go',
  ]) {
    test(`stays silent on a command that only reads our own side: ${cmd.slice(0, 44)}`, () => {
      assert.equal(fire(cmd), false);
    });
  }

  test('the recorded look is what lets a decode edit through the payload gate', () => {
    const sid = uniq('sid');
    const decode = {
      session_id: sid,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/repo/internal/providers/client.go',
        old_string: 'x',
        new_string: 'if err := json.Unmarshal(resp, &out); err != nil { return err }',
      },
    };
    try {
      const refused = run('payload-gate.js', decode, { CLAUDE_PAYLOAD_GATE: 'block' });
      assert.equal(refused.code, 2, 'decoding an unconfirmed shape must be refused in block mode');

      run('payload-marker.js', { session_id: sid, ...bash('curl -s https://dev.provider.test/accounts') });
      const allowed = run('payload-gate.js', decode, { CLAUDE_PAYLOAD_GATE: 'block' });
      assert.equal(allowed.code, 0, 'the marker name must be exactly the one the gate reads');
    } finally {
      cleanup(`claude-council-payload-${sid}`);
    }
  });

  test('records which turn looked, so a later turn can tell the evidence is stale', () => {
    const sid = uniq('sid');
    try {
      run('payload-marker.js', { session_id: sid, prompt_id: 'turn-7', ...bash('curl -s https://dev.provider.test/x') });
      const lines = markerText(`claude-council-payload-${sid}`).split('\n');
      assert.match(lines[0], /^\d+$/);
      assert.equal(lines[1], 'turn-7');
    } finally {
      cleanup(`claude-council-payload-${sid}`);
    }
  });

  test('records nothing when the payload carries no session to scope the marker to', () => {
    const r = run('payload-marker.js', { tool_name: 'Bash', tool_input: { command: 'curl https://x.test' } });
    assert.equal(r.code, 0);
    assert.equal(markerExists('claude-council-payload-'), false, 'an unscoped marker would be readable by every session');
  });

  test('exits 0 and records nothing when handed no input at all', () => {
    const r = run('payload-marker.js', '');
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });

  test('exits 0 rather than failing the command when its input will not parse', () => {
    assert.equal(run('payload-marker.js', 'garbage').code, 0);
  });
});

// ---------------------------------------------------------------------------
// Wiring: these markers have no internal tool check, so the matcher IS the check
// ---------------------------------------------------------------------------

describe('settings.json — a marker is only honest if its matcher is right', () => {
  const settings = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8'));
  const matchersFor = (script) =>
    (settings.hooks?.PostToolUse || [])
      .filter((e) => (e.hooks || []).some((h) => String(h.command || '').includes(script)))
      .map((e) => e.matcher);

  // research-marker and intake-marker write unconditionally — they never look at tool_name.
  // Widening either matcher would turn them into recorders of nothing in particular.
  for (const [script, matcher] of [
    ['research-marker.js', 'WebSearch|WebFetch'],
    ['intake-marker.js', 'TodoWrite'],
    ['test-coverage-marker.js', 'Bash'],
    ['payload-marker.js', 'Bash'],
    ['docs-sync-marker.js', 'Edit|Write|MultiEdit'],
    ['supersede-proof-marker.js', 'Edit|Write|MultiEdit'],
  ]) {
    test(`${script} runs only on ${matcher}`, () => {
      assert.deepEqual(matchersFor(script), [matcher]);
    });
  }
});
