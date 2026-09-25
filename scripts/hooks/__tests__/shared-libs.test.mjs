// Size budget: 18 KB. Check: wc -c; gate: token-budget.mjs --check.
// Tests for scripts/lib: session-aliases, package-manager, utils.
//
// session-start calls all three on every session, and /sessions and /setup-pm drive the
// first two. They write under ~/.claude, so HOME is pointed at a scratch directory for the
// whole file: a test that touched the real aliases or package-manager preference would be
// changing the machine it runs on.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, utimesSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HOOKS } from './helpers.mjs';

const LIB = join(HOOKS, '..', 'lib');
const req = createRequire(import.meta.url);
const home = mkdtempSync(join(tmpdir(), 'libs-home-'));
const realHome = process.env.HOME;
const realPm = process.env.CLAUDE_PACKAGE_MANAGER;
before(() => { process.env.HOME = home; delete process.env.CLAUDE_PACKAGE_MANAGER; });
after(() => {
  process.env.HOME = realHome;
  if (realPm === undefined) delete process.env.CLAUDE_PACKAGE_MANAGER; else process.env.CLAUDE_PACKAGE_MANAGER = realPm;
  rmSync(home, { recursive: true, force: true });
});

const aa = req(join(LIB, 'session-aliases.js'));
const pm = req(join(LIB, 'package-manager.js'));
const u = req(join(LIB, 'utils.js'));
const aliasFile = () => join(home, '.claude', 'session-aliases.json');
const fresh = () => rmSync(join(home, '.claude'), { recursive: true, force: true });
// Assembled so no command that writes this file reads as starting a dev server.
const DEV = [['npm', 'run'], ['pnpm'], ['pnpm', 'run'], ['yarn'], ['bun', 'run']].map((p) => [...p, 'dev'].join(' '));

