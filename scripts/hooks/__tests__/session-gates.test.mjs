// Size budget: 22 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the session-level gates and recorders.
//
// These six hooks fire on events nobody watches — a task marked complete, a subagent
// finishing, a permission denial, a failed tool call, a session ending. That is exactly
// why they need tests: when one of them stops firing, or starts firing on ordinary work,
// there is no turn-by-turn signal that would tell anyone.
//
// The "must stay silent" half of each block is the important half. A gate that nags on
// real work gets switched off, and then it protects nothing.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, cleanup, advice, said } from './helpers.mjs';

const trash = [];
after(() => { for (const d of trash) rmSync(d, { recursive: true, force: true }); });

// A throwaway HOME, because three of these hooks append to ~/.claude/audits and a test
// must not write into the operator's real audit trail.
function sandboxHome() {
  const home = mkdtempSync(join(tmpdir(), 'hookhome-'));
  trash.push(home);
  return home;
}

const auditRows = (home, file) => {
  const p = join(home, '.claude', 'audits', file);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
};

// ---------------------------------------------------------------------------
// parity-gate.js — PostToolUse(Edit|Write|MultiEdit)
// ---------------------------------------------------------------------------
describe('parity-gate.js — a wave-close without its Step 6 parity scan', () => {
  // The hook reads the file off disk, so a plan has to really exist at a
  // `/.claude/plans/` path for any of this to mean anything.
  function planDir() {
    const root = mkdtempSync(join(tmpdir(), 'parity-'));
    trash.push(root);
    const dir = join(root, '.claude', 'plans');
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  function edit(file, { sid = uniq('sid'), env = {} } = {}) {
    const r = run('parity-gate.js',
      { session_id: sid, tool_name: 'Write', tool_input: { file_path: file } }, env);
    cleanup(`claude-council-parity-${sid}`);
    return r;
  }

  const plan = (name, body) => {
    const f = join(planDir(), name);
    writeFileSync(f, body);
    return f;
  };

  test('warns when a plan records a wave close carrying no competitive-parity block', () => {
    const f = plan('wave-2.md', '# Wave 2\n\nPhase retrospective sweep: all gates green.\n');
    const r = edit(f);
    assert.equal(r.code, 0, 'it is a nudge, never a block');
    assert.match(advice(r), /parity-gate/);
    assert.match(advice(r), /Competitive parity/i, 'it must name the artefact that is missing');
  });

  test('warns when a phase is marked complete with no parity block', () => {
    const f = plan('phase.md', '- [x] Phase 3 complete — all tasks ticked.\n');
    assert.match(advice(edit(f)), /parity-gate/);
  });

  test('stays silent when the close already carries its parity block', () => {
    const f = plan('done.md',
      'Phase 3 complete.\n\n## Competitive parity (this wave)\n- scanned: none open\n');
    assert.equal(said(edit(f)), '', 'nagging a plan that DID the scan is how the hook gets disabled');
  });

  test('stays silent on a plan that is still in progress', () => {
    const f = plan('wip.md', '# Wave 4\n\n- [ ] Phase 1 — in progress\n- [ ] Phase 2 — not started\n');
    assert.equal(said(edit(f)), '');
  });

  test('stays silent on a markdown file that is not a plan', () => {
    // The rule file that DESCRIBES wave closes lives outside `.claude/plans/` and must not
    // be treated as one, or every edit to the rules would fire the gate.
    const root = mkdtempSync(join(tmpdir(), 'parity-doc-'));
    trash.push(root);
    const f = join(root, 'docs', 'retro.md');
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(f, 'Phase retrospective sweep: what a wave close means.\n');
    assert.equal(said(edit(f)), '');
  });

  test('stays silent on a non-markdown file inside the plans directory', () => {
    const f = join(planDir(), 'notes.txt');
    writeFileSync(f, 'Phase 3 complete.\n');
    assert.equal(said(edit(f)), '');
  });

  test('warns once per session, not on every subsequent plan edit', () => {
    const sid = uniq('sid');
    const f = plan('repeat.md', 'Wave 1 complete.\n');
    const first = run('parity-gate.js',
      { session_id: sid, tool_name: 'Write', tool_input: { file_path: f } });
    const second = run('parity-gate.js',
      { session_id: sid, tool_name: 'Write', tool_input: { file_path: f } });
    cleanup(`claude-council-parity-${sid}`);
    assert.match(advice(first), /parity-gate/);
    assert.equal(said(second), '', 'a reminder repeated every edit is noise, and noise gets muted');
  });

  test('CLAUDE_PARITY_GATE=off silences it entirely', () => {
    const f = plan('off.md', 'Wave 1 complete.\n');
    const r = edit(f, { env: { CLAUDE_PARITY_GATE: 'off' } });
    assert.equal(r.code, 0);
    assert.equal(said(r), '');
  });

  test('says nothing when the plan file is not on disk', () => {
    const r = edit(join(planDir(), 'never-written.md'));
    assert.equal(r.code, 0);
    assert.equal(said(r), '');
  });

  test('exits 0 on empty and malformed stdin', () => {
    assert.equal(run('parity-gate.js', '').code, 0);
    assert.equal(run('parity-gate.js', 'not json').code, 0);
    assert.equal(run('parity-gate.js', '{"session_id":').code, 0);
  });
});

// ---------------------------------------------------------------------------
// task-completion-gate.js — TaskCompleted
// ---------------------------------------------------------------------------
describe('task-completion-gate.js — "done" with no gate run this session', () => {
  const complete = (sid, env = {}) => run('task-completion-gate.js', { session_id: sid }, env);

  const withGateMarker = (sid) => {
    writeFileSync(join(tmpdir(), `claude-council-gate-${sid}`), `${Date.now()}\nturn-1\n`);
    return sid;
  };

  test('warns when a task is completed and no gate ran this session', () => {
    const sid = uniq('sid');
    const r = complete(sid);
    assert.equal(r.code, 0, 'it is a nudge, never a block');
    assert.match(advice(r), /task-gate/);
    assert.match(advice(r), /no-overclaim/, 'it must cite the rule so the reader can check it');
  });

  test('stays silent once a gate has actually run this session', () => {
    const sid = withGateMarker(uniq('sid'));
    const r = complete(sid);
    cleanup(`claude-council-gate-${sid}`);
    assert.equal(said(r), '', 'nagging well-run work is how the hook gets switched off');
  });

  test('one session\'s gate does not silence another session\'s completion', () => {
    const ran = withGateMarker(uniq('sid'));
    const other = uniq('sid');
    const r = complete(other);
    cleanup(`claude-council-gate-${ran}`, `claude-council-gate-${other}`);
    assert.match(advice(r), /task-gate/, 'the marker is per-session or it proves nothing');
  });

  test('exits 0 on empty and malformed stdin', () => {
    assert.equal(run('task-completion-gate.js', '').code, 0);
    assert.equal(run('task-completion-gate.js', 'not json').code, 0);
    cleanup('claude-council-gate-nosession');
  });
});

// ---------------------------------------------------------------------------
// subagent-verification-gate.js — SubagentStop
// ---------------------------------------------------------------------------
describe('subagent-verification-gate.js — unverified delegated edits', () => {
  // SubagentStop carries no list of tool calls; it names the subagent's transcript
  // (hooks reference, read 2026-09-21). The calls are written there as assistant entries whose
  // message.content holds tool_use blocks, the shape read off a real subagent transcript.
  const transcripts = mkdtempSync(join(tmpdir(), 'subagent-tx-'));
  after(() => rmSync(transcripts, { recursive: true, force: true }));
  const stop = (calls, extra = {}) => {
    const file = join(transcripts, `${uniq('agent')}.jsonl`);
    writeFileSync(file, calls.map((c, i) => JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'tool_use', id: `t${i}`, name: c.name, input: c.input }] },
    })).join('\n'));
    return run('subagent-verification-gate.js',
      { hook_event_name: 'SubagentStop', stop_hook_active: false, agent_transcript_path: file, ...extra });
  };

  const wrote = (file_path) => ({ name: 'Write', input: { file_path } });
  const ran = (command) => ({ name: 'Bash', input: { command } });

  test('tells the subagent, once, when it edited files and ran no gate', () => {
    const r = stop([wrote('/x/a.go'), wrote('/x/b.go')]);
    assert.equal(r.code, 0, 'it keeps the subagent going with a note; it never errors');
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SubagentStop');
    assert.match(advice(r), /subagent-gate/);
    assert.match(advice(r), /2 file/, 'the count says how much there is to gate');
  });

  test('names the files it wants gated', () => {
    const r = stop([wrote('/x/pay.go'), wrote('/x/ledger.go')]);
    assert.match(advice(r), /\/x\/pay\.go/);
    assert.match(advice(r), /\/x\/ledger\.go/);
  });

  test('stays silent when the subagent ran a real gate on its own edits', () => {
    assert.equal(said(stop([wrote('/x/a.go'), ran('go test ./...')])), '');
    assert.equal(said(stop([wrote('/x/a.ts'), ran('npx tsc --noEmit')])), '');
    assert.equal(said(stop([wrote('/x/a.py'), ran('pytest -q')])), '');
  });

  test('a command that only mentions a gate is not one', () => {
    assert.match(advice(stop([wrote('/x/a.go'), ran('grep -rn test .')])), /subagent-gate/);
  });

  test('says it at most once: a subagent already kept going by a stop hook may stop', () => {
    assert.equal(said(stop([wrote('/x/a.go')], { stop_hook_active: true })), '');
  });

  test('stays silent for a read-only subagent, which has nothing to verify', () => {
    const r = stop([
      { name: 'Read', input: { file_path: '/x/a.go' } },
      { name: 'Grep', input: { pattern: 'func' } },
      ran('ls -la /x'),
    ]);
    assert.equal(said(r), '', 'search agents are the majority; firing on them would bury the signal');
  });

  test('stays silent when there is no transcript to read', () => {
    assert.equal(said(run('subagent-verification-gate.js', { session_id: 's' })), '');
    assert.equal(said(run('subagent-verification-gate.js', { agent_transcript_path: join(transcripts, 'none.jsonl') })), '');
  });

  test('lists at most ten files, so a large refactor does not flood the note', () => {
    const many = Array.from({ length: 14 }, (_, i) => wrote(`/x/f${i}.go`));
    const listed = advice(stop(many)).split('\n').filter((l) => l.trim().startsWith('- /x/'));
    assert.equal(listed.length, 10);
  });

  test('counts each edit tool the subagent used, not just Write', () => {
    const r = stop([
      { name: 'Edit', input: { file_path: '/x/a.go' } },
      { name: 'MultiEdit', input: { file_path: '/x/b.go' } },
      { name: 'NotebookEdit', input: { notebook_path: '/x/c.ipynb' } },
    ]);
    assert.match(advice(r), /3 file/);
    assert.match(advice(r), /c\.ipynb/, 'a notebook edit names its notebook');
  });

  test('exits 0 on empty and malformed stdin', () => {
    assert.equal(run('subagent-verification-gate.js', '').code, 0);
    assert.equal(run('subagent-verification-gate.js', 'not json').code, 0);
  });
});

