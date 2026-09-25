// Size budget: 14 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the Council enforcement hooks.
//
// Every test below pins a defect that was REAL and MEASURED on 2026-09-21. Before this
// suite the hooks had no tests at all, which is how two of them came to be silently
// defeatable for an unknown length of time: a control nobody exercises is a control nobody
// can tell is broken.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, json, uniq, markerExists, markerText, cleanup } from './helpers.mjs';

describe('gate-marker.js — a marker must mean a gate RAN', () => {
  const fire = (command) => {
    const sid = uniq('sid');
    run('gate-marker.js', { session_id: sid, prompt_id: 'p', tool_name: 'Bash', tool_input: { command } });
    const wrote = markerExists(`claude-council-gate-${sid}`);
    cleanup(`claude-council-gate-${sid}`);
    return wrote;
  };

  // Reading ABOUT tests is not running them. The regex matched the bare word anywhere, so
  // `grep -rn test .` wrote the marker and silenced commit-gate.js's verification arm.
  for (const cmd of ['grep -rn test .', 'cat build.md', 'ls test/', "find . -name '*test*'",
                     'echo will run the test suite later']) {
    test(`does not fire on a command that merely mentions a gate: ${cmd}`, () => {
      assert.equal(fire(cmd), false);
    });
  }

  for (const cmd of ['go test ./...', 'npx tsc --noEmit', 'golangci-lint run ./...',
                     'cd /x && go vet ./...', 'pytest -q', 'make test', 'staticcheck ./...']) {
    test(`fires on a real invocation: ${cmd}`, () => {
      assert.equal(fire(cmd), true);
    });
  }

  // A gate on a later line runs just as surely as one on the first; a gate inside a heredoc
  // that is only written to a file does not run at all.
  test('fires on a gate on the second line of a multi-line command', () => {
    assert.equal(fire('cd /svc\ngo test ./...'), true);
  });
  test('does not fire on a gate written into a file by a heredoc', () => {
    assert.equal(fire("cat > ci.sh <<'EOF'\ngo test ./...\nEOF"), false);
  });
  test('fires on a gate in a heredoc fed to a shell, because that body runs', () => {
    assert.equal(fire('bash <<EOF\ngo test ./...\nEOF'), true);
  });

  // verify-before-claim.md rule 3: verification is scoped to THIS turn. A marker that
  // cannot say which turn it belongs to cannot express that.
  test('records the turn it ran in, so a later turn can tell it is stale', () => {
    const sid = uniq('sid');
    run('gate-marker.js', { session_id: sid, prompt_id: 'turn-42', tool_name: 'Bash',
      tool_input: { command: 'go test ./...' } });
    const lines = markerText(`claude-council-gate-${sid}`).split('\n');
    assert.match(lines[0], /^\d+$/, 'first line is the timestamp');
    assert.equal(lines[1].trim(), 'turn-42', 'second line is the prompt_id');
    cleanup(`claude-council-gate-${sid}`);
  });
});

describe('deferral-gate.js — a defect is fixed, not filed', () => {
  const write = (file, content, env) =>
    run('deferral-gate.js', { tool_name: 'Write', tool_input: { file_path: file, content } }, env);

  test('blocks a pin that does not say whose decision it is', () => {
    const r = write('/x/a_test.go', '// PINS A KNOWN DEFECT - the filter is ignored.\nfunc T(){}');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /decision-owner/);
  });

  test('allows a pin that carries its justification', () => {
    const r = write('/x/a_test.go',
      ['// PINS A KNOWN DEFECT - the filter is ignored.',
       '// decision-owner: the product owner',
       '// decision-needed: derive per company, or drop the filter',
       '// recommendation: record the association when we create the list',
       'func T(){}'].join('\n'));
    assert.equal(r.code, 0);
  });

  // Plans and ADRs discuss deferral constantly and legitimately. Gating prose would fire on
  // every planning document, and a gate that fires on legitimate work gets switched off.
  test('exempts markdown', () => {
    assert.equal(write('/x/plan.md', 'deferred to a later wave').code, 0);
  });

  // A bare TODO is ordinary backlog, not a conscious decision to leave a defect. Catching it
  // would bury the signal this gate exists for.
  test('ignores a plain TODO', () => {
    assert.equal(write('/x/a.go', '// TODO: tidy this up\nfunc F(){}').code, 0);
  });

  test('ignores a marker that was already there and is untouched by this edit', () => {
    const r = run('deferral-gate.js', { tool_name: 'Edit', tool_input: { file_path: '/x/a.go',
      old_string: '// PINS A KNOWN DEFECT - old\nfunc F(){}',
      new_string: '// PINS A KNOWN DEFECT - old\nfunc F(){ return }' } });
    assert.equal(r.code, 0);
  });

  for (const phrase of ['deferred to a later pass', 'parked for now',
                        "we'll fix this properly later", 'filed rather than fixed']) {
    test(`catches the phrasing: ${phrase}`, () => {
      assert.equal(write('/x/a.go', `// ${phrase}\nfunc F(){}`).code, 2);
    });
  }

  test('respects its off switch', () => {
    const r = write('/x/a.go', '// parked for now\nfunc F(){}', { CLAUDE_DEFERRAL_GATE: 'off' });
    assert.equal(r.code, 0);
  });
});

