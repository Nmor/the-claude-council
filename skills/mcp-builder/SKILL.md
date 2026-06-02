---
name: mcp-builder
description: Build production-grade Model Context Protocol (MCP) servers — stdio + streamable HTTP transports, tool / resource / prompt primitives, capability negotiation, auth model, idempotency, observability, testing via MCP Inspector, 10-question evaluation framework. Use when designing a new MCP server to expose an internal API / data source / workflow as a Claude (or any MCP client) tool. Sister to install-allowlist.md (publisher gates for downstream consumers), secrets-management.md (no secrets in MCP code), api-design.md (tool surface design), idempotency.md (safe retries on tool calls).
---

# mcp-builder — Building Production-Grade MCP Servers

> Principal-level guide for authoring MCP servers. Auto-fires when
> work touches `mcp-server/**`, `mcp_servers/**`, `*.mcp.json`,
> files importing `@modelcontextprotocol/sdk` (TypeScript) or
> `mcp` / `fastmcp` (Python), or any task described as
> "build an MCP server / MCP tool / MCP integration".

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

## Process — 4 phases

### Phase 1: Research + plan

Before writing a single tool definition:

1. **Read the MCP spec for the version you're targeting.**
   Sitemap: `modelcontextprotocol.io/sitemap.xml`. Fetch specific
   pages with `.md` suffix for clean markdown.
2. **Identify the consumer model.** Are you building for a single
   LLM client (Claude only, internal agent only) or a multi-client
   surface? Multi-client constrains the design (lowest-common-
   denominator capabilities, stricter schemas).
3. **Inventory the target API.** Endpoints, auth model, rate
   limits, idempotency support, error taxonomy. Per
   `~/.claude/rules/common/official-docs-first.md`, cite the
   primary docs in `docs/provider-research/<provider>.md`.
4. **Tool surface design — coverage vs workflows.** Two valid
   approaches:
   - **Comprehensive API coverage**: one tool per endpoint;
     compose at the agent layer. Default for clients that excel at
     code execution / composition.
   - **Workflow tools**: higher-level "place_order_with_checkout"
     tools that bundle 3-5 API calls. Default for clients that
     prefer terse, named primitives.
   When uncertain, ship coverage; add workflow tools later when
   usage shows a recurring composition.
5. **Transport selection**:
   - **stdio** — local servers (CLI tools, dev environments,
     single-host deployments). Simplest, no network surface.
   - **Streamable HTTP** with stateless JSON — remote servers,
     multi-tenant deployments. Scales horizontally; easier to
     observe + secure.
   - Avoid stateful sessions when stateless suffices (operational
     simplicity).

### Phase 2: Implementation

#### Project structure

```
my-mcp-server/
├── README.md
├── package.json (or pyproject.toml)
├── tsconfig.json (or pyproject [tool.ruff] / [tool.mypy])
├── src/
│   ├── server.ts       # main MCP server bootstrap
│   ├── tools/          # one file per tool family
│   │   ├── orders.ts
│   │   └── payments.ts
│   ├── resources/      # one file per resource type
│   ├── prompts/        # one file per prompt template
│   ├── auth.ts         # auth strategy (OAuth, API key, etc.)
│   ├── transport.ts    # stdio / HTTP wiring
│   └── observability.ts # structured logs + metrics + traces
├── tests/
│   ├── tools.test.ts
│   └── integration.test.ts
└── evals/
    └── eval-questions.xml  # 10-question eval set (see Phase 4)
```

#### Tool definition (the principal-level shape)

Every tool gets:

| Field | Requirement |
| --- | --- |
| **name** | `<server>_<verb>_<noun>` convention. Stable forever; never rename. |
| **description** | One sentence stating purpose + when to use. Used by the LLM to decide whether to call. Make it specific, not generic. |
| **inputSchema** | JSON Schema (Zod for TS, Pydantic for Python). Every parameter named + typed + described + constrained. Include `examples` in field descriptions. |
| **outputSchema** | Define wherever the response shape is structured. Lets clients pre-validate + lets the LLM reason about the result before the call. |
| **annotations** | `readOnlyHint` (true/false) + `destructiveHint` + `idempotentHint` + `openWorldHint`. Determines whether agents auto-confirm or require user approval. |
| **error envelope** | Stable `error_code` per `~/.claude/rules-library/common/error-codes.md`. Never raw stack traces. |

