---
name: cost-aware-llm-pipeline
description: Cost optimization patterns for LLM API usage — model routing by task complexity, budget tracking, retry logic, and prompt caching.
---

# Cost-Aware LLM Pipeline

Patterns for controlling LLM API costs while maintaining quality. Combines model routing, budget tracking, retry logic, and prompt caching into a composable pipeline.

## When to Activate

- Building applications that call LLM APIs (Claude, GPT, etc.)
- Processing batches of items with varying complexity
- Need to stay within a budget for API spend
- Optimizing cost without sacrificing quality on complex tasks

## Core Concepts

### 1. Model Routing by Task Complexity

Automatically select cheaper models for simple tasks, reserving expensive models for complex ones.

```python
MODEL_SONNET = "claude-sonnet-4-6"
MODEL_HAIKU = "claude-haiku-4-5-20251001"

_SONNET_TEXT_THRESHOLD = 10_000  # chars
_SONNET_ITEM_THRESHOLD = 30     # items

def select_model(
    text_length: int,
    item_count: int,
    force_model: str | None = None,
) -> str:
    """Select model based on task complexity."""
    if force_model is not None:
        return force_model
    if text_length >= _SONNET_TEXT_THRESHOLD or item_count >= _SONNET_ITEM_THRESHOLD:
        return MODEL_SONNET  # Complex task
    return MODEL_HAIKU  # Simple task (3-4x cheaper)
```

### 2. Immutable Cost Tracking

Track cumulative spend with frozen dataclasses. Each API call returns a new tracker — never mutates state.

```python
from dataclasses import dataclass

@dataclass(frozen=True, slots=True)
class CostRecord:
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float

@dataclass(frozen=True, slots=True)
class CostTracker:
    budget_limit: float = 1.00
    records: tuple[CostRecord, ...] = ()

    def add(self, record: CostRecord) -> "CostTracker":
        """Return new tracker with added record (never mutates self)."""
        return CostTracker(
            budget_limit=self.budget_limit,
            records=(*self.records, record),
        )

    @property
    def total_cost(self) -> float:
        return sum(r.cost_usd for r in self.records)

    @property
    def over_budget(self) -> bool:
        return self.total_cost > self.budget_limit
```

### 3. Narrow Retry Logic

Retry only on transient errors. Fail fast on authentication or bad request errors.

```python
from anthropic import (
    APIConnectionError,
    InternalServerError,
    RateLimitError,
)

_RETRYABLE_ERRORS = (APIConnectionError, RateLimitError, InternalServerError)
_MAX_RETRIES = 3

def call_with_retry(func, *, max_retries: int = _MAX_RETRIES):
    """Retry only on transient errors, fail fast on others."""
    for attempt in range(max_retries):
        try:
            return func()
        except _RETRYABLE_ERRORS:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
    # AuthenticationError, BadRequestError etc. → raise immediately
```

### 4. Prompt Caching

Cache long system prompts to avoid resending them on every request.

```python
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},  # Cache this
            },
            {
                "type": "text",
                "text": user_input,  # Variable part
            },
        ],
    }
]
```

## Composition

Combine all four techniques in a single pipeline function:

```python
def process(text: str, config: Config, tracker: CostTracker) -> tuple[Result, CostTracker]:
    # 1. Route model
    model = select_model(len(text), estimated_items, config.force_model)

    # 2. Check budget
    if tracker.over_budget:
        raise BudgetExceededError(tracker.total_cost, tracker.budget_limit)

    # 3. Call with retry + caching
    response = call_with_retry(lambda: client.messages.create(
        model=model,
        messages=build_cached_messages(system_prompt, text),
    ))

    # 4. Track cost (immutable)
    record = CostRecord(model=model, input_tokens=..., output_tokens=..., cost_usd=...)
    tracker = tracker.add(record)

    return parse_result(response), tracker
```

## Pricing Reference (2025-2026)

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Relative Cost |
|-------|---------------------|----------------------|---------------|
| Haiku 4.5 | $0.80 | $4.00 | 1x |
| Sonnet 4.6 | $3.00 | $15.00 | ~4x |
| Opus 4.5 | $15.00 | $75.00 | ~19x |

## Best Practices

- **Start with the cheapest model** and only route to expensive models when complexity thresholds are met
- **Set explicit budget limits** before processing batches — fail early rather than overspend
- **Log model selection decisions** so you can tune thresholds based on real data
- **Use prompt caching** for system prompts over 1024 tokens — saves both cost and latency
- **Never retry on authentication or validation errors** — only transient failures (network, rate limit, server error)

