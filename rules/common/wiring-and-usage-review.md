# Wiring-and-Usage Review (Always-On, Global)

> Auto-fires on every code change. Sister to
> `post-phase-retrospective-review.md` (rule 8 — controls-on-path / no inert
> validators), `verify-before-claim.md` (the verification block),
> `done-criteria.md` (the gates), `principal-level-mandate.md` (depth bar),
> `no-overclaim.md` (no "done" without proof).

## Core Principle

**Every symbol you write — a function, class, endpoint, config flag, env var,
IAM action, validator, control, event, schema column, voice key, CLI command,
model, alert, dashboard — is reviewed AT WRITE TIME for two things: (1) WIRING —
is it connected to a consumer that actually reaches it? and (2) USAGE — is it
exercised on the live path, not just defined? Code that is defined-but-never-
reached is inert: it gives the false comfort of a control that does nothing.
Inert code is a defect, not neutral.**

The discipline is the question, asked of every new thing, before the change is
called done: *"What calls this, on what path, and did I prove it?"* If the answer
is "nothing yet" or "I'm not sure", the change is not done — wire it, or delete
it, or explicitly mark it `BUG(unwired-<slug>)` and tell the user.

This is the user's standing directive (verbatim): **"always review wiring and
usage … this should [be a] guiding rule and hook for every code you write."**

## Hard rules

### 1. Every new symbol has a named consumer on the live path

When you add a symbol, you name (in your head, in the PR, or in the verification
block) the consumer that reaches it and the path it reaches it on:

- a new function → a caller (and the caller is itself reached)
- a new endpoint / handler → a route + a client that hits it
- a new validator / guard / control → the live request/turn path CALLS it
  (not just a unit test) — the canonical inert-control trap
- a new config flag / env var → code that READS it AND changes behaviour
- a new CLI command / subcommand → registered in the dispatch table
- a new event / metric / alert → a producer AND a consumer (or a dashboard)
- a new schema column / model field → a writer AND a reader
- a new voice / model / engine → routing that resolves it + a serving backend
- a new IAM action → a caller that needs it (no unused grants)

A symbol with no consumer is either (a) wired this change, (b) deleted, or
(c) flagged `BUG(unwired-<slug>)` with the user explicitly told.

### 2. "A unit test calls it" is NOT wiring

A control that is unit-tested in isolation but never invoked on the production
path is INERT — the test proves the unit works, not that the system uses it.
Wiring means a real caller on the live path reaches it. (Incident class: a
security validator that exists + is unit-tested but nothing on the request path
calls it — the gate is decorative.) Per
`post-phase-retrospective-review.md` rule 8: "every control the design CLAIMS is
actually called on the live path (no inert validators, no prompt-only gates, no
dead security code)."

### 3. Lifecycle symmetry is wiring too

Every resource opened is closed on the matching path: a channel/connection/
client/file/stream/lock acquired in construction has a teardown wired to
shutdown. An opened-but-never-closed resource is a half-wired lifecycle (leak).

### 4. Review at WRITE time, not only at phase end

The retrospective sweep (`post-phase-retrospective-review.md`, Step 3) catches
wiring gaps at phase boundaries; this rule pulls the check EARLIER — to the moment
the symbol is written. Don't defer "is this used?" to a later audit; answer it as
you write.

### 5. The verification block reports wiring + usage

Per `verify-before-claim.md`, a completion claim's verification block includes a
wiring line for the change:

```text
Wiring + usage (this turn):
- <new symbol>: reached by <consumer> on <path> ✓
- controls-on-path: <validator> called at <call-site> ✓ (not just tested)
- lifecycle: <resource> opened at <x>, closed at <y> ✓
- dead-code scan: <tool> clean (no new unused exports)
```

### 6. The gate runs a dead-code / unused-symbol detector

The done-criteria gate for a touched file runs the language's unused-symbol
detector, and a NEW unused export/symbol fails the gate (this is the mechanical
"hook"):

| Language | Detector |
| --- | --- |
| TypeScript / JS | `knip` / `ts-prune` (no new unused exports) |
| Python | `ruff` (F401/F811 + `--select F`), `vulture` for dead code |
| Go | `staticcheck` U1000 (unused) + `deadcode` |
| Rust | `cargo build` dead_code warning = error |
| Terraform | no unreferenced resources/vars (tflint) |
| Config (k8s/CI) | no rule/manifest referencing a non-existent target |

A symbol intentionally exported for external/future use is annotated as such
(public API surface, documented entry point) — that annotation is the
"documented entry point" exception, stated explicitly, not assumed.

### 7. Cross-artifact wiring counts

A runbook references an alert → the alert rule exists. A CLI help references a
command → the command is registered. A doc references a path → the path exists.
A proto field added → consumers regenerate + read it. Cross-artifact dangling
references are unwired symbols in a different shape.

### 8. The NETWORK + INFRA path is part of the live path

