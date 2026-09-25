#!/usr/bin/env node
// Size budget: 9 KB. Check: wc -c; gate: token-budget.mjs --check.
// PreToolUse hook (matcher: Bash).
//
// Blocks commands that destroy data irreversibly. This install had NO such gate: nothing
// stood between an agent and `rm -rf /`, `DROP DATABASE`, a force-push over main, or
// `chmod 777` on a key. The Council's own rules treat destructive operations as a Division 11
// VETO and require explicit confirmation — that was prose enforced by nothing.
//
// WHY THIS ONE CAN BLOCK HARD. Most gates here are advisory, because a heuristic that fires
// on legitimate work gets switched off. This set is different: the patterns are rare and
// unambiguous in ordinary development. Nobody types `rm -rf /` by accident, and the cost
// asymmetry is total — a false positive costs one rephrase, a false negative costs the disk.
//
// WHAT IT DOES NOT DO. It does not try to be a sandbox or a general safety layer; Claude Code
// has its own permission system and auto-mode classifier. It is the deterministic floor under
// those: it cannot be talked round, and it travels with the install.
//
// Writing ABOUT a destructive command is not running one. A heredoc redirected to a file is
// documentation; one piped to a shell or a database client is execution. See lib/command-scan.
//
// CLAUDE_DESTRUCTIVE_GATE=warn to downgrade, =off to disable. Neither is recommended.
"use strict";

const { executablePart } = require("./lib/command-scan.js");