// ---------------------------------------------------------------------------
// permission-denied-audit.js — PermissionDenied
// ---------------------------------------------------------------------------
describe('permission-denied-audit.js — the bypass log actually gets fed', () => {
  const deny = (payload, home) =>
    run('permission-denied-audit.js', payload, { HOME: home });

  test('records a denial as a row in bypass-log.jsonl', () => {
    const home = sandboxHome();
    const r = deny({ session_id: 's1', tool_name: 'Bash', cwd: '/w', reason: 'blocked by rule' }, home);
    assert.equal(r.code, 0);
    const rows = auditRows(home, 'bypass-log.jsonl');
    assert.equal(rows.length, 1, 'council-default r4 says the pattern must be reviewable later');
    assert.equal(rows[0].event, 'permission.denied');
    assert.equal(rows[0].session_id, 's1');
    assert.equal(rows[0].tool, 'Bash');
    assert.equal(rows[0].detail, 'blocked by rule');
    assert.match(rows[0].ts, /^\d{4}-\d{2}-\d{2}T/, 'a pattern needs timestamps to be a pattern');
  });

  test('appends, so a second denial does not erase the first', () => {
    const home = sandboxHome();
    deny({ session_id: 's1', tool_name: 'Bash', reason: 'one' }, home);
    deny({ session_id: 's1', tool_name: 'Write', reason: 'two' }, home);
    assert.deepEqual(auditRows(home, 'bypass-log.jsonl').map((r) => r.detail), ['one', 'two']);
  });

  test('truncates the detail, because a denied command can carry a secret in its args', () => {
    const home = sandboxHome();
    deny({ session_id: 's1', reason: `AWS_SECRET=${'x'.repeat(600)}` }, home);
    assert.equal(auditRows(home, 'bypass-log.jsonl')[0].detail.length, 300);
  });

  test('falls back to message when the payload has no reason', () => {
    const home = sandboxHome();
    deny({ session_id: 's1', message: 'user declined' }, home);
    assert.equal(auditRows(home, 'bypass-log.jsonl')[0].detail, 'user declined');
  });

  test('says nothing on stderr — the denial is already visible to both reader and model', () => {
    const home = sandboxHome();
    const r = deny({ session_id: 's1', tool_name: 'Bash', reason: 'blocked' }, home);
    assert.equal(r.stderr, '');
    assert.equal(r.stdout, '');
  });

  test('exits 0 on empty and malformed stdin without writing a corrupt row', () => {
    const home = sandboxHome();
    assert.equal(run('permission-denied-audit.js', 'not json', { HOME: home }).code, 0);
    assert.equal(auditRows(home, 'bypass-log.jsonl').length, 0);
    assert.equal(run('permission-denied-audit.js', '', { HOME: home }).code, 0);
    for (const row of auditRows(home, 'bypass-log.jsonl')) {
      assert.equal(typeof row.ts, 'string', 'every row written must still be valid JSONL');
    }
  });
});

