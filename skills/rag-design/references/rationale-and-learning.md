# rag-design: Cross-References

> Covers: sister skills and rules, why this skill exists, and its learning hooks. Pointed at by the
> SKILL.md rows "Cross-References", "Why This Skill Exists" and "Learning hooks".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Cross-References

- `prompt-engineering` — system prompt patterns for grounded
  generation
- `fine-tuning-workflows` — when to fine-tune vs add to RAG
- `ml-model-selection` — embedding + reranker model choice
- `mlops-patterns` — model registry, drift monitoring,
  shadow/canary deploys for RAG components
- `observability.md` — retrieval + generation telemetry
- `audit-logging.md` — citation + retrieval audit trail
- `data-retention.md` — corpus and embedding lifecycle
- `gdpr-ccpa.md` — PII in retrieved chunks + right-to-be-forgotten
  across embedding indexes
- `security.md` A01 + A03 — multi-tenant isolation, prompt-injection
  defence on retrieved content
- `cost-aware-llm-pipeline` — embedding + generation cost control
- `task-intake-due-diligence.md` Q24 — AI ethics for grounded
  systems (citation accuracy, refusal calibration)

## Why This Skill Exists

The default failure mode of an LLM with no retrieval is confident
fabrication. The default failure mode of a poorly-designed RAG
system is the same, dressed up in citations that point to chunks
that don't actually contain the cited claim. The user trusts the
citation marker, doesn't click through, and the hallucination
slips into production decisions: a customer-support agent quotes
a policy that doesn't exist, a legal-research assistant cites
case law that was overruled, a medical knowledge tool surfaces
outdated guidance with a fresh-looking source line.

Every layer of the RAG stack contributes a multiplicative term to
final quality. Mediocre chunking × mediocre embedding × mediocre
retrieval × mediocre packing × mediocre prompt × no evaluation =
the kind of system that demos well and produces incident reports
in production. Principled design — content-aware chunking,
contextual prefixes, hybrid retrieval with cross-encoder
reranking, programmatically validated citations, RAGAS in CI,
versioned indexes, per-tenant isolation, observability across
every stage — turns RAG from a science project into a system the
business can stand behind.

The cost of doing it right: a couple of weeks of additional
engineering on top of "naive RAG." The cost of doing it wrong:
discovering after launch that the system gives different answers
to the same question depending on chunking variance, that
citations don't track edits to the source, that one tenant's
documents are surfacing in another tenant's answers, that the
embedding model was deprecated by the vendor with three months'
notice. None of those are speculative — they are the recurring
incident classes of every team that shipped RAG before they
shipped RAG evaluation.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Chunking strategy chosen arbitrarily (fixed 512 tokens) without measuring retrieval quality
- Single-vector retrieval without hybrid (BM25 + vector) — recall gap on rare terms
- Reranking step absent on multi-document corpora (precision gap at top-k)
- Tenant isolation absent in vector store (cross-tenant content leak)
- Embedding model deprecated by vendor without migration plan (per
  `~/.claude/rules-library/common/deprecation-lifecycle.md`)
- Source citation absent from grounded answers (hallucination opacity)
- Retrieval evaluation suite missing (no recall@k / nDCG / answer-faithfulness metrics)
- Long-context model used where RAG would be cheaper + more current (per
  `~/.claude/skills/cost-aware-llm-pipeline/SKILL.md`)
- PII-bearing chunk indexed without classification (per
  `~/.claude/rules-library/common/gdpr-ccpa.md`)
- Stale chunks (source doc updated, index not refreshed) — staleness window unmonitored

**Refinement candidates**:

- New chunking-strategy row when a new domain (legal, code, medical) surfaces with specific needs
- New cross-reference when a sister skill (prompt-engineering, mlops-patterns,
  fine-tuning-workflows, ml-model-selection) adds a RAG gate
- New eval template when a new failure class (e.g., out-of-distribution query) recurs
- Tightening of the hybrid-retrieval rule when single-vector recall gap reaches production
