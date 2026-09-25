#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
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
 *   0 — clean, or soft warnings only, sent as advice (lib/advise.js) because
 *       stderr on exit 0 is never shown to Claude.
 *   2 — at least one blocking violation; the edit is rejected.
 */

const path = require("path");
const { readFile } = require("../lib/utils");
const { evaluateFile, summariesFor } = require("./lib/no-discards-rules");
const { advise } = require("./lib/advise.js");

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
  if (process.env.CLAUDE_NO_DISCARDS_HOOK === "off") return passThrough();

  let input = {};
  try {
    input = JSON.parse(data);
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

    if (blocking.length === 0) {
      // A warning alone does not block, so it must travel as advice: stderr on exit 0 is
      // never shown to Claude.
      if (soft.length > 0) {
        advise(input, formatIssues(filePath, soft, "WARN", Math.min(soft.length, 6)), "PostToolUse");
      }
      return passThrough();
    }

    if (soft.length > 0) {
      console.error(formatIssues(filePath, soft, "WARN", Math.min(soft.length, 6)));
    }

    console.error(formatIssues(filePath, blocking, "BLOCKED", Math.min(blocking.length, 12)));
    printRuleSummary(blocking);
    process.exit(2);
  } catch (err) {
    advise(input, `[no-discards] hook error: ${err.message}`, "PostToolUse");
    passThrough();
  }
});

function passThrough() {
  process.exit(0);
}

function formatIssues(filePath, issues, level, previewCount) {
  const lines = [`[no-discards] ${level} — ${issues.length} issue(s) in ${path.basename(filePath)}`];
  for (let i = 0; i < previewCount; i++) {
    const v = issues[i];
    lines.push(`  L${v.line} [${v.rule}] ${v.snippet}`);
  }
  if (issues.length > previewCount) lines.push(`  …and ${issues.length - previewCount} more`);
  return lines.join("\n");
}

// Explain only the rules this edit tripped, from the manifest, so a new rule can never
// be reported by id with nothing saying what it means.
function printRuleSummary(blocking) {
  console.error("[no-discards] Fix ALL violations and re-edit:");
  for (const line of summariesFor(blocking)) console.error("  " + line);
  console.error(
    "[no-discards] Operator override: export CLAUDE_NO_DISCARDS_HOOK=off",
  );
}
