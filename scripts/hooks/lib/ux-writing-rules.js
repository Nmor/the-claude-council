// Size budget: 13 KB. Check: wc -c; gate: token-budget.mjs --check.
/**
 * Rule manifest for the UX-writing hook: copy a person will read.
 *
 * Separate from `no-discards-rules.js` on purpose. That module is about
 * discarded return values, suppression directives and leaked secrets — defects
 * in what the code DOES. This one is about what the product SAYS. Folding a copy
 * rule into a module named "no-discards" made the name a lie and buried a
 * Division 7 concern inside a Division 2 gate, which is how a rule stops being
 * findable by the people who own it.
 *
 * Same contract as its sibling (`evaluateFile(path, content) -> {blocking, soft}`)
 * so the edit-time hook and the repo-wide scanner drive both through one
 * interface.
 *
 * WHY IT EXISTS AS CODE. `ux-reviewer` has required an "AI-writing scan" for
 * months and `interaction-design` Pattern 16 lists these exact tells. Both are
 * instructions to a REVIEWER, so they bind only when somebody remembers to run
 * Division 7 over the copy. That was not remembered twice: a whole marketing site
 * shipped full of em-dashes (2026-08-23), and a legal document was drafted with 27
 * of them (2026-09-06). A rule that depends on being remembered is not
 * enforcement.
 *
 * WHAT IS AND IS NOT IN SCOPE. Copy is what a user reads: locale catalogues (every
 * value in one is a string somebody sees) and non-comment lines in JS-like files.
 * Code comments, Markdown docs, ADRs and plans are deliberately excluded — the
 * rule governs product copy, not writing about the product, and this file's own
 * commentary would otherwise trip it.
 */

"use strict";

const isJSLike = (filePath) => /\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i.test(filePath);

// A translation catalogue. Every value in one is a string a user reads, which is
// what makes a whole-file copy rule safe to apply to it.
const isLocaleCatalog = (filePath) =>
  /(^|\/)(locales?|i18n|lang|translations?|messages)\/.*\.json$/i.test(
    filePath,
  );

// A comment line is the author talking to other engineers, not to a user.
//
// JSX block comments matter as much as `//` ones: a `{/* ... */}` spanning several
// lines is still commentary, and flagging its middle lines sends an author to
// re-punctuate a note no user will ever read. Multi-line blocks are handled by the
// caller, which tracks open/close state; this covers the single-line forms.
const isCommentLine = (line) => {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("{/*")
  );
};

// A test file is a developer talking to a developer. An assertion message is
// read by whoever the test fails in front of, never by a user, so copy rules do
// not apply to it — and flagging one sends an author to re-punctuate a string
// that exists to explain a failure.
const isTestFile = (filePath) =>
  /(^|\/)__tests__\//i.test(filePath) ||
  /\.(test|spec)\.[cm]?[jt]sx?$/i.test(filePath);

