#!/usr/bin/env node
// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
"use strict";

// Model-ladder enforcement, on BOTH ends of the ladder.
//
// THE DEFECT THIS FILE USED TO BE. It was registered on PreModelSwitch only and could only
// BLOCK Fable, so an install that listed `fable` as available never fielded it. A gate that
// only ever says no is the inert-config trap of `wiring-and-usage-review.md` in its sharpest
// form, and the user noticed before any gate did.
//
// WHAT IT DOES NOW.
//   PreModelSwitch     — blocks a switch to Fable during security/regulated work (unchanged).
//   PreToolUse(Agent)  — resolves the spawn's role to its ladder and says which model that
//                        ladder actually picks on THIS install, minus any tier that has hit
//                        its plan limit (lib/model-exhaustion.js). A spawn that asks for an
//                        exhausted tier is denied with the rung to use instead.
//
// WHY THE SPAWN SIDE ADVISES RATHER THAN SUBSTITUTES. A PreToolUse hook cannot rewrite
// tool_input — the API offers allow, deny, or additionalContext and nothing else
// (code.claude.com/docs/en/hooks, read 2026-09-21). "Silently swap in the right model" is not
// available to any hook. The honest options are refuse-and-explain or tell-the-caller, and
// refusing every under-provisioned spawn would block routine work over a heuristic, which is
// how a hook gets switched off. The exception is the security ladder: Fable's classifiers
// refuse cyber work, so that spawn buys a refusal rather than capability, and it is denied
// outright at both events.
//
// CLAUDE_MODEL_LADDER=off disables. =strict also denies an under-provisioned strategic spawn.

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { homedir } = require("node:os");
const exhaustion = require("./lib/model-exhaustion");

const SECURITY =
  /\b(security|vulnerab|exploit|cve|owasp|auth|credential|secret|pci|hipaa|gdpr|compliance|sanction|aml|kyc)\b/i;

// Ladders, from model-tier-selection.md. Best first, floor last.
// `fable` appears in exactly one ladder by design — reserving it for the work where
// first-shot correctness offsets the premium is what stops it inflating routine cost.
const LADDERS = {
  "strategic-deep-reasoning": ["fable", "opus", "sonnet"],
  "security-and-regulated-review": ["opus", "sonnet"], // fable EXCLUDED — classifiers refuse
  "deep-review-general": ["opus", "sonnet"],
  "standard-review": ["opus", "sonnet"],
  "mechanical-build-fix": ["sonnet", "haiku"],
  "search-explore": ["haiku", "sonnet"],
  "doc-codemap": ["haiku", "sonnet"],
};

// Role resolution is by subagent_type first, because that is a declared fact about the spawn.
// The prompt is consulted only to promote architect/planner onto the strategic ladder, since
// those two serve both routine and strategic work and only the task tells them apart.
const BY_AGENT = {
  architect: "strategic-deep-reasoning",
  planner: "strategic-deep-reasoning",

  "security-reviewer": "security-and-regulated-review",
  "compliance-reviewer": "security-and-regulated-review",
  "payments-reviewer": "security-and-regulated-review",
  "health-reviewer": "security-and-regulated-review",
  "education-reviewer": "security-and-regulated-review",
  "risk-reviewer": "security-and-regulated-review",

  "code-reviewer": "deep-review-general",
  "database-reviewer": "deep-review-general",
  "ai-ethics-reviewer": "deep-review-general",

  "go-reviewer": "standard-review",
  "python-reviewer": "standard-review",
  "java-reviewer": "standard-review",
  "mobile-reviewer": "standard-review",
  "ux-reviewer": "standard-review",
  "accessibility-reviewer": "standard-review",

  "build-error-resolver": "mechanical-build-fix",
  "go-build-resolver": "mechanical-build-fix",
  "python-build-resolver": "mechanical-build-fix",
  "rust-build-resolver": "mechanical-build-fix",
  "java-build-resolver": "mechanical-build-fix",
  "dotnet-build-resolver": "mechanical-build-fix",
  "ruby-build-resolver": "mechanical-build-fix",
  "php-build-resolver": "mechanical-build-fix",
  "swift-build-resolver": "mechanical-build-fix",
  "refactor-cleaner": "mechanical-build-fix",

  Explore: "search-explore",
  "general-purpose": "search-explore",

  "doc-updater": "doc-codemap",
};

// Work that earns the top rung: novel architecture, long-horizon migration, the hardest
// non-security debugging. Deliberately narrow — a loose pattern here would field the most
// expensive model on routine planning, the mirror image of the failure being fixed.
const STRATEGIC =
  /\b(architect\w*|novel|greenfield|from scratch|long.horizon|migration strategy|trade.?offs?|adr\b|rfc\b|hardest|root cause|blast radius|first.shot)\b/i;

