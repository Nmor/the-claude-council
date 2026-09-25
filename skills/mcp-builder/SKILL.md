---
name: mcp-builder
description: Build production-grade Model Context Protocol (MCP) servers — stdio + streamable HTTP transports, tool / resource / prompt primitives, capability negotiation, auth model, idempotency, observability, testing via MCP Inspector, 10-question evaluation framework. Use when designing a new MCP server to expose an internal API / data source / workflow as a Claude (or any MCP client) tool. Sister to install-allowlist.md (publisher gates for downstream consumers), secrets-management.md (no secrets in MCP code), api-design.md (tool surface design), idempotency.md (safe retries on tool calls).
---

# mcp-builder — Building Production-Grade MCP Servers

> **Size budget: 25 KB.** Check: `wc -c`. Gate: `node ~/.claude/scripts/token-budget.mjs --check`
>
> Principal-level guide for authoring MCP servers. Auto-fires when
> work touches `mcp-server/**`, `mcp_servers/**`, `*.mcp.json`,
> files importing `@modelcontextprotocol/sdk` (TypeScript) or
> `mcp` / `fastmcp` (Python), or any task described as
> "build an MCP server / MCP tool / MCP integration".

## Reference map

The detail lives in `references/`, loaded only when the topic is needed. Read the row that
matches the task rather than the whole directory.

| Topic | Reference |
| --- | --- |
| Process — 4 phases | [`references/process-4-phases.md`](references/process-4-phases.md) |
| Core patterns | [`references/core-patterns.md`](references/core-patterns.md) |
| Security + supply-chain considerations | [`references/security-supply-chain-considerations.md`](references/security-supply-chain-considerations.md) |

## Purpose

The Model Context Protocol (MCP) is the canonical interface for
exposing tools, resources, and prompts to LLM agents. A well-built
MCP server lets Claude (or any MCP-compatible client) invoke real
operations against your APIs, databases, internal services, or
workflows with predictable schemas, structured errors, and safe
retry semantics.

This skill covers the FULL build lifecycle — research +
implementation + review + evaluation — at the depth required for a
server that ships to production and gets consumed by agents whose
failure modes are expensive (cost amplification, data corruption,
side-effect duplication).

## When to use

- Building an MCP server that wraps an internal API / database /
  workflow for agent consumption
- Migrating an existing custom integration layer to MCP for
  standardisation
- Designing a new tool surface for org-internal agents
- Refactoring an existing MCP server that has surface-area /
  context / error-shape problems
- Evaluating whether MCP is the right interface vs a direct SDK
  call, REST API, or function call

## When NOT to use

- **An MCP server already exists** that covers the use case —
  consume it instead (per `~/.claude/rules-library/common/reuse-first.md`)
- The workload is a one-time script — write the script, not an
  MCP server
- The integration is purely intra-process (one app calling another
  in the same runtime) — use direct SDK
- The consumer is NOT an LLM agent — use a normal HTTP / RPC API

## Standards cited

- **MCP Specification** (modelcontextprotocol.io) — current
  draft + stable revisions
- **Anthropic Agent Skills v1.0 spec** (Dec 2025) — open standard
  that MCP builders frequently pair with
- **JSON-RPC 2.0** (jsonrpc.org/specification) — the wire protocol
  MCP rides on
- **JSON Schema Draft 2020-12** — input / output schema validation
- **RFC 9110 §9.2.2** — idempotency semantics for tool calls
  (sister: `~/.claude/rules-library/common/idempotency.md`)
- **W3C Trace Context** — for distributed tracing through MCP
  servers (sister: `~/.claude/rules-library/common/observability.md`)
- **OAuth 2.1** — when the MCP server fronts a third-party API
  that requires user-scoped auth

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Tool name not prefixed with server identity (`create_user`) | Prefix: `shop_create_user`, `crm_create_user` — disambiguates when agent has multiple servers loaded |
| `inputSchema` accepts `any` / unconstrained `object` | Define every field with type + constraint + description |
| Tool returns raw API response without sanitisation | Strip sensitive fields (PII, secrets) before returning; transform to a documented `outputSchema` |
| Single mega-tool with 30 parameters | Split into named tools per use case (`shop_search_orders` vs `shop_get_order_by_id`) |
| Server logs unstructured `console.log` | Structured logger with required fields (per `~/.claude/rules-library/common/observability.md`) |
| Auth checked once at startup, never per-request | Per-request auth check; revoked tokens fail fast |
| `outputSchema` omitted on structured returns | Define it — lets the client + LLM both reason about shape before parsing |
| Tools fire-and-forget side effects (email, payment) without idempotency key | Always require an idempotency_key on side-effecting tools (per `~/.claude/rules-library/common/idempotency.md`) |

