#!/usr/bin/env node
'use strict';

// TaskCompleted hook.
//
// no-overclaim.md reserves "done"/"complete" for states where a gate ran THIS TURN, and
// verify-before-claim.md r1 requires the verification block to precede the claim. Both
// were enforced by discipline alone at the moment a task is actually marked complete.
//
// Fires when a task is completed in a session where no gate has been observed, using
// the same session marker the intake hooks already write. SILENT once a gate has run —
// which is the normal path, so this stays quiet on well-run work.

const fs = require('fs');
const os = require('os');
const path = require('path');

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const sid = input.session_id || 'nosession';
    const marker = path.join(os.tmpdir(), `claude-council-gate-${sid}`);

    if (fs.existsSync(marker)) process.exit(0);   // a gate ran this session: silent

    process.stderr.write(
      '[task-gate] A task was marked complete with no verification gate observed this ' +
      'session (no-overclaim.md). "Done" requires the gate to have run THIS TURN, with ' +
      'its output attached. If a gate did run, this marker simply was not written — ' +
      'attach the block. If it did not, the task is "implemented, verification pending".\n'
    );
  } catch (err) {
    process.stderr.write(`[task-gate] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
