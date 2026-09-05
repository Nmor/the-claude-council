# No-Local-Filesystem Rule (Global Default)

> Auto-fires on every file. Companion to `done-criteria.md`,
> `no-discards.md`, and `deploy-failures-become-checks.md`.

## Core Principle

**Production code MUST NOT write to, or rely on, the local filesystem
for state that outlives the request that created it.**

Ephemeral container platforms — AWS ECS Fargate, Lambda, GCP Cloud Run,
Heroku, Render, Fly, Kubernetes pods, mobile Expo Web — give each
process a writable local disk that is destroyed when the container
restarts or is rescheduled. Code that assumes "I'll write a CSV here
and read it back later" silently breaks in production every time the
pod recycles. Even within a single request, writing to local FS:

- Forces sticky-session affinity (one pod must service follow-up reads).
- Cross-leaks state between concurrent requests if paths are not
  request-scoped.
- Slows cold starts (re-mounting / re-creating directories).
- Blocks horizontal scaling (every replica needs its own copy of the
  data it just wrote).

The rule is on by default. It bans local FS writes in production
source. Reads from baked-in static assets are fine; writes are not.

## Hard rules

1. **No `os.Create`, `os.OpenFile(... O_WRONLY|O_CREATE ...)`,
   `os.WriteFile`, `os.MkdirAll`, `ioutil.WriteFile`, `os.Rename`,
   `os.Remove*`** in production source.

2. **No `fs.writeFileSync`, `fs.writeFile`, `fs.createWriteStream`,
   `fs.promises.writeFile`, `fs.appendFile*`, `fs.mkdir*`,
   `fs.rename`, `fs.unlink*`, `fs.rm`** in production TS/JS.

3. **No Python `open(path, "w"|"a"|"x"|"r+")`, `os.makedirs`,
   `os.remove`, `os.rename`, `shutil.copy*`, `shutil.move`,
   `pathlib.Path.write_*`, `pathlib.Path.mkdir`, `pathlib.Path.rename`,
   `pathlib.Path.unlink`** in production source.

4. **No equivalent FS-write patterns in any other language**: Ruby
   `File.write`, Java `Files.write` / `Files.createDirectories`, C#
   `File.WriteAllText` / `Directory.CreateDirectory`, Swift
   `FileManager.default.createFile`, Rust `fs::write` /
   `fs::create_dir_all`, PHP `file_put_contents` / `mkdir`,
   Dart `File(...).writeAsString`.

## Where to write instead

| Use case | Replace local FS with |
| -------- | --------------------- |
| User uploads (avatars, KYC docs, attachments) | Object storage (S3, GCS, Azure Blob, R2) directly; the upload route returns a signed URL the client uploads to, or proxies the multipart body through to the bucket without touching local disk. |
| Generated reports / exports (CSV, PDF, XLSX) | Stream the bytes to `http.ResponseWriter` (download), or write to an in-memory buffer (`bytes.Buffer`, `Buffer.from`, `io.BytesIO`) and PUT to object storage with a signed download URL. |
| Server-rendered images (OG cards, charts) | Render to in-memory buffer; serve from response or cache in object storage / CDN. |
| Email attachments | Build in-memory; pass bytes to the email SDK. |
| Logs | Structured logger to stdout/stderr; CloudWatch / Loki / Datadog collects from the stream. Never `os.Create("app.log")`. |
| Caches | Redis, ElastiCache, Memorystore, or in-process LRU. Never a local file. |
| Database snapshots / backups | Cloud-native backup (RDS automated backup, S3 export). Never `pg_dump > /tmp/dump.sql` from app code. |
| Session storage | Redis or signed cookies. Never a local session file. |
| Sticky local cache for hot reads | OK if (a) request-scoped under `os.TempDir()`, AND (b) cleaned up in a `defer`/`finally`, AND (c) tolerant of being absent on the next pod. |

## Allowed exceptions (narrow, documented)

These cases legitimately touch the local filesystem and are NOT
violations:

1. **`os.TempDir()` for genuinely transient request-scoped work** —
   for example, a video transcoder that needs a temp working file for
   FFmpeg. Rules:
   - Use `os.CreateTemp("", "prefix-*.ext")` so the name is unique.
   - Clean up via `defer os.Remove(path)` / `try/finally` /
     `with tempfile.NamedTemporaryFile(...)`.
   - The result MUST be moved to object storage before the request
     returns.
   - Never write to `/tmp` with hard-coded paths.

2. **Build / CI / migration tooling** in `cmd/`, `scripts/`,
   `tools/`, `migrations/`. These run once, off the hot path.

3. **CLI tools** (Go binaries under `cmd/cli`, Node tools under
   `bin/`, Python `__main__` scripts). End users invoke them on
   their own machines.

4. **Test fixtures** in `*_test.go`, `__tests__/`, `tests/`,
   `spec/`. Tests use temp dirs freely.

