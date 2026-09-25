#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
/**
 * PostToolUse Hook: scan copy a person will read for AI-writing tells.
 *
 * Sibling to post-edit-no-discards.js, deliberately separate. That hook guards
 * what the code DOES; this one guards what the product SAYS. Sharing a runner
 * would have meant one rule module for two owners (Division 2 and Division 7)
 * under a name that describes only the first — which is how a copy rule becomes
 * unfindable by the people responsible for copy.
 *
 * Every rule here is a WARN. Copy quality is a judgement the author has to make,
 * and there are legitimate uses of every pattern flagged: an em-dash inside a
 * quoted title, "robust" on a security page. Blocking an edit over punctuation
 * would be its own annoyance, and would train people to disable the hook. What
 * this buys instead is that the tell is impossible to not notice at the moment
 * it is written, plus a repo-wide count via `no-discards-scan.js --rules
 * ux-writing` so a backlog stays visible.
 *
 * Rule manifest is in ~/.claude/scripts/hooks/lib/ux-writing-rules.js. This file
 * is the runner; that file is the truth.
 *
 * Override (operator only): export CLAUDE_UX_WRITING_HOOK=off.
 *
 * Exit codes:
 *   0 — always; nothing here rejects an edit. Warnings go out as advice
 *       (lib/advise.js). This header used to say stderr reached the agent in the
 *       same turn; it does not on exit 0, which is why these warnings went unseen.
 */

const path = require("path");
const { readFile } = require("../lib/utils");
const { advise } = require("./lib/advise.js");
const { evaluateFile } = require("./lib/ux-writing-rules");

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
  if (process.env.CLAUDE_UX_WRITING_HOOK === "off") return passThrough();

  let input = {};
  try {
    input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;
    if (!filePath) return passThrough();

    // The tooling itself contains every pattern as a definition and an example,
    // so it cannot be subject to its own rules.
    if (/[/\\]\.claude[/\\]scripts[/\\]hooks[/\\]/.test(filePath)) {
      return passThrough();
    }

    const content = readFile(filePath);
    if (!content) return passThrough();

    const { blocking, soft } = evaluateFile(filePath, content);
    const issues = blocking.concat(soft);
    if (issues.length === 0) return passThrough();

    const preview = Math.min(issues.length, 8);
    const lines = [`[ux-writing] ${issues.length} AI-writing tell(s) in ${path.basename(filePath)}`];
    for (let i = 0; i < preview; i++) {
      const v = issues[i];
      lines.push(`  L${v.line} [${v.rule}] ${v.snippet}`);
    }
    if (issues.length > preview) lines.push(`  …and ${issues.length - preview} more`);
    lines.push(
      "[ux-writing] Re-punctuate or rewrite the sentence; do not swap the character.",
      "[ux-writing] em-dash-connector: pick the colon, full stop or brackets the sentence wants",
      "[ux-writing] buzzword: describe the behaviour, not the feeling it should produce",
      "[ux-writing] empty-opener / not-just-but: delete the clause; it carries no fact",
    );
    advise(input, lines.join("\n"), "PostToolUse");
    passThrough();
  } catch (err) {
    advise(input, `[ux-writing] hook error: ${err.message}`, "PostToolUse");
    passThrough();
  }
});

// Named for its history: stdout now carries only the advice above, never the input.
function passThrough() {
  process.exit(0);
}
