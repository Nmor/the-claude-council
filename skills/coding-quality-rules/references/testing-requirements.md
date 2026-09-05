# Testing Requirements (Always-On, Global)

> Auto-fires on every file. Sister to `done-criteria.md`,
> `extreme-lint-policy.md`, `tdd-workflow` skill, `tdd-guide`
> agent, `task-intake-due-diligence.md` (Q14 test strategy).

## Coverage thresholds (canonical)

Per `extreme-lint-policy.md` — the strictest values win across
all global rules:

- **Touched files**: ≥ **90%** line + branch coverage
- **Project total**: ≥ **80%** line + branch coverage
- **Critical paths** (auth, payments, data-mutation, multi-tenant
  isolation): ≥ **95%**

Previous global guidance used 70% (the gradual-adoption default
shipped with most frameworks). The strict version is now the
canonical baseline. Workspace-specific overrides may not relax
these — only raise them.

## Test types (ALL required for non-trivial work)

Per `task-intake-due-diligence.md` Q14:

1. **Unit tests** — every pure function / pure logic branch.
2. **Integration tests** — every external boundary (DB, queue,
   cache, third-party API mocked or recorded).
3. **Contract tests** — producer / consumer schema agreements
   (per the `api-design` skill's "Response-shape contracts" section).
4. **E2E tests** — every critical user journey (Playwright,
   Cypress, Detox, XCUITest per platform).
5. **Property-based tests** — invariants for parsers,
   validators, state machines.
6. **Load / performance tests** — for hot paths or new
   services.
7. **Chaos / fault-injection** — when the system claims
   resilience (retries, circuit breakers, failover).
8. **Security tests** — SAST + DAST + dependency-CVE + secret-
   scan in CI.
9. **Accessibility tests** — axe-core / pa11y / equivalent for
   every UI surface.

## Test-Driven Development (mandatory workflow)

Per `tdd-workflow` skill:

1. **RED** — write the failing test FIRST.
2. **VERIFY RED** — run the test; it must fail for the right
   reason (assertion fails, not import error).
3. **GREEN** — write the minimal implementation that makes the
   test pass.
4. **VERIFY GREEN** — run the test; it passes.
5. **REFACTOR** — improve the implementation; tests stay green.
6. **VERIFY COVERAGE** — coverage meets the threshold above.

Tests document intent. A passing test suite without code is a
specification; code without tests is a black box.

## Troubleshooting test failures

Per `proper-fixes-first.md`:

1. Delegate to `tdd-guide` agent.
2. Check test isolation (no shared state across tests).
3. Verify mocks are correct (they don't lie).
4. Fix the IMPLEMENTATION, not the test — unless the test is
   testing the wrong thing (rare).
5. If a test is genuinely flaky, quarantine + investigate;
   never weaken the assertion to make it green.

## Test files have NO exemption

Per `no-discards.md`, every value bound + every error handled
applies in test files too. Iterate by index (not range-over with
`_`), name every variable, assert on `error_code` not `message`
(per `error-handling-with-context.md` rule 10).

## Agent support

- **tdd-guide** — proactively for new features; enforces
  RED-GREEN-REFACTOR + the 90% / 80% coverage gate above
- **e2e-runner** — Playwright / equivalent E2E flows
- **code-reviewer** — flags missing tests in PR review

## Cross-references

- `extreme-lint-policy.md` — canonical coverage thresholds
- `done-criteria.md` — every "done" claim runs the test gate
- `tdd-workflow` skill — RED-GREEN-REFACTOR methodology
- `task-intake-due-diligence.md` Q14 — test strategy planned
  in the intake
- `api-design` skill ("Response-shape contracts" section) —
  contract tests between BE + FE shapes
- `error-handling-with-context.md` — assertions on
  `error_code`, not on copy-edit-fragile messages

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Coverage on touched files < 90% (canonical threshold violation)
- Project coverage < 80% (sister `extreme-lint-policy.md` weakening)
- Critical-path coverage < 95% (auth / payments / data-mutation / multi-tenant isolation)
- TDD RED-VERIFY skipped — test never confirmed to fail for the right reason (workflow weakening)
- Mocked external boundary used instead of recorded fixture / contract test (integration-test contract drift)
- Property-based test absent for a parser / validator / state machine (test-type gap)
- E2E test absent for a critical user journey (test-type gap)
- Test asserts on `message` instead of `error_code` (sister-rule violation — copy-edit fragility)
- Test file added with discards / suppression directives (no-discards weakening in test files)
- Flaky test quarantined without root-cause fix (TDD discipline weakening)

**Refinement candidates**:

- New test-type row when a recurring test class emerges (e.g., chaos test, fuzzing target, snapshot regression)
- Tightening of the critical-path coverage floor when a regression slips past 95%
- New cross-reference when a sister skill (django-testing, springboot-testing, swift-protocol-di-testing) extends test-type taxonomy
- New "test isolation" failure-mode template when a recurring shared-state contamination class appears

---

<!-- ============================================================
     Section: local-testability.md (from rules/common/)
     ============================================================ -->