## Anti-Patterns to Avoid

- Using the most expensive model for all requests regardless of complexity
- Retrying on all errors (wastes budget on permanent failures)
- Mutating cost tracking state (makes debugging and auditing difficult)
- Hardcoding model names throughout the codebase (use constants or config)
- Ignoring prompt caching for repetitive system prompts

## When to Use

- Any application calling Claude, OpenAI, or similar LLM APIs
- Batch processing pipelines where cost adds up quickly
- Multi-model architectures that need intelligent routing
- Production systems that need budget guardrails

## Regex-first parsing for structured text

The cheapest LLM call is the one you never make. When the input is
structured text with repeating patterns (quiz items, invoices, forms,
tables), regex handles 95-98% of cases deterministically at zero
marginal cost. LLM is reserved for the low-confidence remainder.

### Decision framework

```text
Is the text format consistent and repeating?
├── Yes (>90% follows a pattern) → Start with regex
│   ├── Regex handles 95%+ → Done, no LLM needed
│   └── Regex handles <95% → Add LLM for edge cases only
└── No (free-form, highly variable) → Use LLM directly
```

### Hybrid pipeline architecture

```text
Source Text
    │
    ▼
[Regex Parser]      ─── Extracts structure (95-98% accuracy)
    │
    ▼
[Text Cleaner]      ─── Removes noise (markers, page numbers, artifacts)
    │
    ▼
[Confidence Scorer] ─── Flags low-confidence extractions
    │
    ├── High confidence (≥0.95) → Direct output
    │
    └── Low confidence (<0.95) → [LLM Validator] → Output
```

### Regex parser (handles the majority)

```python
import re
from dataclasses import dataclass

@dataclass(frozen=True)
class ParsedItem:
    id: str
    text: str
    choices: tuple[str, ...]
    answer: str
    confidence: float = 1.0

def parse_structured_text(content: str) -> list[ParsedItem]:
    """Parse structured text using regex patterns."""
    pattern = re.compile(
        r"(?P<id>\d+)\.\s*(?P<text>.+?)\n"
        r"(?P<choices>(?:[A-D]\..+?\n)+)"
        r"Answer:\s*(?P<answer>[A-D])",
        re.MULTILINE | re.DOTALL,
    )
    items = []
    for match in pattern.finditer(content):
        choices = tuple(
            c.strip() for c in re.findall(r"[A-D]\.\s*(.+)", match.group("choices"))
        )
        items.append(ParsedItem(
            id=match.group("id"),
            text=match.group("text").strip(),
            choices=choices,
            answer=match.group("answer"),
        ))
    return items
```

### Confidence scoring

Flag items that may need LLM review.

```python
@dataclass(frozen=True)
class ConfidenceFlag:
    item_id: str
    score: float
    reasons: tuple[str, ...]

def score_confidence(item: ParsedItem) -> ConfidenceFlag:
    """Score extraction confidence and flag issues."""
    reasons = []
    score = 1.0

    if len(item.choices) < 3:
        reasons.append("few_choices")
        score -= 0.3

    if not item.answer:
        reasons.append("missing_answer")
        score -= 0.5

    if len(item.text) < 10:
        reasons.append("short_text")
        score -= 0.2

    return ConfidenceFlag(
        item_id=item.id,
        score=max(0.0, score),
        reasons=tuple(reasons),
    )

def identify_low_confidence(
    items: list[ParsedItem],
    threshold: float = 0.95,
) -> list[ConfidenceFlag]:
    """Return items below confidence threshold."""
    flags = [score_confidence(item) for item in items]
    return [f for f in flags if f.score < threshold]
```

### LLM validator (edge cases only)

```python
def validate_with_llm(
    item: ParsedItem,
    original_text: str,
    client,
) -> ParsedItem:
    """Use LLM to fix low-confidence extractions."""
    response = client.messages.create(
        model=MODEL_HAIKU,  # Cheapest model is sufficient for validation
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": (
                f"Extract the question, choices, and answer from this text.\n\n"
                f"Text: {original_text}\n\n"
                f"Current extraction: {item}\n\n"
                f"Return corrected JSON if needed, or 'CORRECT' if accurate."
            ),
        }],
    )
    # Parse LLM response and return corrected item...
    return corrected_item
```

### Composed hybrid pipeline

