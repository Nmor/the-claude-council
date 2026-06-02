# The Claude Council

<div align="center">

```text
████████╗██╗  ██╗███████╗     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
╚══██╔══╝██║  ██║██╔════╝    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
   ██║   ███████║█████╗      ██║     ██║     ███████║██║   ██║██║  ██║█████╗
   ██║   ██╔══██║██╔══╝      ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
   ██║   ██║  ██║███████╗    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
   ╚═╝   ╚═╝  ╚═╝╚══════╝     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝

                    ██████╗ ██████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗██╗
                   ██╔════╝██╔═══██╗██║   ██║████╗  ██║██╔════╝██║██║
                   ██║     ██║   ██║██║   ██║██╔██╗ ██║██║     ██║██║
                   ██║     ██║   ██║██║   ██║██║╚██╗██║██║     ██║██║
                   ╚██████╗╚██████╔╝╚██████╔╝██║ ╚████║╚██████╗██║███████╗
                    ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝
```

## A principal-level, 16-division multi-agent Council for Claude Code

*Drop-in `~/.claude/` config — runs on any machine, any project, every IDE.*

[![Skills](https://img.shields.io/badge/skills-99%20%2F%2099%20pass-2ea043?style=for-the-badge)](docs/SKILLS.md)
[![Rules](https://img.shields.io/badge/rules-74%20common%20%2B%2021%20lang-1f6feb?style=for-the-badge)](docs/RULES.md)
[![Agents](https://img.shields.io/badge/agents-32-8957e5?style=for-the-badge)](docs/AGENTS.md)
[![Council](https://img.shields.io/badge/divisions-5%20core%20%2B%2011%20extended-dc7800?style=for-the-badge)](docs/COUNCIL.md)
[![License](https://img.shields.io/badge/license-MIT-238636?style=for-the-badge)](LICENSE)

[**Install**](#three-minute-install) ·
[**Council in 5 paragraphs**](#the-council-in-5-paragraphs) ·
[**Architecture**](docs/ARCHITECTURE.md) ·
[**Rules**](docs/RULES.md) ·
[**Skills**](docs/SKILLS.md) ·
[**Agents**](docs/AGENTS.md) ·
[**Contributing**](docs/CONTRIBUTING.md)

</div>

---

> *"Every plan or piece of work routed through Claude should shock the world."*
>
> — The user directive that drove the v1.0.0 build

---

## Why this exists

Out of the box, Claude Code is a powerful generalist. **The Claude
Council** turns it into a 16-division multi-agent Council
operating at *principal-engineer level* across the entire stack:
architecture, security, compliance, ops, data, finance, risk,
strategy, people, ESG, ethics, comms, plus the five core technical
divisions.

This repo is the *complete* config surface — 74 global rules, 99
principal-level skills, 32 specialist agents, 33 commands, a strict
Council protocol, hook-enforced quality gates, and project-scoped
artifact bootstrap. **For anyone, on any project.** No
org-dependency, no SaaS, no telemetry.

What you get after install:

```text
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Every prompt        ●  29-question task intake (mandatory)       │
│   ────────────►       ●  16 divisions speak (5 always + 11 auto)   │
│   in every project    ●  Standards-cited research                  │
│                       ●  Verify-before-claim discipline            │
│                       ●  Project-scoped .claude/ scaffold          │
│                       ●  Continuous learning loop                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Three-minute install

<table>
<thead>
<tr>
<th width="50%">macOS / Linux / WSL2</th>
<th width="50%">Windows (PowerShell, no WSL2 required)</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">

```bash
git clone https://github.com/Nmor/the-claude-council.git
cd the-claude-council
./bootstrap/install.sh
./bootstrap/verify.sh
```

</td>
<td valign="top">

```powershell
git clone https://github.com/Nmor/the-claude-council.git
Set-Location the-claude-council
Set-ExecutionPolicy -Scope Process Bypass
.\bootstrap\install.ps1
.\bootstrap\verify.ps1
```

</td>
</tr>
</tbody>
</table>

Both flows are fully native to their host platform — Windows
users do **not** need WSL2 or Git Bash. The installer is
idempotent: any existing `~/.claude/` is moved aside to a
timestamped backup before the new one lands. Pass `--dry-run`
(`-DryRun` on PowerShell) to preview, `--force` (`-Force`) to
skip the backup, `--no-ide` (`-NoIde`) to skip IDE integration.
Full options + per-IDE walkthroughs in [INSTALL.md](INSTALL.md).

After install, open any project in any Claude Code-compatible
IDE — the Council fires on the next prompt.

---

## The Council in 5 paragraphs

### 1. Always-on, never bypassed

Every prompt routes through **Council Phase 0** (deep research
plus 29-question intake) → **Phase 1** (5 core divisions speak,
11 extended divisions auto-fire on triggers) → **Phase 2**
(consensus + named tiebreakers) → **Phase 3** (implementation plus
post-write verification). Abbreviated mode is a speed knob, not
a skip switch. Bypass attempts are audit-logged.

### 2. Five core divisions, eleven extended

```text
┌─ CORE FIVE ─ always engage on every task ─────────────────────┐
│                                                               │
│   1. Architecture & Planning   │   architect, planner          │
│   2. Implementation & Build    │   build-resolvers, refactor   │
│   3. Quality & Review          │   code-reviewer, lang-revs    │
│   4. Security                  │   security-reviewer           │
│   5. Testing & QA              │   tdd-guide, e2e-runner       │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌─ EXTENDED ELEVEN ─ auto-fire on trigger rulesets ─────────────┐
│                                                               │
│    6. Compliance & Legal       │  PII, GDPR, CCPA, HIPAA, PCI │
│    7. Product, UX & CX         │  UI files, copy, a11y, i18n  │
│    8. Operations & Reliability │  runbooks, SLO, deploy, IaC  │
│    9. Data & Analytics         │  schema, events, ETL, PII    │
│   10. Finance & FinOps         │  pricing, cloud cost, ROI    │
│   11. Risk Management          │  blast radius, DR, destruct  │
│   12. Strategy & Innovation    │  new features, ADRs, vendors │
│   13. People & Culture         │  CODEOWNERS, onboarding, DX  │
│   14. Sustainability & ESG     │  carbon, supplier ethics     │
│   15. Ethics & Responsible AI  │  ML, LLM, bias, fairness     │
│   16. Communications & Docs    │  README, CHANGELOG, API docs │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 3. Veto authority is explicit

| Disagreement type | Decided by |
| --- | --- |
| Technical (architecture vs implementation) | **Division 1** (Architecture) — casting vote |
| Security BLOCKER | **Division 4** (Security) — VETO |
| Regulatory finding (GDPR / CCPA / HIPAA / PCI / SOC2) | **Division 6** (Compliance) — VETO |
| AI safety / fairness / bias | **Division 15** (Ethics) — VETO |
| Blast radius exceeds scope | **Division 11** (Risk) — VETO |
| Anything else unresolved | Escalate to user with named options |

### 4. Verify-before-claim is the law

Every `"done"` / `"shipped"` / `"complete"` / `"100%"` phrase
MUST be preceded — in the same turn — by a verification action
that produced the evidence. The verification block IS the proof.
Claims without proof are downgraded to *"implemented —
verification deferred to X"* with a named unblock task.

### 5. Continuous learning is mandatory

Every Council-mediated task emits a learning candidate to
`~/.claude/audits/learning-events.jsonl`. Candidates that appear
in 2+ workspaces are eligible for promotion to global. Rules
contradicted ≥5 times in 30 days are flagged for refresh. The
system improves itself with every interaction.

---

## What's in the box

| Surface | Path | Count | What it does |
| --- | --- | --- | --- |
| **Doctrine** | `CLAUDE.md` | 1 | The Council protocol — loaded into every session |
| **Common rules** | `rules/common/` | 74 | Cross-language standards (OWASP / NIST / ISO / WCAG / GDPR) |
| **Language packs** | `rules/<lang>/` | 21 | Go, TS, Python, Java, Kotlin, Rust, Ruby, Swift, Dart, C#, C/C++, SQL, Lua, Bash, Markdown, YAML, Dockerfile, Terraform, HTML/CSS, Solidity |
| **Skills** | `skills/` | 99 | Principal-level skills with standards-cited patterns, anti-patterns, verification |
| **Agents** | `agents/` | 32 | Specialist agents organised into the 16 Council divisions |
| **Commands** | `commands/` | 33 | Slash commands — `/learn`, `/evolve`, `/instinct-status`, and more |
| **Hooks** | `hooks/` + `scripts/hooks/` | — | PreToolUse + PostToolUse + UserPromptSubmit — mechanical enforcement |
| **Templates** | `templates/` | — | Project-scaffold template plus per-IDE config templates |
| **Bootstrap** | `bootstrap/` | 6 | install.sh, install.ps1, verify.sh, verify.ps1, uninstall.sh, uninstall.ps1 |
| **Docs** | `docs/` | 7 | Architecture, Council, Rules, Skills, Agents, Project-bootstrap, Contributing |
| **Tests** | `tests/` | 3 | Repo-side gates — link integrity, no orphans, standards citations |
| **CI** | `.github/workflows/` | — | Runs all three tests on every push and PR |

---

## Documentation map

Pick where to start based on what you want to do:

| You want to... | Read |
| --- | --- |
| **Install on your machine** | [INSTALL.md](INSTALL.md) |
| **Understand the architecture** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Learn the 16-division Council** | [docs/COUNCIL.md](docs/COUNCIL.md) |
| **Browse the rules catalog** | [docs/RULES.md](docs/RULES.md) |
| **Browse the skills catalog** | [docs/SKILLS.md](docs/SKILLS.md) |
| **Browse the agents catalog** | [docs/AGENTS.md](docs/AGENTS.md) |
| **Set up a new project** | [docs/PROJECT-BOOTSTRAP.md](docs/PROJECT-BOOTSTRAP.md) |
| **Add a rule / skill / agent** | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| **Run the safety nets** | [tests/](tests/) |
| **See what changed in v1.0.0** | [CHANGELOG.md](CHANGELOG.md) |
| **See the architecture** | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

---

## Cross-IDE support

The configuration is IDE-agnostic at the `~/.claude/` layer.
Bootstrap scripts auto-detect installed IDEs and provide opt-in
integration templates.

| IDE | Status | Integration |
| --- | --- | --- |
| **VS Code** | First-class | `templates/ide-configs/vscode/` — settings + recommended extensions |
| **Cursor** | First-class | `templates/ide-configs/cursor/` — VS Code-compatible config |
| **Windsurf** | First-class | `templates/ide-configs/windsurf/` — settings + recommended extensions |
| **JetBrains** (IntelliJ / GoLand / PyCharm / WebStorm / PhpStorm / RubyMine / RustRover / CLion) | First-class | Anthropic's **Claude Code [Beta]** plugin from JetBrains Marketplace plus the shim in `templates/ide-configs/jetbrains/` |
| **Neovim / Emacs** / other terminal-first editors | Best-effort | The `claude` CLI loads `~/.claude/` regardless of editor |

Per-IDE walkthroughs live in [INSTALL.md](INSTALL.md).

---

## With vs without

<table>
<tr><th width="50%">Without The Claude Council</th><th width="50%">With The Claude Council</th></tr>
<tr>
<td valign="top">

- One generalist agent, one perspective per prompt
- Implicit rules — different in every project
- Vague "done" claims
- No mechanical lint / security / discard gates
- Provider integrations built from npm READMEs
- Project memory + learnings scattered or lost
- Every project starts from a blank `.claude/`
- Documentation drift the moment code changes

</td>
<td valign="top">

- 16 divisions speak on every prompt
- Same standards (OWASP / NIST / ISO / WCAG / GDPR) everywhere
- `"done"` requires same-turn verification — or it's downgraded
- Hook-enforced gates reject discards / suppressions / secrets at edit time
- Provider research mandatory before first handler — primary sources only
- Workspace `.claude/` auto-spawned with rules, skills, plans, memory, audits
- Continuous learning promotes cross-project patterns to global
- `docs-sync-with-code.md` gates ship the doc update in the same PR

</td>
</tr>
</table>

---

## Verification status

```text
═══════════════════════════════════════════════════════════════
       THE CLAUDE COUNCIL  ·  v1.0.0  ·  VERIFICATION BLOCK
═══════════════════════════════════════════════════════════════

  Common rules .............................. 73 / 73    PASS
  Language-specific rule subfolders ......... 20 + common PASS
  Skills passing principal-level audit ...... 99 / 99    PASS
  Agents with complete frontmatter .......... 32 / 32    PASS
  Slash commands ............................ 33         PASS
  Broken cross-references ................... 0          PASS
  Workspace contamination in global ......... 0          PASS
  Council divisions ......................... 5 core + 11 extended

  Phase 9 synthetic Council task ............ PASS
  (multi-tenant rate-limiting end-to-end through Phase 0-1-2)

═══════════════════════════════════════════════════════════════
```

Re-run any time with `./bootstrap/verify.sh --verbose`.

---

## Contributing

This repo is configuration for *your* Claude Code. Treat your
local clone as the source of truth, send PRs upstream when you
discover patterns worth sharing.

Adding a rule / skill / agent:

1. Read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
2. Author against the principal-level template.
3. Cite ≥3 standards matching the audit regex
   `(RFC [0-9]+|ISO/IEC|NIST|OWASP|WCAG|W3C|§|PEP [0-9]+|SLSA|CWE|JEP|SE-[0-9])`.
4. Add anti-patterns table + cross-references + verification checklist.
5. Run `tests/verify-standards-citations.sh` locally.
6. Send a PR — CI runs the three safety nets automatically.

The rule placement decision (global vs project) lives in
[`rules/common/rule-authoring-global-vs-project.md`](rules/common/rule-authoring-global-vs-project.md).

---

## License and acknowledgements

Released under [**MIT**](LICENSE). Use it personally, share with
your team, fork it for your org — no restrictions.

Built on top of [Anthropic's Claude
Code](https://docs.claude.com/claude-code). The Council protocol,
principal-level mandate, 16-division structure, and continuous
learning loop are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
and [docs/COUNCIL.md](docs/COUNCIL.md).

The rules and skills cite primary-source standards from OWASP,
NIST, ISO, IEC, IEEE, W3C, IETF (RFCs), IFRS, FASB, ITIL, and
others — which remain the property of their respective standards
bodies. This repo is a configuration layer; it does not
redistribute or modify any standard.

---

<div align="center">

**The Claude Council** · *v1.0.0* · *<a href="LICENSE">MIT</a>*

[Architecture](docs/ARCHITECTURE.md) ·
[Council](docs/COUNCIL.md) ·
[Rules](docs/RULES.md) ·
[Skills](docs/SKILLS.md) ·
[Agents](docs/AGENTS.md) ·
[Bootstrap](docs/PROJECT-BOOTSTRAP.md) ·
[Contributing](docs/CONTRIBUTING.md) ·
[Changelog](CHANGELOG.md)

</div>
