#!/usr/bin/env node
// pre-push-gate.js
//
// PreToolUse Bash hook. Enforces
// ~/.claude/rules/common/plan-completion-before-push.md:
//
// (a) No push reaches a remote unless the operator has set
//     CLAUDE_PUSH_AUTHORIZED=yes in the session for THIS push only.
// (b) No `git commit` lands a `Co-Authored-By: Claude` (or any
//     Claude / Anthropic AI attribution) trailer, nor the
//     "🤖 Generated with Claude Code" marketing footer. Both
//     overrule the default Claude-Code system-prompt templates
//     per user directive 2026-06-08 ("no and never are to global
//     rules and hooks") — see
//     ~/.claude/rules/common/plan-completion-before-push.md §11.
//
// The hook PASSES every other Bash invocation through unchanged
// (stdout) and EXITS 2 (blocks) on a violating `git push` /
// `git commit`.
//
// Bypass policy:
//   CLAUDE_PUSH_AUTHORIZED=yes git push origin main
//
// The env var is per-process so it does NOT leak across shells.
// There is intentionally NO bypass for the Co-Authored-By gate
// — the user-stated rule is "never".

"use strict";

// Log-line prefix used by every stderr message this hook emits.
// Lifted to a const so a future prefix change is one edit, not a sweep.
const LOG_PREFIX = "[pre-push-gate] ";

