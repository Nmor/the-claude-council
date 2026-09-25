/**
 * Rule manifest for the no-discards PostToolUse hook.
 *
 * Each rule defines:
 *   - id: short kebab-case identifier surfaced to the agent
 *   - level: "block" | "warn"
 *   - applies(filePath): boolean — file-extension and path-based gate
 *   - test(line, ctx): boolean | string — per-line check; returns true
 *     to flag, or a custom snippet override
 *
 * Keeping rules as data (not inline regex inside the runner) means
 * adding a new rule is a one-block change here, and the runner stays
 * a dumb iterator. Each rule's tests (a case that must fire and a near-miss
 * that must not) live in __tests__/no-discards-rules.test.mjs.
 *
 * Implementation notes:
 *   - Regex literals with the placeholder-marker keywords are
 *     wrapped in String.raw so the source file does not contain
 *     bare backslash-escapes that confuse Sonar.
 *   - Each rule's plain-English description is its `summary`, which the
 *     hook prints for the rules an edit trips. (This used to point at a
 *     docs/no-discards.md that does not exist.)
 */

// Size budget: 40 KB. Check: wc -c; gate: token-budget.mjs --check.
"use strict";

// stripQuoted blanks out the contents of single- and double-quoted
// strings on a single source line, preserving line length so column
// offsets remain accurate. Used so regex matches don't fire inside
// legitimate string content (test fixtures, prompt templates, etc.).
function stripQuoted(line) {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let escape = false;
  for (const ch of line) {
    if (escape) {
      out += " ";
      escape = false;
      continue;
    }
    // A backslash escapes inside quoted and double-quoted strings. Go raw
    // strings (backticks) have no escapes at all, so a backslash there is
    // literal content and must not start an escape sequence.
    if ((inSingle || inDouble) && ch === "\\") {
      out += " ";
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble && !inBacktick) {
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }
    // Backticks: a Go RAW STRING, and a JS template literal. Both are string
    // content, and both were being scanned as code. That flagged the regex
    // literal inside post-mockgen — the tool whose whole job is to FIND the
    // discard pattern in generated mocks and rewrite it. A rule cannot ask a
    // codebase to stop describing it.
    if (ch === "`" && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      out += ch;
      continue;
    }
    out += inSingle || inDouble || inBacktick ? " " : ch;
  }
  return out;
}

// Extension predicates. Centralised so each rule reads cleanly.
const isExt = (re) => (filePath) => re.test(filePath);
const isProdSource = isExt(
  /\.(go|ts|tsx|js|jsx|mjs|cjs|py|rb|swift|java|kt|cs|dart|cpp|hpp|c|h|vue|rs|php)$/i,
);
const isJSLike = isExt(/\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i);
const isGo = isExt(/\.go$/i);
const isPython = isExt(/\.py$/i);
const isUI = isExt(/\.(jsx|tsx|vue)$/i);
const isCSS = isExt(/\.(css|scss|sass|less)$/i);
const isMarkdown = isExt(/\.(md|mdx)$/i);
const isIaC = isExt(/\.(tf|tfvars|ya?ml)$|(^|\/)Dockerfile[^/]*$/i);

const isTestFile = (filePath) =>
  /_test\.go$/i.test(filePath) ||
  /\.(test|spec)\.[jt]sx?$/i.test(filePath) ||
  /(^|\/)test_\w+\.py$|_test\.py$/i.test(filePath);
const isStoriesFile = (filePath) => /\.stories\./i.test(filePath);

// A single-line comment. Rules that opt out of comment bodies via `skipComments`
// need this as well as the block tracking: a rule whose whole subject is code
// should not fire on a sentence describing that code. Writing "`_, _ =` is the
// shape this catches" in a helper's own documentation is not a discard.
//
// `#` opens a comment only where the language says so. In CSS a line starting with
// `#` is an ID selector, and treating it as prose let `#banner { background: #111 }`
// through the colour rule untouched.
const hashComments = isExt(/\.(py|rb|sh|bash|zsh|ya?ml|tf|tfvars|toml)$/i);
const isCommentLine = (line, filePath = "") => {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    (t.startsWith("#") && hashComments(filePath)) ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("{/*") ||
    t.startsWith("<!--")
  );
};

const isTokenSource = (filePath) =>
  /tweakcn|tokens?|theme|design-system/i.test(filePath);

