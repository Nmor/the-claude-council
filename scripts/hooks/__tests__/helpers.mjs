// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// Shared harness for hook tests.
//
// A hook is a process contract: JSON on stdin, an exit code that may block, and text on
// stderr that the model sees only when it blocks. So the tests drive the real binary rather
// than importing internals — importing would test a different thing from what Claude Code
// runs, and the bugs found on 2026-09-21 were all in that gap.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOOKS = join(dirname(fileURLToPath(import.meta.url)), '..');

// run a hook exactly as the harness does. Payload is an object; it is sent as JSON on stdin.
// NOTE: never build this string with shell `echo` — zsh expands \n inside it and mangles the
// JSON, which silently sends the hook down its parse-failure path and makes every test pass.
export function run(hook, payload, env = {}) {
  const r = spawnSync(process.execPath, [join(HOOKS, hook)], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

export function json(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

let n = 0;
export const uniq = (p = 'id') => `${p}-${process.pid}-${Date.now()}-${n++}`;

export const marker = (name) => join(tmpdir(), name);
export const markerExists = (name) => existsSync(marker(name));
export const markerText = (name) => {
  try {
    return readFileSync(marker(name), 'utf8');
  } catch {
    return '';
  }
};
export const cleanup = (...names) => {
  for (const nm of names) rmSync(marker(nm), { force: true });
};

// What a NON-blocking hook told Claude. Stderr on exit 0 goes to the debug log only and is
// never shown (hooks reference, read 2026-09-21), so advice must arrive as
// hookSpecificOutput.additionalContext, or as a systemMessage for the user where the event
// would otherwise reopen the turn. Tests read this, so advice regressing to stderr fails them.
export function advice(r) {
  const o = json((r.stdout || '').trim());
  return (o && ((o.hookSpecificOutput && o.hookSpecificOutput.additionalContext) || o.systemMessage)) || '';
}

// Everything a hook emitted, on any channel: a hook that must stay SILENT says nothing on
// either, so a silence test cannot pass just because the text moved to stdout.
export const said = (r) => `${r.stderr || ''}${advice(r)}`;
