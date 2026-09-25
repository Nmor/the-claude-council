// Size budget: 34 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the six session-lifecycle hooks.
//
// These hooks are not gates: none of them may block, and none of them may throw. A
// PreToolUse gate that crashes costs one tool call; a lifecycle hook that crashes takes
// the compaction — and with it the session's durable state — down with it. So the
// degradation cases below (missing files, unwritable home, empty stdin, corrupt input)
// carry as much weight here as the happy paths, and every hook is exercised against all
// four.
//
// Two defects were found writing this and FIXED rather than pinned, per
// functional-test-coverage.md rule 5. Both are pinned by a named test below:
//   - pre-compact-council-brief.js crashed with an uncaught ENOTDIR/EACCES and exit 1
//     when ~/.claude/sessions could not be created.
//   - post-compact-memory-reload.js looked up ~/.claude/projects by the cwd's BASENAME,
//     but Claude Code keys that directory by the mangled FULL path, so the global
//     project-memory pointer never resolved for any real workspace.
//
// Unwritable paths are simulated with ENOTDIR (a HOME whose parent is a regular file)
// rather than chmod 000: chmod does not stop root, and a mode-500 directory left behind
// by a failed run breaks the next one's cleanup.
import { execFileSync } from 'node:child_process';
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, utimesSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run, uniq, advice, said } from './helpers.mjs';

const BOXES = [];
after(() => { for (const b of BOXES) rmSync(b, { recursive: true, force: true }); });

// An isolated HOME. Every hook here resolves its state through os.homedir(), which on
// POSIX reads $HOME — so this keeps the tests out of the real ~/.claude/sessions.
function box() {
  const dir = mkdtempSync(join(tmpdir(), 'lifecycle-'));
  BOXES.push(dir);
  return dir;
}
const put = (file, body) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, body); return file; };
const read = (file) => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };
const ls = (dir) => { try { return readdirSync(dir); } catch { return []; } };

// A HOME that cannot be created: its parent is a file, so mkdir fails with ENOTDIR on
// every platform and for every user.
function unwritableHome() {
  const dir = box();
  writeFileSync(join(dir, 'blocker'), 'not a directory');
  return join(dir, 'blocker', 'home');
}

// The hooks read cwd from process.cwd(), which spawnSync inherits. `run` takes no cwd,
// so borrow the runner's and put it back.
function runIn(dir, hook, payload, env = {}) {
  const prev = process.cwd();
  process.chdir(dir);
  try { return run(hook, payload, env); } finally { process.chdir(prev); }
}

const sessions = (home) => join(home, '.claude', 'sessions');
const sid = () => uniq('S').replace(/-/g, '').slice(-8);
const BLANK_TEMPLATE = '# Session: x\n**Last Updated:** 00:00\n\n---\n\n## Current State\n\n[Session context goes here]\n\n### Completed\n- [ ]\n\n### In Progress\n- [ ]\n\n### Notes for Next Session\n-\n\n### Context to Load\n```\n[relevant files]\n```';

/* ────────────────────────────── session-start.js ────────────────────────────── */

