# JetBrains IDE setup (IntelliJ IDEA / GoLand / WebStorm / PyCharm / PhpStorm / RubyMine)

> Per `~/.claude/rules-library/common/install-allowlist.md`, every plugin
> install passes through publisher review. The plugins below are
> all from verified vendors (JetBrains, Anthropic, SonarSource,
> JetBrains Marketplace verified publishers).

## 1. Claude Code [Beta] plugin (mandatory)

Install via the JetBrains Marketplace:

1. Open Settings → Plugins → Marketplace.
2. Search for "Claude Code".
3. Install the **Anthropic** publisher's version.
4. Restart the IDE.
5. Authenticate via Settings → Tools → Claude Code → Sign in.

Default keybinding: **Cmd+Esc** (macOS) / **Ctrl+Esc** (Windows /
Linux) opens the Claude Code sidebar.

## 2. Recommended plugins (per IDE)

All JetBrains products:

- **SonarLint** (SonarSource) — strict ruleset per
  `~/.claude/rules-library/common/extreme-lint-policy.md`
- **GitToolBox** (zielu) — git status in editor gutter
- **.env files support** (Borys Pierov)
- **Prettier** (JetBrains)
- **EditorConfig** (JetBrains, built-in but verify enabled)
- **Mermaid** (JetBrains) — diagram preview

Language-specific (most are built in):

- **GoLand**: Go support is built in
- **PyCharm**: Python + Django + Flask + FastAPI built in
- **WebStorm**: TypeScript + Vue + React + Angular built in
- **IntelliJ IDEA Ultimate**: Java + Spring Boot + Kotlin + Scala
  built in
- **PhpStorm**: PHP + Laravel + Symfony built in
- **RubyMine**: Ruby + Rails built in

## 3. Disable noisy plugins

Disable these by default (re-enable per-project only if needed):

- **AI Assistant** (JetBrains' built-in AI) — to avoid prompting
  competition with Claude Code; use one AI tool at a time
- **Code With Me** — unless actively pair programming

## 4. Code-style settings (per language)

Use the included `code-style/*.xml` files. Apply via:

Settings → Editor → Code Style → [Language] → Scheme → Import.

Files in this directory:

- [`code-style/typescript.xml`](code-style/typescript.xml) — TS / JS;
  2-space indent; 100-char margin; single quotes; trailing commas
- [`code-style/python.xml`](code-style/python.xml) — PEP 8;
  4-space indent; 100-char margin; Black / Ruff-aligned
- [`code-style/go.xml`](code-style/go.xml) — gofmt;
  tab indent; 120-char visual guide (no hard wrap — gofmt doesn't
  wrap)
- [`code-style/java.xml`](code-style/java.xml) — Google Java Style;
  4-space indent; 120-char margin; ordered imports

Function length / parameter count / cognitive complexity caps from
[`../../../rules/common/extreme-lint-policy.md`](../../../rules/common/extreme-lint-policy.md)
are enforced by **Inspection profiles** (SonarLint + language
linters), not by code-style schemes. Both ship together.

## 5. Keybindings

Use the included `keymap-claude.xml`:

Settings → Keymap → ⚙️ → Import Keymap from XML.

Default Anthropic mappings:

| Action | Default |
| --- | --- |
| Open Claude Code sidebar | Cmd+Esc / Ctrl+Esc |
| Quick fix from Claude | Alt+Enter (uses Claude when AI Assistant disabled) |
| Toggle Claude inline | Cmd+I / Ctrl+I |

## 6. Hardened security defaults

Settings → Appearance & Behavior → System Settings:

- **Allow plugins to access internal API**: OFF
- **Auto-update plugins**: OFF (per
  `~/.claude/rules-library/common/install-allowlist.md`)
- **Allow data sharing**: OFF (per
  `~/.claude/rules-library/common/secrets-management.md`)

Settings → Tools → Server Certificates:

- **Accept non-trusted certificates automatically**: OFF

Settings → Version Control → Git:

- **Allow force push to protected branches**: OFF
- **Sign commits and tags**: ON
- **Run commit hooks before commit**: ON
- Per `~/.claude/rules/common/plan-completion-before-push.md`,
  never push until the active plan is complete.

## 7. Install via command line

For automated setup, JetBrains products ship a CLI:

```bash
# Examples (adjust to your IDE — `idea`, `goland`, `pycharm`, etc.)
idea installPlugins anthropic.claudecode sonarlint
goland installPlugins anthropic.claudecode sonarlint
pycharm installPlugins anthropic.claudecode sonarlint ruff
webstorm installPlugins anthropic.claudecode sonarlint
```

If the `idea` / `goland` / etc. CLI is not on PATH, create the
launchers via Tools → Create Command-line Launcher inside the
running IDE.

## 8. References

- `~/.claude/rules-library/common/install-allowlist.md` — publisher
  allowlist + denylist
- `~/.claude/rules-library/common/extreme-lint-policy.md` — strictness
  thresholds the IDE inspections enforce
- `~/.claude/rules-library/common/secrets-management.md` — no telemetry,
  no auto-update of plugins
- `~/.claude/rules-library/common/git-workflow.md` — signed commits +
  hooks-before-commit
- `~/.claude/rules/common/plan-completion-before-push.md` — push
  gate