A new listening port, metrics endpoint, scrape target, cross-namespace call, or
any code that depends on a cloud/cluster resource is NOT wired until the NETWORK
and the INFRA actually permit + provide it — verify this at WRITE time from the
static, inspectable artifacts (IaC + live `kubectl`/`aws` reads), do not defer it
to "post-deploy". Code-level wiring (server up, selector matches, tests green) is
necessary but NOT sufficient; the packet must arrive AND the resource must exist
with the right permissions. For each such addition confirm:

- **NetworkPolicy**: under a `default-deny` (ingress and/or egress), an explicit
  allow exists for the exact source → target → port. A new metrics port `:9000`
  on a pod in a default-deny-ingress namespace needs an allow from the scraping
  namespace (e.g. `monitoring`) — else the PodMonitor scrapes NOTHING and the
  metric/alert is inert though the wiring "looks done". Mirror the working sibling.
- **Service / targetPort / DNS**: the address the consumer hits resolves to the
  process's listening port (and the in-cluster service name exists / external-dns
  record is created).
- **Cross-namespace**: the TARGET namespace's ingress policy admits the SOURCE,
  and any auth proxy in front is bypassed by the in-cluster service address used.
- **IAM / IRSA**: the role a ServiceAccount annotation references actually EXISTS
  with the needed policies; a SA pointing at a non-existent (un-applied) role
  gives the pod no creds → silent permission failures. Likewise a CD/deploy role,
  ECR push grant, KMS grant, or admission-signing trust (ClusterImagePolicy) the
  change relies on must be applied — an image/Job referencing an un-applied role
  or ECR repo, or an unsigned image under enforce, never runs.
- **Resource exists / applied**: the bucket / table / queue / topic / secret /
  ECR repo / NodePool the code reads must be provisioned (IaC applied), not just
  declared in a PR branch. Distinguish "declared in code" from "live in the
  account" — `aws`/`kubectl` read it.
- **Capacity / quota**: a new GPU/compute workload has a NodePool + limit that
  can actually schedule it.

These are all static, inspectable artifacts — read them now
(`kubectl get networkpolicy/sa -n <ns>`, `aws iam get-role`,
`aws ecr describe-repositories`, the IaC in code) rather than discovering the
block when the scrape/call/Job silently does nothing in prod.

### 9. Remediating FOUND-inert code: WIRE first; delete only after 100% validation

The rules above prevent SHIPPING inert code. The counterpart — what to do when an
audit/trace FINDS inert code — is where the expensive mistake happens: **a
wiring-trace produces CANDIDATES, not a delete-list.** Deletion is the LAST resort,
never the reflex. Apply this fixed order of preference to EACH candidate:

1. **WIRE it (first choice).** If the symbol was deliberately authored for a real
   purpose that was simply never connected (rich content, a named-but-unbuilt backend,
   a "for the report" field), connect it to its intended consumer and finish it —
   **properly implemented (a real implementation, not a stub) and WITHOUT introducing a
   duplicate** (consolidate to ONE home; never leave the old inline + a new helper both
   live — per `no-bloat.md` DRY). Add the safeguards the feature needs (flag, guard,
   by-ear validation for UX). `git blame` is evidence: born in a feature commit and
   never revisited = unfinished, WIRE it — not garbage.
2. **DEPRECATE** if a contract blocks safe removal (e.g. buf `breaking: FILE`, a
   published API, a vendored-stub consumer) — retire via `[deprecated]` / a soft-delete
   window, not a hard delete.
3. **DELETE — only after 100% validation** it is genuinely dead AND has no wireable
   purpose: a newer impl fully replaced it AND is used (remove the redundant
   DUPLICATE, keep the wired one), or a compat shim with **zero** consumers in ANY
   repo. "100% validated" means proven, not assumed: grep the symbol across THIS repo +
   every sibling repo + entry points invoked by IaC/CI/Argo, confirm no cross-repo /
   out-of-file / dynamic consumer, and cite that evidence. A trace's "inert" label is
   NOT validation — it is the START of validation.

**Use a real call graph, not grep, where one is available.** `graphify` (authority per
`~/.claude/CLAUDE.md`) answers "what calls this, on what path" from deterministic AST
parsing with every edge explained, which is precisely the question this rule asks and
precisely where a text search misleads: grep cannot see a call through an interface, a
generated binding, or a name shared by two packages. Where a graph is available, the
grep is corroboration, not the trace.

Beware **(C) FALSE POSITIVES** — a symbol the trace called inert but is actually wired
(a consumer in ANOTHER repo, an entry point invoked by IaC/CI/Argo, an out-of-file
caller). VERIFY every finding on the live path (rules 1-8) BEFORE acting. When a
candidate's classification is unsure, **ASK the owner** rather than default to delete.
Reflexively deleting an unverified trace's output — especially via a batch/agent
fan-out — silently removes half-built features and trips over false positives; it is
the audit-time mirror of the inert-code defect this rule exists to prevent.