```python
def process_document(
    content: str,
    *,
    llm_client=None,
    confidence_threshold: float = 0.95,
) -> list[ParsedItem]:
    """Regex extraction → confidence check → LLM only for edge cases."""
    items = parse_structured_text(content)
    low_confidence = identify_low_confidence(items, confidence_threshold)

    if not low_confidence or llm_client is None:
        return items

    low_conf_ids = {f.item_id for f in low_confidence}
    result = []
    for item in items:
        if item.id in low_conf_ids:
            result.append(validate_with_llm(item, content, llm_client))
        else:
            result.append(item)

    return result
```

### Production metrics (representative)

From a production quiz parsing pipeline (410 items):

| Metric | Value |
|--------|-------|
| Regex success rate | 98.0% |
| Low-confidence items | 8 (2.0%) |
| LLM calls needed | ~5 |
| Cost savings vs all-LLM | ~95% |
| Test coverage | 93% |

### Best practices for regex-first parsing

- **Start with regex** — even imperfect regex gives you a baseline to improve.
- **Score confidence** so the pipeline knows what needs LLM help.
- **Use the cheapest LLM** for validation — Haiku-class models are sufficient.
- **Never mutate** parsed items — return new instances from cleaning / validation.
- **TDD works well** for parsers — write tests for known patterns first, then edge cases.
- **Log metrics** (regex success rate, LLM call count) to track pipeline health.

### Anti-patterns

- Sending all text to an LLM when regex handles 95%+ of cases.
- Using regex for genuinely free-form, highly variable text.
- Skipping confidence scoring and hoping regex "just works".
- Mutating parsed objects during cleaning / validation steps.
- Not testing edge cases (malformed input, missing fields, encoding issues).

### When to apply

- Quiz / exam question parsing
- Form data extraction
- Invoice / receipt processing
- Document structure parsing (headers, sections, tables)
- Any structured text with repeating patterns where cost matters

## Purpose

Principal-level cost-aware LLM engineering: model routing (cheap
for cheap tasks, expensive for hard ones), regex-first parsing
for structured text where deterministic patterns suffice, prompt
caching (Anthropic / OpenAI ephemeral cache), output token caps,
batched calls, streaming for time-to-first-token UX, retry +
fallback ladder, output-format strictness (JSON Schema / structured
outputs) to avoid re-prompting, per-tenant budget enforcement,
shadow-deploy + offline eval for routing decisions, and the
observability surface that lets a team see cost per feature / per
tenant / per call class.

**Negative scope** (NOT what this skill covers):

- Prompt engineering depth — see `prompt-engineering`
- Model fine-tuning — see `fine-tuning-workflows`
- RAG architecture — see `rag-design`
- ML model selection beyond LLMs — see `ml-model-selection`

## When NOT to use

- Tasks small enough that LLM cost is negligible (< $10/mo total)
- Pure-research / one-shot evaluations where cost doesn't matter
- Workloads where latency dominates cost (use fastest model
  regardless)
- Compliance-bound workloads where model choice is mandated by
  contract (DPA names a specific model)

## Standards Cited

- **NIST AI Risk Management Framework (AI RMF 1.0)** — cost +
  reliability governance
- **NIST SP 800-53 Rev 5 §SC-5** — Denial-of-service protection
  (relevant for LLM cost-amplification attacks)
- **Anthropic Documentation — Prompt caching, batch API, token
  cost reference** (docs.anthropic.com)
- **OpenAI Platform Documentation — Batch API, structured outputs**
  (platform.openai.com)
- **AWS Bedrock cost optimisation guide**
- **OWASP LLM Top 10 (2025)** — LLM03 (training data poisoning),
  LLM10 (model theft), cost-amplification risks
- **OWASP ASVS 4.0.3 §11.1.3** — Rate limiting on resource-
  intensive endpoints (LLM calls qualify)
- **CWE-400** — Uncontrolled Resource Consumption (cost-runaway
  classification)
- **W3C Web Performance Working Group** — Streaming + TTFT
  benchmarks applicable to LLM UX
- **RFC 7232 §3.1** — Conditional requests / ETags (apply to
  prompt-cache hit semantics)
- **ISO/IEC 23894:2023** — AI risk management
- **`~/.claude/rules-library/common/observability.md`** — cost is a
  metric like any other
