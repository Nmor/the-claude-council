// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// What git says has changed, for the gates that enforce "plan updated as tasks complete" and
// "docs updated before code is committed or pushed".
//
// WHY GIT AND NOT SESSION MARKERS. Those gates used to learn about changes from a PostToolUse
// marker on Edit/Write. That marker never saw a change made through Bash — a sed, a heredoc, a
// python rewrite — which in some sessions is most of the work, so the gates were blind exactly
// where they were needed. Git sees every change however it was made, and for a commit or a
// push it states precisely what is about to become history.
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|cs|rb|php|swift|sql|vue|svelte)$/i;
const TEST = /(^|\/)(__tests__|tests?|spec)\/|[._-](test|spec)\.[a-z]+$|_test\.go$|(^|\/)test_[^/]+\.py$/i;

function git(cwd, args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
  } catch {
    return null; // not a repo, no upstream, git missing — each caller treats null as "unknown"
  }
}

const repoRoot = (cwd) => (git(cwd, ['rev-parse', '--show-toplevel']) || '').trim() || null;

/** The directory a git command acts on: `git -C <dir>`, or a leading `cd <dir> &&`. */
function targetDir(cmd, cwd) {
  const c = /\bgit\s+-C\s+("[^"]+"|'[^']+'|\S+)/.exec(cmd);
  const d = /^\s*cd\s+("[^"]+"|'[^']+'|\S+)\s*&&/.exec(cmd);
  const pick = (c && c[1]) || (d && d[1]);
  if (!pick) return cwd;
  const dir = pick.replace(/^["']|["']$/g, '').replace(/^~(?=\/|$)/, os.homedir());
  return path.resolve(cwd || '.', dir);
}

/**
 * code | test | docs | null. Paths under `.claude/` are neither product code nor product
 * docs (plans and memory are gitignored runtime state), so they never trip a docs check.
 */
function classify(p) {
  const s = String(p).replace(/\\/g, '/');
  if (/(^|\/)\.claude\//.test(s)) return null;
  if (/\.(md|mdx|rst|adoc)$/i.test(s) || /(^|\/)docs?\//i.test(s)) return 'docs';
  if (SRC_EXT.test(s)) return TEST.test(s) ? 'test' : 'code';
  return null;
}

const lines = (out) => (out ? out.split('\n').map((l) => l.trim()).filter(Boolean) : []);

/** Files a commit will record: the index, or every tracked change for `commit -a`. */
function commitFiles(root, all) {
  return lines(git(root, all ? ['diff', '--name-only', 'HEAD'] : ['diff', '--cached', '--name-only']));
}

/** Uncommitted changes in the working tree, tracked and untracked. */
function dirtyFiles(root) {
  return lines(git(root, ['status', '--porcelain', '--untracked-files=all']))
    .map((l) => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''));
}

function newestMtime(root, files) {
  let t = 0;
  for (const f of files) {
    try {
      t = Math.max(t, fs.statSync(path.join(root, f)).mtimeMs);
    } catch {
      /* deleted in this change — a deletion has no mtime to compare */
    }
  }
  return t;
}

/** Commits on HEAD that no remote-tracking ref has yet: exactly what a push publishes. */
function unpushedCommits(root) {
  return lines(git(root, ['rev-list', 'HEAD', '--not', '--remotes'])).map((sha) => ({
    sha,
    files: lines(git(root, ['diff-tree', '--no-commit-id', '--name-only', '-r', '--root', sha])),
    body: git(root, ['log', '-1', '--format=%B', sha]) || '',
  }));
}

/** An explicit, recorded decision that a code change needs no documentation. */
const DOCS_DECLARATION = /(^|\n|\\n|["'\s])Docs:\s*\S/;

module.exports = {
  repoRoot, targetDir, classify, commitFiles, dirtyFiles, newestMtime,
  unpushedCommits, DOCS_DECLARATION,
};
