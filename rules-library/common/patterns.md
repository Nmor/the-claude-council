# Common Patterns

> **First check: does it already exist?** Per
> `~/.claude/rules/common/reuse-first.md`, every new component /
> function / class / module starts with a sweep of the existing
> codebase + vetted dependencies. Hand-rolling a parallel
> implementation of an existing primitive is the most common
> source of maintenance debt. Apply the rule of three: implement
> inline on the first occurrence; extract a shared primitive on
> the second; never reach the third.

## Skeleton Projects

When implementing new functionality:

1. Search for battle-tested skeleton projects
2. Use parallel agents to evaluate options:
   - Security assessment
   - Extensibility analysis
   - Relevance scoring
   - Implementation planning
3. Clone best match as foundation
4. Iterate within proven structure

## Design Patterns

### Repository Pattern

Encapsulate data access behind a consistent interface:

- Define standard operations: findAll, findById, create, update, delete
- Concrete implementations handle storage details (database, API, file, etc.)
- Business logic depends on the abstract interface, not the storage mechanism
- Enables easy swapping of data sources and simplifies testing with mocks

### API Response Format

Use a consistent envelope for all API responses:

- Include a success/status indicator
- Include the data payload (nullable on error)
- Include an error message field (nullable on success)
- Include metadata for paginated responses (total, page, limit)

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- New component / function / class introduced without sweep against `reuse-first.md` (existing primitive missed)
- Rule of three violated — third occurrence of same shape without extraction (parallel implementations growing)
- Response envelope inconsistent across handlers (different success indicators, different error shapes)
- Repository pattern implemented as one giant class instead of per-aggregate interface (pattern misuse)
- Skeleton-project evaluation skipped on a non-trivial new feature (sub-agent parallelisation gap)
- Pattern catalog gap: a recurring shape (e.g., outbox, saga, CQRS, fanout) absent from this file

**Refinement candidates**:

- New pattern entry when a recurring architectural shape (event-sourcing, sidecar, ambassador, anti-corruption layer) emerges
- Tightening of the rule-of-three threshold when twin parallel implementations cause defect drift
- New response-envelope field when a recurring metadata need (rate-limit headers, request-id, deprecation notice) emerges
- New cross-reference when a sister rule (api-design skill, error-codes, idempotency) provides the canonical envelope shape