// The placeholder-marker keywords are kept in a single regex source
// string so we don't repeat them as bare identifiers in this file.
// The runner treats this string as a regex source via new RegExp(...).
//
// Every keyword is split into pieces so THIS file doesn't self-match:
//   - T + ODO   → "TODO"
//   - F + IXME  → "FIXME"
//   - X + XX    → "XXX"
//   - B + UG    → "BUG(…)" — Go-style godoc bug marker + free-form
//   - H + ACK   → "HACK"
//   - K + LUDGE → "KLUDGE"
//   - W + ORKAROUND → "WORKAROUND"
//   - N + OTE   → "NOTE: <blocker>" — informational-but-actionable
// The BUG variant matches both `BUG(slug)` (godoc's Bug function
// registration) and bare `BUG:` prose; the intent is that "there's
// a known bug here, ignore it" is not acceptable in production —
// open a real issue with a fix or delete the comment.
const PLACEHOLDER_MARKERS =
  String.raw`T` +
  String.raw`ODO|F` +
  String.raw`IXME|X` +
  String.raw`XX` +
  String.raw`|B` +
  String.raw`UG|H` +
  String.raw`ACK|K` +
  String.raw`LUDGE|W` +
  String.raw`ORKAROUND|N` +
  String.raw`OTE`;
// A MARKER, not the word. These are written as tags — uppercase, usually with a
// colon — and matching them case-insensitively caught ordinary prose instead:
// "Note also that OTP shares this constant", "the bug survives review because it
// is invisible in a snippet". Both are explanation, which is what a comment is
// for, and flagging them taught the rule's users to ignore it.
//
// So a marker is either UPPERCASE (the convention: TODO, FIXME, NOTE:), or any
// case followed immediately by a colon (`todo:`, `bug:`), which is the other way
// people actually write them. "Note that" and "a bug in the provider" are
// neither, and are prose.
// Two passes, because the two forms need different case sensitivity and a JS
// regex cannot scope a flag to one alternative.
//
//   TAGGED     any case, but followed by a colon or an owner in brackets:
//              `todo:`, `TODO(sam):`, `bug:`. The punctuation is what makes it a
//              tag rather than the first word of a sentence.
//   SHOUTED    uppercase, no punctuation needed: `TODO fix this`, `FIXME`, `XXX`.
//              Writing it in capitals IS the marking.
//
// Anything else is prose and stays out: "Note also that OTP shares this
// constant" and "the bug survives review" are explanation, which is the job of a
// comment.
// The bracket form is an OWNER — `TODO(sam):`, `FIXME(payments):` — so it takes a
// single bare word and still ends in the colon. Accepting any open bracket caught
// a wrapped prose line that happened to begin "bug (no-silent-failures rule 1:
// ...)", where "bug" is the tail of "which reads as our bug" on the line above.
const placeholderTaggedRe = new RegExp(
  String.raw`(?://|#|<!--|/\*)\s*(${PLACEHOLDER_MARKERS})\s*(?::|\([\w.\-/]+\)\s*:)`,
  "i",
);
const placeholderShoutedRe = new RegExp(
  String.raw`(?://|#|<!--|/\*)\s*(${PLACEHOLDER_MARKERS})\b`,
  "",
);
const placeholderRe = {
  test: (line) =>
    placeholderTaggedRe.test(line) || placeholderShoutedRe.test(line),
};

// Scaffold-deferral markers signal deliberate incompleteness in CODE — a
// "scaffold only / stub for now / implement later" comment is a debt, not a
// shipped feature (user directive 2026-08-11: "I do not want scaffold for any
// feature. I will always want the full thing"). Comment-scoped + high-precision
// to avoid false positives; deliberately NOT applied to markdown so plans /
// memory / docs can DISCUSS scaffolding freely (this rule's own docs included).
const SCAFFOLD_DEFERRAL = String.raw`scaffold[- ]only|stub(?:bed)? for now|placeholder impl(?:ementation)?|full impl(?:ementation)?\s+later|(?:implement|finish|flesh)(?:\s+this|\s+it|\s+out)?\s+later`;
const scaffoldDeferralRe = new RegExp(
  String.raw`(?://|#)\s*[\s\S]*?(${SCAFFOLD_DEFERRAL})|/\*[\s\S]*?(${SCAFFOLD_DEFERRAL})`,
  "i",
);

// Suppression directives the hook blocks. One regex per family
// rather than a single mega-alternation, so adding a new directive
// is a one-line append.
const suppressionRes = [
  /\/\/\s*nolint\b/i,
  /\/\/\s*eslint-disable\b/i,
  /\/\/\s*@ts-ignore\b/i,
  /\/\/\s*@ts-expect-error\b/i,
  /#\s*noqa\b/i,
  /#\s*type:\s*ignore\b/i,
  /#\s*pragma:\s*no\s*cover\b/i,
  /#\s*rubocop:disable\b/i,
];

