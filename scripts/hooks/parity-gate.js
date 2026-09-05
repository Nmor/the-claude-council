#!/usr/bin/env node
'use strict';

// PostToolUse hook (matcher: Edit|Write|MultiEdit).
// Enforces the Step-6 competitive-parity scan of post-phase-retrospective-review.md /
// competitive-parity-per-phase.md at the point a plan file records a phase/wave/part
// CLOSE. When a plan under a `.claude/plans/` path shows a completion signal (a
// retrospective-sweep block, or a wave/phase/part marked complete/✅) but carries NO
// "Competitive parity" block, the wave-close is missing its Step 6 — surface a
// NON-BLOCKING reminder so the parity scan (audit-vs-competitors → file gap tasks →
// ship discovery filters in the same wave) is not silently skipped.
//
// Modes (env CLAUDE_PARITY_GATE):
//   unset / "nudge"  -> NON-BLOCKING reminder on stderr, exit 0 (default)
//   "off"            -> disabled (exit 0, silent)
// There is no "block" mode: a wave-close is model-authored prose, not a tool call,
// so this gates the observable proxy (the plan file's content) as a reminder only.
//
// Low-noise by design:
//   - only fires on markdown plan files under a `/.claude/plans/` path
//   - only when a completion signal is present AND no parity block exists
//   - fires at most ONCE per session (a tmp marker), like intake-gate

const fs = require('fs');
const os = require('os');
const path = require('path');

const MODE = String(process.env.CLAUDE_PARITY_GATE || 'nudge').toLowerCase();

// A phase/wave/part CLOSE signal in the plan text: the retrospective sweep block, or
// a wave/phase/part explicitly marked complete/done/✅.
const CLOSE_SIGNAL = /(retrospective sweep|\b(wave|phase|part)\b[^\n]{0,60}(complete|completed|✅|\bdone\b))/i;
// The Step-6 artefact that must accompany a close.
const PARITY_BLOCK = /competitive[\s-]?parity/i;

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  let warn = null;
  try {
    if (MODE === 'off') { process.exit(0); }
    const input = JSON.parse(data || '{}');
    const file = (input.tool_input && input.tool_input.file_path) || '';
    const sid = input.session_id || '';
    if (!file || !sid) { process.exit(0); }

    const lower = file.toLowerCase();
    const isPlan = lower.includes('/.claude/plans/') && lower.endsWith('.md');
    const marker = path.join(os.tmpdir(), `claude-council-parity-${sid}`);
    if (!isPlan || fs.existsSync(marker)) { process.exit(0); }

    let content = '';
    try { content = fs.readFileSync(file, 'utf8'); } catch { process.exit(0); }

    if (CLOSE_SIGNAL.test(content) && !PARITY_BLOCK.test(content)) {
      warn = `[parity-gate] "${path.basename(file)}" records a phase/wave/part close but has no `
        + `"Competitive parity" block. Per post-phase-retrospective-review.md Step 6 + `
        + `competitive-parity-per-phase.md, a wave/part-close audits what shipped against the leading `
        + `competitors (cumulative, reference-set locked per plan), files the gaps as next-wave tasks, `
        + `and ships each new dimension's discovery/filter surface in the same wave. Add the `
        + `"Competitive parity (this phase/wave)" block. [CLAUDE_PARITY_GATE=off silences]`;
      // fire at most once per session
      try { fs.writeFileSync(marker, '1'); } catch { /* marker best-effort */ }
    }
  } catch (err) {
    warn = `[parity-gate] skipped: ${err.message}`;
  }
  if (warn) { process.stderr.write(warn + '\n'); }
  process.exit(0);
});
