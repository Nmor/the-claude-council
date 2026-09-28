# Context and session cost

Council uses a short working contract and reads detailed standards on demand.
Correctness, security and required tests still apply; fixed speeches, repeated intake,
recursive reviews and automatic agent fan-out are not substitutes for those checks.

## Defaults

- Do routine work in the main session. Use at most one helper at a time for a concrete
  independent task. Keep its prompt scoped and output concise; no recursive delegation.
- Read the existing plan's current handoff and relevant task sections. Keep the full
  history in that same file; do not inject it into every helper's context.
- Investigate once, implement, verify the changed behavior and finish. Reopen analysis
  when new evidence warrants it. Do not redo valid checks merely because a turn changed.
- Save a compact handoff before compaction. Use a fresh session for unrelated work.
  Compaction itself consumes tokens; avoid repeatedly compacting unchanged material.
- Keep the user's chosen primary model. Model downgrades are not a substitute for
  reducing unnecessary context or delegation. Use smaller helpers only for suitable tasks.

Full rule text and examples remain under `rules-library/council-detail/`. Current
`CLAUDE.md` and short rules govern their procedural interpretation. No automatic `@`
imports pull the detailed library back into startup context.

## Claude

Fresh installs enable auto-compaction with a 100,000-token window, small workflow guidance,
no automatic dynamic workflows, and one level of subagents. Ordinary specialists
remain available. These are session controls, not a global limit on all your open
terminals or apps. Existing runs keep going; the installer does not kill them.

The automatic prompt-improver hook is removed from default registration: duplicating
every request and demanding a fresh questionnaire consumed context even on follow-ups.
The prompt-improver skill remains available when clarification is actually needed.

For an existing installation, preview and apply the additive migration:

```bash
python3 bootstrap/context.py apply --claude-home ~/.claude --dry-run
python3 bootstrap/context.py apply --claude-home ~/.claude
```

It backs up changed files, preserves unrelated settings and local runtime data, and
refuses to overwrite modified managed files. Local-only differences in original
instructions are retained in the private backup for review; the new short contract
keeps the single-plan and project-memory behavior. Start a fresh session to load it.
For an exceptional large workflow, explicitly choose the workflow/model and budget
instead of making every task run that way. `disableWorkflows: false` re-enables dynamic
workflows; do not confuse the small-size guideline with an enforced global agent cap.

The documented workflow concurrency environment limit requires Claude Code 2.1.269+;
it is not applied to older clients. These defaults are intended for Claude Code
2.1.261+, the version used for this migration. The auto-compact window is a target,
not a guarantee that one large tool result cannot temporarily exceed it.
Check for higher-priority project, CLI or environment overrides, especially
`DISABLE_AUTO_COMPACT`, `DISABLE_COMPACT` and `CLAUDE_CODE_AUTO_COMPACT_WINDOW`.
The old `env.autoCompactEnabled` entry was not a supported environment variable;
the migration replaces it with the actual boolean settings key.

## Codex

The native installer now defaults to compact skill discovery: one `council` router,
all source skills/commands/references in the catalog, and all 39 native specialist
roles. This keeps the full library accessible without advertising 152 skill entries
on every request. Full discovery remains an explicit option:

```bash
python3 bootstrap/codex.py install --skill-profile compact
python3 bootstrap/codex.py install --skill-profile full
```

Subsequent installs retain the selected profile. Installations from before profiles
were introduced migrate to compact discovery unless `--skill-profile full` is given.

Apply optional runtime cost controls separately:

```bash
python3 bootstrap/context.py apply --codex-home ~/.codex --dry-run
python3 bootstrap/context.py apply --codex-home ~/.codex
```

This sets the auto-compact token limit to 100,000 and the concurrent spawned-agent
limit to one. It preserves the primary model, effort and unrelated configuration.
A supported runtime must enforce those settings; instructions alone do not impose a
hard global limit across independently launched sessions. Restart active sessions.

## Restore

```bash
python3 bootstrap/context.py restore --claude-home ~/.claude --dry-run
python3 bootstrap/context.py restore --claude-home ~/.claude
python3 bootstrap/context.py restore --codex-home ~/.codex
```

Each home has a private `.council-context.json` containing original file backups.
Do not publish it. Restore refuses if managed files have changed; reconcile those
changes first. Separate homes are independent transactions. Handled failures roll
back and individual writes are atomic; sudden power loss is not crash-safe.
If a process was killed, inspect `.council-context.lock` and remove it only after
confirming no migration is running. The source checkout and Python 3.11+ are required.

## Measure and verify

```bash
node scripts/token-budget.mjs --root . --json
node scripts/token-budget.mjs --root . --check
node scripts/token-budget.mjs --root ~/.claude --json
python3 -m unittest discover -s tests/codex -v
```

The fixed eager Floor cap is 24,576 bytes. Per-file self-declared budgets cannot replace
that aggregate gate. Byte counts and bytes/4 token estimates are reproducible size
measurements, not tokenizer output, billing data or a promise of a particular speedup.
Use the client's `/context` and usage report to validate real sessions after rollout.
Compare similar work, including task outcome, model, cached tokens and helper count.

The shared account's parallel-session usage requires deliberate scheduling by its
operator. This repository cannot enforce a global semaphore across unrelated apps
or accounts. Prefer one active substantive session and queue unrelated work.

## Sources

- [Claude memory and rule loading](https://code.claude.com/docs/en/memory)
- [Claude cost controls](https://code.claude.com/docs/en/costs)
- [Dynamic workflows](https://code.claude.com/docs/en/workflows)
- [Claude environment variables](https://code.claude.com/docs/en/env-vars)
- [Codex subagent configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents)
