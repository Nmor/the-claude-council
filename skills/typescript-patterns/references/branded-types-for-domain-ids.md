# typescript-patterns: Branded Types For Domain IDs

> Covers **Branded Types For Domain IDs** for the `typescript-patterns` skill. Routed from the
> reference map in `../SKILL.md`.
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Branded Types For Domain IDs

Two strings of different meaning shouldn't be interchangeable. Brand them:

```ts
type OrgId = string & { readonly __brand: "OrgId" };
type UserId = string & { readonly __brand: "UserId" };

function makeOrgId(s: string): OrgId { return s as OrgId; }

function deleteUser(orgId: OrgId, userId: UserId): void { /* ... */ }

// deleteUser(userId, orgId); // ← compile error: argument order swapped
```

Cheap (no runtime cost), high-leverage (catches ID-mixup bugs at compile time).
