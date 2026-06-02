---
name: rag-design
description: Retrieval-Augmented Generation (RAG) system design — chunking, embeddings, vector storage, hybrid retrieval, reranking, evaluation, grounding, and the RAG-vs-fine-tune-vs-long-context decision. Auto-fires when the work touches RAG pipelines, vector databases, embeddings, semantic search, document grounding, or knowledge-base-backed LLM applications.
---

# RAG Design

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

## When to Fire

- Any new feature that grounds LLM output on a corpus (docs, tickets,
  emails, transcripts, code, contracts, scientific literature,
  knowledge graphs)
- Any change to chunking strategy, embedding model, vector store,
  reranker, or retrieval-side prompt template
- Any complaint of "the assistant made something up", "the assistant
  cites the wrong document", "the assistant says it doesn't know
  when it should have found this"
- Any cost spike on embedding or LLM context-window usage
- Any new compliance requirement that mandates citation grounding
  (medical, legal, financial advisory, regulated public-sector)
- Any migration from a generic chatbot to a customer-support or
  internal-search application

Pairs with `prompt-engineering` (the prompt the retrieved context is
packed into), `ml-model-selection` (embedding model choice),
`mlops-patterns` (deployment + evaluation infra), `observability.md`
(retrieval + generation telemetry), `data-retention.md` (corpus
data lifecycle), `audit-logging.md` (citation audit trail),
`gdpr-ccpa.md` (PII in retrieved chunks).

## Core Patterns

### Pattern 1: The seven-layer RAG stack

```text
┌─────────────────────────────────────────────────┐
│  7. Evaluation + Observability                  │ RAGAS, traces, logs
├─────────────────────────────────────────────────┤
│  6. Generation (grounded LLM response + cites)  │ Anthropic, OpenAI
├─────────────────────────────────────────────────┤
│  5. Retrieval (query → ranked chunks)           │ hybrid + rerank
├─────────────────────────────────────────────────┤
│  4. Indexing (vectors + BM25 + metadata)        │ pgvector, Pinecone
├─────────────────────────────────────────────────┤
│  3. Embedding (chunks → vectors)                │ text-embedding-3
├─────────────────────────────────────────────────┤
│  2. Chunking (documents → semantic units)       │ recursive splitter
├─────────────────────────────────────────────────┤
│  1. Ingestion (raw sources → normalised docs)   │ Unstructured, etc.
└─────────────────────────────────────────────────┘
```

Each layer's quality bounds the system. A great LLM cannot save bad
retrieval; great retrieval cannot save bad chunks; great chunks
cannot save a stale corpus.

### Pattern 2: Chunking — recursive with overlap

Default starting point for prose:

| Parameter | Value | Why |
| --- | --- | --- |
| Splitter | Recursive character splitter (paragraph → sentence → word) | Respects natural boundaries |
| Target size | 400-800 tokens per chunk | Fits 3-5 chunks in 4K context; matches embedding model receptive field |
| Overlap | 50-100 tokens | Preserves boundary context |
| Metadata per chunk | document_id, page, section, version, timestamp, source_url | Enables filtering + citation |

For structured corpora, override the default:

- **Markdown**: split on heading hierarchy, keep parent headings as
  prefix to each chunk ("Section 4 > 4.2 > 4.2.3 ...")
- **Code**: split on function/class boundaries; never split
  mid-function
- **HTML**: strip nav/footer, split on semantic landmarks
- **Tables**: keep table + caption + header rows together;
  generate a natural-language summary chunk in addition to the
  table itself
- **Transcripts (audio/video)**: split on speaker turn + timestamp
  every 60-120s
- **Tickets/emails**: one chunk per turn, with thread metadata

### Pattern 3: Contextual retrieval (chunk prefix enrichment)

Anthropic's "Contextual Retrieval" technique: before embedding each
chunk, prepend a short LLM-generated context describing how the
chunk fits in the document. Reduces retrieval failure rate ~35%
in published benchmarks.

```python
def contextual_chunk(document: str, chunk: str) -> str:
    """Generate a 1-2 sentence context prefix."""
    prompt = f"""<document>{document}</document>

Here is a chunk to situate within the document:
<chunk>{chunk}</chunk>

Give a short context (1-2 sentences) describing where this chunk
sits in the document. Answer only with the context."""

    context = llm.complete(prompt, max_tokens=80)
    return f"{context}\n\n{chunk}"
```

Cache the document context to amortise cost across all chunks of the
same document.

### Pattern 4: Embedding model selection

Decision matrix:

