// Size budget: 10 KB. Check: wc -c; gate: token-budget.mjs --check.
// Tests for the model-ladder gate — the hook that decides which model a spawn gets.
//
// This hook existed for months as a DENY-only gate: it could refuse Fable and never field
// it, so an install whose availability file listed `fable` and whose model catalog carried
// `claude-fable-5-1` still never used it. The select half below is the half that was
// missing, so its tests are the ones that matter most here.
//
// Availability is pinned per-test through CLAUDE_MODEL_AVAILABILITY. Reading the machine's
// real file would make these tests pass or fail according to whose laptop ran them, which is
// not a test.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, json } from './helpers.mjs';

// The exhaustion record is pinned to a path that never exists, for the same reason.
const NONE = { CLAUDE_MODEL_EXHAUSTED_FILE: join(tmpdir(), 'no-such-model-exhausted.json') };
const MAX = { ...NONE, CLAUDE_MODEL_AVAILABILITY: 'opus,sonnet,haiku,fable' };
const PRO = { ...NONE, CLAUDE_MODEL_AVAILABILITY: 'opus,sonnet,haiku' };

const spawn = (tool_input, env = MAX) =>
  run('model-ladder-gate.js', { tool_name: 'Agent', tool_input }, env);

const ctx = (r) => json(r.stdout)?.hookSpecificOutput?.additionalContext || '';
const denial = (r) => {
  const o = json(r.stdout)?.hookSpecificOutput;
  return o?.permissionDecision === 'deny' ? o.permissionDecisionReason : '';
};

describe('model-ladder-gate — it can finally FIELD the top model, not only refuse it', () => {
  test('a strategic architect spawn with no model is told the ladder resolves to fable', () => {
    const r = spawn({
      subagent_type: 'architect',
      description: 'design the migration strategy',
      prompt: 'novel greenfield architecture; name the trade-offs and the blast radius',
    });
    assert.equal(r.code, 0);
    assert.match(ctx(r), /fable/, 'the whole point of the ladder is that this says fable');
    assert.match(ctx(r), /strategic-deep-reasoning/);
  });

  test('the same spawn on a plan without fable is told opus, not left silent', () => {
    const r = spawn(
      { subagent_type: 'planner', description: 'long-horizon migration strategy', prompt: 'adr' },
      PRO,
    );
    // The ladder text legitimately PRINTS "[fable -> opus -> sonnet]" — showing the whole
    // ladder is what makes the choice auditable. What must not happen is fable being the
    // model CHOSEN, so the assertion is on the resolved value, not on the word appearing.
    assert.match(ctx(r), /that is model: "opus"/, 'a Pro install still gets the best rung it HAS');
    assert.doesNotMatch(ctx(r), /model: "fable"/, 'never CHOOSE a model this install cannot field');
  });

  test('routine architect work is NOT promoted to fable', () => {
    // The expensive mirror of the original defect: a loose trigger here would field the
    // priciest model on every rename.
    const r = spawn({ subagent_type: 'architect', description: 'rename a helper', prompt: 'tidy this' });
    assert.doesNotMatch(ctx(r), /fable/i);
    assert.match(ctx(r), /deep-review-general/);
  });

  test('a spawn already on the right rung says nothing at all', () => {
    const r = spawn({ subagent_type: 'architect', description: 'novel architecture trade-offs', model: 'fable' });
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '', 'a hook that comments on correct calls is a per-spawn tax');
  });
});

describe('model-ladder-gate — Fable stays off the security ladder', () => {
  test('a security reviewer asking for fable is refused, with the reason', () => {
    const r = spawn({ subagent_type: 'security-reviewer', model: 'fable', prompt: 'audit auth' });
    const why = denial(r);
    assert.ok(why, 'this is the one unambiguous policy violation, so it denies');
    assert.match(why, /classifiers refuse/i, 'say WHY, or the caller just retries');
    assert.match(why, /"opus"/, 'name the model to use instead');
  });

  test('every regulated reviewer is on the same excluded ladder', () => {
    for (const a of ['compliance-reviewer', 'payments-reviewer', 'health-reviewer', 'risk-reviewer']) {
      assert.ok(denial(spawn({ subagent_type: a, model: 'fable' })), `${a} should refuse fable`);
    }
  });

  test('a security reviewer with no model is pointed at opus', () => {
    const r = spawn({ subagent_type: 'security-reviewer', prompt: 'audit' });
    assert.match(ctx(r), /"opus"/);
    assert.doesNotMatch(ctx(r), /fable/i);
  });
});

