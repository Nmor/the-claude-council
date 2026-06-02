#!/usr/bin/env node
// pre-push-gate.js
//
// PreToolUse Bash hook. Enforces
// ~/.claude/rules/common/plan-completion-before-push.md:
// no push reaches a remote unless the operator has set
// CLAUDE_PUSH_AUTHORIZED=yes in the session for THIS push only.
//
// The hook PASSES every non-`git push` Bash invocation through
// unchanged (stdout) and EXITS 2 (blocks) on `git push` without
// the explicit authorisation.
//
// Bypass policy:
//   CLAUDE_PUSH_AUTHORIZED=yes git push origin main
//
// The env var is per-process so it does NOT leak across shells.

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
        `${LOG_PREFIX}To proceed for THIS push only:\n` +
        `${LOG_PREFIX}  CLAUDE_PUSH_AUTHORIZED=yes <your-push-command>\n` +
        `${LOG_PREFIX}\n` +
        `${LOG_PREFIX}Attempted command:\n` +
        `${LOG_PREFIX}  ${cmd}\n`,
    );
    process.exit(2);
  }

  // Authorised — pass through.
  process.stdout.write(buf);
});

stdin.on("error", (err) => {
  process.stderr.write(`${LOG_PREFIX}stdin error: ${err.message}\n`);
  process.exit(0); // do not block on hook plumbing errors
});
