# Memory Index

> Shared Claude memory for a project that spans several repositories. Claude Code loads this
> folder only when each repository's gitignored `.claude/settings.local.json` sets
> `"autoMemoryDirectory"` to its absolute path; otherwise every repository keeps its own memory
> under `~/.claude/projects/` and this folder is never read. A single-repository project does
> not need it. See `~/.claude/rules/common/project-memory.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`. Claude Code loads only the first
> 200 lines or 25 KB.

Active plan: none

- [Functional tests](feedback_functional_test_coverage.md) — a found defect is fixed, not filed

<!--
Replace `none` with the absolute path of the plan this project is executing. Then one line per
memory file, for example:
- [Stripe keys live in the vault](reference_stripe_keys.md) — vault path and rotation cadence
Progress and status belong in the plan, not here.
-->
