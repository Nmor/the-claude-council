# Contract Testing Rule (Always-On, Global)

> Auto-fires on every file. Sister to `api-versioning.md` (the
> contract being tested), `schema-evolution.md` (data contracts),
> `deprecation-lifecycle.md` (contracts that retire),
> `testing.md` (broader test strategy). Standards: **Pact**
> (Consumer-Driven Contracts), **OpenAPI 3.1**, **GraphQL Schema
> Registry**, **PACT spec v3+**, **Spring Cloud Contract**.

## Core Principle

**Every API consumer-producer relationship is verified by
automated contract tests that run on BOTH sides: consumers
declare what they expect; producers verify they deliver it.
Contract drift is detected at PR time, not in production at
3 AM.**

Contract tests sit between unit tests (too narrow — mock the
world) and end-to-end tests (too broad — slow + flaky). They
answer one question precisely: "Does the producer still meet the
consumer's expectations?"

## What contract tests catch

Failures that unit tests + e2e tests both miss:

- Producer renames a field; consumer still sends the old name
- Producer changes a response status (200 → 201); consumer
  switches on the status
- Producer drops a previously-optional field that the consumer
  was actually relying on
- Consumer expects a field with type `string`; producer changes
  it to `number`
- Producer adds a new required request parameter; consumer is
  unaware
- Producer changes pagination shape; consumer breaks
- Producer changes auth header format; consumer can't authenticate

These are all "the test suite was green; the deploy went out;
something downstream caught fire."

## Two flavors

### Consumer-Driven Contracts (CDC) — Pact pattern

Consumers WRITE the contract by declaring "when I send X, I
expect Y." The contracts are versioned, stored in a broker, and
producers verify against them.

**Workflow**:

1. Consumer test runs → generates contract file (JSON pact)
2. Contract is published to a broker (Pact Broker / PactFlow)
3. Producer's CI pulls the contracts of all known consumers
4. Producer runs its handlers against each consumer's
   expectations
5. If ALL pass: producer can deploy
6. If ANY fail: producer's deploy is blocked until the contract
   is renegotiated

This pattern is ideal when:

- Producer can identify all its consumers (internal teams,
  paid customers with API keys)
- Consumers can run a contract test step in their CI
- The producer can verify before deploy

### Schema-Based Contracts — OpenAPI / GraphQL / Proto

The schema is the contract. Tests verify:

- Producer responses MATCH the published schema (no drift)
- Consumer code COMPILES against the schema (generated clients)
- Schema changes are SEMVER-tracked (per `api-versioning.md`)

Tools: **Dredd**, **Schemathesis**, **Spectral** for OpenAPI;
**GraphQL Inspector**, **Apollo Studio**; **buf breaking** for
Proto.

Ideal when:

- API is public + has unknown consumers
- The schema is the canonical definition
- Generated clients flow from the schema

**Most production systems use BOTH**: schema-based contracts for
the shape, CDC contracts for the specific consumer expectations
(which optional fields they actually rely on).

## Hard rules

### 1. Every API the system exposes has contract tests

Internal-facing or external-facing — same rule. The contract
test verifies the OpenAPI / GraphQL / Proto schema reflects the
running code. CI fails if the schema and the code drift.

### 2. CDC tests gate the producer's deploy

The producer's deploy pipeline includes a step:

```yaml
- name: Verify contracts
  run: |
    pact-broker-verify \
      --provider=my-service \
      --provider-base-url=http://localhost:3000 \
      --broker-base-url=https://pact.example.com \
      --publish-verification-results=true
```

If any consumer's contract fails, deploy is blocked. The
producer either:

- Fixes the regression
- Updates the contract with the consumer (coordinated change)
- Confirms the consumer has been deprecated + remove from broker

### 3. Schema-first or code-first — pick one

Two valid workflows:

| Approach | Flow | Tooling |
| --- | --- | --- |
| **Schema-first** | Write OpenAPI/GraphQL → generate server stubs → implement handlers → tests verify match | `openapi-generator`, `graphql-codegen` |
| **Code-first** | Annotate handlers (TypeScript decorators, JSDoc) → generate OpenAPI → tests verify match | `nestjs/swagger`, `tsoa`, `swag` (Go) |

Don't mix: half-annotated handlers + half-hand-written schemas
guarantee drift.

### 4. Backward-compatible changes must pass without consumer updates

