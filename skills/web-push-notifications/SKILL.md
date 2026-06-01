---
name: web-push-notifications
description: VAPID-signed Web Push (RFC 8030, 8291, 8292) — subscribe lifecycle, endpoint hashing, payload size cap, pushsubscriptionchange routing, and how to wire alarms / notifications across browser + service worker.
---

# Web Push + VAPID

Companion skill to `provider-research` (RFC 8030, 8291, 8292 are the
canonical sources). Activates whenever Web Push code is touched —
backend send, service worker subscribe / push event, frontend
register composable.

## Required reading

- RFC 8030 — Generic Event Delivery (HTTP push semantics, TTL,
  prefer, urgency).
- RFC 8291 — Message Encryption for Web Push (aes128gcm content
  encoding).
- RFC 8292 — VAPID (server identification).
- W3C Push API — subscription lifecycle, `pushsubscriptionchange`.
- Provider-specific endpoint domains: FCM (`fcm.googleapis.com`),
  Mozilla autopush (`updates.push.services.mozilla.com`), Apple
  (`web.push.apple.com`), WNS (`*.notify.windows.com`).

For a fresh integration: refresh
`docs/provider-research/web-push-vapid.md` before any change.

## Hard rules

### 1. Backend store hashes the endpoint, not the URL

The endpoint URL is sensitive (it's a push capability the server
side can revoke OR replay). Store `endpoint_hash = sha256(endpoint)`
as the SK on the subscriptions table. The full endpoint is encrypted
via `piiEncryption.ts` if you ever need to read it back. The hash is
what you compare on subscribe / unsubscribe.

```ts
const endpointHash = Buffer.from(
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint)),
).toString("hex");
```

### 2. Payload size cap pre-encryption

RFC 8030 + the FCM-class providers cap the encrypted body at
roughly 4 KiB. The aes128gcm wrapping adds ~100 bytes. Cap the
plaintext at 3 KiB BEFORE handing to `web-push.sendNotification`
to leave headroom; reject larger payloads with a typed error so the
caller can shorten the message rather than silently failing.

```ts
const MAX_PUSH_PAYLOAD_BYTES = 3 * 1024;
if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_PUSH_PAYLOAD_BYTES) {
  return { ok: false, reason: "payload_too_large" };
}
```

### 3. Endpoint-allowlist on subscribe

Only accept subscriptions whose endpoint host is in the known list:

```ts
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
];
```

This blocks `endpoint = http://internal-host` SSRF attempts. WNS
hosts are wildcarded — match by `.endsWith(".notify.windows.com")`.

### 4. 410 Gone → purge

`web-push.sendNotification` throws `WebPushError` with `statusCode
=== 410` when the endpoint is permanently dead (user disabled
notifications, removed app, etc.). The send path MUST delete the
row from the subscriptions table on 410 — keeping dead endpoints
in the table burns send-quota every alarm fire and never recovers.

`statusCode === 404` (FCM-specific) gets the same treatment.

### 5. `pushsubscriptionchange` routing

When the browser rotates the endpoint (push server migration, key
rotation, user logged out then back in), the SW receives a
`pushsubscriptionchange` event. The SW cannot directly talk to the
backend with auth — it posts a message to the page, which calls the
authenticated `/api/push/subscribe` endpoint with the new
subscription.

```ts
// sw.js
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return;
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: "app:push-resubscribe", subscription: sub.toJSON() });
    }
  })());
});

// useWebPushRegister.ts — page handler
navigator.serviceWorker.addEventListener("message", async (event) => {
  if (event.data?.type !== "app:push-resubscribe") return;
  await apiPost("/api/push/subscribe", { subscription: event.data.subscription });
});
```

Without the page-side handler the SW posts into a void and Web Push
silently stops working after the next endpoint rotation.

### 6. `notificationclick` routing

Same shape — the SW's `notificationclick` handler can't navigate the
SPA directly (HTML5-history routes don't survive a SW-driven URL
change). The SW focuses an existing client (or opens a new one) and
posts the click target as a message; the page calls
`router.push(target)` on receipt.

```ts
// sw.js
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.deepLink;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (clients.length > 0) {
      await clients[0].focus();
      clients[0].postMessage({ type: "app:notification-click", target });
      return;
    }
    await self.clients.openWindow(target ?? "/");
  })());
});

// useWebPushRegister.ts — page handler with router
navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.data?.type !== "app:notification-click") return;
  if (event.data.target) router.push(event.data.target).catch(handleNavError);
});
```

`location.hash = …` does NOT navigate in HTML5-history mode — must
go through the router.

### 7. Unsubscribe = backend FIRST, then browser

