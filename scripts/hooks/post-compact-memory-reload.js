#!/usr/bin/env node
// Size budget: 4 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

// SessionStart hook, matcher "compact": after a compaction, point Claude at the state that
// survived on disk — this project's memory index and the plan it names — so the next turn
// re-reads them instead of trusting the summary.
//
// It gives paths, not contents: dumping the files would spend, on every compaction, the context
// the compaction just reclaimed. It says nothing when there is nothing to point at.
//
// WHY SESSIONSTART, AND WHY THIS REPLACED WHAT WAS HERE (2026-09-21). This ran on PostCompact
// and wrote to stderr. Neither reaches Claude: PostCompact has "no decision control", its
// stderr is shown "to user only", and stderr on exit 0 goes nowhere (hooks reference, read
// 2026-09-21). So every compaction since it was written dropped the one instruction to
// re-read memory, confirmed live by its absence from a resumed session's context. SessionStart
// with source "compact" is the documented way to add context after a compaction.
// It also guessed the project: memory by the cwd's own key (wrong in a subdirectory) and the
// newest plan in the cwd; both now come from lib/project-context.js.

const fs = require('fs');
const path = require('path');
const pc = require('./lib/project-context.js');
const { advise } = require('./lib/advise.js');

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const parsed = JSON.parse(data || '{}');
    const input = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    if (input.source && input.source !== 'compact') process.exit(0);
    const cwd = input.cwd || process.cwd();

    const index = path.join(pc.memoryDir(cwd), 'MEMORY.md');
    const plan = pc.activePlan(cwd);
    const targets = [
      fs.existsSync(index) ? index : null,
      plan.state === 'set' ? plan.path : null,
    ].filter(Boolean);
    if (targets.length === 0) process.exit(0);

    advise(
      input,
      '[post-compact] Context was just compacted. This project\'s durable state survived on disk; ' +
        're-read it before continuing rather than trusting the summary:\n' +
        targets.map((t) => `  - ${t}`).join('\n'),
      'SessionStart',
    );
  } catch (err) {
    process.stderr.write(`[post-compact] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