A producer adds a new optional field (additive change per
`api-versioning.md`). The existing CDC contracts MUST still
pass without consumers updating. If they don't, the change
isn't truly backward-compatible.

### 5. Breaking changes are explicit

When a producer NEEDS to break the contract:

1. Coordinate with consumer teams before changing
2. Bump the major version (per `api-versioning.md`)
3. Publish a new contract for the new version
4. Run the old version's contract tests until consumers
   migrate (deprecation runway per `deprecation-lifecycle.md`)
5. Once all consumers are on the new version, remove the old
   contract from the broker

### 6. Contracts are versioned independently

The contract file has its own version. A consumer can run on
contract v1.2 while the producer publishes contract v1.3 — as
long as v1.2's expectations are still met by v1.3 behaviour.

Multiple contract versions can coexist in the broker during
migration.

### 7. Test the error cases too

Happy-path contract tests are easy. Real contracts include:

- 4xx error responses (400 validation, 401 auth, 404 not found)
- 5xx error responses (500 internal, 503 unavailable)
- Rate-limit responses (429 with `Retry-After`)
- Pagination edges (empty, first page, last page)
- Authentication boundaries (token expired, invalid scope)

The contract test asserts the SHAPE of error responses, the
status code, and the stable `error_code` (per `error-codes.md`).

### 8. The contract is the source of truth for mocks

When consumer tests need to mock the producer, the mock is
DERIVED from the contract — not hand-written. Tools like
**Mockoon** + **Prism** + **wiremock** can serve OpenAPI
schemas + Pact contracts directly as mock endpoints.

Hand-written mocks drift from the contract; derived mocks
update automatically.

### 9. Contracts are not load tests

A passing contract test does NOT verify:

- Performance under load
- Concurrent behaviour
- Long-running connection handling
- Resource limits

Use load tests (k6, Gatling, Locust) for those. Contract tests
verify CORRECTNESS, not capacity.

### 10. The broker is part of the supply chain

Pact Broker / PactFlow / Apollo Studio / GraphQL Hive — these
services hold the contracts. Treat them with supply-chain
discipline:

- Authentication required (no public unauthenticated brokers
  in production)
- Audit logs for contract publish + verification events
- Backups (lose the broker = lose contract history)
- Per `security-controls-org-wide.md` 5-layer enforcement

## Per-stack examples

### Node.js + Pact

```typescript
// Consumer test
import { Pact } from '@pact-foundation/pact';

describe('OrderService contract', () => {
  const provider = new Pact({
    consumer: 'frontend-app',
    provider: 'order-service',
  });

  it('gets an order by id', async () => {
    await provider.addInteraction({
      state: 'order ord_123 exists',
      uponReceiving: 'a request for order ord_123',
      withRequest: {
        method: 'GET',
        path: '/orders/ord_123',
        headers: { Authorization: 'Bearer token' },
      },
      willRespondWith: {
        status: 200,
        body: {
          id: 'ord_123',
          status: 'shipped',
          total: 4250,
          currency: 'USD',
        },
      },
    });
    const order = await client.getOrder('ord_123');
    expect(order.status).toBe('shipped');
  });
});
```

### Go + Pact

```go
func TestOrderServiceContract(t *testing.T) {
    pact := dsl.Pact{
        Consumer: "frontend-app",
        Provider: "order-service",
    }
    defer pact.Teardown()

    pact.
        AddInteraction().
        Given("order ord_123 exists").
        UponReceiving("a request for order ord_123").
        WithRequest(dsl.Request{
            Method: "GET",
            Path:   dsl.String("/orders/ord_123"),
        }).
        WillRespondWith(dsl.Response{
            Status: 200,
            Body:   dsl.Match(&Order{}),
        })

    err := pact.Verify(func() error {
        _, err := client.GetOrder("ord_123")
        return err
    })
    assert.NoError(t, err)
}
```

### Schema validation (Schemathesis + OpenAPI)

```bash
schemathesis run \
  --base-url http://localhost:3000 \
  --checks all \
  http://localhost:3000/openapi.json
```

Property-based testing: Schemathesis generates random valid
requests per the schema; the producer should never return an
unexpected shape.

### GraphQL schema regression (Inspector)

```bash
graphql-inspector diff \
  schema.graphql:main \
  schema.graphql:HEAD
```

Output:

```text
⚠️  Breaking changes:
  - Field "username" was removed from type "User"
  - Argument "limit" was added to field "User.orders" (required)
```

## Anti-patterns

