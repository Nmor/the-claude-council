---
name: bash-scripting-patterns
description: Bash + shell scripting discipline — strict header (set -euo pipefail; IFS), naming conventions (kebab-case scripts, snake_case functions/vars, SCREAMING_SNAKE_CASE constants), always-quoted variables, defaults via ${var:-default}, getopts for arguments, structured logging to stderr, cleanup via trap, no backticks (use $(cmd)), no eval with user input, no rm -rf on unset vars, ShellCheck strict + shfmt format-check enforced. Auto-fires on shell scripts.
paths:
  - "**/*.sh"
  - "**/*.bash"
  - "**/*.zsh"
  - "**/.bashrc"
  - "**/.zshrc"
  - "**/.bash_profile"
  - "**/.profile"
---

# bash-scripting-patterns

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Migrated 2026-06-02 from `~/.claude/rules-library/bash/` as part of the lazy-rules-loading plan.
> Phase H will delete the source files.

## Purpose

Shell scripting discipline for every `*.sh` / `*.bash` / `*.zsh` file and every shell rc file. This
page is a routing table only: it names the topic and the file that holds it. Read the row you need —
the guidance, standards, code examples and anti-patterns live in `references/`, so a shell edit pays
for the one concern it touches rather than the whole corpus.

## Routing table

| Topic | Read | What it holds |
| --- | --- | --- |
| **Coding style** | `references/coding-style.md` | Mandatory `set -euo pipefail` header and why each flag; naming table; variable quoting and `${var:-default}`; functions; `getopts` argument parsing; stderr logging; cleanup traps; file-length cap; idioms |
| **No-discards (banned patterns)** | `references/no-discards.md` | The fifteen banned patterns — missing strict mode, unquoted vars, `\|\| true`, backticks, `eval`, unchecked `cd`, `rm -rf` on unset vars, pipe-to-read subshells, `for` over `ls`, hardcoded credentials, `cd -`, mixed `[`/`[[`, unquoted `$@`, `echo` for data, `/bin/bash` shebang — plus `.shellcheckrc`, shfmt flags and the sweep verification block |
| **Patterns** | `references/patterns.md` | Bash-vs-real-language decision table; strict-mode script template; long options via `getopt`; pipeline patterns; retry with backoff; subcommand dispatch; error propagation; config-file loading; the common-pitfalls table |
| **Security** | `references/security.md` | CWE-78 / CWE-77 command injection, CWE-88 argument injection, path traversal, secrets in argv, temp-file races, `umask`, the SUID ban, curl/wget hardening and the `curl \| sh` ban, SSH quoting, secret-free logging, required scanning tooling |
| **Testing** | `references/testing.md` | bats-core idioms; the what-to-test table; mocking external commands and bats-mock; shunit2 for POSIX; coverage via kcov / bashcov; the seven hard rules |
| **Hooks + CI** | `references/hooks.md` | `.githooks/pre-commit` and `pre-push`; the Shell CI workflow with ShellCheck, shfmt, gitleaks, bats and kcov coverage gate; `.editorconfig`; the seven-step pre-push checklist |

## Cross-references

Each reference file carries its own cross-reference list and its own standards citations. The
always-on floor rules that pair with this skill are `~/.claude/rules/common/no-discards.md`,
`no-silent-failures.md`, `verify-before-claim.md` and `no-bloat.md`.
