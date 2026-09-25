#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PreToolUse hook (matcher: Edit|Write|MultiEdit).
//
// Enforces `no-bloat.md` rule 6a + `wiring-and-usage-review.md` rule 9:
// a deletion justified by "something newer replaces it" is only legal once
// the replacement is PROVEN to carry every capability the deleted code had.
//
// What it catches: an Edit whose old_string removes a whole function /
// method / handler / exported symbol and whose new_string does NOT add an
// equivalent one — i.e. a net removal — in a session where a same-file or
// same-package replacement landed. That is the supersede shape. The hook
// then requires a SUPERSEDE PROOF marker to be present somewhere in the
// change (the replacement's comment) or in the session's proof marker file.
//
// NON-BLOCKING by default (exit 0, advice via lib/advise.js) because a hard block
// on a heuristic carries too much false-positive cost mid-refactor.
// Set CLAUDE_SUPERSEDE_PROOF=block to hard-block (exit 2) instead;
// CLAUDE_SUPERSEDE_PROOF=off disables it entirely.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODE = (process.env.CLAUDE_SUPERSEDE_PROOF || 'warn').toLowerCase();

// Source extensions only — prose/config deletions are not supersedes.
const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|cs|rb|php|swift)$/i;

// Declaration shapes across the languages this workspace uses. A removal of
// one of these from old_string is a candidate supersede.
const DECL_PATTERNS = [
  /^\s*func\s+(\([^)]*\)\s*)?[A-Z_a-z][\w]*\s*\(/m, // Go func / method
  /^\s*(export\s+)?(async\s+)?function\s+[\w$]+\s*[<(]/m, // JS/TS function
  /^\s*export\s+(const|class|interface|type)\s+[\w$]+/m, // TS export
  /^\s*(public|private|protected|internal)\s+[\w<>[\],\s]+\s+[\w$]+\s*\(/m, // Java/C#/Kotlin
  /^\s*def\s+[\w]+\s*\(/m, // Python
  /^\s*(pub\s+)?fn\s+[\w]+\s*[<(]/m, // Rust
];

// The durable proof marker the rule asks for.
const PROOF_RE = /SUPERSEDE\s+PROOF/i;

function countDecls(text) {
  if (!text) return 0;
  let n = 0;
  for (const re of DECL_PATTERNS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const m = text.match(g);
    if (m) n += m.length;
  }
  return n;
}

const { advise } = require('./lib/advise.js');

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  if (MODE === 'off') process.exit(0);

  let warn = null;
  try {
    const input = JSON.parse(data || '{}');
    const ti = input.tool_input || {};
    const file = ti.file_path || '';
    const sid = input.session_id || '';
    const p = String(file).toLowerCase();

    // Skip framework config, tests, and non-source files. Test deletions
    // are covered by the rule's "tests migrate" axis but flagging every
    // test edit would drown the signal.
    const skip =
      !file ||
      p.includes('/.claude/') ||
      !SRC_EXT.test(p) ||
      /(_test\.|\.test\.|\.spec\.|\/tests?\/|_spec\.)/.test(p);

    if (!skip) {
      // Gather the edit's before/after text across Edit and MultiEdit shapes.
      let removed = '';
      let added = '';
      if (typeof ti.old_string === 'string') {
        removed = ti.old_string;
        added = typeof ti.new_string === 'string' ? ti.new_string : '';
      } else if (Array.isArray(ti.edits)) {
        for (const e of ti.edits) {
          if (typeof e.old_string === 'string') removed += '\n' + e.old_string;
          if (typeof e.new_string === 'string') added += '\n' + e.new_string;
        }
      }

      const removedDecls = countDecls(removed);
      const addedDecls = countDecls(added);
      const netRemoval = removedDecls > 0 && removedDecls > addedDecls;

      if (netRemoval) {
        // Proof may live in this very edit (a SUPERSEDE PROOF comment on the
        // replacement) or in a marker written earlier this session when the
        // replacement landed in a different file.
        const marker = sid
          ? path.join(os.tmpdir(), `claude-supersede-proof-${sid}`)
          : '';
        const proofInEdit = PROOF_RE.test(added) || PROOF_RE.test(removed);
        const proofInSession = marker !== '' && fs.existsSync(marker);

        if (!proofInEdit && !proofInSession) {
          const n = removedDecls - addedDecls;
          warn =
            `[supersede-proof] Net removal of ${n} declaration(s) from ` +
            `"${path.basename(file)}" with no SUPERSEDE PROOF in the change.\n` +
            `[supersede-proof] Per no-bloat.md rule 6a + wiring-and-usage-review.md rule 9: ` +
            `if a newer impl replaces this, PROVE the replacement carries forward every ` +
            `INPUT, OUTPUT (field-by-field), ERROR BRANCH, SIDE EFFECT (audit/metric/cache/notify) ` +
            `and GUARD (authz/ownership/rate-limit/idempotency) the deleted path had — and that ` +
            `every consumer is migrated in this same change and the tests moved.\n` +
            `[supersede-proof] "Newer" is not "better". If any axis fails, EXTEND the ` +
            `replacement until it genuinely covers the original, or deprecate on a window ` +
            `instead of deleting.\n` +
            `[supersede-proof] Record it as a "SUPERSEDE PROOF" comment on the replacement ` +
            `+ a "Supersede proof" line in the verification block.\n` +
            `[supersede-proof] Modes: CLAUDE_SUPERSEDE_PROOF=block | warn (default) | off`;
        }
      }
    }
  } catch (err) {
    warn = `[supersede-proof] skipped: ${err.message}`;
  }

  if (warn && MODE === 'block' && !/skipped:/.test(warn)) {
    process.stderr.write(warn + '\n');
    process.exit(2);
  }
  let input = {};
  try {
    input = JSON.parse(data || '{}');
  } catch {
    input = {};
  }
  advise(input, warn);
  process.exit(0);
});
