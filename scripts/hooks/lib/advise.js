// Size budget: 3 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

// How a hook that does NOT block tells Claude something.
//
// Stderr from a hook that exits 0 goes to the debug log only: "never the transcript, and
// Claude never sees it" (Claude Code hooks reference, read 2026-09-21). Every advisory in
// this directory used to write there, so none of them reached the model: the intake,
// research, coverage, payload and supersede nudges, the UX-writing and type-check reports,
// and the soft no-discards warnings. Proved on the live path the same day: a soft warning
// the hook printed on its own was absent from the tool result it was attached to.
//
// The documented channel is JSON on stdout, which Claude Code places next to the tool
// result as a system reminder. Stdout must then carry that object and nothing else, which
// is why the hooks no longer echo their input back.
//
// A blocking message stays on stderr with exit 2: that path does reach Claude.

function advise(input, text, fallbackEvent = 'PreToolUse') {
  if (!text) return;
  const hookEventName = (input && typeof input === 'object' && input.hook_event_name) || fallbackEvent;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: String(text).trim() } }) + '\n',
  );
}

module.exports = { advise };