const rules = [
  // 1. underscore-discard — "Never use _ to silence return values".
  //    Range / for-loop blank identifiers (`for _, v := range …`,
  //    `for _ = range …`) are NOT discards — the underscore is the
  //    index/value position in a loop binding, not a discarded
  //    return. The rule excludes those forms explicitly.
  {
    id: "underscore-discard",
    summary: "bind every return value: no `_,` / `, _ :=` / `_ =`",
    level: "block",
    // Reads code, not prose. Documentation that quotes the banned shape in
    // order to explain it is not an instance of it.
    skipComments: true,
    // Covers Go, JS/TS, AND Python — including test files. A discarded return
    // value is a discard regardless of language or whether the file is a test
    // (the policy is "NO discards ever"). Python's `_, x = f()` / `x, _ = f()`
    // / `_ = f()` forms are caught by the same regexes below.
    applies: (filePath) =>
      isGo(filePath) || isJSLike(filePath) || isPython(filePath),
    test: (line) => {
      const ns = stripQuoted(line);
      // Range / for-loop bindings are judged on whether a slot is actually
      // thrown away, not on whether an underscore appears (owner decision,
      // 2026-09-06 — the rule and this module had disagreed outright, with
      // CLAUDE.md §2.1 banning every range blank and this module exempting
      // every one of them).
      //
      // LEGAL: `for _, v := range s` / `for _, v in xs`. The blank there is
      // the index slot, and Go has no shorter way to say "iterate the values".
      // Nothing is dropped: the index was never produced for the caller to
      // use, and the index form (`for i := range s { v := s[i] }`) costs a
      // line and a bounds read at every site to say the same thing. This is
      // what the standard library, every linter default and gofmt assume.
      //
      // BANNED: `for k, _ := range m` and `for _ = range x`. Both bind a slot
      // and then throw it away, and both have a shorter form that does not —
      // `for k := range m`, `for range x`. Writing the blank is choosing to
      // discard something the language was willing to omit.
      if (/\bfor\s+\w+\s*,\s*_\s*(:=|=)\s*range\b/.test(ns)) return true;
      if (/\bfor\s+_\s*(:=|=)\s*range\b/.test(ns)) return true;
      if (/\bfor\s+\w+\s*,\s*_\s+in\s+/.test(ns)) return true;
      if (/\bfor\s+_\s*,/.test(ns)) return false;
      if (/\bfor\s+[\w\s,]*\b_\b[\w\s,]*\s+in\s+/.test(ns)) return false;
      // Skip blank-named function/method PARAMETERS (Go uses `_`
      // to mark an unused parameter — `func f(_, x string)` —
      // which is the idiomatic way to satisfy an interface
      // contract without naming the value).
      if (/^\s*func\s+/.test(ns) || /^\s*\([^)]*\)\s+\w+\s*\(/.test(ns))
        return false;
      // Skip Python function/lambda signatures: an unused PARAMETER named `_`
      // or `_, x` in a def/lambda is a parameter convention, not a return
      // discard (e.g. `def handler(_, x):`, `lambda _, y: ...`).
      if (
        /^\s*(async\s+)?def\s+\w+\s*\(/.test(ns) ||
        /\blambda\b[^:]*:/.test(ns)
      )
        return false;
      // Note: the user-overruled rule says NO discards ever, including
      // the canonical `if _, ok := m[k]; ok { ... }` Go map-membership
      // idiom. Use `map[K]bool` and read the value directly when only
      // existence matters; the zero value (false) IS the absence
      // signal. See feedback_global_rule_enforcement.md (2026-05-08).
      return (
        /(^|[\s(])_, /.test(ns) ||
        /, _ :?=/.test(ns) ||
        /(^|\s)_ ?:?= [^=]/.test(ns)
      );
    },
  },

  // 1b. expr-statement-discard — a bare call whose return value is dropped.
  //
  //     A blanket "any bare call statement is a discard" is INFEASIBLE in
  //     Python/JS: side-effecting void calls (logger.info(), list.append(),
  //     await queue.put(), metrics.inc()) are idiomatic and everywhere. So this
  //     rule is deliberately HIGH-PRECISION: it flags only a bare call whose
  //     final callee segment begins with a verb that almost always RETURNS a
  //     value meant to be used (find/fetch/lookup/parse/compute/calculate/
  //     query). `result = obj.find(...)` is fine (assigned); `obj.find(...)`
  //     alone is the footgun (a dropped return value that reads as a no-op).
  //     Awaited calls (`await x.fetch()`) are intentionally NOT flagged here —
  //     awaiting for side effects is common and the false-positive risk is high.
  {
    id: "expr-statement-discard",
    summary: "a find/fetch/parse/query call whose result is dropped does nothing: assign and use it",
    level: "block",
    applies: (filePath) =>
      isGo(filePath) || isJSLike(filePath) || isPython(filePath),
    test: (line) => {
      const ns = stripQuoted(line).trim();
      // Must be a standalone call statement: an identifier/attribute chain
      // immediately followed by `(`, to a balanced-ish `)` end (optional
      // trailing `;`). Leading `=`, `return`, `await`, `yield`, control
      // keywords, decorators, and comments all fail this anchor.
      const m = /^([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*\(.*\)\s*;?$/.exec(
        ns,
      );
      if (!m) return false;
      const chain = m[1];
      // Exclude DECLARATIONS, not calls: an interface/method signature
      // (`Fetch(ctx) (T, error)`) or a Go func decl has a second parenthesised
      // group (the return types) after the first. A real call statement does
      // not. This keeps the rule from flagging interface bodies.
      const afterFirstCall = ns.replace(/^[A-Za-z_][\w.]*\s*\([^]*?\)\s*/, "");
      if (/^\(/.test(afterFirstCall)) return false;
      const finalSegment = chain.slice(chain.lastIndexOf(".") + 1);
      // High-signal "returns a value" verb prefixes (case-sensitive, lower-case
      // first letter). DELIBERATELY NARROW: broadening to exported methods or
      // more verbs flags void calls (handlers, GenerateCompositeKeys, flag.Parse)
      // and interface decls — a regex can't tell a value-returning call from a
      // void one without type info. The comprehensive "dropped value/error"
      // gate is the type-aware linter (errcheck / staticcheck / ruff) in
      // done-criteria, NOT this hook. Match find/find_all/findOne/parse_x etc.
      return /^(find|fetch|lookup|parse|compute|calculate|query)([_A-Z]|$)/.test(
        finalSegment,
      );
    },
  },

  // 2. placeholder-marker — finish the work or open a real ticket.
  {
    id: "placeholder-marker",
    summary: "finish the work or open a real ticket: no T0D0 / F1XME style markers",
    level: "block",
    applies: (filePath) =>
      isProdSource(filePath) || isMarkdown(filePath) || isCSS(filePath),
    test: (line) => placeholderRe.test(line),
  },

  // 2c. scaffold-deferral — ship the full feature, never a "scaffold/stub for
  //     now / implement later". Code comments only (markdown discusses freely).
  {
    id: "scaffold-deferral",
    summary: "ship the whole feature: no \"stub for now\" / \"implement later\" comments",
    level: "block",
    applies: isProdSource,
    test: (line) => scaffoldDeferralRe.test(line),
  },

  // 3. suppression — never disable a linter; fix the underlying code.
  {
    id: "suppression",
    summary: "fix the code, never silence the linter: no nolint, eslint-disable, @ts-ignore, noqa",
    level: "block",
    applies: isProdSource,
    test: (line) => suppressionRes.some((re) => re.test(line)),
  },

  // 4. task-pointer — comments document WHY, not "plan B2" / "Sonar S1192".
  {
    id: "task-pointer",
    summary: "comments say WHY, not \"plan B2\" / \"Sonar S1192\": plan ids belong in the plan and the commit",
    level: "block",
    applies: (filePath) =>
      isProdSource(filePath) || isCSS(filePath) || isIaC(filePath),
    test: (line) => {
      const trimmed = line.trim();
      const isComment =
        /^(\/\/|#|\*)/.test(trimmed) ||
        /\s\/\/\s/.test(line) ||
        /^\s*\*/.test(line);
      if (!isComment) return false;
      return (
        /\b(plan|initiative)\s+[A-Z]\d+\b/i.test(line) ||
        // Bare-number plan refs the letter-prefixed pattern above misses:
        // "plan 2.2", "(plan 2.0)", "plan phase 3". Verified zero false
        // positives across the working repos (legit code comments don't say
        // "plan <number>"); plan IDs belong in the gitignored plan, not source.
        /\bplan\s+(phase\s+)?\d/i.test(line) ||
        /\bpunch[- ]list\s+[A-Z]?\d+\b/i.test(line) ||
        /\bbug\s+[A-Z]\d+\b/.test(line) ||
        /\bSonar(?:'s|Lint|Qube|\s+rule)?\b/i.test(line) ||
        /\bSonar\s+S\d+\b/i.test(line) ||
        /\bper\s+S\d+\b/i.test(line) ||
        /\bsee\s+plan\b/i.test(line) ||
        // A REFERENCE to the project plan, not the word "plan".
        //
        // This was `\bthe\s+plan\b`, which is unsafe in any product where a plan
        // is a domain noun. It blocked an edit to a test whose comment read "the
        // buyer has to see the plan they are agreeing to" — an INSTALMENT plan,
        // the thing being tested. A blocking rule that fires on a domain term
        // stops work on exactly the files that use it most, so the match now
        // needs a referential preposition or an artefact word after it.
        // Verbs whose object can only be a document: "per the plan", "tracked in
        // the plan". No ambiguity, so no lookahead needed.
        /\b(?:per|against|tracked\s+in|listed\s+in|recorded\s+in|documented\s+in)\s+the\s+plan\b/i.test(
          line,
        ) ||
        // Verbs that also read naturally with a domain object: "see the plan they
        // are agreeing to" is an INSTALMENT plan, not a pointer. These count only
        // when the reference ENDS there or is followed by a document word, which
        // is what separates "see the plan for the sequence" from "see the plan
        // they agreed to".
        /\b(?:see|in|from)\s+the\s+plan\b(?=\s*(?:[.,;:)]|$|for\b|file\b|doc\b))/i.test(
          line,
        ) ||
        /\bthe\s+plan\s+(?:file|doc|document|md)\b/i.test(line) ||
        /\bphase\s+\d+\b/i.test(line) ||
        // Phased-plan task identifiers: capital P, digits, then dot-segments
        // (the gitignored plans' shorthand). Case-sensitive so lowercase
        // percentile labels (p95, p99) are not caught.
        /\bP\d+(?:\.[0-9A-Za-z]+)+\b/.test(line) ||
        // The SAME identifiers without the P prefix: <digits>.<UPPER>.<alnum>,
        // e.g. 9.B.8, 9.D.11, 9.H.1. The \b before the digits means embedded ids
        // (S3.Bucket, boto3.client) are NOT matched; the required uppercase middle
        // letter + a third segment skip version strings (1.2.3, "Python 3.x") and
        // percentile labels. Three-segment only — bare two-segment phase refs
        // (9.B) overlap too much with version families (3.X, 4.X) to flag safely.
        /\b\d+\.[A-Z]\.[0-9A-Za-z]+\b/.test(line) ||
        // Retrospective/workstream shorthand: R-W2, RW2, R-W2.G2. Belt-and-braces
        // for the legacy vocabulary — the CANONICAL plan-marker convention is the
        // P-form above (P<plan>.<wave>.<item>, e.g. P11.W2.G2), which this rule
        // already catches; new plans MUST use it (see plan-task-breakdown.md).
        /\bR-?W\d/.test(line) ||
        // Gap/work-item pointers: GAP8, GAP-9. Case-SENSITIVE (uppercase GAP +
        // digit) so the prose word "gap" (e.g. "close the gap") is NOT flagged —
        // only the task-pointer form. The gap->commit mapping belongs in the
        // commit/PR, not a source/IaC comment (the comment states the WHY).
        /\bGAP-?\d+\b/.test(line) ||
        // Wave/session pointers: "Wave A", "Wave F.B11", "Wave E.subscription-
        // inverted", "Session 3b". Case-SENSITIVE on the leading capital so
        // ocean/microwave prose is not caught. The plan's wave IDs belong in
        // the gitignored plan + commit body, never in a source/IaC comment.
        /\bWave\s+[A-Z](?:[.+-][A-Za-z0-9._-]+)?\b/.test(line) ||
        /\bSession\s+\d+[a-z]?\b/i.test(line) ||
        // Master-plan / gitignored-plan cross-references: "master plan §",
        // "master plan section", "per master plan", "see gitignored plan".
        // Same failure mode as "see plan" above — the plan lives outside
        // git so the reference rots the moment the plan is updated.
        /\bmaster\s+plan\b/i.test(line) ||
        /\bgitignored\s+plan\b/i.test(line)
      );
    },
  },

  // 5. raw-color — UI components consume design tokens, not literals.
  {
    id: "raw-color",
    summary: "UI consumes design tokens: no hex / rgb / hsl / oklch literals outside a --token definition",
    level: "block",
    // Skips comment bodies: prose about a colour is not a colour.
    skipComments: true,
    applies: (filePath) =>
      (isUI(filePath) || isCSS(filePath)) &&
      !isTokenSource(filePath) &&
      // A test file's assertion message is not a rendered surface. This one was
      // reported for the string "throws React #130".
      !isTestFile(filePath),
    test: (line) => {
      if (
        /^\s*(import|export\s+\*\s+from|@import\b|@use\b|@forward\b|<link\b)/.test(
          line,
        )
      )
        return false;
      // A CUSTOM-PROPERTY DEFINITION is the token layer, not a violation of it.
      //
      // `--primary: oklch(0.55 0.2 285)` and `--tw-shadow-color: #f3f4f6` are
      // where literal colour is SUPPOSED to live: a design system has to state
      // its values somewhere, and that somewhere is a `--name:` declaration. The
      // rule's job is the other case — a component reaching past the tokens with
      // `color: #fff` or `style={{ background: "#111" }}`.
      //
      // This replaces a filename guess (`isTokenSource` matched paths containing
      // "theme" or "tokens") that missed the actual token file in two of these
      // repos, because it is called index.css. 158 of 167 flagged lines in one
      // repo were the design system defining itself. Testing the declaration
      // instead of the path works wherever the tokens happen to live.
      if (/^\s*--[\w-]+\s*:/.test(line)) return false;
      // Comments are skipped by the runner (skipComments): prose contains things
      // that look like colours without being any, such as React's "#130"
      // invariant or a WCAG note quoting the "#FFFFE0" that failed contrast.
      return (
        /#[0-9a-f]{3}\b|#[0-9a-f]{6}\b|#[0-9a-f]{8}\b/i.test(line) ||
        /\brgba?\(\s*\d/.test(line) ||
        /\bhsla?\(\s*\d/.test(line) ||
        /\boklch\(/i.test(line) ||
        /\boklab\(/i.test(line)
      );
    },
  },

  // 6. console-log — no console.log in production source.
  {
    id: "console-log",
    summary: "no console.log in production source: use the project's logger",
    level: "block",
    applies: (filePath) =>
      isJSLike(filePath) && !isTestFile(filePath) && !isStoriesFile(filePath),
    test: (line) => /\bconsole\.log\s*\(/.test(stripQuoted(line)),
  },

  // 7. hardcoded-secret — never commit credentials. Test files exempt.
  {
    id: "hardcoded-secret",
    summary: "never put a credential in source: read it from the environment or the secret store",
    level: "block",
    applies: (filePath) => isProdSource(filePath) && !isTestFile(filePath),
    test: (line) => secretRegexes.some((re) => re.test(line)),
  },

  // 8. go-test-naming — Go test funcs use t.Run subtests, not Test_Foo.
  {
    id: "go-test-naming",
    summary: "Go tests group cases with t.Run, not Test_Foo_Bar names",
    level: "block",
    applies: (filePath) => /_test\.go$/i.test(filePath),
    test: (line) => /^func\s+Test[A-Za-z0-9]+_\w+\s*\(/.test(line),
  },

  // 9. merge-conflict — leftover diff markers in any file.
  {
    id: "merge-conflict",
    summary: "remove leftover conflict markers",
    level: "block",
    applies: () => true,
    // A bare `=======` is also a Markdown setext heading underline, so it counts
    // only outside Markdown; a real conflict there still carries the other two.
    test: (line, filePath) =>
      /^(<<<<<<<|>>>>>>>)\s+\S/.test(line) ||
      (/^=======\s*$/.test(line) && !isMarkdown(filePath)),
  },

  // 10. empty-catch — `} catch (e) {}` or `} catch {}` swallows the error.
  //     Sister to no-silent-failures.md rule 2. JS/TS only — Go's
  //     equivalent is the underscore-discard rule above.
  {
    id: "empty-catch",
    summary: "a catch must handle the error: log it, surface it, or rethrow",
    level: "block",
    applies: (filePath) => isJSLike(filePath) && !isTestFile(filePath),
    test: (line) => {
      const ns = stripQuoted(line);
      return (
        /\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(ns) || /\bcatch\s*\{\s*\}/.test(ns)
      );
    },
  },

  // 11. silent-catch — `.catch(() => {})`, `.catch(() => null)`,
  //     `.catch(() => undefined)`, `.catch(() => false)`,
  //     `.catch(() => "")`. All silent fallbacks; either log on the
  //     way through or convert to an explicit Result type.
  {
    id: "silent-catch",
    summary: "a .catch that returns nothing hides the failure: log it or return an explicit result",
    level: "block",
    applies: (filePath) => isJSLike(filePath) && !isTestFile(filePath),
    test: (line) => {
      const ns = stripQuoted(line);
      return (
        /\.catch\s*\(\s*\([^)]*\)\s*=>\s*\{\s*\}\s*\)/.test(ns) ||
        /\.catch\s*\(\s*\([^)]*\)\s*=>\s*(null|undefined|false|"")\s*\)/.test(
          ns,
        )
      );
    },
  },

  // 10. important — !important bypasses the design system. Soft warn.
  {
    id: "important",
    summary: "drop !important and let the design tokens win",
    level: "warn",
    applies: (filePath) => isUI(filePath) || isCSS(filePath),
    test: (line) => /!important\b/.test(line),
  },
];

// Secret-prefix patterns kept as a separate array because each is a
// security-grade match that rejects the line by itself. Snippet text
// is redacted before reporting so we don't echo the credential back
// to the agent.
const secretRegexes = [
  /sk-(proj|live|test|ant)-[A-Za-z0-9_-]{16,}/,
  /\bsk_(live|test)_[A-Za-z0-9]{16,}/,
  /\bgh[psoau]_[A-Za-z0-9]{30,}/,
  /\bxox[bpaors]-[A-Za-z0-9-]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /aws_secret_access_key\s*=\s*['"][\w/+=]{40}['"]/i,
  /\bBearer\s+eyJ[\w-]+\.[\w-]+\.[\w-]+/,
  /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PGP)?\s*PRIVATE KEY-----/,
];

// File-level rules (don't run per line). Each test receives the
// `lines` array so the rule can join across newlines for multi-line
// pattern detection (e.g., `} catch (e) {\n   } finally {`).
// A file may declare its OWN size budget in its first lines, in any comment or
// blockquote syntax: `Size budget: 16 KB`, `// Size budget: 8000 B`.
//
// WHY A FILE DECLARES ITS OWN. A cap that lives in a policy document somewhere else is
// attached to nothing — the person adding the next 200 lines never reads it. Measured
// on this install 2026-09-21: a documented 25 KB cap on skill files was exceeded by 58
// of 119, and nobody knew, because nothing read the policy at the moment of growth.
// Putting the number IN the file puts it in the diff (no-bloat.md rules 5 and 10).
//
// Declaring is opt-in; enforcement follows the declaration. A file that states no
// budget is not flagged by this rule — silence here means "unmeasured", not "fine".
const SIZE_BUDGET = /^[\s>*#/-]*\**\s*Size budget:\s*([\d.]+)\s*(KB|B)\b/i;

function declaredBudgetBytes(lines) {
  // Skip YAML front matter first: a long `paths:` list pushes the declaration past a window
  // counted from line 1, and the file then reads as undeclared.
  let start = 0;
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) start = end + 1;
  }
  for (const line of lines.slice(start, start + 40)) {
    const m = SIZE_BUDGET.exec(line);
    if (m) return Math.round(parseFloat(m[1]) * (m[2].toUpperCase() === "KB" ? 1024 : 1));
  }
  return 0;
}

const fileRules = [
  // size-budget — the file said how big it intends to be; hold it to that.
  //
  // WARN, not block. An edit refused over a byte count is an edit somebody makes with
  // the hook switched off, and a burn-down of an existing overage needs a repo-wide
  // pass, not one refused keystroke. The hard gate is `token-budget.mjs --check`,
  // which exits non-zero and belongs in the pre-push run.
  {
    id: "size-budget",
    summary: "the file is over the size budget it declares: split along a cohesion seam",
    level: "warn",
    applies: () => true,
    test: (lines) => {
      const budget = declaredBudgetBytes(lines);
      if (!budget) return false;
      const bytes = Buffer.byteLength(lines.join("\n"), "utf8");
      return bytes > budget
        ? `${bytes} B > its own declared ${budget} B budget ` +
          `(split along a cohesion seam, or move detail behind a reference)`
        : false;
    },
  },

  // file-too-large — soft warning past 800 LOC, for source that declares no budget of
  // its own. A declared budget is the more specific statement, so it wins.
  {
    id: "file-too-large",
    summary: "past 800 lines with no declared budget: split, or declare a budget",
    level: "warn",
    applies: (filePath) => isProdSource(filePath),
    test: (lines) =>
      lines.length > 800 && !declaredBudgetBytes(lines)
        ? `${lines.length} LOC > 800-line soft cap`
        : false,
  },

  // empty-catch-multiline — `} catch (e) { ... } finally {` where the
  // body between catch's `{` and `}` is whitespace + comments only.
  // Single-line form is caught by the per-line empty-catch rule (#10).
  // This file-level scan covers the multi-line case the per-line check
  // misses. Reports the line where the catch keyword appears.
  {
    id: "empty-catch-multiline",
    summary: "a catch block with only comments hides the failure: log it, surface it, or rethrow",
    level: "block",
    applies: (filePath) => isJSLike(filePath) && !isTestFile(filePath),
    test: (lines) => {
      const joined = lines.join("\n");
      const re = /\bcatch\s*(?:\([^)]*\))?\s*\{([^{}]*)\}/g;
      const at = [];
      let m;
      while ((m = re.exec(joined)) !== null) {
        // A one-line `catch {}` is the per-line rule's to report; naming it twice
        // makes one defect read as two.
        if (!m[0].includes("\n") && m[1].trim() === "") continue;
        const body = m[1]
          .replaceAll(/\/\/[^\n]*/g, "")
          .replaceAll(/\/\*[\s\S]*?\*\//g, "")
          .trim();
        if (body !== "") continue;
        at.push(joined.slice(0, m.index).split("\n").length);
      }
      return at.length ? `line ${at.join(", ")}: catch block has no statements` : false;
    },
  },

  // SUPERSEDE PROOF (2026-09-21) — replaced the per-line `python-silent-except` rule.
  //   inputs:  a .py file outside tests, as before.
  //   covered: bare `except:`, `except Exception[ as e]:`, and `except BaseException:`
  //            whose body is only `pass` or `...`, written on one line OR across two.
  //            The old rule saw one line only, so it missed every two-line swallow.
  //   dropped, deliberately: blocking a NAMED exception that passes. The old rule's regex
  //            caught any class on one line while its own comment targeted bare and broad
  //            excepts only, so `except ValueError: pass` was blocked on one line and
  //            allowed across two. Ruff S110 and Bandit B110 draw the line here by default
  //            (check-typed-exception = false). Owner decision, same date.
  //   output:  one finding per swallow; the old rule reported the same line a second time.
  //   tests:   __tests__/no-discards-rules.test.mjs, both layouts of every shape.
  // silent-except — Python `except:` (bare) or broad `except Exception:` /
  // `except BaseException:` whose body is ONLY `pass` / `...`: a swallow with
  // no log AND no metric — the canonical silent failure (no-silent-failures
  // rule 8). NARROW intentional ignores (`except ValueError: pass`) are NOT
  // flagged; the fix for a real ignore is `contextlib.suppress(X)`, and for a
  // best-effort swallow it is log(WARNING)+ a `*_failures_total` metric + alert.
  {
    id: "silent-except",
    summary: "a bare or broad except that only passes is a silent failure: log it and add a failure metric",
    level: "block",
    applies: (filePath) => /\.py$/.test(filePath) && !isTestFile(filePath),
    test: (lines) => {
      const joined = lines.join("\n");
      const re =
        /\bexcept\s*(?::|(?:Exception|BaseException)(?:\s+as\s+\w+)?\s*:)[ \t]*(?:#[^\n]*)?(?:\n[ \t]+|[ \t]*)(?:pass|\.\.\.)(?=\s|$)/g;
      const at = [];
      let m;
      while ((m = re.exec(joined)) !== null) at.push(joined.slice(0, m.index).split("\n").length);
      return at.length
        ? `line ${at.join(", ")}: bare/broad except swallows with no log or metric (silent failure)`
        : false;
    },
  },
];

function buildSnippet(rule, line) {
  if (rule.id === "hardcoded-secret") {
    return "[redacted — credential prefix matched]";
  }
  return line.trim().slice(0, 120);
}

function pushByLevel(rule, entry, blocking, soft) {
  (rule.level === "block" ? blocking : soft).push(entry);
}

function scanLineRules(filePath, lines, blocking, soft) {
  // Multi-line comment state, for the rules that opt out of comment bodies via
  // `skipComments`. Only the FIRST line of a `/* ... */` or `{/* ... */}` block
  // carries a marker, so a per-line comment test cannot see that line 18 of a
  // twelve-line explanation is still prose. That is how a note about React's
  // "#130" invariant came to be reported as an untokenised colour.
  //
  // Opt-in rather than global, because `task-pointer` and `placeholder-marker`
  // exist precisely to read comments.
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const opensBlock =
      /\{?\/\*/.test(line) && !/\*\/\}?/.test(line.split(/\{?\/\*/)[1] || "");
    const commentBody = inBlockComment;
    if (inBlockComment && /\*\/\}?/.test(line)) inBlockComment = false;
    else if (opensBlock) inBlockComment = true;
    for (const rule of rules) {
      if (!rule.applies(filePath)) continue;
      if (rule.skipComments && (commentBody || opensBlock || isCommentLine(line, filePath)))
        continue;
      if (!rule.test(line, filePath)) continue;
      pushByLevel(
        rule,
        { line: lineNum, rule: rule.id, snippet: buildSnippet(rule, line) },
        blocking,
        soft,
      );
    }
  }
}

function scanFileRules(filePath, lines, blocking, soft) {
  for (const rule of fileRules) {
    if (!rule.applies(filePath)) continue;
    const result = rule.test(lines);
    if (!result) continue;
    pushByLevel(
      rule,
      {
        line: lines.length,
        rule: rule.id,
        snippet: typeof result === "string" ? result : "",
      },
      blocking,
      soft,
    );
  }
}

// evaluateFile runs every rule against the supplied content, returning
// blocking and soft issue lists with file-relative line numbers and
// truncated snippets ready for stderr.
function evaluateFile(filePath, content) {
  const lines = content.split("\n");
  const blocking = [];
  const soft = [];
  scanLineRules(filePath, lines, blocking, soft);
  scanFileRules(filePath, lines, blocking, soft);
  return { blocking, soft };
}

// One line per rule that fired, in manifest order, so a block names every rule it cites.
function summariesFor(issues) {
  const fired = new Set(issues.map((i) => i.rule));
  return [...rules, ...fileRules].filter((r) => fired.has(r.id)).map((r) => `${r.id.padEnd(22)} : ${r.summary}`);
}

module.exports = { evaluateFile, stripQuoted, summariesFor };
