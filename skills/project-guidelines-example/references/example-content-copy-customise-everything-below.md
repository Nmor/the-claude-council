# project-guidelines-example: EXAMPLE CONTENT — copy + customise everything below

> Covers **EXAMPLE CONTENT — copy + customise everything below** for the
> `project-guidelines-example` skill. Routed from the reference map in `../SKILL.md`.
>
> **Size budget: 17 KB** — `token-budget.mjs --check`.

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
  `~/.claude/rules-library/common/performance.md`) — opus for coding /
  reviewing / planning, haiku for doc generation
- **Deployment**: Cloud Run / Vercel / Fly.io / Lambda — your
  choice
- **Testing**: Playwright (E2E), pytest (backend), Vitest +
  React Testing Library (frontend)

**Services (illustrative diagram):**

```text
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

```text
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

Per `~/.claude/rules-library/common/error-codes.md` + `error-handling-with-context.md`,
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
        # ~/.claude/rules-library/common/performance.md, opus for
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

Per `~/.claude/rules-library/common/extreme-lint-policy.md` +
`~/.claude/rules-library/common/testing.md`, the project enforces:

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
    # Assert on stable code per ~/.claude/rules-library/common/error-codes.md
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
      `~/.claude/rules-library/common/secrets-management.md`)
- [ ] Environment variables documented + present in vault
- [ ] Database migrations reviewed (per
      `~/.claude/rules-library/common/schema-evolution.md`)
- [ ] CVE gate green (per
      `~/.claude/rules-library/common/dependency-vulnerabilities.md`)
- [ ] License gate green (per
      `~/.claude/rules-library/common/license-allowlist-gate.md`)
- [ ] Docs in sync (per
      `~/.claude/rules-library/common/docs-sync-with-code.md`)

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

Per `~/.claude/rules-library/common/secrets-management.md`, secrets come
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
