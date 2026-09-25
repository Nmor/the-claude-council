#!/usr/bin/env node
// Size budget: 10 KB. Check: wc -c; gate: token-budget.mjs --check.
//
// Reflow over-long markdown PROSE to a column limit, and prove nothing changed but the
// line breaks.
//
//   node ~/.claude/scripts/reflow-md.mjs --check <files...>   # report only
//   node ~/.claude/scripts/reflow-md.mjs --write <files...>   # rewrite in place
//
// WHY THIS EXISTS RATHER THAN A HAND PASS. There were 303 over-long prose lines across the
// agent and command corpus. Rewrapping those by hand is where a definition quietly loses a
// clause, and an agent file that loses a clause changes what that agent does — a functional
// regression bought for a style fix, which is a bad trade.
//
// WHY IT IS SAFE. Reflowing is only legal if the TEXT is unchanged, so this is not a
// judgement call the tool gets to make: it collapses all whitespace in the file before and
// after and requires the two to be byte-identical. A reflow that dropped, duplicated or
// altered a single character fails that check and the file is left untouched. The checker is
// the point of the script; the wrapping is the easy half.
//
// WHAT IT REFUSES TO TOUCH, because in each case a line break changes meaning or breaks a
// structure: YAML frontmatter, fenced code, indented code, tables, headings, HTML blocks,
// link-reference definitions, horizontal rules, and any line that simply has no space left
// of the limit (a long URL or one long code span — wrapping those would break them).
import { readFileSync, writeFileSync } from 'node:fs';

const LIMIT = 100;

