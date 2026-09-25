#!/usr/bin/env node
// Size budget: 4 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

// PreToolUse hook (matcher: Bash). A dev server runs as a background task.
//
// A dev server never exits, so started in the foreground it holds the turn until the Bash
// timeout and its log is hard to reach. Claude Code's own answer is `run_in_background: true`:
// the task keeps running, its output is readable from the task's output file, and /tasks stops
// it (tools reference, read 2026-09-21). This hook blocks the foreground form and says so; the
// background form, and any other way of running it (tmux included), goes through.
//
// SUPERSEDE PROOF (2026-09-21), replacing tmux-dev-gate.js, which replaced two inline hooks:
//   inputs:  tool_input.command and platform, as before; now also tool_input.run_in_background.
//   outputs: exit 2 with a stderr reason on a foreground dev server, as before. The reason now
//            names run_in_background instead of tmux, because tmux was the answer before the
//            Bash tool could background a command.
//   dropped, deliberately (owner decision, same date): the non-blocking reminder to run
//            installs, tests and builds in tmux. It was never delivered before 2026-09-21
//            (stderr on exit 0 is not shown), and Claude Code now backgrounds a command that
//            outlives its timeout by itself, so it bought nothing but tokens.
//   guards:  win32 skip and "unreadable input allows" carried over.

const { executablePart, atCommandPosition } = require('./lib/command-scan.js');
const { getCommandPattern } = require('../lib/package-manager.js');

const DEV_SERVER = new RegExp(getCommandPattern('dev'));

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  if (process.platform === 'win32') process.exit(0);
  let input;
  try {
    input = JSON.parse(data || '{}') || {};
  } catch {
    process.exit(0);
  }
  const tool = input.tool_input || {};
  if (tool.run_in_background === true) process.exit(0);
  if (!atCommandPosition(executablePart(String(tool.command || '')), DEV_SERVER)) process.exit(0);
  process.stderr.write(
    '[dev-server-gate] A dev server never exits, so in the foreground it holds the turn until ' +
      'the Bash timeout. Run the same command with run_in_background: true; read its log from ' +
      "the task's output file and stop it with /tasks.\n",
  );
  process.exit(2);
});
