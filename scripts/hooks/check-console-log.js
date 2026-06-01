#!/usr/bin/env node

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
 * Stop hooks receive JSON on stdin with a `transcript_path`
 * field pointing at the conversation JSONL. The hook MUST emit
 * the original buffer back on stdout unchanged and exit 0.
 */

"use strict";

const fs = require("node:fs");
const { isGitRepo, getGitModifiedFiles, readFile, log } = require("../lib/utils");

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
  if (!isGitRepo()) return;

  const files = getGitModifiedFiles(["\\.tsx?$", "\\.jsx?$"])
    .filter((f) => fs.existsSync(f))
    .filter((f) => !EXCLUDED_PATTERNS.some((pattern) => pattern.test(f)));

  let hasConsole = false;
  for (const file of files) {
    const content = readFile(file);
    if (content && content.includes("console.log")) {
      log(`[Hook] WARNING: console.log found in ${file}`);
      hasConsole = true;
    }
  }
  if (hasConsole) {
    log("[Hook] Remove console.log statements before committing");
  }
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
  /^\s*\|.*\|.*\|.*$/m,
];

function runVerifyClaimAudit(buf) {
  const message = extractFinalAssistantMessage(buf);
  if (!message) return;

  const claim = findClaim(message);
  if (!claim) return;

  if (hasVerificationBlock(message)) return;

  emitClaimWarning(claim);
}

function extractFinalAssistantMessage(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
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

function emitClaimWarning(claim) {
  process.stderr.write(
    `${CLAIM_AUDIT_PREFIX}WARNING: completion claim emitted without a same-turn\n` +
      `${CLAIM_AUDIT_PREFIX}verification block.\n` +
      `${CLAIM_AUDIT_PREFIX}Matched phrase: "${claim}"\n` +
      `${CLAIM_AUDIT_PREFIX}Per rules/common/verify-before-claim.md rule 1, strong-\n` +
      `${CLAIM_AUDIT_PREFIX}completion language must be paired with the gates that\n` +
      `${CLAIM_AUDIT_PREFIX}ran THIS turn. If the user challenges this claim, re-run\n` +
      `${CLAIM_AUDIT_PREFIX}the verification before re-affirming (rule 6).\n` +
      `${CLAIM_AUDIT_PREFIX}Bypass: CLAUDE_VERIFY_CLAIM_AUDIT=off if claim is non-\n` +
      `${CLAIM_AUDIT_PREFIX}completion in context (e.g., describing past state).\n`,
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
  try {
    if (process.env.CLAUDE_CONSOLE_LOG_AUDIT !== "off") {
      runConsoleLogAudit();
    }
    if (process.env.CLAUDE_VERIFY_CLAIM_AUDIT !== "off") {
      runVerifyClaimAudit(data);
    }
  } catch (err) {
    log(`[Hook] check-console-log error: ${err.message}`);
  }

  process.stdout.write(data);
  process.exit(0);
});

process.stdin.on("error", (err) => {
  process.stderr.write(`[Hook] stdin error: ${err.message}\n`);
  process.exit(0);
});
