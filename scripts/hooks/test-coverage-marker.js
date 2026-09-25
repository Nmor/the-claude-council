#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PostToolUse hook (matcher: Bash).
// Records that coverage was MEASURED this session, and the number it produced, by
// writing a per-session marker the test-coverage-gate hook reads. Pairs with
// functional-test-coverage.md rule 1 (measure before you claim, report the real
// number) and no-overclaim.md (a coverage percentage is a claim like any other).
// Best-effort: never disrupts the tool pipeline.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

// Commands that actually produce a coverage measurement, across the stacks in use.
const COVERAGE_CMD =
  /(go\s+tool\s+cover|go\s+test[^|]*-cover|vitest[^|]*--coverage|jest[^|]*--coverage|nyc\b|c8\b|pytest[^|]*--cov|coverage\s+(run|report)|cargo\s+tarpaulin|dotnet\s+test[^|]*collect.*coverage|phpunit[^|]*--coverage)/i;

// Reading or printing text ABOUT a coverage run is not running one. The pattern above
// matches anywhere in the line, so `grep -rn "go test -cover" .` wrote this marker and
// switched off the gate's "coverage was never measured this session" arm for the rest of
// the session — measured 2026-09-21, the same defect gate-marker.js was fixed for.
// lib/command-scan.js states the class: judge what a command RUNS, not the text it carries.
const NOT_MEASURING =
  /^\s*(?:grep|rg|ag|find|ls|cat|sed|awk|head|tail|wc|echo|printf|less|more|diff|git)\b/i;

// Percentages the common tools print, so the marker carries the real figure.
const PERCENTS = [
  /total:\s*\(statements\)\s*([0-9.]+)%/i,          // go tool cover -func
  /coverage:\s*([0-9.]+)%\s*of\s*statements/i,      // go test
  /Statements\s*:\s*([0-9.]+)%/i,                    // vitest / istanbul summary
  /All files\s*\|\s*([0-9.]+)/i,                     // istanbul table
  /TOTAL\s+\d+\s+\d+\s+([0-9.]+)%/i,                 // pytest-cov
];

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const sid = input.session_id || 'nosession';
    const cmd = (input.tool_input && input.tool_input.command) || '';
    if (NOT_MEASURING.test(cmd) || !COVERAGE_CMD.test(cmd)) {
      process.exit(0);
    }
    // The response shape varies by client; read whichever text field carries output.
    const res = input.tool_response || {};
    const out = [res.stdout, res.stderr, res.output, typeof res === 'string' ? res : '']
      .filter(Boolean)
      .join('\n');

    let measured = '';
    for (const re of PERCENTS) {
      const m = out.match(re);
      if (m) {
        measured = m[1];
        break;
      }
    }
    const marker = path.join(os.tmpdir(), `claude-council-coverage-${sid}`);
    fs.writeFileSync(
      marker,
      JSON.stringify({ at: Date.now(), measured, cmd: cmd.slice(0, 200) })
    );
  } catch (err) {
    // best-effort marker; surface it, never fail the pipeline
    process.stderr.write(`[test-coverage-marker] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
