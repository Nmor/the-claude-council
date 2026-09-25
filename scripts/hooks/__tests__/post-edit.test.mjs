// Size budget: 19 KB. Check: wc -c; gate: token-budget.mjs --check.
// Regression tests for the four PostToolUse per-edit hooks.
//
// PostToolUse runs AFTER the tool has already written the file, so none of these can block:
// whatever they find, the edit has landed. Their entire product is a line on stderr and an
// exit code of 0. That makes the false-positive half of each hook the important half — a
// per-edit hook that cries wolf on ordinary work gets switched off, and then it reports
// nothing at all. Every "stays silent" test below is guarding that.
//
// The suite drives the real binaries over stdin, like the harness does, rather than importing
// their internals — the contract is the process, not the function.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { run, advice, said } from './helpers.mjs';

// A throwaway workspace per fixture. Fixtures must live outside ~/.claude/scripts/hooks,
// because the UX-writing hook exempts its own tooling from its own rules.
const dirs = [];
const workspace = () => {
  const d = mkdtempSync(join(tmpdir(), 'post-edit-'));
  dirs.push(d);
  return d;
};
const fixture = (name, content) => {
  const p = join(workspace(), name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, 'utf8');
  return p;
};
process.on('exit', () => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

// An Edit payload exactly as Claude Code sends it after a successful write.
const edit = (hook, filePath, env = {}) =>
  run(hook, { tool_name: 'Edit', tool_input: { file_path: filePath } }, env);

const HOOKS = [
  'post-edit-format.js',
  'post-edit-typecheck.js',
  'post-edit-ux-writing.js',
  'post-edit-console-warn.js',
];

// ---------------------------------------------------------------------------
// The contract every one of them shares.
// ---------------------------------------------------------------------------

describe('every per-edit hook — a broken payload must not break the turn', () => {
  for (const hook of HOOKS) {
    test(`${hook} exits 0 on empty stdin instead of failing the tool call`, () => {
      assert.equal(run(hook, '').code, 0);
    });

    test(`${hook} exits 0 when stdin is not JSON at all`, () => {
      assert.equal(run(hook, 'not json {{{').code, 0);
    });

    test(`${hook} exits 0 when the payload carries no file_path`, () => {
      assert.equal(run(hook, { tool_name: 'Bash', tool_input: {} }).code, 0);
    });

    test(`${hook} exits 0 when the edited file no longer exists on disk`, () => {
      assert.equal(edit(hook, join(workspace(), 'deleted.ts')).code, 0);
    });

    // Each hook gets its own copy of the payload, so an echo passes nothing on; Claude Code
    // would read it as this hook's own JSON output instead.
    test(`${hook} leaves stdout empty when it has nothing to say`, () => {
      const payload = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '/nowhere/x.rb' } });
      assert.equal(run(hook, payload).stdout, '');
    });
  }
});

// ---------------------------------------------------------------------------
// post-edit-format.js — runs prettier over what was just written.
// ---------------------------------------------------------------------------

// Whether Prettier is installed decides which half of this hook's contract is under test,
// so the suite asks first. Assuming made the reformat test fail wherever Prettier was
// absent, hiding the real finding: the hook could not run AND said nothing.
const prettierAvailable = (() => {
  try {
    execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prettier', '--version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 20000,
    });
    return true;
  } catch {
    return false;
  }
})();

