#!/usr/bin/env node
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

const GATE = /\b(test|lint|vet|build|tsc|ruff|mypy|pytest|golangci|staticcheck|eslint|gofmt|markdownlint|vitest|jest)\b/i;

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const cmd = String((input.tool_input && (input.tool_input.command || input.tool_input.cmd)) || '');
    if (!GATE.test(cmd)) process.exit(0);

    const sid = input.session_id || 'nosession';
    fs.writeFileSync(path.join(os.tmpdir(), `claude-council-gate-${sid}`), String(Date.now()));
  } catch { /* best-effort marker */ }
  process.exit(0);
});
