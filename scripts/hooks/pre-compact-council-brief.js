#!/usr/bin/env node
// Size budget: 11 KB. Check: wc -c; gate: token-budget.mjs --check.
/**
 * PreCompact Hook — Council-mediated preservation brief.
 *
 * Runs BEFORE the existing pre-compact.js (state-snapshot) so the
 * brief shows up in the conversation history that Claude's
 * summariser processes. Claude's compaction is lossy by design;
 * this hook gives the summariser a structured "preserve this
 * verbatim" block, drawn from the five core Council Divisions
 * + any Extended Division whose triggers fired this session.
 *
 * Output:
 *   1. ~/.claude/sessions/<id>-precompact-brief.md   (durable record)
 *   2. Appended to the active session .tmp           (visible to the
 *      summariser — that's the point)
 *
 * The plan and memory it summarises are THIS project's (lib/project-context.js): the plan
 * its memory index names, and that memory index. It used to summarise the newest plan in the
 * shared ~/.claude/plans (often another project's) and one fixed memory path.
 *
 * It does not write memory. It used to rewrite a "Last updated" line without touching the
 * content, which made stale memory read as freshly maintained (removed 2026-09-21).
 *
 * The brief is intentionally short (~2 KB) so it survives the
 * cost-bound compaction budget. Long-form state stays in
 * sessions/ + memory/.
 *
 * Bypass: CLAUDE_COUNCIL_BRIEF=off (emergency only — disabling
 * means compaction quality drops to the model default).
 *
 * Cross-references:
 *   - ~/.claude/rules/common/project-memory.md
 *   - ~/.claude/rules/common/council-default.md
 *   - ~/.claude/rules/common/plan-execution-progress.md
 *   - ~/.claude/rules/common/verify-before-claim.md
 */

"use strict";

const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

if (process.env.CLAUDE_COUNCIL_BRIEF === "off") {
  process.exit(0);
}

const HOME = os.homedir();
const SESSIONS_DIR = path.join(HOME, ".claude", "sessions");
const pc = require("./lib/project-context.js");

function nowIso() {
  return new Date().toISOString();
}

function safeRead(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (err) {
    // File missing or unreadable — return empty so callers degrade
    // gracefully. We don't log because this hook runs on every
    // compaction and absent files (no plan yet, no memory yet) are
    // the expected first-touch state.
    void err;
    return "";
  }
}