// CLAUDE_MODEL_AVAILABILITY overrides the file, comma-separated. This is an operator
// capability, not a test seam: it is how you try a downgrade without editing the install,
// how CI pins a known set, and how a shared machine runs a different plan's ladder. It
// happens to make this hook deterministically testable, which is a consequence of the
// capability rather than its purpose.
function available() {
  const env = String(process.env.CLAUDE_MODEL_AVAILABILITY || "").trim();
  if (env) {
    const models = env
      .split(",")
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);
    if (models.length) return models;
  }
  try {
    const raw = readFileSync(
      join(homedir(), ".claude", ".local", "model-availability"),
      "utf8",
    );
    const models = raw
      .split("\n")
      .map((l) => l.replace(/#.*$/, "").trim().toLowerCase())
      .filter(Boolean);
    if (models.length) return models;
  } catch {
    /* absent is a valid install state, not a fault — fall through to the documented default */
  }
  return ["opus", "sonnet", "haiku"]; // model-tier-selection.md: Fable is opt-in
}

function roleFor(input) {
  const base = BY_AGENT[String(input.subagent_type || "").trim()];
  if (!base) return null;
  if (base === "strategic-deep-reasoning") {
    const text = `${input.description || ""} ${input.prompt || ""}`;
    return STRATEGIC.test(text) ? base : "deep-review-general";
  }
  return base;
}

const resolve = (ladder, have) => ladder.find((m) => have.includes(m)) || null;

// Capability order, weakest first. Used only to fall UP past an exhausted rung.
const CAPABILITY = ["haiku", "sonnet", "opus", "fable"];

// The ladder's pick once tiers that hit a plan limit are taken out. Per
// model-tier-selection.md an unavailable rung falls UP to the nearest more capable model, so
// an outage costs money rather than quality; only when nothing above is left does it walk
// down the ladder. Fable never enters the security ladder this way either.
function pick(role, have, gone) {
  const ladder = LADDERS[role];
  const planned = resolve(ladder, have);
  if (!planned || !gone.includes(planned)) return planned;
  const usable = have.filter((m) => !gone.includes(m));
  const up = CAPABILITY.slice(CAPABILITY.indexOf(planned) + 1).find(
    (m) => usable.includes(m) && !(m === "fable" && role === "security-and-regulated-review"),
  );
  return up || ladder.slice(ladder.indexOf(planned) + 1).find((m) => usable.includes(m)) || null;
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

let data = "";
process.stdin.on("data", (c) => {
  data += c;
});
process.stdin.on("end", () => {
  const mode = (process.env.CLAUDE_MODEL_LADDER || "on").toLowerCase();
  if (mode === "off") process.exit(0);

  let input;
  try {
    input = JSON.parse(data || "{}");
  } catch {
    process.exit(0); // never fail a tool call because the hook could not read its own input
  }

  // ---- PreToolUse(Agent): the SELECT half, which never existed before ----
  if (input.tool_name === "Agent" || input.tool_name === "Task") {
    const ti = input.tool_input || {};
    const role = roleFor(ti);
    if (!role) process.exit(0); // an agent type with no declared ladder is not ours to route

    const have = available();
    const gone = exhaustion.exhausted();
    const best = pick(role, have, gone);
    if (!best) process.exit(0); // no rung of this ladder is available here; nothing to say
    const asked = String(ti.model || "")
      .trim()
      .toLowerCase();

    // A tier that hit its plan limit fails every spawn until the window resets, and Claude
    // Code's own fallback skips limit errors. Refusing here, with the rung to use instead, is
    // what makes the switch automatic: the Council re-spawns on the named model.
    const askedTier = exhaustion.tierOf(asked);
    if (askedTier && gone.includes(askedTier)) {
      emit({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            `"${asked}" has hit its plan limit on this account, so this spawn would fail. ` +
            `Re-spawn with model: "${best}", the next available rung of the ${role} ladder. ` +
            "Say so in the reply: the work is running on a different model than planned.",
        },
      });
    }

    // The one unambiguous policy violation: Fable on the security/regulated ladder.
    if (asked === "fable" && role === "security-and-regulated-review") {
      emit({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "model-tier-selection.md excludes Fable from the security-and-regulated-review " +
            "ladder: its classifiers refuse cyber work, so this spawn buys a refusal, not " +
            `capability. Use model: "${best}".`,
        },
      });
    }

    if (asked === best) process.exit(0); // already on the right rung

    const ladderText = LADDERS[role].join(" -> ");
    const outage = gone.length ? ` (plan limit reached: ${gone.join(", ")})` : "";
    const line = asked
      ? `${ti.subagent_type} resolves to the ${role} ladder [${ladderText}]; the best model ` +
        `available on this install is "${best}"${outage}, not "${asked}".`
      : `${ti.subagent_type} resolves to the ${role} ladder [${ladderText}]; on this install ` +
        `that is model: "${best}"${outage}. No model was passed, so this spawn inherits the ` +
        `session model instead of the ladder's choice.`;

    // strict mode refuses an under-provisioned strategic spawn: that is the rung where
    // first-shot correctness is the entire reason the ladder exists.
    if (mode === "strict" && role === "strategic-deep-reasoning") {
      emit({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `${line} Re-spawn with model: "${best}".`,
        },
      });
    }

    emit({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `[model-ladder] ${line}`,
      },
    });
  }

  // ---- PreModelSwitch: the DENY half, unchanged in behaviour ----
  const target = String(input.to_model || input.model || "").toLowerCase();
  if (!target.includes("fable")) process.exit(0);

  // Only the session's own signals — never a network call, which would put a hook on the
  // critical path of every model switch.
  const haystack = [
    input.prompt,
    input.reason,
    input.cwd,
    input.transcript_excerpt,
  ]
    .filter(Boolean)
    .join(" ");
  if (!SECURITY.test(haystack)) process.exit(0);

  process.stderr.write(
    "[model-ladder] BLOCKED: switch to Fable during security/regulated work. " +
      "model-tier-selection.md excludes Fable from the security-and-regulated-review " +
      "ladder — its classifiers refuse cyber work, so the switch buys a refusal, not " +
      "capability. Use opus (or mythos where provisioned).\n",
  );
  process.exit(2); // blocking: this is a policy violation, not advice
});
