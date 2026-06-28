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
 * a dumb iterator. The unit-test target for this manifest lives in
 * lib/no-discards-rules.test.js (when tests are added).
 *
 * Implementation notes:
 *   - Regex literals with the placeholder-marker keywords are
 *     wrapped in String.raw so the source file does not contain
 *     bare backslash-escapes that confuse Sonar.
 *   - Plain-English descriptions of every rule live in the README
 *     at ../../docs/no-discards.md so this file stays config-only
 *     and doesn't trip its own placeholder-marker rule by including
 *     the literal keywords in prose comments.
 */

"use strict";

// stripQuoted blanks out the contents of single- and double-quoted
// strings on a single source line, preserving line length so column
// offsets remain accurate. Used so regex matches don't fire inside
// legitimate string content (test fixtures, prompt templates, etc.).
function stripQuoted(line) {
  let out = "";
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  for (const ch of line) {
    if (escape) {
      out += " ";
      escape = false;
      continue;
    }
    if ((inSingle || inDouble) && ch === "\\") {
      out += " ";
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }
    out += inSingle || inDouble ? " " : ch;
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
const isTokenSource = (filePath) =>
  /tweakcn|tokens?|theme|design-system/i.test(filePath);

// The placeholder-marker keywords are kept in a single regex source
// string so we don't repeat them as bare identifiers in this file.
// The runner treats this string as a regex source via new RegExp(...).
const PLACEHOLDER_MARKERS =
  String.raw`T` + String.raw`ODO|F` + String.raw`IXME|X` + String.raw`XX`;
const placeholderRe = new RegExp(
  String.raw`(?://|#|<!--)\s*(${PLACEHOLDER_MARKERS})\b|/\*[\s\S]*?(${PLACEHOLDER_MARKERS})`,
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
    level: "block",
    // Covers Go, JS/TS, AND Python — including test files. A discarded return
    // value is a discard regardless of language or whether the file is a test
    // (the policy is "NO discards ever"). Python's `_, x = f()` / `x, _ = f()`
    // / `_ = f()` forms are caught by the same regexes below.
    applies: (filePath) =>
      isGo(filePath) || isJSLike(filePath) || isPython(filePath),
    test: (line) => {
      const ns = stripQuoted(line);
      // Skip range / for-loop binding forms — these are not discards
      // of a function-call result, they are loop-iteration variable
      // declarations where the unused half is intentionally omitted.
      // Covers Go (`for _, v := range`) and Python (`for _, v in ...`).
      if (/\bfor\s+_\s*,/.test(ns)) return false;
      if (/\bfor\s+\w+\s*,\s*_\s*(:=|=)\s*range\b/.test(ns)) return false;
      if (/\bfor\s+_\s*(:=|=)\s*range\b/.test(ns)) return false;
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
      if (/^\s*(async\s+)?def\s+\w+\s*\(/.test(ns) || /\blambda\b[^:]*:/.test(ns))
        return false;
      // Skip blank-named function/method PARAMETERS (Go uses `_`
      // to mark an unused parameter — `func f(_, x string)` —
      // which is the idiomatic way to satisfy an interface
      // contract without naming the value).
      if (/^\s*func\s+/.test(ns) || /^\s*\([^)]*\)\s+\w+\s*\(/.test(ns))
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
    level: "block",
    applies: (filePath) =>
      isGo(filePath) || isJSLike(filePath) || isPython(filePath),
    test: (line) => {
      const ns = stripQuoted(line).trim();
      // Must be a standalone call statement: an identifier/attribute chain
      // immediately followed by `(`, to a balanced-ish `)` end (optional
      // trailing `;`). Leading `=`, `return`, `await`, `yield`, control
      // keywords, decorators, and comments all fail this anchor.
      const m = /^([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\s*\(.*\)\s*;?$/.exec(ns);
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
    level: "block",
    applies: (filePath) =>
      isProdSource(filePath) || isMarkdown(filePath) || isCSS(filePath),
    test: (line) => placeholderRe.test(line),
  },

  // 3. suppression — never disable a linter; fix the underlying code.
  {
    id: "suppression",
    level: "block",
    applies: isProdSource,
    test: (line) => suppressionRes.some((re) => re.test(line)),
  },

  // 4. task-pointer — comments document WHY, not "plan B2" / "Sonar S1192".
  {
    id: "task-pointer",
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
        /\bthe\s+plan\b/i.test(line) ||
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
        /\bGAP-?\d+\b/.test(line)
      );
    },
  },

  // 5. raw-color — UI components consume design tokens, not literals.
  {
    id: "raw-color",
    level: "block",
    applies: (filePath) =>
      (isUI(filePath) || isCSS(filePath)) && !isTokenSource(filePath),
    test: (line) => {
      if (
        /^\s*(import|export\s+\*\s+from|@import\b|@use\b|@forward\b|<link\b)/.test(
          line,
        )
      )
        return false;
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
    level: "block",
    applies: (filePath) =>
      isJSLike(filePath) && !isTestFile(filePath) && !isStoriesFile(filePath),
    test: (line) => /\bconsole\.log\s*\(/.test(stripQuoted(line)),
  },

  // 7. hardcoded-secret — never commit credentials. Test files exempt.
  {
    id: "hardcoded-secret",
    level: "block",
    applies: (filePath) => isProdSource(filePath) && !isTestFile(filePath),
    test: (line) => secretRegexes.some((re) => re.test(line)),
  },

  // 8. go-test-naming — Go test funcs use t.Run subtests, not Test_Foo.
  {
    id: "go-test-naming",
    level: "block",
    applies: (filePath) => /_test\.go$/i.test(filePath),
    test: (line) => /^func\s+Test[A-Za-z0-9]+_\w+\s*\(/.test(line),
  },

  // 9. merge-conflict — leftover diff markers in any file.
  {
    id: "merge-conflict",
    level: "block",
    applies: () => true,
    test: (line) =>
      /^(<<<<<<<|>>>>>>>)\s+\S/.test(line) || /^=======\s*$/.test(line),
  },

  // 10. empty-catch — `} catch (e) {}` or `} catch {}` swallows the error.
  //     Sister to no-silent-failures.md rule 2. JS/TS only — Go's
  //     equivalent is the underscore-discard rule above.
  {
    id: "empty-catch",
    level: "block",
    applies: (filePath) => isJSLike(filePath) && !isTestFile(filePath),
    test: (line) => {
      const ns = stripQuoted(line);
      return (
        /\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(ns) || /\bcatch\s*\{\s*\}/.test(ns)
      );
    },
  },

  // 11a. python-silent-except — `except: pass` and
  //      `except Exception: pass` swallow every error. The
  //      no-silent-failures rule (Python section) requires logging
  //      and rethrowing instead. Single-line forms only — block-level
  //      `except: \n  pass` is caught by ruff S110 in CI.
  {
    id: "python-silent-except",
    level: "block",
    applies: (filePath) => isPython(filePath) && !isTestFile(filePath),
    test: (line) => {
      const ns = stripQuoted(line);
      return (
        /^\s*except\s*:\s*pass\s*$/.test(ns) ||
        /^\s*except\s+\w[\w.]*\s*:\s*pass\s*$/.test(ns) ||
        /^\s*except\s+\w[\w.]*\s+as\s+\w+\s*:\s*pass\s*$/.test(ns)
      );
    },
  },

  // 11. silent-catch — `.catch(() => {})`, `.catch(() => null)`,
  //     `.catch(() => undefined)`, `.catch(() => false)`,
  //     `.catch(() => "")`. All silent fallbacks; either log on the
  //     way through or convert to an explicit Result type.
  {
    id: "silent-catch",
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
const fileRules = [
  // file-too-large — soft warning past 800 LOC.
  {
    id: "file-too-large",
    level: "warn",
    applies: (filePath) => isProdSource(filePath),
    test: (lines) =>
      lines.length > 800 ? `${lines.length} LOC > 800-line soft cap` : false,
  },

  // empty-catch-multiline — `} catch (e) { ... } finally {` where the
  // body between catch's `{` and `}` is whitespace + comments only.
  // Single-line form is caught by the per-line empty-catch rule (#10).
  // This file-level scan covers the multi-line case the per-line check
  // misses. Reports the line where the catch keyword appears.
  {
    id: "empty-catch-multiline",
    level: "block",
    applies: (filePath) => isJSLike(filePath) && !isTestFile(filePath),
    test: (lines) => {
      const joined = lines.join("\n");
      const re = /\bcatch\s*(?:\([^)]*\))?\s*\{([^{}]*)\}/g;
      let m;
      while ((m = re.exec(joined)) !== null) {
        const body = m[1]
          .replaceAll(/\/\/[^\n]*/g, "")
          .replaceAll(/\/\*[\s\S]*?\*\//g, "")
          .trim();
        if (body !== "") continue;
        const lineNum = joined.slice(0, m.index).split("\n").length;
        return `line ${lineNum}: catch block has no statements`;
      }
      return false;
    },
  },

  // silent-except — Python `except:` (bare) or broad `except Exception:` /
  // `except BaseException:` whose body is ONLY `pass` / `...`: a swallow with
  // no log AND no metric — the canonical silent failure (no-silent-failures
  // rule 8). NARROW intentional ignores (`except ValueError: pass`) are NOT
  // flagged; the fix for a real ignore is `contextlib.suppress(X)`, and for a
  // best-effort swallow it is log(WARNING)+ a `*_failures_total` metric + alert.
  {
    id: "silent-except",
    level: "block",
    applies: (filePath) => /\.py$/.test(filePath) && !isTestFile(filePath),
    test: (lines) => {
      const joined = lines.join("\n");
      const re =
        /\bexcept\s*(?::|(?:Exception|BaseException)(?:\s+as\s+\w+)?\s*:)[ \t]*(?:#[^\n]*)?(?:\n[ \t]+|[ \t]*)(?:pass|\.\.\.)(?=\s|$)/g;
      let m;
      while ((m = re.exec(joined)) !== null) {
        const lineNum = joined.slice(0, m.index).split("\n").length;
        return `line ${lineNum}: bare/broad except swallows with no log or metric (silent failure)`;
      }
      return false;
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
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    for (const rule of rules) {
      if (!rule.applies(filePath)) continue;
      if (!rule.test(line)) continue;
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

module.exports = { evaluateFile, stripQuoted };
