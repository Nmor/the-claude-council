# rag-design: Generation

> Covers: context packing against lost-in-the-middle, and grounded generation with validated
> citations (Patterns 9-10). Pointed at by the SKILL.md rows for Patterns 9 and 10.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 9: Context packing — combat "lost in the middle"

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

## Pattern 10: Grounded generation with citations

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
