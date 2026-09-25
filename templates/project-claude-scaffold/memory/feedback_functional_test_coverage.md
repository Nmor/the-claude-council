---
name: feedback_functional_test_coverage
description: Every project carries functional tests over all of its behaviour; a test counts only if it would fail when the behaviour breaks, and a defect found while testing is fixed, not filed.
metadata:
  type: feedback
---

Hold every project at full functional test coverage, front end and back end. A test
counts only if it exercises real behaviour and would FAIL if that behaviour broke.
Coverage percentage is the proxy, never the goal.

**Why:** measured baselines sit near a third of statements while the team believes the
important parts are covered. One afternoon of writing functional tests over a money path
surfaced an advertised, configurable fee that was added to one payment leg and subtracted
from another so it collected nothing; the same record billed a different total depending
on which code path last touched it; an accessor returning a RATE where every caller
expected an AMOUNT; a rate rendered with a percent sign on a field holding money; and a
field read by a screen that the server had stopped sending. All had shipped, been
reviewed, and were running. None was found by reading the code, because reading confirms
what you already believe the code does.

**How to apply:** measure and report the real baseline per surface before claiming
anything. Name the defect each test prevents. Order by blast radius: money, auth, data
loss, then the rest; every guard gets an allow case and a refuse case. Separate the
finding pass from the fixing pass, then WORK the list rather than filing it. When correct
behaviour is a decision that is not yours, pin current behaviour with a test explicitly
marked as pinning a defect and put the decision to the owner with a recommendation, so a
bug never enters the suite as though it were the specification. Never weaken a test to
get green. Ratchet the floor into the gate and prove it with a positive control.

Full rule: `~/.claude/rules/common/functional-test-coverage.md`. Related:
[[feedback_no_half_finishes]], [[feedback_proper_fixes_only]].
