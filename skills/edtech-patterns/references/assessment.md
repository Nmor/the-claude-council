# edtech-patterns: Assessment

> Assessment content format (QTI 3.0) and psychometrically valid adaptive testing (IRT / CAT).
> Pointed at by the SKILL.md rows "Pattern 8" and "Pattern 11".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 8: QTI 3.0 — assessment items + tests

QTI 3.0 (2022 release) is the modern format for portable
assessment content. An item is XML defining:

- `<itemBody>` — the prompt (rich HTML + MathML + media).
- `<responseDeclaration>` — the expected response type
  (choice / textEntry / inlineChoice / order / match / hotspot /
  drawing / mediaInteraction / etc.).
- `<outcomeDeclaration>` — scoring outcomes (SCORE, MAXSCORE).
- `<responseProcessing>` — scoring rules (template or
  custom XML).

A QTI test is a collection of items + a `<testPart>` with
`<assessmentSection>`s controlling sequencing, time limits,
shuffling, and adaptive routing.

QTI 3.0 mandates WCAG 2.1 AA for items; `<accessibility>` block
declares the item's accommodation needs + variants. Per
AccessForAll, learners with declared PNP automatically receive
the matching DRD variant.

## Pattern 11: Adaptive testing — IRT, not "more wrong → harder"

Adaptive testing means the next item depends on the learner's
prior performance. Naïve "tree of branches" implementations are
psychometrically meaningless; the validated approach is **Item
Response Theory** (Rasch / 2PL / 3PL):

- Each item has parameters: difficulty (b), discrimination (a),
  guessing (c).
- Each learner has a latent ability (θ).
- The probability of a correct response is a logistic function
  of (θ − b).
- After each response, the system updates the posterior
  estimate of θ via MLE / EAP / MAP, then selects the next
  item to MAXIMIZE information at the current θ (often
  Fisher Information Maximization).
- Termination: when SE(θ) drops below a threshold OR a fixed
  item count is reached.

CAT (Computerized Adaptive Testing) requires:

- A calibrated item bank (typically 5-10× the test length;
  items calibrated via field-testing with classical statistics
  - IRT).
- Content balancing (the algorithm prefers high-information
  items, but the test still needs to cover the blueprint).
- Exposure control (Sympson-Hetter; randomesque) so popular
  items don't appear too often.
- Compromise detection (track which items have been seen by
  many learners in quick succession — possible cheating).

For competency-based microlearning, simpler models (knowledge
tracing, BKT, DKT) may be appropriate; for high-stakes
assessment, IRT is the floor.
