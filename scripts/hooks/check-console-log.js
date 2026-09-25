#!/usr/bin/env node
// Size budget: 13 KB. Check: wc -c; gate: token-budget.mjs --check.

/**
 * Stop Hook — two independent checks, two bypass env vars
 *
 * Cross-platform (Windows, macOS, Linux).
 *
 * FAMILY 1 — console.log audit (default-on, bypass via
 *   CLAUDE_CONSOLE_LOG_AUDIT=off):
 *   Scans git-modified JS/TS files (excluding tests + configs +
 *   scripts/) for `console.log` and warns. Helps developers
 *   remove debug statements before committing.
 *
 * FAMILY 2 — verify-claim audit (default-on, bypass via
 *   CLAUDE_VERIFY_CLAIM_AUDIT=off):
 *   Scans the assistant's final response for strong-completion
 *   claim phrases ("done", "complete", "shipped", "100% solid",
 *   etc.) and warns when no verification block is attached in
 *   the same turn. Enforces rules/common/verify-before-claim.md
 *   rule 1. Stop hooks cannot block retroactively; the warning
 *   is visible on the next turn so the agent re-verifies.
 *
 * Output channels (Claude Code hooks reference, read 2026-09-21): stderr on exit 0 is
 * written to the debug log only, so warnings travel as `systemMessage`, which the user
 * sees. The wall uses `hookSpecificOutput.additionalContext`, the documented way for a
 * Stop hook to keep the turn going with guidance. It previously set `continue` and
 * `continueReason` inside hookSpecificOutput, fields Stop does not define.
 */

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { isGitRepo, getGitModifiedFiles, readFile } = require("../lib/utils");

// ──────────────────────────────────────────────────────────────
// console.log audit (FAMILY 1)
// ──────────────────────────────────────────────────────────────

const EXCLUDED_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.config\.[jt]s$/,
  /scripts\//,
  /__tests__\//,
  /__mocks__\//,
];

function runConsoleLogAudit() {
  if (!isGitRepo()) return [];

  const files = getGitModifiedFiles(["\\.tsx?$", "\\.jsx?$"])
    .filter((f) => fs.existsSync(f))
    .filter((f) => !EXCLUDED_PATTERNS.some((pattern) => pattern.test(f)));

  const notes = [];
  for (const file of files) {
    const content = readFile(file);
    if (content && content.includes("console.log")) {
      notes.push(`[Hook] WARNING: console.log found in ${file}`);
    }
  }
  if (notes.length)
    notes.push("[Hook] Remove console.log statements before committing");
  return notes;
}

// ──────────────────────────────────────────────────────────────
// verify-claim audit (FAMILY 2)
// ──────────────────────────────────────────────────────────────

const CLAIM_AUDIT_PREFIX = "[stop-verify-claim-audit] ";

const CLAIM_PATTERNS = [
  /\b(?:we[’']?re|i[’']?m)\s+done\b/i,
  /\bnow\s+done\b/i,
  /\b(?:task|work|change|migration|refactor|feature|fix|implementation|rebuild)\s+(?:is\s+)?(?:done|complete|shipped|ready\s+to\s+ship|production[- ]?ready|fully\s+\w+(?:-backed|-migrated|-stripped))\b/i,
  /\b100%\s+(?:done|complete|solid|ready)\b/i,
  /\b(?:bulletproof|battle[- ]tested)\b/i,
  /\bshipped\.?$/im,
  /\ball\s+set\.?$/im,
  /\blooks\s+great\b/i,
  /\bshould\s+be\s+fine\b/i,
  /\bi\s+think\s+it[’']?s\s+done\b/i,
  /\bconfident\s+(?:this|it)\s+(?:works|is\s+correct)\b/i,
  /\bdone\.?$/im,
  /\bcomplete\.?$/im,
];

const VERIFICATION_MARKERS = [
  /verification\s*\((?:this\s+turn|after\s+\w+)\)\s*:/i,
  /^\s*verification\s*:/im,
  /lint\s+sweep\s*\([^)]*this\s+turn[^)]*\)\s*:/i,
  /^\s*proper[- ]fix\s+audit\s*:/im,
  // A markdown table row is NOT evidence of verification. The previous entry here was
  // /^\s*\|.*\|.*\|.*$/m -- any three-column row -- and because the Floor rules ask for
  // tables in most structured answers, it silenced this audit on nearly every real
  // response. Measured 2026-09-21: 'The migration is complete.' alone fired; the same
  // sentence plus a bare table did not. A verification line must name a GATE and carry a
  // RESULT on the same line.
  /(?:tsc|eslint|pytest|go\s+test|go\s+vet|staticcheck|golangci|vitest|jest|ruff|mypy|gosec|govulncheck|markdownlint|coverage)[^\n]{0,80}?(?:\d+\s*errors?|\d+\s*issues?|\d+\s*\/\s*\d+|\bclean\b|\bpassed?\b|\bok\b|[0-9.]+\s*%)/i,
];

