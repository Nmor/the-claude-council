#!/usr/bin/env node
// Size budget: 5 KB. Check: wc -c; gate: token-budget.mjs --check.
"use strict";

// Records a model tier that has hit its PLAN limit, so the Council ladder routes around it.
//
// Why a hook: Claude Code's fallbackModel never fires on rate-limit or billing errors, and no
// hook can switch the model or retry (code.claude.com/docs/en/model-config and /hooks, read
// 2026-09-25). Without a record, every Council spawn keeps asking for the exhausted tier and
// fails the same way. With it, model-ladder-gate.js resolves the next available rung.
//
//   StopFailure            the main turn died on "You've hit your <Tier> limit": mark it.
//   PostToolUse(Agent)     a spawn succeeded on an explicit model: clear that tier.
//   PostToolUseFailure     a spawn died on a named-tier limit: mark it.
//   Stop                   the main turn succeeded: clear the tier that answered it.
//
// It only ever marks a tier the error NAMES. A session or weekly limit covers every model,
// so there is no rung to move to and marking one would misroute. Never blocks; side effects
// only. CLAUDE_MODEL_LADDER=off disables it along with the gate.

const { openSync, readSync, fstatSync, closeSync } = require("node:fs");
const lib = require("./lib/model-exhaustion");

// The model that produced the last assistant message, from the transcript tail.
function lastAssistantTier(path) {
  if (!path) return null;
  let fd;
  try {
    fd = openSync(path, "r");
    const size = fstatSync(fd).size;
    const len = Math.min(size, 65536);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    // Parse entries rather than grep for "model": an Agent call's own tool_input.model sits
    // in the same transcript and would clear the tier the SPAWN asked for, not the one that
    // answered. The first line of the tail may be cut mid-entry; it fails to parse and is skipped.
    const lines = buf.toString("utf8").split("\n").reverse();
    for (const line of lines) {
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      if (e && e.type === "assistant" && e.message && e.message.model)
        return lib.tierOf(e.message.model);
    }
    return null;
  } catch {
    return null; // an unreadable transcript just means no clear this turn
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function note(msg) {
  process.stderr.write(`[model-ladder] ${msg}\n`);
}

let data = "";
process.stdin.on("data", (c) => {
  data += c;
});
process.stdin.on("end", () => {
  if ((process.env.CLAUDE_MODEL_LADDER || "on").toLowerCase() === "off") process.exit(0);
  let input;
  try {
    input = JSON.parse(data || "{}");
  } catch {
    process.exit(0);
  }
  const event = input.hook_event_name;
  const isSpawn = input.tool_name === "Agent" || input.tool_name === "Task";

  try {
    if (event === "StopFailure") {
      const tier = lib.tierInLimitMessage(input.error_message);
      if (tier) {
        lib.mark(tier, input.error_message);
        note(`${tier} marked exhausted; Council spawns now route to the next rung.`);
      }
    } else if (event === "PostToolUseFailure" && isSpawn) {
      const text = `${input.error || ""} ${JSON.stringify(input.tool_response || "")}`;
      const tier = lib.tierInLimitMessage(text);
      if (tier) lib.mark(tier, text);
    } else if (event === "PostToolUse" && isSpawn) {
      const text = JSON.stringify(input.tool_response || "");
      const limited = lib.tierInLimitMessage(text);
      if (limited) lib.mark(limited, text);
      else {
        const tier = lib.tierOf(input.tool_input && input.tool_input.model);
        if (tier) lib.clear(tier);
      }
    } else if (event === "Stop") {
      const tier = lastAssistantTier(input.transcript_path);
      if (tier) lib.clear(tier);
    }
  } catch (e) {
    note(`could not update the exhaustion record: ${e.message}`); // never fail the turn
  }
  process.exit(0);
});