| Use case | Model | Dimension | Notes |
| --- | --- | --- | --- |
| Default English, balanced cost/quality | `text-embedding-3-small` | 1536 | Cheap, strong baseline |
| English, quality-first | `text-embedding-3-large` | 3072 | Best OpenAI; Matryoshka truncation supported |
| Multilingual (100+ langs) | `text-embedding-3-large` or `Cohere Embed v3 multilingual` | 1024-3072 | Cohere strong on non-English |
| Self-hosted, English | `BAAI/bge-large-en-v1.5` | 1024 | Top open-weight on MTEB English |
| Self-hosted, multilingual | `intfloat/multilingual-e5-large` | 1024 | Strong cross-lingual |
| Code retrieval | `voyage-code-3` or `jina-embeddings-v2-code` | 1024 | Code-aware |
| Long documents | `voyage-large-2` (16K tokens) | 1536 | Few competitors |
| Domain-specific (legal/medical) | Domain fine-tune on top of strong base | varies | Only if generic underperforms by ≥10pts |

Pin the embedding model + version. Re-embedding the entire corpus
is expensive — and forced when you change models, because vectors
across models are NOT compatible.

### Pattern 5: Vector store choice

```text
┌──────────────┬──────────────────────┬──────────────────────────────┐
│ Store        │ Best for             │ Notes                        │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ pgvector     │ < 10M vectors,       │ Lives next to your data;     │
│              │ Postgres-native      │ HNSW + IVFFlat; ACID         │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ Pinecone     │ Fully managed,       │ Serverless; per-namespace    │
│              │ scale to billions    │ isolation; metadata filters  │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ Weaviate     │ Open-source +        │ GraphQL; built-in modules    │
│              │ object store + vec   │ for embedding/rerank         │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ Qdrant       │ Self-host, fast      │ Rust core; payload filters;  │
│              │                      │ scalar quantisation          │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ Vespa        │ Hybrid (BM25+vec)    │ Yahoo origin; production at  │
│              │ at extreme scale     │ billion-doc scale            │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ Milvus/Zilliz│ Self-host or managed │ FAISS/HNSW/IVF/DiskANN;      │
│              │ huge corpora         │ open source                  │
├──────────────┼──────────────────────┼──────────────────────────────┤
│ Elasticsearch│ Already running it   │ Vector + BM25 in one engine; │
│ / OpenSearch │ for keyword          │ kNN since 8.0                │
└──────────────┴──────────────────────┴──────────────────────────────┘
```

For projects with < 10M vectors and an existing Postgres: start with
`pgvector` — operational simplicity beats theoretical scale headroom.

### Pattern 6: Hybrid retrieval (BM25 + dense)

Dense embeddings excel at semantic matching ("policy violation"
matches "rule infringement"); BM25 excels at lexical matching
(product codes, error messages, proper nouns). Hybrid combines both.

```python
def hybrid_retrieve(query: str, top_k: int = 20):
    # Run both in parallel
    dense_hits = vector_store.search(
        embedding=embed(query), top_k=top_k * 2
    )
    bm25_hits = bm25_index.search(query, top_k=top_k * 2)

    # Reciprocal rank fusion (Cormack et al. 2009)
    k = 60  # standard hyperparameter
    scores = {}
    for rank, hit in enumerate(dense_hits):
        scores[hit.id] = scores.get(hit.id, 0) + 1 / (k + rank)
    for rank, hit in enumerate(bm25_hits):
        scores[hit.id] = scores.get(hit.id, 0) + 1 / (k + rank)

    return sorted(scores.items(), key=lambda x: -x[1])[:top_k]
```

### Pattern 7: Reranking with cross-encoders

Bi-encoder retrieval (embed query + chunks separately, then dot-
product) is fast but loses precision. A cross-encoder re-scores
the top-N retrieved chunks by feeding `(query, chunk)` pairs through
the same model — slower per item but dramatically more accurate.

```python
from cohere import Client

cohere = Client(api_key=...)

def retrieve_and_rerank(query: str, final_k: int = 5):
    # 1. Hybrid retrieval — get top 50 candidates
    candidates = hybrid_retrieve(query, top_k=50)

    # 2. Rerank with cross-encoder
    reranked = cohere.rerank(
        model="rerank-v3.5",
        query=query,
        documents=[c.text for c in candidates],
        top_n=final_k,
    )

    return [candidates[r.index] for r in reranked.results]
```

Reranking lifts Recall@5 by 10-30 percentage points in most
production deployments. Cohere Rerank, Voyage Rerank-2, and
self-hosted `BAAI/bge-reranker-v2-m3` are strong choices.

