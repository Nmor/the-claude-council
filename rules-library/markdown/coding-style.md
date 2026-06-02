# Markdown Coding Style

> Auto-fires on every `*.md`, `*.mdc`, `*.markdown` file.
> Standards: **CommonMark 0.31.2** (specification, Jan 2024),
> **GFM (GitHub Flavored Markdown) Spec**, **markdownlint rule
> set MD001–MD059**, **CommonMark Reference Implementation
> (cmark)**.

## Core Principle

**Markdown is a content surface, not a presentation surface.
Every committed `*.md` file is portable across CommonMark
renderers, has predictable rendering, passes `markdownlint`
with zero warnings, uses semantic structure (headings, lists,
tables, code blocks) for meaning rather than visual styling,
and stays under the project's line-length cap so it remains
diff-friendly.**

A markdown file that renders fine in one viewer but breaks in
another is a portability bug. A markdown file with 500-char
lines is a review-hostile bug. A markdown file that renders
visually but fails markdownlint is technical debt.

## Mandatory markdownlint rules

Every `*.md` file MUST pass these rules. They are the floor;
projects may tighten further but never relax.

### Headings + structure

| Rule | What it enforces |
| --- | --- |
| **MD001** | Heading levels increment by one — no jumping from `##` to `####` |
| **MD003** | Heading style is consistent — ATX (`# heading`) preferred over Setext underline |
| **MD018** | No missing space after hash — `# heading`, NOT `#heading` |
| **MD019** | No multiple spaces after hash — `# heading`, NOT `#  heading` |
| **MD022** | Blank line above AND below every heading |
| **MD023** | Heading at the start of its line (no leading indent) |
| **MD024** | Each heading text is unique (or unique within siblings, per config) |
| **MD025** | One top-level `#` heading per document |
| **MD026** | No trailing punctuation in headings (no `# Title.`) |
| **MD036** | No emphasis-as-heading — `**Header**` on its own line is a heading; use `### Header` |

### Lists

| Rule | What it enforces |
| --- | --- |
| **MD004** | Unordered lists use `-` everywhere — never `*` or `+` |
| **MD005** | Consistent indentation within a list |
| **MD007** | Unordered-list indent is 2 spaces per level |
| **MD029** | Ordered lists use `1.` / `2.` / `3.` (or all-ones — configured per project) |
| **MD030** | One space between list marker and content — `- item`, NOT `-  item` |
| **MD032** | Blank line above AND below every list |

### Code blocks

