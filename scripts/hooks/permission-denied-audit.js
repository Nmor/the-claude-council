#!/usr/bin/env node
'use strict';

// PermissionDenied hook.
//
// council-default.md r4 specifies audits/bypass-log.jsonl — "bypass attempts are not
// honoured; they're recorded so the pattern is visible" — and then gave that log no
// feed. A denial is the clearest bypass signal there is, and it was going nowhere.
//
// SILENT always: the denial is already visible to both the user and the model. This
// only makes it durable, so the PATTERN is reviewable later.

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

    const row = {
      ts: new Date().toISOString(),
      event: 'permission.denied',
      session_id: input.session_id || null,
      tool: input.tool_name || null,
      cwd: input.cwd || null,
      // Truncated: a denied command can carry secrets in its arguments.
      detail: String(input.reason || input.message || '').slice(0, 300),
    };
    fs.appendFileSync(path.join(dir, 'bypass-log.jsonl'), JSON.stringify(row) + '\n');
  } catch { /* best-effort recorder */ }
  process.exit(0);
});