function planSummary() {
  const plan = pc.activePlan(process.cwd(), HOME);
  if (plan.state === "none") return "This project runs without a plan (Active plan: none).";
  if (plan.state === "unset") return `This project names no active plan; add "Active plan: <path>" to ${plan.index}.`;
  if (plan.state === "missing") return `This project's active plan ${plan.path} no longer exists.`;
  const activePlan = plan.path;
  const body = safeRead(activePlan);
  // Extract first H1 + first "Phase" line + last "complete" / "in_progress" line
  const lines = body.split("\n");
  const title = lines.find((l) => l.startsWith("# ")) || "(untitled)";
  const phaseLine =
    lines.find((l) => /^(##|###)\s*Phase\s+[A-Za-z\d]/.test(l)) ||
    "(no phase header found)";
  const lastDone =
    [...lines].reverse().find((l) => /executed|complete|verified/i.test(l)) ||
    "(no completion marker)";
  return [
    `File: ${activePlan}`,
    `Title: ${title.replace(/^#\s+/, "")}`,
    `Latest phase header: ${phaseLine.replace(/^#+\s+/, "")}`,
    `Latest completion marker: ${lastDone.slice(0, 200)}`,
  ].join("\n");
}

function todoSummary() {
  // TodoWrite state is held by the harness — we can't read it
  // directly from a file. The brief instead points the summariser
  // at the visible TodoWrite block (rendered in the conversation).
  return "See the most recent TodoWrite block in the conversation history.";
}

function memorySummary() {
  const index = path.join(pc.memoryDir(process.cwd(), HOME), "MEMORY.md");
  const body = safeRead(index);
  if (!body) return `No memory index for this project at ${index}.`;
  // First 30 non-blank lines of memory
  return body
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(0, 30)
    .join("\n");
}

function recentLearningEvents() {
  const log = path.join(HOME, ".claude", "audits", "learning-events.jsonl");
  const body = safeRead(log);
  if (!body) return "No learning-events log.";
  const lines = body.trim().split("\n").slice(-5);
  return lines.length
    ? `Last 5 learning events:\n${lines.join("\n")}`
    : "No recent learning events.";
}

function buildBrief() {
  return [
    `# Council pre-compact preservation brief — ${nowIso()}`,
    "",
    "> The model is about to compact the conversation. The five Core",
    "> Council Divisions name what MUST survive. Treat the block below",
    "> as load-bearing context — do not paraphrase, do not summarise",
    "> away. The post-compact session will re-read this from disk on",
    "> SessionStart, but the summary itself should preserve it too.",
    "",
    "---",
    "",
    "## D1 — Architecture & Planning preservation",
    "",
    planSummary(),
    "",
    "## D2 — Implementation & Build preservation",
    "",
    todoSummary(),
    "Touched files this session: see the most recent Edit/Write tool",
    "calls in the conversation — preserve every file path + the",
    "verification block paired with each claim of completion.",
    "",
    "## D3 — Quality & Review preservation",
    "",
    "Preserve verbatim: every IDE-diagnostic count + lint result",
    "+ tsc/staticcheck/golangci-lint exit code reported THIS session.",
    "Verification blocks per `verify-before-claim.md` are the proof",
    'that "done" was honest — they must survive.',
    "",
    "## D4 — Security preservation",
    "",
    "Preserve verbatim: any CVE / secret-rotation / RLS work in flight,",
    "any vault-stored credential references touched, any vendor-research",
    "note paths added under docs/provider-research/.",
    "",
    "## D5 — Testing & QA preservation",
    "",
    "Preserve verbatim: coverage state, pending RED-GREEN-REFACTOR",
    "steps, any quarantined / skipped tests, any flaky-test tickets",
    "opened this session.",
    "",
    "## Project memory snapshot",
    "",
    memorySummary(),
    "",
    "## Recent learning events",
    "",
    recentLearningEvents(),
    "",
    "## Operator notes",
    "",
    "- Compaction may not re-fetch context-bound resources (workspace",
    "  CLAUDE.md, project memory, plan files). The SessionStart hook",
    "  re-reads them; trust those over a compressed summary.",
    "- If the post-compact turn shows signs of forgetting a load-bearing",
    "  item from this brief, the user's next message should say:",
    '  "/memory-refresh" or "re-read the active plan".',
    "",
    `_Brief generated ${nowIso()} by pre-compact-council-brief.js_`,
    "",
  ].join("\n");
}

function main() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const sessionId = nowIso()
    .replace(/[^0-9TZ-]/g, "")
    .slice(0, 15);
  const briefPath = path.join(SESSIONS_DIR, `${sessionId}-precompact-brief.md`);
  const brief = buildBrief();

  fs.writeFileSync(briefPath, brief);

  // Append the brief to the active session .tmp so the summariser
  // sees it in the conversation history.
  try {
    const tmpFiles = fs
      .readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith("-session.tmp"))
      .map((f) => path.join(SESSIONS_DIR, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (tmpFiles.length > 0) {
      fs.appendFileSync(tmpFiles[0], `\n\n${brief}\n`);
    }
  } catch (err) {
    process.stderr.write(
      `[pre-compact-brief] session-tmp append skipped: ${err.code || err.message}\n`,
    );
  }

  // Emit a stderr line so the user sees the hook fired
  process.stderr.write(
    `[Council pre-compact] Preservation brief written to ${briefPath}\n`,
  );
  process.exit(0);
}

try {
  main();
} catch (err) {
  // A lifecycle hook that throws takes the compaction — and with it the session — down.
  // Every sibling hook here degrades to a stderr line and exit 0; this one did not, so an
  // unwritable ~/.claude/sessions crashed it with a stack trace and a non-zero exit.
  process.stderr.write(
    `[pre-compact-brief] skipped: ${err.code || err.message}\n`,
  );
  process.exit(0);
}
