// Size budget: 6 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// Which project a session belongs to, where that project's Claude memory lives, and which plan
// it is executing. One home for those three answers, because every gate that enforces "plan
// and memory stay current" needs all three, and each used to guess them differently.
//
// WHY NOT "THE NEWEST PLAN". Several projects run side by side from one ~/.claude, and plan
// mode writes every project's plans into the same ~/.claude/plans. Picking the newest file
// there let one project's plan edit satisfy another project's gate, and told a session to
// update a plan belonging to somebody else's work (verified 2026-09-21: that folder held three
// projects' plans together). So the plan is never guessed: the project names
// it, once, on an `Active plan:` line in its memory index — the file Claude Code loads at the
// start of every session, so the pointer is also the first thing the next session reads.
//
// WHERE MEMORY LIVES (code.claude.com/docs/en/memory, read 2026-09-21): auto memory is
// `~/.claude/projects/<project>/memory/`, `<project>` derived from the git repository, shared
// by all its worktrees and subdirectories; `autoMemoryDirectory` in settings overrides it.
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const expandHome = (p, home) => p.replace(/^~(?=\/|$)/, home);

/** The main checkout of the repo `cwd` is in (worktrees share it), else `cwd` itself. */
function projectRoot(cwd) {
  try {
    const common = execFileSync(
      'git',
      ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 },
    ).trim();
    if (common) return path.basename(common) === '.git' ? path.dirname(common) : common;
  } catch {
    /* not a repository: Claude Code uses the directory itself */
  }
  return path.resolve(cwd);
}

/**
 * Claude Code's `<project>` directory name. Observed: path separators become `-`. Assumed from the
 * same rule, not yet observed: every other character outside [A-Za-z0-9] does too.
 */
const projectKey = (root) => root.replace(/[^A-Za-z0-9]/g, '-');

function settingValue(file, key) {
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'))[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  } catch {
    return null; // absent or unreadable: that scope does not set it
  }
}

/** The auto memory directory for `cwd`, honouring autoMemoryDirectory (local > project > user). */
function memoryDir(cwd, home = os.homedir()) {
  const root = projectRoot(cwd);
  const scopes = [
    path.join(root, '.claude', 'settings.local.json'),
    path.join(path.resolve(cwd), '.claude', 'settings.json'),
    path.join(home, '.claude', 'settings.json'),
  ];
  for (const f of scopes) {
    const v = settingValue(f, 'autoMemoryDirectory');
    if (v) return path.resolve(root, expandHome(v, home));
  }
  return path.join(home, '.claude', 'projects', projectKey(root), 'memory');
}

// `Active plan: /abs/plan.md`, optionally as a list item, bold, or a markdown link.
const POINTER = /^\s*(?:[-*]\s+)?\**Active plan\**\s*:\s*(?:\[[^\]]*\]\(\s*)?([^\s)]+)/im;

/**
 * The plan this project is executing, as named in its memory index.
 *   { state: 'set', path, mtime }  the named plan exists
 *   { state: 'none' }              the project declares it runs without a plan
 *   { state: 'missing', path }     the named plan no longer exists
 *   { state: 'unset', index }      nothing named; `index` is where the line belongs
 */
function activePlan(cwd, home = os.homedir()) {
  const index = path.join(memoryDir(cwd, home), 'MEMORY.md');
  let body = '';
  try {
    body = fs.readFileSync(index, 'utf8');
  } catch {
    return { state: 'unset', index };
  }
  const m = POINTER.exec(body.replace(/<!--[\s\S]*?-->/g, '')); // a commented line is an example
  if (!m) return { state: 'unset', index };
  if (m[1].toLowerCase() === 'none') return { state: 'none', index };
  const p = path.resolve(path.dirname(index), expandHome(m[1], home));
  try {
    return { state: 'set', path: p, mtime: fs.statSync(p).mtimeMs, index };
  } catch {
    return { state: 'missing', path: p, index };
  }
}

module.exports = { projectRoot, projectKey, memoryDir, activePlan, POINTER };
