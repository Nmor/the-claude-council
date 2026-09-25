# mcp-builder: Process — 4 phases

> Covers **Process — 4 phases** for the `mcp-builder` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 11 KB** — `token-budget.mjs --check`.

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

```text
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