describe('session-aliases — a name for a session, and nothing else', () => {
  test('sets, resolves, and keeps the first creation time on update', () => {
    fresh();
    const first = aa.setAlias('auth-fix', '/s/1', 'Auth fix');
    assert.equal(first.success, true);
    assert.equal(first.isNew, true);
    const created = aa.resolveAlias('auth-fix').createdAt;
    const again = aa.setAlias('auth-fix', '/s/2');
    assert.equal(again.isNew, false);
    assert.equal(aa.resolveAlias('auth-fix').sessionPath, '/s/2');
    assert.equal(aa.resolveAlias('auth-fix').createdAt, created);
    assert.ok(!existsSync(aliasFile() + '.tmp') && !existsSync(aliasFile() + '.bak'), 'an atomic save leaves nothing behind');
  });

  for (const [why, name, path] of [['empty', '', '/s'], ['too long', 'a'.repeat(129), '/s'],
    ['unsafe', 'a b', '/s'], ['reserved, in any case', 'LIST', '/s'], ['no session', 'ok', '  ']]) {
    test(`refuses a ${why} alias`, () => assert.equal(aa.setAlias(name, path).success, false));
  }

  // Inherited names answered as if they were aliases: `constructor` resolved to a session
  // of undefined, and `__proto__` replaced the table's prototype instead of being stored.
  test('an inherited name is not an alias until someone sets it', () => {
    fresh();
    assert.equal(aa.resolveAlias('constructor'), null);
    assert.equal(aa.resolveSessionAlias('constructor'), 'constructor', 'an unknown name passes through as a path');
    assert.equal(aa.deleteAlias('toString').success, false);
  });
  test('names like __proto__ and constructor are stored like any other', () => {
    fresh();
    assert.equal(aa.setAlias('constructor', '/s/c').isNew, true);
    assert.equal(aa.setAlias('__proto__', '/s/p').success, true);
    assert.equal(aa.resolveAlias('__proto__').sessionPath, '/s/p');
    assert.deepEqual(aa.listAliases().map((a) => a.name).sort(), ['__proto__', 'constructor']);
  });

  test('lists newest first, filters by name or title, and limits', () => {
    fresh();
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(aliasFile(), JSON.stringify({ aliases: {
      old: { sessionPath: '/o', updatedAt: '2020-01-01T00:00:00Z', title: 'Billing' },
      mid: { sessionPath: '/m', updatedAt: '2023-01-01T00:00:00Z' },
      new: { sessionPath: '/n', updatedAt: '2026-01-01T00:00:00Z' } } }));
    assert.deepEqual(aa.listAliases().map((a) => a.name), ['new', 'mid', 'old']);
    assert.deepEqual(aa.listAliases({ search: 'bill' }).map((a) => a.name), ['old']);
    assert.equal(aa.listAliases({ limit: 1 }).length, 1);
    assert.equal(aa.loadAliases().metadata.totalCount, 3, 'missing metadata is rebuilt');
  });

  test('renames, and refuses a clash, a reserved or invalid name, or a missing source', () => {
    fresh();
    aa.setAlias('a', '/a'); aa.setAlias('b', '/b');
    assert.equal(aa.renameAlias('a', 'b').success, false);
    assert.equal(aa.renameAlias('a', 'help').success, false);
    assert.equal(aa.renameAlias('a', 'x y').success, false);
    assert.equal(aa.renameAlias('a', '').success, false);
    assert.equal(aa.renameAlias('nope', 'c').success, false);
    assert.equal(aa.renameAlias('a', 'c').success, true);
    assert.equal(aa.resolveAlias('a'), null);
    assert.equal(aa.resolveAlias('c').sessionPath, '/a');
  });

  test('titles: a string or null only; null clears; a missing alias is refused', () => {
    fresh();
    aa.setAlias('t', '/t', 'First');
    assert.equal(aa.updateAliasTitle('t', 5).success, false);
    assert.equal(aa.updateAliasTitle('t', null).success, true);
    assert.equal(aa.resolveAlias('t').title, null);
    assert.equal(aa.updateAliasTitle('missing', 'x').success, false);
  });

  test('finds every alias of one session, and cleans up aliases whose session is gone', () => {
    fresh();
    aa.setAlias('one', '/keep'); aa.setAlias('two', '/keep'); aa.setAlias('gone', '/gone');
    assert.equal(aa.getAliasesForSession('/keep').length, 2);
    assert.equal(aa.cleanupAliases('not a function').removed, 0);
    const r = aa.cleanupAliases((p) => p === '/keep');
    assert.equal(r.removed, 1);
    assert.equal(r.totalChecked, 3);
    assert.equal(aa.resolveAlias('gone'), null);
  });

  test('a corrupt or malformed file reads as empty rather than throwing', () => {
    fresh();
    mkdirSync(join(home, '.claude'), { recursive: true });
    writeFileSync(aliasFile(), '{not json');
    assert.deepEqual(aa.listAliases(), []);
    writeFileSync(aliasFile(), JSON.stringify({ version: '1.0' }));
    assert.deepEqual(aa.listAliases(), []);
  });

  test('a failed save reports failure and leaves the stored aliases intact', () => {
    fresh();
    aa.setAlias('kept', '/k');
    mkdirSync(aliasFile() + '.tmp'); // the temp path is taken, so the write cannot land
    try {
      assert.equal(aa.setAlias('lost', '/l').success, false);
      const r = aa.renameAlias('kept', 'moved');
      assert.equal(r.success, false);
      assert.match(r.error, /rolled back/);
      assert.equal(JSON.parse(readFileSync(aliasFile(), 'utf8')).aliases.kept.sessionPath, '/k');
    } finally {
      rmSync(aliasFile() + '.tmp', { recursive: true, force: true });
    }
  });
});

