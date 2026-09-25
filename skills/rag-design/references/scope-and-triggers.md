# rag-design: When to Fire

> Covers: when this skill fires and what it pairs with. Pointed at by the SKILL.md row "When to
> Fire".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

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
