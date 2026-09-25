// Size budget: 4 KB. Check: wc -c; gate: token-budget.mjs --check.
// Shared fixture for the plan-and-docs gate tests: a throwaway git repo, a throwaway HOME holding
// one plan, and that project's memory naming the plan. Not a test file: run.sh runs *.test.mjs.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, utimesSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const pc = createRequire(import.meta.url)('../lib/project-context.js');

export const ISOLATED = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
export const git = (dir, ...args) =>
  execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
    env: { ...process.env, ...ISOLATED },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).toString();

export const ago = (sec) => new Date(Date.now() - sec * 1000);
export const setMtime = (f, when) => utimesSync(f, when, when);

/** This project's memory index (where Claude Code keeps it for `dir`), saying `body`. */
export function memoryIndex(home, dir, body) {
  const mem = join(home, '.claude', 'projects', pc.projectKey(dir), 'memory');
  mkdirSync(mem, { recursive: true });
  writeFileSync(join(mem, 'MEMORY.md'), `# Memory Index\n\n${body}\n`);
  return mem;
}

/**
 * A repo with one committed file, a HOME holding one plan, and a transcript born first. The
 * project's memory names that plan as active, as every project must: plans for several projects
 * share ~/.claude/plans, so the gate never guesses which one this work belongs to.
 */
export function world({ planAge = 3600, pointer = true } = {}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'plan-docs-')));
  const home = join(base, 'home');
  const repo = join(base, 'repo');
  mkdirSync(join(home, '.claude', 'plans'), { recursive: true });
  mkdirSync(repo);
  const transcript = join(base, 'transcript.jsonl');
  writeFileSync(transcript, '');
  git(repo, 'init', '-q');
  writeFileSync(join(repo, 'README.md'), '# r\n');
  git(repo, 'add', '.');
  git(repo, 'commit', '-qm', 'base');
  const plan = join(home, '.claude', 'plans', 'work.md');
  writeFileSync(plan, '- [ ] task\n');
  setMtime(plan, ago(planAge));
  const mem = pointer ? memoryIndex(home, repo, `Active plan: ${plan}`) : null;
  return { base, home, repo, plan, mem, transcript, env: { HOME: home, ...ISOLATED } };
}

export const edit = (w, file, body = 'package x\n') => writeFileSync(join(w.repo, file), body);

/** For one-plan-gate: a HOME, and a workspace (outside it unless `underHome`) holding `plans`. */
export function planWorkspace({ plans = ['master.md'], underHome = false } = {}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'one-plan-')));
  const home = join(base, 'home');
  const root = underHome ? join(home, 'work', 'ws') : join(base, 'ws');
  const dir = join(root, '.claude', 'plans');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(home, '.claude', 'plans'), { recursive: true });
  for (const p of plans) writeFileSync(join(dir, p), `# ${p}\n`);
  return { base, home, root, dir, env: { HOME: home, ...ISOLATED } };
}
