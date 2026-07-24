#!/usr/bin/env node
// PreToolUse hook (matcher: Edit|Write).
// NON-BLOCKING nudge: when integration-shaped SOURCE is edited and no online
// research ran this session, emit a one-line stderr reminder. Always exits 0 —
// it never blocks an edit (false-positive risk on a hard block is too high).
// Pairs with council-default.md rule 11 + verify-before-claim.md done-gate;
// the research-marker PostToolUse hook clears it once WebSearch/WebFetch runs.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

// Source-code extensions only (skip docs/config).
const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|cs|rb|php|swift)$/i;
// Integration signals: external-contract code where currency matters.
const INTEGRATION = /(\/integrations?\/|\/providers?\/|\/clients?\/|webhook|oauth|[-_]client\b|[-_]sdk\b|api[-_]?client|stripe|twilio|paystack|flutterwave|sendgrid|\bses\b|\bfcm\b|\bapns\b|plaid|slack|clickup|graphql|grpc|calendar|msgraph)/i;

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  let warn = null;
  try {
    const input = JSON.parse(data || '{}');
    const file = (input.tool_input && input.tool_input.file_path) || '';
    const sid = input.session_id || '';
    if (file && sid) {
      const p = file.toLowerCase();
      const marker = path.join(os.tmpdir(), `claude-council-research-${sid}`);
      const integrationSource =
        !p.includes('/.claude/') && // skip framework config / rules / agents
        SRC_EXT.test(p) &&
        INTEGRATION.test(p);
      if (integrationSource && !fs.existsSync(marker)) {
        warn =
          `[research-gate] Editing integration-shaped file "${path.basename(file)}" ` +
          `without online research this session. Per council-default.md rule 11, run ` +
          `WebSearch/WebFetch on the current provider docs (versions, breaking changes, ` +
          `auth) and validate the payload shape before finalizing.`;
      }
    }
  } catch (err) {
    warn = `[research-gate] skipped: ${err.message}`;
  }
  if (warn) process.stderr.write(warn + '\n');
  process.exit(0); // never block
});
