#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PreToolUse hook (matcher: Edit|Write|MultiEdit).
//
// Enforces `validate-payloads-before-coding.md`: before writing code that PARSES or BUILDS an
// external payload, the real shape must be confirmed from a live call, a captured fixture, or
// the primary-source schema. Never assumed.
//
// That rule had NO enforcement of any kind. It is also the rule that produced this
// programme's most expensive near-miss: on 2026-09-21 a provider's own OpenAPI document
// declared five collections as bare arrays, while every live instance returned {count, rows}.
// Four working readers were about to be "corrected" to match the document. A live call
// settled it in one request. Nothing had required that call.
//
// WHAT IT CATCHES: an edit that decodes a NETWORK response into our own types, in a session
// where nothing has looked at a real payload (payload-marker.js records that).
//
// WHY IT IS NARROW. Decoding is common; being wrong about a provider's shape is not. So it
// fires only when all three hold:
//   1. the decode is of a network response (resp / response / body / res), not arbitrary JSON
//   2. the file is integration-shaped by path or content
//   3. no payload evidence exists this session
// A decoder for our own config, our own test fixture, or an internal type never trips it.
//
// ADVISORY by default (exit 0 + advice via lib/advise.js), because the third condition is a heuristic and a
// hard block on a heuristic gets a hook switched off — the failure mode that makes every
// other gate weaker. CLAUDE_PAYLOAD_GATE=block to enforce, =off to disable.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { advise } = require('./lib/advise.js');

const SRC = /\.(go|ts|tsx|js|jsx|mjs|cjs|py|rb|java|kt|cs|rs|php|swift)$/i;

// Decoding something that came off the wire.
const DECODE = [
  /json\.Unmarshal\(\s*(?:resp|response|body|res|raw|data)\b/i,
  /json\.NewDecoder\(\s*(?:resp|response|res)\b[^)]*\)\s*\.Decode/i,
  /\b(?:resp|response|res)\b[^\n]{0,40}\.json\(\)/i,
  /JSON\.parse\(\s*(?:await\s+)?(?:resp|response|res|body|text|raw)\b/i,
  /json\.loads\(\s*(?:resp|response|r)\b/i,
  /\.ReadFrom\(\s*(?:resp|response)\.Body/i,
];

// Integration-shaped by path. Content is checked too, so a badly-named file still counts.
const INTEGRATION_PATH =
  /(provider|client|adapter|integration|connector|gateway|webhook|api|sdk|transport|upstream)/i;
const INTEGRATION_CONTENT = /(http\.(?:Get|Post|Do|NewRequest)|fetch\(|axios|requests\.(?:get|post)|HttpClient)/i;

function addedText(ti, tool) {
  if (tool === 'Write') return String(ti.content || '');
  if (tool === 'MultiEdit') return (ti.edits || []).map((e) => String(e.new_string || '')).join('\n');
  return String(ti.new_string || '');
}

let data = '';
process.stdin.on('data', (c) => {
  data += c;
});
process.stdin.on('end', () => {
  const mode = (process.env.CLAUDE_PAYLOAD_GATE || 'warn').toLowerCase();
  if (mode === 'off') process.exit(0);

  let input;
  try {
    input = JSON.parse(data || '{}');
  } catch {
    process.exit(0); // never fail a tool call because the hook could not read its own input
  }

  const ti = input.tool_input || {};
  const file = String(ti.file_path || '');
  const sid = input.session_id || '';
  if (!SRC.test(file) || !sid) process.exit(0);

  // A test or fixture is where a confirmed shape gets RECORDED. Gating it would block the
  // very act the rule asks for.
  if (/(_test\.|\.test\.|\.spec\.|\/testdata\/|\/fixtures?\/|__tests__)/i.test(file)) process.exit(0);

  const added = addedText(ti, input.tool_name || '');
  if (!added) process.exit(0);
  if (!DECODE.some((r) => r.test(added))) process.exit(0);
  if (!INTEGRATION_PATH.test(file) && !INTEGRATION_CONTENT.test(added)) process.exit(0);

  if (fs.existsSync(path.join(os.tmpdir(), `claude-council-payload-${sid}`))) process.exit(0);

  const msg = [
    'PAYLOAD GATE — the shape is being assumed, not confirmed.',
    '',
    `${file}`,
    'This edit decodes a network response into our own types, and nothing in this session has',
    'looked at a real payload.',
    '',
    'validate-payloads-before-coding.md rule 1: confirm the shape from a live call to a',
    'non-prod tier, a captured fixture, or the primary-source schema — in that order of',
    'preference. A README example or a sibling repo is NOT ground truth.',
    '',
    'Rule 2: reads may be validated live (they are safe to run); writes are validated against',
    'the schema or a recorded contract, never by firing a test write at production.',
    '',
    'Worth knowing before trusting a schema: on 2026-09-21 a provider OpenAPI document',
    'declared five collections as bare arrays while every live instance returned {count,rows}.',
    'The document was wrong and the code was right. Only the live call could tell.',
    '',
    'Then capture what you confirmed in a fixture, so the next reader inherits the answer.',
    '',
    'CLAUDE_PAYLOAD_GATE=block to enforce, =off to disable.',
  ].join('\n');

  if (mode === 'block') {
    process.stderr.write(msg + '\n');
    process.exit(2);
  }
  advise(input, msg);
  process.exit(0);
});
