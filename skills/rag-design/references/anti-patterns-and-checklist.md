# rag-design: Anti-Patterns

> Covers: the anti-pattern table and the pre-ship verification checklist. Pointed at by the SKILL.md
> rows "Anti-Patterns" and "Verification Checklist".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Anti-Patterns

| Anti-pattern | Why bad | Fix |
| --- | --- | --- |
| Fixed 512-token chunks regardless of document type | Splits tables, code, headings mid-element | Recursive splitter with content-aware overrides |
| Naive nearest-neighbour with no reranker | Surface-level lexical matches dominate top hits | Add cross-encoder rerank stage |
| Re-embedding daily "to keep things fresh" | Embedding model is the variable; corpus is what should be fresh | Embed on document write; re-embed only on model change |
| One vector store for all tenants | Cross-tenant retrieval leak; performance unpredictable | Per-tenant namespace + metadata filter |
| LLM gets raw query without rewriting | Pronouns + ambiguity tank recall | Conversational rewrite step before retrieval |
| Citations appended after generation as decoration | Model may cite arbitrary IDs; lawyers/auditors mistrust | Validate citations programmatically; reject responses with invalid IDs |
| Vector store as the only source of truth | Lose original document context (markdown, page numbers, version) | Vector store stores `chunk_id`; full document in object store |
| Embedding model swapped mid-corpus without re-index | Incompatible vector spaces → garbage retrieval | Versioned indexes; blue-green re-embedding |
| No evaluation harness | "Quality dropped after the chunking change" is detected by user complaints | RAGAS + golden set in CI |
| PII in retrieved chunks surfaces in answers | Privacy + compliance violation | PII scrubbing at ingestion; per-chunk classification labels |

## Verification Checklist

- [ ] Ingestion pipeline tracks document_id, version, timestamp,
      source, ACLs (per-tenant / per-user)
- [ ] Chunking strategy documented per content type (prose / code /
      tables / transcripts)
- [ ] Embedding model + version pinned; re-embedding plan exists
- [ ] Vector store index type chosen with recall/latency benchmark
      on representative data
- [ ] Hybrid retrieval (dense + BM25 fusion) enabled by default
- [ ] Cross-encoder reranker in the retrieval path (top-50 → top-5)
- [ ] Query rewriting + (optional) HyDE for conversational systems
- [ ] System prompt mandates citations; client validates citation
      IDs match retrieved chunks
- [ ] Golden set of ≥ 50 hand-labelled (query, expected-chunks) pairs
- [ ] RAGAS faithfulness + answer-relevance + context-precision +
      context-recall in CI; thresholds wired to deploy gate
- [ ] Retrieval latency (p95) and cost-per-query dashboards
- [ ] Per-tenant index isolation + ACL filter enforced in retrieval
- [ ] Audit log includes (query, retrieved_chunk_ids, answer,
      citations, model_version, embedding_version, timestamp)
- [ ] PII classification per chunk; PII-tagged chunks redacted or
      blocked per `gdpr-ccpa.md`
- [ ] Stale corpus alert: documents older than the
      domain-appropriate threshold flagged for refresh
- [ ] User feedback loop (thumbs-up/down + free-text) flows back
      into golden set + retraining priority
