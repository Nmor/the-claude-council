#!/usr/bin/env node
// pre-write-governance-sweep.js
//
// PreToolUse hook on the Write tool. Mechanically enforces
// MANDATORY rule disciplines that previously lived only as loaded
// guidance. Two check families:
//
//   FAMILY 1 — Governance-filename collision
//     Closes the duplicate-CONTRIBUTING.md class of mistake.
//     Reuse-first rule 1 ("Check first, write second") for the
//     narrow but high-cost set of CANONICAL GOVERNANCE FILENAMES.
//     If a Write target's basename is in the governance set and
//     another file with the same basename already exists in the
//     repo (excluding duplicate-by-design dirs), the Write is
//     blocked. Bypass: CLAUDE_GOVERNANCE_SWEEP=off
//
//   FAMILY 2 — Resource hygiene
//     Closes the sweep-before-write gaps surfaced by the rule-vs-
//     trigger audit:
//       a) secrets-management.md  — block writing tracked-secret
//          files (.env, *.pem, *.key, *.p12, *.pfx, id_rsa*).
//       b) docker-localhost-binding.md — block compose files that
//          publish ports without the 127.0.0.1: loopback prefix.
//       c) no-local-fs.md         — block edits introducing
//          banned filesystem-write APIs in production source.
//       d) dependency-pinning.md  — block Dockerfile FROM without
//          @sha256:; block package.json with "*"/"latest" deps.
//       e) github-actions-gotchas.md #12 — block .github/workflows
//          files that pin actions/* by tag instead of full SHA.
//     Bypass: CLAUDE_RESOURCE_HYGIENE=off
//
// Behaviour:
//   - PASS THROUGH every non-Write tool call.
//   - Run every enabled family in sequence; emit ONE block with
//     all findings; exit 2 if any.
//   - Stay under the function-length cap (S138, 80 lines) by
//     decomposing each check into its own function.

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const LOG_PREFIX = "[pre-write-sweep] ";

// ──────────────────────────────────────────────────────────────
// FAMILY 1 — Governance-filename collision: constants
// ──────────────────────────────────────────────────────────────

const GOVERNANCE_BASENAMES = new Set([
  "readme.md",
  "contributing.md",
  "code_of_conduct.md",
  "security.md",
  "changelog.md",
  "license",
  "license.md",
  "license.txt",
  "governance.md",
  "support.md",
  "funding.yml",
  "pull_request_template.md",
  "codeowners",
  "dependabot.yml",
  "claude.md",
  "memory.md",
]);

const GOVERNANCE_BY_DESIGN_PREFIXES = [
  "rules/",
  "skills/",
  "templates/",
  "claude-home/",
  "ide-integrations/",
  "audits/archive/",
  "plans/archive/",
  ".github/ISSUE_TEMPLATE/",
];

const SKIP_TREE_PREFIXES = [
  "projects/",
  "sessions/",
  "session-env/",
  "file-history/",
  "telemetry/",
  "statsig/",
  "downloads/",
  ".git/",
  "node_modules/",
];

// ──────────────────────────────────────────────────────────────
// FAMILY 2 — Resource hygiene: constants
// ──────────────────────────────────────────────────────────────

const SECRET_BASENAME_RE = /^(\.env(\..+)?|[^.]+\.pem|[^.]+\.key|[^.]+\.p12|[^.]+\.pfx|id_rsa.*|id_ed25519.*|\.netrc|\.vault-token)$/i;
const SECRET_ALLOW_SUFFIXES = [".example", ".template", ".sample", ".pub"];
const SECRET_BY_DESIGN_PREFIXES = [
  "templates/",
  "audits/archive/",
  "tests/fixtures/",
  "spec/fixtures/",
  "fixtures/",
  ".github/ISSUE_TEMPLATE/",
];

const COMPOSE_RE = /(^|\/)(docker-)?compose([.-][^/]+)?\.ya?ml$/i;
const DOCKERFILE_RE = /(^|\/)Dockerfile([.-][^/]+)?$/i;
const ACTIONS_WORKFLOW_RE = /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/i;
const PACKAGE_JSON_RE = /(^|\/)package\.json$/;
const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs|go|py|rb|rs|java|kt|swift|dart|cs|php)$/i;
const SOURCE_EXCLUDE_DIR_RE = /(^|\/)(tests?|__tests__|spec|specs|cmd|scripts|tools|migrations|examples|docs|fixtures)(\/|$)/i;