// THE RULE IS ABOUT THE CONNECTOR, NOT THE CHARACTER.
//
// The tell this rule exists to catch is an em-dash welding two clauses together
// where a person would have picked a colon, a full stop or brackets. That shape
// always has WORDS on both sides of the dash. Three other uses share the
// character and are not the tell:
//
//   PLACEHOLDER   <p>—</p> or "—" standing in for an absent amount or date.
//                 A long-standing typographic convention, and the alternatives a
//                 warning would push an author toward (a hyphen, an empty cell)
//                 both read worse.
//   SEPARATOR     {log.status} — {log.date}, or ` — ${money(...)}`. The dash
//                 divides two rendered VALUES; there is no sentence to
//                 re-punctuate, and the fix a warning implies does not exist.
//   RANGE / GLYPH a dash adjacent to markup or an interpolation boundary.
//
// So the test is not "does the line contain an em-dash" but "does this em-dash
// join two words". A dash whose neighbours are `{`, `}`, `<`, `>`, `$`, a quote,
// or the end of the line is doing one of the jobs above.
//
// Provenance: added 2026-09-07 after the first repo-wide run. Of 39 baselined
// hits in admin-dashboard, 33 were multi-line comment bodies (fixed separately)
// and of the 6 that survived, 5 were separators or placeholders and 1 was a test
// assertion. A rule whose output is mostly false positives gets baselined and
// then ignored, which is worse than not having it.
//
// \p{M} is in the character class deliberately. A letter carrying a combining mark
// ends in that MARK, not in the base letter, so `\p{L}` alone does not match the end
// of a word in any language that writes its tones or diacritics as separate code
// points. Yoruba copy went undetected for exactly this reason — "rẹ̀ — ó" has a
// combining grave (U+0300) sitting between the letter and the dash. Precomposed text
// was fine, which is why this survived a repo-wide run: NFC Vietnamese and French
// match on the base letter alone, so only the decomposed forms slipped through, and
// the rule looked like it worked everywhere it was tried.
const WORD_BEFORE = /[\p{L}\p{N}][\p{M}]*[)"'`\]]?\s*$/u;
const WORD_AFTER = /^\s*[("'`[]?[\p{L}\p{N}]/u;

const isConnectorDash = (line) => {
  const parts = line.split("—");
  for (let i = 1; i < parts.length; i++) {
    if (WORD_BEFORE.test(parts[i - 1]) && WORD_AFTER.test(parts[i]))
      return true;
  }
  return false;
};

// Buzzwords from Pattern 16. Each is a word that promises a feeling instead of
// describing a behaviour, which is why they cluster in generated marketing copy:
// they are what you write when you have nothing specific to say.
const BUZZWORDS =
  "unlock|seamless(?:ly)?|effortless(?:ly)?|robust|leverage|elevate|" +
  "supercharge|game-changing|best-in-class|world-class|delve|" +
  "cutting-edge|state-of-the-art|revolutionise|revolutionize";
const buzzwordRe = new RegExp(`\\b(${BUZZWORDS})\\b`, "i");

// Openers that say nothing and exist to fill the first line before the point.
const emptyOpenerRe =
  /\b(in today's [\w-]+ world|whether you're|when it comes to|at the end of the day|it's worth noting that|in the ever-(?:changing|evolving))/i;

// The contrast tic. "Not just a wallet, but a whole financial life" — a shape
// that sounds like emphasis and carries no information.
const notJustRe = /\bnot (?:just|only) [^,.]{2,40},? but\b/i;

// Copy rules govern PRODUCT COPY: a locale catalogue, or a string rendered by a
// JS-like source file. A test file is excluded whichever rule is asking, because
// an assertion message is a developer talking to a developer.
const appliesToCopy = (filePath) =>
  !isTestFile(filePath) && (isLocaleCatalog(filePath) || isJSLike(filePath));

// A logger call's message is written for whoever is reading the logs at 3am, not
// for a user. It should be precise and it is reviewed like any other string, but
// the copy rules do not apply to it: there is no screen to re-punctuate, and
// "chunk load failed — reloading once" is exactly how an operator wants to read
// it. Matched on the line rather than the file, since these sit among real copy.
const isOperatorLine = (line) =>
  /\b(?:log|logger|console)\s*\.\s*(?:log|info|warn|warning|error|debug|trace|fatal)\s*\(/.test(
    line,
  );

const rules = [
  // 1. em-dash-connector — the most reliable tell, and the one worth a rule of
  //    its own.
  //
  //    An em-dash is not wrong English. It is a SIGNAL: a model reaches for it
  //    as a default connector in the place where a person would choose a colon,
  //    a full stop or brackets. Flagging it forces that choice to be made
  //    instead of defaulted.
  //
  //    Fixing one means RE-PUNCTUATING the sentence. Swapping the character for
  //    an en-dash or a hyphen trades one tic for another and leaves the sentence
  //    exactly as undecided as it was.
  //
  //    Warn rather than block: an em-dash inside a quoted proper noun, a book
  //    title or a citation is legitimate, and hard-blocking punctuation would be
  //    its own kind of annoyance. It shows in the repo-wide scan, so a backlog
  //    stays visible rather than being reported once and forgotten.
  {
    id: "em-dash-connector",
    level: "warn",
    applies: appliesToCopy,
    test: (line) => !isCommentLine(line) && !isOperatorLine(line) && isConnectorDash(line),
  },

  // 2. buzzword — a word that promises a feeling instead of describing what
  //    happens. "Withdraw in one tap" survives review; "seamless withdrawals"
  //    does not, because the reader cannot tell what either one does.
  {
    id: "buzzword",
    level: "warn",
    applies: appliesToCopy,
    test: (line) => !isCommentLine(line) && !isOperatorLine(line) && buzzwordRe.test(line),
  },

  // 3. empty-opener — a first clause that delays the sentence without adding to
  //    it. The fix is always deletion, never rewording.
  {
    id: "empty-opener",
    level: "warn",
    applies: appliesToCopy,
    test: (line) => !isCommentLine(line) && !isOperatorLine(line) && emptyOpenerRe.test(line),
  },

  // 4. not-just-but — the contrast tic. Reads as emphasis, carries no fact.
  {
    id: "not-just-but",
    level: "warn",
    applies: appliesToCopy,
    test: (line) => !isCommentLine(line) && !isOperatorLine(line) && notJustRe.test(line),
  },
];

function buildSnippet(line) {
  return line.trim().slice(0, 120);
}

function evaluateFile(filePath, content) {
  const lines = content.split("\n");
  const blocking = [];
  const soft = [];
  // Multi-line comment state. A `{/* ... */}` or `/* ... */` note can run for many
  // lines, and only its first one starts with a comment marker; without this, the
  // body of an explanation gets flagged as product copy.
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opensBlock =
      /\{?\/\*/.test(line) && !/\*\/\}?/.test(line.split(/\{?\/\*/)[1] || "");
    if (inBlockComment) {
      if (/\*\/\}?/.test(line)) inBlockComment = false;
      continue;
    }
    if (opensBlock) {
      inBlockComment = true;
      continue;
    }
    for (const rule of rules) {
      if (!rule.applies(filePath)) continue;
      if (!rule.test(line)) continue;
      const entry = {
        line: i + 1,
        rule: rule.id,
        snippet: buildSnippet(line),
      };
      if (rule.level === "block") blocking.push(entry);
      else soft.push(entry);
    }
  }
  return { blocking, soft };
}

module.exports = { evaluateFile };
