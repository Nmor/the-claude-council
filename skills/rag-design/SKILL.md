---
name: rag-design
description: Retrieval-Augmented Generation (RAG) system design — chunking, embeddings, vector storage, hybrid retrieval, reranking, evaluation, grounding, and the RAG-vs-fine-tune-vs-long-context decision. Auto-fires when the work touches RAG pipelines, vector databases, embeddings, semantic search, document grounding, or knowledge-base-backed LLM applications.
---

# RAG Design

> **Size budget: 25 KB.** Check: wc -c. Gate: node ~/.claude/scripts/token-budget.mjs --check
>
> Retrieval-Augmented Generation pipeline engineering — corpus
> ingestion through grounded generation with evaluation, observability,
> and hallucination mitigation built in from day one.

## Purpose

RAG systems combine a retriever (finds relevant context from a corpus)
with a generator (an LLM that conditions its output on the retrieved
context). The promise: grounded answers backed by source citations,
without needing to fine-tune the model on the entire corpus. The
failure modes: irrelevant retrieval, lost-in-the-middle context, stale
embeddings, hallucinated citations, query drift, and unbounded cost.

This skill names the design decisions that determine whether a RAG
system answers "what is the latest revision of the refund policy?"
correctly every time, or hallucinates a plausible-sounding policy
that doesn't exist. The decisions span six layers: ingestion,
chunking, embedding, indexing, retrieval, and generation — plus the
seventh layer that ties them together: evaluation.

NOT in scope: classical IR keyword search alone (handled by Elastic
/ OpenSearch / Algolia patterns); fine-tuning the underlying model
(see `fine-tuning-workflows`); LLM prompt engineering for non-RAG
applications (see `prompt-engineering`).

## Standards Cited

- **Lewis P., et al. (2020)** — "Retrieval-Augmented Generation for
  Knowledge-Intensive NLP Tasks", NeurIPS 2020 (original RAG paper)
- **OpenAI Embeddings API documentation** — `text-embedding-3-large`
  (3072 dim), `text-embedding-3-small` (1536 dim), pricing and
  performance characteristics
- **Anthropic Contextual Retrieval guidance (2024)** —
  context-aware chunk prefixes + BM25 + reranker pattern
- **MTEB (Massive Text Embedding Benchmark)** — Muennighoff et al.
  2023, 56 embedding tasks, 8 task families
- **BEIR (Benchmarking IR)** — Thakur et al. 2021, 18 retrieval
  datasets for zero-shot generalisation
- **RAGAS framework** — Es et al. 2023, automated RAG evaluation
  (faithfulness, answer relevance, context precision/recall)
- **Karpukhin V., et al. (2020)** — "Dense Passage Retrieval for
  Open-Domain QA", EMNLP 2020 (DPR)
- **Khattab O., Zaharia M. (2020)** — "ColBERT: Efficient and
  Effective Passage Search via Contextualized Late Interaction over
  BERT", SIGIR 2020
- **Gao L., et al. (2023)** — "Precise Zero-Shot Dense Retrieval
  without Relevance Labels" (HyDE method)
- **Liu N., et al. (2024)** — "Lost in the Middle: How Language
  Models Use Long Contexts", TACL 2024
- **Cohere Rerank v3** + **Voyage Rerank-2** documentation —
  cross-encoder reranking APIs
- **pgvector documentation** — IVFFlat + HNSW index types in
  PostgreSQL
- **Pinecone, Weaviate, Qdrant, Vespa, Milvus** — managed and
  self-hosted vector store reference architectures
- **LlamaIndex** and **LangChain** RAG documentation — orchestration
  patterns
- **NIST AI RMF 1.0 (2023)** — measurement of trustworthiness
  attributes for generative systems
- **EU AI Act (Reg 2024/1689) Article 50** — transparency obligations
  including disclosure when output is AI-generated

- **NIST AI RMF 1.0** — AI risk management framework (Govern / Map /
  Measure / Manage functions; MEASURE 2 covers model evaluation)
- **NIST SP 800-218A SSDF for AI** — Secure Software Development
  Framework profile for AI models (§PW.4, §PW.6, §PW.8)
- **NIST SP 800-53 Rev 5 §SI-4, §SI-7** — Information system
  monitoring + software integrity (applies to model + dataset
  artifacts)
- **ISO/IEC 23053:2022 §7** — Framework for AI systems using ML
- **ISO/IEC 23894:2023** — AI risk management
- **ISO/IEC 42001:2023** — AI management system requirements
- **OWASP Top 10 for LLM Applications (2025)** — LLM01 Prompt
  Injection, LLM02 Sensitive Information Disclosure, LLM06
  Excessive Agency, LLM09 Misinformation, LLM10 Unbounded
  Consumption
- **OWASP ML Top 10 (2023)** — ML01-ML10 (adversarial inputs,
  data poisoning, model inversion, etc.)
- **CWE-1039** — Automated recognition mechanism with inadequate
  detection or handling of adversarial input perturbations
- **CWE-1426** — Improper validation of generative AI output
- **EU AI Act (Regulation 2024/1689)** — risk-based obligations
  for general-purpose AI models + high-risk systems
- **`~/.claude/rules/common/council-triggers.md`** (Division 15) — bias,
  fairness, dataset provenance, human-in-the-loop gates

## Routing table

This skill uses progressive disclosure: the detail lives in `references/`, one file per concern.
Read the row you need; do not load the whole set.

| Topic | Read |
| --- | --- |
| When to Fire — triggers, and the skills this pairs with | [`references/scope-and-triggers.md`](references/scope-and-triggers.md) |
| Anti-Patterns — the ten failure shapes and their fixes | [`references/anti-patterns-and-checklist.md`](references/anti-patterns-and-checklist.md) |
| Verification Checklist — the pre-ship gate | [`references/anti-patterns-and-checklist.md`](references/anti-patterns-and-checklist.md) |
| Cross-References · Why This Skill Exists · Learning hooks | [`references/rationale-and-learning.md`](references/rationale-and-learning.md) |

## Core Patterns

| # | Pattern | Read |
| --- | --- | --- |
| 1 | The seven-layer RAG stack | [`references/architecture-and-chunking.md`](references/architecture-and-chunking.md) |
| 2 | Chunking — recursive with overlap | [`references/architecture-and-chunking.md`](references/architecture-and-chunking.md) |
| 3 | Contextual retrieval (chunk prefix enrichment) | [`references/architecture-and-chunking.md`](references/architecture-and-chunking.md) |
| 4 | Embedding model selection | [`references/embeddings-and-stores.md`](references/embeddings-and-stores.md) |
| 5 | Vector store choice | [`references/embeddings-and-stores.md`](references/embeddings-and-stores.md) |
| 6 | Hybrid retrieval (BM25 + dense) | [`references/retrieval.md`](references/retrieval.md) |
| 7 | Reranking with cross-encoders | [`references/retrieval.md`](references/retrieval.md) |
| 8 | Query rewriting + HyDE | [`references/retrieval.md`](references/retrieval.md) |
| 9 | Context packing — combat "lost in the middle" | [`references/generation.md`](references/generation.md) |
| 10 | Grounded generation with citations | [`references/generation.md`](references/generation.md) |
| 11 | Evaluation — RAGAS + golden set | [`references/evaluation.md`](references/evaluation.md) |
| 12 | The RAG vs fine-tune vs long-context decision | [`references/evaluation.md`](references/evaluation.md) |
