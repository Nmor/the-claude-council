#!/usr/bin/env node
// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
/**
 * Strategic Compact Suggester
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on PreToolUse or periodically to suggest manual compaction at logical intervals
 *
 * Why manual over auto-compact:
 * - Auto-compact happens at arbitrary points, often mid-task
 * - Strategic compacting preserves context through logical phases
 * - Compact after exploration, before execution
 * - Compact after completing a milestone, before starting next
 */

const fs = require('fs');
const path = require('path');
const {
  getTempDir,
  writeFile,
  readStdinJson
} = require('../lib/utils');
const { advise } = require('./lib/advise.js');

async function main() {
  // Count per session. Claude Code passes the session id on stdin, not in the
  // environment, so reading only CLAUDE_SESSION_ID put every session on the machine
  // on one shared `default` counter.
  const input = await readStdinJson();
  const sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || 'default';
  const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
  const rawThreshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
  const threshold = Number.isFinite(rawThreshold) && rawThreshold > 0 && rawThreshold <= 10000
    ? rawThreshold
    : 50;

  let count = 1;

  // Read existing count or start at 1
  // Use fd-based read+write to reduce (but not eliminate) race window
  // between concurrent hook invocations
  try {
    const fd = fs.openSync(counterFile, 'a+');
    try {
      const buf = Buffer.alloc(64);
      const bytesRead = fs.readSync(fd, buf, 0, 64, 0);
      if (bytesRead > 0) {
        const parsed = parseInt(buf.toString('utf8', 0, bytesRead).trim(), 10);
        // Clamp to reasonable range — corrupted files could contain huge values
        // that pass Number.isFinite() (e.g., parseInt('9'.repeat(30)) => 1e+29)
        count = (Number.isFinite(parsed) && parsed > 0 && parsed <= 1000000)
          ? parsed + 1
          : 1;
      }
      // Truncate and write new value
      fs.ftruncateSync(fd, 0);
      fs.writeSync(fd, String(count), 0);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    // Fallback: just use writeFile if fd operations fail
    writeFile(counterFile, String(count));
  }

  // Suggest compact after threshold tool calls
  if (count === threshold) {
    advise(input, `[StrategicCompact] ${threshold} tool calls reached - consider /compact if transitioning phases`);
  }

  // Suggest at regular intervals after threshold (every 25 calls from threshold)
  if (count > threshold && (count - threshold) % 25 === 0) {
    advise(input, `[StrategicCompact] ${count} tool calls - good checkpoint for /compact if context is stale`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[StrategicCompact] Error:', err.message);
  process.exit(0);
});
