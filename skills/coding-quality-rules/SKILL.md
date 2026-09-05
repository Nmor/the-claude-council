---
name: coding-quality-rules
description: Universal coding-quality discipline that fires on every code file — coding-style, patterns, reuse-first (rule of three), proper-fixes-first (no symptom-only patches), no-silent-drops (no orphan TODOs / suppression directives), no-silent-failures (every failure surfaces), no-discards (every value bound), no-ambient-globals (DI everywhere), no-local-fs, error-codes (stable codes), error-handling-with-context (operation + ids), log-levels (canonical FATAL/ERROR/WARN/INFO/DEBUG/TRACE), semver (Conventional Commits + Keep a Changelog), extreme-lint-policy (cognitive complexity ≤ 10, lines ≤ 80, params ≤ 5, zero per-line suppressions), updated-frameworks, performance, testing (90% touched / 80% project), local-testability (env-setup before write), local-dev-setup. Auto-fires on any code file across all supported languages.
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.py"
  - "**/*.pyi"
  - "**/*.go"
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.rs"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.kts"
  - "**/*.swift"
  - "**/*.dart"
  - "**/*.cs"
  - "**/*.c"
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.cxx"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.lua"
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.sql"
  - "**/*.vue"
  - "**/*.svelte"
---

# Coding Quality Rules — Universal Discipline

> Migrated 2026-06-02 from 19 files in `~/.claude/rules/common/` as part of the lazy-rules-loading plan. Phase H will delete the originals to close the eager-load loop. Each section below preserves the full content of one source rule; section headings name the rule file of origin.

This skill bundles 19 cross-cutting rules that apply to every code file. Loading is gated by `paths:` — when ANY code file is touched, this skill activates and the disciplines below apply.

## Section index

1. coding-style — naming, comments, file organisation, immutability, error handling
2. patterns — broader architectural patterns; repository / response envelope
3. reuse-first — sweep before write; rule of three
4. proper-fixes-first — root cause, never symptom; banned shortcut patterns
5. no-silent-drops — no orphan TODOs; no suppression directives; no meta-comments
6. no-silent-failures — every failure produces signal at user + server
7. no-discards — every value bound; every error wrapped with context
8. no-ambient-globals — DI everywhere; no module-level mutable state
9. no-local-fs — no local-FS state on ephemeral platforms
10. error-codes — stable snake_case codes; mapped to HTTP + UX + i18n + runbook
11. error-handling-with-context — operation + ids + wrapped cause chain
12. log-levels — FATAL/ERROR/WARN/INFO/DEBUG/TRACE canonical semantics
13. semver — Semantic Versioning 2.0.0 + Conventional Commits 1.0.0 + Keep a Changelog 1.1.0
14. extreme-lint-policy — strictest thresholds; zero per-line suppressions
15. updated-frameworks — latest stable; no abandoned / EOL dependencies
16. performance — model selection; opus for coding/reviewing/planning; context discipline
17. testing — 90% touched / 80% project; TDD red-green-refactor; multiple test types
18. local-testability — code must be locally testable BEFORE writing
19. local-dev-setup — one bootstrap command; 30-min first-run target; vault-based secrets

---

<!-- ============================================================
     Section: coding-style.md (from rules/common/)
     ============================================================ -->

## How this skill is organised (read this first)

This discipline is ~20 distinct rules. Carrying all of them inline made this file
219 KB — about 56,000 tokens loaded on **every** touch of **every** code file,
which is more than the entire always-on rule Floor costs. Context is a quality
resource, not just a cost one: a window spent on the eighteen rules a change does
not touch is attention taken from the two it does.

So the actionable gates stay here, and each rule's full text lives in
`references/`. **Read the reference file for any rule the current change actually
touches** — the routing table below says which. When in doubt on a rule you are
about to lean on, open it; that is one Read, not 56,000 tokens.

