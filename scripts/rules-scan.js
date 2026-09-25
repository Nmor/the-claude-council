#!/usr/bin/env node
// Size budget: 11 KB. Check: wc -c; gate: token-budget.mjs --check.
/**
 * Repo-wide scanner for the edit-time hook rule sets.
 *
 * Named for what it does rather than for one of the manifests it runs: it drives
 * BOTH `no-discards` (what the code does) and `ux-writing` (what the product
 * says), and those are separate manifests with separate owners on purpose.
 *
 * The PostToolUse hook is an edit-time gate: it only ever sees a file when
 * something writes to it. That makes it excellent at stopping a violation from
 * being introduced and blind to every violation that already exists — a
 * distinction that only becomes visible when somebody greps the tree and finds
 * hundreds of matches the hook "allowed".
 *
 * This closes that half. It walks a tree and applies THE SAME rule module the
 * corresponding hook uses, so the two can never drift: a rule
 * added, relaxed or tightened for one is added, relaxed or tightened for both.
 * Duplicating the regexes here would have been faster and would have guaranteed
 * exactly the divergence the scan exists to expose.
 *
 * Usage:
 *   node rules-scan.js [paths...]        report every violation
 *   node rules-scan.js --rules ux-writing .   scan copy for AI-writing tells
 *   node rules-scan.js --rule <id> .     only that rule
 *   node rules-scan.js --soft .          include soft warnings
 *   node rules-scan.js --summary .       counts per rule, no line detail
 *   node rules-scan.js --baseline <f> .  fail only on violations absent
 *                                              from the baseline file
 *   node rules-scan.js --write-baseline <f> .   record current state
 *
 * Exit status is 1 when any blocking violation is reported, so it can be a
 * make/CI gate rather than something a person has to remember to run.
 */
"use strict";

const fs = require("fs");
const path = require("path");
// Which rule module to run. The scanner is the repo-wide half of BOTH edit-time
// hooks, and they are separate on purpose: `no-discards` guards what the code
// does, `ux-writing` guards what the product says. One walker, two manifests,
// so neither can drift from its hook.
const RULE_MODULES = {
  "no-discards": "./hooks/lib/no-discards-rules",
  "ux-writing": "./hooks/lib/ux-writing-rules",
};

// Directories that are never our source: dependencies, build output, VCS
// internals, and caches. Generated mocks are deliberately NOT skipped — they
// are post-processed precisely so the no-discard contract holds in them too,
// and skipping them would hide a regression in that processor.
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".terraform",
]);

// `.json` is here for ONE reason: locale catalogues. Every value in one is a
// string a user reads, which makes them the single densest surface of product
// copy in any of these repos — and they were not being walked at all, so the
// ux-writing rule's locale-catalogue branch had never once run. A rule branch
// that cannot be reached is worse than an absent one: it reads as coverage.
//
// Adding the extension is safe for the other rule sets because each rule decides
// for itself, in `applies`, which paths it governs; the no-discards rules are all
// gated on source extensions and simply do not match a .json path.
const SCANNABLE =
  /\.(go|ts|tsx|js|jsx|mjs|cjs|vue|py|css|scss|sass|less|md|mdx|tf|tfvars|ya?ml|json)$|(^|\/)Dockerfile[^/]*$/i;

function walk(root, out) {
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    // An unreadable directory is reported by its absence from the results
    // rather than by aborting the scan: a permission problem in one corner of
    // a tree must not turn a gate green by killing it.
    return;
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SCANNABLE.test(full)) continue;
    out.push(full);
  }
}

function collectFiles(targets) {
  const files = [];
  for (const target of targets) {
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      process.stderr.write(`[rules-scan] not found: ${target}\n`);
      continue;
    }
    if (stat.isDirectory()) walk(target, files);
    else files.push(target);
  }
  return files;
}

// A violation's identity for baseline comparison is the file, the rule and the
// SNIPPET — deliberately not the line number. Line numbers move whenever
// anything above them changes, so a line-keyed baseline reports the entire file
// as new after one insertion and is abandoned within a week.
//
// The path is relative to the working directory, so `scan src` and `scan ./src`
// and an absolute target all produce the same key from the same repo root. An
// absolute path would tie the baseline to one machine's checkout, and a raw
// target path would make the file's meaning depend on the argument someone
// happened to type — either way the ratchet reports every known violation as
// new and gets switched off.
const fingerprint = (file, issue) =>
  `${path.relative(process.cwd(), file) || file}\t${issue.rule}\t${issue.snippet}`;

function parseArgs(argv) {
  const opts = {
    targets: [],
    rule: null,
    soft: false,
    summary: false,
    baseline: null,
    writeBaseline: null,
    rules: "no-discards",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--rule") opts.rule = argv[++i];
    else if (arg === "--soft") opts.soft = true;
    else if (arg === "--summary") opts.summary = true;
    else if (arg === "--baseline") opts.baseline = argv[++i];
    else if (arg === "--write-baseline") opts.writeBaseline = argv[++i];
    else if (arg === "--rules") opts.rules = argv[++i];
    else opts.targets.push(arg);
  }
  if (opts.targets.length === 0) opts.targets.push(".");
  return opts;
}

function loadBaseline(file) {
  if (!file || !fs.existsSync(file)) return new Set();
  return new Set(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.length > 0 && !line.startsWith("#")),
  );
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const modulePath = RULE_MODULES[opts.rules];
  if (!modulePath) {
    process.stderr.write(
      `[rules-scan] unknown --rules "${opts.rules}"; expected one of ${Object.keys(RULE_MODULES).join(", ")}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const { evaluateFile } = require(modulePath);
  const baseline = loadBaseline(opts.baseline);

  const found = [];
  for (const file of collectFiles(opts.targets)) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const { blocking, soft } = evaluateFile(file, content);
    const issues = opts.soft ? blocking.concat(soft) : blocking;
    for (const issue of issues) {
      if (opts.rule && issue.rule !== opts.rule) continue;
      found.push({ file, ...issue, key: fingerprint(file, issue) });
    }
  }

  if (opts.writeBaseline) {
    const keys = [...new Set(found.map((f) => f.key))].sort();
    fs.writeFileSync(
      opts.writeBaseline,
      `# ${opts.rules} baseline: ${keys.length} known violations\n` +
        `# Recorded ${new Date().toISOString().slice(0, 10)}. Entries are file\\trule\\tsnippet.\n` +
        `# Shrink this file; never grow it.\n` +
        keys.join("\n") +
        "\n",
    );
    process.stdout.write(
      `[rules-scan] baseline written: ${keys.length} violations in ${opts.writeBaseline}\n`,
    );
    return;
  }

  const fresh = found.filter((f) => !baseline.has(f.key));

  const byRule = new Map();
  for (const issue of fresh) {
    byRule.set(issue.rule, (byRule.get(issue.rule) || 0) + 1);
  }

  if (!opts.summary) {
    for (const issue of fresh) {
      process.stdout.write(
        `${issue.file}:${issue.line} [${issue.rule}] ${issue.snippet}\n`,
      );
    }
  }

  const ruleLines = [...byRule.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => `  ${String(count).padStart(5)}  ${rule}`);

  if (fresh.length === 0) {
    process.stdout.write(
      `[rules-scan] clean — ${found.length - fresh.length} baselined, 0 new\n`,
    );
    return;
  }

  process.stdout.write(`\n[rules-scan] ${fresh.length} violation(s)`);
  process.stdout.write(baseline.size > 0 ? ` not in the baseline\n` : `\n`);
  process.stdout.write(ruleLines.join("\n") + "\n");
  process.exitCode = 1;
}

main();