// Force ONE continuation when a completion claim carries no verification.
//
// Until now this audit could only warn, and it warned at Stop -- after the claim had
// already landed in front of the user. The Stop event supports `continue: true`, which
// refuses to end the turn and hands the model a reason, so the claim can be verified or
// withdrawn before anyone reads it. That converts no-overclaim.md from a notice into a wall.
//
// THE LATCH IS LOAD-BEARING. A Stop hook that can re-fire on the turn it just extended is
// an infinite loop. It therefore fires AT MOST ONCE per prompt_id: the latch file is written
// before the continuation is emitted, and its presence suppresses every later attempt in the
// same turn. If the model declines to verify, the turn ends normally the second time -- the
// hook gets one interruption, not a hostage.
//
// Disable with CLAUDE_CLAIM_WALL=off (the warning still prints).
function claimWallLatched(promptId) {
  if (!promptId) return true; // no turn identity -> cannot latch -> never continue
  const latch = path.join(os.tmpdir(), `claude-council-claimwall-${promptId}`);
  if (fs.existsSync(latch)) return true;
  try {
    fs.writeFileSync(latch, String(Date.now()));
  } catch {
    return true; // cannot latch -> do not risk a loop
  }
  return false;
}

// Returns { warning, wall }: the text to show, and whether to hold the turn open once.
function runVerifyClaimAudit(buf, promptId) {
  const none = { warning: "", wall: false };
  const message = extractFinalAssistantMessage(buf);
  if (!message) return none;

  const claim = findClaim(message);
  if (!claim) return none;

  if (hasVerificationBlock(message)) return none;

  const warning = claimWarning(claim);
  let active = false;
  try {
    active = Boolean((JSON.parse(buf || "{}") || {}).stop_hook_active);
  } catch {
    active = false;
  }
  if (process.env.CLAUDE_CLAIM_WALL === "off" || active)
    return { warning, wall: false };
  if (claimWallLatched(promptId)) return { warning, wall: false };
  return { warning, wall: true };
}

function extractFinalAssistantMessage(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // The documented field for the just-finished reply. The transcript may not contain
  // it yet at Stop time, so reading only the file could judge the previous reply.
  if (
    typeof parsed.last_assistant_message === "string" &&
    parsed.last_assistant_message
  ) {
    return parsed.last_assistant_message;
  }
  const transcriptPath = parsed.transcript_path;
  if (!transcriptPath || typeof transcriptPath !== "string") return null;
  if (!fs.existsSync(transcriptPath)) return null;

  let lines;
  try {
    const data = fs.readFileSync(transcriptPath, "utf8");
    lines = data.split(/\r?\n/).filter(Boolean);
  } catch {
    return null;
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (entry.type === "assistant" && entry.message) {
      const text = extractText(entry.message);
      if (text) return text;
    }
  }
  return null;
}

function extractText(msg) {
  if (typeof msg === "string") return msg;
  if (!msg.content) return null;
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return null;
  const parts = [];
  for (const block of msg.content) {
    if (block && block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("\n");
}

function findClaim(text) {
  for (const re of CLAIM_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0].slice(0, 120);
  }
  return null;
}

function hasVerificationBlock(text) {
  for (const re of VERIFICATION_MARKERS) {
    if (re.test(text)) return true;
  }
  return false;
}

function claimWarning(claim) {
  return (
    `${CLAIM_AUDIT_PREFIX}WARNING: completion claim emitted without a same-turn\n` +
    `${CLAIM_AUDIT_PREFIX}verification block.\n` +
    `${CLAIM_AUDIT_PREFIX}Matched phrase: "${claim}"\n` +
    `${CLAIM_AUDIT_PREFIX}Per rules/common/verify-before-claim.md rule 1, strong-\n` +
    `${CLAIM_AUDIT_PREFIX}completion language must be paired with the gates that\n` +
    `${CLAIM_AUDIT_PREFIX}ran THIS turn. If the user challenges this claim, re-run\n` +
    `${CLAIM_AUDIT_PREFIX}the verification before re-affirming (rule 6).\n` +
    `${CLAIM_AUDIT_PREFIX}Bypass: CLAUDE_VERIFY_CLAIM_AUDIT=off if claim is non-\n` +
    `${CLAIM_AUDIT_PREFIX}completion in context (e.g., describing past state).\n`
  );
}

// ──────────────────────────────────────────────────────────────
// Entry
// ──────────────────────────────────────────────────────────────

const MAX_STDIN = 1024 * 1024; // 1MB
let data = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += chunk.substring(0, remaining);
  }
});

process.stdin.on("end", () => {
  let wall = false;
  let promptId = "";
  const notes = [];
  try {
    try {
      promptId = (JSON.parse(data || "{}") || {}).prompt_id || "";
    } catch {
      promptId = "";
    }
    if (process.env.CLAUDE_CONSOLE_LOG_AUDIT !== "off") {
      notes.push(...runConsoleLogAudit());
    }
    if (process.env.CLAUDE_VERIFY_CLAIM_AUDIT !== "off") {
      const audit = runVerifyClaimAudit(data, promptId);
      wall = audit.wall;
      if (audit.warning) notes.push(audit.warning.trimEnd());
    }
  } catch (err) {
    notes.push(`[Hook] check-console-log error: ${err.message}`);
  }

  if (wall) {
    // Hold the turn open ONCE, so a completion claim is verified or withdrawn before the
    // user reads it. The latch in claimWallLatched and stop_hook_active stop it repeating.
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "Stop",
          additionalContext:
            "A completion claim was made with no verification block naming gates that ran " +
            "THIS turn (verify-before-claim.md r1-r3, no-overclaim.md). Either run the gates " +
            "and state their real output, or downgrade the claim to what is actually true " +
            '("implemented - <gate> not run yet"). This interruption fires once per turn.',
        },
      }),
    );
    process.exit(0);
  }

  if (notes.length)
    process.stdout.write(JSON.stringify({ systemMessage: notes.join("\n") }));
  process.exit(0);
});

process.stdin.on("error", (err) => {
  process.stderr.write(`[Hook] stdin error: ${err.message}\n`);
  process.exit(0);
});
