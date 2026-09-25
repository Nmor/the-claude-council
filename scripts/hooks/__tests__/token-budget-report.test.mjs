// Size budget: 5 KB. Check: wc -c; gate: token-budget.mjs --check.
// token-budget.mjs, report half: the numbers CLAUDE.md quotes about its own cost.
//
// The --check gate is tested in tools.test.mjs. The report was not, so the figures the
// Floor documentation is built from were never checked against a known install. This one is
// built so every figure can be worked out by hand.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HOOKS } from './helpers.mjs';

const SCRIPT = join(HOOKS, '..', 'token-budget.mjs');
let home;
const report = (...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: home } });
  return { code: r.status, out: r.stdout || '' };
};
const put = (rel, bytes, body = '') => {
  const f = join(home, '.claude', rel);
  mkdirSync(join(f, '..'), { recursive: true });
  writeFileSync(f, body + 'x'.repeat(bytes - body.length));
};

before(() => {
  home = mkdtempSync(join(tmpdir(), 'tb-report-'));
  put('rules/common/a.md', 400);            // Floor: 400 + 1,000 = 1,400 B = 350 tokens
  put('CLAUDE.md', 1000);
  put('skills/big-a/SKILL.md', 30000);      // over the 25,000 B cap, with a reference
  put('skills/big-a/references/x.md', 10);
  put('skills/big-b/SKILL.md', 26000);      // over the cap, no references
  put('skills/small/SKILL.md', 1000);
  put('skills/synced/SKILL.md', 40000);     // vendored: never counted
  mkdirSync(join(home, '.claude', 'skills', 'no-skill-file'), { recursive: true });
});
after(() => rmSync(home, { recursive: true, force: true }));

describe('token-budget report — the figures a reader can check by hand', () => {
  test('--json carries the Floor, the worst turn and the skill counts', () => {
    const r = report('--json');
    assert.equal(r.code, 0);
    const j = JSON.parse(r.out);
    assert.deepEqual(j.floor, { bytes: 1400, tokens: 350, files: 2 });
    assert.deepEqual(j.worstCase, { skill: 'big-a', tokens: 7850 }, 'Floor plus the largest skill');
    assert.deepEqual(j.skills, { total: 3, overCap: 2, overCapTokens: 14000, withProgressiveDisclosure: 1 });
    assert.deepEqual(j.skillList.map((s) => s.name), ['big-a', 'big-b', 'small'], 'largest first, vendored excluded');
  });

  test('the plain report says the same numbers in words', () => {
    const r = report();
    assert.equal(r.code, 0);
    assert.match(r.out, /Floor \(every turn\)\s+350 tokens/);
    assert.match(r.out, /Worst single turn\s+7,850 tokens/);
    assert.match(r.out, /Skills over the 25,000 B cap: 2 of 3/);
    assert.match(r.out, /1 of 2 use progressive disclosure/);
    assert.match(r.out, /vendored, not counted: synced, graphify/);
    assert.doesNotMatch(r.out, /Every over-cap skill/, 'the per-skill list is for --full');
  });

  test('--full names every over-cap skill and its references', () => {
    const r = report('--full');
    assert.match(r.out, /Every over-cap skill/);
    assert.match(r.out, /big-a \(1 ref/);
    assert.match(r.out, /big-b/);
    assert.doesNotMatch(r.out, /\bsmall\b/, 'a skill under the cap is not listed');
  });
});