| Reference | Rule | What it governs |
| --- | --- | --- |
| [`coding-style.md`](references/coding-style.md) | Coding Style | ALWAYS create new objects, NEVER mutate existing ones: |
| [`common-patterns.md`](references/common-patterns.md) | Common Patterns | When implementing new functionality: |
| [`reuse-first-rule.md`](references/reuse-first-rule.md) | Reuse-First Rule (Always-On, Global) | Never rewrite anything that already exists. If a component, |
| [`proper-fixes-first-rule.md`](references/proper-fixes-first-rule.md) | Proper-Fixes-First Rule (Strict, Always-On, Global) | Every fix must address the root cause. Never apply a shortcut that |
| [`no-silent-drops-rule.md`](references/no-silent-drops-rule.md) | No-Silent-Drops Rule (Always-On, Global) | Never remove. Always fully implement across every layer. |
| [`no-silent-failures-rule.md`](references/no-silent-failures-rule.md) | No-Silent-Failures Rule (Always-On, Global) | Every error is a status. Every status the user is waiting on |
| [`no-discards-rule.md`](references/no-discards-rule.md) | No-Discards Rule (Strict, Always-On, Global) | Every value must be bound, every error must be wrapped with context, and every failure must prod |
| [`no-ambient-globals-rule.md`](references/no-ambient-globals-rule.md) | No Ambient Globals Rule (Always-On, Global) | Code does not depend on ambient global state — process-wide |
| [`no-local-filesystem-rule.md`](references/no-local-filesystem-rule.md) | No-Local-Filesystem Rule (Global Default) | Production code MUST NOT write to, or rely on, the local filesystem |
| [`error-codes-rule.md`](references/error-codes-rule.md) | Error Codes Rule (Always-On, Global) | Every error path emits a stable error_code string that is |
| [`error-handling-with-context.md`](references/error-handling-with-context.md) | Error Handling With Context (Always-On, Global) | Every error path carries enough context for the on-call engineer |
| [`log-levels-rule.md`](references/log-levels-rule.md) | Log Levels Rule (Always-On, Global) | Every log entry has a level that signals SEVERITY + |
| [`semantic-versioning-rule.md`](references/semantic-versioning-rule.md) | Semantic Versioning Rule (Always-On, Global) | Every package, library, service, API, and tool that ships |
| [`extreme-lint-policy.md`](references/extreme-lint-policy.md) | Extreme Lint Policy (Always-On, Global) | Lint rules run at maximum strictness across every language. Every |
| [`always-updated-frameworks-rule.md`](references/always-updated-frameworks-rule.md) | Always-Updated Frameworks Rule (Global Default) | Use the latest stable, security-supported, actively-maintained |
| [`performance-model-selection.md`](references/performance-model-selection.md) | Performance + Model Selection (Always-On, Global) | Model selection is owned by model-tier-selection.md — the capability-aware |
| [`testing-requirements.md`](references/testing-requirements.md) | Testing Requirements (Always-On, Global) | Per extreme-lint-policy.md — the strictest values win across |
| [`local-testability-rule.md`](references/local-testability-rule.md) | Local-Testability Rule (Always-On, Global) | Every code change MUST be locally testable BEFORE the agent |
| [`local-dev-setup-rule.md`](references/local-dev-setup-rule.md) | Local Dev Setup Rule (Always-On, Global) | A fresh-checkout developer must be running the system locally |

The two MANDATORY workflows below are inline deliberately: they fire on every
code change, so they are never a lookup.

## Touched-file audit workflow (MANDATORY — read this before editing any file)

The most common way agents reintroduce a previously-fixed issue is by
focusing narrowly on the requested change and skipping the broader sweep
the file already deserves. This workflow makes the sweep explicit so
the failure mode can't slip past.

### When this applies

Every time you `Read` or `Edit` a file, before you mark the task
involving that file as complete, run **all five** steps below for
that file. There is no exception for "small" edits — the same hooks
that catch new violations don't catch pre-existing ones, so the audit
is the only safety net.

### The five steps

1. **Inventory duplicated literals (S1192).** For Go / TS / Python:

   ```bash
   grep -oE '"[^"]{8,}"' <file> | sort | uniq -c | sort -rn | awk '$1 >= 3'
   ```

   Every line in the output is a violation. If you decide to extract,
   do **declare + replace in the SAME edit** — never declare a
   const and stop, that produces the unused-const warning state the
   hook flags. If a duplicate is genuinely inside a doc comment
   (e.g., swagger `// @Param ...`), note it as a known Sonar
   false-positive in the response but do not extract.

