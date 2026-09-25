# Sweep procedure, suppression policy, reporting

> Covers what to run after every edit, the no-suppression discipline, and the Sonar sweep block a
> verification report must carry. Pointed at by the SKILL.md rows "Sweep procedure", "Do not silence
> — fix" and "Output expectation".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Sweep procedure

After every edit that creates or modifies a code file:

1. Run the project's lint command if one exists (`pnpm lint`, `eslint`, `golangci-lint`, `ruff`,
   `rubocop`, etc.). Fix every reported issue.
2. Grep for the literal-pattern Sonar checks above (especially S7781, S6606, S125). Fix every match.
3. Re-read any IDE diagnostics surfaced via the `<ide_diagnostics>` PostToolUse hook output. Address
   every one.
4. Verify the file's cognitive complexity by structural review — a function over ~50 lines, with
   nested `if`/`for`, is likely past the S3776 threshold.

## Don't silence — fix

Per `feedback_no_silencers`: never add `eslint-disable`, `// @ts-ignore`, `// @ts-expect-error`,
`noqa`, `rubocop:disable`, or any other suppression. Either fix the underlying issue or change the
code shape so the rule no longer applies.

If a rule is genuinely wrong for the project, change the project's lint config — don't suppress
per-line.

## Output expectation

When reporting work done, the verification block should explicitly call out Sonar sweep results:

```text
Sonar sweep:
  - S7781: 7 → 0 (replace literal /x/g with replaceAll)
  - S1192: 0 violations
  - S3776: 1 → 0 (extracted dispatchRoute, mapKnownErrorToResponse)
```

If zero violations were found, state that explicitly. "Looks clean" is not a Sonar sweep.