5. **Local development scripts** explicitly gated by an env-var
   check (`if os.Getenv("ENV") == "local"`). Production paths must
   not enter the local-FS branch.

6. **Reading baked-in static assets** — embedded via `go:embed`,
   webpack's `import file from './static.png'`, Python's
   `importlib.resources`. The bytes are baked into the binary /
   bundle; you are not writing to the FS.

## When you encounter a violation

If the file you're touching already writes to local FS in production
code, the fix is part of the work — do not leave it:

1. Identify the data being persisted.
2. Pick the right replacement from the table above (most often: S3
   - in-memory buffer for exports; object storage + signed URLs for
   uploads).
3. Stream where possible — pipe `io.Reader` → S3 PutObject with
   multipart, not load-all-then-write. Memory is also bounded.
4. Update the call site so the response no longer references a
   local path. URLs go in the response body.
5. Update tests. If they relied on reading from local FS, they
   should now mock the object store or use a local MinIO container.

## Mechanical gate

A grep that fails the build catches almost every case. Add this to
the project's pre-commit / CI:

```bash
# Go
grep -rE 'os\.(Create|WriteFile|MkdirAll)|ioutil\.WriteFile' \
  --include='*.go' --exclude-dir=cmd --exclude-dir=tools \
  --exclude-dir=scripts --exclude='*_test.go' .

# TypeScript / JavaScript
grep -rE 'fs\.(writeFile|writeFileSync|createWriteStream|appendFile|mkdir|rename|unlink|rm[A-Z])' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --exclude-dir=scripts --exclude-dir=tests --exclude-dir=__tests__ \
  --exclude-dir=node_modules src/

# Python
grep -rE "open\([^)]*['\"]\s*[wax][+b]?\s*['\"]|os\.makedirs|os\.remove|os\.rename|shutil\.(copy|move)" \
  --include='*.py' --exclude-dir=tests --exclude-dir=scripts \
  --exclude-dir=migrations .
```

Any non-zero exit fails the build. The user can pre-allowlist
genuine exceptions via a per-project skip list, but no per-file
suppression.

## Why this rule exists

Recurring failure mode on ephemeral container platforms:

1. Engineer writes "save CSV to /tmp, return path".
2. Works on laptop and in CI (long-lived containers).
3. Production runs on Fargate / Lambda / ECS / Cloud Run — pod
   recycles, file gone, follow-up read 404s.
4. Worse: load balancer routes the follow-up read to a different
   replica that never saw the file in the first place.
5. Even worse: a `.tmp` file written during request N is read
   during request N+1 from a different pod, leaking data across
   tenants when paths aren't request-scoped.

The cost of fixing the pattern proactively is one object-store
PutObject call and one in-memory buffer. The cost of finding it in
production is a P1 incident.

Sister failure modes worth naming:

- **Sticky-session affinity required** — once a session-id has to
  pin to a specific pod because of local FS state, horizontal
  scaling stops working.
- **Cold-start tax** — re-mounting / re-creating "cache" dirs at
  boot adds seconds to every cold start.
- **Disk-full incidents** — long-lived (non-FaaS) containers fill
  their writable layer with logs / exports / temp files and crash
  the runtime.

## Cross-references

- `done-criteria.md` — "service-migration done" check includes the
  no-local-FS sweep.
- `deploy-failures-become-checks.md` — every deploy failure
  becomes a pre-deploy check; the local-FS class is one of them.
- `no-discards.md` — discarding the error from `os.Remove(path)` is
  a separate violation that compounds with this one.
- `secrets-management.md` — credential material on local disk is a
  sister problem; never write a token to `/tmp`.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:

- `os.Create` / `os.WriteFile` / `fs.writeFile` / `open(path, "w")` introduced in production source (Hard rules 1-4 violation)
- Generated artifact (CSV, PDF, image) written to local FS instead of streamed / object-store-uploaded (use-case mapping violation)
- Local cache directory created without request-scoped TTL + cleanup (allowed-exception 1 weakening)
- Session storage on local FS (rule scope violation — should be Redis / signed cookies)
- `os.TempDir()` artifact left behind without `defer os.Remove(path)` / `try/finally` cleanup
- Tests rely on local FS read-back rather than mocked object store / MinIO container (test-isolation drift)
- Mechanical grep gate missing from CI / pre-commit (rule "Mechanical gate" weakening)
- Sticky-session affinity required because of local FS state (horizontal-scaling block introduced)

**Refinement candidates**:

- New row in the "where to write instead" table when a new artifact class recurs (e.g., generated PDFs needing fonts cache, ML inference temp files)
- Tightening of the allowlist-exception criteria when transient request-scoped writes prove load-bearing
- New language entry in the Hard rules when a new ecosystem appears (e.g., Bun's filesystem APIs, Deno's permissions model)
- New cross-reference when a sister rule (no-discards, secrets-management, idempotency) adds a write-path consumer

---

<!-- ============================================================
     Section: error-codes.md (from rules/common/)
     ============================================================ -->
