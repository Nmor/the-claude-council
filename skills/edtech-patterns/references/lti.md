# edtech-patterns: Lti

> LTI 1.3 launch security and the three LTI Advantage services. Pointed at by the SKILL.md rows
> "Pattern 1" and "Pattern 2".
>
> **Size budget: 8 KB** — `token-budget.mjs --check`.

## Pattern 1: LTI 1.3 launch — OIDC + JWT, never the LTI 1.1 shared secret

LTI 1.1 / 1.2 used OAuth 1.0a HMAC-SHA1 with a shared secret.
LTI 1.3 replaces this with OpenID Connect + asymmetric JWT.
Every new tool integration MUST be 1.3+; legacy 1.1 only
acceptable when the platform (LMS) doesn't yet support 1.3 AND
the integration is documented as transitional.

**LTI 1.3 launch flow** (high level):

1. **Resource link request** — LMS sends `iss`, `login_hint`,
   `target_link_uri`, `lti_message_hint`, `lti_deployment_id`
   to the tool's OIDC login init endpoint.
2. **OIDC auth request** — Tool redirects to the LMS auth
   endpoint with `response_type=id_token`, `scope=openid`,
   `nonce`, `state`, `prompt=none`, plus the LTI-specific
   `login_hint` echo.
3. **ID Token (LTI launch JWT)** — LMS POSTs a JWT to the tool's
   target_link_uri. JWT is signed with the LMS's RSA private
   key; tool verifies via the LMS's published JWKS endpoint.
4. **Claims validation**:
   - `iss` matches the registered platform
   - `aud` matches the tool's client_id
   - `nonce` matches the value sent in step 2 (replay
     protection)
   - `iat` within ±5 minutes (clock skew tolerance)
   - `https://purl.imsglobal.org/spec/lti/claim/message_type` is
     `LtiResourceLinkRequest` (or `LtiDeepLinkingRequest`)
   - `https://purl.imsglobal.org/spec/lti/claim/version` is
     `1.3.0`
   - `https://purl.imsglobal.org/spec/lti/claim/deployment_id`
     matches the registered deployment

**Reference implementation sketch** (TypeScript):

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const jwks = createRemoteJWKSet(new URL(platform.jwksUri));

const { payload } = await jwtVerify(launchJwt, jwks, {
  issuer: platform.issuer,
  audience: tool.clientId,
  algorithms: ['RS256'],
  clockTolerance: '5m',
});

// Validate LTI-specific claims
if (payload['https://purl.imsglobal.org/spec/lti/claim/version'] !== '1.3.0') {
  throw new LtiError('lti_version_unsupported');
}
if (payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] !== platform.deploymentId) {
  throw new LtiError('lti_deployment_mismatch');
}
// Nonce verification: look up `payload.nonce` in your one-time-use store; reject if reused
const nonceRecord = await nonceStore.consumeOnce(payload.nonce);
if (!nonceRecord) throw new LtiError('lti_nonce_replay_or_missing');
```

Per `ferpa-coppa-compliance.md`, NEVER ship LTI tools that
default to "public roster"; respect the `NRPS` scope only when
the platform admin has granted it, and treat the roster as
educational records.

## Pattern 2: LTI Advantage services — Names + Roles, Assignment + Grade, Deep Linking

LTI Advantage builds three services on top of 1.3:

- **NRPS (Names + Role Provisioning Services)**: fetch the
  context's member list (course roster). Scope:
  `https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly`.
  Returns members with `user_id`, `name`, `email`, `roles`
  (`http://purl.imsglobal.org/vocab/lis/v2/membership#Learner`,
  `Instructor`, `ContentDeveloper`, etc.).
- **AGS (Assignment + Grade Services)**: create line items in
  the LMS gradebook + post scores. Three sub-scopes: lineitem
  read/write, results read, score post.
- **Deep Linking 2.0**: lets the tool return content selections
  to the LMS in a JWT signed by the tool; LMS embeds the
  selected items.

For each service:

1. Tool requests an access token from the platform's token
   endpoint using `client_credentials` + a signed
   `client_assertion` JWT (assertion JWT signed by the tool's
   private key; platform verifies via tool's published JWKS).
2. Platform returns a short-lived bearer token (typically 1
   hour TTL).
3. Tool calls the AGS / NRPS REST endpoint with the bearer
   token in `Authorization: Bearer <token>`.

Tokens MUST be cached + reused until near expiry; minting a new
token per request thrashes both sides.
