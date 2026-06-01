---
name: project-guidelines-example
description: Template for authoring a project-specific skill in `<workspace>/.claude/skills/`. Demonstrates the canonical shape — Architecture / File Structure / Code Patterns / Testing Requirements / Deployment Workflow / Critical Rules — that workspace skills follow when they extend global guidance with project-specific specifics. Use this file as a starting point; copy + customise per the project's actual stack.
---

# Project Guidelines Skill (Template)

> Template skill — NOT a global guidance source. The example
> sections below show the SHAPE of a workspace-specific skill;
> the content is illustrative. Per
> `~/.claude/rules/common/rule-authoring-global-vs-project.md`,
> project-specific guidance lives in `<workspace>/.claude/skills/`
> and `<workspace>/.claude/rules/`, never in global. Per
> `~/.claude/rules/common/project-scoped-artifacts.md`, every
> project's first significant Council-mediated task auto-spawns
> a `<workspace>/.claude/` scaffold; this template is one of the
> things that scaffold can copy from.

## Purpose

A workspace-specific skill captures:

- The project's tech stack (runtime + language + framework + DB
  + queue + cache + CDN + auth provider) at PINNED versions
- The project's file layout
- Project-specific code patterns + reuse-first primitives
- Testing requirements that EXTEND global (`extreme-lint-policy.md`
  + `testing.md`) with project-specific thresholds
- Deployment workflow + env vars
- Critical rules that EXTEND global (never relax)
- Cross-references to the project's `CLAUDE.md` + sister
  workspace files

This skill is the canonical shape. Copy it, rename it (e.g.,
`<project>-patterns`), and replace the illustrative content with
your project's actual specifics.

## When to use this template

- A new project is being scaffolded (per
  `~/.claude/rules/common/project-scoped-artifacts.md`)
- An existing project lacks a workspace-skill summary
- A project's onboarding doc has drifted from reality and needs
  re-anchoring to current source
- A project's stack has changed (framework major bump, DB swap,
  cloud migration) and the workspace skill needs a refresh

## When NOT to use

- For UNIVERSAL guidance (every project's coding standards, every
  language's lint rules, every cloud's deploy pattern) — that
  lives in `~/.claude/skills/` + `~/.claude/rules/common/`
- For one-off project notes that aren't pattern-shaped (those go
  in `<workspace>/.claude/memory/` per
  `~/.claude/projects/-Users-APPLE/memory/MEMORY.md` index
  conventions)
- For temporary in-flight decisions awaiting commit — those go
  in `<workspace>/.claude/plans/<slug>.md` per
  `~/.claude/rules/common/plan-task-breakdown.md`

---

## EXAMPLE CONTENT — copy + customise everything below

The sections below illustrate the shape. Replace the
illustrative stack with your project's actual tech choices.
The placeholders `<your-app>`, `<your-cloud>`, `<your-db>` are
intentional reminders to substitute.

### Architecture Overview

**Tech Stack (illustrative — replace with your stack):**

- **Frontend**: Next.js (current LTS — App Router), TypeScript
  (strict mode), React, Tailwind
- **Backend**: FastAPI on Python 3.12+, Pydantic v2 models
- **Database**: PostgreSQL via Supabase (or RDS / Cloud SQL /
  Neon — your choice)
- **AI**: Claude API (current models per
  `~/.claude/rules/common/performance.md`) — opus for coding /
  reviewing / planning, haiku for doc generation
- **Deployment**: Cloud Run / Vercel / Fly.io / Lambda — your
  choice
- **Testing**: Playwright (E2E), pytest (backend), Vitest +
  React Testing Library (frontend)

**Services (illustrative diagram):**

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  Next.js (current LTS) + TypeScript (strict) + Tailwind     │
│  Deploy target: Vercel / Cloud Run / equivalent             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│  FastAPI + Python 3.12+ + Pydantic v2                       │
│  Deploy target: Cloud Run / Lambda / equivalent             │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Postgres │   │  Claude  │   │  Redis   │
        │   (RDS)  │   │   API    │   │ (cache)  │
        └──────────┘   └──────────┘   └──────────┘
