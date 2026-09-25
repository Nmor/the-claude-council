// Size budget: 18 KB. Check: wc -c; gate: token-budget.mjs --check.
// Rule-by-rule tests for lib/no-discards-rules.js — the manifest behind the edit gate that
// can refuse any edit in any project.
//
// Every rule gets a case that MUST fire and a near-miss that must NOT. The near-miss is the
// half that keeps the gate alive: a rule that fires on ordinary code is a rule people switch
// off, and then it protects nothing. Until 2026-09-21, 17 of these 19 rules had no test.
//
// Markers are assembled from pieces so this file does not contain what it tests for.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { HOOKS } from './helpers.mjs';

const { evaluateFile, stripQuoted, summariesFor } =
  createRequire(import.meta.url)(join(HOOKS, 'lib', 'no-discards-rules.js'));

const all = (file, text) => {
  const r = evaluateFile(file, text);
  return [...r.blocking, ...r.soft];
};
const rulesHit = (file, text) => new Set(all(file, text).map((i) => i.rule));
const fires = (id, file, text) => assert.ok(rulesHit(file, text).has(id), `${id} should fire on ${file}: ${text}`);
const silent = (id, file, text) => assert.ok(!rulesHit(file, text).has(id), `${id} must not fire on ${file}: ${text}`);

const TD = 'TO' + 'DO';
const FX = 'FIX' + 'ME';
const L7 = '<'.repeat(7), R7 = '>'.repeat(7), E7 = '='.repeat(7);

describe('underscore-discard — a return value is bound, never thrown away', () => {
  for (const [file, line] of [
    ['a.go', 'x, _ := f()'], ['a.go', '_, err := f()'], ['a.go', '_ = f()'],
    ['a.go', 'for k, _ := range m {'], ['a.go', 'for _ = range ch {'],
    ['a.py', '_, x = f()'], ['a.py', 'for k, _ in items:'], ['a.ts', 'const [_, b] = pair; _ = f()'],
  ]) test(`fires: ${file} ${line}`, () => fires('underscore-discard', file, line));

  for (const [file, line] of [
    ['a.go', 'for _, v := range s {'], ['a.go', 'func f(_ int) {}'],
    ['a.go', 'func (s *S) M(_ string) error {'], ['a.py', 'def h(_, x):'],
    ['a.py', 'cb = lambda _, y: y'], ['a.go', '// the shape `_, _ =` is what this catches'],
    ['a.py', '# _ = f() is the banned form'], ['a.go', 'msg := "x, _ := f()"'],
  ]) test(`silent: ${file} ${line}`, () => silent('underscore-discard', file, line));
});

describe('expr-statement-discard — a lookup whose answer nobody reads', () => {
  for (const line of ['repo.findUser(id)', 'parse(x);', 'db.query_all(sql)', 'svc.fetchOne(k)'])
    test(`fires: ${line}`, () => fires('expr-statement-discard', 'a.ts', line));
  for (const line of ['u := repo.findUser(id)', 'logger.info(x)', 'await client.fetch(url)',
    'fetch(ctx context.Context) (T, error)', 'return parse(x)', 'refresh(x)'])
    test(`silent: ${line}`, () => silent('expr-statement-discard', 'a.go', line));
});

describe('placeholder-marker — a marker is a tag, not a word in a sentence', () => {
  for (const [file, line] of [
    ['a.go', `// ${TD} wire this`], ['a.py', `# ${FX}`], ['a.ts', `// ${TD.toLowerCase()}: later`],
    ['a.ts', `// ${TD}(sam): owner tag`], ['a.md', `<!-- ${'XX' + 'X'} -->`],
  ]) test(`fires: ${line}`, () => fires('placeholder-marker', file, line));
  for (const line of ['// Note that OTP shares this constant', '// a bug in the provider',
    '// which reads as our', '// bug (no-silent-failures rule 1: the send)'])
    test(`silent: ${line}`, () => silent('placeholder-marker', 'a.ts', line));
});

