#!/usr/bin/env node
// Size budget: 3 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// Report what makes a project's Claude memory stale or unloadable (hooks/lib/memory-lint.js).
//
//   node memory-lint.mjs                 this project's memory (resolved from the cwd)
//   node memory-lint.mjs --dir <path>    one memory directory
//   node memory-lint.mjs --all           every project under ~/.claude/projects: counts only,
//                                        read-only — each project's memory is fixed from that
//                                        project's own session
//   --check                              exit 1 when there is any finding
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { lintMemory, format } = require('./hooks/lib/memory-lint.js');
const { memoryDir } = require('./hooks/lib/project-context.js');

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null;

const say = (line) => process.stdout.write(`${line}\n`);
let total = 0;
if (flag('--all')) {
  const root = join(homedir(), '.claude', 'projects');
  let names = [];
  try {
    names = readdirSync(root);
  } catch (err) {
    say(`no project memory to lint: ${root} is unreadable (${err.code || err.message})`);
  }
  for (const name of names.sort()) {
    const found = lintMemory(join(root, name, 'memory'));
    if (!found.length) continue;
    total += found.length;
    const byKind = {};
    for (const f of found) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
    say(`${String(found.length).padStart(4)}  ${name}  ${JSON.stringify(byKind)}`);
  }
} else {
  const dir = dirArg || memoryDir(process.cwd());
  const found = lintMemory(dir);
  total = found.length;
  for (const f of found) say(format(dir, f));
  say(`${total} finding(s) in ${dir}`);
}
if (flag('--check') && total) process.exit(1);
