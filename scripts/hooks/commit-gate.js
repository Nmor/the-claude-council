#!/usr/bin/env node
// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
// commit-gate.js
//
// PreToolUse Bash hook. BLOCKS `git commit` (exit 2) when the rules that make a
// commit trustworthy have not actually been met this session. Sister to
// pre-push-gate.js, which guards the remote; this one guards the history.
//
// Enforces, per owner directive "block any push or commit if rule is not checked
// or obeyed or met":
//
//   (a) verify-before-claim.md + done-criteria.md — a verification gate must have
//       RUN, and must have run AFTER the most recent source edit. A gate that ran
//       before the edit proves nothing about what is being committed.
//   (b) functional-test-coverage.md rule 1 — source changed in this session and
//       coverage was never measured once. Coverage is a measurement, never an
//       estimate, and a commit is a claim.
//   (c) plan-execution-progress.md rule 8 — the plan was brought up to date AFTER the
//       code being committed last changed. A task is not complete until the plan says so.
//   (d) docs-sync-with-code.md — a commit carrying code carries docs too, or states in a
//       `Docs:` line why none are needed. Silence is how docs go stale one commit at a time.
//
// (c), (d), and the "source changed" test behind (a) and (b), read what git says is being
// committed. The session edit-stamp alone only ever saw Edit/Write, so a change made through
// Bash was committed with no verification at all. Owner directive (2026-09-21): "plan update
// as tasks are completed and doc updates before code changes are committed or pushed".
//
// Passes through untouched: every non-commit Bash call, and commits that touched
// no source (docs, plans, memory, config-only).
//
// Bypass, deliberately explicit and per-process so it cannot leak across shells:
//   CLAUDE_COMMIT_GATE=off git commit -m "..."
// Use it when a gate is genuinely unavailable, and say so in the commit body.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const gs = require("./lib/git-state.js");
const pc = require("./lib/project-context.js");

const { executablePart } = require("./lib/command-scan.js");

const PREFIX = "[commit-gate] ";
const isGitCommit = (cmd) =>
  /(^|[\s;&|`(]+)git(?:\s+-C\s+\S+)?\s+commit(\s|$)/.test(cmd);

// The bypass is written ON the commit. process.env is this hook's environment, not the
// command's, so reading it alone meant the override the refusal message recommends could
// never work (2026-09-21). Only an assignment prefixing the commit itself counts: not an
// echo, not a quoted message, not a heredoc body.
const INLINE_OFF =
  /(?:^|[\n;&|`(]\s*)(?:\w+=\S*\s+)*CLAUDE_COMMIT_GATE=off\s+(?:\w+=\S*\s+)*git\s+(?:-C\s+\S+\s+)?commit\b/;
// A heredoc body fed to git is the commit MESSAGE, and executablePart keeps it (git is not
// in its list of file writers), so it is dropped here before the prefix is looked for.
const HEREDOC_BODY =
  /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g;
const inlineOverride = (cmd) =>
  INLINE_OFF.test(
    executablePart(cmd)
      .replace(HEREDOC_BODY, "<<HEREDOC")
      .replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '""'),
  );