describe('test-coverage-gate.js — a nudge switch must not disable a wall', () => {
  const edit = (env) => {
    const sid = uniq('sid');
    run('test-coverage-gate.js', { session_id: sid, prompt_id: 'p', tool_name: 'Write',
      tool_input: { file_path: '/x/a.go', content: 'package main' } }, env);
    const wrote = markerExists(`claude-council-lastedit-${sid}`);
    cleanup(`claude-council-lastedit-${sid}`, `claude-council-srcedits-${sid}`);
    return wrote;
  };

  test('stamps the edit when enabled', () => assert.equal(edit({}), true));

  // CLAUDE_TEST_COVERAGE_HOOK=off is documented as silencing an advisory nudge. The stamp is
  // shared infrastructure that the BLOCKING commit gate reads; writing it after the switch
  // meant that one variable turned the commit block from exit 2 into exit 0.
  test('still stamps the edit when the advisory nudge is switched off', () => {
    assert.equal(edit({ CLAUDE_TEST_COVERAGE_HOOK: 'off' }), true);
  });
});

describe('commit-gate.js — a commit is a claim', () => {
  const setup = (turn) => {
    const sid = uniq('sid');
    writeFileSync(join(tmpdir(), `claude-council-coverage-${sid}`), 'x');
    run('test-coverage-gate.js', { session_id: sid, prompt_id: turn, tool_name: 'Write',
      tool_input: { file_path: '/x/a.go', content: 'package main' } });
    return sid;
  };
  const gate = (sid, turn) =>
    run('gate-marker.js', { session_id: sid, prompt_id: turn, tool_name: 'Bash',
      tool_input: { command: 'go test ./...' } });
  const commit = (sid, turn) =>
    run('commit-gate.js', { session_id: sid, prompt_id: turn, tool_name: 'Bash',
      tool_input: { command: 'git commit -m x' } });
  const clean = (sid) => cleanup(`claude-council-coverage-${sid}`, `claude-council-lastedit-${sid}`,
    `claude-council-gate-${sid}`, `claude-council-srcedits-${sid}`);

  test('allows a commit when the gate ran in this turn', () => {
    const sid = setup('t1'); gate(sid, 't1');
    assert.equal(commit(sid, 't1').code, 0);
    clean(sid);
  });

  // The marker gained a second line (the prompt_id). readStamp parsed the WHOLE file as a
  // number, so it became NaN and read as "no gate ran" — blocking every commit.
  test('reads the timestamp even though the marker carries a second line', () => {
    const sid = setup('t1'); gate(sid, 't1');
    const r = commit(sid, 't1');
    assert.equal(r.code, 0, 'a same-turn gate must not read as absent');
    assert.doesNotMatch(r.stderr, /no verification gate has run/);
    clean(sid);
  });

  // verify-before-claim.md rule 3: "THIS turn, not earlier in the session."
  test('blocks a commit whose only gate ran in an earlier turn', () => {
    const sid = setup('t1'); gate(sid, 't1');
    const r = commit(sid, 't2');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /EARLIER TURN/);
    clean(sid);
  });

  test('allows it again once the gate is re-run in the current turn', () => {
    const sid = setup('t1'); gate(sid, 't1');
    assert.equal(commit(sid, 't2').code, 2);
    gate(sid, 't2');
    assert.equal(commit(sid, 't2').code, 0);
    clean(sid);
  });

  // An older harness may not supply prompt_id. Turn-scoping must degrade, never hard-block.
  test('degrades safely when the payload carries no prompt_id', () => {
    const sid = setup('t1'); gate(sid, 't1');
    const r = run('commit-gate.js', { session_id: sid, tool_name: 'Bash',
      tool_input: { command: 'git commit -m x' } });
    assert.equal(r.code, 0);
    clean(sid);
  });

  test('ignores commands that are not commits', () => {
    const sid = setup('t1');
    assert.equal(run('commit-gate.js', { session_id: sid, prompt_id: 't1', tool_name: 'Bash',
      tool_input: { command: 'git status' } }).code, 0);
    clean(sid);
  });
});