// ---------------------------------------------------------------------------
// tool-failure-recorder.js — PostToolUseFailure
// ---------------------------------------------------------------------------
describe('tool-failure-recorder.js — a failure leaves a durable count', () => {
  const fail = (payload, home) => run('tool-failure-recorder.js', payload, { HOME: home });

  test('records a failed tool call as a row in tool-failures.jsonl', () => {
    const home = sandboxHome();
    const r = fail({ session_id: 's1', tool_name: 'Bash', cwd: '/w', error: 'exit 1: no such file' }, home);
    assert.equal(r.code, 0);
    const rows = auditRows(home, 'tool-failures.jsonl');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tool, 'Bash');
    assert.equal(rows[0].session_id, 's1');
    assert.equal(rows[0].error, 'exit 1: no such file');
  });

  test('counts repeats — a command failing three times leaves three rows', () => {
    const home = sandboxHome();
    for (let i = 0; i < 3; i++) fail({ session_id: 's1', tool_name: 'Bash', error: 'boom' }, home);
    assert.equal(auditRows(home, 'tool-failures.jsonl').length, 3,
      'no-silent-failures r8: the log says "this once", the count says "N times"');
  });

  test('prefers the explicit error over the raw tool response', () => {
    const home = sandboxHome();
    fail({ session_id: 's1', error: 'the real cause', tool_response: 'noise' }, home);
    assert.equal(auditRows(home, 'tool-failures.jsonl')[0].error, 'the real cause');
  });

  test('truncates the error, because a failed command\'s args can carry a secret', () => {
    const home = sandboxHome();
    fail({ session_id: 's1', error: 'y'.repeat(900) }, home);
    assert.equal(auditRows(home, 'tool-failures.jsonl')[0].error.length, 300);
  });

  test('says nothing on stderr — re-narrating a failure the model just read costs context', () => {
    const home = sandboxHome();
    const r = fail({ session_id: 's1', tool_name: 'Bash', error: 'boom' }, home);
    assert.equal(r.stderr, '');
    assert.equal(r.stdout, '');
  });

  test('exits 0 on empty and malformed stdin without writing a corrupt row', () => {
    const home = sandboxHome();
    assert.equal(run('tool-failure-recorder.js', 'not json', { HOME: home }).code, 0);
    assert.equal(auditRows(home, 'tool-failures.jsonl').length, 0);
    assert.equal(run('tool-failure-recorder.js', '', { HOME: home }).code, 0);
    for (const row of auditRows(home, 'tool-failures.jsonl')) {
      assert.equal(typeof row.ts, 'string');
    }
  });
});

