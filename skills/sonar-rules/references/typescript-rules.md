# TypeScript / JavaScript rule reference

> Covers the mandatory per-touched-file checks: the comprehensive TS/JS Sonar rule tables
> (string/regex, style/idiom, type/control-flow, error handling, security, suppression/meta,
> numerical) and the cross-language quick table. Pointed at by the SKILL.md row "Mandatory checks on
> every touched file".
>
> **Size budget: 12 KB** — `token-budget.mjs --check`.

## Mandatory checks on every touched file

Run these patterns on the file you just edited AND any file the edit references:

### TypeScript / JavaScript — comprehensive rule reference

The IDE Sonar surfaces ~270 rules; `sonarjs/recommended` is a curated
subset. The table below is the union of (a) every rule that's commonly
triggered in real codebases, (b) every rule the user has flagged as
recurring, and (c) every rule the global no-silent-* / no-discards
hooks already enforce. Any model touching a TS/JS file should sweep
against ALL of these, not just the recommended set.

#### String / regex idioms

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S7781** | `.replace(...)` with a value that could call all occurrences | Always prefer `.replaceAll(literal, ...)` or `.replaceAll(/regex/g, ...)`. Use `.replace()` only when truly first-match-only. |
| **S7780** | String literal containing `\\` escapes used as a regex source / literal-with-many-backslashes | `String.raw\`...\``. Caveat: raw template literals can't end with an odd number of backslashes — concat or build a const. |
| **S7773** | Bare `parseInt(...)` / `parseFloat(...)` | `Number.parseInt(s, 10)` / `Number.parseFloat(s)`. Always pass radix to parseInt. |
| **S6594** | `String.match(/regex/g)` | `[...s.matchAll(/regex/g)]` for collect, `regex.exec(s)` for first match. `.match` with `/g` returns string\[\] without groups; `.matchAll` is strictly more useful. |
| **S6606** | `Object.prototype.hasOwnProperty.call(obj, key)` | `Object.hasOwn(obj, key)` (ES2022+). |
| **S6035** | `/a\|b\|c/` single-char alternation | `/[abc]/` character class. |
| **S6109** | Duplicate character classes in regex `/[ab][ab]/` | Collapse: `/[ab]+/` or restructure. |
| **S5852** | Unbounded quantifier (`\s*`, `\w+`, `.*`) inside a regex run from user input — ReDoS risk | Bound: `\s{0,16}`, `\w{1,128}`, `.{0,4096}`. |
| **S6326** | Useless regex disjunction (`/(a)/`) | Drop the parentheses unless capture is used. |
| **S6671** | Useless `Array.from(generator)` when `[...generator]` works | Spread is shorter; both work. |

#### Style / idiom

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S4043** | `[...arr].sort()` (mutates the spread copy then discards) | `arr.toSorted(...)` (ES2023) or `arr.slice().sort(...)`. |
| **S2871** | `[1, 2, 10].sort()` (string compare on numbers — yields `[1, 10, 2]`) | Always pass a comparator: `arr.sort((a, b) => a - b)`. Confirm before flagging on string arrays — those don't need a comparator. |
| **S6582** | `if (!x \|\| !x.foo)` (or `x && x.foo`) | Optional chain: `if (!x?.foo)`. Only when both refs are the same variable. |
| **S7735** | Negated condition in ternary OR `if (!cond) early-branch ; common-branch` | Flip to the positive form (`cond ? b : a` for ternaries; `if (cond) { … return; } else-branch` for if/else). Applies anywhere "if-NOT" structure makes the common case read second. |
| **S7755** | `arr[arr.length - n]` indexing | Use `arr.at(-n)`. Remember to handle the `undefined` return when the array could be empty — `const last = arr.at(-1); if (last === undefined) …`. |
| **S7786** | `throw new Error()` for type-shape violation that callers `instanceof` to detect | Use `throw new TypeError()` for "input has wrong shape / type", `RangeError` for "value out of range", `SyntaxError` for parse failures. `Error` is for genuinely unspecific runtime failures. |
| **S3358** | Nested ternary `a ? b : c ? d : e` | Extract a small helper or use `if/else if`. Tolerable in JSX/Vue templates only when the alternatives are all leaves. |
| **S3923** | All branches of an `if/else` or `switch` produce the same value | Drop branches; the conditional is dead. |
| **S1871** | Two `if/else if` branches have identical bodies | Merge or drop. |
| **S7758** | Spread inside loop: `for (...) { acc = [...acc, x]; }` | Use `arr.push(x)` (mutate fresh) or `acc.concat(x)` once outside. O(n²) → O(n). |
| **S125** | Commented-out source code (heuristic: comment looks like statement) | Delete. Git remembers. |
| **S1135** | `TODO` / `FIXME` / `XXX` placeholder | Implement now or open a real ticket. The codebase is not a backlog. |
| **S1172** | Unused function parameter | Remove. NEVER `_arg` to silence — that's a feedback-rule violation. Required interface impls: document why. |
| **S1481** | Unused local variable | Delete. |
| **S1854** | Dead store (assigned then reassigned without read) | Delete. |
| **S6571** | `as` cast widens a typed value | Use the narrow type or a runtime guard. Type assertions are not error handling. |
| **S6535** | Unused `eslint-disable` directive | Delete the directive. Don't suppress — fix the underlying rule. |
| **S6479** | Array index used as React/Vue list key | Use a stable id from the data. |
| **S7799** | `as const` opportunity for a tuple/literal | Apply for narrower inference. |

