#!/usr/bin/env node
// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// Convert an over-cap skill to progressive disclosure: SKILL.md becomes a routing table and
// the detail moves, byte for byte, into references/.
//
//   node ~/.claude/scripts/split-skill.mjs --check <skill-dir...>   # plan only
//   node ~/.claude/scripts/split-skill.mjs --write <skill-dir...>   # split in place
//
// WHY A SCRIPT. `token-budget.mjs --check` is the gate that flags an over-cap skill; this is
// the command that fixes one, so the rule 10 loop (number, command, gate) closes. The first
// 40 splits were done by model agents, and their own reports describe what they actually did:
// `sed -n 'START,ENDp'` along the original's section boundaries. That is a script's job. Run
// by agents in parallel it also raced — two agents wrote the same scratch backup path, and one
// briefly filled a frontend skill with Java content before noticing. A deterministic cut
// cannot summarise, cannot reword a citation, and cannot collide.
//
// SEAMS. The author's own: each `## ` section of the main document, and each migrated appendix
// document (delimited by a `<!-- === ... Section: ... === -->` banner). Sections that the
// principal-level audit looks for IN SKILL.md (purpose, when-to, standards, anti-patterns,
// cross-references, why) stay put, so moving detail out never fails that audit.
//
// SAFETY. Nothing is written until every check passes on the result in memory: every original
// non-blank line survives at least as many times as before, the frontmatter is byte-identical
// (its `paths:` globs decide when the skill fires), SKILL.md is under the cap, and every link
// in the routing table resolves. Any failure leaves the skill untouched.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, resolve, relative } from 'node:path';

const CAP = 25_000;
const TARGET = 22_000; // headroom under the cap so the next edit does not trip the gate

const KEEP = new RegExp(
  '^(purpose|overview|goals|mission|when (to|not to) (activate|fire|use|engage)|when to use|' +
    'when not to use|standards\\b|anti-?patterns?|banned|avoid|cross-?references?|see also|' +
    'related( skills)?|why (this|the) skill exists|learning hooks|verification checklist|' +
    'skill chain|resources|migrated rules)',
  'i'
);
// Kept even when SKILL.md must shrink further: the audit greps SKILL.md for these headings.
const PROTECTED = /^(purpose|when (to|not to) \w+|when to use|standards\b|anti-?patterns?|cross-?references?)/i;