## Anti-patterns

- **Inert validator** — a guard/control defined + unit-tested but never called on
  the live path. (The most dangerous: a security control that does nothing.)
- **Orphan symbol** — a function/class/endpoint with zero inbound references,
  not marked as an entry point.
- **Network/infra-blocked endpoint** — code is wired but the NETWORK (NetworkPolicy
  under default-deny) or the INFRA (an un-applied IAM/IRSA role, missing ECR repo /
  bucket / table, unsigned image under admission-enforce, absent NodePool) does not
  permit/provide the path, so packets never arrive or the pod gets no creds /
  no image / nowhere to schedule. Looks done (server up, selector matches, tests
  green) but is inert at the network/infra layer. Verify NP / Service / IAM /
  resource-applied / quota at write time (rule 8), not post-deploy.
- **Flag that does nothing** — a config/env var read into a variable that no
  branch consumes.
- **Inert env / config the app never reads** — a deploy-time toggle (k8s `env:`,
  helm value, ConfigMap key) that the application config layer does NOT read, so
  it "looks enabled" but is wired to nothing. Classic case: app config sourced
  ONLY from a secret store (Secrets Manager / Vault), so a Deployment `env: NAME=true`
  is dead — the field stays at its default. CONFIRM the value through the SAME
  mechanism the app actually reads (the secret / the flag store), and verify the
  feature is live on the real path — never trust the deploy manifest's appearance.
- **Write-only / read-only field** — a schema column written but never read (or
  read but never written).
- **Leaked resource** — opened in construction, never closed on shutdown.
- **Dangling cross-reference** — a runbook/doc/CLI/proto pointing at a target
  that doesn't exist.
- **"I'll wire it next phase"** — deferral that leaves an inert symbol shipping
  now; either wire it, delete it, or `BUG(unwired-)` + tell the user.
- **Reflexive-delete of found-inert** (rule 9) — treating a wiring-trace's output as
  a delete-list: batch-deleting audited "inert" symbols without per-item wire-vs-delete
  classification + live-path verification. Silently removes half-built features
  (should be WIRED) and trips over false positives (symbols wired cross-repo / by an
  entry point the trace missed).

## Cross-references

- `post-phase-retrospective-review.md` rule 8 — controls-on-path / no inert
  validators / lifecycle symmetry / cross-repo contracts
- `post-phase-retrospective-review.md` Step 3 — phase-boundary wiring sweep (this
  rule is the write-time counterpart)
- `verify-before-claim.md` — the verification block carries the wiring line
- `plan-completion-before-push.md` rule 2 — the push gate: never push a
  changed symbol/flag/config that is not 100% confirmed AND wired (inert
  config is a push blocker, not just a code-review note)
- `done-criteria.md` — the gate runs the dead-code detector
- `principal-level-mandate.md` — depth bar; a principal engineer never ships
  inert code
- `no-overclaim.md` — "done" requires the wiring proof, not just "it compiles"

## Why this rule exists

The recurring, expensive failure: code that LOOKS complete (compiles, lints,
unit-tested, green CI) but contains a control that nothing calls, a flag nothing
reads, an endpoint nothing hits, a resource nothing closes. Green gates coexist
with inert wiring — linters don't catch "defined but never reached on the live
path", and a unit test of the unit doesn't prove the system uses it. Documented
incidents: a security verifier unit-tested but never wired to the request path (a
decorative gate); clients opened but never closed (leaks); a runtime emitting
voice keys a deployed service couldn't resolve (cross-repo dangling). The cost of
asking "what calls this, on what path?" at write time is seconds; the cost of
shipping an inert control is an incident plus the trust loss of "we had a check
for that — it just never ran."

## Learning hooks

Per `continuous-learning-mandate.md`:

**Signals to watch**:

- A new symbol shipped with no live-path consumer (rule 1 violation)
- A control unit-tested but not called on the live path (rule 2 — inert validator)
- A resource opened without a wired teardown (rule 3 — lifecycle asymmetry)
- A completion claim without the wiring + usage line (rule 5 weakening)
- The dead-code detector not run in the gate on a touched file (rule 6 weakening)
- A cross-artifact reference (runbook→alert, CLI→command, doc→path) that dangles
  (rule 7 violation)
- "Wire it next phase" deferral that ships an inert symbol (anti-pattern)
- Found-inert code deleted without per-item wire-vs-delete classification or live-path
  verification — esp. a batch/agent fan-out treating a trace as a delete-list (rule 9
  violation); a deliberately-authored-but-unwired feature deleted instead of wired

**Refinement candidates**:

- New detector row when a language/artifact class gains an unused-symbol tool
- New anti-pattern entry when a recurring inert-code shape appears
- Tightening of the "documented entry point" exception when it's used to excuse
  genuinely-orphan code