// `--amend --no-edit` on an already-verified commit, and `-m` on a revert, do not
// re-introduce unverified work; the edit/gate timestamps below still govern them.
const readStamp = (p) => {
  // Parse only the FIRST line: the marker's second line carries the prompt_id of the turn
  // the gate ran in (verify-before-claim.md r3 turn-scoping). Reading the whole file as a
  // number yields NaN once that line exists, which reads as "no gate ran" and blocks every
  // commit. Measured 2026-09-21 when the second line was introduced.
  try {
    const first = String(fs.readFileSync(p, "utf8")).split("\n")[0].trim();
    const n = Number(first);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

// The commit message, wherever the command put it: inline (-m, heredoc) or in a file (-F).
function messageOf(cmd, dir) {
  const f = /\s(?:-F|--file)[=\s]+("[^"]+"|'[^']+'|\S+)/.exec(cmd);
  if (!f) return cmd;
  try {
    return (
      cmd +
      "\n" +
      fs.readFileSync(
        path.resolve(dir, f[1].replace(/^["']|["']$/g, "")),
        "utf8",
      )
    );
  } catch {
    return cmd;
  }
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (buf += c));
process.stdin.on("end", () => {
  let cmd = "";
  let sid = "";
  let pid = "";
  let cwd = process.cwd();
  try {
    const payload = JSON.parse(buf);
    cmd = (payload.tool_input && payload.tool_input.command) || "";
    sid = payload.session_id || "";
    pid = payload.prompt_id || "";
    cwd = payload.cwd || cwd;
  } catch {
    // Not ours to parse; the harness owns the protocol.
    return;
  }

  if (
    !isGitCommit(cmd) ||
    !sid ||
    process.env.CLAUDE_COMMIT_GATE === "off" ||
    inlineOverride(cmd)
  ) {
    process.exit(0);
  }

  // What this commit records, according to git.
  const dir = gs.targetDir(cmd, cwd);
  const root = gs.repoRoot(dir);
  // `-a` / `-am` commit every tracked change, not just the index. Quoted text is removed
  // first so a message that merely mentions "-a" is not read as the flag.
  const flags = cmd.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, "");
  const all = /\scommit\b[^|;&]*\s(--all|-[a-zA-Z]*a[a-zA-Z]*)(\s|$)/.test(
    flags,
  );
  const files = root ? gs.commitFiles(root, all) : [];
  const code = files.filter((f) => gs.classify(f) === "code");
  const tests = files.filter((f) => gs.classify(f) === "test");
  const docs = files.filter((f) => gs.classify(f) === "docs");
  const sourceMtime = root ? gs.newestMtime(root, [...code, ...tests]) : 0;

  const tmp = os.tmpdir();
  const lastEdit = Math.max(
    readStamp(path.join(tmp, `claude-council-lastedit-${sid}`)),
    sourceMtime,
  );
  const gatePath = path.join(tmp, `claude-council-gate-${sid}`);
  const lastGate = readStamp(gatePath);
  // A gate from an EARLIER TURN proves nothing about this one (verify-before-claim.md r3).
  // The marker's second line is the prompt_id of the turn it ran in; a mismatch is stale.
  let gateTurn = "";
  try {
    gateTurn = (fs.readFileSync(gatePath, "utf8").split("\n")[1] || "").trim();
  } catch {
    gateTurn = "";
  }
  const gateIsThisTurn = Boolean(pid) && gateTurn === pid;
  const coverage = fs.existsSync(
    path.join(tmp, `claude-council-coverage-${sid}`),
  );

  // No source touched this session and none being committed: nothing to assert.
  if (!lastEdit) process.exit(0);

  const reasons = [];
  if (!lastGate) {
    reasons.push(
      "no verification gate has run this session (build / test / lint / vet / type-check). " +
        "Per verify-before-claim.md a commit is a claim, and a claim needs same-session proof.",
    );
  } else if (pid && !gateIsThisTurn) {
    reasons.push(
      "the last verification gate ran in an EARLIER TURN. Per verify-before-claim.md " +
        "rule 3 verification is scoped to THIS turn, not the session — files have changed " +
        "since. Re-run the gate.",
    );
  } else if (lastGate < lastEdit) {
    const mins = Math.round((lastEdit - lastGate) / 60000);
    reasons.push(
      `source changed AFTER the last verification gate ran (${mins} min later). ` +
        "The earlier run proves nothing about what is staged — re-run the gate.",
    );
  }
  if (!coverage) {
    reasons.push(
      "coverage was never measured this session, though source changed. Per " +
        "functional-test-coverage.md rule 1 coverage is a measurement and never an " +
        "estimate; run the project coverage command before committing.",
    );
  }

  if (code.length || tests.length) {
    const plan = pc.activePlan(root);
    if (plan.state === "set" && plan.mtime < sourceMtime) {
      reasons.push(
        `the plan was last updated BEFORE the code in this commit changed (${path.basename(plan.path)}). ` +
          "Per plan-execution-progress.md rule 8 a task is complete when the plan says so: tick " +
          "the task and add its one-line outcome (commit, gate result), then commit.",
      );
    }
  }
  if (
    code.length &&
    !docs.length &&
    !gs.DOCS_DECLARATION.test(messageOf(cmd, root || dir))
  ) {
    reasons.push(
      `this commit changes ${code.length} source file(s) and no documentation. Per ` +
        "docs-sync-with-code.md, stage the docs this change affects (README, feature page, " +
        "runbook, CHANGELOG, API docs) — or, if it genuinely changes nothing a reader relies " +
        'on, say so in the message with a line such as "Docs: none — internal refactor, no ' +
        'behaviour change". The line is the recorded decision; its absence is the omission.',
    );
  }

  if (!reasons.length) process.exit(0);

  process.stderr.write(
    `${PREFIX}BLOCKED: ${reasons.length} rule(s) not met.\n` +
      reasons.map((r, i) => `${PREFIX}  ${i + 1}. ${r}\n`).join("") +
      `${PREFIX}Fix each, then commit. To override for a genuinely unavailable ` +
      `gate: CLAUDE_COMMIT_GATE=off git commit ... (and say why in the commit body).\n`,
  );
  process.exit(2); // block
});