describe('scaffold-deferral — no half-built feature shipped as done', () => {
  for (const [file, line] of [['a.ts', '// stub for now'], ['a.py', '# implement this later'],
    ['a.go', '/* placeholder implementation */']])
    test(`fires: ${line}`, () => fires('scaffold-deferral', file, line));
  test('silent on prose that only mentions a scaffold', () =>
    silent('scaffold-deferral', 'a.ts', '// the scaffold is the product here'));
  test('silent in Markdown, where plans discuss scaffolding freely', () =>
    silent('scaffold-deferral', 'a.md', 'stub for now'));
});

describe('suppression — fix the code, never silence the tool', () => {
  for (const [file, line] of [
    ['a.go', 'x() // ' + 'no' + 'lint:errcheck'], ['a.ts', '// eslint-' + 'disable-next-line'],
    ['a.ts', '// @ts-' + 'ignore'], ['a.py', 'x = 1  # ' + 'no' + 'qa'], ['a.py', 'y = f()  # type: ' + 'ignore'],
  ]) test(`fires: ${line}`, () => fires('suppression', file, line));
  test('silent on a comment that talks about linters', () =>
    silent('suppression', 'a.go', '// the linter is configured in .golangci.yml'));
});

describe('task-pointer — a comment says why, not which ticket', () => {
  for (const [file, line] of [
    ['a.ts', '// see plan B2'], ['a.go', '// per Sonar S1192'], ['a.go', '// P11.W2.G2 wires this'],
    ['a.ts', '// 9.B.8 follow-up'], ['a.ts', '// closes GAP8'], ['a.ts', '// landed in Wave A'],
    ['a.py', '# Session 3b'], ['a.go', '// phase 2 work'], ['deploy.yaml', '# see plan B2'],
    ['a.ts', '// see the plan for the sequence'],
  ]) test(`fires: ${file} ${line}`, () => fires('task-pointer', file, line));
  for (const line of ['// the buyer has to see the plan they are agreeing to', '// p95 latency budget',
    '// version 1.2.3', '// close the gap', '// the microwave', 'x = plan(2)'])
    test(`silent: ${line}`, () => silent('task-pointer', 'a.ts', line));
});

describe('raw-color — components use tokens; the token layer may hold literals', () => {
  for (const [file, line] of [
    ['Card.tsx', '<div style={{ color: "#fff" }} />'], ['a.css', '  color: rgb(0, 0, 0);'],
    ['Card.vue', '  background: oklch(0.5 0.2 285);'],
    // A leading `#` is a selector in CSS, not a comment. This line used to be skipped whole.
    ['a.css', '#banner { background: #111; }'],
  ]) test(`fires: ${file} ${line}`, () => fires('raw-color', file, line));
  for (const [file, line] of [
    ['a.css', '  --primary: oklch(0.55 0.2 285);'], ['Card.tsx', '// React #130 invariant'],
    ['a.css', '/* #FFFFE0 failed contrast */'], ['a.css', '@import "base.css";'],
    ['src/theme.css', 'color: #fff;'], ['Card.test.tsx', 'expect(x).toBe("#fff")'],
    ['Card.vue', '<!-- was #fff before the tokens -->'], ['a.css', '/*\n  color: #fff\n*/'],
  ]) test(`silent: ${file} ${line}`, () => silent('raw-color', file, line));
});

describe('console-log, silent-catch, empty-catch — JS failures stay visible', () => {
  test('console.log fires in source', () => fires('console-log', 'a.ts', 'console.log(x)'));
  for (const [file, line] of [['a.test.ts', 'console.log(x)'], ['a.stories.tsx', 'console.log(x)'],
    ['a.ts', 'const s = "console.log(x)"'], ['a.ts', 'console.error(x)']])
    test(`console-log silent: ${file} ${line}`, () => silent('console-log', file, line));

  for (const line of ['p.catch(() => {})', 'p.catch(() => null)', 'p.catch((e) => "")', 'p.catch(() => false)'])
    test(`silent-catch fires: ${line}`, () => fires('silent-catch', 'a.ts', line));
  for (const [file, line] of [['a.ts', 'p.catch((e) => log(e))'], ['a.test.ts', 'p.catch(() => null)']])
    test(`silent-catch silent: ${file} ${line}`, () => silent('silent-catch', file, line));

  for (const line of ['} catch (e) {}', '} catch {}'])
    test(`empty-catch fires: ${line}`, () => fires('empty-catch', 'a.ts', line));
  for (const [file, line] of [['a.ts', '} catch (e) { log(e) }'], ['a.test.ts', '} catch (e) {}'],
    ['a.ts', 'const s = "catch (e) {}"']])
    test(`empty-catch silent: ${file} ${line}`, () => silent('empty-catch', file, line));
});