```ts
// useWebPushRegister.ts — canonical unsubscribe
async function unsubscribe(): Promise<void> {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  const endpointHash = await hashEndpoint(sub.endpoint);
  await apiDelete(`/api/push/subscribe/${endpointHash}`).catch((err) =>
    log.warn("push unsubscribe API call failed; continuing browser-side", { error: stringifyError(err) }),
  );
  await sub.unsubscribe();
}
```

Browser-side unsubscribe-only leaves the backend sending to a dead
endpoint until 410 cleanup kicks in. Backend-first means the row is
purged immediately.

### 8. AudioContext unlock for in-page alarms

WS-delivered alarms in an open tab play through an AudioContext that
the browser keeps suspended until the first user gesture. If the
alarm fires while the context is suspended, the audio is silent.
The composable must:

1. Try to play.
2. If `AudioContext.state === "suspended"`, surface a "Tap to
   enable alarm sounds" toast that resumes on click.
3. Persist `audioContextUnlocked: true` in localStorage once
   unlocked so subsequent alarms play without prompting.

### 9. VAPID key rotation

The VAPID keypair lives in Secrets Manager. Rotation:

1. Generate new keypair.
2. Update Secrets Manager.
3. New subscribes immediately use the new key.
4. Existing subscribes work for their TTL window.
5. After 30 days, force re-subscribe of any subscription older than
   the rotation date.

Document the rotation procedure in the project runbook.

## Test contract

- Subscribe: payload validated, endpoint host allowlisted, hash
  computed, row written.
- Send happy-path: payload under cap, send returns 201.
- Send oversized: typed error returned, no provider call.
- 410 Gone: row purged, next alarm doesn't try the dead endpoint.
- 404 Not Found: same treatment.
- `pushsubscriptionchange`: SW message reaches page, page re-subs
  via authenticated POST.
- `notificationclick`: SW message reaches page, router navigates.
- Unsubscribe: backend DELETE called before browser unsubscribe.

## Cross-references

- `~/.claude/rules/common/official-docs-first.md` — RFC + W3C
  citations.
- `provider-research` skill — the workflow.
- `fire-and-forget` skill — the canonical shape for the
  send-side-effect that doesn't block alarm dispatch.
- `~/.claude/rules/common/no-discards.md` — pushSubscription errors
  must surface via typed error / log, never silently swallowed.

## Purpose

