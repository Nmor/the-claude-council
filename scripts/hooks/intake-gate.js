#!/usr/bin/env node
'use strict';

// PreToolUse hook (matcher: Edit|Write|MultiEdit).
// Enforces task-intake-due-diligence.md at the file-mutation boundary — the exact
// point where "dove straight into editing without the Phase-0 intake" drift
// happens. If a project SOURCE file is about to be mutated and NO intake/plan was
// recorded this session (intake-marker.js sets that when a TodoWrite plan is
// produced), the gate surfaces a reminder.
//
// Modes (env CLAUDE_INTAKE_GATE):
//   unset / "nudge"  -> strong NON-BLOCKING reminder on stderr, exit 0 (default)
//   "block"          -> BLOCK the edit (exit 2) until an intake/plan exists
//   "off"            -> disabled (exit 0, silent)
//
// Deliberately scoped to avoid false positives:
//   - skips framework files under any /.claude/ path (rules/agents/skills/docs work)
//   - skips non-source files (only real code extensions trip it)
//   - fires at most ONCE per session (the first un-planned source mutation);
//     once a TodoWrite plan exists, it never fires again that session
// A hard block on "did the model WRITE the intake prose" is not mechanically
// possible (it is model text, not a tool call); this gates the observable proxy —
// a plan must precede code mutation on non-trivial work.

const fs = require('fs');
const os = require('os');
const path = require('path');

const MODE = String(process.env.CLAUDE_INTAKE_GATE || 'nudge').toLowerCase();
// Real source files — the surface a non-trivial task mutates. Config/markdown/JSON
// are intentionally excluded so docs/config tweaks never trip the gate.
const SRC = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|scala|cs|rb|php|swift|m|mm|c|h|cc|cpp|hpp|vue|svelte|sql)$/i;

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  let warn = null;
  let block = false;
  try {
    if (MODE === 'off') { process.exit(0); }
    const input = JSON.parse(data || '{}');
    const file = (input.tool_input && input.tool_input.file_path) || '';
    const sid = input.session_id || '';
    if (file && sid) {
      const lower = file.toLowerCase();
      const marker = path.join(os.tmpdir(), `claude-council-intake-${sid}`);
      const skip = lower.includes('/.claude/') || !SRC.test(lower) || fs.existsSync(marker);
      if (!skip) {
        warn = `[intake-gate] About to modify "${path.basename(file)}" with no task-intake/plan `
          + `recorded this session. Per task-intake-due-diligence.md, a non-trivial change first runs `
          + `the trigger-gated Phase-0 intake (prior-art, scope, FMEA, test strategy, docs, action plan) `
          + `and lays out a TodoWrite plan. Trivial single-line fixes: proceed. `
          + `[CLAUDE_INTAKE_GATE=off silences · =block enforces]`;
        block = (MODE === 'block');
      }
    }
  } catch (err) {
    warn = `[intake-gate] skipped: ${err.message}`;
    block = false;
  }
  if (warn) { process.stderr.write(warn + '\n'); }
  process.exit(block ? 2 : 0);
});