```

### File structure (illustrative)

```
<workspace>/
├── frontend/
│   └── src/
│       ├── app/                  # Next.js app router pages
│       │   ├── api/              # API routes
│       │   ├── (auth)/           # Auth-protected routes
│       │   └── workspace/        # Main app workspace
│       ├── components/
│       │   ├── ui/               # Base UI primitives (reuse-first)
│       │   ├── forms/
│       │   └── layouts/
│       ├── hooks/                # Custom React hooks
│       ├── lib/                  # Utilities (reuse-first home)
│       ├── types/
│       └── config/
│
├── backend/
│   ├── routers/                  # FastAPI route handlers
│   ├── models.py                 # Pydantic models
│   ├── main.py                   # FastAPI app entry
│   ├── auth_system.py
│   ├── database.py
│   ├── services/
│   └── tests/                    # pytest tests
│
├── deploy/
├── docs/
└── scripts/
```

### Code patterns (illustrative)

#### API response envelope (FastAPI)

```python
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
    details: Optional[dict] = None

    @classmethod
    def ok(cls, data: T) -> "ApiResponse[T]":
        return cls(success=True, data=data)

    @classmethod
    def fail(cls, code: str, message: str, details: dict | None = None) -> "ApiResponse[T]":
        return cls(success=False, error_code=code, message=message, details=details)
```

Per `~/.claude/rules/common/error-codes.md` + `error-handling-with-context.md`,
error responses carry a stable `error_code` (machine) + a
human-readable `message` + structured `details`. Tests assert on
`error_code`, never on `message`.

#### Frontend API client (TypeScript)

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error_code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        success: false,
        error_code: body.error_code ?? `http_${response.status}`,
        message: body.message ?? `HTTP ${response.status}`,
        details: body.details,
      };
    }

    return await response.json();
  } catch (err) {
    return {
      success: false,
      error_code: "network_error",
      message: String(err),
    };
  }
}
```

#### Claude AI integration (structured output)

```python
import os
from anthropic import Anthropic
from pydantic import BaseModel


class AnalysisResult(BaseModel):
    summary: str
    key_points: list[str]
    confidence: float


async def analyze_with_claude(content: str) -> AnalysisResult:
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = client.messages.create(
        # Use the current Claude model. Per
        # ~/.claude/rules/common/performance.md, opus for
        # coding/reviewing/planning, haiku for mechanical work.
        # Pin to the latest GA model ID via your config layer.
        model=os.environ["ANTHROPIC_MODEL"],
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
        tools=[{
            "name": "provide_analysis",
            "description": "Provide structured analysis",
            "input_schema": AnalysisResult.model_json_schema(),
        }],
        tool_choice={"type": "tool", "name": "provide_analysis"},
    )

    tool_use = next(
        block for block in response.content
        if block.type == "tool_use"
    )

    return AnalysisResult(**tool_use.input)
```

Model IDs change as Anthropic releases new versions. Source the
ID from env / config, not from a hardcoded literal — that lets
you roll forward without code changes. Per
`~/.claude/skills/claude-api/` for the canonical Claude API
patterns.

#### Custom React hook (typed)

```typescript
import { useState, useCallback } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error_code: string | null;
  message: string | null;
}

export function useApi<T>(fetchFn: () => Promise<ApiResponse<T>>) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error_code: null,
    message: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error_code: null, message: null }));

    const result = await fetchFn();

    if (result.success) {
      setState({ data: result.data ?? null, loading: false, error_code: null, message: null });
    } else {
      setState({
        data: null,
        loading: false,
        error_code: result.error_code ?? "unknown",
        message: result.message ?? "Unknown error",
      });
    }
  }, [fetchFn]);

  return { ...state, execute };
}
```

### Testing requirements

Per `~/.claude/rules/common/extreme-lint-policy.md` +
`~/.claude/rules/common/testing.md`, the project enforces:

- **Touched-file coverage**: ≥ 90% line + branch
- **Project coverage**: ≥ 80% line + branch
- **Critical paths** (auth, payments, data-mutation, multi-tenant
  isolation): ≥ 95%

Workspace-specific overrides may RAISE these floors; they cannot
relax them. The previous global floor was 70% under the older
`tdd-workflow` skill description — current global is 80/90/95.

#### Backend (pytest) commands

