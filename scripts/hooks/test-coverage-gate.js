#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// PreToolUse hook (matcher: Edit|Write|MultiEdit).
// NON-BLOCKING nudge, two signals, one line at most:
//
//   1. A production source file is being written with no companion test anywhere
//      in the project. Per functional-test-coverage.md, untested usually means
//      unexamined, and that is where the defects are.
//   2. The session has edited a lot of source and never measured coverage. Per
//      rule 1 of the same file, coverage is a measurement, never an estimate.
//
// Always exits 0: a hard block on a heuristic this broad would train people to
// switch it off, which is worse than the nudge it replaces. The repo-wide half of
// the rule is the coverage gate in each project's verify script.
// CLAUDE_TEST_COVERAGE_HOOK=off disables it.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|kts|cs|rb|php|swift|dart)$/i;
// Files that are not product behaviour, so a missing test says nothing.
const NOT_PRODUCT =
  /(\.(test|spec|stories|d)\.|[-_]test\.|_test\.go$|\/(tests?|__tests__|mocks?|__mocks__|fixtures?|testdata|migrations?|generated|dist|build|vendor|node_modules)\/|\/\.claude\/(?!scripts\/|hooks\/)|\.config\.|\.min\.)/i;

// Where a companion test would live, per language convention.
function testCandidates(file) {
  const dir = path.dirname(file);
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  if (ext === '.go') return [path.join(dir, `${base}_test.go`)];
  if (ext === '.py') {
    return [
      path.join(dir, `test_${base}.py`),
      path.join(dir, `${base}_test.py`),
      path.join(dir, 'tests', `test_${base}.py`),
      path.join(dir, '..', 'tests', `test_${base}.py`),
    ];
  }
  // A companion test does not have to sit beside the file. __tests__/ and tests/ are the
  // dominant JS layouts, and checking only siblings reported "no test" for every project
  // that uses them -- a false negative that trains the reader to ignore this hook.
  const exts = [ext, '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const dirs = [dir, path.join(dir, '__tests__'), path.join(dir, 'tests'),
                path.join(dir, '..', '__tests__'), path.join(dir, '..', 'tests')];
  return ['.test', '.spec'].flatMap((kind) =>
    dirs.flatMap((d) => exts.map((e) => path.join(d, `${base}${kind}${e}`)))
  );
}

// A single suite may cover many modules -- which is how the hooks themselves are tested.
// Treat the module as covered when a test file in a nearby __tests__/ or tests/ directory
// actually NAMES it. Cheap: at most a handful of small files, read once.
function coveredByNearbySuite(file) {
  const dir = path.dirname(file);
  const needle = path.basename(file);
  for (const d of [path.join(dir, '__tests__'), path.join(dir, 'tests'),
                   path.join(dir, '..', '__tests__'), path.join(dir, '..', 'tests')]) {
    let entries = [];
    try {
      entries = fs.readdirSync(d);
    } catch {
      continue;
    }
    for (const name of entries.slice(0, 50)) {
      if (!/\.(test|spec)\.(m|c)?[jt]sx?$/i.test(name)) continue;
      try {
        if (fs.readFileSync(path.join(d, name), 'utf8').includes(needle)) return true;
      } catch {
        /* unreadable candidate proves nothing either way */
      }
    }
  }
  return false;
}

// How many source edits before the un-measured-coverage nudge fires once.
const EDITS_BEFORE_COVERAGE_NUDGE = 12;

const { advise } = require('./lib/advise.js');

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  let warn = null;
  let input = {};
  try {
    input = JSON.parse(data || '{}');
    const file = (input.tool_input && input.tool_input.file_path) || '';
    const sid = input.session_id || '';
    if (!file || !sid || !SRC_EXT.test(file) || NOT_PRODUCT.test(file)) {
      process.exit(0);
    }

    // The lastedit stamp is written BEFORE the off-switch, deliberately.
    //
    // It is not part of this hook's advisory nudge -- it is shared infrastructure that
    // commit-gate.js (a BLOCKING hook) reads to decide whether the verification gate ran
    // before or after the source changed. Writing it after the off-switch meant
    // CLAUDE_TEST_COVERAGE_HOOK=off, documented as silencing a nudge, also silently
    // disabled the commit block. Measured 2026-09-21: with that one variable set, a commit
    // that should have been refused went from exit 2 to exit 0. A switch for a nudge must
    // never turn off a wall.
    fs.writeFileSync(path.join(os.tmpdir(), `claude-council-lastedit-${sid}`), String(Date.now()));

    if (process.env.CLAUDE_TEST_COVERAGE_HOOK === 'off') process.exit(0);

    const hasTest =
      testCandidates(file).some((p) => fs.existsSync(p)) || coveredByNearbySuite(file);

    // Count source edits this session so the coverage nudge fires once, late,
    // rather than on every write.
    const counterPath = path.join(os.tmpdir(), `claude-council-srcedits-${sid}`);
    let edits = 0;
    try {
      edits = Number(fs.readFileSync(counterPath, 'utf8')) || 0;
    } catch {
      edits = 0;
    }
    edits += 1;
    fs.writeFileSync(counterPath, String(edits));

    const coverageMarker = path.join(os.tmpdir(), `claude-council-coverage-${sid}`);
    const measured = fs.existsSync(coverageMarker);
    const noticedPath = path.join(os.tmpdir(), `claude-council-covnudge-${sid}`);
    const alreadyNudged = fs.existsSync(noticedPath);

    if (!hasTest) {
      warn =
        `[test-coverage] "${path.basename(file)}" has no companion test ` +
        `(looked for ${testCandidates(file).map((p) => path.basename(p)).join(', ')}). ` +
        `Per functional-test-coverage.md, a test counts only if it would FAIL when the ` +
        `behaviour breaks — write one that names the defect it prevents, or say plainly ` +
        `why this file carries no behaviour.`;
    } else if (!measured && edits >= EDITS_BEFORE_COVERAGE_NUDGE && !alreadyNudged) {
      fs.writeFileSync(noticedPath, String(Date.now()));
      warn =
        `[test-coverage] ${edits} source files edited this session and coverage has not ` +
        `been measured once. Per functional-test-coverage.md rule 1, coverage is a ` +
        `measurement and never an estimate: run the project's coverage command and ` +
        `report the real number per surface before any claim about test state.`;
    }
  } catch (err) {
    warn = `[test-coverage] skipped: ${err.message}`;
  }
  advise(input, warn);
  process.exit(0); // never block
});