const COMPOSE_UNBOUND_PORT_RE = /^\s*-\s*["']?(?:0\.0\.0\.0:)?(\d{2,5}):\d{2,5}(?:\/(?:tcp|udp))?["']?\s*(#.*)?$/m;
const COMPOSE_GOOD_BIND_RE = /(?:127\.0\.0\.1|\[::1\]|localhost):/;
const DOCKERFILE_FROM_RE = /^\s*FROM\s+(?!scratch\b)([^\s@]+(?::[^\s@]+)?)(\s+AS\s+\S+)?\s*$/gim;
const DOCKERFILE_FROM_DIGEST_OK_RE = /@sha256:[a-f0-9]{64}/i;
const ACTIONS_USES_RE = /uses:\s*([^\s@]+)@([^\s#]+)/g;
const ACTIONS_SHA_RE = /^[a-f0-9]{40}$/i;

const FS_BANNED = {
  ts: [
    /\bfs\.(writeFile|writeFileSync|createWriteStream|appendFile|appendFileSync|mkdir|mkdirSync|rename|renameSync|unlink|unlinkSync|rm|rmdir|rmdirSync|chmod|chown|copyFile|copyFileSync)\b/,
    /\bfs\.promises\.(writeFile|appendFile|mkdir|rename|unlink|rm|chmod|copyFile)\b/,
  ],
  go: [
    /\bos\.(Create|WriteFile|MkdirAll|Mkdir|Rename|Remove|RemoveAll|Chmod|Chown|Truncate)\b/,
    /\bioutil\.WriteFile\b/,
  ],
  py: [
    /\bopen\s*\([^)]+,\s*["'][wax][+b]?["']/,
    /\bos\.(makedirs|mkdir|remove|unlink|rename|chmod|chown)\b/,
    /\bshutil\.(copy|copy2|copyfile|move|copytree|rmtree|chown)\b/,
    /\bpathlib\.Path\([^)]+\)\.(write_text|write_bytes|mkdir|rename|unlink|chmod)\b/,
  ],
  rb: [
    /\bFile\.(write|open\s*\([^)]+,\s*["'][wax])\b/,
    /\bFileUtils\.(mkdir_p|cp|mv|rm)\b/,
  ],
  java: [/\bFiles\.(write|createDirectories|createFile|move|delete|deleteIfExists)\b/],
  rs: [/\bfs::(write|create_dir_all|create_dir|rename|remove_file|remove_dir|remove_dir_all)\b/],
  cs: [
    /\bFile\.(WriteAllText|WriteAllBytes|WriteAllLines|AppendAllText|Create|Delete|Move|Copy)\b/,
    /\bDirectory\.(CreateDirectory|Delete|Move)\b/,
  ],
};

// ──────────────────────────────────────────────────────────────
// Entry
// ──────────────────────────────────────────────────────────────

const stdin = process.stdin;
let buf = "";
stdin.setEncoding("utf8");
stdin.on("data", (c) => {
  buf += c;
});
stdin.on("end", () => {
  const parsed = parsePayload(buf);
  if (!parsed || parsed.toolName !== "Write" || !parsed.filePath) {
    process.stdout.write(buf);
    return;
  }

  const findings = [];
  if (process.env.CLAUDE_GOVERNANCE_SWEEP !== "off") {
    runGovernanceSweep(parsed.filePath, findings);
  }
  if (process.env.CLAUDE_RESOURCE_HYGIENE !== "off") {
    runResourceHygiene(parsed.filePath, parsed.content || "", findings);
  }

  if (findings.length === 0) {
    process.stdout.write(buf);
    return;
  }
  emitBlock(parsed.filePath, findings);
  process.exit(2);
});

stdin.on("error", (err) => {
  process.stderr.write(`${LOG_PREFIX}stdin error: ${err.message}\n`);
  process.exit(0);
});

function parsePayload(raw) {
  try {
    const p = JSON.parse(raw);
    return {
      toolName: p.tool_name ?? "",
      filePath: p.tool_input?.file_path ?? "",
      content: p.tool_input?.content ?? "",
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// FAMILY 1 — Governance-filename collision
// ──────────────────────────────────────────────────────────────

function runGovernanceSweep(filePath, findings) {
  const basename = path.basename(filePath).toLowerCase();
  if (!GOVERNANCE_BASENAMES.has(basename)) return;
  const repoRoot = findRepoRoot(filePath);
  if (!repoRoot) return;
  const matches = runFind(repoRoot, path.basename(filePath));
  if (matches === null) return;
  const collisions = filterCollisions(matches, filePath, repoRoot);
  if (collisions.length === 0) return;
  findings.push({
    family: "governance-collision",
    rule: "reuse-first.md (rule 1) + per-canonical governance rules",
    reason: `governance-filename collision: another file with basename '${path.basename(filePath)}' already exists in this repo`,
    fix: "EDIT the existing canonical file with the new content, OR consolidate first (relocate, merge, document). Bypass intentional duplicates with CLAUDE_GOVERNANCE_SWEEP=off + inline justification.",
    extra: collisions.map((c) => `  collides with: ${c}`),
  });
}

function findRepoRoot(startPath) {
  let cur = path.dirname(path.resolve(startPath));
  while (true) {
    if (fs.existsSync(path.join(cur, ".git"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur || parent === "/") return null;
    cur = parent;
  }
}

function runFind(repoRoot, basename) {
  const findArgs = [repoRoot, "-iname", basename];
  for (const prefix of SKIP_TREE_PREFIXES) {
    findArgs.push("-not", "-path", `${repoRoot}/${prefix}*`);
  }
  try {
    const out = execFileSync("find", findArgs, { encoding: "utf8", timeout: 5000 });
    return out.split("\n").filter(Boolean);
  } catch (err) {
    process.stderr.write(`${LOG_PREFIX}governance-sweep find failed (${err.message}); allowing\n`);
    return null;
  }
}

function filterCollisions(matches, filePath, repoRoot) {
  const targetAbs = path.resolve(filePath);
  return matches
    .map((m) => path.resolve(m))
    .filter((m) => m !== targetAbs)
    .filter((m) => {
      const rel = path.relative(repoRoot, m);
      return !GOVERNANCE_BY_DESIGN_PREFIXES.some((p) => rel.startsWith(p));
    });
}

// ──────────────────────────────────────────────────────────────
// FAMILY 2 — Resource hygiene
// ──────────────────────────────────────────────────────────────

function runResourceHygiene(filePath, content, findings) {
  const rel = filePath.replace(/^\/+/, "");
  const basename = path.basename(filePath);
  checkSecretFile(basename, rel, findings);
  checkComposeBinding(rel, content, findings);
  checkDockerfilePin(basename, content, findings);
  checkActionsPin(rel, content, findings);
  checkPackageJsonPin(rel, content, findings);
  checkBannedFsApi(rel, content, findings);
}

function checkSecretFile(basename, rel, findings) {
  if (!SECRET_BASENAME_RE.test(basename)) return;
  if (SECRET_ALLOW_SUFFIXES.some((s) => basename.toLowerCase().endsWith(s))) return;
  if (SECRET_BY_DESIGN_PREFIXES.some((p) => rel.startsWith(p))) return;
  findings.push({
    family: "resource-hygiene",
    rule: "secrets-management.md",
    reason: "secret-class basename written outside the by-design allowlist",
    fix: "Vault the secret. Use .env.example with placeholders for docs. Bypass: CLAUDE_RESOURCE_HYGIENE=off.",
  });
}

function checkComposeBinding(rel, content, findings) {
  if (!COMPOSE_RE.test(rel)) return;
  if (!hasUnboundComposePort(content)) return;
  findings.push({
    family: "resource-hygiene",
    rule: "docker-localhost-binding.md",
    reason: "compose file publishes a host port without the 127.0.0.1: loopback prefix",
    fix: 'Use "127.0.0.1:HOSTPORT:CONTAINERPORT". For prod-aware compose, "${PUBLIC_BIND:-127.0.0.1}:..." pattern.',
  });
}

function hasUnboundComposePort(content) {
  const lines = content.split(/\r?\n/);
  let inPorts = false;
  let portsIndent = -1;
  for (const line of lines) {
    const m = line.match(/^(\s*)ports:\s*(#.*)?$/);
    if (m) {
      inPorts = true;
      portsIndent = m[1].length;
      continue;
    }
    if (!inPorts) continue;
    const indent = (line.match(/^(\s*)/) || ["", ""])[1].length;
    if (line.trim() !== "" && indent <= portsIndent && !line.trim().startsWith("-")) {
      inPorts = false;
      continue;
    }
    if (COMPOSE_UNBOUND_PORT_RE.test(line) && !COMPOSE_GOOD_BIND_RE.test(line)) {
      return true;
    }
  }
  return false;
}

function checkDockerfilePin(basename, content, findings) {
  if (!DOCKERFILE_RE.test(basename)) return;
  let m;
  DOCKERFILE_FROM_RE.lastIndex = 0;
  while ((m = DOCKERFILE_FROM_RE.exec(content)) !== null) {
    const ref = m[1];
    if (ref === "scratch") continue;
    if (DOCKERFILE_FROM_DIGEST_OK_RE.test(ref)) continue;
    findings.push({
      family: "resource-hygiene",
      rule: "dependency-pinning.md (rule 3)",
      reason: `Dockerfile FROM lacks @sha256:... digest: '${ref}'`,
      fix: "Pin to '<image>:<tag>@sha256:<digest>'. Use 'docker pull <image>:<tag>' then 'docker inspect' to retrieve the digest.",
    });
    return;
  }
}

function checkActionsPin(rel, content, findings) {
  if (!ACTIONS_WORKFLOW_RE.test(rel)) return;
  let m;
  ACTIONS_USES_RE.lastIndex = 0;
  while ((m = ACTIONS_USES_RE.exec(content)) !== null) {
    const repo = m[1];
    const ref = m[2];
    if (repo.startsWith("./") || repo.startsWith("../") || repo.startsWith("docker://")) continue;
    if (ACTIONS_SHA_RE.test(ref)) continue;
    findings.push({
      family: "resource-hygiene",
      rule: "github-actions-gotchas.md (Gotcha 12) + dependency-pinning.md",
      reason: `Actions reference '${repo}@${ref}' pinned to tag/branch instead of full commit SHA`,
      fix: "Replace the tag with the 40-char commit SHA, e.g. 'uses: actions/checkout@34e114876b0b... # v4.3.1'.",
    });
    return;
  }
}

function checkPackageJsonPin(rel, content, findings) {
  if (!PACKAGE_JSON_RE.test(rel)) return;
  let pkg;
  try {
    pkg = JSON.parse(content);
  } catch {
    return;
  }
  const depKeys = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
    "bundledDependencies",
    "bundleDependencies",
  ];
  for (const key of depKeys) {
    const deps = pkg[key];
    if (!deps || typeof deps !== "object") continue;
    for (const ver of Object.values(deps)) {
      if (typeof ver !== "string") continue;
      const t = ver.trim().toLowerCase();
      if (t === "*" || t === "latest" || t === "x" || t === ">=0.0.0") {
        findings.push({
          family: "resource-hygiene",
          rule: "dependency-pinning.md (rule 2)",
          reason: `package.json contains '*' or 'latest' in ${key}`,
          fix: "Pin to a caret range (^X.Y.Z) for apps or exact (X.Y.Z) for devDependencies.",
        });
        return;
      }
    }
  }
}

function checkBannedFsApi(rel, content, findings) {
  if (!SOURCE_EXT_RE.test(rel)) return;
  if (SOURCE_EXCLUDE_DIR_RE.test(rel)) return;
  const langKey = sourceLangKey(rel);
  if (!langKey) return;
  const patterns = FS_BANNED[langKey];
  if (!patterns) return;
  for (const re of patterns) {
    if (!re.test(content)) continue;
    findings.push({
      family: "resource-hygiene",
      rule: "no-local-fs.md",
      reason: "production source introduces a banned filesystem-write API",
      fix: "Stream to object storage (S3/GCS/Azure Blob), write to response, or use a request-scoped temp via os.TempDir() with defer cleanup.",
    });
    return;
  }
}

function sourceLangKey(rel) {
  const m = rel.toLowerCase().match(/\.([a-z]+)$/);
  if (!m) return null;
  const e = m[1];
  if (["ts", "tsx", "js", "jsx", "mts", "cts", "mjs", "cjs"].includes(e)) return "ts";
  if (e === "go") return "go";
  if (e === "py") return "py";
  if (e === "rb") return "rb";
  if (e === "java" || e === "kt") return "java";
  if (e === "rs") return "rs";
  if (e === "cs") return "cs";
  return null;
}

// ──────────────────────────────────────────────────────────────
// Block emission
// ──────────────────────────────────────────────────────────────

function emitBlock(filePath, findings) {
  process.stderr.write(
    `${LOG_PREFIX}BLOCKED: ${findings.length} finding(s) on ${filePath}\n`,
  );
  for (const f of findings) {
    process.stderr.write(
      `${LOG_PREFIX}  [${f.family}] rule:   ${f.rule}\n` +
        `${LOG_PREFIX}    reason: ${f.reason}\n` +
        `${LOG_PREFIX}    fix:    ${f.fix}\n`,
    );
    if (f.extra) {
      for (const line of f.extra) {
        process.stderr.write(`${LOG_PREFIX}  ${line}\n`);
      }
    }
  }
  process.stderr.write(
    `${LOG_PREFIX}\n` +
      `${LOG_PREFIX}Bypass scope: CLAUDE_GOVERNANCE_SWEEP=off (governance-collision only)\n` +
      `${LOG_PREFIX}              CLAUDE_RESOURCE_HYGIENE=off (resource-hygiene only)\n`,
  );
}
