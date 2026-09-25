#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

// PostToolUse hook (matcher: Bash).
//
// Records that a verification gate RAN this session, so task-completion-gate.js can
// stay silent on well-run work instead of firing on every completed task.
//
// Without this writer the reader has no marker to find and fires unconditionally —
// the inert-dependency shape wiring-and-usage-review.md exists to catch. Mirrors the
// intake-marker/intake-gate pair.
//
// The pattern is deliberately broad: it is a NOISE SUPPRESSOR, not a proof. A false
// positive costs one silenced reminder; being too narrow costs a warning on every
// completion, which trains the reader to ignore it — the worse failure.

const fs = require('fs');
const os = require('os');
const path = require('path');

// A gate marker must mean A GATE RAN, not that a gate's NAME appeared somewhere in a
// command. The previous form matched the bare word anywhere, so `grep -rn test .`,
// `cat build.md` or `ls test/` all wrote the marker -- which then silenced the
// verification arm of commit-gate.js. Measured 2026-09-21: that exact grep wrote
// claude-council-gate-<sid>. Only an invocation in command position counts, judged on what
// the command will RUN (lib/command-scan.js): a gate on a later line counts, a gate inside a
// heredoc that is only written to a file does not.
const { executablePart, atCommandPosition, VERIFICATION_GATE: GATE } = require('./lib/command-scan.js');


let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const cmd = String((input.tool_input && (input.tool_input.command || input.tool_input.cmd)) || '');
    if (!atCommandPosition(executablePart(cmd), GATE)) process.exit(0);

    const sid = input.session_id || 'nosession';
    // Record the TURN as well as the time. verify-before-claim.md rule 3 is explicit that
    // verification must be from THIS turn, not merely this session -- "an earlier turn ran
    // the tests, ten edits happened since". A session-scoped marker cannot express that, so
    // one gate at turn 1 silenced every later turn. prompt_id changes per user prompt and is
    // supplied on every hook payload, which is what makes turn-scoping mechanical.
    const pid = input.prompt_id || '';
    fs.writeFileSync(
      path.join(os.tmpdir(), `claude-council-gate-${sid}`),
      `${Date.now()}\n${pid}`
    );
  } catch { /* best-effort marker */ }
  process.exit(0);
});