const isFence = (l) => /^\s*(```|~~~)/.test(l);
const isTable = (l) => /^\s*\|/.test(l);
const isHeading = (l) => /^\s*#{1,6}\s/.test(l);
const isRule = (l) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
const isHtml = (l) => /^\s*<\/?[a-zA-Z]/.test(l);
const isLinkDef = (l) => /^\s*\[[^\]]+\]:\s/.test(l);
const isIndentedCode = (l) => /^ {4,}\S/.test(l) && !/^\s*([-*+]|\d+[.)])\s/.test(l);
const hardBreak = (l) => /\s{2,}$/.test(l);

// Blockquotes are left alone on purpose. Wrapping one is CORRECT markdown — each
// continuation line must carry its own `> ` — but that inserts a character the
// content-identity check cannot distinguish from real text, and the honest fix is to
// narrow the tool rather than to weaken the check. Teaching normalize() to ignore `>`
// would blind it to a genuine blockquote change anywhere in the corpus, which is a far
// worse trade than leaving a handful of long quoted lines alone.
const isBlockquote = (l) => /^\s*>/.test(l);

// A prose line that can be wrapped, with its continuation prefix.
// A list item continues under its own text indent; a blockquote keeps its marker; a plain
// paragraph continues at its own indent.
function shape(line) {
  const bq = /^(\s*(?:>\s?)+)/.exec(line);
  const quote = bq ? bq[1] : '';
  const rest = line.slice(quote.length);
  const li = /^(\s*)([-*+]|\d+[.)])(\s+)/.exec(rest);
  if (li) {
    const first = quote + li[1] + li[2] + li[3];
    const cont = quote + li[1] + ' '.repeat(li[2].length + li[3].length);
    return { first, cont, body: rest.slice(li[0].length) };
  }
  const ind = /^(\s*)/.exec(rest)[1];
  return { first: quote + ind, cont: quote + ind, body: rest.slice(ind.length) };
}

// A wrapped continuation must never START with something markdown reads as a block
// marker. This is the one way a reflow can change the RENDERED document while leaving the
// text byte-identical, so the whitespace-identity check cannot see it.
//
// Found the hard way, 2026-09-21: the prose "... component library specs, IA + flows" broke
// across lines, leaving "+ flows" at the start of a continuation. Markdown read that as a
// list item, and a later `markdownlint --fix` then "normalised" the `+` to `-` — so a
// paragraph quietly became a bullet, twice removed from the edit that caused it. Five such
// lines were created across three files before this guard existed.
// The trailing \s matters: a bullet is `- `, `* ` or `+ ` WITH a space. Without it this
// also refused `**bold**` (an asterisk) and `-count=1` (a flag), so safe wraps were being
// declined and the lines left long for no reason.
const STARTS_BLOCK = /^([-*+]\s|\d+[.)]\s|>|#{1,6}\s|\|)/;

function wrap(line, limit) {
  const { first, cont, body } = shape(line);
  const words = body.split(/ +/).filter(Boolean);
  if (words.length < 2) return [line]; // nothing to break on
  const out = [];
  let cur = first;
  let started = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const candidate = started ? `${cur} ${w}` : cur + w;
    // Never break BEFORE a word that would read as a block marker at line start. The
    // corpus uses " + " as a conjunction ("Privacy Officer + General Counsel"), and a
    // break there turns the rest of the sentence into a bullet. Carrying the word onto
    // the current line costs a few columns; breaking there costs the paragraph.
    const wouldStartBlock = STARTS_BLOCK.test(`${w} ${words[i + 1] ?? ''}`.trim() + ' ');
    if (started && candidate.length > limit && cur.trim() && !wouldStartBlock) {
      out.push(cur);
      cur = cont + w;
    } else if (started && candidate.length > limit && wouldStartBlock) {
      // Cannot break before this word, so break one word EARLIER and carry the previous
      // word down with it: "…specs, IA + flows" becomes "…specs," / "IA + flows". Only when
      // the current line has a previous word of its own to give up; otherwise accept the
      // overflow, which is a style finding rather than a broken paragraph.
      const at = cur.lastIndexOf(' ');
      const prefix = out.length ? cont.length : first.length; // spaces inside the prefix are indentation
      if (at >= prefix) {
        out.push(cur.slice(0, at));
        cur = `${cont}${cur.slice(at + 1)} ${w}`;
      } else {
        cur = candidate;
      }
    } else {
      cur = candidate;
      started = true;
    }
  }
  out.push(cur);

  // If any continuation begins with a block marker, this line is not safely wrappable.
  // Leaving it long is the correct outcome: a style finding is cheaper than a paragraph
  // silently rendering as a list.
  for (let i = 1; i < out.length; i++) {
    if (STARTS_BLOCK.test(out[i].slice(cont.length))) return [line];
  }
  return out;
}

// The proof: every non-whitespace character, in order, must survive.
const normalize = (s) => s.replace(/\s+/g, ' ').trim();

function reflow(text, limit = LIMIT) {
  const lines = text.split('\n');
  const out = [];
  let inFence = false;
  let fenceMark = '';
  let inFront = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (i === 0 && l.trim() === '---') {
      inFront = true;
      out.push(l);
      continue;
    }
    if (inFront) {
      out.push(l);
      if (l.trim() === '---') inFront = false;
      continue;
    }
    if (isFence(l)) {
      const m = /^\s*(```|~~~)/.exec(l)[1];
      if (!inFence) {
        inFence = true;
        fenceMark = m;
      } else if (m === fenceMark) {
        inFence = false;
      }
      out.push(l);
      continue;
    }
    if (
      inFence ||
      l.length <= limit ||
      isTable(l) ||
      isHeading(l) ||
      isRule(l) ||
      isHtml(l) ||
      isLinkDef(l) ||
      isIndentedCode(l) ||
      isBlockquote(l) ||
      hardBreak(l)
    ) {
      out.push(l);
      continue;
    }
    out.push(...wrap(l, limit));
  }
  return out.join('\n');
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  process.stderr.write('usage: reflow-md.mjs [--check|--write] <files...>\n');
  process.exit(2);
}

let changed = 0;
let refused = 0;
let linesBefore = 0;
let linesAfter = 0;

for (const f of files) {
  let src;
  try {
    src = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  const out = reflow(src);
  if (out === src) continue;

  const [ns, no] = [normalize(src), normalize(out)];
  if (ns !== no) {
    // Never write a file whose text changed. This is the whole safety contract — and the
    // refusal names WHERE, because a refusal you cannot act on just gets overridden.
    let at = 0;
    while (at < ns.length && at < no.length && ns[at] === no[at]) at++;
    process.stderr.write(
      `REFUSED (content would change): ${f}\n` +
        `  first divergence at char ${at} of the normalized text\n` +
        `    was: ${JSON.stringify(ns.slice(Math.max(0, at - 60), at + 60))}\n` +
        `    got: ${JSON.stringify(no.slice(Math.max(0, at - 60), at + 60))}\n`
    );
    refused++;
    continue;
  }
  linesBefore += src.split('\n').filter((l) => l.length > LIMIT).length;
  linesAfter += out.split('\n').filter((l) => l.length > LIMIT).length;
  changed++;
  if (write) writeFileSync(f, out, 'utf8');
}

process.stdout.write(
  `${write ? 'rewrote' : 'would rewrite'} ${changed} file(s); ` +
    `over-limit lines ${linesBefore} -> ${linesAfter}; refused ${refused}\n`
);
process.exit(refused ? 1 : 0);