### Anti-pattern 1: Contract tests as e2e tests

A "contract test" that spins up the producer + the consumer + the
database + Redis is an e2e test. Real contract tests run with the
producer in isolation (or with stubs for ITS dependencies).

### Anti-pattern 2: Provider mocks the contract

Provider-side contract test mocks the consumer's expectations
rather than declaring its own behaviour → the contract drift
isn't caught.

### Anti-pattern 3: Contract test that's always green

A contract test with no assertions (or only "status is 200") is
worthless. The assertions must include the SHAPE that the
consumer actually reads.

### Anti-pattern 4: Manually maintained contracts

Contracts that aren't generated from real consumer test runs
drift from reality. Either generate from tests OR generate from
the schema; never hand-write both.

### Anti-pattern 5: Contract tests bypassed in CI

CI configured with `--allow-pact-verification-failure=true` to
keep builds green when contracts fail is identical to having no
contract tests. Failed contracts block deploys.

## Tooling

| Tool | Use |
| --- | --- |
| **Pact** | CDC across languages (Node, Java, Go, Python, Ruby, .NET, JVM) |
| **PactFlow** | Hosted Pact Broker + analytics |
| **Spring Cloud Contract** | JVM-specific CDC |
| **Schemathesis** | Property-based OpenAPI testing |
| **Dredd** | OpenAPI conformance |
| **Prism** | OpenAPI mock server (Stoplight) |
| **Mockoon** | OpenAPI / arbitrary mock server |
| **Wiremock** | HTTP service mocking |
| **GraphQL Inspector** | GraphQL schema diff |
| **Apollo Studio** | GraphQL schema registry + field-usage analytics |
| **GraphQL Hive** | OSS GraphQL registry |
| **buf** | Protobuf breaking-change detection |
| **Confluent Schema Registry** | Kafka Avro/Proto schema management |

## Cross-references

- `api-versioning.md` — the contract HAS a version
- `schema-evolution.md` — data-side schema rules (when consumers
  read from DBs / streams instead of APIs)
- `deprecation-lifecycle.md` — old contracts retire on a calendar
- `error-codes.md` — error responses are part of the contract
- `testing.md` — contract tests fit between unit + e2e
- `task-intake-due-diligence.md` Q7 (integration map), Q14 (test
  strategy)
- `feature-flags.md` — flag-controlled features need flag-aware
  contracts

## Standards cited

- **Pact specification v3+**
- **OpenAPI 3.1**
- **GraphQL Spec (October 2021)**
- **AsyncAPI 3.0** — for event-stream contracts
- **Protocol Buffers Style Guide** — proto-level versioning
- **JSON Schema Draft 2020-12** — schema definition

## Why this rule exists

Without contract tests, the typical failure mode:

1. Backend team renames a field "for clarity"
2. Backend's own tests pass (they updated everywhere)
3. Backend deploys to staging
4. Frontend integration tests pass (they cached the old shape)
5. Backend deploys to prod
6. Frontend starts returning errors at 3 AM
7. On-call diagnoses; rollback or hotfix

Contract tests catch this at step 2:

- Backend's PR runs the verification step
- The frontend's contract expects the OLD field name
- The PR fails
- Backend either reverts the rename or coordinates with frontend

Cost: ~5 minutes of CI per PR. Benefit: zero "the API changed and
broke us" production incidents.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- API change shipped but consumer contract test didn't fail (false-negative — contract was over-broad)
- Producer deploy blocked but the change was actually backwards-compatible (false-positive — contract was over-narrow)
- CDC broker (Pact / PactFlow / Apollo Studio) outage broke deploys (broker-dependency weakening)
- Schema-first OR code-first mixed in the same service (rule 3 violation — drift inevitable)
- Provider mocks the contract instead of declaring its own behaviour (anti-pattern 2)
- Hand-written mocks drifting from the generated schema (rule 8 weakening)
- Contract test asserts only on status 200 (anti-pattern 3 — error cases unverified)
- Contract test wrapping the whole stack (anti-pattern 1 — really an e2e test)

**Refinement candidates**:

- New tooling row when a contract-test framework (consumer-driven OR schema-based) becomes the team's choice
- Tightening of the "test the error cases too" requirement when production error paths consistently lack contracts
- New cross-reference when a sister rule (api-versioning, schema-evolution) defines the surface that contracts test
- New broker-resilience pattern when CDC broker outages become a deploy bottleneck
