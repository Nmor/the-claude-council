#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
/**
 * PostToolUse Hook: Warn about console.log statements after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited JS/TS file contains console.log
 * statements, warns with line numbers to help remove debug statements
 * before committing.
 */

const { readFile } = require('../lib/utils');
const { advise } = require('./lib/advise.js');
const { stripQuoted } = require('./lib/no-discards-rules.js');

const MAX_STDIN = 1024 * 1024; // 1MB limit
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    // The hooks describe console.log in order to catch it; like no-discards, they are exempt.
    if (filePath && /\.(ts|tsx|js|jsx)$/.test(filePath) && !/[/\\]\.claude[/\\]scripts[/\\]hooks[/\\]/.test(filePath)) {
      const content = readFile(filePath);
      if (!content) process.exit(0);
      const lines = content.split('\n');
      const matches = [];

      lines.forEach((line, idx) => {
        const t = line.trim();
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
        if (/\bconsole\.log\s*\(/.test(stripQuoted(line))) {
          matches.push((idx + 1) + ': ' + line.trim());
        }
      });

      if (matches.length > 0) {
        advise(
          input,
          ['[Hook] WARNING: console.log found in ' + filePath, ...matches.slice(0, 5),
            '[Hook] Remove console.log before committing'].join('\n'),
          'PostToolUse',
        );
      }
    }
  } catch {
    // Unreadable input: nothing to check.
  }

  process.exit(0);
});