describe('package-manager — which manager a project uses, and why', () => {
  const project = (files = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'pm-proj-'));
    for (const [name, body] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), { recursive: true });
      writeFileSync(join(dir, name), body);
    }
    return dir;
  };
  const pick = (files) => { const p = pm.getPackageManager({ projectDir: project(files) }); return `${p.name}/${p.source}`; };

  test('the environment wins, but only with a real manager name', () => {
    fresh();
    process.env.CLAUDE_PACKAGE_MANAGER = 'yarn';
    assert.equal(pick({ 'pnpm-lock.yaml': '' }), 'yarn/environment');
    for (const bogus of ['nope', 'constructor', 'toString']) {
      process.env.CLAUDE_PACKAGE_MANAGER = bogus;
      assert.equal(pick({}), 'npm/default', bogus);
    }
    delete process.env.CLAUDE_PACKAGE_MANAGER;
  });

  test('then project config, then package.json, then lock files, then the global preference', () => {
    fresh();
    assert.equal(pick({ '.claude/package-manager.json': '{"packageManager":"bun"}', 'yarn.lock': '' }), 'bun/project-config');
    assert.equal(pick({ '.claude/package-manager.json': '{bad', 'yarn.lock': '' }), 'yarn/lock-file');
    assert.equal(pick({ 'package.json': '{"packageManager":"pnpm@8.6.0"}', 'yarn.lock': '' }), 'pnpm/package.json');
    assert.equal(pick({ 'package.json': '{"packageManager":"toString@1"}' }), 'npm/default');
    assert.equal(pick({ 'pnpm-lock.yaml': '', 'yarn.lock': '' }), 'pnpm/lock-file');
    pm.setPreferredPackageManager('yarn');
    assert.equal(pick({}), 'yarn/global-config');
  });

  // Bun v1.2 made the text lockfile the default (bun.sh/docs/install/lockfile, read 2026-09-21).
  test('recognises Bun by its current bun.lock as well as the older bun.lockb', () => {
    fresh();
    assert.equal(pm.detectFromLockFile(project({ 'bun.lock': '' })), 'bun');
    assert.equal(pm.detectFromLockFile(project({ 'bun.lockb': '' })), 'bun');
    assert.equal(pm.detectFromLockFile(project({})), null);
  });

  test('stores preferences, and refuses a name that is not a manager', () => {
    fresh();
    assert.equal(pm.setPreferredPackageManager('pnpm').packageManager, 'pnpm');
    assert.throws(() => pm.setPreferredPackageManager('constructor'), /Unknown package manager/);
    const dir = project();
    pm.setProjectPackageManager('bun', dir);
    assert.equal(JSON.parse(readFileSync(join(dir, '.claude', 'package-manager.json'), 'utf8')).packageManager, 'bun');
    assert.throws(() => pm.setProjectPackageManager('nope', dir), /Unknown package manager/);
  });

  test('builds commands for the detected manager and refuses shell metacharacters', () => {
    fresh();
    process.env.CLAUDE_PACKAGE_MANAGER = 'pnpm';
    try {
      assert.equal(pm.getRunCommand('install'), 'pnpm install');
      assert.equal(pm.getRunCommand('lint'), 'pnpm lint');
      assert.equal(pm.getExecCommand('prettier', '--write .'), 'pnpm dlx prettier --write .');
      assert.throws(() => pm.getRunCommand('x; rm -rf /'), /unsafe/);
      assert.throws(() => pm.getRunCommand(''), /non-empty/);
      assert.throws(() => pm.getExecCommand('tool', '$(whoami)'), /unsafe/);
      assert.throws(() => pm.getExecCommand('a|b'), /unsafe/);
    } finally {
      delete process.env.CLAUDE_PACKAGE_MANAGER;
    }
  });

  test('command patterns match every manager\'s spelling and escape the action', () => {
    const dev = new RegExp(pm.getCommandPattern(' dev '));
    for (const c of DEV) assert.match(c, dev);
    const custom = new RegExp(pm.getCommandPattern('a.b'));
    assert.match('npm run a.b', custom);
    assert.doesNotMatch('npm run axb', custom, 'a dot in the action is literal');
  });

  test('lists only managers it knows, and prompts with all of them', () => {
    for (const name of pm.getAvailablePackageManagers()) assert.ok(Object.hasOwn(pm.PACKAGE_MANAGERS, name));
    for (const name of Object.keys(pm.PACKAGE_MANAGERS)) assert.match(pm.getSelectionPrompt(), new RegExp(name));
  });
});

