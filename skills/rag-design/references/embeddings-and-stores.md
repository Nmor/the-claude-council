# rag-design: Embeddings and stores

> Covers: embedding model selection and vector store choice (Patterns 4-5). Pointed at by the
> SKILL.md rows for Patterns 4 and 5.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 4: Embedding model selection

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

## Pattern 5: Vector store choice

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
