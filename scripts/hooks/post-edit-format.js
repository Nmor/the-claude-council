#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
'use strict';

/**
 * PostToolUse: format what Prettier owns, after an edit wrote it.
 *
 * Never blocks. A formatter that can fail an edit is worse than an unformatted file, so
 * every path here exits 0.
 *
 * But it is no longer SILENT. This hook used to wrap the whole run in a bare `catch {}`
 * whose comment read "Prettier not installed, file missing, or failed — non-blocking",
 * which made those three outcomes indistinguishable from success. On this machine Prettier
 * resolves nowhere: not on PATH, not in node_modules. So the hook had been registered and
 * running on every JS/TS edit in the estate, formatting nothing, reporting nothing — the
 * exact shape `no-silent-failures.md` rule 8 exists to stop, in the layer that enforces it.
 *
 * It now says which of the three happened, once per session for the missing-tool case (the
 * answer does not change within a session, and repeating it on every edit is how a notice
 * gets ignored) and every time for a file Prettier actually rejected, because that one is
 * about the file just written and is worth seeing each time.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { advise } = require('./lib/advise.js');

const OWNED = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const MAX_STDIN = 1024 * 1024;
const TIMEOUT_MS = 15000;

// npx.cmd on Windows: execFileSync would otherwise need shell:true, which is a command
// injection on a path we do not control.
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/** True the first time this session asks; false afterwards. */
function firstTimeThisSession(sid, kind) {
  if (!sid) return true;
  const marker = path.join(os.tmpdir(), `claude-council-${kind}-${sid}`);
  try {
    if (fs.existsSync(marker)) return false;
    fs.writeFileSync(marker, String(Date.now()));
  } catch {
    return true; // cannot remember: better to say it twice than never
  }
  return true;
}

/** Prettier could not be RUN at all, as opposed to running and rejecting the file. */
function isMissingTool(err) {
  if (err && (err.code === 'ENOENT' || err.code === 'ETIMEDOUT')) return true;
  const out = String((err && err.stderr) || '') + String((err && err.stdout) || '');
  return /not found|could not determine executable|npm ERR!|command not found/i.test(out);
}

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(data || '{}');
  } catch {
    process.exit(0); // not our payload to interpret
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!filePath || !OWNED.test(filePath) || process.env.CLAUDE_FORMAT_HOOK === 'off') {
    process.exit(0);
  }

  try {
    execFileSync(NPX, ['prettier', '--write', filePath], {
      cwd: path.dirname(path.resolve(filePath)),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TIMEOUT_MS,
    });
  } catch (err) {
    if (isMissingTool(err)) {
      if (firstTimeThisSession(input.session_id, 'format-missing')) {
        advise(
          input,
          'Prettier is not available here, so nothing this session has been auto-formatted. ' +
            'Install it (`npm i -g prettier`, or add it to the project) or set ' +
            'CLAUDE_FORMAT_HOOK=off to stop this notice. Until then, formatting is on you.',
          'PostToolUse',
        );
      }
    } else {
      // Prettier ran and refused the file: almost always a syntax error in what was just
      // written, which is worth knowing immediately and every time.
      const detail = String((err && err.stderr) || err || '').split('\n').slice(0, 3).join(' ').trim();
      advise(input, `Prettier could not format ${path.basename(filePath)}: ${detail}`, 'PostToolUse');
    }
  }

  process.exit(0);
});
