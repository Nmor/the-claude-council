# Workspace Memory Index

> Project-specific memories. Index file — never put memory content
> here directly; one line per memory file. Per the auto-memory
> system in `~/.claude/CLAUDE.md`.

## Conventions

- Each memory file carries frontmatter (`name`, `description`,
  `metadata.type`)
- Type is one of: `user`, `feedback`, `project`, `reference`
- `MEMORY.md` is the index only — under ~150 chars per line
- Project-specific memories live HERE; universal preferences live
  in `~/.claude/projects/-Users-<user>/memory/`

## Index

<!--
Examples (delete when adding real entries):
- [Stripe live key in keychain](reference_stripe_keys.md) — vault path + rotation cadence
- [Avoid Sidekiq for cron](feedback_no_sidekiq_cron.md) — use Solid Queue per Rails 8 default
-->