describe('post-edit-format.js — it formats what prettier owns and nothing else', () => {
  test('rewrites a JavaScript file that was saved badly spaced', { skip: !prettierAvailable && 'prettier is not installed here' }, () => {
    const f = fixture('a.js', 'const  a=1;;\nfunction  f( ){return    a}\n');
    const r = edit('post-edit-format.js', f);
    assert.equal(r.code, 0);
    assert.equal(readFileSync(f, 'utf8'), 'const a = 1;\nfunction f() {\n  return a;\n}\n');
  });

  // The other half, and the one that was missing. A formatter that cannot run must say so,
  // because "installed and working" and "absent, silently doing nothing" produced exactly
  // the same observable result before: an unchanged file and an empty stderr. That is how
  // this hook sat registered in settings.json formatting nothing for an unknown length of
  // time. It is still non-blocking — the notice is the whole product.
  test('says so when prettier cannot be run at all, instead of passing silently', { skip: prettierAvailable && 'prettier is installed here' }, () => {
    const f = fixture('c.js', 'const  a=1\n');
    const r = edit('post-edit-format.js', f);

    assert.equal(r.code, 0, 'a missing formatter never fails an edit that already landed');
    assert.match(
      advice(r),
      /prettier is not available/i,
      'an absent formatter is reported, not swallowed',
    );
    assert.equal(readFileSync(f, 'utf8'), 'const  a=1\n', 'and the file is left exactly as written');
  });

  // Once per session: the answer cannot change mid-session, and a notice repeated on every
  // single edit is a notice that gets ignored.
  test('reports an absent prettier once per session, not on every edit', { skip: prettierAvailable && 'prettier is installed here' }, () => {
    const sid = 'format-notice-' + process.pid;
    const first = run('post-edit-format.js', {
      tool_name: 'Edit',
      session_id: sid,
      tool_input: { file_path: fixture('d.js', 'const  a=1\n') },
    });
    const second = run('post-edit-format.js', {
      tool_name: 'Edit',
      session_id: sid,
      tool_input: { file_path: fixture('e.js', 'const  b=2\n') },
    });

    assert.match(advice(first), /prettier is not available/i);
    assert.equal(advice(second), '', 'the same session is told once');
  });

  test('leaves a Go file untouched — prettier does not own it and would mangle it', () => {
    const src = 'package  main\nfunc  main( ){}\n';
    const f = fixture('main.go', src);
    edit('post-edit-format.js', f);
    assert.equal(readFileSync(f, 'utf8'), src);
  });

  test('leaves a Python file untouched', () => {
    const src = 'def  f( ):\n    return   1\n';
    const f = fixture('m.py', src);
    edit('post-edit-format.js', f);
    assert.equal(readFileSync(f, 'utf8'), src);
  });

  test('honours a .prettierignore sitting beside the edited file', () => {
    const d = workspace();
    writeFileSync(join(d, '.prettierignore'), 'generated.js\n', 'utf8');
    const src = 'const  a=1\n';
    writeFileSync(join(d, 'generated.js'), src, 'utf8');
    edit('post-edit-format.js', join(d, 'generated.js'));
    assert.equal(
      readFileSync(join(d, 'generated.js'), 'utf8'),
      src,
      'a file the repo excluded must not be rewritten behind the author',
    );
  });

  test('says nothing on stderr when it formats — a reformat is not a finding', { skip: !prettierAvailable && 'prettier is not installed here' }, () => {
    const f = fixture('b.js', 'const  a=1\n');
    assert.equal(said(edit('post-edit-format.js', f)), '');
  });
});

// ---------------------------------------------------------------------------
// post-edit-typecheck.js — runs tsc in the nearest tsconfig dir, reports the edited file.
// ---------------------------------------------------------------------------

const tsProject = (files) => {
  const d = workspace();
  writeFileSync(
    join(d, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: true, noEmit: true, skipLibCheck: true }, include: ['*.ts'] }),
    'utf8',
  );
  for (const [name, content] of Object.entries(files)) writeFileSync(join(d, name), content, 'utf8');
  return d;
};

const BAD_TS = 'export const y: number = "not a number";\n';
const GOOD_TS = 'export const x: number = 1;\n';

describe('post-edit-typecheck.js — it reports the edited file, and only when tsc can run', () => {
  test('reports the type error the edit just introduced', () => {
    const d = tsProject({ 'main.ts': BAD_TS });
    const r = edit('post-edit-typecheck.js', join(d, 'main.ts'));
    assert.equal(r.code, 0, 'PostToolUse cannot block — the edit has already landed');
    assert.match(advice(r), /TypeScript errors in main\.ts/);
    assert.match(advice(r), /TS2322/, 'it must quote tsc, not just announce that tsc ran');
  });

  test('stays silent when the broken file is a different one from the edited file', () => {
    const d = tsProject({ 'other.ts': GOOD_TS, 'main.ts': BAD_TS });
    const r = edit('post-edit-typecheck.js', join(d, 'other.ts'));
    assert.equal(said(r), '', "another file's errors must not be pinned on this edit");
  });

  test('stays silent when the edited TypeScript file type-checks clean', () => {
    const d = tsProject({ 'main.ts': GOOD_TS });
    assert.equal(said(edit('post-edit-typecheck.js', join(d, 'main.ts'))), '');
  });

  test('does not run tsc for a JavaScript file', () => {
    const d = tsProject({ 'main.ts': BAD_TS });
    writeFileSync(join(d, 'app.js'), 'const a = 1;\n', 'utf8');
    assert.equal(said(edit('post-edit-typecheck.js', join(d, 'app.js'))), '');
  });

  test('stays silent when there is no tsconfig.json above the file', () => {
    const f = fixture('loose.ts', BAD_TS);
    const r = edit('post-edit-typecheck.js', f);
    assert.equal(r.code, 0);
    assert.equal(said(r), '', 'a stray .ts outside a project is not a compile target');
  });

  test('stays silent when the file was deleted between the edit and the check', () => {
    const d = tsProject({ 'main.ts': BAD_TS });
    const r = edit('post-edit-typecheck.js', join(d, 'gone.ts'));
    assert.equal(r.code, 0);
    assert.equal(said(r), '');
  });
});