// ---------------------------------------------------------------------------
// evaluate-session.js — SessionEnd
// ---------------------------------------------------------------------------
describe('evaluate-session.js — the learning loop\'s session-length floor', () => {
  function transcript(userMessages) {
    const dir = mkdtempSync(join(tmpdir(), 'transcript-'));
    trash.push(dir);
    const f = join(dir, 'session.jsonl');
    writeFileSync(f, Array.from({ length: userMessages },
      () => JSON.stringify({ type: 'user', message: 'hi' })).join('\n') + '\n');
    return f;
  }

  const end = (payload, env = {}) =>
    run('evaluate-session.js', payload, { HOME: sandboxHome(), ...env });

  test('flags a session at the ten-message floor for pattern extraction', () => {
    const r = end({ transcript_path: transcript(10) });
    assert.equal(r.code, 0);
    assert.match(r.stderr, /Session has 10 messages/);
    assert.match(r.stderr, /evaluate for extractable patterns/);
  });

  test('skips a session one message below the floor', () => {
    const r = end({ transcript_path: transcript(9) });
    assert.match(r.stderr, /too short \(9 messages\)/,
      'the floor must be a real boundary, not a number nobody applies');
    assert.doesNotMatch(r.stderr, /evaluate for extractable patterns/);
  });

  test('counts user turns even when the transcript spaces its JSON keys', () => {
    const dir = mkdtempSync(join(tmpdir(), 'transcript-ws-'));
    trash.push(dir);
    const f = join(dir, 's.jsonl');
    writeFileSync(f, Array.from({ length: 11 }, () => '{"type" : "user"}').join('\n'));
    assert.match(end({ transcript_path: f }).stderr, /Session has 11 messages/);
  });

  test('reads its config from the skill directory that actually exists', () => {
    // The lookup pointed at `continuous-learning` for a long time while the skill has always
    // been `continuous-learning-v2`, so every session end silently ran on defaults. If that
    // path regresses, this line comes back.
    const r = end({ transcript_path: transcript(10) });
    assert.doesNotMatch(r.stderr, /config not found/);
  });

  test('exits 0 when the transcript path points at nothing', () => {
    const r = end({ transcript_path: join(tmpdir(), 'no-such-transcript.jsonl') });
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });

  test('exits 0 when the payload names no transcript at all', () => {
    const r = end({ session_id: 's1' });
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '');
  });

  test('falls back to CLAUDE_TRANSCRIPT_PATH when stdin is not JSON', () => {
    const f = transcript(12);
    const r = run('evaluate-session.js', 'not json',
      { HOME: sandboxHome(), CLAUDE_TRANSCRIPT_PATH: f });
    assert.equal(r.code, 0);
    assert.match(r.stderr, /Session has 12 messages/, 'the documented fallback must work');
  });

  test('exits 0 on empty stdin', () => {
    assert.equal(run('evaluate-session.js', '', { HOME: sandboxHome() }).code, 0);
  });
});