2. **Inventory discards.** Run the relevant grep set for the file's
   language from the "Pre-delivery self-audit checklist" section
   below. Fix every hit. Common offenders in Go:

   ```bash
   grep -nE '\bfor [_, ]+_[, ]* := range\b' <file>
   grep -nE '_, err :=|, _ :=|^\s*_ =' <file>
   grep -nE 'defer [a-zA-Z_.]+\.Close\(\)$' <file>
   ```

3. **Inventory silent failures.** Look for any of the SonarLint
   shape patterns from `no-silent-failures.md`: empty catch blocks,
   fire-and-forget `.catch(() => null)`, `c.Data()` /
   `response.end()` inside a per-row loop (this terminates the
   response stream — every later iteration silently fails). One
   `c.Data` inside a loop has happened twice in this codebase
   already; treat it as a known-bad pattern.

4. **Run the project's lint + static-analysis chain on the file.**
   Go: `go build`, `go vet`, `staticcheck`, `golangci-lint run`
   (all must be zero). TS: `tsc --noEmit`, `eslint --max-warnings 0`.
   If any tool reports anything, fix it before marking done.

5. **Re-check IDE diagnostics for the file** (the PostToolUse hook
   reports them — read every entry). The IDE is the source of truth
   for SonarLint warnings the linters above don't catch (e.g.,
   `go:S1192`, `go:S3776`, `go:S107`). Address each one or, if the
   warning is a genuine false-positive (swagger comment etc.),
   document why in the response and do NOT introduce a per-line
   suppression.