// ---------------------------------------------------------------------------
// post-edit-ux-writing.js — the four AI-writing tells, over lib/ux-writing-rules.js.
// ---------------------------------------------------------------------------

const uxFires = (r, rule) => {
  assert.equal(r.code, 0, 'every UX-writing rule is a warning; none may block an edit');
  assert.match(advice(r), new RegExp(`\\[${rule}\\]`), `expected the ${rule} rule to name itself`);
};

describe('post-edit-ux-writing.js — it catches the four tells in copy a user reads', () => {
  test('flags an em-dash welding two clauses where the author never chose the punctuation', () => {
    const f = fixture('copy.js', 'export const t = "Your balance is low — top up to keep sending.";\n');
    uxFires(edit('post-edit-ux-writing.js', f), 'em-dash-connector');
  });

  test('flags a word before the dash that ends in a combining mark, not a base letter', () => {
    // Yoruba copy went undetected because "rẹ̀ — ó" ends in U+0300, not in the letter.
    const f = fixture('yo.js', 'export const t = "Balà̀sẹ̀ — top up.";\n');
    uxFires(edit('post-edit-ux-writing.js', f), 'em-dash-connector');
  });

  test('flags a buzzword that promises a feeling instead of naming a behaviour', () => {
    const f = fixture('copy.js', 'export const t = "Seamless payouts, best-in-class.";\n');
    uxFires(edit('post-edit-ux-writing.js', f), 'buzzword');
  });

  test('flags an opener that delays the sentence without adding to it', () => {
    const f = fixture('copy.js', 'export const t = "In today\'s fast-paced world, we pay you.";\n');
    uxFires(edit('post-edit-ux-writing.js', f), 'empty-opener');
  });

  test('flags the not-just-but contrast tic', () => {
    const f = fixture('copy.js', 'export const t = "Not just a wallet, but a financial life.";\n');
    uxFires(edit('post-edit-ux-writing.js', f), 'not-just-but');
  });

  test('scans a locale catalogue, where every value is a string somebody reads', () => {
    const f = fixture('locales/en.json', '{"low": "Your balance is low — top up to keep sending."}\n');
    uxFires(edit('post-edit-ux-writing.js', f), 'em-dash-connector');
  });

  test('names the file and the line so the author can find the sentence', () => {
    const f = fixture('copy.js', 'const a = 1;\nexport const t = "Balance low — top up.";\n');
    const r = edit('post-edit-ux-writing.js', f);
    assert.match(advice(r), /copy\.js/);
    assert.match(advice(r), /L2 /, 'the line number must be the offending line, not the first one');
  });
});

describe('post-edit-ux-writing.js — the dashes it must NOT flag', () => {
  const silent = (name, content) => {
    const r = edit('post-edit-ux-writing.js', fixture(name, content));
    assert.equal(r.code, 0);
    assert.equal(said(r), '', `${name}: nothing here is a sentence to re-punctuate`);
  };

  test('a dash dividing two rendered values has no sentence to fix', () => {
    silent('row.jsx', 'export const R = () => <span>{log.status} — {log.date}</span>;\n');
  });

  test('a lone dash standing in for an absent amount is a typographic convention', () => {
    silent('cell.js', 'export const empty = "—";\n');
  });

  test('a code comment is the author talking to engineers, not to a user', () => {
    silent('note.js', '// the retry budget — three attempts — is deliberate\nconst n = 3;\n');
  });

  test('a multi-line block comment is not product copy either', () => {
    silent('block.js', '/*\n * Balance is low — top up to keep sending.\n */\nconst n = 1;\n');
  });

  test('a log line is written for whoever reads the logs at 3am', () => {
    silent('boot.js', 'logger.info("chunk load failed — reloading once");\n');
  });

  test('a Markdown document is writing about the product, not product copy', () => {
    silent('README.md', 'Your balance is low — top up to keep sending.\n');
  });

  test('a Go file is out of scope even when it holds the same sentence', () => {
    silent('main.go', 'var t = "Your balance is low — top up."\n');
  });

  test('a test file is a developer talking to a developer', () => {
    silent('checkout.test.js', 'expect(msg).toBe("Balance low — top up.");\n');
  });

  test('a file under __tests__ is exempt however it is named', () => {
    silent('__tests__/checkout.js', 'expect(msg).toBe("Balance low — top up.");\n');
  });

  test('the hook tooling cannot be subject to its own rules', () => {
    silent('proj/.claude/scripts/hooks/z.js', 'const t = "Balance low — top up.";\n');
  });

  test('clean copy produces no output at all', () => {
    silent('clean.js', 'export const t = "Your balance is low. Top up to keep sending.";\n');
  });
});