describe('empty-catch-multiline — the catch body that only holds a comment', () => {
  test('fires on a multi-line catch whose body is a comment', () =>
    fires('empty-catch-multiline', 'a.ts', 'try {\n  x()\n} catch (e) {\n  // ignore\n}'));
  test('fires on a one-line catch whose body is only a comment', () =>
    fires('empty-catch-multiline', 'a.ts', 'try { x() } catch (e) { /* ignore */ }'));
  test('does not report a one-line empty catch twice: the per-line rule owns it', () => {
    const hit = rulesHit('a.ts', 'try { x() } catch (e) {}');
    assert.ok(hit.has('empty-catch'));
    assert.ok(!hit.has('empty-catch-multiline'), 'one defect, one report');
  });
  test('names every empty catch in the file, not only the first', () => {
    const text = 'try {\n} catch (a) {\n  // one\n}\nx()\ntry {\n} catch (b) {\n  // two\n}';
    const issue = all('a.ts', text).find((i) => i.rule === 'empty-catch-multiline');
    assert.match(issue.snippet, /line 2, 7/);
  });
  test('silent when the catch handles the error', () =>
    silent('empty-catch-multiline', 'a.ts', 'try {\n  x()\n} catch (e) {\n  log(e)\n}'));
});

describe('Python excepts that swallow the failure — one rule, one verdict per shape', () => {
  // The line is drawn where Ruff S110 and Bandit B110 draw it by default: a bare except or one
  // catching Exception / BaseException that only passes is a silent failure; a NAMED exception
  // that is deliberately ignored is not (their check-typed-exception defaults to false). Two
  // rules used to disagree, so `except ValueError: pass` was blocked on one line and allowed
  // across two. The narrow case is allowed in both layouts now; blocking it would only move
  // the same swallow into `contextlib.suppress`, which is no safer.
  const broad = ['except:', 'except Exception:', 'except BaseException:', 'except Exception as exc:'];
  for (const head of broad) {
    test(`blocks \`${head} pass\` written on one line`, () =>
      fires('silent-except', 'a.py', `try:\n    f()\n${head} pass`));
    test(`blocks \`${head}\` whose next line only passes`, () =>
      fires('silent-except', 'a.py', `try:\n    f()\n${head}\n    pass`));
  }
  test('an ellipsis body is the same swallow as pass', () =>
    fires('silent-except', 'a.py', 'try:\n    f()\nexcept:\n    ...'));

  for (const [what, text] of [
    ['a named exception, one line', 'try:\n    f()\nexcept ValueError: pass'],
    ['a named exception, two lines', 'try:\n    f()\nexcept ValueError:\n    pass'],
    ['a tuple of named exceptions', 'try:\n    f()\nexcept (KeyError, ValueError): pass'],
    ['a broad except that logs', 'try:\n    f()\nexcept Exception:\n    log.warning(x)'],
  ]) {
    test(`allows ${what}`, () => {
      const hit = rulesHit('a.py', text);
      assert.ok(!hit.has('silent-except'), text);
      assert.equal(all('a.py', text).filter((i) => /except/.test(i.rule)).length, 0, 'no except rule of any name fires');
    });
  }

  test('reports one finding for one swallow, not one per rule', () => {
    const issues = all('a.py', 'try:\n    f()\nexcept Exception: pass').filter((i) => /except/.test(i.rule));
    assert.equal(issues.length, 1);
  });
  test('names every site', () => {
    const text = 'try:\n    a()\nexcept:\n    pass\ntry:\n    b()\nexcept Exception:\n    pass';
    assert.match(all('a.py', text).find((i) => i.rule === 'silent-except').snippet, /line 3, 7/);
  });
  test('is silent in a test file', () =>
    silent('silent-except', 'test_a.py', 'try:\n    f()\nexcept:\n    pass'));
});