describe('check-console-log.js — an unverified claim does not end the turn', () => {
  const transcript = (text) => {
    const p = join(tmpdir(), `${uniq('transcript')}.jsonl`);
    writeFileSync(p, JSON.stringify({ type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text }] } }) + '\n');
    return p;
  };
  const stop = (text, turn, env) => {
    const p = transcript(text);
    const r = run('check-console-log.js', { prompt_id: turn, transcript_path: p }, env);
    rmSync(p, { force: true });
    return r;
  };
  // Stop keeps the turn going with guidance through hookSpecificOutput.additionalContext
  // (hooks reference, read 2026-09-21). `continue` inside hookSpecificOutput is not a Stop field.
  const continued = (r) => {
    const o = json(r.stdout)?.hookSpecificOutput;
    return Boolean(o && o.hookEventName === 'Stop' && o.additionalContext);
  };

  test('refuses to end the turn on a completion claim with no verification', () => {
    const turn = uniq('turn');
    assert.equal(continued(stop('The migration is complete.', turn)), true);
    cleanup(`claude-council-claimwall-${turn}`);
  });

  // A Stop hook that can re-fire on the turn it just extended is an infinite loop. It gets
  // one interruption, not a hostage.
  test('fires at most once per turn, so it cannot loop', () => {
    const turn = uniq('turn');
    const text = 'The migration is complete.';
    assert.equal(continued(stop(text, turn)), true, 'first Stop continues');
    assert.equal(continued(stop(text, turn)), false, 'second Stop in the same turn does not');
    cleanup(`claude-council-claimwall-${turn}`);
  });

  test('judges the reply Claude Code hands it, not an older line in the transcript', () => {
    const turn = uniq('turn');
    const p = transcript('Here is the plan for the migration.');
    const r = run('check-console-log.js', { prompt_id: turn, transcript_path: p,
      last_assistant_message: 'The migration is complete.' });
    rmSync(p, { force: true });
    assert.equal(continued(r), true, 'the transcript may not hold the final reply yet at Stop time');
    cleanup(`claude-council-claimwall-${turn}`);
  });

  test('never holds open a turn a stop hook is already continuing', () => {
    const turn = uniq('turn');
    const p = transcript('The migration is complete.');
    const r = run('check-console-log.js', { prompt_id: turn, transcript_path: p, stop_hook_active: true });
    rmSync(p, { force: true });
    assert.equal(continued(r), false);
    assert.match(json(r.stdout)?.systemMessage || '', /completion claim/, 'the warning still reaches the user');
    cleanup(`claude-council-claimwall-${turn}`);
  });

  test('lets a verified claim through', () => {
    const turn = uniq('turn');
    const r = stop('The migration is complete.\n\nVerification (this turn):\n- go test: 42/42 pass', turn);
    assert.equal(continued(r), false);
    cleanup(`claude-council-claimwall-${turn}`);
  });

  // The verification test used to accept ANY markdown table row. Because the Floor rules ask
  // for tables in most structured answers, that silenced this audit on nearly every response.
  test('a bare markdown table is not evidence of verification', () => {
    const turn = uniq('turn');
    const r = stop('The migration is complete.\n\n| a | b | c |\n|---|---|---|\n| 1 | 2 | 3 |', turn);
    assert.equal(continued(r), true, 'a table must not satisfy the verification test');
    cleanup(`claude-council-claimwall-${turn}`);
  });

  test('respects its off switch', () => {
    const turn = uniq('turn');
    const r = stop('The migration is complete.', turn, { CLAUDE_CLAIM_WALL: 'off' });
    assert.equal(continued(r), false);
    cleanup(`claude-council-claimwall-${turn}`);
  });
});

describe('every hook degrades safely on bad input', () => {
  // A hook that throws on malformed stdin breaks the tool call it was meant to guard.
  const hooks = ['gate-marker.js', 'deferral-gate.js', 'commit-gate.js',
                 'test-coverage-gate.js', 'check-console-log.js'];
  for (const h of hooks) {
    test(`${h} exits 0 on empty and malformed stdin`, () => {
      assert.equal(run(h, '').code, 0, 'empty stdin');
      assert.equal(run(h, 'not json').code, 0, 'malformed stdin');
    });
  }
});
