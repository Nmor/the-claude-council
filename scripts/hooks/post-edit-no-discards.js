#!/usr/bin/env node
/**
 * PostToolUse Hook: enforce zero-tolerance mechanical coding rules.
 *
 * Cross-platform (Windows / macOS / Linux). Runs after every Edit /
 * Write. If the resulting file contains any banned pattern, the hook
 * EXITS NON-ZERO (status 2) with a clear stderr report. Claude Code
 * surfaces stderr to the agent in the same turn, which forces a
 * corrective edit before any other work continues.
 *
 * Rule manifest is in ~/.claude/scripts/hooks/lib/no-discards-rules.js
 * so the patterns and the documentation that describes them live in
 * one place. This file is the runner; that file is the truth.
 *
 * Override (operator only): export CLAUDE_NO_DISCARDS_HOOK=off to
 * skip this check. Intended for bulk-import of legacy code; the
 * agent must never set it itself.
 *
 * Exit codes:
 *   0 — clean (or only soft-warn issues; printed to stderr, not blocking).
 *   2 — at least one blocking violation; the edit is rejected.
 */

const path = require("path");
const { readFile } = require("../lib/utils");
const { evaluateFile } = require("./lib/no-discards-rules");

const MAX_STDIN = 1024 * 1024;
let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += chunk.substring(0, remaining);
  }
});

process.stdin.on("end", () => {
  if (process.env.CLAUDE_NO_DISCARDS_HOOK === "off") {
    process.stdout.write(data);
    process.exit(0);
    return;
  }

  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;
    if (!filePath) return passThrough();

    // The enforcement tooling itself (these hook scripts + their rule manifest)
    // necessarily contains the banned patterns as definitions, examples, and
    // documentation, so it cannot be subject to its own line rules. Never scan
    // files under the hooks directory.
    if (/[/\\]\.claude[/\\]scripts[/\\]hooks[/\\]/.test(filePath)) {
      return passThrough();
    }

    const content = readFile(filePath);
    if (!content) return passThrough();

    const { blocking, soft } = evaluateFile(filePath, content);

    if (soft.length > 0) {
      reportIssues(filePath, soft, "WARN", Math.min(soft.length, 6));
    }

    if (blocking.length === 0) return passThrough();

    reportIssues(filePath, blocking, "BLOCKED", Math.min(blocking.length, 12));
    printRuleSummary();
    process.exit(2);
  } catch (err) {
    console.error(`[no-discards] hook error: ${err.message}`);
    passThrough();
  }
});

function passThrough() {
  process.stdout.write(data);
  process.exit(0);
}

function reportIssues(filePath, issues, level, previewCount) {
  console.error(
    `[no-discards] ${level} — ${issues.length} issue(s) in ${path.basename(filePath)}`,
  );
  for (let i = 0; i < previewCount; i++) {
    const v = issues[i];
    console.error(`  L${v.line} [${v.rule}] ${v.snippet}`);
  }
  if (issues.length > previewCount) {
    console.error(`  …and ${issues.length - previewCount} more`);
  }
}

function printRuleSummary() {
  const summary = [
    "underscore-discard : bind every return value (no `_,` / `_ =`)",
    "placeholder-marker : finish the work or open a real ticket — no T0D0/F1XME-style markers",
    "suppression        : never use //nolint, eslint-disable, @ts-ignore, noqa",
    'task-pointer       : comments document WHY, not "plan B2" / "Sonar S1192"',
    "raw-color          : UI components consume design tokens (no hex/rgb/hsl/oklch)",
    "console-log        : no console.log in production source",
    "hardcoded-secret   : never put credentials in source — use env vars",
    "go-test-naming     : Go test funcs use t.Run subtests, not Test_Foo_Bar",
    "merge-conflict     : remove leftover diff markers",
    "important          : drop !important — let design tokens win",
    "file-too-large     : keep files under 800 LOC (soft warn)",
  ];
  console.error("[no-discards] Fix ALL violations and re-edit. Rules:");
  for (const line of summary) console.error("  " + line);
  console.error(
    "[no-discards] Operator override: export CLAUDE_NO_DISCARDS_HOOK=off",
  );
}
