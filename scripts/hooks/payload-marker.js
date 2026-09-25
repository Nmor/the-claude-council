#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PostToolUse hook (matcher: Bash).
//
// Records that the session actually LOOKED at a real payload, which is what
// `validate-payloads-before-coding.md` requires before a parser or builder for an external
// contract is written. Companion to payload-gate.js, exactly as research-marker.js is to
// research-gate.js.
//
// What counts as looking, per the rule's own order of preference:
//   1. a live call to a non-prod tier   -> curl / wget / httpie / grpcurl / openssl s_client
//   2. a captured fixture               -> reading or writing a recorded response
//   3. the primary-source schema        -> fetching an openapi/swagger document
//
// What deliberately does NOT count: reading our own source, grepping for a type name, or
// running the unit tests. Those tell you what WE believe the shape is, which is precisely
// the belief the rule exists to check. On 2026-09-21 a provider's own OpenAPI document
// declared five collections as bare arrays while every live instance returned {count, rows};
// only the live call could settle it.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// An outbound call to something that is not us, or a schema document being fetched.
const LOOKED = [
  /(?:^|[\s;&|`(])(?:curl|wget|http|https|xh|grpcurl|websocat)\s/i,
  /openssl\s+s_client/i,
  /(?:openapi|swagger)[^\s]*\.(?:json|ya?ml)/i,
  // A fixture being recorded or replayed.
  /(?:testdata|fixtures?|__fixtures__|recorded)\/[^\s]*\.(?:json|ya?ml|txt)/i,
];

// Reading our own code is not payload validation, however much it mentions the provider.
const NOT_LOOKING = /^\s*(?:grep|rg|ag|find|ls|cat|sed|awk|head|tail|wc)\b/i;

let data = '';
process.stdin.on('data', (c) => {
  data += c;
});
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const cmd = String(input.tool_input?.command || '');
    const sid = input.session_id || '';
    if (!cmd || !sid) process.exit(0);
    if (NOT_LOOKING.test(cmd)) process.exit(0);
    if (!LOOKED.some((r) => r.test(cmd))) process.exit(0);

    fs.writeFileSync(
      path.join(os.tmpdir(), `claude-council-payload-${sid}`),
      `${Date.now()}\n${input.prompt_id || ''}`,
    );
  } catch {
    // A marker that cannot be written is not worth failing a tool call over.
  }
  process.exit(0);
});
