# Global rule enforcement — what's mechanical, what isn't, and where each rule lives

The user's instruction was: "ensure all rules are represented and global … 100s
of rules across projects … including how codes are written and the skills and
the quality?"

A single PostToolUse hook can't enforce all of that. This document is the
honest map of which rules are mechanically enforced, where, and what still
relies on the agent reading and following prose.

## Layer 1 — PostToolUse regex hook (this directory)

Runs on every Edit / Write to a watched source file, in every project, every
session. Mechanical pattern detection. Exits 2 to block the edit when any
blocking rule fires; exits 0 with stderr warning for soft rules.

| Rule id              | Level  | Detects                                             |
| -------------------- | ------ | --------------------------------------------------- |
| underscore-discard   | block  | `_, err :=`, `, _ :=`, `_ = …` outside test files   |
| placeholder-marker   | block  | T0D0 / F1XME / X-X-X markers in any source comment  |
| suppression          | block  | //nolint, eslint-disable, @ts-ignore, noqa, etc.    |
| task-pointer         | block  | `plan B2`, `Initiative I10`, `Sonar S1192` in code  |
| raw-color            | block  | hex/rgb/hsl/oklch/oklab in UI component code        |
| console-log          | block  | console.log in JS/TS production source              |
| hardcoded-secret     | block  | Stripe / GitHub / AWS / JWT / Slack key prefixes    |
| go-test-naming       | block  | `func TestFoo_Bar(...)` Go test names with `_`      |
| merge-conflict       | block  | `<<<<<<<`, `=======`, `>>>>>>>` markers             |
| important            | warn   | `!important` in CSS / Tailwind className strings    |
| file-too-large       | warn   | files past the 800-LOC soft cap                     |

Source: `~/.claude/scripts/hooks/post-edit-no-discards.js` (runner) +
`~/.claude/scripts/hooks/lib/no-discards-rules.js` (manifest).
Wired in: `~/.claude/settings.json` under `PostToolUse → Edit|Write`.
Operator override: `export CLAUDE_NO_DISCARDS_HOOK=off`.

## Layer 2 — Existing PostToolUse hooks (already wired)

| Hook                       | What it does                                         |
| -------------------------- | ---------------------------------------------------- |
| post-edit-format.js        | Auto-format JS/TS with Prettier                      |
| post-edit-typecheck.js     | Run `tsc --noEmit` on touched .ts / .tsx             |
| post-edit-console-warn.js  | Warn on console.log (non-blocking; predates Layer 1) |

Layer 1 supersedes the warn-only console hook for blocking semantics, but the
warn hook still surfaces line numbers — both run.

## Layer 3 — Pre-commit hooks per repo

Catches anything Claude Code edits outside its own session (manual edits,
other agents, copy-paste from notes). Recommended `.pre-commit-config.yaml`
to commit at the root of every project:

```yaml
repos:
  - repo: local
    hooks:
      - id: no-underscore-discard
        name: Reject _, err discards in money path
        entry: bash -c 'git diff --cached -U0 | grep -nE "^\+.*(_, err |, _ :?=|^\+\s*_ ?:?= )" && exit 1 || exit 0'
        language: system
        pass_filenames: false
      - id: no-placeholder
        name: Reject placeholder markers
        entry: bash -c 'git diff --cached -U0 | grep -inE "^\+.*(T[O0]DO|F[I1]XME|XXX|//nolint|@ts-ignore|noqa)" && exit 1 || exit 0'
        language: system
        pass_filenames: false
      - id: no-task-pointers
        name: Reject external tracker pointers in code
        entry: bash -c 'git diff --cached -U0 | grep -inE "^\+.*((plan|initiative|punch[- ]list) [A-Z][0-9]+|bug [A-Z][0-9]+|Sonar S[0-9]+)" && exit 1 || exit 0'
        language: system
        pass_filenames: false
```

Plus `gitleaks` for secret detection and `markdownlint` for docs.

## Layer 4 — CI gates per repo (the only quality enforcement that survives)

Gates that must fail the build, not warn:

- Build green (`go build ./...`, `pnpm build`, `cargo build`, etc.)
- Lint green (`golangci-lint run`, `eslint`, `ruff`, `rubocop`)
- `staticcheck`, `gosec`, `govulncheck`, `npm audit --audit-level=high`,
  `gitleaks`, `trivy`, `semgrep`
- Test runs green
- Coverage threshold (≥70% project-wide, ≥80% on services, ≥85% on
  platform — the gates from `~/.claude/CLAUDE.md`)
- Markdownlint, `vale`, `spectral`, `actionlint`, `shellcheck`, `hadolint`,
  `yamllint`
- SonarQube Quality Gate

These are project-level. Each repo configures its own `.github/workflows/`
(or equivalent) to run them on every PR.

## Layer 5 — Prose enforcement (CLAUDE.md + rules/*)

Already exists. Loaded into the agent's context on every session. Covers the
hundreds of rules the regex hook can't catch:

- Council protocol (5-division consultation before code)
- Skill activation (frontend-design auto-fires on .tsx/.vue)
- Architectural patterns (accept interfaces / return structs, repository
  pattern, immutability, file size, function size, cognitive complexity)
- Quality bar (TDD-first, 70%+ coverage, clean architecture)
- Workflow (commit conventions, PR template, CODEOWNERS, signed commits)
- Skill manifests in `~/.claude/skills/` (auto-loaded based on file context)

The downside: prose is interpretive. The agent sometimes drifts under context
pressure. The PostToolUse hook is the mechanical safety net that catches the
specific drift modes that have actually happened in production work.

## What's intentionally NOT in the regex hook

These rules need AST-level analysis or full-repo context, not single-line
regex. They live in CI (Layer 4) instead:

- Cognitive complexity per function (Sonar S3776 — needs AST)
- Function size > 50 lines (needs brace/indent tracking)
- Nesting depth > 4 (needs brace tracking)
- Cyclomatic complexity (needs AST)
- Mutation detection (needs AST + dataflow)
- Magic-number detection (needs AST + const-table comparison)
- Test coverage (needs runtime instrumentation)
- Build-green / dependency-CVE (needs full toolchain)

For these, the right enforcement is `golangci-lint`, `staticcheck`,
`SonarQube`, and the like — all gated in CI, not in the editor hook.

## Adding a new global rule

1. Add a rule object to `~/.claude/scripts/hooks/lib/no-discards-rules.js`.
2. If the rule needs file-level (not per-line) context, add it to the
   `fileRules` array instead.
3. Manually run the test pipeline:

   ```bash
   cat > /tmp/probe.go <<'EOF'
   <code that should fail>
   EOF
   echo '{"tool_input":{"file_path":"/tmp/probe.go"}}' \
     | node ~/.claude/scripts/hooks/post-edit-no-discards.js; echo $?
   ```

4. Update the table at the top of this file.
5. If it's a project-specific rule, add the matching pre-commit + CI gate
   to the project repo (Layer 3 + 4) — the global hook is the floor, not
   the only line of defense.
