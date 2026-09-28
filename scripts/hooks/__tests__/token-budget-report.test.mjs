// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
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
    assert.match(r.out, /Eager Floor\s+~350 estimated tokens/);
    assert.match(r.out, /Floor \+ largest skill\s+~7,850 estimated tokens/);
    assert.match(r.out, /not billed tokens/);
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

describe('token-budget selected root and independent eager cap', () => {
  const fixture = (t, files) => {
    const root = mkdtempSync(join(tmpdir(), 'tb-root-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    for (const [name, body] of Object.entries(files)) {
      const target = join(root, name);
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, body);
    }
    return root;
  };
  const selected = (root, ...args) => spawnSync(process.execPath,
    [SCRIPT, '--root', root, ...args], {
      cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, HOME: home },
    });

  test('--root measures the selected checkout from an unrelated cwd', (t) => {
    const root = fixture(t, { 'CLAUDE.md': 'x'.repeat(800), 'skills/a/SKILL.md': 'x'.repeat(200) });
    const result = selected(root, '--json');
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.root, root);
    assert.deepEqual(report.floor, { bytes: 800, tokens: 200, files: 1 });
    assert.equal(report.estimate.billedTokens, false);
    assert.equal(report.worstCase.skill, 'a');
  });

  test('nested unscoped rules count; scoped rules and lazy library do not', (t) => {
    const unscoped = 'nested eager';
    const emptyScope = '---\npaths: []\n---\nstill eager';
    const block = '---\npaths:\n  - "src/**"\n---\nscoped';
    const inline = '---\r\npaths: ["tests/**"]\r\n---\r\nscoped';
    const root = fixture(t, {
      'CLAUDE.md': 'root', 'rules/a/b/c/d/e.md': unscoped,
      'rules/empty.md': emptyScope, 'rules/block.md': block, 'rules/inline.md': inline,
      'rules-library/archive.md': 'x'.repeat(50000),
    });
    const result = selected(root, '--json');
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.floor.bytes, 4 + unscoped.length + emptyScope.length);
    assert.equal(report.floor.files, 3);
    assert.deepEqual(report.scopedRules, { bytes: block.length + inline.length, files: 2 });
  });

  test('raising file declarations cannot evade aggregate eager cap', (t) => {
    const content = '# Rule\nSize budget: 1000 KB\n' + 'x'.repeat(13000);
    const root = fixture(t, { 'CLAUDE.md': content, 'rules/nested/eager.md': content });
    const result = selected(root, '--check');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /OVER eager Floor:.*24,576 B aggregate cap/);
    assert.match(result.stderr, /aggregate cap/);
    assert.doesNotMatch(result.stderr, /file\(s\) over their own/);
    assert.equal(selected(root, '--check', '--max-floor-bytes', '30000').status, 0);
  });

  test('scoped content is excluded from aggregate cap but keeps its declared gate', (t) => {
    const root = fixture(t, { 'CLAUDE.md': '# Floor',
      'rules/scoped.md': '---\npaths:\n  - "src/**"\n---\nSize budget: 50 KB\n' + 'x'.repeat(30000) });
    assert.equal(selected(root, '--check').status, 0);
    writeFileSync(join(root, 'rules/scoped.md'),
      '---\npaths: ["src/**"]\n---\nSize budget: 1 KB\n' + 'x'.repeat(3000));
    const result = selected(root, '--check');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /OVER\s+scoped\.md/);
  });

  test('invalid explicit root and aggregate limit fail with clear errors', (t) => {
    const root = fixture(t, {});
    assert.equal(selected(join(root, 'missing'), '--json').status, 2);
    for (const limit of ['0', '-1', 'not-a-number', '2.5']) {
      assert.equal(selected(root, '--check', '--max-floor-bytes', limit).status, 2);
    }
  });
});