6. **Commented-out code audit (no-silent-drops.md Rule 0).** Grep the
   file for commented-out source:

   ```bash
   grep -nE '^\s*//\s*(if|for|switch|return|err|var|const|func|import|package|[a-zA-Z_]+[ \t]*[:=]|c\.|i\.|a\.|h\.|k\.)' <file>
   ```

   Every match is one of three things:
   - **A genuine TODO marker** — leave it OR open a real ticket and
     remove it. Either way, surface it to the user.
   - **A verbatim duplicate of live code adjacent to it** (typo'd
     older copy that wasn't cleaned up) — name it explicitly in the
     response and ASK before deleting. Never silently delete.
   - **An unwired feature** (the path was started, stubbed, or
     disabled) — mark with `BUG(unwired-<short-name>)` and a
     reader-facing question: "is this still wanted? if yes, here's
     the implementation gap." Restore the block verbatim; do not
     delete to make the linter pass.

   The gocritic `commentedOutCode` warning is NOT permission to
   delete. It's permission to ASK. Deleting a commented block to
   silence the linter is a no-silent-drops violation regardless of
   what the linter says.

### Declare-and-stop is forbidden

If you decide to extract a constant or a helper:

- The same edit MUST replace every usage.
- Or revert the declaration before reporting done.

The half-finished "I declared the const, replacement is next turn"
state is itself a no-discards violation: it leaves the file with
unused-symbol warnings that block any reasonable "is this done?"
check.

### Same-pattern reintroduction is forbidden

If the codebase has ever extracted a constant for `"Content-Type"`,
`"text/csv"`, etc., and you write new code that hardcodes the same
literal, that is the violation the user has named multiple times.
Before adding a new string literal to a file, grep the file for
existing `const`s and use them. If the const doesn't exist yet but
the literal will repeat, add the const in the SAME edit and use it.

### Why this workflow exists

This section was added after a session where the agent fixed an S107
finding by extracting a constant, then immediately wrote new code
nearby that introduced four MORE duplicate-literal violations of the
same shape — visible to the IDE Sonar plugin but invisible to the
PostToolUse hook because the hook only checks the diff, not the file
as a whole. The user's correct critique:

> you fix an issue and when you write some more code you introduce
> the same issue even though these entire avoidance flow should be
> in the project and global rules. Is there a reason why you can't
> follow them or update them when you find a need issue

The rules were there. The agent wasn't running them. This section
exists so t

## Pre-delivery self-audit checklist (MANDATORY)

**Before reporting any code change as complete, run this checklist against every file you touched.** This rule exists because the user has repeatedly observed agents reintroducing lint violations that the codebase already fixed. *Never* deliver code that contains a pattern from this list.

| # | Pattern to scan for | How to find it | What to do |
| - | ------------------- | -------------- | ---------- |
| 1 | `_` as a value position (Go, JS destructure, type assertion) | `grep -nE "\b_\b" file \| grep -E "_\s*[:=,)]"` | Bind to a named identifier and use it |
| 2 | `_, err :=`, `_, ok :=`, `if _, x :=` | `grep -nE "_,\s*\w+\s*:?=" file` | Bind first return |
| 3 | `_ = expr` | `grep -nE "^\s*_\s*=" file` | Bind and use |
| 4 | Empty catch `catch {` or `catch (_)` | `grep -nE "catch\s*(\(\s*\)\|\(\s*_\s*\)\|\{)" file` | Bind err, log via shared logger |
| 5 | `.catch(() => null/undefined/false/{}/"")` | `grep -nE "\.catch\(\(\)\s*=>\s*(null\|undefined\|false\|\{\s*\}\|\"\")" file` | Log + propagate |
| 6 | `void promise()` fire-and-forget | `grep -nE "void\s+\w+\(\)" file` | `.catch((err) => log.warn(...))` |
| 7 | `// eslint-disable*`, `// @ts-ignore`, `// @ts-expect-error`, `//nolint`, `# noqa`, `# type: ignore`, `# pragma: no cover`, `# rubocop:disable`, `@SuppressWarnings` | `grep -nE "(eslint-disable\|@ts-ignore\|@ts-expect-error\|//nolint\|noqa\|type: ignore\|pragma: no cover\|rubocop:disable\|SuppressWarnings)"` | Fix underlying issue; never suppress |
| 8 | Sonar IDs in comments (`S1192`, `S3776`, `S3358`, etc.) | `grep -nE "S[0-9]{3,4}" file \| grep "//"` | Describe invariant; never reference rule IDs |
| 9 | Phase markers (`Phase A`, `Phase 1`, `Initiative I10`, plan IDs) | `grep -niE "phase\s+[a-z0-9]\|plan\s+\w[0-9]"` | Move to PR description; remove from code |
| 10 | TODO / FIXME / XXX placeholders | `grep -nE "TODO\|FIXME\|XXX"` | Implement now or open a real ticket |
| 11 | Commented-out code blocks | Visual review | Delete; git remembers |
| 12 | `console.log/warn/error/info/debug` in product source | `grep -nE "console\.(log\|warn\|error\|info\|debug)"` | Route through `lib/log.ts` |
| 13 | Repeated string literal ≥ 3× (S1192) | `grep -oE "\"[^\"]{8,}\"" file \| sort \| uniq -c \| awk '$1 >= 3'` | Extract to module-level `const` |
| 14 | Cognitive complexity > 15 (S3776) | Visual: function > ~50 lines with nested if/for/switch | Extract helpers, dispatch via lookup, inline early-return guards |
| 15 | Nested ternary `a ? b : c ? d : e` (S3358) | `grep -nE "\?\s*[^:]+:\s*[^?]+\?"` | Extract a tone/state helper |
| 16 | Array index as React key (S6479) | `grep -nE "key=\`[^\`]*\$\{i\}" file` | Use a stable id from data |
| 17 | Component props not `Readonly<>` (S6759) | Visual: `({ ... }: { ... })` without `Readonly` | Wrap props type |
| 18 | Context provider `value` without `useMemo` (S6481) | `grep -nB2 "Context.Provider value="` | Wrap value in `useMemo` |
| 19 | Bare `parseInt`/`parseFloat` (S7773) | `grep -nE "\bparseInt\(\|\bparseFloat\("` | `Number.parseInt(s, 10)` / `Number.parseFloat(s)` |
| 20 | `.replace(/literal/g, ...)` (S7781) | `grep -nE "\.replace\(/[^/{]+/g,"` | `.replaceAll("literal", ...)` for literals |
| 21 | `.match(/regex/g)` (S6594) | `grep -nE "\.match\(/[^/]+/g\)"` | `[...s.matchAll(...)]` or `regex.exec(s)` |
| 22 | `Object.prototype.hasOwnProperty.call` (S6606) | `grep -nE "hasOwnProperty\.call"` | `Object.hasOwn(obj, k)` |
| 23 | `typeof x === "undefined"` (S7741) | `grep -nE "typeof\s+\w+\s*==[=]?\s*[\"']undefined" file` | `x === undefined` |
| 24 | Bare `window.` / `document.` in SSR-safe code (S7764) | `grep -nE "(^\|\W)window\." file`, same for document | `globalThis.window.` / `globalThis.document.` |
| 25 | `[...arr].sort()` (S4043) | `grep -nE "\[\.\.\.[^\]]+\]\.sort"` | `arr.toSorted(...)` or `arr.slice().sort(...)` |
| 26 | `as` cast widening typed value (S6571) | Visual after type predicates / narrowing | Use type predicate, narrow naturally |
| 27 | Unnecessary `as` after narrowing (S4325) | IDE diagnostics | Remove the assertion |
| 28 | Unused parameter (S1172) or unused local (S1481) | `go vet` / `tsc --noEmit` / IDE | Remove or use; never `_`-prefix |
| 29 | Magic numbers (S109) | Visual: large numeric literals inline | Extract to named `const` |
| 30 | `Map` / built-in name shadow (S2137) | `grep -nE "const\s+Map\b\|function\s+Map\b"` | Rename to `MapView`, `mapInstance`, etc. |
| 31 | Useless `return undefined` (S2138) | `grep -nE "return\s+undefined\s*;"` | Drop |
| 32 | Hardcoded credential (S2068) | Hook-enforced. Common prefixes: `sk-proj-`, `sk_live_`, `ghp_`, `xoxb-`, `AKIA`, `Bearer eyJ`, `BEGIN PRIVATE KEY` | Env var / secrets manager |
| 33 | Weak hash (S5547) — `md5`, `sha1`, `des` | `grep -nE "createHash\(\"(md5\|sha1)\"\|createCipheriv\(\"(des\|3des)\""` | SHA-256+, argon2/bcrypt for passwords |
| 34 | Login endpoint without rate limit (S5876) | Visual review of `/auth/*` handlers | Wire per-IP rate check |
| 35 | Hardcoded IP in production (S1313) | `grep -nE "([0-9]{1,3}\.){3}[0-9]{1,3}" file` | Config; SSRF validators allowlist |
| 36 | Missing body-size limit on handler (S5693) | Visual | Cap via middleware |
| 37 | XML parsing without XXE protection (S2755) | `grep -nE "xml\."` | Disable external entities |
| 38 | Empty function body (S108) | `grep -nE "\{\s*\}"` | Implement or document why |
| 39 | `catch (e) { throw e }` useless rethrow (S2737) | Visual | Drop the try/catch or add real handling |
| 40 | Caught exception used only for `instanceof`, never logged (S1166) | Visual | Always log on the way through |
| 41 | `throw` / `reject` / `raise` in a user-facing path WITHOUT a paired user-visible surface (toast / inline validation / banner / state transition / modal) — `no-silent-failures.md` rule 7 | Visual + grep for `throw` / `reject(` / `raise` in views / handlers / form-submit / API client; confirm each is caught + surfaced | Pair every throw in a user-facing path with toast.error / inline error / banner / status transition. NEVER rely on a generic ErrorBoundary as the first UX surface. Server-side throws route through a centralised exception handler that emits a typed `{error_code, message, details}` envelope per `error-handling-with-context.md` rule 4 |

### How to run the audit

For every file you touched in this turn, run **every** grep in the table above. If even one returns a match (other than the documented rune-iteration exception), the change is **not done** — fix the violation and re-run.

For Go: also run `go vet ./...`, `staticcheck ./...`, and `golangci-lint run ./...` and require all three to pass with zero output.

For TS/JS: also run `npx tsc --noEmit` and `npx eslint <file> --max-warnings 0`.

For test files: also run the test (`go test ./<pkg>/... -count=1 -race` or `npx jest --testPathPattern=...`) and require pass.

### The "we have fixed this before" rule

If a SonarLint or build warning has been fixed anywhere in this repo before, your new code MUST NOT reintroduce the same pattern. Before delivering any new function, sweep it for the patterns above — this is not optional. The user explicitly tracks rec
