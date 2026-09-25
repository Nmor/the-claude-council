#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PostToolUse hook (matcher: Edit|Write|MultiEdit).
//
// Companion to docs-sync-gate.js. Classifies every file mutation into
// one of four session markers so the gate can tell, at todo-close time,
// whether the three-way sync actually happened:
//
//   code   — product source was changed (the trigger for the gate)
//   docs   — README / CHANGELOG / docs/ / *.md feature or runbook page
//   plan   — a plan file (.claude/plans/** or ~/.claude/plans/**)
//   memory — a project or global memory file (.claude/memory/**)
//
// Markers are session-scoped temp files; they evaporate with the
// session so each session must earn its own sync. Always exits 0.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|cs|rb|php|swift|sql)$/i;

function classify(p) {
  const lower = p.toLowerCase();
  if (lower.includes('/.claude/memory/') || /\/memory\/[\w-]+\.md$/.test(lower)) {
    return 'memory';
  }
  if (lower.includes('/.claude/plans/') || /\/plans\/[\w-]+\.md$/.test(lower)) {
    return 'plan';
  }
  // Framework config (rules / hooks / agents / skills) is neither
  // product code nor product docs — it must not trip the gate.
  if (lower.includes('/.claude/')) return null;
  if (
    /\/(readme|changelog|contributing)\.md$/.test(lower) ||
    lower.includes('/docs/') ||
    lower.endsWith('.mdx')
  ) {
    return 'docs';
  }
  if (lower.endsWith('.md')) return 'docs';
  if (SRC_EXT.test(lower)) return 'code';
  return null;
}

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const sid = input.session_id || '';
    const file = (input.tool_input && input.tool_input.file_path) || '';
    if (sid && file) {
      const kind = classify(String(file));
      if (kind) {
        fs.writeFileSync(
          path.join(os.tmpdir(), `claude-docs-sync-${kind}-${sid}`),
          String(Date.now()),
          'utf8',
        );
      }
    }
  } catch {
    // Best-effort: a missed marker only means an extra nudge, which
    // is the safe direction for a staleness gate.
  }
  process.exit(0);
});
