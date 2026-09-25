# swift-actor-persistence: Anti-Patterns, Checklist and Compliance

> Covers the anti-pattern table, verification checklist, cross-references, compliance
> mapping and learning hooks for Swift concurrency + persistence. Pointed at by the SKILL.md routing
> row **Anti-patterns, verification checklist**.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Shared mutable class without actor | Data race UB | `actor` for shared mutable; `Sendable` + immutable for shared read-only |
| `nonisolated` to bypass actor | Defeats isolation | If sync access needed, model as immutable data passed across boundary |
| `await` inside `actor`-isolated function that re-enters self | Reentrancy reveals partial state | Design for reentrancy OR use serial executor + explicit sync state |
| `Task { ... }` without cancellation handling | Leak; runaway tasks | Use `task` modifier in SwiftUI OR explicit `Task` stored + cancelled on deinit |
| `DispatchQueue.main.async { ... }` from `actor` | Mixing GCD + actors | `await MainActor.run { ... }` |
| Core Data without `viewContext` / `newBackgroundContext()` split | Main-thread DB writes | Read via `viewContext`; write via background context; merge via notification |
| `try?` on Core Data save | Silent persistence failure | `try ctx.save()` with explicit error handling |
| Force-unwrap optional fetched from Core Data | Crash on schema-drift | `guard let` + reset / migration path |

## Verification Checklist

- [ ] All shared mutable state in `actor` types
- [ ] `Sendable` conformance on every type crossing actor boundaries
- [ ] `Strict Concurrency Checking` build setting = "Complete"
- [ ] Core Data writes on background context; reads on viewContext
- [ ] Persistence errors handled (no `try?` on save)
- [ ] Task lifecycle managed (cancellation on deinit / view disappear)
- [ ] `MainActor` annotation on UI-touching code
- [ ] Migration plan for schema changes (Core Data lightweight migration OR custom)
- [ ] Tests use deterministic actor harness (no real-time sleeps)

## Cross-References

- `~/.claude/skills/swift-protocol-di-testing/SKILL.md` — protocol-based DI + tests
- `~/.claude/skills/coding-quality-rules/SKILL.md` — general Swift style
- `~/.claude/rules-library/common/no-ambient-globals.md` — DI principles applied to Swift
- `~/.claude/rules-library/common/error-handling-with-context.md` — Swift error wrapping
- `~/.claude/agents/code-reviewer.md` — Swift code review delegate
- `~/.claude/agents/security-reviewer.md` — iOS keychain + data-at-rest review

## Why this skill exists

Swift's concurrency model (actors + structured concurrency) eliminates entire classes of data-race
bugs that plagued GCD-era iOS apps — IF developers adopt it consistently. Mixing
`DispatchQueue.main.async` with `await MainActor.run`, bypassing actor isolation via `nonisolated`,
and silent Core Data save failures are the patterns that re-introduce the bugs the new model was
designed to fix. The verification checklist gates each one so the app benefits from Swift 6's strict
concurrency checking instead of fighting it.

## Compliance & Standards Mapping

- **ISO/IEC 25010:2011 §6** — Product quality model (Functional
  Suitability, Reliability, Performance Efficiency, Usability,
  Security, Maintainability, Portability, Compatibility)
- **ISO/IEC/IEEE 12207:2017 §6.4** — Software construction +
  verification + validation processes
- **NIST SP 800-218 SSDF §PW** — Produce Well-Secured Software
  (applies to every code-authoring skill)
- **NIST SP 800-53 Rev 5 §SA-11** — Developer testing +
  evaluation
- **OWASP ASVS 4.0.3 §V1.1** — Secure SDLC requirements
- **OWASP ASVS 4.0.3 §V14.2** — Dependency lifecycle
- **CWE Top 25 (2026)** — Weakness classes the patterns in this
  skill prevent
- **SLSA Framework v1.0 Build L2+** — Provenance + integrity

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Shared mutable state without `actor` isolation (data race risk)
- `@MainActor` on a method that doesn't need main-thread isolation (perf overhead)
- `Task.detached` used where `Task` would inherit context correctly
- `await` on a non-cancellable long operation (cancellation propagation gap)
- `nonisolated` annotation hiding a data race
- `try?` swallowing persistence error silently (per `~/.claude/rules-library/swift/no-discards.md`)
- Core Data / SwiftData write off the main context without scheduling correctly
- `UserDefaults` for sensitive data (use Keychain — A02)
- File I/O on main actor (UI hitch)

**Refinement candidates**:

- New persistence-pattern row when SwiftData ships a new feature
- New cross-reference when a sister skill (swift-protocol-di-testing, security-review) adds a Swift
  gate
- Tightening of the actor-isolation rule when a data-race incident recurs
- New migration-template row when schema-evolution incident emerges
