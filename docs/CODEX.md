# Council for Codex

The native Codex installer adds Council guidance, skills, specialist agents and a
small set of native hooks alongside your existing Codex setup. It does not replace
Codex configuration or modify your Claude installation. Python 3.11+ and Git are
required; run it from a complete clone of this repository.

## Install

```bash
git clone https://github.com/Nmor/the-claude-council.git
cd the-claude-council
python3 bootstrap/codex.py install --dry-run
python3 bootstrap/codex.py install
python3 bootstrap/codex.py verify
```

On Windows, use `py -3.11` (or a newer Python) instead of `python3`.
`--home PATH` selects a different Codex home; otherwise the installer uses
`CODEX_HOME`, then `~/.codex`. It never sets model, MCP, notification, permission or
plugin configuration. An existing `AGENTS.override.md` must be reconciled first
because it would shadow the installed `AGENTS.md` block.

Start a fresh Codex session so the global instructions and agent definitions load.
Use `$council` for the main workflow and catalog. Check `/skills` for the namespaced
skills. The adapter was tested with Codex CLI `0.155.0-alpha.16.3`; older clients
may not support the same agent and hook configuration. Check your client's actual
capabilities before treating installed files as active features.

## Review hooks

Open `/hooks` in Codex and inspect the five Council command hooks before trusting
them. They invoke the installed `council/hooks.py` with the installation's Python
interpreter. New or changed definitions remain inactive until reviewed and trusted.
The installer does not edit trust records, bypass review or change permissions.

`verify` checks installed file integrity and native metadata. It does **not** prove
that hooks are trusted, that an agent has run, or that project tests passed.
An unavailable hook is a limitation to report, never an implied passing gate.

## Reuse one existing plan

Register an existing plan for one or more project directories:

```bash
python3 bootstrap/codex.py install \
  --project /path/to/backend \
  --project /path/to/frontend \
  --plan /path/to/existing-plan.md
```

The installer validates the file and records pointers in `council/projects.json`.
It does not create, copy or rewrite a plan. The longest matching project root wins;
unrelated projects do not inherit another project's plan. Rerun the command to
change a mapping. Read and update that same plan for cross-agent handoffs, including
worktree, commits, evidence, pending checks and the next executable action.

## Native compatibility contract

This section governs how imported Council references are used in Codex. Higher
priority instructions and the user's scope and authorization always govern. Source
rules do not justify extra approval requests, model overrides, new plans, messages,
pushes, deployment or configuration changes beyond the requested work.

Use available native tools for the intent of imported procedures. Claude names such
as `Task`, `TodoWrite`, `WebSearch`, `Read`, `Edit` and slash commands are source
conventions, not promises that those tools exist. Delegate bounded independent
work to `council-*` roles when supported; otherwise do the work locally and report
that it was not an independent agent review. Never fabricate Council votes or tests.

The source archive is reference material. **Do not execute archived Claude hooks,
installers or scripts as Codex automation.** Procedures specifically about Claude
configuration, model exhaustion, MCP servers or external services require a separate
native implementation or an explicit, authorized task. A converted skill entrypoint
makes its guidance accessible; it does not make every source command executable.
Historical Claude runtime paths, including example plan paths, remain examples.
Resolve the current authoritative plan from user context and the project mapping.

| Source capability | Codex adaptation |
| --- | --- |
| Council workflow and Floor | Concise managed `AGENTS.md` block; complete rules available on demand |
| 118 tracked skills | Namespaced `council-*` skills linking to complete source/reference trees |
| 33 command workflows | `council-command-*` skill entrypoints; source-specific operations remain reference guidance |
| 39 specialist agents | Native TOML roles with embedded guidance and inherited parent model |
| Claude `paths:` activation | Explicit skill/catalog selection; no claim of automatic file-trigger loading |
| Model ladder/exhaustion | No Claude model overrides or exhaustion hook emulation |
| PreToolUse | Native command advisories and supported patch checks for an existing plan |
| PostToolUse | Completion-aware command feedback; invocation is never passing-test evidence |
| SessionStart, PreCompact, Stop | Project-scoped plan and handoff reminders; no Claude transcript parsing |
| Formatting, typechecking, research/intake/coverage markers | Manual task checks; Claude hook scripts are not registered |
| TaskCompleted, PreModelSwitch, PermissionDenied, failure hooks | Not registered; no unsupported-event parity claim |
| Session learning/transcript audits | Not automatically ported; keep durable evidence in the existing plan |

Hooks are supplemental checks, not a security boundary or a shell parser. Hosted
web tools and some specialized tool paths may not emit these events. Arbitrary shell
or script writes cannot be completely policed by patch hooks. Do not substitute hook
feedback for the actual tests, review, permissions or single-plan working agreement.

## Installed layout

```text
<codex-home>/
  AGENTS.md                 # managed block; original content retained
  hooks.json                # merged definitions; unrelated hooks retained
  skills/council*/SKILL.md   # main router and namespaced entrypoints
  agents/council-*.toml      # native specialist definitions
  council/
    catalog.md              # searchable routing when discovery is truncated
    resources/              # allowlisted tracked guidance and full references
    hooks.py                # native dispatcher
    projects.json           # existing-plan pointers, not another plan
    manifest.json           # private hashes and original shared-file backups
```

Large skill catalogs can exceed Codex's discovery budget. The main `council` skill
and `council/catalog.md` provide explicit access to every installed resource. Read
only relevant references; the full source Floor is not injected into every prompt.
Large pre-existing global or project instructions can also exhaust Codex's combined
instruction budget. Check that the Council block loaded in the session; file-integrity
verification cannot detect runtime truncation.

## Upgrade, removal and recovery

After updating the checkout, rerun `install` and `verify`. Installation is idempotent.
The manifest records hashes and original shared-file contents. Changes to managed
files, including the shared `AGENTS.md` and `hooks.json`, cause upgrade or removal to
stop rather than overwrite user edits. Save and reconcile those edits before retrying;
there is deliberately no force-overwrite option. Unrelated files remain untouched.

```bash
python3 bootstrap/codex.py uninstall --dry-run
python3 bootstrap/codex.py uninstall
```

Removal restores original shared files and removes only managed files. Empty
folders or native runtime state may remain. Handled installation failures roll back;
individual file replacements are atomic. Sudden termination or disk failure is not
claimed to be crash-safe. A stale `.council-install.lock` after abrupt termination
must be inspected and removed only after confirming no installer is running.
The private manifest contains backups of original shared files: do not publish it.

## Validation

```bash
python3 -m unittest discover -s tests/codex -v
```

The optional real-client check runs skill/hook discovery without a model turn or
hook-trust bypass:

```bash
COUNCIL_CODEX_BIN=/path/to/codex python3 -m unittest discover -s tests/codex -v
```

Tests cover preservation, collisions, repeat installation, rollback, uninstall,
metadata, project mappings and native hook fixtures. CI runs the portable suite on
Linux, macOS and Windows. Runtime discovery and trusted execution are separate checks.

## Official references

- [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Skills and discovery](https://learn.chatgpt.com/docs/build-skills)
- [Native subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Hook events, response contracts and trust](https://learn.chatgpt.com/docs/hooks)
