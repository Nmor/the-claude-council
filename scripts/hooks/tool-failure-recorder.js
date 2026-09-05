#!/usr/bin/env node
'use strict';

// PostToolUseFailure hook.
//
// no-silent-failures.md rule 8: a swallowed failure needs a COUNTER, not only a log —
// "the log says 'this once'; the counter says 'N times'". The framework applied that to
// product code while its own failed tool calls went unrecorded, so a command failing
// repeatedly in a session left no durable trace to notice.
//
// Appends one JSONL row per failure to audits/tool-failures.jsonl. SILENT always: this
// is a recorder, not a gate. A failed tool call is already visible to the model in the
// tool result — re-narrating it in stderr would spend context to repeat what was just
// read, on the exact turns that are already going badly.

const fs = require('fs');
const os = require('os');
const path = require('path');

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const dir = path.join(os.homedir(), '.claude', 'audits');
    fs.mkdirSync(dir, { recursive: true });

    // Truncated: an audit trail is for spotting patterns, and a full payload could carry
    // secrets from a failed command's args.
    const row = {
      ts: new Date().toISOString(),
      session_id: input.session_id || null,
      tool: input.tool_name || null,
      cwd: input.cwd || null,
      error: String(input.error || input.tool_response || '').slice(0, 300),
    };
    fs.appendFileSync(path.join(dir, 'tool-failures.jsonl'), JSON.stringify(row) + '\n');
  } catch { /* best-effort recorder: never disrupt the pipeline */ }
  process.exit(0);
});