Principal-level browser + mobile push: W3C Push API + Service
Worker registration, VAPID identity (RFC 8292), aes128gcm payload
encryption (RFC 8291), push protocol contract (RFC 8030), per-
endpoint subscription lifecycle (subscribe → 410 Gone → cleanup),
FCM (Android + web), APNs (iOS), urgency + TTL semantics, focus
state detection (don't alert what the user is reading), unsubscribe
discipline + privacy notice, payload size limits (~4 KB), and the
fire-and-forget dispatch shape that decouples send from
acknowledgement.

**Negative scope** (NOT what this skill covers):
- In-app banner / toast UI rendering — out
- Email / SMS notifications — separate channels
- Real-time WebSocket / SSE push — different protocol
- Native iOS / Android push outside web context — see platform-
  specific skills (APNs / FCM native)
- Marketing campaign orchestration — out (consent + frequency mgmt
  belongs to a separate skill)

## When NOT to use

- Server-to-server fan-out — use SNS / Pub/Sub directly
- Real-time in-app updates while the user has the tab focused
  (WebSocket / SSE are lower-latency)
- One-off transactional emails — use email channel
- Users who haven't granted permission — never auto-prompt; ask in
  context of explicit user intent

## Standards Cited

- **RFC 8030 (Web Push Protocol)** — generic delivery contract
- **RFC 8291 (Web Push Encryption — aes128gcm)** — payload encryption
- **RFC 8292 (VAPID — Voluntary Application Server Identification)** —
  identity + sender authentication
- **W3C Push API** (w3.org/TR/push-api/) — browser-side subscription
  API
- **W3C Service Workers** (w3.org/TR/service-workers/) — receive +
  display side
- **W3C Notifications API** (w3.org/TR/notifications/) — display
  semantics
- **Firebase Cloud Messaging (FCM) v1 API** — Android + web
- **Apple Push Notification service (APNs) HTTP/2 API** — iOS
- **OWASP ASVS 4.0.3 §3.5 (Token-based Session Management)** —
  VAPID key rotation
- **OWASP ASVS 4.0.3 §13.1 (Generic Web Service Security)** —
  endpoint validation
- **GDPR Article 7 (Consent)** — opt-in record + revocation

## Anti-Patterns

| Pattern | Why bad | Correct alternative |
| --- | --- | --- |
| Auto-prompt for permission on first visit | Browsers downrank pushy sites; users deny permanently | Prompt only after a clear user-intent moment (signup complete, opt-in toggle, etc.) |
| Treating 410 Gone as a transient error | Endpoint already revoked; keep retrying = wasted requests | Mark subscription invalid + remove from DB |
| Storing the entire `PushSubscription` JSON without normalisation | Cross-field updates are painful | Normalise: `endpoint`, `p256dh`, `auth` per record |
| Sending unencrypted payload | Browser drops the message; not all push services allow plaintext | Always encrypt per RFC 8291 (aes128gcm) |
| No `urgency` header | Devices may delay / batch; battery saving hides urgent alerts | Set `Urgency: high` only for genuinely time-sensitive; `normal` default |
| No `TTL` header | Push service holds undeliverable messages indefinitely | Set realistic TTL (e.g., 24h for chat, 4h for ride status) |
| Notifying while the user has the tab focused | Annoyance + UX violation | Check `Window.focus` / `visibilityState` before notifying |
| Reusing VAPID keys across environments | Key rotation in prod requires re-subscribing all users | Separate keys per environment + scheduled rotation plan |
| Marketing pushes without unsubscribe path | GDPR / CAN-SPAM violation | Every push has user-visible opt-out + consent record |
| Treating push delivery as guaranteed | Best-effort by design; user may be offline 7 days | Pair with email / in-app inbox for durability |
| Service worker scope mismatch | Subscription tied to wrong scope; pushes lost on URL change | Register SW at root scope (or document scope strategy) |

## Verification Checklist

- [ ] VAPID keys generated per environment + stored in secrets
      manager (per `secrets-management.md`)
- [ ] Service worker registered at appropriate scope
- [ ] Permission prompt fires only on explicit user-intent moment
- [ ] Subscription stored with `endpoint`, `p256dh`, `auth`, +
      `user_agent`, `created_at`
- [ ] Payload encrypted via aes128gcm (RFC 8291)
- [ ] 410 Gone handled → mark subscription invalid + clean up
- [ ] `Urgency` + `TTL` headers set per message class
- [ ] Focus-state check before in-tab notifications
- [ ] Unsubscribe path tested + linked from privacy notice
- [ ] Audit log of every send + delivery outcome
- [ ] VAPID key rotation calendar documented
- [ ] `docs/provider-research/<service>.md` exists per service
      (FCM / APNs / Web Push)
- [ ] Cost monitoring (FCM / APNs are free; some relays are not)

## Cross-References

- `~/.claude/skills/provider-research/SKILL.md` — primary-source
  discipline
- `~/.claude/skills/calendar-provider/SKILL.md` — sister provider
  integration pattern
- `~/.claude/skills/observability-patterns/SKILL.md` — push
  delivery metrics + audit
- `~/.claude/rules/common/official-docs-first.md` — RFC + W3C
  citations
- `~/.claude/rules/common/secrets-management.md` — VAPID key
  storage
- `~/.claude/rules/common/audit-logging.md` — consent + send
  records
- `~/.claude/agents/security-reviewer.md` — Council Division 4

## Why this skill exists

Push notifications are the most user-visible side of a product —
get them wrong and users opt out forever, get them right and they
become a daily engagement channel. The patterns above codify the
production-ready posture: VAPID identity per environment, encrypted
payloads, 410-Gone cleanup, urgency + TTL discipline, focus-state
check, GDPR-compliant consent + unsubscribe. Teams that adopt
these maintain healthy opt-in rates; teams that don't get blocked
by browser heuristics + regulators.

## Learning hooks

Per `~/.claude/rules/common/continuous-learning-mandate.md`:

**Signals to watch**:
- VAPID public key hardcoded in client + leaked to repo (per `no-discards.md` hook catches; refinement needed if it slips)
- Push send blocking the alarm dispatch path (fire-and-forget pattern weakening — alarm latency degraded)
- 410 / 404 subscription responses ignored (stale-subscription cleanup gap; tokens accumulate)
- Payload encryption disabled or rolled own (RFC 8291 violation — message hijack risk)
- TTL = 0 used unconditionally when "deliver if connected" semantics matter (best-effort + persistence confused)
- Web Push Protocol headers (`Urgency`, `Topic`) absent — quota burned + duplicates not collapsed at push service
- Browser-side `pushManager.subscribe()` errors silently dropped (user thinks subscribed; isn't)
- Service worker `push` event handler doesn't validate sender / origin

**Refinement candidates**:
- New section when a browser ships new push capability (e.g., richer notification actions, push for native apps via WebPush W3C)
- Quota / burn-rate tracking pattern when push send volumes scale past pilot
- Multi-endpoint orchestration (FCM + APNs Web + Edge Workers) when reach gaps surface
- Provider-rotation pattern when one push service has reliability issues (graceful degradation per `~/.claude/rules/common/graceful-degradation.md`)