describe('secrets, Go test names, conflict markers, !important', () => {
  const key = 'AKIA' + 'ABCDEFGHIJKLMNOP';
  test('a credential in source blocks, and the report does not repeat it', () => {
    const issue = all('a.go', `k := "${key}"`).find((i) => i.rule === 'hardcoded-secret');
    assert.ok(issue);
    assert.doesNotMatch(issue.snippet, /AKIA/, 'the report must not echo the credential');
  });
  test('a credential-shaped fixture in a test file is allowed', () =>
    silent('hardcoded-secret', 'a_test.go', `k := "${key}"`));

  test('Go test names use t.Run, not underscores', () =>
    fires('go-test-naming', 'x_test.go', 'func TestFoo_Bar(t *testing.T) {'));
  test('go-test-naming is silent on a plain name and outside test files', () => {
    silent('go-test-naming', 'x_test.go', 'func TestFooBar(t *testing.T) {');
    silent('go-test-naming', 'x.go', 'func TestFoo_Bar(t *testing.T) {');
  });

  for (const line of [`${L7} HEAD`, `${R7} feature`, E7])
    test(`merge-conflict fires in code: ${line}`, () => fires('merge-conflict', 'a.go', line));
  test('a Markdown setext underline is not a conflict separator', () =>
    silent('merge-conflict', 'README.md', `Title\n${E7}\n\nbody`));
  test('a real conflict in Markdown is still caught by its other markers', () =>
    fires('merge-conflict', 'README.md', `${L7} HEAD\na\n${E7}\nb\n${R7} x`));

  test('!important warns, and only warns', () => {
    const r = evaluateFile('a.css', 'a { color: var(--x) !important; }');
    assert.ok(r.soft.some((i) => i.rule === 'important'));
    assert.ok(!r.blocking.some((i) => i.rule === 'important'));
  });
});

describe('size-budget and file-too-large — a file is held to what it says', () => {
  const body = (n) => Array.from({ length: n }, (_v, i) => `x${i} := ${i}`).join('\n');
  test('warns when a file outgrows the budget it declares', () =>
    fires('size-budget', 'a.go', `// Size budget: 1 KB\n${body(200)}`));
  test('silent while within it', () => silent('size-budget', 'a.go', `// Size budget: 1 KB\n${body(5)}`));
  test('finds a declaration below long YAML front matter', () => {
    const front = ['---', 'paths:', ...Array.from({ length: 50 }, (_v, i) => `  - p${i}`), '---'].join('\n');
    fires('size-budget', 'SKILL.md', `${front}\n# T\n> Size budget: 1 KB\n${'word '.repeat(400)}`);
  });
  test('file-too-large warns past 800 lines with no budget', () => fires('file-too-large', 'a.go', body(801)));
  test('a declared budget is the more specific statement and wins', () =>
    silent('file-too-large', 'a.go', `// Size budget: 64 KB\n${body(801)}`));
  test('file-too-large is for source, not Markdown', () => silent('file-too-large', 'a.md', body(801)));
});

describe('the block message explains what fired', () => {
  test('every rule has a one-line summary, reported only for rules that fired', () => {
    const issues = all('a.ts', 'console.log(x)\np.catch(() => null)');
    const lines = summariesFor(issues);
    assert.equal(lines.length, 2);
    assert.ok(lines.every((l) => /^\S+\s+: \S/.test(l)), lines.join('\n'));
  });
  test('stripQuoted keeps column positions and blanks string content', () => {
    const src = 'a := "x, _ := f()" + `b\\d` // c';
    const out = stripQuoted(src);
    assert.equal(out.length, src.length);
    assert.doesNotMatch(out, /_ :=/);
  });
});
