// Size budget: 7 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// Findings that show a project's Claude memory has gone stale or broken, in one directory.
//
// WHY. Memory is read as fact by every later session, so a wrong entry is worse than none: a
// branch tip that moved, a build "fix" a later entry forbids, a link to a deleted plan (all four
// found in one directory on 2026-09-21). Nothing checked it. These checks are the ones a
// machine can make without judging the prose:
//   proven — the entry is wrong or unloadable on its face
//     index-missing   MEMORY.md links a file that does not exist
//     index-unlisted  a memory file MEMORY.md never links, so no session is pointed at it
//     index-limit     MEMORY.md past what Claude Code loads (first 200 lines or 25 KB; the rest
//                     is dropped — code.claude.com/docs/en/memory, read 2026-09-21)
//     frontmatter     a memory file without name / description / type
//     dead-path       an absolute path the entry cites no longer exists
//     dead-plan       the `Active plan:` line names a plan that no longer exists
//   progress-state    progress copied out of a plan ("IN PROGRESS", "Status: pending"). Copies
//                     drift; progress belongs in the plan, which a gate keeps current. It is a
//                     pattern, not a proof, so the Stop gate raises it only on files changed in
//                     the session.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { POINTER } = require('./project-context.js');

const LIMIT_LINES = 200;
const LIMIT_BYTES = 25 * 1024;

// An absolute path in prose: home-relative, or rooted at a top-level directory that holds
// project files. Placeholders (<project>, *, {x}, $VAR) are not claims about a real file.
const PATH = /(?:^|[\s`'"(\[<=])((?:~|\/(?:Users|home|private|opt|var|tmp|Volumes|srv|etc))\/[^\s`'"()\[\]<>,;|]+)/g;
const PLACEHOLDER = /[<>*{}$]|\.\.\./;

const PROGRESS = [
  /\bIN[ _-]PROGRESS\b/,
  /\bStatus\s*:\s*\**\s*(?:in[ _-]progress|pending|blocked|wip|todo)\b/i,
  /\bnext concrete action\b/i,
  /\bnow points at\b/i,
];

/** A cited path, without a trailing line suffix (`:12`, `:12-40`, `#L12`) or punctuation. */
const cleanPath = (raw) =>
  raw.replace(/#L\d+.*$/, '').replace(/[.:)]+$/, '').replace(/(?::\d+(?:-\d+)?)+$/, '').replace(/[.:)]+$/, '');

function exists(p, home) {
  try {
    fs.statSync(p.replace(/^~(?=\/|$)/, home));
    return true;
  } catch {
    return false;
  }
}

function frontmatterGaps(body) {
  const m = /^---\n([\s\S]*?)\n---/.exec(body);
  if (!m) return ['name', 'description', 'type'];
  return ['name', 'description', 'type'].filter((k) => !new RegExp(`^\\s*${k}\\s*:\\s*\\S`, 'm').test(m[1]));
}

// HTML comments hold examples and notes, not links or claims. Blanked, not removed, so line
// numbers still point at the right place.
const uncomment = (body) => body.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));

/** Body lines outside fenced code, with 1-based numbers. Fences hold examples, not claims. */
function proseLines(body) {
  const out = [];
  let fenced = false;
  body.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced) out.push({ n: i + 1, line });
  });
  return out;
}

/**
 * Every finding in `dir`. Each is { file, line, kind, proven, message }; `file` is relative to
 * `dir`. A directory that does not exist has no memory and so no findings.
 */
function lintMemory(dir, { home = os.homedir() } = {}) {
  let names;
  try {
    names = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
  const findings = [];
  const add = (file, line, kind, message) =>
    findings.push({ file, line, kind, proven: kind !== 'progress-state', message });

  const rawIndex = names.includes('MEMORY.md') ? fs.readFileSync(path.join(dir, 'MEMORY.md'), 'utf8') : '';
  const indexBody = uncomment(rawIndex);
  const linked = new Set();
  indexBody.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\]\(([^)\s]+\.md)\)/g)) {
      if (/^[a-z]+:\/\//i.test(m[1]) || path.isAbsolute(m[1])) continue;
      linked.add(path.normalize(m[1]));
      if (!exists(path.join(dir, m[1]), home)) add('MEMORY.md', i + 1, 'index-missing', `links ${m[1]}, which does not exist`);
    }
  });
  const lineCount = rawIndex.split('\n').length - (rawIndex.endsWith('\n') ? 1 : 0);
  if (lineCount > LIMIT_LINES || Buffer.byteLength(rawIndex) > LIMIT_BYTES)
    add('MEMORY.md', LIMIT_LINES + 1, 'index-limit',
      `${lineCount} lines / ${Buffer.byteLength(rawIndex)} bytes; Claude Code loads only the first ${LIMIT_LINES} lines or ${LIMIT_BYTES} bytes`);
  const pointer = POINTER.exec(indexBody);
  if (pointer && pointer[1].toLowerCase() !== 'none') {
    const p = path.resolve(dir, pointer[1].replace(/^~(?=\/|$)/, home));
    if (!exists(p, home)) add('MEMORY.md', indexBody.slice(0, pointer.index).split('\n').length, 'dead-plan', `Active plan ${pointer[1]} does not exist`);
  }

  for (const name of names.filter((f) => f !== 'MEMORY.md').sort()) {
    const raw = fs.readFileSync(path.join(dir, name), 'utf8');
    const body = uncomment(raw);
    if (!linked.has(name)) add(name, 1, 'index-unlisted', 'not linked from MEMORY.md, so no session is pointed at it');
    const gaps = frontmatterGaps(raw);
    if (gaps.length) add(name, 1, 'frontmatter', `frontmatter lacks ${gaps.join(', ')}`);
    for (const { n, line } of proseLines(body)) {
      for (const m of line.matchAll(PATH)) {
        const p = cleanPath(m[1]);
        if (!PLACEHOLDER.test(p) && !exists(p, home)) add(name, n, 'dead-path', `cites ${p}, which no longer exists`);
      }
      if (PROGRESS.some((re) => re.test(line)))
        add(name, n, 'progress-state', 'holds progress; keep it in the plan and point at the plan instead');
    }
  }
  return findings;
}

const format = (dir, f) => `${path.join(dir, f.file)}:${f.line}  ${f.kind}  ${f.message}`;

module.exports = { lintMemory, format, LIMIT_LINES, LIMIT_BYTES };
