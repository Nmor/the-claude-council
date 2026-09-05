#!/usr/bin/env node
'use strict';

// SubagentStop hook.
//
// verify-before-claim.md r11 records the incident this exists for: fix-work was
// delegated to background sub-agents that were denied Bash, so they could not run
// ruff/mypy/pytest and (correctly) refused to write unverified security-critical code.
// The delegation produced zero verified output. The rule's conclusion — "check the
// delegate can run the gate BEFORE delegating" — was enforced by nothing.
//
// This fires when a subagent that EDITED files finishes without any sign of having run
// a gate, and tells the orchestrator to run it before accepting the work.
//
// SILENT in the common cases: a subagent that ran a gate, and a read-only subagent that
// changed nothing (search/explore agents are the majority and have nothing to verify).

const GATE = /\b(test|lint|vet|build|tsc|ruff|mypy|pytest|golangci|staticcheck|eslint|gofmt)\b/i;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const calls = Array.isArray(input.tool_calls) ? input.tool_calls : [];

    const edited = calls.filter((c) => EDIT_TOOLS.has(c && c.name));
    if (edited.length === 0) process.exit(0);   // read-only subagent: nothing to gate

    const ranGate = calls.some((c) => {
      if (!c || c.name !== 'Bash') return false;
      const cmd = (c.input && (c.input.command || c.input.cmd)) || '';
      return GATE.test(String(cmd));
    });
    if (ranGate) process.exit(0);               // gate ran: silent

    const files = [...new Set(edited
      .map((c) => (c.input && (c.input.file_path || c.input.path)) || '')
      .filter(Boolean))];

    process.stderr.write(
      `[subagent-gate] A subagent edited ${edited.length} file(s) without running a ` +
      'verification gate (verify-before-claim r11). "The sub-agent wrote it" is not ' +
      'verification; "the gate passed on what it wrote" is. Run the gate before ' +
      'accepting this work:\n' +
      files.slice(0, 10).map((f) => `  - ${f}\n`).join('')
    );
  } catch (err) {
    process.stderr.write(`[subagent-gate] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
