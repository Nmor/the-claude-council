#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

// PreToolUse hook (matcher: Edit|Write|MultiEdit).
// Enforces task-intake-due-diligence.md at the file-mutation boundary — the exact
// point where "dove straight into editing without the Phase-0 intake" drift
// happens. If a project SOURCE file is about to be mutated and no plan exists for
// this session's work, the gate surfaces a reminder.
//
// EVIDENCE OF A PLAN — either of:
//   - intake-marker.js recorded a TodoWrite plan this session, where the harness has
//     TodoWrite;
//   - a plan file (any `.claude/plans/*.md` on the way up, or `~/.claude/plans/`) was
//     written after this session began.
// The second exists because not every harness offers TodoWrite. Keyed to the marker
// alone, this gate could never be satisfied in such a session and fired on every
// source edit — and a reminder that repeats on every edit teaches everyone to ignore
// it. There, the plan file IS the task list (plan-execution-progress.md rule 9).
//
// Modes (env CLAUDE_INTAKE_GATE):
//   unset / "nudge"  -> NON-BLOCKING reminder, ONCE per session (default)
//   "block"          -> BLOCK every un-planned source edit (exit 2) until a plan exists
//   "off"            -> disabled
//
// "Once per session" is now true: it is recorded. The header promised it before and
// nothing implemented it, so the nudge repeated on every edit.
//
// Deliberately scoped to avoid false positives: skips framework files under any
// /.claude/ path and non-source files. A hard block on "did the model WRITE the intake
// prose" is not mechanically possible (it is model text, not a tool call); this gates
// the observable proxy — a plan must precede code mutation on non-trivial work.

const fs = require('fs');
const os = require('os');
const path = require('path');
const pc = require('./lib/project-context.js');
const { advise } = require('./lib/advise.js');

const MODE = String(process.env.CLAUDE_INTAKE_GATE || 'nudge').toLowerCase();
// Real source files — the surface a non-trivial task mutates. Config/markdown/JSON
// are intentionally excluded so docs/config tweaks never trip the gate.
const SRC = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|scala|cs|rb|php|swift|m|mm|c|h|cc|cpp|hpp|vue|svelte|sql)$/i;

// The session began when its transcript was created; a plan written since then is this
// session's plan. Without a transcript path there is no session start to compare against.
function planWrittenThisSession(input, file) {
  let since = 0;
  try {
    const st = fs.statSync(input.transcript_path || '');
    since = st.birthtimeMs || st.ctimeMs || 0;
  } catch {
    return false;
  }
  const plan = pc.activePlan(input.cwd || path.dirname(file));
  return Boolean(plan.state === 'set' && since && plan.mtime >= since);
}

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  if (MODE === 'off') process.exit(0);
  let input = {};
  try {
    const parsed = JSON.parse(data || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) input = parsed;
  } catch {
    process.exit(0); // never fail a tool call because the hook could not read its own input
  }
  const file = (input.tool_input && input.tool_input.file_path) || '';
  const sid = input.session_id || '';
  if (!file || !sid) process.exit(0);

  const lower = file.toLowerCase();
  if (lower.includes('/.claude/') || !SRC.test(lower)) process.exit(0);

  const tmp = os.tmpdir();
  const planned =
    fs.existsSync(path.join(tmp, `claude-council-intake-${sid}`)) || planWrittenThisSession(input, file);
  if (planned) process.exit(0);

  const nudged = path.join(tmp, `claude-council-intake-nudged-${sid}`);
  if (MODE !== 'block' && fs.existsSync(nudged)) process.exit(0); // said it once already

  const msg =
    `[intake-gate] About to modify "${path.basename(file)}" with no plan for this session's ` +
      `work. Per task-intake-due-diligence.md, a non-trivial change first runs the trigger-gated ` +
      `Phase-0 intake (prior-art, scope, FMEA, test strategy, docs, action plan) and writes the ` +
      `plan — a TodoWrite list where the harness has one, otherwise the plan file. Trivial ` +
      `single-line fixes: proceed. [CLAUDE_INTAKE_GATE=off silences · =block enforces]`;
  if (MODE === 'block') {
    process.stderr.write(msg + '\n');
    process.exit(2);
  }
  advise(input, msg);
  try {
    fs.writeFileSync(nudged, String(Date.now()));
  } catch (err) {
    process.stderr.write(`[intake-gate] could not record the nudge (${err.code || 'error'}); it may repeat.\n`);
  }
  process.exit(0);
});