- **`~/.claude/rules-library/common/rate-limiting.md`** — protects against
  cost-amplification attacks

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| One-model-fits-all (always Sonnet / always GPT-4) | Pays premium for tasks where Haiku / 4o-mini would do | Routing layer: cheap-first, escalate on confidence threshold |
| LLM call where regex / parser suffices | $10-100 cost vs $0 deterministic | Regex / parser first; LLM as fallback for ambiguous inputs |
| No prompt cache for long system prompts | Pays the system-prompt token cost every call | Anthropic prompt caching / OpenAI ephemeral cache |
| Unbounded `max_tokens` | Single user query produces 100k-token essay; cost balloon | Cap `max_tokens` per call class; truncate prompts |
| Sequential calls when parallel is possible | Latency × N; cost same regardless | Fan out via `Promise.all` / `goroutine` / `asyncio.gather` |
| No structured-output enforcement | Free-form text → re-prompt loop → cost stacks | JSON Schema / structured outputs; validate on receive |
| Streaming output ignored (no TTFT optimisation) | UX feels slower than cost suggests | Stream tokens to UI for any > 500ms response |
| No per-tenant budget cap | Single misuse / abuser drains the whole budget | Per-tenant quota + 429 on overrun |
| No shadow-deploy when changing model | Routing regression invisible until invoice arrives | Run both models for 1% of traffic; compare outputs + cost |
| Treating cost as fixed overhead | Cost grows with adoption; surprise at month-end | Cost dashboard per feature / per tenant; alert on burn-rate |
| Retrying on 4xx | Likely permanent failure; retry just doubles the bill | Distinguish 4xx (don't retry) from 5xx (retry with backoff) |
| LLM-generated code without parser fallback for structured fields | Hallucinated dates / IDs / amounts ship to prod | Validate every structured field with deterministic parser |

## Verification Checklist

- [ ] Model routing layer in place (cheap → expensive ladder)
- [ ] Regex / parser tried before LLM call for structured fields
- [ ] Prompt cache configured for long system prompts
- [ ] `max_tokens` capped per call class
- [ ] Structured outputs (JSON Schema) enforced where applicable
- [ ] Streaming used for user-facing latency-sensitive calls
- [ ] Per-tenant quota + 429 enforcement (per `rate-limiting.md`)
- [ ] Cost per feature / per tenant tracked as a metric
- [ ] Burn-rate alert wired to on-call
- [ ] Shadow-deploy template exists for model changes
- [ ] Retry policy distinguishes 4xx from 5xx
- [ ] Batch API used for non-real-time bulk workloads
- [ ] `docs/provider-research/<llm-vendor>.md` exists + fresh
- [ ] AI ethics + bias review per `~/.claude/agents/ai-ethics-reviewer.md`

## Cross-References

- `~/.claude/skills/prompt-engineering/SKILL.md` — prompt-side
- `~/.claude/skills/ml-model-selection/SKILL.md` — broader model
  selection
- `~/.claude/skills/rag-design/SKILL.md` — context-window
  optimisation
- `~/.claude/skills/observability-patterns/SKILL.md` — cost as
  metric
- `~/.claude/rules-library/common/rate-limiting.md` — cost-amplification
  defence
- `~/.claude/rules-library/common/observability.md` — cost dashboards
- `~/.claude/agents/ai-ethics-reviewer.md` — Council Division 15
- `~/.claude/agents/finance-reviewer.md` — Council Division 10

## Why this skill exists

LLM cost grows with adoption faster than most teams plan for: a
chat feature that costs $200/mo at launch can be $20k/mo at
product-market-fit if model + token discipline are missing. The
patterns above codify the production-ready posture: route to the
cheapest sufficient model, regex-first for structured text, cache
long system prompts, cap output tokens, batch where possible,
shadow-deploy model changes, per-tenant budgets. Teams that adopt
these maintain healthy unit economics; teams that don't watch the
LLM line-item dominate the cloud bill.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- LLM call where regex / parser would suffice (e.g., date extraction, integer parsing) — cost waste
- Routing always uses the most-expensive model for trivial classification (model-tier weakening)
- Prompt template re-sent every call instead of cached via provider's prompt-caching API
- Retry loop without exponential backoff + jitter (cost amplification on transient failure)
- Token budget not tracked per-tenant (one tenant's runaway pipeline burns shared quota)
- Embedding re-computed for same input across requests (no embedding cache)
- Output tokens unbounded (LLM continues past needed answer) — `max_tokens` not set
- Streaming used when batch would be cheaper (or vice versa — wrong fit per use case)
- Eval suite not run when changing model / prompt (quality drift signal)
- Cost-per-task not metered in observability dashboard (FinOps blind spot)

**Refinement candidates**:

- New routing-table row when a new model class becomes economically attractive (e.g., Haiku 5, Llama 4)
- New cache-key template when a recurring high-cost call pattern emerges
- New cross-reference when a sister skill (rag-design, prompt-engineering, ml-model-selection) adds a cost-aware pattern
- Tightening of the regex-vs-LLM boundary when a new structured-text class becomes routine
