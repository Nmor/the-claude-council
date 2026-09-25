# mcp-builder: Core patterns

> Covers **Core patterns** for the `mcp-builder` skill. Routed from the reference map in
> `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