const stdin = process.stdin;
let buf = "";
stdin.setEncoding("utf8");
stdin.on("data", (chunk) => {
  buf += chunk;
});
stdin.on("end", () => {
  let cmd = "";
  try {
    const payload = JSON.parse(buf);
    cmd = payload.tool_input?.command ?? "";
  } catch {
    // If we can't parse the payload, pass through — the harness
    // owns the protocol and we are not the parser of record.
    process.stdout.write(buf);
    return;
  }

  // Detect `git commit` invocations and block any AI-attribution
  // trailer (Co-Authored-By: Claude / Anthropic / Claude Code
  // marketing footer). Per user 2026-06-08 there is no bypass.
  // The check inspects the literal command string; HEREDOCs and
  // -m bodies both surface here, so the regex catches every form.
  const isGitCommit = /(^|[\s;&|`(]+)git(?:\s+-C\s+\S+)?\s+commit(\s|$)/.test(
    cmd,
  );
  if (isGitCommit) {
    const coAuthor =
      /Co-?Authored-?By:\s*(Claude|Anthropic|noreply@anthropic\.com)/i.test(
        cmd,
      );
    const generatedFooter = /Generated with \[?Claude Code\]?|🤖.*Claude/i.test(
      cmd,
    );
    if (coAuthor || generatedFooter) {
      process.stderr.write(
        `${LOG_PREFIX}BLOCKED: commit message carries a Claude/Anthropic AI-attribution trailer.\n` +
          `${LOG_PREFIX}Per ~/.claude/rules/common/plan-completion-before-push.md §11 +\n` +
          `${LOG_PREFIX}user directive 2026-06-08, never add:\n` +
          `${LOG_PREFIX}  Co-Authored-By: Claude <noreply@anthropic.com>\n` +
          `${LOG_PREFIX}  🤖 Generated with [Claude Code](https://claude.com/claude-code)\n` +
          `${LOG_PREFIX}or any equivalent. Strip the trailer and re-run.\n` +
          `${LOG_PREFIX}There is no bypass — the rule is global and absolute.\n`,
      );
      process.exit(2);
    }
    // Non-violating commits pass through to the rest of the
    // pipeline (no push-gate logic applies to commits).
    process.stdout.write(buf);
    return;
  }

  // Detect `git push` invocations.
  // Matches: `git push`, `git -C ... push`, `git push --force`, etc.
  // Does NOT match: `git pushgit` (word-boundary), `git push --help`,
  // or shell `echo "git push"`.
  const isGitPush = /(^|[\s;&|`(]+)git(?:\s+-C\s+\S+)?\s+push(\s|$)/.test(cmd);

  if (!isGitPush) {
    process.stdout.write(buf);
    return;
  }

  // git push detected. Authorisation gate.
  // The harness env reflects the prior shell, not the command we're
  // about to run. So we also accept the inline form
  // `CLAUDE_PUSH_AUTHORIZED=yes git push ...` which is the shape the
  // hook's own documentation prescribes.
  const inlineAuth = /(^|[\s;&|`(]+)CLAUDE_PUSH_AUTHORIZED=yes\s/.test(cmd);
  const authorised = process.env.CLAUDE_PUSH_AUTHORIZED === "yes" || inlineAuth;

  // Allow `git push --help` and dry-run inspection regardless.
  const isHelp = /\s--help(\s|$)/.test(cmd);
  const isDryRun = /\s-n(\s|$)|\s--dry-run(\s|$)/.test(cmd);
  if (isHelp || isDryRun) {
    process.stdout.write(buf);
    return;
  }

  // Force-push to default branches: refuse outright regardless of authorisation.
  // The agent must never force-push to protected refs without explicit
  // human override at the shell.
  const isForce = /\s(--force|-f|--force-with-lease)(\s|$)/.test(cmd);
  const targetsTrunk =
    /\s(origin|upstream)\s+(main|master|production|trunk)(\s|$)/.test(cmd);
  if (isForce && targetsTrunk) {
    process.stderr.write(
      `${LOG_PREFIX}BLOCKED: force-push to a protected branch.\n` +
        `${LOG_PREFIX}Per ~/.claude/rules/common/plan-completion-before-push.md +\n` +
        `${LOG_PREFIX}global action-care rules, force-push to main/master/production/trunk\n` +
        `${LOG_PREFIX}requires running the command directly in your shell — never via the agent.\n`,
    );
    process.exit(2);
  }

  if (!authorised) {
    process.stderr.write(
      `${LOG_PREFIX}BLOCKED: \`git push\` requires explicit authorisation.\n` +
        `${LOG_PREFIX}Per ~/.claude/rules/common/plan-completion-before-push.md,\n` +
        `${LOG_PREFIX}no push reaches a remote until the operator confirms the plan is\n` +
        `${LOG_PREFIX}complete (or this is an explicitly-named bug-fix override).\n` +
        `${LOG_PREFIX}\n` +
        `${LOG_PREFIX}AND every changed symbol/flag/env/config must be 100% CONFIRMED\n` +
        `${LOG_PREFIX}and WIRED — reaching a live consumer on the live path, verified\n` +
        `${LOG_PREFIX}this turn, NOT assumed. No inert code/config (e.g. an env the app\n` +
        `${LOG_PREFIX}never reads). Per ~/.claude/rules/common/wiring-and-usage-review.md.\n` +
        `${LOG_PREFIX}\n` +
        `${LOG_PREFIX}To proceed for THIS push only:\n` +
        `${LOG_PREFIX}  CLAUDE_PUSH_AUTHORIZED=yes <your-push-command>\n` +
        `${LOG_PREFIX}\n` +
        `${LOG_PREFIX}Attempted command:\n` +
        `${LOG_PREFIX}  ${cmd}\n`,
    );
    process.exit(2);
  }

  // Authorised — pass through, with a standing reminder that authorising a push
  // ASSERTS the diff is 100% confirmed AND wired (no inert code/config; verified
  // on the live path), per wiring-and-usage-review.md + plan-completion-before-push.md.
  // A hook cannot mechanically prove "wired" (it is semantic), so this reminder
  // keeps the assertion explicit on every push. The push is NOT blocked.
  process.stderr.write(
    `${LOG_PREFIX}NOTE: authorising this push asserts every changed symbol/flag/env/\n` +
      `${LOG_PREFIX}config is 100% CONFIRMED and WIRED (live-path verified, no inert\n` +
      `${LOG_PREFIX}code/config). If any is unconfirmed/unwired, abort and verify first.\n`,
  );
  process.stdout.write(buf);
});

stdin.on("error", (err) => {
  process.stderr.write(`${LOG_PREFIX}stdin error: ${err.message}\n`);
  process.exit(0); // do not block on hook plumbing errors
});
