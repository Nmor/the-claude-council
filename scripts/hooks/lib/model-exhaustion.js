// Size budget: 4 KB. Check: wc -c; gate: token-budget.mjs --check.
"use strict";

// Which model tiers have hit a PLAN limit ("You've hit your Opus limit") on this install.
//
// Claude Code's fallbackModel chain deliberately skips rate-limit and billing errors
// (code.claude.com/docs/en/model-config, read 2026-09-25), and no hook can change the model
// or retry a request. So a tier that runs out keeps being selected, by the session and by
// every Council spawn, until a person runs /model. This file is the shared memory that lets
// the ladder route AROUND an exhausted tier instead.
//
// A record expires after TTL_MS. Plan windows reset on their own schedule and the error text
// does not carry a parseable reset time, so the cost of a stale expiry is one more failed
// call, which re-marks the tier. A success on the tier clears it at once.

const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { homedir } = require("node:os");

const TTL_MS = 5 * 60 * 60 * 1000; // one plan session window
const TIERS = ["mythos", "fable", "opus", "sonnet", "haiku"];

// Operator override (and what keeps tests off the real install).
const file = () =>
  process.env.CLAUDE_MODEL_EXHAUSTED_FILE ||
  join(homedir(), ".claude", ".local", "model-exhausted.json");

function load() {
  try {
    const o = JSON.parse(readFileSync(file(), "utf8"));
    return o && typeof o === "object" ? o : {};
  } catch {
    return {}; // absent or unreadable means nothing is known to be exhausted
  }
}

function save(o) {
  mkdirSync(dirname(file()), { recursive: true });
  writeFileSync(file(), JSON.stringify(o, null, 2) + "\n");
}

// Map "claude-opus-5-5", "Opus", "opus[1m]" to the ladder alias.
function tierOf(name) {
  const s = String(name || "").toLowerCase();
  return TIERS.find((t) => s.includes(t)) || null;
}

// The tier a limit message names, e.g. "You've hit your Fable limit". A session or weekly
// limit names no tier and covers every model, so there is nothing to route to.
function tierInLimitMessage(text) {
  const m = /hit your (\w+) limit/i.exec(String(text || ""));
  return m ? tierOf(m[1]) : null;
}

function exhausted(now = Date.now()) {
  const o = load();
  return Object.keys(o).filter((t) => now - Number(o[t].at || 0) < TTL_MS);
}

function mark(tier, message, now = Date.now()) {
  const o = load();
  o[tier] = { at: now, message: String(message || "").slice(0, 200) };
  save(o);
}

function clear(tier) {
  const o = load();
  if (!(tier in o)) return false;
  delete o[tier];
  save(o);
  return true;
}

module.exports = { exhausted, mark, clear, tierOf, tierInLimitMessage, TTL_MS };