| Rule | What it enforces |
| --- | --- |
| **MD031** | Blank line above AND below every fenced code block |
| **MD040** | Fenced code blocks specify a language — `​```typescript`, NOT bare `​```` |
| **MD046** | Code block style consistent — fenced (` ``` `) preferred over indented |
| **MD048** | Code fence character is backtick — never tilde |

### Whitespace + line length

| Rule | What it enforces |
| --- | --- |
| **MD009** | No trailing whitespace at line ends |
| **MD010** | No hard tabs — spaces only |
| **MD012** | No multiple consecutive blank lines |
| **MD013** | Line length cap (100 chars project default; longer tolerated only on unbreakable rows like long table rows or long inline URLs) |
| **MD047** | File ends with exactly one trailing newline |

### Links + references

| Rule | What it enforces |
| --- | --- |
| **MD034** | No bare URLs — wrap in `<https://...>` or `[text](https://...)` |
| **MD039** | No spaces inside link text brackets `[text]` |
| **MD042** | No empty link text `[](url)` |
| **MD051** | Link fragments (`#section`) resolve to existing headings |
| **MD052** | Reference-style links (`[text][ref]`) resolve to a definition |
| **MD053** | Reference link definitions are used |

### Tables

| Rule | What it enforces |
| --- | --- |
| **MD055** | Table pipe style consistent — leading + trailing pipes |
| **MD056** | Each row has the same number of cells as the header |
| **MD058** | Blank line above AND below every table |

### HTML

| Rule | What it enforces |
| --- | --- |
| **MD033** | No inline HTML (configure exceptions per project: `<br>`, `<details>` are common allowed elements) |
| **MD041** | First line of file is a top-level heading (`#`) — no preceding text |

## Hard rules

### 1. Language tag on every fenced code block

Every triple-backtick fence carries a language identifier:

```markdown
​```typescript    ← yes
​```bash          ← yes
​```text          ← yes (for unstructured output)
​```              ← NEVER — bare fence loses syntax highlighting
```

The `text` / `console` / `output` tags exist for blocks that
aren't code (sample console output, plain text). Use them
explicitly rather than dropping the language.

### 2. Use dashes for unordered lists (MD004)

```markdown
- First item       ← yes
- Second item
- Third item

* First item       ← NEVER
+ First item       ← NEVER
```

The dash is the markdownlint default; consistency across the
codebase matters more than the choice itself.

### 3. Blank line above and below headings, lists, code

tables (MD022 + MD031 + MD032 + MD058)

```markdown
Previous paragraph.

## Heading

First item.

- list item
- list item

Next paragraph.

​```bash
command
​```

Following paragraph.
```

Squashed structure (no blank lines) confuses many renderers
and breaks tooling that walks the AST.

### 4. One top-level heading per file (MD025)

The `#` heading is the document title. Sub-sections use `##`,
`###`, and so on. NEVER two `#` headings in one file — split
the document or demote one.

### 5. Heading hierarchy increments by one (MD001)

```markdown
# Title

## Section

### Subsection         ← yes

#### Detail            ← yes

## Next section

#### Skipped level     ← NEVER (skipped ###)
```

Skipping levels breaks screen-readers + outline-style
navigation in IDEs.

### 6. Tables have a header row + a separator row

```markdown
| Column A | Column B |
| --- | --- |
| Cell 1   | Cell 2   |
```

The separator row (`---` per column) is mandatory. Without it,
the table renders as a paragraph of pipes in some renderers.

For alignment:

```markdown
| Left | Center | Right |
| :--- | :---: | ---: |
| a    | b     | c     |
```

### 7. Line length is project-capped (MD013, default 100)

Wrap prose at ~100 chars. Exceptions are tolerated ONLY for:

- A table row with an unbreakable URL or long identifier
- A code-block line that can't be split (e.g., a long command)
- A reference-style link definition with a long URL

Inline-code that pushes a paragraph over the cap should be
moved to a fenced block.

### 8. Reference-style links for long URLs

```markdown
See the [OWASP Top 10][owasp] for the canonical category list.

[owasp]: https://owasp.org/www-project-top-ten/
```

Inline `[text](https://...)` works too — but for repeated
references or long URLs, the reference-style keeps prose
readable.

### 9. Code spans use single backticks; code blocks use triple

- Inline code: `` `variableName` `` → `variableName`
- Block code: triple-backtick fence with a language tag
- Code containing backticks: use double backticks for the
  inline span — `` `` `code with`backticks`inside` `` ``

### 10. Frontmatter is YAML, fenced with `---`

Markdown files with frontmatter (e.g., agent / skill files):

```markdown
---
name: agent-name
description: One-line summary
tools: [Read, Edit, Bash]
model: opus
---

# Agent Name

Body content starts here.
```

The frontmatter block is the FIRST thing in the file — before
the H1. Empty line after the closing `---`.

## Required tooling

### CLI lint (mandatory in every repo)

```bash
# markdownlint-cli2 — the canonical implementation
npx markdownlint-cli2 "**/*.md" "#node_modules"

# Or with a project config:
npx markdownlint-cli2 --config .markdownlint.jsonc "**/*.md"
```

### Pre-commit hook

Per `~/.claude/rules/common/hooks.md`:

```bash
#!/usr/bin/env bash
# .githooks/pre-commit
set -euo pipefail

staged_md=$(git diff --cached --name-only --diff-filter=ACMR \
  | grep -E '\.md$' || true)

if [ -n "$staged_md" ]; then
  npx markdownlint-cli2 $staged_md
fi
```

### CI workflow

```yaml
- name: Markdown lint
  uses: DavidAnson/markdownlint-cli2-action@<sha>
  with:
    globs: '**/*.md'
```

## Project config (`.markdownlint.jsonc`)

The canonical strict baseline:

```jsonc
{
  "default": true,
  "MD013": {
    "line_length": 100,
    "code_blocks": false,
    "tables": false,
    "headings": true
  },
  "MD024": { "siblings_only": true },
  "MD025": { "front_matter_title": "" },
  "MD033": false,
  "MD041": false
}
```

`MD033` (no inline HTML) is often disabled at project level
when `<details>` / `<br>` are needed. `MD041` (first line H1)
is often disabled for files with frontmatter.

## Anti-patterns

### Anti-pattern 1: Mixing list markers

```markdown
- One
* Two              ← inconsistent (MD004)
+ Three
```

Pick `-` and stick with it.

### Anti-pattern 2: Bare URLs in prose

```markdown
See https://example.com for more.    ← MD034 violation
```

Always wrap: `See <https://example.com>` or
`See [this site](https://example.com)`.

### Anti-pattern 3: Tab characters for indentation

```markdown
    indented with tabs    ← MD010 violation
```

Use spaces (4 spaces for code-block indentation in raw
markdown; rare — fenced blocks are preferred).

### Anti-pattern 4: Emphasis as heading

```markdown
**Section Title**     ← MD036 violation

Content.
```

Use a real heading:

```markdown
### Section Title

Content.
```

### Anti-pattern 5: Skipping heading levels

```markdown
# Title

#### Sub-detail       ← MD001 violation (skipped ## and ###)
```

Always increment by one.

### Anti-pattern 6: Trailing whitespace + hidden line-break

spaces

A line ending in two-or-more spaces forces a `<br>` in
many renderers. This is a feature in some content, a bug in
most. MD009 catches both — configure the project to allow
two-space line breaks only where intentional.

### Anti-pattern 7: HTML for visual styling

```markdown
<div style="color: red;">Important</div>    ← bad
```

Markdown is content; styling belongs in CSS / the renderer.
Use semantic structure: `**Important**` for bold,
`> Important` for blockquote, `!!! warning` (in MkDocs /
similar) for callouts.

## Cross-references

- `~/.claude/rules/common/extreme-lint-policy.md` — strict
  thresholds (MD013 line length, MD040 fenced code language,
  MD031/MD032/MD022 surround rules)
- `~/.claude/rules/common/coding-style.md` — comment rules
  apply across every language including markdown
- `~/.claude/rules/common/docs-sync-with-code.md` — markdown
  files are part of the docs surface that ships with code
- `~/.claude/rules/common/documentation-requirements.md` —
  Diátaxis four-quadrant model; markdown is the format

## Standards cited

- **CommonMark 0.31.2** — commonmark.org/spec/0.31.2/
  (formal specification, January 2024)
- **GFM (GitHub Flavored Markdown) Spec** —
  github.github.com/gfm/ (tables, task lists, autolinks,
  strikethrough, fenced code)
- **markdownlint rule reference** —
  github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md
- **markdownlint-cli2** —
  github.com/DavidAnson/markdownlint-cli2
- **mkdocs-material admonitions** (for callout-style
  syntax extensions, where the project's renderer is
  MkDocs)

## Why this rule exists

Markdown is the lingua franca of documentation, READMEs,
ADRs, runbooks, design docs, and the entire CommonMark / GFM
ecosystem. A markdown file that renders fine in VS Code
preview but breaks in GitHub's renderer, or that fails to
parse in pandoc, is broken. Inconsistent style + linter
violations turn every PR into a style argument; consistent
style + automated linting eliminates the discussion entirely.

The cost of running markdownlint per-commit is one CI step.
The cost of inconsistent docs across hundreds of files is
unreviewable PRs + readers giving up.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Bare code fence (no language tag) introduced — MD040 weakening
- Heading levels skipped (e.g., `##` → `####`) — MD001 violation
- Inline HTML used for visual styling (anti-pattern 7)
- Trailing-whitespace pattern introduced as accidental
  line-break formatting (anti-pattern 6)
- Long-line cap (MD013) bypassed without code-block / table
  exemption — line-length discipline weakening
- Reference-style link definitions accumulate unused (MD053)
- Multiple top-level `#` headings in one file (MD025 violation)
- File-level emphasis-as-heading pattern (anti-pattern 4)

**Refinement candidates**:

- Tightening the MD013 line cap when a project's prose lines
  consistently fit under 80 characters
- New row in the project config when a new project-specific
  exception is justified (e.g., per-page `<details>` callouts)
- New cross-reference when a sister rule (docs-sync-with-code,
  documentation-requirements) consumes the markdown contract
- Promotion of a per-file lint exception into a project-wide
  config entry when the exception pattern recurs
