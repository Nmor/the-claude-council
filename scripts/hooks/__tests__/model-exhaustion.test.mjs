// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// Tests for automatic model switching when a tier hits its PLAN limit.
//
// Claude Code's fallbackModel skips rate-limit and billing errors, so before this the Council
// kept spawning on an exhausted tier until a person ran /model. Each test below names the
// failure it prevents. Every test gets its own record file; the real one is never touched.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { run, json, uniq } from './helpers.mjs';

const env = () => ({
  CLAUDE_MODEL_EXHAUSTED_FILE: join(tmpdir(), `${uniq('exhausted')}.json`),
  CLAUDE_MODEL_AVAILABILITY: 'opus,sonnet,haiku,fable',
});
const record = (e) => (existsSync(e.CLAUDE_MODEL_EXHAUSTED_FILE)
  ? JSON.parse(readFileSync(e.CLAUDE_MODEL_EXHAUSTED_FILE, 'utf8')) : {});
const seed = (e, obj) => writeFileSync(e.CLAUDE_MODEL_EXHAUSTED_FILE, JSON.stringify(obj));
const mark = (e, tier) => run('model-exhaustion-marker.js',
  { hook_event_name: 'StopFailure', error_type: 'rate_limit', error_message: `You've hit your ${tier} limit` }, e);
const spawn = (e, tool_input) => run('model-ladder-gate.js', { tool_name: 'Agent', tool_input }, e);
const out = (r) => json(r.stdout)?.hookSpecificOutput || {};
const STRATEGIC = { subagent_type: 'architect', description: 'novel architecture', prompt: 'trade-offs' };

describe('a tier that hits its plan limit is routed around automatically', () => {
  test('a failed turn naming the Fable limit marks fable', () => {
    const e = env();
    assert.equal(mark(e, 'Fable').code, 0);
    assert.ok(record(e).fable, 'without the record, every spawn keeps asking for fable');
  });

  test('a spawn that asks for the exhausted tier is denied and told the rung to use', () => {
    const e = env();
    mark(e, 'Fable');
    const o = out(spawn(e, { ...STRATEGIC, model: 'fable' }));
    assert.equal(o.permissionDecision, 'deny', 'letting it through only buys a limit error');
    assert.match(o.permissionDecisionReason, /model: "opus"/);
  });

  test('a spawn with no model is advised the fallback and told why', () => {
    const e = env();
    mark(e, 'Fable');
    const ctx = out(spawn(e, STRATEGIC)).additionalContext || '';
    assert.match(ctx, /model: "opus"/);
    assert.match(ctx, /plan limit reached: fable/, 'a silent downgrade is a no-silent-failures violation');
  });

  test('an exhausted rung falls UP, not down: sonnet out sends a build fix to opus, not haiku', () => {
    const e = env();
    mark(e, 'Sonnet');
    const o = out(spawn(e, { subagent_type: 'build-error-resolver', model: 'sonnet' }));
    assert.match(o.permissionDecisionReason, /model: "opus"/, 'quality must never absorb an outage');
  });

  test('falling up never puts fable on the security ladder', () => {
    const e = env();
    mark(e, 'Opus');
    const o = out(spawn(e, { subagent_type: 'security-reviewer', model: 'opus' }));
    assert.match(o.permissionDecisionReason, /model: "sonnet"/, 'fable refuses security work');
  });

  test('a session or weekly limit marks nothing, because every model is out', () => {
    const e = env();
    run('model-exhaustion-marker.js',
      { hook_event_name: 'StopFailure', error_type: 'rate_limit', error_message: "You've hit your weekly limit" }, e);
    assert.deepEqual(record(e), {}, 'marking a tier here would misroute to a model that also fails');
  });

  test('a spawn that dies on a named limit marks that tier', () => {
    const e = env();
    run('model-exhaustion-marker.js', { hook_event_name: 'PostToolUseFailure', tool_name: 'Agent',
      tool_input: { model: 'opus' }, error: "You've hit your Opus limit · resets 5pm" }, e);
    assert.ok(record(e).opus);
  });

  test('a successful spawn on the tier clears it, so the ladder returns to its first choice', () => {
    const e = env();
    mark(e, 'Fable');
    run('model-exhaustion-marker.js', { hook_event_name: 'PostToolUse', tool_name: 'Agent',
      tool_input: { model: 'fable' }, tool_response: { content: 'ok' } }, e);
    assert.equal(record(e).fable, undefined, 'a stale mark keeps paying for the fallback');
  });

  test('a successful main turn clears the tier that answered, not one an Agent call mentioned', () => {
    const e = env();
    seed(e, { fable: { at: Date.now() }, opus: { at: Date.now() } });
    const t = join(tmpdir(), `${uniq('transcript')}.jsonl`);
    writeFileSync(t, [
      JSON.stringify({ type: 'assistant', message: { model: 'claude-fable-5-1', content: [
        { type: 'tool_use', name: 'Agent', input: { model: 'opus' } }] } }),
      JSON.stringify({ type: 'user', message: { content: 'tool result' } }),
    ].join('\n'));
    run('model-exhaustion-marker.js', { hook_event_name: 'Stop', transcript_path: t }, e);
    assert.equal(record(e).fable, undefined);
    assert.ok(record(e).opus, 'grepping for "model" would have cleared opus here');
  });

  test('a record older than the plan window is ignored', () => {
    const e = env();
    seed(e, { fable: { at: Date.now() - 6 * 60 * 60 * 1000 } });
    assert.equal(out(spawn(e, { ...STRATEGIC, model: 'fable' })).permissionDecision, undefined);
  });

  test('CLAUDE_MODEL_LADDER=off records nothing', () => {
    const e = { ...env(), CLAUDE_MODEL_LADDER: 'off' };
    mark(e, 'Fable');
    assert.deepEqual(record(e), {});
  });
});