const slug = (s) =>
  s.toLowerCase().replace(/`/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) ||
  'section';
const bytes = (s) => Buffer.byteLength(s, 'utf8');

// Markdown link targets that name a local path: not a URL, an anchor or an absolute path.
const LINK = /(\]\()([^)\s]+)(\))/g;
const isLocal = (t) => !/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(t);
const split = (t) => { const i = t.indexOf('#'); return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i)]; };

// Text moved one directory down must point where it pointed before. The first splits moved
// sections into references/ with their links unchanged, and 209 of them broke.
function rebase(text, fromDir, toDir) {
  return text.replace(LINK, (m, open, target, close) => {
    if (!isLocal(target)) return m;
    const [path, anchor] = split(target);
    if (!path) return m;
    return `${open}${relative(toDir, resolve(fromDir, path)) || '.'}${anchor}${close}`;
  });
}

// Every local link in `text` whose target does not exist, resolved from `dir`.
function broken(text, dir) {
  const out = new Set();
  for (const [, , target] of text.matchAll(LINK)) {
    const [path] = split(target);
    if (isLocal(target) && path && !existsSync(resolve(dir, path))) out.add(resolve(dir, path));
  }
  return out;
}

// A line with its local link targets written as absolute paths, so the same link reads the
// same from SKILL.md and from references/.
const canon = (text, dir) =>
  text.replace(LINK, (m, open, target, close) => {
    const [path, anchor] = split(target);
    return isLocal(target) && path ? `${open}@${resolve(dir, path)}${anchor}${close}` : m;
  });

function segment(text) {
  const m = /^---\n[\s\S]*?\n---\n/.exec(text);
  if (!m) throw new Error('no YAML frontmatter');
  const front = m[0];
  const lines = text.slice(front.length).split('\n');

  // Appendix documents start at a banner whose next lines name a "Section:".
  const isDocBanner = (i) =>
    /^<!-- =/.test(lines[i]) && /Section:/.test(`${lines[i + 1] || ''} ${lines[i + 2] || ''}`);

  const main = { pre: [], sections: [] };
  const docs = [];
  let inFence = false;
  let cur = null;
  let doc = null;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(```|~~~)/.test(l)) inFence = !inFence;
    if (!inFence && isDocBanner(i)) {
      const name = (/Section:\s*([^\s(]+)/.exec(`${lines[i + 1]} ${lines[i + 2]}`) || [])[1] || 'appendix';
      doc = { name: name.replace(/\.md$/, ''), lines: [l] };
      docs.push(doc);
      continue;
    }
    if (doc) {
      doc.lines.push(l);
      continue;
    }
    if (!inFence && /^## /.test(l)) {
      cur = { heading: l.replace(/^##\s+/, '').trim(), lines: [l] };
      main.sections.push(cur);
      continue;
    }
    (cur ? cur.lines : main.pre).push(l);
  }
  return { front, main, docs };
}

function build(dir) {
  const skill = basename(dir);
  const src = readFileSync(join(dir, 'SKILL.md'), 'utf8');
  const { front, main, docs } = segment(src);

  const refs = []; // { file, topic, text }
  const used = new Set(readdirSync(dir).includes('references') ? readdirSync(join(dir, 'references')) : []);
  const name = (base) => {
    let n = `${slug(base)}.md`;
    for (let k = 2; used.has(n); k++) n = `${slug(base)}-${k}.md`;
    used.add(n);
    return n;
  };
  const covers = (topic) =>
    `> Covers **${topic}** for the \`${skill}\` skill. Routed from the reference map in ` +
    '`../SKILL.md`.';
  // Every reference opens with a title, then the routing note. A fragment that opened with the
  // note instead failed markdownlint MD041 in 307 files; a title is also what makes a file
  // recognisable when it turns up alone in a search result.
  const refDir = join(dir, 'references');
  const moved = (lines) => rebase(lines.join('\n'), dir, refDir).split('\n');
  const section = (topic, lines) => `# ${skill}: ${topic}\n\n${covers(topic)}\n\n${moved(lines).join('\n')}`;
  // A migrated document already has its own H1 (after its provenance banner, which MD041
  // skips). The note goes after that title rather than adding a second one.
  const migrated = (topic, lines) => {
    const h1 = lines.findIndex((l) => /^# /.test(l));
    if (h1 < 0) return section(topic, lines);
    const m = moved(lines);
    return [...m.slice(0, h1 + 1), '', covers(topic), ...m.slice(h1 + 1)].join('\n');
  };

  const kept = [];
  for (const s of main.sections) {
    if (KEEP.test(s.heading)) kept.push({ ...s, moved: false });
    else refs.push({ file: name(s.heading), topic: s.heading, text: section(s.heading, s.lines) });
  }
  for (const d of docs) {
    const topic = `${d.name} (migrated rule)`;
    refs.push({ file: name(d.name), topic, text: migrated(topic, d.lines) });
  }

  const budgetLine =
    '> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`';

  const assemble = () => {
    const map = [
      '## Reference map',
      '',
      'The detail lives in `references/`, loaded only when the topic is needed. Read the row that',
      'matches the task rather than the whole directory.',
      '',
      '| Topic | Reference |',
      '| --- | --- |',
      ...refs.map((r) => `| ${r.topic.replace(/\|/g, '\\|')} | [\`references/${r.file}\`](references/${r.file}) |`),
      '',
    ];
    // The budget line goes directly under the title. Above it, it displaced the H1 as the
    // first line of the document, which failed markdownlint MD041 in 57 skills.
    const pre = [...main.pre];
    const h1 = pre.findIndex((l) => /^# /.test(l));
    // Once split, the cap IS the budget. A budget the skill already declared — sized from the
    // pre-split file, so usually above the cap — is replaced rather than joined by a second one.
    const existing = pre.findIndex((l) => /Size budget:/i.test(l));
    if (existing >= 0) pre[existing] = budgetLine;
    else pre.splice(h1 < 0 ? 0 : h1 + 1, 0, '', budgetLine);
    const body = [
      ...pre,
      ...map,
      ...kept.flatMap((s) =>
        s.moved
          ? [`## ${s.heading}`, '', `Moved to [\`references/${s.file}\`](references/${s.file}).`, '']
          : s.lines
      ),
    ].join('\n');
    return front + body;
  };

  let out = assemble();
  // Still over target: move the largest non-protected kept sections, leaving a pointer.
  const movable = kept.filter((s) => !PROTECTED.test(s.heading)).sort((a, b) => bytes(b.lines.join('\n')) - bytes(a.lines.join('\n')));
  for (const s of movable) {
    if (bytes(out) <= TARGET) break;
    s.moved = true;
    s.file = name(s.heading);
    refs.push({ file: s.file, topic: s.heading, text: section(s.heading, s.lines) });
    out = assemble();
  }
  return { skill, dir, src, front, out, refs };
}

function verify({ dir, src, front, out, refs }) {
  const problems = [];
  if (!out.startsWith(front)) problems.push('frontmatter changed');
  if (bytes(out) > CAP) problems.push(`SKILL.md still ${bytes(out)} B > ${CAP}`);
  // Multiset of non-blank lines: every original line must survive at least as often.
  const count = (s) => {
    const m = new Map();
    for (const l of s.split('\n')) if (l.trim()) m.set(l, (m.get(l) || 0) + 1);
    return m;
  };
  const refDir = join(dir, 'references');
  const before = count(canon(src, dir));
  const after = count([canon(out, dir), ...refs.map((r) => canon(r.text, refDir))].join('\n'));
  let lost = 0;
  // The one line allowed to go is a stale size budget, which build() replaces with the cap.
  for (const [l, n] of before) if (!/Size budget:/i.test(l) && (after.get(l) || 0) < n) lost++;
  if (lost) problems.push(`${lost} original line(s) would be lost`);
  const files = new Set(refs.map((r) => r.file));
  for (const [, f] of out.matchAll(/\]\(references\/([^)]+)\)/g)) if (!files.has(f)) problems.push(`dangling link ${f}`);
  // No link may break in the move. A target already broken in the source stays reported
  // there, not here: this checks the move, not the corpus.
  const was = broken(src, dir);
  for (const r of refs) {
    for (const t of broken(r.text, refDir)) {
      // A link to a sibling reference only exists once written, so it is not a break.
      if (!was.has(t) && !files.has(basename(t))) problems.push(`link broken by the move: ${r.file} -> ${t}`);
    }
  }
  return problems;
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const dirs = args.filter((a) => !a.startsWith('--'));
if (!dirs.length) {
  process.stderr.write('usage: split-skill.mjs [--check|--write] <skill-dir...>\n');
  process.exit(2);
}

let failed = 0;
for (const dir of dirs) {
  try {
    const r = build(dir);
    const problems = verify(r);
    const line = `${r.skill}: ${bytes(r.src).toLocaleString()} B -> ${bytes(r.out).toLocaleString()} B, ${r.refs.length} reference(s)`;
    if (problems.length) {
      failed++;
      process.stdout.write(`REFUSED ${line}\n  ${problems.join('\n  ')}\n`);
      continue;
    }
    if (write) {
      const rd = join(dir, 'references');
      if (!existsSync(rd)) mkdirSync(rd);
      for (const ref of r.refs) writeFileSync(join(rd, ref.file), `${ref.text.replace(/\n+$/, '')}\n`, 'utf8');
      writeFileSync(join(dir, 'SKILL.md'), r.out, 'utf8');
    }
    process.stdout.write(`${write ? 'SPLIT  ' : 'PLAN   '} ${line}\n`);
  } catch (err) {
    failed++;
    process.stdout.write(`ERROR   ${dir}: ${err.message}\n`);
  }
}
process.exit(failed ? 1 : 0);