// Each rule: what it catches, and the plain-language reason shown when it fires.
const RULES = [
  {
    // Quotes are NOT in the boundary set, and that is a deliberate reversal.
    //
    // They were added briefly so that `echo "rm -rf /" | bash` would be caught. Within the
    // hour the gate blocked an ordinary `for c in 'rm -rf ~' ...` loop — a shell construct
    // listing commands as DATA. Chasing an obfuscation case cost a false positive on everyday
    // shell, and a gate that fires on real work gets switched off, which protects nothing.
    //
    // So the limit is stated rather than chased: this is a floor against accidents and
    // obvious mistakes, not an adversarial sandbox. Deliberate obfuscation — quoting, base64,
    // variable indirection, a downloaded script — gets past it by design, because every
    // pattern broad enough to catch those is broad enough to block legitimate work.
    //
    // The target alternation covers `~` and `~/` separately: `~/` alone slipped through when
    // only `~` and `~/*` were listed, which is a real target rather than an obfuscation.
    re: /(?:^|[\s;&|`(])rm\s+(?:-[a-zA-Z]*\s+)*-?[a-zA-Z]*[rR][a-zA-Z]*f?[a-zA-Z]*\s+(?:-{1,2}\S+\s+)*(?:\/|\/\*|~|~\/|~\/\*|\$HOME\/?|\$\{HOME\}\/?)(?:\s|$)/,
    why: "recursive delete of the filesystem root or home directory",
  },
  {
    re: /(?:^|[\s;&|`(])rm\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*f/i,
    why: "recursive force-delete",
    soft: true,
  },
  {
    re: /\bDROP\s+(?:DATABASE|SCHEMA)\b/i,
    why: "dropping a database or schema",
  },
  { re: /\bTRUNCATE\s+TABLE\b/i, why: "truncating a table" },
  {
    re: /\bDELETE\s+FROM\s+\w+\s*(?:;|$)/i,
    why: "DELETE with no WHERE clause — every row",
  },
  {
    re: /\bUPDATE\s+\w+\s+SET\b(?![\s\S]*\bWHERE\b)/i,
    why: "UPDATE with no WHERE clause — every row",
  },
  {
    re: /(?:^|[\s;&|`(])chmod\s+(?:-R\s+)?777\b/,
    why: "chmod 777 — world-writable",
  },
  {
    re: /(?:^|[\s;&|`(])(?:mkfs|fdisk|parted)\b/,
    why: "formatting or repartitioning a disk",
  },
  {
    re: /(?:^|[\s;&|`(])dd\s+[^\n]*of=\/dev\//,
    why: "dd writing directly to a device",
  },
  { re: /:\(\)\s*\{\s*:\s*\|\s*:&\s*\}\s*;\s*:/, why: "fork bomb" },
  {
    re: /git\s+push\s+(?:[^\n]*\s)?(?:--force|-f)(?:\s|$)(?![^\n]*--force-with-lease)/,
    why: "force-push — it overwrites history others may have pulled",
  },
  {
    re: /git\s+reset\s+--hard\s+(?:origin\/)?(?:main|master|develop)\b/,
    why: "hard reset onto a shared branch — local work is discarded",
  },
  { re: /(?:^|[\s;&|`(])shred\b/, why: "shred — unrecoverable overwrite" },
  {
    re: /\baws\s+s3\s+rb\b[^\n]*--force/,
    why: "deleting a populated S3 bucket",
  },
  {
    re: /\bkubectl\s+delete\s+(?:ns|namespace)\b/,
    why: "deleting a Kubernetes namespace",
  },
  { re: /\bDROP\s+TABLE\b/i, why: "dropping a table" },
];

// A soft rule needs a dangerous-looking target to fire; `rm -rf ./build` is ordinary work.
const SOFT_TARGET =
  // Each alternative must be the WHOLE target, not a prefix of one. `$HOME\b` was wrong:
  // \b matches before the slash, so `rm -rf $HOME/.cache/tmp-build` — ordinary cleanup —
  // tripped the soft rule. A home variable counts only when nothing follows it but the end
  // of the argument.
  /(?:^|\s)(?:\/(?:\s|$)|\/(?:etc|usr|var|bin|sbin|lib|boot|sys|proc|dev|opt|home|Users)(?:\s|$)|~(?:\/)?(?:\s|$)|\$\{?HOME\}?(?:\/)?(?:\s|$)|\*(?:\s|$))/;

// Searching FOR a destructive command is not running one.
//
// Caught by this hook's own test on first run: `grep -rn "DROP DATABASE" ./migrations` was
// blocked, because the SQL pattern matched text the command merely carries. That is the third
// time this session a detector confused carrying with doing — so the check is explicit here
// rather than left to the pattern.
//
// The exemption is withdrawn the moment the output could be executed: `grep ... | bash` is not
// a search, it is a pipeline, so an interpreter anywhere downstream disqualifies it.
const READ_ONLY_HEAD =
  /^\s*(?:grep|rg|ag|ack|cat|bat|less|more|head|tail|find|ls|echo|printf|wc|sort|uniq|diff|jq|awk|sed)\b/;
const DOWNSTREAM_EXEC =
  /\|\s*(?:bash|sh|zsh|python3?|perl|ruby|node|psql|mysql|sqlite3|xargs|sudo)\b/;

function isReadOnlySearch(cmd) {
  return READ_ONLY_HEAD.test(cmd) && !DOWNSTREAM_EXEC.test(cmd);
}

let data = "";
process.stdin.on("data", (c) => {
  data += c;
});
process.stdin.on("end", () => {
  const mode = (process.env.CLAUDE_DESTRUCTIVE_GATE || "block").toLowerCase();
  if (mode === "off") process.exit(0);

  let input;
  try {
    input = JSON.parse(data || "{}");
  } catch {
    process.exit(0); // never fail a tool call because the hook could not read its own input
  }

  const raw = String(input.tool_input?.command || "");
  if (!raw) process.exit(0);
  const cmd = executablePart(raw);
  if (isReadOnlySearch(cmd)) process.exit(0);

  const hits = [];
  for (const rule of RULES) {
    if (!rule.re.test(cmd)) continue;
    if (rule.soft && !SOFT_TARGET.test(cmd)) continue;
    hits.push(rule.why);
  }
  if (!hits.length) process.exit(0);

  const msg = [
    "DESTRUCTIVE COMMAND BLOCKED.",
    "",
    ...hits.map((w) => `  • ${w}`),
    "",
    `Command: ${raw.split("\n")[0].slice(0, 160)}`,
    "",
    "This is irreversible, so it is the operator's decision, not the agent's. Per the",
    "Council's destructive-operation rule, confirm with the person whose data it is, then",
    "run it yourself — or narrow the command so it cannot take more than you intend",
    "(a specific path, a WHERE clause, --force-with-lease instead of --force).",
    "",
    "CLAUDE_DESTRUCTIVE_GATE=warn downgrades this; =off disables it. Neither is recommended.",
  ].join("\n");

  process.stderr.write(msg + "\n");
  if (mode === "warn") process.exit(0);
  process.exit(2);
});