#### Type / control-flow

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S3776** | Cognitive complexity > 15 (cumulative nesting + control-flow weight) | Extract helpers, inline early-return guards, dispatch via lookup table. |
| **S138** | Function body > 200 lines | Decompose. Long means hard to test. |
| **S107** | Function with > 7 parameters | Group into a single `Options` object; use destructuring. |
| **S109** | Magic number literals | Extract to a named const at module scope. |
| **S1192** | A string literal repeated 3+ times | Extract to a `const`. Caution: `replace_all` would replace the const definition too — anchor the find/replace by surrounding context. |
| **S101** | Class name not PascalCase, or non-conformant | Rename. |
| **S100** | Function name not camelCase | Rename. |
| **S1067** | Boolean expression with > 3 operators | Extract a named predicate. |
| **S1117** | Local variable shadows an outer binding | Rename one. |
| **S1264** | `for (;;)` with semicolon-only body | Use `while`. |
| **S1301** | `switch` with only one `case` | Use `if`. |
| **S1862** | Identical condition in `if/else if` chain | One branch is dead. |
| **S2189** | Loop with no body | Add a body or delete the loop. |
| **S3504** | `var` declaration | Use `const` / `let`. |
| **S3973** | Unreachable code | Delete. |
| **S4123** | `await` on non-Promise | Drop the `await` or wrap with `Promise.resolve`. |
| **S4144** | Two functions in the same scope have identical bodies | DRY: keep one, alias the other. |

#### Error handling (sister to `no-silent-failures.md`)

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S2486** | Empty `catch (...)` block | Log via `log.warn` with `error: String(err)`. Empty catch is forbidden. |
| **S108** | Empty function body | Document or implement. |
| **S2737** | `catch (e) { throw e }` (useless rethrow) | Drop the try/catch entirely OR add real handling. |
| **S1166** | Caught exception used only for `instanceof`, never logged | Always log on the way through. |
| **S6644** | `Array.from(generator)` where `[...gen]` is clearer | Use spread. |
| **S2138** | Useless explicit `undefined` (e.g., `return undefined`) | Drop. |

#### Security

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S2068** | Hardcoded credential string (api_key, password, token, secret with high-entropy literal) | Move to env / Secrets Manager. The PostToolUse `no-discards` hook will reject the edit. |
| **S5547** | Weak hash (`createHash("md5"\|"sha1")`, `createCipheriv("des"\|"3des")`) | Use SHA-256+ or argon2/bcrypt for passwords. |
| **S5876** | Login endpoint without rate limit | Wire `checkRateLimit` per-IP. |
| **S1313** | Hardcoded IP literal in production code | Use config. Tests + SSRF validators are legitimate exceptions (allowlist per file). |
| **S5693** | Request body size limit not configured | Cap body size; protects from DoS. |
| **S2755** | XML parsing without XXE protection | Disable external entities. |
| **S5547** | Use of crypto.createCipher (deprecated) | Use createCipheriv with explicit IV. |

#### Suppression / meta

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S6535** | Unused `eslint-disable` | Delete the directive. |
| **S125** | Commented-out code | Delete. |
| **S1135** | TODO/FIXME/XXX | Implement or ticket. |
| Project rule | Internal task codes in source comments (`Sonar S1192`, `phase 2`, `T0.S5`, `Linear ENG-123`) | Plain-English why-only. Tracker references belong in PR descriptions / plans, not source. |

#### Numerical

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S2424** | Reassigning a built-in (`Number = …`) | Don't. |
| **S2870** | `delete arr[i]` (leaves a hole) | `arr.splice(i, 1)`. |
| **S2933** | Mutable field that's never written | Mark `readonly`. |

### Cross-language

| Rule | Pattern | Fix |
| ---- | ------- | --- |
| **S1854** | Dead store: a variable assigned and never read before reassignment | Delete the dead assignment. |
| **S1135** | `TODO` / `FIXME` / `XXX` comments | Open a real ticket or implement now. The codebase is not a backlog. |
| **S1481** | Unused local variable | Delete or use it. |
| **S2068** | Hardcoded credential | Move to env var or secrets manager. The PostToolUse `no-discards` hook will reject the edit. |
| **S5547** | Weak crypto algorithm (MD5, SHA1, DES) | Use SHA-256+ or argon2 / bcrypt for passwords. |