describe('session-start.js — carries the last session forward without wasting context', () => {
  test('puts the previous session summary on stdout, where the next session reads it', () => {
    const home = box();
    put(join(sessions(home), '2026-09-21-aa-session.tmp'), '## Session Summary\n### Tasks\n- seed the dispatch permission\n');
    const r = run('session-start.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    assert.match(r.stdout, /Previous session summary:/);
    assert.match(r.stdout, /seed the dispatch permission/, 'the actual content must reach stdout, not just the header');
  });

  // The false-positive half: injecting the untouched template spends context to say nothing.
  test('stays silent for a session file that is still the blank template', () => {
    const home = box();
    put(join(sessions(home), '2026-09-21-bb-session.tmp'), BLANK_TEMPLATE);
    const r = run('session-start.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '', 'an empty template must not be injected');
  });

  test('ignores a session file older than the seven-day window', () => {
    const home = box();
    const f = put(join(sessions(home), '2026-01-01-old-session.tmp'), '## Session Summary\n- ancient work\n');
    const eightDaysAgo = Date.now() / 1000 - 8 * 86400;
    utimesSync(f, eightDaysAgo, eightDaysAgo);
    const r = run('session-start.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '', 'stale context is worse than none');
  });

  test('injects the newest session when several are in the window', () => {
    const home = box();
    const older = put(join(sessions(home), '2026-09-20-old-session.tmp'), '## Session Summary\n- YESTERDAY MARKER\n');
    utimesSync(older, Date.now() / 1000 - 86400, Date.now() / 1000 - 86400);
    put(join(sessions(home), '2026-09-21-new-session.tmp'), '## Session Summary\n- TODAY MARKER\n');
    const r = run('session-start.js', {}, { HOME: home });
    assert.match(r.stdout, /TODAY MARKER/);
    assert.doesNotMatch(r.stdout, /YESTERDAY MARKER/, 'only the latest session should be carried forward');
  });

  test('starts a first-ever session cleanly instead of failing on the missing directory', () => {
    const home = box();
    const r = run('session-start.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '');
    assert.ok(existsSync(sessions(home)), 'it should create the sessions dir it will later write to');
  });

  test('does not take the session down when HOME cannot be written', () => {
    const r = run('session-start.js', {}, { HOME: unwritableHome() });
    assert.equal(r.code, 0, 'a lifecycle hook that exits non-zero on an unwritable disk fails the session');
  });

  for (const [label, payload] of [['empty', ''], ['malformed', 'not json at all'], ['an array', '[1,2,3]']]) {
    test(`exits 0 on ${label} stdin`, () => {
      assert.equal(run('session-start.js', payload, { HOME: box() }).code, 0);
    });
  }
});

/* ─────────────────────────────── session-end.js ─────────────────────────────── */

const transcript = (dir, lines) => put(join(dir, 'transcript.jsonl'), lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n');
const userMsg = (text) => ({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } });
const toolUse = (name, input) => ({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name, input }] } });
const endFile = (home) => join(sessions(home), ls(sessions(home)).find((f) => f.endsWith('-session.tmp')) || 'none');

describe('session-end.js — what the next session inherits', () => {
  test('writes the task the user actually asked for into the session file', () => {
    const home = box(), work = box();
    const t = transcript(work, [userMsg('seed the dispatch report permission')]);
    const r = run('session-end.js', { transcript_path: t }, { HOME: home, CLAUDE_SESSION_ID: sid() });
    assert.equal(r.code, 0);
    assert.match(read(endFile(home)), /seed the dispatch report permission/);
  });

  test('records files that were EDITED, not every file that was merely opened', () => {
    const home = box(), work = box();
    const t = transcript(work, [
      userMsg('fix the boot config'),
      toolUse('Read', { file_path: '/repo/only-read.go' }),
      toolUse('Edit', { file_path: '/repo/really-edited.go' }),
    ]);
    run('session-end.js', { transcript_path: t }, { HOME: home, CLAUDE_SESSION_ID: sid() });
    const body = read(endFile(home));
    const modified = body.split('### Files Modified')[1]?.split('###')[0] ?? '';
    assert.match(modified, /really-edited\.go/);
    assert.doesNotMatch(modified, /only-read\.go/, 'a Read is not a modification — this list drives the next session\'s attention');
    assert.match(body, /Read/, 'Read should still be listed under the tools used');
  });

  // Tool results arrive as role:user entries. Counting them makes every session look like
  // a hundred tasks and buries the real ones.
  test('does not mistake tool results for things the user asked for', () => {
    const home = box(), work = box();
    const t = transcript(work, [
      userMsg('run the tests'),
      { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok 42 tests' }] } },
    ]);
    run('session-end.js', { transcript_path: t }, { HOME: home, CLAUDE_SESSION_ID: sid() });
    assert.match(read(endFile(home)), /Total user messages: 1\b/, 'a tool result is not a user message');
  });

  test('keeps the rest of the session when one transcript line is corrupt', () => {
    const home = box(), work = box();
    const t = transcript(work, [userMsg('first real task'), '{ this line is broken', userMsg('second real task')]);
    const r = run('session-end.js', { transcript_path: t }, { HOME: home, CLAUDE_SESSION_ID: sid() });
    assert.equal(r.code, 0);
    const body = read(endFile(home));
    assert.match(body, /first real task/);
    assert.match(body, /second real task/, 'one bad line must not discard the lines after it');
    assert.match(r.stderr, /Skipped 1\/3/, 'a silently dropped line is a silent failure — it must be counted');
  });

  test('still leaves a session file when the transcript path does not exist', () => {
    const home = box();
    const r = run('session-end.js', { transcript_path: join(box(), 'gone.jsonl') }, { HOME: home, CLAUDE_SESSION_ID: sid() });
    assert.equal(r.code, 0);
    assert.match(read(endFile(home)), /\[Session context goes here\]/, 'the blank template is the honest fallback');
    assert.match(r.stderr, /Transcript not found/, 'the miss must be visible, not silent');
  });

  test('updates the existing session file instead of leaving two for one session', () => {
    const home = box(), work = box(), id = sid();
    run('session-end.js', {}, { HOME: home, CLAUDE_SESSION_ID: id });
    const t = transcript(work, [userMsg('the real task, recorded on the second pass')]);
    run('session-end.js', { transcript_path: t }, { HOME: home, CLAUDE_SESSION_ID: id });
    const files = ls(sessions(home)).filter((f) => f.endsWith('-session.tmp'));
    assert.equal(files.length, 1, 'one session, one file');
    const body = read(join(sessions(home), files[0]));
    assert.match(body, /the real task, recorded on the second pass/);
    assert.doesNotMatch(body, /\[Session context goes here\]/, 'the real summary must replace the placeholder, not sit beside it');
  });

  test('does not take the session down when the sessions directory cannot be created', () => {
    const r = run('session-end.js', { transcript_path: 'irrelevant' }, { HOME: unwritableHome(), CLAUDE_SESSION_ID: sid() });
    assert.equal(r.code, 0);
  });

  for (const [label, payload] of [['empty', ''], ['malformed', '<<<not json>>>'], ['a bare string', '"hello"']]) {
    test(`exits 0 on ${label} stdin and still records the session`, () => {
      const home = box();
      const r = run('session-end.js', payload, { HOME: home, CLAUDE_SESSION_ID: sid() });
      assert.equal(r.code, 0);
      assert.equal(ls(sessions(home)).filter((f) => f.endsWith('-session.tmp')).length, 1);
    });
  }
});

/* ─────────────────────────────── pre-compact.js ─────────────────────────────── */

describe('pre-compact.js — the compaction seam has to be findable afterwards', () => {
  test('records the compaction so it can be audited after the fact', () => {
    const home = box();
    const r = run('pre-compact.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    assert.match(read(join(sessions(home), 'compaction-log.txt')), /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] Context compaction triggered/);
  });

  test('marks the active session file at the point context was lost', () => {
    const home = box();
    const f = put(join(sessions(home), '2026-09-21-cc-session.tmp'), '# Session\nreal work above\n');
    run('pre-compact.js', {}, { HOME: home });
    const body = read(f);
    assert.match(body, /real work above/, 'the annotation must append, never overwrite the session');
    assert.match(body, /\[Compaction occurred at \d{2}:\d{2}\]/);
  });

  test('appends across compactions rather than overwriting the previous entry', () => {
    const home = box();
    run('pre-compact.js', {}, { HOME: home });
    run('pre-compact.js', {}, { HOME: home });
    const lines = read(join(sessions(home), 'compaction-log.txt')).trim().split('\n');
    assert.equal(lines.length, 2, 'a log that keeps only the last compaction cannot show a pattern');
  });

  // The near-miss: no session file is the normal first-touch state, not an error.
  test('logs the compaction even when there is no session file to annotate', () => {
    const home = box();
    const r = run('pre-compact.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    assert.ok(existsSync(join(sessions(home), 'compaction-log.txt')));
    assert.deepEqual(ls(sessions(home)).filter((f) => f.endsWith('.tmp')), [], 'it must not invent a session file');
  });

  test('does not take the compaction down when the sessions directory cannot be created', () => {
    assert.equal(run('pre-compact.js', {}, { HOME: unwritableHome() }).code, 0);
  });

  for (const [label, payload] of [['empty', ''], ['malformed', 'nonsense{'], ['null', 'null']]) {
    test(`exits 0 on ${label} stdin`, () => {
      assert.equal(run('pre-compact.js', payload, { HOME: box() }).code, 0);
    });
  }
});

/* ───────────────────── post-compact-memory-reload.js ───────────────────── */

describe('post-compact-memory-reload.js — points at the state the summary just lost', () => {
  const COMPACT = { hook_event_name: 'SessionStart', source: 'compact' };
  // A project: its memory index where Claude Code keeps it, optionally naming a plan.
  const proj = ({ index, plan } = {}) => {
    const home = box(), cwd = realpathSync(box());
    const mem = join(home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'), 'memory', 'MEMORY.md');
    const planFile = plan ? put(join(home, '.claude', 'plans', 'mine.md'), plan) : null;
    if (index !== undefined) put(mem, `${index}${planFile ? `\nActive plan: ${planFile}\n` : ''}`);
    return { home, cwd, mem, planFile };
  };
  const reload = (p, extra = {}) => run('post-compact-memory-reload.js', { ...COMPACT, cwd: p.cwd, ...extra }, { HOME: p.home });

  // DEFECT (fixed): it wrote to stderr from PostCompact, and neither reaches Claude — the
  // pointer was dropped on every compaction. It must arrive as SessionStart additionalContext.
  test("reaches Claude as SessionStart context, naming this project's memory index and plan", () => {
    const p = proj({ index: '# mem', plan: '# plan' });
    const r = reload(p);
    assert.equal(r.code, 0);
    assert.equal(r.stderr, '', 'stderr on exit 0 is never shown to Claude');
    const o = JSON.parse(r.stdout);
    assert.equal(o.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.ok(advice(r).includes(p.mem), advice(r));
    assert.ok(advice(r).includes(p.planFile), advice(r));
  });

  test("points at the plan this project names, never the newest plan in the shared folder", () => {
    const p = proj({ index: '# mem', plan: '# plan' });
    utimesSync(p.planFile, Date.now() / 1000 - 86400, Date.now() / 1000 - 86400);
    put(join(p.home, '.claude', 'plans', 'zzz-another-project.md'), '# newer, elsewhere');
    assert.doesNotMatch(advice(reload(p)), /another-project/);
  });

  test('a subdirectory of the repo gets the same memory Claude Code loads there', () => {
    const p = proj({ index: '# mem' });
    execFileSync('git', ['-C', p.cwd, 'init', '-q']);
    const sub = join(p.cwd, 'pkg');
    mkdirSync(sub);
    assert.ok(advice(reload(p, { cwd: sub })).includes(p.mem));
  });

  // This fires on every compaction, so "nothing to reload" has to cost nothing.
  test('stays completely silent when there is nothing to reload', () => {
    const r = reload(proj());
    assert.equal(r.code, 0);
    assert.equal(r.stderr.trim(), '');
    assert.equal(r.stdout.trim(), '');
  });

  test('says nothing on a session start that is not a compaction', () => {
    const p = proj({ index: '# mem' });
    assert.equal(reload(p, { source: 'startup' }).stdout.trim(), '', 'memory is loaded natively at startup');
  });

  test('gives paths, not file contents, so it does not re-spend the context compaction just freed', () => {
    const p = proj({ index: '# mem\nBODY-THAT-MUST-NOT-BE-DUMPED\n'.repeat(50), plan: '# plan' });
    const text = advice(reload(p));
    assert.doesNotMatch(text, /BODY-THAT-MUST-NOT-BE-DUMPED/);
    assert.ok(text.length < 600, `the pointer should stay tiny, got ${text.length} chars`);
  });

  test('a named plan that no longer exists does not cost the memory pointer', () => {
    const p = proj({ index: '# mem', plan: '# plan' });
    rmSync(p.planFile);
    const text = advice(reload(p));
    assert.ok(text.includes(p.mem));
    assert.ok(!text.includes(p.planFile));
  });

  test('exits 0 on empty stdin', () => {
    assert.equal(run('post-compact-memory-reload.js', '', { HOME: box() }).code, 0);
  });

  test('exits 0 and says it skipped when stdin is not JSON', () => {
    const r = run('post-compact-memory-reload.js', 'not json', { HOME: box() });
    assert.equal(r.code, 0);
    assert.match(r.stderr, /skipped/, 'a swallowed parse failure with no signal is the silent failure this rule bans');
  });
});

/* ───────────────────── pre-compact-council-brief.js ───────────────────── */

describe('pre-compact-council-brief.js — the preserve-list the summariser reads', () => {
  test('writes a brief naming every core division, so nothing is silently summarised away', () => {
    const home = box();
    const r = runIn(box(), 'pre-compact-council-brief.js', {}, { HOME: home });
    assert.equal(r.code, 0);
    const file = ls(sessions(home)).find((f) => f.endsWith('-precompact-brief.md'));
    assert.ok(file, 'no brief was written');
    const body = read(join(sessions(home), file));
    for (const d of ['D1 — Architecture', 'D2 — Implementation', 'D3 — Quality', 'D4 — Security', 'D5 — Testing']) {
      assert.match(body, new RegExp(d.replace('—', '.')), `${d} missing from the brief`);
    }
  });

  test('appends the brief to the active session file, which is the only place the summariser sees it', () => {
    const home = box();
    const tmp = put(join(sessions(home), '2026-09-21-dd-session.tmp'), '# Session\nprior content\n');
    runIn(box(), 'pre-compact-council-brief.js', {}, { HOME: home });
    const body = read(tmp);
    assert.match(body, /prior content/, 'the append must not clobber the session');
    assert.match(body, /Council pre-compact preservation brief/, 'a brief only on disk never reaches the summariser');
  });

  test('appends to the newest session file when several exist', () => {
    const home = box();
    const stale = put(join(sessions(home), '2026-09-01-old-session.tmp'), 'old\n');
    utimesSync(stale, Date.now() / 1000 - 86400, Date.now() / 1000 - 86400);
    const current = put(join(sessions(home), '2026-09-21-new-session.tmp'), 'new\n');
    runIn(box(), 'pre-compact-council-brief.js', {}, { HOME: home });
    assert.match(read(current), /preservation brief/);
    assert.doesNotMatch(read(stale), /preservation brief/);
  });

  test('CLAUDE_COUNCIL_BRIEF=off writes nothing at all', () => {
    const home = box();
    const r = runIn(box(), 'pre-compact-council-brief.js', {}, { HOME: home, CLAUDE_COUNCIL_BRIEF: 'off' });
    assert.equal(r.code, 0);
    assert.deepEqual(ls(sessions(home)), [], 'the off switch must actually switch it off');
    assert.equal(r.stderr.trim(), '');
  });

  test('any other value of CLAUDE_COUNCIL_BRIEF leaves it on', () => {
    const home = box();
    runIn(box(), 'pre-compact-council-brief.js', {}, { HOME: home, CLAUDE_COUNCIL_BRIEF: 'on' });
    assert.ok(ls(sessions(home)).some((f) => f.endsWith('-precompact-brief.md')), 'only the documented "off" disables it');
  });

  // Replaces "summarises the newest plan file": plans for several projects share ~/.claude/plans,
  // so the newest one was often another project's, and it went into THIS project's brief.
  test("summarises the plan this project's memory names, never the newest plan in the shared folder", () => {
    const home = box(), cwd = realpathSync(box());
    const brief = () => read(join(sessions(home), ls(sessions(home)).filter((f) => f.endsWith('-brief.md')).sort().pop()));
    runIn(cwd, 'pre-compact-council-brief.js', {}, { HOME: home });
    assert.match(brief(), /names no active plan/);

    const mine = put(join(home, '.claude', 'plans', 'mine.md'), '# The active plan\n\n## Phase 3 — wiring\n\nPhase 2 verified green\n');
    put(join(home, '.claude', 'plans', 'other.md'), '# Another project entirely\n');
    utimesSync(mine, Date.now() / 1000 - 600, Date.now() / 1000 - 600); // the other plan is newer
    put(join(home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'), 'memory', 'MEMORY.md'), `# Memory Index\n\nActive plan: ${mine}\n`);
    rmSync(sessions(home), { recursive: true, force: true });
    runIn(cwd, 'pre-compact-council-brief.js', {}, { HOME: home });
    const body = brief();
    assert.match(body, /Title: The active plan/);
    assert.match(body, /Phase 3 . wiring/, 'the phase header is the one line the next turn most needs');
    assert.doesNotMatch(body, /Another project entirely/);
  });

  // Replaces "refreshes the workspace memory timestamp so SessionStart sees fresh state". That
  // pinned the defect: the hook rewrote "Last updated" without touching the content, so a stale
  // memory read as freshly maintained, the opposite of what the stamp claims.
  test('leaves a stale memory index byte-identical: a new timestamp on old content would be a false claim', () => {
    const home = box(), cwd = box();
    const original = '# Memory Index\n\n- an entry\n\n## Last updated\n1999-01-01\n';
    const mem = put(join(cwd, '.claude', 'memory', 'MEMORY.md'), original);
    runIn(cwd, 'pre-compact-council-brief.js', {}, { HOME: home });
    assert.equal(read(mem), original);
  });

  // The near-miss: a memory file with no "Last updated" heading must come back byte-identical.
  test('leaves a memory file without a Last-updated heading untouched', () => {
    const home = box(), cwd = box();
    const original = '# Memory Index\n\n- just entries, no timestamp heading\n';
    const mem = put(join(cwd, '.claude', 'memory', 'MEMORY.md'), original);
    runIn(cwd, 'pre-compact-council-brief.js', {}, { HOME: home });
    assert.equal(read(mem), original, 'a hook that rewrites user memory it does not understand is worse than one that does nothing');
  });

  // DEFECT (fixed): main() was unguarded, so mkdirSync on an unwritable ~/.claude/sessions
  // threw an uncaught exception — stack trace, exit 1 — from a PreCompact hook.
  test('exits 0 instead of throwing when the sessions directory cannot be created', () => {
    const r = runIn(box(), 'pre-compact-council-brief.js', {}, { HOME: unwritableHome() });
    assert.equal(r.code, 0, 'a PreCompact hook that throws takes the compaction with it');
    assert.doesNotMatch(r.stderr, /at Object\.<anonymous>|at main \(/, 'a stack trace in the transcript is the crash, not a report of it');
    assert.match(r.stderr, /skipped/, 'it must say it degraded rather than fail silently');
  });

  for (const [label, payload] of [['empty', ''], ['malformed', 'not json'], ['a huge blob', JSON.stringify({ junk: 'x'.repeat(50000) })]]) {
    test(`exits 0 on ${label} stdin`, () => {
      assert.equal(runIn(box(), 'pre-compact-council-brief.js', payload, { HOME: box() }).code, 0);
    });
  }
});

/* ────────────────────────────── suggest-compact.js ────────────────────────────── */

describe('suggest-compact.js — speaks at the checkpoint and nowhere else', () => {
  const tick = (env, times = 1) => {
    let last = { code: 0, stdout: '', stderr: '' };
    for (let i = 0; i < times; i++) last = run('suggest-compact.js', {}, env);
    return last;
  };
  const session = (extra = {}) => ({ TMPDIR: box(), CLAUDE_SESSION_ID: uniq('sc'), ...extra });
  const counter = (env) => join(env.TMPDIR, `claude-tool-count-${env.CLAUDE_SESSION_ID}`);

  test('suggests a compact once the threshold is reached', () => {
    const env = session({ COMPACT_THRESHOLD: '3' });
    const r = tick(env, 3);
    assert.match(advice(r), /3 tool calls reached/);
  });

  // The important half: a suggestion on every call is noise, and noise gets the hook removed.
  test('says nothing on the calls before the threshold', () => {
    const env = session({ COMPACT_THRESHOLD: '3' });
    assert.equal(said(tick(env, 1)).trim(), '');
    assert.equal(said(tick(env, 1)).trim(), '', 'call 2 of 3 must stay quiet');
  });

  test('says nothing on the call straight after the threshold', () => {
    const env = session({ COMPACT_THRESHOLD: '3' });
    tick(env, 3);
    assert.equal(said(tick(env, 1)).trim(), '', 'repeating on every call after the threshold is the same noise');
  });

  test('offers the next checkpoint 25 calls later, not sooner', () => {
    const env = session({ COMPACT_THRESHOLD: '3' });
    writeFileSync(counter(env), '26');
    assert.equal(said(tick(env, 1)).trim(), '', 'call 27 is not a checkpoint');
    writeFileSync(counter(env), '27');
    assert.match(advice(tick(env, 1)), /28 tool calls/);
  });

  test('counts each session separately, so one session cannot trigger another', () => {
    const shared = box();
    const a = { TMPDIR: shared, CLAUDE_SESSION_ID: uniq('a'), COMPACT_THRESHOLD: '2' };
    const b = { TMPDIR: shared, CLAUDE_SESSION_ID: uniq('b'), COMPACT_THRESHOLD: '2' };
    tick(a, 1);
    assert.equal(said(tick(b, 1)).trim(), '', "session B's first call must not inherit session A's count");
    assert.match(advice(tick(a, 1)), /2 tool calls reached/);
  });

  test('falls back to 50 rather than firing constantly when the threshold is not a number', () => {
    const env = session({ COMPACT_THRESHOLD: 'abc' });
    writeFileSync(counter(env), '5');
    assert.equal(said(tick(env, 1)).trim(), '', 'a garbage threshold must not collapse to "every call"');
    writeFileSync(counter(env), '49');
    assert.match(advice(tick(env, 1)), /50 tool calls reached/);
  });

  // Claude Code passes the session on stdin, not in the environment. Reading only the
  // environment put every session on the machine on one shared `default` counter.
  test('counts per session from the payload when the environment names no session', () => {
    const shared = box();
    const env = { TMPDIR: shared, CLAUDE_SESSION_ID: '', COMPACT_THRESHOLD: '2' };
    const a = uniq('a'), b = uniq('b');
    run('suggest-compact.js', { session_id: a }, env);
    assert.equal(said(run('suggest-compact.js', { session_id: b }, env)), '', "B's first call is B's first call");
    assert.match(advice(run('suggest-compact.js', { session_id: a }, env)), /2 tool calls reached/);
  });

  test('refuses a zero threshold, which would otherwise suggest a compact forever', () => {
    const env = session({ COMPACT_THRESHOLD: '0' });
    assert.equal(said(tick(env, 1)).trim(), '');
    assert.equal(read(counter(env)), '1');
  });

  test('restarts the count when the counter file is corrupt instead of crashing', () => {
    const env = session({ COMPACT_THRESHOLD: '3' });
    writeFileSync(counter(env), 'garbage');
    const r = tick(env, 1);
    assert.equal(r.code, 0);
    assert.equal(said(r).trim(), '');
    assert.equal(read(counter(env)), '1');
  });

  test('clamps an absurd counter value rather than trusting it', () => {
    const env = session({ COMPACT_THRESHOLD: '3' });
    writeFileSync(counter(env), '9'.repeat(30));
    tick(env, 1);
    assert.equal(read(counter(env)), '1', 'a 1e29 count would make every subsequent comparison meaningless');
  });

  test('stays out of the way when the temp directory cannot be written', () => {
    const r = tick({ TMPDIR: join(unwritableHome(), 'tmp'), CLAUDE_SESSION_ID: uniq('sc') });
    assert.equal(r.code, 0);
  });

  for (const [label, payload] of [['empty', ''], ['malformed', '}{'], ['a number', '42']]) {
    test(`exits 0 on ${label} stdin`, () => {
      assert.equal(run('suggest-compact.js', payload, session()).code, 0);
    });
  }
});
