# rag-design: Architecture and chunking

> Covers: the seven-layer stack, chunking strategy per content type, and contextual chunk enrichment
> (Patterns 1-3). Pointed at by the SKILL.md rows for Patterns 1, 2 and 3.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 1: The seven-layer RAG stack

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

## Pattern 2: Chunking — recursive with overlap

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

## Pattern 3: Contextual retrieval (chunk prefix enrichment)

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
