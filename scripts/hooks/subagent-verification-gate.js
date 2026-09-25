#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

// SubagentStop hook.
//
// verify-before-claim.md r11 records the incident this exists for: fix-work was
// delegated to background sub-agents that were denied Bash, so they could not run
// ruff/mypy/pytest and (correctly) refused to write unverified security-critical code.
// The delegation produced zero verified output. The rule's conclusion — "check the
// delegate can run the gate BEFORE delegating" — was enforced by nothing.
//
// When a subagent that EDITED files is about to stop without having run a gate, it is
// told once to run one before handing back. SILENT for a subagent that ran a gate and for
// a read-only one (search/explore agents are the majority and have nothing to verify).
//
// Rebuilt 2026-09-21 against the hooks reference (read that day). The first version read
// `input.tool_calls`, a field SubagentStop does not send, so it saw no edits and never
// fired. It also wrote to stderr on exit 0, which is never shown. It now reads the
// subagent's own transcript (`agent_transcript_path`) and answers through
// `hookSpecificOutput.additionalContext`, which keeps the subagent running with the note.
// `stop_hook_active` guards the loop: a subagent already continued by a stop hook is
// allowed to stop, so the note is given at most once.

const fs = require('fs');
const { atCommandPosition, executablePart, VERIFICATION_GATE } = require('./lib/command-scan.js');

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

// tool_use blocks from a transcript: assistant entries whose message.content lists them.
function toolCalls(transcriptPath) {
  let text = '';
  try {
    text = fs.readFileSync(String(transcriptPath || ''), 'utf8');
  } catch {
    return [];
  }
  const calls = [];
  for (const line of text.split('\n')) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const content = entry && entry.message && entry.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && block.type === 'tool_use') calls.push({ name: block.name, input: block.input || {} });
    }
  }
  return calls;
}

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(data || '{}') || {};
  } catch {
    process.exit(0);
  }
  if (input.stop_hook_active) process.exit(0);

  const calls = toolCalls(input.agent_transcript_path);
  const edited = calls.filter((c) => EDIT_TOOLS.has(c.name));
  if (edited.length === 0) process.exit(0);

  const ranGate = calls.some(
    (c) => c.name === 'Bash' && atCommandPosition(executablePart(c.input.command || ''), VERIFICATION_GATE),
  );
  if (ranGate) process.exit(0);

  const files = [...new Set(edited.map((c) => c.input.file_path || c.input.notebook_path || '').filter(Boolean))];
  const note =
    `[subagent-gate] You edited ${edited.length} file(s) without running a verification gate ` +
    '(verify-before-claim r11). Run the build, lint and tests that cover them and report the ' +
    'real output before handing back; if you cannot run them, say so plainly so the caller runs ' +
    'them instead.\n' +
    files.slice(0, 10).map((f) => `  - ${f}`).join('\n');
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: 'SubagentStop', additionalContext: note } }),
  );
  process.exit(0);
});
