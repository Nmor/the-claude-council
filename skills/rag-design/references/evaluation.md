# rag-design: Evaluation

> Covers: RAGAS + golden-set evaluation, and the RAG vs fine-tune vs long-context decision (Patterns
> 11-12). Pointed at by the SKILL.md rows for Patterns 11 and 12.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 11: Evaluation — RAGAS + golden set

Three orthogonal evaluation strands:

1. **Retrieval quality** (no LLM needed):
   - Recall@K, Precision@K, MRR, nDCG against a labelled golden set
   - Build the golden set incrementally: 50 hand-curated
     (query, expected-chunk-ids) pairs, growing to ~300
2. **Generation quality** (RAGAS):
   - **Faithfulness**: does every claim in the answer follow from the
     retrieved context?
   - **Answer relevance**: does the answer address the question?
   - **Context precision**: are the retrieved chunks actually needed?
   - **Context recall**: do the chunks contain the ground-truth answer?
3. **User outcome** (downstream):
   - Resolution rate, thumbs-up/down, escalation rate, time-to-answer

Run #1 and #2 on EVERY PR that touches the RAG pipeline; gate
deploys on no-regression. Run #3 weekly in production.

## Pattern 12: The RAG vs fine-tune vs long-context decision

| Need | Best fit |
| --- | --- |
| Facts that change frequently | RAG |
| Authoritative source-citation requirement | RAG |
| Corpus > model context window | RAG |
| Multi-tenant data isolation | RAG (per-tenant index) |
| Style / tone / domain vocabulary | Fine-tune |
| New skill (output JSON, follow specific template) | Fine-tune + few-shot |
| Reasoning chain across a small bounded corpus | Long context (200K+) |
| Highest answer quality, cost no object, small private docs | Long-context with full doc + cache |

Most production systems combine: a long-context-aware model for
generation, RAG for grounding, optional fine-tune for style.