describe('post-edit-ux-writing.js — the operator off-switch', () => {
  test('CLAUDE_UX_WRITING_HOOK=off silences copy that otherwise fires', () => {
    const f = fixture('copy.js', 'export const t = "Seamless, best-in-class payouts.";\n');
    assert.match(advice(edit('post-edit-ux-writing.js', f)), /buzzword/, 'control: it fires when on');
    const off = edit('post-edit-ux-writing.js', f, { CLAUDE_UX_WRITING_HOOK: 'off' });
    assert.equal(said(off), '');
    assert.equal(off.code, 0);
  });

  test('only the exact value "off" disables it — a truthy value must not silence it', () => {
    const f = fixture('copy.js', 'export const t = "Seamless, best-in-class payouts.";\n');
    const r = edit('post-edit-ux-writing.js', f, { CLAUDE_UX_WRITING_HOOK: 'true' });
    assert.match(advice(r), /buzzword/);
  });

  test('the off-switch says nothing on any channel', () => {
    const f = fixture('copy.js', 'export const t = "Seamless payouts.";\n');
    const payload = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: f } });
    const r = run('post-edit-ux-writing.js', payload, { CLAUDE_UX_WRITING_HOOK: 'off' });
    assert.equal(r.stdout, '');
    assert.equal(r.stderr, '');
  });
});

// ---------------------------------------------------------------------------
// post-edit-console-warn.js — named for the warning, targets console.log only.
// ---------------------------------------------------------------------------

describe('post-edit-console-warn.js — debug residue left in an edited file', () => {
  test('warns when a console.log survives in the file that was just edited', () => {
    const f = fixture('a.js', 'const a = 1;\nconsole.log("debug", a);\n');
    const r = edit('post-edit-console-warn.js', f);
    assert.equal(r.code, 0, 'PostToolUse cannot block — it can only tell the author');
    assert.match(advice(r), /console\.log found/);
    assert.match(advice(r), /^2: console\.log/m, 'the line number is the whole point of the warning');
  });

  test('warns on a .tsx file too, not just .js', () => {
    const f = fixture('View.tsx', 'export const V = () => { console.log("x"); return null; };\n');
    assert.match(advice(edit('post-edit-console-warn.js', f)), /console\.log found/);
  });

  test('lists at most five sites so one bad file cannot flood the turn', () => {
    const body = Array.from({ length: 7 }, (_, i) => `console.log(${i});`).join('\n');
    const f = fixture('noisy.js', body + '\n');
    const listed = advice(edit('post-edit-console-warn.js', f))
      .split('\n')
      .filter((l) => /^\d+: console\.log/.test(l));
    assert.equal(listed.length, 5);
  });

  test('stays silent on console.error — real error reporting is not debug residue', () => {
    const f = fixture('b.js', 'console.error("payment failed");\nconsole.warn("retrying");\n');
    assert.equal(said(edit('post-edit-console-warn.js', f)), '');
  });

  test('stays silent on a logger call', () => {
    const f = fixture('c.js', 'logger.info("charge accepted");\n');
    assert.equal(said(edit('post-edit-console-warn.js', f)), '');
  });

  test('stays silent on a Go file that happens to print the same text', () => {
    const f = fixture('main.go', 'fmt.Println("console.log")\n');
    assert.equal(said(edit('post-edit-console-warn.js', f)), '');
  });

  test('stays silent on a clean TypeScript file', () => {
    const f = fixture('d.ts', 'export const x: number = 1;\n');
    assert.equal(said(edit('post-edit-console-warn.js', f)), '');
  });

  // A file that DESCRIBES console.log is not debug residue: the same precision as the
  // no-discards rule, which strips strings and wants a call.
  test('stays silent on console.log named in a comment or inside a string', () => {
    const f = fixture('e.js', '// console.log is banned here\nconst s = "console.log(x)";\n');
    assert.equal(said(edit('post-edit-console-warn.js', f)), '');
  });

  test('exempts the hook sources, which name console.log in order to catch it', () => {
    const dir = join(workspace(), '.claude', 'scripts', 'hooks');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'x.js'), 'console.log(1);\n');
    assert.equal(said(edit('post-edit-console-warn.js', join(dir, 'x.js'))), '');
  });

  test('stays silent when the file was deleted after the edit', () => {
    const r = edit('post-edit-console-warn.js', join(workspace(), 'gone.js'));
    assert.equal(r.code, 0);
    assert.equal(said(r), '');
  });
});
