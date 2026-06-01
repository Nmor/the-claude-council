# <Workspace Name>

> Workspace-level rules + vendor table. Layered on top of global
> per `~/.claude/CLAUDE.md`. Strictest wins on conflict.

## Tech stack

- **Language**: <Go | TypeScript | Python | Java | Ruby | Rust | etc.>
- **Framework**: <Next.js | FastAPI | Rails | Spring Boot | etc.>
- **Cloud**: <AWS | GCP | Azure | self-hosted>
- **Database**: <Postgres | DynamoDB | MongoDB | etc.>
- **CI**: <GitHub Actions | GitLab CI | CircleCI | etc.>

## Vendor table

| Category | Choice | Reason |
| --- | --- | --- |
| Payments | <vendor> | <one-line rationale> |
| Email | <vendor> | <one-line rationale> |
| Auth | <vendor> | <one-line rationale> |
| Observability | <vendor> | <one-line rationale> |
| Secrets | <vendor> | <one-line rationale> |

## Project-specific rules

See [`rules/`](rules/). Each project rule extends a global rule
with project-specific specifics (vendor names, paths, schema
fields). Workspace rules MAY raise thresholds (stricter) but MUST
NOT lower them.

| Rule | Purpose |
| --- | --- |
| <rule.md> | <one-line summary> |

## Project-specific skills

See [`skills/`](skills/). Workspace skills are rare — they exist
when the project has a domain skill no other codebase needs.

## Project-specific agents

See [`agents/`](agents/). Workspace agents are rare — prefer
global agents under `~/.claude/agents/`.

## Workspace memory

See [`memory/MEMORY.md`](memory/MEMORY.md) for the index.

## Audits

`audits/learning-events.jsonl` carries the continuous-learning
candidate stream per
`~/.claude/rules/common/continuous-learning-mandate.md`.
`audits/bypass-log.jsonl` carries Council-bypass attempt log per
`~/.claude/rules/common/council-default.md`.
