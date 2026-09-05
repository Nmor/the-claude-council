#!/usr/bin/env node
'use strict';

// PostCompact hook.
//
// PreCompact WRITES the council brief + memory; nothing RE-READ it afterwards, so the
// post-compaction turn ran on a lossy summary of the very state that was just persisted
// to disk for exactly this moment. project-memory.md calls that out — "the agent reads
// them FRESH after compaction completes" — but nothing made it happen.
//
// This surfaces the paths to re-read. It does NOT dump the files: that would spend, on
// every compaction, the context the compaction just reclaimed. Pointers cost ~50 tokens;
// the model reads what it needs.
//
// SILENT when there is nothing to point at (no memory, no plan) — a hook that speaks on
// every compaction to say "nothing to reload" is a per-compaction tax.

const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();

function firstExisting(candidates) {
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* unreadable — treat as absent */ }
  }
  return null;
}

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const cwd = input.cwd || process.cwd();

    const memory = firstExisting([
      path.join(cwd, '.claude', 'memory', 'MEMORY.md'),
      path.join(home, '.claude', 'projects', path.basename(cwd), 'memory', 'MEMORY.md'),
    ]);

    let plan = null;
    const planDir = path.join(cwd, '.claude', 'plans');
    try {
      const plans = fs.readdirSync(planDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({ f, m: fs.statSync(path.join(planDir, f)).mtimeMs }))
        .sort((a, b) => b.m - a.m);
      if (plans.length) plan = path.join(planDir, plans[0].f);
    } catch { /* no plan dir — normal for most workspaces */ }

    const targets = [memory, plan].filter(Boolean);
    if (targets.length === 0) process.exit(0);   // silent: nothing to reload

    process.stderr.write(
      '[post-compact] Context was just compacted. Durable state survived on disk — ' +
      're-read before continuing rather than trusting the summary:\n' +
      targets.map((t) => `  - ${t}\n`).join('')
    );
  } catch (err) {
    process.stderr.write(`[post-compact] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
