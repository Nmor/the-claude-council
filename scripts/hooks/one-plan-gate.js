#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PreToolUse hook (matchers: Edit|Write|MultiEdit, and Bash).
//
// Enforces one-plan-per-workspace.md (the why lives there): ONE plan file per workspace.
//
// BLOCKS creating a top-level *.md in a `.claude/plans/` dir when the workspace already has a
// plan: in that dir; in an enclosing workspace's plans dir, walking up no higher than the
// session's project root (so a stray plan above a folder of unrelated projects blocks none of
// them) and never to $HOME; or wherever the workspace's `Active plan:` pointer names, the
// shared ~/.claude/plans included. Creating = a Write to a new path, or a Bash write judged on
// what it runs (lib/bash-writes.js). A rename among the workspace's own plans is not a new one.
// ADVISES: editing or renaming a plan that has siblings; a new file in the shared
// ~/.claude/plans while the session's workspace names an Active plan (merge it in).
// IGNORES: plans subfolders (data), and everything else.
// Paths compare after resolving symlinks and letter case (realpath.native of the parent).
// Fails OPEN on any error, so a broken gate never stops edits.
//
// Modes: CLAUDE_ONE_PLAN_GATE=block (default) | warn | off. An unknown value blocks.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { bashWrites } = require("./lib/bash-writes.js");
const { advise } = require("./lib/advise.js");
const pc = require("./lib/project-context.js");

const RAW = (process.env.CLAUDE_ONE_PLAN_GATE || "block").toLowerCase();
const MODE = RAW === "off" || RAW === "warn" ? RAW : "block";
const HOME = os.homedir();
const real = (p) => {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return p;
  }
};
// Resolved through the parent, which exists even when the file does not yet.
const canon = (p) => path.join(real(path.dirname(p)), path.basename(p));
const SHARED = real(path.join(HOME, ".claude", "plans"));
const STOP = new Set([HOME, real(HOME)]);
const MD = /\.(?:md|markdown)$/i;
const up2 = (p) => path.dirname(path.dirname(p));

const isPlanFile = (p) =>
  MD.test(p) &&
  path.basename(path.dirname(p)) === "plans" &&
  path.basename(up2(p)) === ".claude";
const inside = (p, root) =>
  p === root || p.startsWith(root.endsWith(path.sep) ? root : root + path.sep);

/** Top-level markdown files in a plans directory. Unreadable or absent: none (fail open). */
function plansIn(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => (e.isFile() || e.isSymbolicLink()) && MD.test(e.name))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

/** Plans of the nearest workspace enclosing `ws`, searched only within `bound`. */
function enclosing(ws, bound) {
  for (
    let d = path.dirname(ws);
    inside(d, bound) && !STOP.has(d) && d !== path.dirname(d);
    d = path.dirname(d)
  ) {
    const found = plansIn(path.join(d, ".claude", "plans"));
    if (found.length) return found;
  }
  return [];
}

const list = (ps) =>
  ps.slice(0, 5).join(", ") + (ps.length > 5 ? `, +${ps.length - 5} more` : "");

function judge(touches, cwd) {
  const blocks = [];
  const notes = [];
  let owner = null; // the Active plan the refused work belongs in
  let bound = null;
  const seen = new Set();
  for (const t of touches) {
    if (!isPlanFile(t.path) || seen.has(t.path)) continue;
    seen.add(t.path);
    const dir = path.dirname(t.path);
    if (dir === SHARED) {
      // A file there is this workspace's plan only when its pointer names it; any other is a draft.
      const ap = t.creating ? pc.activePlan(cwd) : {};
      if (ap.state === "set" && real(ap.path) !== t.path)
        notes.push(
          `${t.path} is a plan-mode draft. Merge it into this workspace's Active plan ` +
            `${ap.path} before executing; never execute from the draft.`,
        );
      continue;
    }
    bound = bound || real(pc.projectRoot(cwd));
    const up = enclosing(up2(dir), bound);
    const ap = t.creating ? pc.activePlan(up2(dir)) : {};
    const named = ap.state === "set" ? real(ap.path) : null;
    const existing = [
      ...new Set([...plansIn(dir), ...up, ...(named ? [named] : [])]),
    ].filter((p) => p !== t.path);
    const rest = existing.filter((p) => !t.removes.includes(p));
    if (!rest.length) continue;
    if (!t.creating || rest.length < existing.length) {
      notes.push(
        `${t.path} has sibling plans (${list(rest)}): consolidate them into the Active plan ` +
          `per one-plan-per-workspace.md.`,
      );
      continue;
    }
    owner = owner || (named ? ap : pc.activePlan(up2(path.dirname(rest[0]))));
    const here = rest.filter((p) => path.dirname(p) === dir);
    const above = rest.filter((p) => up.includes(p));
    const ptr = rest.filter((p) => !here.includes(p) && !above.includes(p));
    blocks.push(
      [
        `  new: ${t.path}`,
        here.length ? `  already in ${dir}: ${list(here)}` : "",
        above.length ? `  enclosing workspace plan: ${list(above)}` : "",
        ptr.length
          ? `  named by this workspace's Active plan pointer: ${list(ptr)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  if (!blocks.length) return { notes };
  const target =
    owner.state === "set"
      ? `Active plan: ${owner.path}`
      : `No Active plan named yet: add "Active plan: <path>" to ${owner.index}.`;
  const msg = [
    "[one-plan-gate] Refused: a second plan file in one workspace.",
    ...blocks,
    `  ${target}`,
    "Add this work to the Active plan as a new part/phase instead. Audits, remediation waves,",
    "backlogs, sub-feature plans and sequencing notes are sections of the one plan, not files",
    "beside it (one-plan-per-workspace.md). Several plans here already? Consolidate first.",
    "Moving the plan? mv it (a rename is allowed), or repoint `Active plan:` first.",
    "Modes: CLAUDE_ONE_PLAN_GATE=block (default) | warn | off",
  ].join("\n");
  return { msg, notes };
}

let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  if (MODE === "off") process.exit(0);
  let input;
  let verdict;
  try {
    input = JSON.parse(data || "{}");
    if (!input || typeof input !== "object" || Array.isArray(input))
      process.exit(0);
    const ti = input.tool_input || {};
    const cwd = path.resolve(String(input.cwd || process.cwd()));
    const raw =
      input.tool_name === "Bash"
        ? bashWrites(String(ti.command || ""), cwd, HOME)
        : ti.file_path
          ? [{ path: path.resolve(cwd, String(ti.file_path)), removes: [] }]
          : [];
    const touches = raw.map((t) => ({
      path: canon(t.path),
      creating: Boolean(t.unknown) || !fs.existsSync(t.path),
      removes: t.removes.map(canon),
    }));
    verdict = judge(touches, cwd);
  } catch {
    process.exit(0); // fail open: never stop a tool call because this hook broke
  }
  if (verdict.msg && MODE === "block") {
    process.stderr.write(verdict.msg + "\n");
    process.exit(2);
  }
  const text = [
    verdict.msg,
    ...verdict.notes.map((n) => `[one-plan-gate] ${n}`),
  ]
    .filter(Boolean)
    .join("\n");
  if (text) advise(input, text);
  process.exit(0);
});
