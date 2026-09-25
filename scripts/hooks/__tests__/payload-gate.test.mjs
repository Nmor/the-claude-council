// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// Tests for the payload gate and its marker.
//
// validate-payloads-before-coding.md had no enforcement at all, and it is the rule that
// caught this programme's most expensive near-miss. These cases pin both halves: the gate
// must fire when a shape is being assumed, and must stay silent on everything else — a
// decoder is written often, and a gate that cries on ordinary work gets switched off.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { run, uniq, markerExists, cleanup, advice, said } from './helpers.mjs';

const FIRED = /PAYLOAD GATE/;

const edit = (file, content, sid, env = {}) =>
  run('payload-gate.js', { session_id: sid, tool_name: 'Write',
    tool_input: { file_path: file, content } }, env);

const ranCommand = (command, sid) =>
  run('payload-marker.js', { session_id: sid, prompt_id: 'p', tool_name: 'Bash',
    tool_input: { command } });

const PARSES_RESPONSE =
  'func (c *Client) Get() error {\n' +
  '\tresp, err := http.Get(c.base + "/things")\n' +
  '\tif err != nil { return err }\n' +
  '\tvar out ThingPage\n' +
  '\treturn json.Unmarshal(body, &out)\n}';

describe('payload-gate.js — a wire shape must be confirmed, not assumed', () => {
  test('fires when a provider response is decoded with no payload evidence', () => {
    const sid = uniq('sid');
    const r = edit('/p/internal/provider/client.go', PARSES_RESPONSE, sid);
    assert.match(advice(r), FIRED);
    cleanup(`claude-council-payload-${sid}`);
  });

  test('stays silent once a live call has been made this session', () => {
    const sid = uniq('sid');
    ranCommand('curl -sS https://api.example.com/v1/things', sid);
    assert.equal(markerExists(`claude-council-payload-${sid}`), true, 'the marker must exist');
    const r = edit('/p/internal/provider/client.go', PARSES_RESPONSE, sid);
    assert.doesNotMatch(said(r), FIRED);
    cleanup(`claude-council-payload-${sid}`);
  });

  // Reading our own source tells you what WE believe the shape is — which is the belief the
  // rule exists to check. It must not count as evidence.
  test('grepping our own code is not payload evidence', () => {
    const sid = uniq('sid');
    ranCommand('grep -rn ThingPage ./internal', sid);
    assert.equal(markerExists(`claude-council-payload-${sid}`), false);
    const r = edit('/p/internal/provider/client.go', PARSES_RESPONSE, sid);
    assert.match(advice(r), FIRED, 'a grep must not silence the gate');
    cleanup(`claude-council-payload-${sid}`);
  });

  test('a fetched schema document counts as evidence', () => {
    const sid = uniq('sid');
    ranCommand('curl -sS https://x.example.com/openapi.document.json -o spec.json', sid);
    assert.equal(markerExists(`claude-council-payload-${sid}`), true);
    cleanup(`claude-council-payload-${sid}`);
  });

  test('never blocks by default, however suspicious', () => {
    const sid = uniq('sid');
    assert.equal(edit('/p/internal/provider/client.go', PARSES_RESPONSE, sid).code, 0);
    cleanup(`claude-council-payload-${sid}`);
  });

  test('blocks when explicitly set to block', () => {
    const sid = uniq('sid');
    const r = edit('/p/internal/provider/client.go', PARSES_RESPONSE, sid,
      { CLAUDE_PAYLOAD_GATE: 'block' });
    assert.equal(r.code, 2);
    cleanup(`claude-council-payload-${sid}`);
  });

  test('respects its off switch', () => {
    const sid = uniq('sid');
    const r = edit('/p/internal/provider/client.go', PARSES_RESPONSE, sid,
      { CLAUDE_PAYLOAD_GATE: 'off' });
    assert.doesNotMatch(said(r), FIRED);
    cleanup(`claude-council-payload-${sid}`);
  });
});

describe('payload-gate.js — it must not cry on ordinary work', () => {
  const quiet = (file, content) => {
    const sid = uniq('sid');
    const r = edit(file, content, sid);
    cleanup(`claude-council-payload-${sid}`);
    return !FIRED.test(said(r));
  };

  test('parsing our own config file is not an external payload', () => {
    assert.equal(quiet('/p/internal/config/load.go',
      'var cfg Config\nreturn json.Unmarshal(raw, &cfg)'), true);
  });

  test('a test file is where a confirmed shape gets recorded, not gated', () => {
    assert.equal(quiet('/p/internal/provider/client_test.go', PARSES_RESPONSE), true);
  });

  test('a fixture path is not gated', () => {
    assert.equal(quiet('/p/internal/provider/testdata/loader.go', PARSES_RESPONSE), true);
  });

  test('a non-source file is ignored', () => {
    assert.equal(quiet('/p/README.md', PARSES_RESPONSE), true);
  });

  test('decoding with no network response in sight is ignored', () => {
    assert.equal(quiet('/p/internal/provider/util.go',
      'var m map[string]any\njson.Unmarshal(literalBytes, &m)'), true);
  });
});

describe('payload-marker.js — only real looking counts', () => {
  const counts = (command) => {
    const sid = uniq('sid');
    ranCommand(command, sid);
    const got = markerExists(`claude-council-payload-${sid}`);
    cleanup(`claude-council-payload-${sid}`);
    return got;
  };

  for (const c of ['curl -sS https://api.example.com/v1/x',
                   'wget -qO- https://api.example.com/spec.json',
                   'grpcurl -plaintext host:9090 list',
                   'openssl s_client -connect host:443']) {
    test(`counts: ${c.split(' ')[0]}`, () => assert.equal(counts(c), true));
  }

  for (const c of ['grep -rn Thing ./internal', 'go test ./...', 'ls testdata/',
                   'cat internal/provider/client.go']) {
    test(`does not count: ${c.split(' ')[0]}`, () => assert.equal(counts(c), false));
  }
});