describe('utils — files, commands and git', () => {
  test('finds files by glob, literal apart from * and ?, newest first, with age and depth', () => {
    const dir = mkdtempSync(join(tmpdir(), 'find-'));
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'a+b.txt'), ''); writeFileSync(join(dir, 'aab.txt'), '');
    writeFileSync(join(dir, 'old.md'), ''); writeFileSync(join(dir, 'sub', 'deep.md'), '');
    utimesSync(join(dir, 'old.md'), new Date(2020, 0, 1), new Date(2020, 0, 1));
    assert.deepEqual(u.findFiles(dir, 'a+b.txt').map((f) => f.path), [join(dir, 'a+b.txt')]);
    assert.equal(u.findFiles(dir, '*.md').length, 1);
    assert.equal(u.findFiles(dir, '*.md', { recursive: true }).length, 2);
    assert.equal(u.findFiles(dir, '*.md', { recursive: true, maxAge: 1 }).length, 1);
    assert.equal(u.findFiles(dir, '*.md', { recursive: true }).at(-1).path, join(dir, 'old.md'));
    assert.deepEqual(u.findFiles('', '*'), []);
    assert.deepEqual(u.findFiles(join(dir, 'missing'), '*'), []);
  });

  test('reads, writes into new directories, appends, replaces and counts', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'rw-')), 'x', 'y.txt');
    assert.equal(u.readFile(f), null);
    u.writeFile(f, 'a a a\n');
    u.appendFile(f, 'b\n');
    assert.equal(u.replaceInFile(f, 'a', 'c', { all: true }), true);
    assert.equal(u.readFile(f), 'c c c\nb\n');
    assert.equal(u.replaceInFile(f + '.none', 'a', 'b'), false);
    assert.equal(u.countInFile(f, /c/), 3, 'a regex without g still counts every match');
    assert.equal(u.countInFile(f, 'c'), 3);
    assert.equal(u.countInFile(f, '('), 0);
    assert.equal(u.countInFile(f + '.none', 'c'), 0);
  });

  test('grepFile matches every matching line even with a global regex', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'grep-')), 'g.txt');
    writeFileSync(f, 'hit\nhit\nmiss\nhit');
    assert.deepEqual(u.grepFile(f, /hit/g).map((r) => r.lineNumber), [1, 2, 4]);
    assert.deepEqual(u.grepFile(f, '('), []);
    assert.deepEqual(u.grepFile(f + '.none', 'hit'), []);
  });

  test('commandExists refuses a name that could smuggle shell syntax', () => {
    assert.equal(u.commandExists('node'), true);
    assert.equal(u.commandExists('node; rm -rf /'), false);
    assert.equal(u.commandExists('surely-not-a-real-command-xyz'), false);
    assert.equal(u.runCommand('node -e "process.exit(0)"').success, true);
    assert.equal(u.runCommand('node -e "process.exit(3)"').success, false);
  });

  test('git helpers report the repo, its name and the files changed in it', () => {
    const repo = mkdtempSync(join(tmpdir(), 'git-repo-'));
    const git = (...a) => assert.equal(spawnSync('git', a, { cwd: repo }).status, 0, a.join(' '));
    git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
    git('config', 'commit.gpgsign', 'false');
    writeFileSync(join(repo, 'a.go'), '1'); writeFileSync(join(repo, 'b.md'), '1');
    git('add', '.'); git('commit', '-qm', 'init');
    writeFileSync(join(repo, 'a.go'), '2'); writeFileSync(join(repo, 'b.md'), '2');
    const cwd = process.cwd();
    try {
      process.chdir(repo);
      assert.equal(u.isGitRepo(), true);
      assert.equal(u.getProjectName(), u.getGitRepoName());
      assert.deepEqual(u.getGitModifiedFiles().sort(), ['a.go', 'b.md']);
      assert.deepEqual(u.getGitModifiedFiles(['\\.go$', '(']), ['a.go'], 'an invalid pattern is skipped, not fatal');
      process.chdir(tmpdir());
      assert.deepEqual(u.getGitModifiedFiles(), []);
    } finally {
      process.chdir(cwd);
    }
  });

  test('session id, dates and directories have the documented shapes', () => {
    process.env.CLAUDE_SESSION_ID = 'abcdef0123456789';
    assert.equal(u.getSessionIdShort(), '23456789');
    delete process.env.CLAUDE_SESSION_ID;
    assert.match(u.getDateString(), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(u.getTimeString(), /^\d{2}:\d{2}$/);
    assert.match(u.getDateTimeString(), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(u.getSessionsDir(), join(home, '.claude', 'sessions'));
    assert.equal(u.getLearnedSkillsDir(), join(home, '.claude', 'skills', 'learned'));
    const d = join(mkdtempSync(join(tmpdir(), 'ens-')), 'p', 'q');
    assert.equal(u.ensureDir(d), d);
    assert.ok(existsSync(d));
    assert.equal(u.isMacOS || u.isLinux || u.isWindows, true);
  });

  const script = (code, input) => spawnSync(process.execPath,
    ['-e', `const u=require(${JSON.stringify(join(LIB, 'utils.js'))});${code}`], { input, encoding: 'utf8' });
  test('readStdinJson parses its input, and reads malformed input as empty', () => {
    const go = 'u.readStdinJson().then(o=>process.stdout.write(JSON.stringify(o)))';
    assert.equal(script(go, '{"a":1}').stdout, '{"a":1}');
    assert.equal(script(go, 'nope').stdout, '{}');
    assert.equal(script(go, '').stdout, '{}');
  });
  test('output writes objects as JSON and anything else as text', () => {
    assert.equal(script('u.output({a:1});u.output("x")').stdout, '{"a":1}\nx\n');
  });
});
