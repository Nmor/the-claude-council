#!/usr/bin/env node
// Size budget: 9 KB. Check: wc -c; gate: token-budget.mjs --check.
// PreToolUse hook (matcher: Edit|Write|MultiEdit).
//
// Enforces the one rule family that had no mechanical backing at all:
//   functional-test-coverage.md rule 5 — "a defect found while testing is FIXED, not filed"
//   functional-test-coverage.md rule 6 — a defect may be PINNED only when correct behaviour
//                                        is a decision that belongs to the OWNER
//   no-silent-drops.md / the no-deferral register — nothing is deferred, parked or omitted
//
// WHY THIS EXISTS. On 2026-09-21 the assistant found a real defect while writing tests (a
// provider query filter the vendor silently ignores, so one company's picker showed every
// company's data). functional-test-coverage.md was loaded in context and says plainly that
// such a defect is fixed, not filed. It was pinned anyway, justified as "needs a design
// decision" — when the truth was that the mechanism had not been worked out yet. The rule
// was present and was still not followed, which is what proves prose alone is insufficient.
//
// WHAT A SCRIPT CAN AND CANNOT JUDGE. No script can decide whether a pin is legitimate —
// that is a judgement about intent. What a script CAN do is require the pin to CARRY ITS
// JUSTIFICATION, and refuse the ones that do not. A pin that names the pending decision and
// whose decision it is has been thought about; a bare "pinned for now" has not. That is the
// difference between an owner's decision and a deferral wearing its clothes.
//
// THE CONTRACT. Source code and tests may contain a deferral marker only when accompanied,
// within PROXIMITY lines, by BOTH:
//     decision-owner:   <who must decide>
//     decision-needed:  <what they must decide>
// A `recommendation:` line is strongly encouraged and is reported when absent, but does not
// itself block — the two mandatory lines are what separate a decision from a dodge.
//
// SCOPE — deliberately narrow, because a noisy gate gets switched off:
//   - SOURCE and TEST files only. Markdown is exempt: plans, rules and ADRs discuss deferral
//     legitimately and constantly, and gating them would fire on every planning document.
//   - Only explicit deferral vocabulary. A bare TODO or FIXME does NOT fire: those are
//     ordinary backlog markers and catching them would bury the signal this gate exists for.
//   - Only content being ADDED. An Edit that leaves an existing marker untouched, or removes
//     one, passes — you are not blocked from working in a file someone else deferred in.
//
// Modes: CLAUDE_DEFERRAL_GATE=block (default) | warn | off
'use strict';
const { advise } = require('./lib/advise.js');

const PROXIMITY = 12; // lines within which the justification must appear

// Explicit deferral vocabulary. Each must be unambiguous enough that a false positive is
// rare: these are phrases somebody writes when consciously NOT fixing something.
const MARKERS = [
  /\bPINS?\s+(?:A\s+)?KNOWN\s+DEFECT\b/i,
  /\bPINNED[- ]DEFECT\b/i,
  /\bpins?\s+(?:this\s+)?(?:defect|bug)\s+rather than\s+fix/i,
  /\bdeferred\s+to\s+(?:a\s+)?(?:later|future|next)\b/i,
  /\bparked\s+(?:for\s+now|until|pending)\b/i,
  /\bfiled\s+rather\s+than\s+fixed\b/i,
  /\bknown\s+defect\s*[:—-]\s*not\s+fixed\b/i,
  /\bleaving\s+(?:this\s+)?broken\s+for\s+now\b/i,
  /\bwe'?ll\s+(?:fix|clean\s*up|do)\s+(?:this\s+)?(?:properly\s+)?later\b/i,
];

const OWNER = /decision[- ]owner\s*:/i;
const NEEDED = /decision[- ]needed\s*:/i;
const RECOMMEND = /recommendation\s*:/i;

// Source + test files. Markdown and config are exempt (see SCOPE above).
const SRC = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|cs|rb|php|swift|scala|sql)$/i;

function addedText(ti, tool) {
  if (tool === 'Write') return String(ti.content || '');
  if (tool === 'MultiEdit') {
    return (ti.edits || []).map((e) => String(e.new_string || '')).join('\n');
  }
  return String(ti.new_string || '');
}

// A marker already present in what is being REPLACED is not newly introduced by this edit.
function priorText(ti, tool) {
  if (tool === 'MultiEdit') {
    return (ti.edits || []).map((e) => String(e.old_string || '')).join('\n');
  }
  return String(ti.old_string || '');
}

function findViolations(text) {
  const lines = text.split('\n');
  const out = [];
  lines.forEach((line, i) => {
    const hit = MARKERS.find((m) => m.test(line));
    if (!hit) return;
    const from = Math.max(0, i - PROXIMITY);
    const near = lines.slice(from, i + PROXIMITY + 1).join('\n');
    const missing = [];
    if (!OWNER.test(near)) missing.push('decision-owner:');
    if (!NEEDED.test(near)) missing.push('decision-needed:');
    if (missing.length) {
      out.push({ line: i + 1, text: line.trim().slice(0, 120), missing,
        noRecommendation: !RECOMMEND.test(near) });
    }
  });
  return out;
}

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  const mode = (process.env.CLAUDE_DEFERRAL_GATE || 'block').toLowerCase();
  if (mode === 'off') process.exit(0);
  let input;
  try {
    input = JSON.parse(data || '{}');
  } catch {
    process.exit(0); // never fail a tool call because the hook could not parse its own input
  }
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  const file = String(ti.file_path || '');
  if (!SRC.test(file)) process.exit(0);

  const added = addedText(ti, tool);
  if (!added) process.exit(0);

  const before = priorText(ti, tool);
  const violations = findViolations(added).filter(
    (v) => !before.includes(v.text) // untouched pre-existing markers are not this edit's doing
  );
  if (!violations.length) process.exit(0);

  const lines = [
    'DEFERRAL GATE — a defect is fixed, not filed.',
    '',
    `${file}`,
  ];
  for (const v of violations) {
    lines.push(`  line ${v.line}: ${v.text}`);
    lines.push(`     missing: ${v.missing.join(', ')}`);
    if (v.noRecommendation) lines.push('     (no recommendation: line either)');
  }
  lines.push(
    '',
    'functional-test-coverage.md rule 5: a defect found while testing is FIXED, not filed.',
    'Rule 6 permits pinning ONLY when correct behaviour is a decision that belongs to the',
    'owner. Not yet knowing HOW to fix it is not such a decision — that is unfinished',
    'analysis, and the answer is to do the analysis.',
    '',
    'If this genuinely is the owner\'s call, make the pin carry its justification:',
    '    decision-owner:  <who must decide>',
    '    decision-needed: <what they must decide>',
    '    recommendation:  <what you advise, and why>',
    'and put the decision to them in the same turn rather than only writing it down.',
    '',
    'Otherwise: fix it.',
    '',
    'CLAUDE_DEFERRAL_GATE=warn to downgrade, =off to disable.'
  );
  const msg = lines.join('\n');

  if (mode === 'warn') {
    advise(input, msg);
    process.exit(0);
  }
  process.stderr.write(msg + '\n');
  process.exit(2); // exit 2 is the deterministic block on PreToolUse
});