## Verification checklist

```text
MCP server build (this turn):
  - MCP spec read for target version + cited in docs/provider-research/mcp.md
  - Transport selected + rationale documented (stdio | streamable HTTP)
  - Every tool has: name, description ≤ 3 sentences, inputSchema, outputSchema, annotations
  - Structured logger wired with request_id + trace_id + tool name + duration_ms + error_code
  - Stable error codes per ~/.claude/rules-library/common/error-codes.md
  - No secrets in source; vault-retrieval pattern per secrets-management.md
  - Rate limit + circuit breaker on every downstream call
  - Idempotency keys on side-effecting tools
  - MCP Inspector smoke test PASSED on every tool
  - 10-question eval set written + run against the server
  - Pass rate ≥ 80% on the eval set
  - tsc --strict / mypy --strict: zero errors
  - eslint --max-warnings 0 / ruff check --select=ALL: zero
  - Coverage ≥ 90% on touched files (per extreme-lint-policy.md)
```

## Cross-references

- `~/.claude/rules-library/common/install-allowlist.md` — MCP publisher
  allowlist (consumer side)
- `~/.claude/rules-library/common/secrets-management.md` — vault-only
  secret retrieval
- `~/.claude/rules-library/common/error-codes.md` — stable error code
  registry
- `~/.claude/rules-library/common/error-handling-with-context.md` —
  wrapping + structured logging
- `~/.claude/rules-library/common/idempotency.md` — side-effecting tools
  require idempotency keys
- `~/.claude/rules-library/common/rate-limiting.md` — protect downstreams
- `~/.claude/rules-library/common/circuit-breaker.md` — open the breaker
  on cascading failures
- `~/.claude/rules-library/common/observability.md` — structured logs +
  metrics + traces
- `~/.claude/rules-library/common/api-versioning.md` — version the tool
  surface
- `~/.claude/rules-library/common/contract-testing.md` — contract tests
  prevent silent breakage
- `~/.claude/rules-library/common/local-testability.md` — every tool
  testable locally before claim
- `~/.claude/rules/common/principal-level-mandate.md` — the
  template this skill follows
- `~/.claude/skills/api-design/SKILL.md` — tool surface design
  principles
- `~/.claude/skills/observability-patterns/SKILL.md` — logger
  shape + metric naming
- `~/.claude/skills/claude-api/SKILL.md` — building Claude API
  apps; MCP is the tool layer beneath
- `~/.claude/skills/aws-serverless-patterns/SKILL.md` — when MCP
  server runs as a Lambda
- Reference implementations:
  `github.com/anthropics/skills/tree/main/skills/mcp-builder`
  (Apache-2.0)
- `github.com/modelcontextprotocol/typescript-sdk`
- `github.com/modelcontextprotocol/python-sdk`

## Why this skill exists

MCP is the canonical interface for tool exposure to agents in
2026. Building one without a structured process produces servers
with:

- Vague tool descriptions that LLMs can't reliably choose
  between
- Untyped inputs that fail mid-execution
- Raw error strings agents can't recover from
- Missing annotations that force clients to treat every call as
  destructive
- No idempotency on side-effecting operations → duplicate
  charges, duplicate emails, corrupted state when an agent
  retries on timeout
- No evaluations → "works in dev, fails in real usage" without
  anyone noticing until production

The cost of the 4-phase discipline is one focused day. The cost
of skipping it is a server that other teams refuse to consume
and that the original author has to keep fixing as agents find
new ways to misuse the loose surface.

## Standards Cited

- **Model Context Protocol Specification (modelcontextprotocol.io)** —
  Stdio + Streamable HTTP transports, capability negotiation,
  tool / resource / prompt primitives, JSON-RPC 2.0 message
  envelope
- **JSON-RPC 2.0 Specification** — Request / response / notification
  envelope MCP wraps
- **JSON Schema Draft 2020-12** — Tool input + output schema
  validation (every MCP tool MUST declare a schema)
- **OAuth 2.1 + RFC 7591 (Dynamic Client Registration) + RFC 8628
  (Device Authorization)** — Authentication for remote MCP servers
