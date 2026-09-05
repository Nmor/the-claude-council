#!/usr/bin/env node
'use strict';

// PreModelSwitch hook.
//
// model-tier-selection.md excludes Fable from security-and-regulated review — its
// safety classifiers refuse cyber work, and Anthropic routes defensive-security to
// Mythos instead. That exclusion was prose enforced by nothing: a switch to Fable
// mid-security-review would simply happen, and the refusal would surface later as a
// confusing dead end rather than a caught policy violation.
//
// BLOCKS (exit 2) a switch to Fable while the session is doing security or regulated
// work. Otherwise SILENT — model switches are routine and a hook that comments on each
// one is a per-switch tax.

const SECURITY = /\b(security|vulnerab|exploit|cve|owasp|auth|credential|secret|pci|hipaa|gdpr|compliance|sanction|aml|kyc)\b/i;

let data = '';
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const target = String(input.to_model || input.model || '').toLowerCase();
    if (!target.includes('fable')) process.exit(0);

    // Only the session's own signals — never a network call, which would put a hook on
    // the critical path of every model switch.
    const haystack = [input.prompt, input.reason, input.cwd, input.transcript_excerpt]
      .filter(Boolean).join(' ');
    if (!SECURITY.test(haystack)) process.exit(0);

    process.stderr.write(
      '[model-ladder] BLOCKED: switch to Fable during security/regulated work. ' +
      'model-tier-selection.md excludes Fable from the security-and-regulated-review ' +
      'ladder — its classifiers refuse cyber work, so the switch buys a refusal, not ' +
      'capability. Use opus (or mythos where provisioned).\n'
    );
    process.exit(2);   // blocking: this is a policy violation, not advice
  } catch (err) {
    process.stderr.write(`[model-ladder] skipped: ${err.message}\n`);
  }
  process.exit(0);
});
