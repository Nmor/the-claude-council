// Size budget: 6 KB. Check: wc -c; gate: token-budget.mjs --check.
// Unit tests for lib/command-scan.js — the shared "what will this command RUN" analysis.
//
// The hooks are tested as processes elsewhere; this library is imported directly because it
// is a pure function of a string, and because two of its defects were invisible from outside:
// its one caller-less helper had no test at all, so nothing showed that an alternation needle
// lost its command-position anchor on every branch but the first.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { HOOKS } from './helpers.mjs';

const { executablePart, atCommandPosition, VERIFICATION_GATE } =
  createRequire(import.meta.url)(join(HOOKS, 'lib', 'command-scan.js'));

// An infra-only commit could never satisfy commit-gate.js: nothing that verifies a manifest,
// an alert rule or a workflow counted as a gate, so the only way past it was to run an
// unrelated linter to write the marker, which misreports what was verified (2026-09-21).
describe('VERIFICATION_GATE — infra validators are gates', () => {
  for (const cmd of [
    'kubectl kustomize k8s | python3 scripts/validate-manifests.py -',
    'python3 scripts/validate-manifests.py rendered.yaml',
    'python scripts/validate-manifests-selftest.py rendered.yaml',
    './scripts/validate-manifests.py rendered.yaml',
    'promtool check rules alerts.yaml',
    'promtool test rules tests.yaml',
    'actionlint',
    'terraform validate',
    'kubeconform -strict rendered.yaml',
    'helm lint chart/',
    'shellcheck scripts/migrate.sh',
    'node --test scripts/hooks/__tests__/model-ladder.test.mjs', // Node's runner, used by this suite
  ]) {
    test(`counts ${cmd}`, () => assert.equal(atCommandPosition(cmd, VERIFICATION_GATE), true, cmd));
  }

  for (const cmd of [
    'kubectl kustomize k8s',
    'cat scripts/validate-manifests.py',
    'grep -rn promtool .',
    'python3 scripts/render.py',
    'terraform plan',
    'node --check hook.js',
  ]) {
    test(`does not count ${cmd}`, () => assert.equal(atCommandPosition(cmd, VERIFICATION_GATE), false, cmd));
  }
});

describe('atCommandPosition — a command that RUNS the thing, not one that mentions it', () => {
  test('every branch of an alternation needs command position, not only the first', () => {
    assert.equal(atCommandPosition('grep -rn eslint .', /tsc|eslint/), false,
      'ungrouped, the anchor bound to "tsc" alone and "eslint" matched anywhere');
    assert.equal(atCommandPosition('cd x && eslint .', /tsc|eslint/), true);
  });

  for (const [what, cmd] of [
    ['at the start', 'go test ./...'],
    ['after &&', 'cd svc && go test ./...'],
    ['after ;', 'make; go test ./...'],
    ['after a pipe', 'true | go test ./...'],
    ['after ||', 'false || go test ./...'],
    ['inside $( )', 'out=$(go test ./...)'],
    ['under sudo', 'sudo go test ./...'],
    ['on the second line of a multi-line command', 'cd svc\ngo test ./...'],
  ]) {
    test(`recognises an invocation ${what}`, () => assert.equal(atCommandPosition(cmd, 'go test'), true, cmd));
  }

  for (const [what, cmd] of [
    ['as an argument', 'grep -rn "go test" .'],
    ['in an echo', 'echo run go test later'],
    ['as a longer word', 'go testify ./...'],
  ]) {
    test(`does not count a mention ${what}`, () => assert.equal(atCommandPosition(cmd, 'go test'), false, cmd));
  }

  test('a string needle is literal, so its dots are not wildcards', () => {
    assert.equal(atCommandPosition('axb run', 'a.b'), false);
    assert.equal(atCommandPosition('a.b run', 'a.b'), true);
  });
});

describe('executablePart — a heredoc written to a file is data, not a command', () => {
  test('drops the body of a heredoc that is only written to a file', () => {
    const out = executablePart("cat > notes.sh <<'EOF'\ngit push origin main\nEOF");
    assert.doesNotMatch(out, /git push/);
    assert.match(out, /cat > notes\.sh/, 'the command that did run is kept');
  });

  test('keeps the body of a heredoc fed to an interpreter, because that body runs', () => {
    assert.match(executablePart('bash <<EOF\ngit push origin main\nEOF'), /git push/);
  });

  test('treats null and undefined as an empty command', () => {
    assert.equal(executablePart(null), '');
    assert.equal(executablePart(undefined), '');
  });
});
