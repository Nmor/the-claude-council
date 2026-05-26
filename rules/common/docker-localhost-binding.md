# Docker Localhost-Binding Rule (Global Default)

> Auto-fires on every `Dockerfile`, `docker-compose*.yml`, `compose*.yml`,
> and any service definition that publishes host ports. Sister to
> `no-local-fs.md`, `deploy-failures-become-checks.md`, and
> `docker-deployment.md`.

## Core Principle

**Every host port mapping in any docker-compose / Dockerfile on a
developer's local machine binds to `127.0.0.1` explicitly. Never bind
to `0.0.0.0` (the Docker default) or leave the host interface
unspecified.**

A bare `"5432:5432"` mapping binds to ALL host interfaces (`0.0.0.0`),
making the container reachable from every device on the local
network. On a coffee shop / hotel / coworking Wi-Fi that means
Redis, Postgres, MinIO, Ollama, Kafka, and every other dev-only
service is one `nmap` away from a stranger. Binding to
`127.0.0.1` restricts the listener to the loopback interface — host
processes still reach it normally, the LAN cannot.

The cost of the localhost prefix is zero (one IP prefix per
mapping). The cost of leaving it off is a complete dev-machine
attack surface every time the laptop joins a public network.

## Hard rules

1. **All host port mappings in `docker-compose*.yml` files include an
   explicit `127.0.0.1:` prefix.** The four canonical shapes that ARE
   allowed:
   ```yaml
   ports:
     - "127.0.0.1:8080:8080"               # bare numeric
     - "127.0.0.1:${HOST_PORT:-8080}:8080" # env-interpolated
     - "127.0.0.1:8080:8080/udp"           # UDP variant
     - "8080"                              # container-only (no host port at all)
   ```
   The five forbidden shapes:
   ```yaml
   ports:
     - "8080:8080"            # bare → binds 0.0.0.0
     - "${HOST_PORT}:8080"    # env-interpolated, no host
     - "0.0.0.0:8080:8080"    # explicit all-interfaces
     - "0.0.0.0:8080:8080/udp"
     - "8080:8080/udp"
   ```

2. **Both quote styles must be checked.** YAML accepts `"..."`,
   `'...'`, and unquoted strings. The sweep grep must cover all
   three:
   ```bash
   grep -nE '^\s+- (["\x27]|)(0\.0\.0\.0:[0-9]+|[0-9]+|\$\{[A-Z_]+):[0-9]+'
   ```

3. **Existing containers on the machine get recreated** after the
   compose patch. `docker compose up -d <service>` is enough; Docker
   detects the port-mapping change and recreates.

4. **The Dockerfile `EXPOSE` directive is documentation only** — it
   does NOT bind ports. `EXPOSE 8080` is fine; the actual binding
   happens at `docker run -p` or compose `ports:`.

5. **Production composes are a special case.** A compose file
   actually deployed to a server (vs run locally on a laptop) needs
   to bind to `0.0.0.0` for the server's traffic to reach it. The
   easiest path: use a `compose.override.yml` or `compose.local.yml`
   that adds the `127.0.0.1:` prefix for local-only runs, and keep
   the base compose unbound. When the same compose file IS used
   locally + deployed remotely (mixed usage), prefer a build-time
   var like `HOST_BIND=${HOST_BIND:-127.0.0.1}` and
   `"${HOST_BIND}:8080:8080"`.

6. **Exceptions** (rare but legitimate):
   - **Streaming / RTSP / RTMP / WebRTC**: if you intentionally
     need a phone or LAN device to connect to the dev Mac for media
     testing, those specific ports stay on `0.0.0.0`. Document the
     reason inline.
   - **Reverse proxy (traefik / nginx) on `80:80` / `443:443`**:
     same — if local-LAN testing is required, document inline.
   - **Public-facing development tunnel (ngrok et al)**: the ngrok
     binary handles exposure; the local port can still be
     `127.0.0.1`.

   Every exception carries a one-line YAML comment naming the
   reason. Example:
   ```yaml
   ports:
     - "0.0.0.0:1935:1935"   # RTMP — phone testing on LAN
   ```

## Detection grep (run on every new compose file)

```bash
# In any project root:
find . -maxdepth 4 \( -name 'docker-compose*.yml' -o -name 'compose*.yml' \) \
  | xargs grep -nE "^\s+- ['\"]?(0\.0\.0\.0:[0-9]+|[0-9]+|\\\$\{[A-Z_]+)[^/]*:[0-9]+" 2>/dev/null \
  | grep -vE "127\.0\.0\.1"
```

If that returns non-empty, the file has unbound port mappings.
Each match is a finding.

## Mechanical patch (the canonical fix)

For files using double-quoted port lines:

```bash
perl -i -pe '
  next if /^\s+- "(127\.0\.0\.1|\[::1\]|localhost):/;
  s|^(\s+)- "0\.0\.0\.0:([0-9]+:[0-9]+(/udp|/tcp)?)"(.*)$|$1- "127.0.0.1:$2"$4|;
  s|^(\s+)- "(\$\{[A-Z_]+:-[0-9]+\}:[0-9]+)"(.*)$|$1- "127.0.0.1:$2"$3|;
  s|^(\s+)- "([0-9]+:[0-9]+(/udp|/tcp)?)"(.*)$|$1- "127.0.0.1:$2"$4|;
' docker-compose.yml
```

Same regex for single-quoted lines — swap `"` for `'`.

After patching: `docker compose up -d <service>` on every changed
service to recreate the containers with new bindings.

## Port-conflict policy

When `127.0.0.1:N` collides with a host process or another
container (common with Postgres, Redis, MinIO when devs run native
+ Docker copies), the resolution path is:

1. Pick an unused host port on the loopback (e.g. 5433/5434/5435 for
   Postgres clones).
2. Update both the compose mapping AND the `.env` / config that
   tells the app where to find the service.
3. Document the chosen port in the project's README or compose
   comment.

Never solve a conflict by switching back to `0.0.0.0` — that's the
problem this rule prevents.

## Verification step

Every project's local pre-flight script (or PR checklist) runs the
detection grep. If it returns non-empty, the PR/commit is blocked.

For projects with a `verify-local.sh` (Reback, StewardBot, BFREE),
add this gate inline.

## Why this rule exists

A May 2026 device-wide audit on a personal Mac surfaced:

- Postgres dev container on `0.0.0.0:5432`
- Ollama on `0.0.0.0:11434`
- LocalStack on `0.0.0.0:4566`
- Redis, Kafka, MinIO, Typesense all on `0.0.0.0`
- MediaMTX streaming ports on `0.0.0.0`
- ~120 unbound port mappings across 27 compose files

On any shared Wi-Fi, every one of those services was discoverable
+ reachable. Postgres in particular still had default credentials
because "it's local-only" — but it wasn't.

After the sweep, every container on the machine is on `127.0.0.1`
and the dev surface is invisible to the LAN.

## Cross-references

- `no-local-fs.md` — same "local machine is not a trusted boundary"
  principle applied to filesystem state.
- `docker-deployment.md` — broader Docker patterns; this rule is the
  binding-specific corollary.
- `deploy-failures-become-checks.md` — same family: every observed
  posture gap becomes a mechanical gate.
- `~/.claude/rules/common/auto-skills.md` — already maps Dockerfile
  + compose files to this rule via the `**/*` path.