### Pattern 8: Query rewriting + HyDE

User queries are often underspecified, conversational, or
contain pronouns referencing prior turns. Rewrite before retrieval.

**Conversational rewrite**:

```python
def rewrite_for_retrieval(history: list[Message], query: str) -> str:
    prompt = f"""Given the conversation history and the latest user
query, rewrite the query as a self-contained search query that
captures the user's information need.

History:
{format_history(history)}

Latest query: {query}

Rewritten query:"""
    return llm.complete(prompt, max_tokens=80).strip()
```

**HyDE (Hypothetical Document Embeddings)**: ask the LLM to
hallucinate a plausible answer to the query, then embed the
hallucinated answer instead of the query. The hallucination is
semantically closer to real answers than the question is.

```python
def hyde_retrieve(query: str, top_k: int = 10):
    hypothetical = llm.complete(
        f"Write a plausible passage answering: {query}",
        max_tokens=200,
    )
    return vector_store.search(embedding=embed(hypothetical), top_k=top_k)
```

HyDE shines on zero-shot retrieval against corpora the embedding
model hasn't seen domain-specific terminology for.

### Pattern 9: Context packing — combat "lost in the middle"

Liu et al. (2024) showed that LLMs preferentially attend to the
START and END of the context window, with degraded performance for
content in the middle. Implications:

- Keep total retrieved context ≤ 6-8 chunks (model-dependent)
- Place the most relevant chunk FIRST or LAST
- Insert a "Most relevant passage:" header on the top hit
- Use chunk IDs in citations so the model can reference them
  unambiguously

```python
def pack_context(chunks: list[Chunk], query: str) -> str:
    # Sort by rerank score; place top hit first AND last (duplicated
    # marker) is one common trick, but for clarity prefer:
    body = ""
    for i, c in enumerate(chunks, start=1):
        body += f"[{i}] (source: {c.source}, version: {c.version})\n"
        body += f"{c.text}\n\n"
    return body
```

### Pattern 10: Grounded generation with citations

The system prompt MUST instruct the model to cite, and the
client MUST enforce citation presence post-hoc.

```python
SYSTEM_PROMPT = """You answer using ONLY the provided context.

Rules:
- Cite each factual claim with [N] referencing the chunk number.
- If the context does not contain the answer, say "I don't have
  that information in my sources" — do not guess.
- Do not invent chunk numbers.
- Quote short verbatim phrases only when they materially change
  meaning.

Context:
{context}

Question: {question}"""

def grounded_answer(query: str, history: list[Message]) -> Answer:
    rewritten = rewrite_for_retrieval(history, query)
    chunks = retrieve_and_rerank(rewritten, final_k=6)
    context = pack_context(chunks, rewritten)

    response = llm.complete(
        system=SYSTEM_PROMPT.format(context=context, question=query),
        max_tokens=800,
    )

    cites = extract_citation_ids(response.text)
    validate_citations(cites, chunks)  # raises if invalid
    return Answer(text=response.text, sources=[chunks[i-1] for i in cites])
```

### Pattern 11: Evaluation — RAGAS + golden set

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

### Pattern 12: The RAG vs fine-tune vs long-context decision

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

## Standards Cited

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

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- Chunking strategy chosen arbitrarily (fixed 512 tokens) without measuring retrieval quality
- Single-vector retrieval without hybrid (BM25 + vector) — recall gap on rare terms
- Reranking step absent on multi-document corpora (precision gap at top-k)
- Tenant isolation absent in vector store (cross-tenant content leak)
- Embedding model deprecated by vendor without migration plan (per `~/.claude/rules-library/common/deprecation-lifecycle.md`)
- Source citation absent from grounded answers (hallucination opacity)
- Retrieval evaluation suite missing (no recall@k / nDCG / answer-faithfulness metrics)
- Long-context model used where RAG would be cheaper + more current (per `~/.claude/skills/cost-aware-llm-pipeline/SKILL.md`)
- PII-bearing chunk indexed without classification (per `~/.claude/rules-library/common/gdpr-ccpa.md`)
- Stale chunks (source doc updated, index not refreshed) — staleness window unmonitored

**Refinement candidates**:

- New chunking-strategy row when a new domain (legal, code, medical) surfaces with specific needs
- New cross-reference when a sister skill (prompt-engineering, mlops-patterns, fine-tuning-workflows, ml-model-selection) adds a RAG gate
- New eval template when a new failure class (e.g., out-of-distribution query) recurs
- Tightening of the hybrid-retrieval rule when single-vector recall gap reaches production