```bash
# Run all tests
uv run pytest tests/   # or `poetry run pytest tests/`

# Coverage
uv run pytest tests/ --cov=. --cov-report=html --cov-fail-under=80

# Single file
uv run pytest tests/test_auth.py -v
```

```python
import pytest
from httpx import AsyncClient
from main import app


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint_returns_ok(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_stable_code(client: AsyncClient):
    response = await client.get("/api/protected")
    assert response.status_code == 401
    body = response.json()
    # Assert on stable code per ~/.claude/rules/common/error-codes.md
    assert body["error_code"] == "auth_missing_token"
```

#### Frontend (Vitest + React Testing Library) commands

```bash
pnpm test                  # run unit tests
pnpm test --coverage       # with coverage
pnpm test:e2e              # Playwright E2E
```

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WorkspacePanel } from "./WorkspacePanel";

describe("WorkspacePanel", () => {
  it("renders workspace landmark", () => {
    render(<WorkspacePanel />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("handles session creation", async () => {
    render(<WorkspacePanel />);
    fireEvent.click(screen.getByText("New Session"));
    expect(await screen.findByText("Session created")).toBeInTheDocument();
  });
});
```

### Deployment workflow

#### Pre-deployment checklist

Per `~/.claude/rules/common/done-criteria.md` +
`~/.claude/rules/common/plan-completion-before-push.md`, before
any deploy:

- [ ] All tests passing locally
- [ ] `pnpm build` succeeds (frontend)
- [ ] `uv run pytest --cov-fail-under=80` passes (backend)
- [ ] No hardcoded secrets (per
      `~/.claude/rules/common/secrets-management.md`)
- [ ] Environment variables documented + present in vault
- [ ] Database migrations reviewed (per
      `~/.claude/rules/common/schema-evolution.md`)
- [ ] CVE gate green (per
      `~/.claude/rules/common/dependency-vulnerabilities.md`)
- [ ] License gate green (per
      `~/.claude/rules/common/license-allowlist-gate.md`)
- [ ] Docs in sync (per
      `~/.claude/rules/common/docs-sync-with-code.md`)

#### Deployment commands (illustrative)

```bash
# Frontend
cd frontend
pnpm install --frozen-lockfile
pnpm build
# Then deploy via your platform: vercel deploy / gcloud run deploy / etc.

# Backend
cd backend
uv sync
# Deploy via your platform of choice
```

#### Environment variables (illustrative)

```bash
# Frontend (.env.local — gitignored; populated from vault)
NEXT_PUBLIC_API_URL=https://api.<your-domain>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-vault>

# Backend (.env — gitignored; populated from vault)
DATABASE_URL=postgresql://<from-vault>
ANTHROPIC_API_KEY=<from-vault>
ANTHROPIC_MODEL=<current-model-id-pinned-in-config>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<from-vault>
```

Per `~/.claude/rules/common/secrets-management.md`, secrets come
from a vault (Keychain via aws-vault, 1Password CLI, doppler,
AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault),
NEVER from a committed file. The `.env.example` lists every var
with placeholder values.

### Critical rules (workspace-specific extensions of global)

Per `~/.claude/rules/common/rule-authoring-global-vs-project.md`,
workspace rules MAY raise thresholds, never lower. The following
extends global:

1. **No emojis** in code, comments, or documentation
   (illustrative team preference)
2. **Immutability** — never mutate objects or arrays
   (extends global `coding-style.md`)
3. **TDD** — write tests before implementation
   (extends global `testing.md`)
4. **Coverage** — ≥ 80% project / ≥ 90% touched / ≥ 95% on auth,
   payment, multi-tenant isolation
   (matches global `extreme-lint-policy.md`)
5. **File length** — 200-400 lines typical, 500 max
   (matches global S104 cap in `sonarlint-checks.md`)
6. **No `print` / `console.log`** in production code (matches
   global `no-discards.md`)
7. **Proper error handling** with structured envelope (matches
   global `error-handling-with-context.md` + `error-codes.md`)
8. **Input validation** with Pydantic v2 / Zod at every boundary

## Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Copying this template verbatim without customising | Replace every `<placeholder>` and illustrative version pin with the project's real values |
| Workspace skill lowering a global threshold (e.g., "this project only requires 60% coverage") | Workspace rules can RAISE thresholds, never LOWER them per `rule-authoring-global-vs-project.md` rule 4 |
| Pinning a Claude model ID literal in code | Source from env / config so model upgrades roll forward without code changes |
| Pinning an EOL runtime (Python 3.11, Node 18) | Use current LTS per `~/.claude/rules/common/updated-frameworks.md` |
| Restating global rules verbatim in the workspace skill | Workspace skill should ADD project-specifics; cross-reference global rather than duplicate |
| Skipping the `.env.example` placeholder list | Every env var the app reads must appear in `.env.example` with a placeholder value per `~/.claude/rules/common/local-dev-setup.md` |
| Coverage threshold stuck at 70% (older `tdd-workflow` default) | Match `~/.claude/rules/common/extreme-lint-policy.md` — 80% project / 90% touched / 95% critical paths |

## Verification checklist

When using this template for a new project, confirm:

- [ ] Every `<placeholder>` (`<your-app>`, `<your-cloud>`,
      `<your-domain>`) replaced with the project's actual value
- [ ] Stack section reflects current installed versions
      (`package.json`, `pyproject.toml`, `go.mod`)
- [ ] File structure matches actual repo layout
- [ ] Code patterns match the actual project's reuse-first
      primitives (per `~/.claude/rules/common/reuse-first.md`)
- [ ] Coverage thresholds ≥ global floors (80 / 90 / 95)
- [ ] Critical rules EXTEND global; do NOT lower any threshold
- [ ] `.env.example` lists every env var
- [ ] Deployment commands tested on a fresh clone
- [ ] Workspace `CLAUDE.md` cross-references this skill
- [ ] Workspace's `<workspace>/.claude/skills/` index updated

## Standards + references

- **Diátaxis framework** — pattern this skill follows
  (reference + how-to + tutorial + explanation mix)
- **arc42** — architecture documentation template
- **C4 Model** (Brown) — context / container / component diagrams
- **Conway's Law** — file structure follows team structure
- Project's own:
  - `<workspace>/CLAUDE.md` — project quick-reference + vendor
    list
  - `<workspace>/.claude/rules/` — workspace-specific rules
  - `<workspace>/.claude/plans/` — multi-phase plans
  - `<workspace>/.claude/memory/` — workspace-specific memories

## Cross-references

- `~/.claude/rules/common/rule-authoring-global-vs-project.md` —
  classification of new rules (global vs project)
- `~/.claude/rules/common/project-scoped-artifacts.md` —
  workspace `.claude/` scaffold creation on first significant
  work
- `~/.claude/rules/common/reuse-first.md` — project's
  reuse-first sweep before adding new primitives
- `~/.claude/rules/common/extreme-lint-policy.md` — coverage +
  complexity thresholds the workspace inherits
- `~/.claude/rules/common/testing.md` — test types + coverage
  floors
- `~/.claude/rules/common/error-codes.md` +
  `~/.claude/rules/common/error-handling-with-context.md` —
  stable error envelope conventions
- `~/.claude/rules/common/local-dev-setup.md` — 30-minute
  fresh-clone bootstrap
- `~/.claude/rules/common/secrets-management.md` — vault-based
  secrets
- `~/.claude/rules/common/docs-sync-with-code.md` — docs ship in
  the same PR as code
- `~/.claude/rules/common/performance.md` — Claude model
  selection policy (opus default, haiku for mechanical)
- `~/.claude/skills/coding-standards/` — universal coding
  standards
- `~/.claude/skills/api-design/` — REST API design patterns
- `~/.claude/skills/backend-patterns/` — backend patterns
- `~/.claude/skills/frontend-patterns/` — frontend patterns
- `~/.claude/skills/tdd-workflow/` — TDD methodology
- `~/.claude/skills/claude-api/` — Claude SDK / model migration

## Why this skill exists

A project without a workspace-specific skill makes every new
contributor re-discover the project's stack, conventions, and
critical paths. The workspace skill is the SAME shape across
projects (architecture / structure / patterns / testing /
deployment / rules) so a contributor who knows one project's
shape can navigate any project's shape immediately. The
project-specific CONTENT changes; the SHAPE doesn't.

This template encodes the shape. Per
`~/.claude/rules/common/project-scoped-artifacts.md`, every
project's `.claude/` scaffold can copy this template when
spawning its workspace skill on first significant work.

## Standards Cited

- **ISO/IEC/IEEE 12207:2017** — Software life cycle processes
  (project guidelines fit within §6.4 implementation process)
- **ISO/IEC 25010:2011** — Quality model (project guidelines
  enforce maintainability + reliability + security)
- **NIST SP 800-218 SSDF §PO.1 + §PO.3** — Define security
  requirements + implement supporting toolchains
- **NIST SP 800-53 Rev 5 §SA-15** — Development process,
  standards, and tools
- **OWASP ASVS 4.0.3 §V1.1** — Secure software development
  lifecycle
- **CWE-1059** — Insufficient technical documentation
- **`~/.claude/rules/common/rule-authoring-global-vs-project.md`** —
  Classification (global guidance vs project specifics)
- **`~/.claude/rules/common/project-scoped-artifacts.md`** —
  Project-bound `.claude/` scaffold

## Cross-References

- `~/.claude/rules/common/rule-authoring-global-vs-project.md` —
  classification of project-specific guidance
- `~/.claude/rules/common/project-scoped-artifacts.md` — workspace
  `.claude/` scaffold structure
- `~/.claude/rules/common/auto-skills.md` — skill auto-fire
  registry
- `configure-ecc` skill — installs project-scoped Claude config
- `~/.claude/CLAUDE.md` — Council protocol the project guidelines
  inherit
- `~/.claude/rules/common/extreme-lint-policy.md` — strictness
  baseline a project guidelines example illustrates


## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Project guidelines duplicate global rule content | Drift over time; contradictions when global updates | Reference global rule; add only project-specific overlays |
| Project rule LOWERS a global threshold | "strictest wins" principle violated | Project rules can only RAISE thresholds, never lower |
| Project `.claude/` scattered across multiple subdirs | Discoverability broken; agents miss context | Single `<workspace>/.claude/` scaffold per `project-scoped-artifacts.md` |
| Guidelines written in prose narrative without rules | Hard to enforce; hard to verify | Each guideline = one testable rule + verification |
| New rule landed without classification (global vs project) | Project specifics pollute global surface | Classify before writing per `rule-authoring-global-vs-project.md` |
| Sample project rule references internal tickets / PR numbers | Rots over time; tracker drift | Plain-English why-only; tracker refs belong in PR description |
| Project-specific vendor list in global `CLAUDE.md` | Pollutes global; other projects see irrelevant context | Vendor list in `<workspace>/.claude/CLAUDE.md` |
| Project guidelines not version-controlled with code | Out-of-sync with codebase; review-bypass | Guidelines live in repo; reviewed in PRs |


## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- New workspace `.claude/skills/` created without using this
  template (template adoption gap — surface to surface the
  scaffold flow per `project-scoped-artifacts.md`)
- Workspace skill that LOWERS a global threshold (rule-authoring
  rule 4 violation — strictest wins)
- Project-skill restating global rules verbatim instead of
  extending (DRY violation; should cross-reference global)
- Pinned EOL runtime version in a workspace skill (sister
  `updated-frameworks.md` weakening)
- Hardcoded Claude model ID literal in workspace code samples
  (sister `claude-api` skill + `performance.md` weakening)
- Coverage threshold left at 70% in a workspace skill (this
  template's previous default — needs update to 80/90/95)
- Workspace skill missing the `.env.example` reference
- Cross-reference list in this template gets stale relative to
  the global rules catalogue

**Refinement candidates**:
- New illustrative section when a recurring stack shape emerges
  across 3+ workspaces (e.g., Tauri desktop, Solidity contracts,
  Flutter mobile, Electron + Rust core)
- Tightening of the verification checklist when a recurring
  template-customisation miss surfaces in retrospectives
- New cross-reference when a sister rule (project-scoped-
  artifacts, rule-authoring-global-vs-project, continuous-
  learning-mandate) prescribes a workspace-skill behaviour this
  template should encode
- Promotion of a workspace-specific pattern to global when the
  same shape appears in 2+ workspaces (per
  `rule-authoring-global-vs-project.md` rule 7 promotion path)