describe('model-ladder-gate — cheap work stays off expensive models', () => {
  const CHEAP = [
    ['refactor-cleaner', 'sonnet'],
    ['go-build-resolver', 'sonnet'],
    ['build-error-resolver', 'sonnet'],
    ['Explore', 'haiku'],
    ['general-purpose', 'haiku'],
    ['doc-updater', 'haiku'],
  ];
  for (const [agent, expected] of CHEAP) {
    test(`${agent} resolves to ${expected}, not the top of the fleet`, () => {
      const r = spawn({ subagent_type: agent, prompt: 'do the thing' });
      assert.match(ctx(r), new RegExp(`"${expected}"`));
      assert.doesNotMatch(ctx(r), /fable/i, 'the ladder floors exist to stop exactly this');
    });
  }
});

describe('model-ladder-gate — it stays out of the way', () => {
  test('an agent type with no declared ladder is left alone', () => {
    const r = spawn({ subagent_type: 'some-plugin-agent', prompt: 'x' });
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('a non-Agent tool call is ignored', () => {
    const r = run('model-ladder-gate.js', { tool_name: 'Bash', tool_input: { command: 'ls' } }, MAX);
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('off disables it entirely', () => {
    const r = spawn({ subagent_type: 'security-reviewer', model: 'fable' }, { ...MAX, CLAUDE_MODEL_LADDER: 'off' });
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '');
  });

  test('degrades safely on empty and malformed stdin', () => {
    assert.equal(run('model-ladder-gate.js', '').code, 0);
    assert.equal(run('model-ladder-gate.js', 'not json').code, 0);
  });

  test('falls back to the documented default when the availability file is absent', () => {
    // An absent availability file is a valid install state, and the documented default
    // excludes fable. Getting this wrong would field fable on installs that lack it.
    //
    // This must be driven by pointing HOME at a directory with no .claude/.local — an
    // earlier version of this test passed a whitespace override instead, which is simply
    // "no override" and therefore read the real file and resolved fable. It asserted the
    // opposite of what it claimed to test.
    const r = spawn(
      { subagent_type: 'architect', description: 'novel greenfield architecture trade-offs' },
      { HOME: join(tmpdir(), `no-council-home-${process.pid}`), CLAUDE_MODEL_AVAILABILITY: '' },
    );
    assert.equal(r.code, 0);
    assert.match(ctx(r), /that is model: "opus"/, 'default is opus/sonnet/haiku — fable is opt-in');
    assert.doesNotMatch(ctx(r), /model: "fable"/);
  });
});

describe('model-ladder-gate — strict mode', () => {
  test('strict refuses an under-provisioned strategic spawn', () => {
    const r = spawn(
      { subagent_type: 'planner', description: 'novel greenfield architecture, hardest trade-offs' },
      { ...MAX, CLAUDE_MODEL_LADDER: 'strict' },
    );
    assert.match(denial(r), /fable/);
    assert.match(denial(r), /Re-spawn/);
  });

  test('strict still leaves cheap work advisory, not blocked', () => {
    const r = spawn({ subagent_type: 'Explore', prompt: 'find it' }, { ...MAX, CLAUDE_MODEL_LADDER: 'strict' });
    assert.equal(denial(r), '', 'blocking every search spawn would make strict unusable');
    assert.match(ctx(r), /"haiku"/);
  });
});

describe('model-ladder-gate — the PreModelSwitch half still behaves', () => {
  test('blocks a switch to Fable during security work', () => {
    const r = run('model-ladder-gate.js', { to_model: 'claude-fable-5-1', prompt: 'review the auth credential flow' }, MAX);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /BLOCKED/);
  });

  test('allows a switch to Fable on ordinary work', () => {
    const r = run('model-ladder-gate.js', { to_model: 'claude-fable-5-1', prompt: 'refactor this parser' }, MAX);
    assert.equal(r.code, 0);
  });

  test('ignores a switch to any other model', () => {
    const r = run('model-ladder-gate.js', { to_model: 'claude-opus-5', prompt: 'audit the security of auth' }, MAX);
    assert.equal(r.code, 0);
  });
});
