# mcp-builder: Security + supply-chain considerations

> Covers **Security + supply-chain considerations** for the `mcp-builder` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Security + supply-chain considerations

When the MCP server YOU built is published:

- Sign the npm / PyPI package (provenance)
- Pin all dependencies (per
  `~/.claude/rules-library/common/dependency-pinning.md`)
- License-allowlist gate (per
  `~/.claude/rules-library/common/license-allowlist-gate.md`) — MIT /
  Apache-2.0 / BSD / ISC for the published artifact
- Document required scopes / permissions in README
- Document the data classes the server touches (PII / payment /
  health) — consumers need this for compliance review (per
  `~/.claude/rules-library/common/gdpr-ccpa.md`)

When the MCP server is being CONSUMED:

- Per `~/.claude/rules-library/common/install-allowlist.md` — Anthropic-
  official MCPs allowed; Docker official allowed; third-party
  MCPs from unknown publishers require explicit user approval
- Read the source before registering (the `command` line is
  agent-RCE if compromised)
- Verify the SHA / signed checksum when one is published
