# rag-design: Retrieval

> Covers: hybrid retrieval, cross-encoder reranking, and query rewriting + HyDE (Patterns 6-8).
> Pointed at by the SKILL.md rows for Patterns 6, 7 and 8.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 6: Hybrid retrieval (BM25 + dense)

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

## Pattern 7: Reranking with cross-encoders

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

## Pattern 8: Query rewriting + HyDE

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