#### Tool implementation pattern (TypeScript)

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const PlaceOrderInput = z.object({
  customer_id: z.string().uuid().describe("Customer's UUID. Get via list_customers."),
  items: z.array(z.object({
    sku: z.string().describe("Product SKU."),
    quantity: z.number().int().min(1).max(1000),
  })).min(1).describe("Line items; at least one required."),
  idempotency_key: z.string().uuid().describe("Per RFC 9110 §9.2.2. Caller-generated UUID; replay-safe."),
});

server.registerTool({
  name: "shop_place_order",
  description: "Place an order for a customer. Idempotent on `idempotency_key` for 24h.",
  inputSchema: PlaceOrderInput,
  outputSchema: z.object({
    order_id: z.string(),
    status: z.enum(["pending", "paid", "shipped"]),
    total_cents: z.number().int(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
}, async (input, ctx) => {
  const log = ctx.logger.child({
    tool: "shop_place_order",
    request_id: ctx.request_id,
    customer_id: input.customer_id,
  });

  try {
    const order = await api.placeOrder(input, {
      idempotencyKey: input.idempotency_key,
    });
    log.info("order placed", { order_id: order.id });
    return {
      content: [{ type: "text", text: `Placed order ${order.id}` }],
      structuredContent: {
        order_id: order.id,
        status: order.status,
        total_cents: order.total_cents,
      },
    };
  } catch (err) {
    log.error("place order failed", { error: String(err) });
    throw new ToolError("place_order_failed", "Could not place the order.", {
      cause: err,
      retryable: isRetryable(err),
    });
  }
});
```

#### Core infrastructure to build once

- **Structured logger** (per `~/.claude/rules-library/common/observability.md`):
  request_id, trace_id, tool name, user_id (when available),
  duration_ms, error_code
- **Error envelope** with stable codes (per
  `~/.claude/rules-library/common/error-codes.md`)
- **Pagination helper** (cursor-based per
  `~/.claude/rules-library/common/api-versioning.md`)
- **Auth boundary** (per `~/.claude/rules-library/common/secrets-management.md`
  — secrets from vault, never source)
- **Idempotency cache** (per `~/.claude/rules-library/common/idempotency.md`)
- **Rate limit + circuit breaker** wrapping every downstream call
  (per `~/.claude/rules-library/common/rate-limiting.md` +
  `~/.claude/rules-library/common/circuit-breaker.md`)

### Phase 3: Review + test

#### Quality checklist

- [ ] No duplicated tool code (DRY — shared API client, shared
      error envelope)
- [ ] Every tool has a structured outputSchema where the response
      shape is non-trivial
- [ ] Every tool has annotations set (no defaults — explicit)
- [ ] Every error path emits a stable `error_code` + structured
      log + (where applicable) metric
- [ ] No secrets in source (per
      `~/.claude/rules-library/common/secrets-management.md`)
- [ ] No raw user input concatenated into shell / SQL / file
      paths (per `~/.claude/rules-library/common/security.md` A03 + A10)
- [ ] Every tool description ≤ 3 sentences (LLMs read all
      descriptions every request)
- [ ] Every input field has a `describe()` / `description` —
      LLMs use these to fill parameters

#### Testing

- **Unit**: Vitest / pytest per tool — input schema validation,
  happy path, every named error path
- **Integration**: real downstream service via Testcontainers OR
  recorded fixtures (per `~/.claude/rules-library/common/local-testability.md`)
- **MCP Inspector**: interactive test harness — `npx
  @modelcontextprotocol/inspector` (TS) — exercise every tool
  through the wire protocol before declaring done
- **Static analysis**: TypeScript strict + ESLint with
  `@typescript-eslint/strict-type-checked` + `sonarjs/recommended`;
  OR `mypy --strict` + `ruff check --select=ALL`
- **Contract test**: schema + a sample request/response pair for
  every tool — verifies the server keeps its published contract
  across versions (per `~/.claude/rules-library/common/contract-testing.md`)

### Phase 4: Evaluation (10 questions)

An MCP server isn't done until you've proven an LLM can actually
USE it to accomplish realistic tasks. Build a 10-question eval
set:

Each question MUST be:

| Property | Definition |
| --- | --- |
| **Independent** | Doesn't depend on a previous question's answer |
| **Read-only** | Only non-destructive operations required (so eval is repeatable + safe to run against prod) |
| **Complex** | Requires 3-7 tool calls + reasoning; no single-call trivia |
| **Realistic** | Based on what humans actually ask, not contrived |
| **Verifiable** | Single answer that string-compares cleanly |
| **Stable** | Answer doesn't change over time (no "today's date", no "current price") |

Format:

```xml
<evaluation>
  <qa_pair>
    <question>For orders placed in the EU region in 2026 Q1, which customer placed the highest-value order, and what was the order total in EUR?</question>
    <answer>Klara Müller: EUR 12450.00</answer>
  </qa_pair>
  <!-- 9 more -->
</evaluation>
```

Run the eval against a Claude (or other MCP-compatible) client
that has access to your server only. Score: pass / fail per
question. The pass rate is the headline quality metric.

## Core patterns

### Pattern 1: Tool description is for the LLM, not for docs

The tool description is read by the LLM EVERY time it decides
whether to call a tool. Make it:

- Specific about INPUTS (when the LLM has the right inputs)
- Specific about OUTCOME (what the call achieves)
- Honest about COST + SIDE EFFECTS (e.g., "idempotent for 24h",
  "rate-limited to 10/min", "sends an email — confirm with user
  before calling")

A description like "Get user info" is too generic — every
get-user tool in every MCP server matches. Use
"Fetch a customer's profile + recent orders + billing address.
Cached 5 min."

### Pattern 2: Errors guide the LLM to recovery

Bad: `"error": "Failed"` — agent has no idea what to do next.

Good:

```json
{
  "error_code": "rate_limited",
  "message": "Hit the upstream rate limit. Retry after 30 seconds.",
  "details": { "retry_after_seconds": 30 }
}
```

The agent can read `error_code`, branch on it, and retry / fall
back / surface to user. Per
`~/.claude/rules-library/common/error-codes.md` — stable codes only.

### Pattern 3: Pagination + filter early

Returning 10,000 records in a single tool response blows out the
agent's context window AND the cost. Default to pagination
(cursor-based) + filter parameters that let the agent narrow
results before fetching. Return ≤ 50 records per call.

### Pattern 4: Annotations drive UX

`readOnlyHint: true` → clients can auto-approve.
`destructiveHint: true` → clients require explicit user
confirmation.
`idempotentHint: true` → clients can safely retry on timeout.

These hints are not optional — they're the contract that lets
clients build safe UX around your tools.

### Pattern 5: Version the wire surface, not just the code

Treat your MCP server like any public API (per
`~/.claude/rules-library/common/api-versioning.md`). Tool names are
permanent; tool signatures evolve additively. Breaking changes
mean a new server name (e.g., `shop-v2`), not a renamed tool.

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

```
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
  + capability negotiation enforce this)
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
- Tool name without server-identity prefix (`create_user` instead of `shop_create_user`) — collision risk when multiple MCPs loaded
- Tool description > 3 sentences OR generic ("Get user info") — LLM-selection ambiguity
- `inputSchema` permits `any` / unconstrained `object` (Phase 2 schema discipline weakening)
- `outputSchema` omitted on a structured-return tool (LLM cannot pre-reason about shape)
- Side-effecting tool missing `idempotency_key` parameter (sister rule `idempotency.md` weakening)
- Annotations missing (`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint` all defaulted) — client UX degrades to "everything is destructive"
- Server logs `console.log` instead of structured logger (sister rule `observability.md` weakening)
- New tool added without contract test (sister rule `contract-testing.md` weakening)
- MCP Inspector smoke skipped before claiming done (Phase 3 verification weakening)
- Same eval question fails > 3 times across iterations — tool surface is genuinely too hard for the LLM

**Refinement candidates**:
- New transport row when MCP gains an additional canonical transport beyond stdio + streamable HTTP
- New annotation entry when the MCP spec adds further hint fields (e.g., cost / latency / scope hints)
- New pattern entry when a recurring failure mode emerges (e.g., agent retry storms, context-budget blowups)
- Tightening of the "≥ 80% eval pass rate" threshold when production usage shows the bar should be higher
- New cross-reference when a sister rule (auth boundary, schema evolution, error-codes) adds a load-bearing gate for MCP authors
- New per-language SDK row when an MCP SDK ships in a new language (Go, Rust, Java)