- **OWASP ASVS 4.0.3 §V13.1** — Generic web service security (MCP
  server ↔ client contract)
- **OWASP Top 10 for LLM Applications (2025) LLM06 Excessive
  Agency + LLM10 Unbounded Consumption** — MCP tool annotations
  (`readOnlyHint`, `destructiveHint`, `idempotentHint`) limit
  agency; rate-limiting addresses unbounded consumption
- **NIST SP 800-218 SSDF §PW.4** — Reuse + third-party software
  considerations (MCP server is a supply-chain attachment)
- **NIST SP 800-53 Rev 5 §AC-6** — Least privilege (tool scope
  - capability negotiation enforce this)
- **CWE-1059** — Insufficient technical documentation (tool
  descriptions are the LLM's only context)
- **CWE-1284** — Improper validation of specified quantity in
  input (every MCP tool argument validated against its schema)
- **`~/.claude/rules-library/common/install-allowlist.md`** — Publisher
  trust gate before registering a new MCP

## Cross-References

- `api-design` skill — tool surface design (request / response
  shapes, idempotency, error envelopes)
- `prompt-engineering` skill — prompt + resource primitive design
- `~/.claude/agents/security-reviewer.md` — auth model + prompt-
  injection surface review
- `~/.claude/agents/code-reviewer.md` — Zod / JSON Schema
  correctness + annotation discipline
- `~/.claude/agents/architect.md` — transport choice (stdio vs
  streamable HTTP), single-server vs federated design
- `~/.claude/rules-library/common/install-allowlist.md` — publisher
  allowlist
- `~/.claude/rules-library/common/error-handling-with-context.md` — MCP
  error envelope shape

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Tool that mutates without `destructiveHint: true` | LLM may invoke destructively without confirmation | Annotate every mutator; flag DROP / DELETE / archive ops |
| Returning unstructured prose from tools | LLM has to re-parse; brittle to phrasing changes | Structured response with stable keys; per `api-design` envelope |
| Single-shot tool call for multi-step workflow | LLM cannot recover from intermediate failures | Decompose into smaller tools; use resources for state |
| Server holds secrets in plain-text config | Source-control leak risk | Vault / Keychain; per `secrets-management.md` |
| Tool description over 1000 tokens | Bloats every prompt; reduces effective context | Concise description; link to canonical docs for detail |
| Server makes outbound calls without rate-limiting | DoS amplification surface | Rate-limit per `~/.claude/rules-library/common/rate-limiting.md` |
| Tool args validated only at server, not in schema | Bad LLM calls produce confusing errors | Schema-validate at the boundary; reject with clear error |
| Logs tool inputs in plaintext | Sensitive PII / secrets leak | Redact per `log-levels.md`; structured fields only |
| New MCP installed without source review | Supply-chain attack surface | Publisher allowlist per `install-allowlist.md` |

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New MCP server shipped without an `evals/` directory + 10-question eval set (Phase 4 weakening)
- Tool name without server-identity prefix (`create_user` instead of `shop_create_user`) — collision
  risk when multiple MCPs loaded
- Tool description > 3 sentences OR generic ("Get user info") — LLM-selection ambiguity
- `inputSchema` permits `any` / unconstrained `object` (Phase 2 schema discipline weakening)
- `outputSchema` omitted on a structured-return tool (LLM cannot pre-reason about shape)
- Side-effecting tool missing `idempotency_key` parameter (sister rule `idempotency.md` weakening)
- Annotations missing (`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint` all
  defaulted) — client UX degrades to "everything is destructive"
- Server logs `console.log` instead of structured logger (sister rule `observability.md` weakening)
- New tool added without contract test (sister rule `contract-testing.md` weakening)
- MCP Inspector smoke skipped before claiming done (Phase 3 verification weakening)
- Same eval question fails > 3 times across iterations — tool surface is genuinely too hard for the
  LLM

**Refinement candidates**:

- New transport row when MCP gains an additional canonical transport beyond stdio + streamable HTTP
- New annotation entry when the MCP spec adds further hint fields (e.g., cost / latency / scope
  hints)
- New pattern entry when a recurring failure mode emerges (e.g., agent retry storms, context-budget
  blowups)
- Tightening of the "≥ 80% eval pass rate" threshold when production usage shows the bar should be
  higher
- New cross-reference when a sister rule (auth boundary, schema evolution, error-codes) adds a
  load-bearing gate for MCP authors
- New per-language SDK row when an MCP SDK ships in a new language (Go, Rust, Java)
