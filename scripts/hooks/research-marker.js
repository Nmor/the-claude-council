#!/usr/bin/env node
// PostToolUse hook (matcher: WebSearch|WebFetch).
// Records that online research ran this session by writing a per-session marker
// the research-gate PreToolUse hook checks. Best-effort: never disrupts the
// tool pipeline. Pairs with council-default.md rule 11 (online research
// MANDATORY) and verify-before-claim.md (the Research-this-turn done-gate).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const sid = input.session_id || 'nosession';
    const marker = path.join(os.tmpdir(), `claude-council-research-${sid}`);
    fs.writeFileSync(marker, String(Date.now()));
  } catch (err) {
    // best-effort marker; surface (not swallow) but never fail the pipeline
    process.stderr.write(`[research-marker] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
