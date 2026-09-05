#!/usr/bin/env node
'use strict';

// PostToolUse hook (matcher: TodoWrite).
// Records that the task-intake / planning discipline was engaged this session:
// producing a TodoWrite plan is the observable artifact of the Phase-0 intake
// (task-intake-due-diligence.md) — prior-art, scope, FMEA, test strategy, action
// plan laid out before mutating code. Once set, intake-gate.js stays quiet for
// the session. Best-effort: never disrupts the tool pipeline (always exit 0).
//
// Pairs with:
//   - scripts/hooks/intake-gate.js   (PreToolUse Edit|Write|MultiEdit)
//   - hooks/improve-prompt.py        (UserPromptSubmit — injects INTAKE MODE)
//   - rules/common/task-intake-due-diligence.md (the Phase-0 intake it enforces)

const fs = require('fs');
const os = require('os');
const path = require('path');

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const sid = input.session_id || 'nosession';
    const marker = path.join(os.tmpdir(), `claude-council-intake-${sid}`);
    fs.writeFileSync(marker, String(Date.now()));
  } catch (err) {
    process.stderr.write(`[intake-marker] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
