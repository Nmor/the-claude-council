// Size budget: 8 KB. Check: wc -c; gate: token-budget.mjs --check.
// Shared command-text analysis for Bash hooks.
//
// One idea, learned expensively on 2026-09-21: a hook must judge what a command WILL RUN, not
// text the command happens to carry. Three separate false positives came from getting this
// wrong in a single session —
//   * a read-only `grep -rn test .` counted as "a verification gate ran"
//   * writing a test file whose fixtures mentioned pushing was blocked as a push
//   * editing a hook was blocked as a commit trailer, because the edit contained the words
//     the trailer detector looks for
// In every case the command was ABOUT the thing, not DOING it. Writing about a push is not
// pushing; a gate that cannot tell the difference blocks real work and gets switched off.
"use strict";

// Commands whose heredoc body is executed or carried rather than merely written to a file.
const INTERPRETER =
  /\b(bash|sh|zsh|ksh|dash|python3?|perl|ruby|node|git|env|eval|xargs|ssh|sudo|psql|mysql|sqlite3)\b/;

/**
 * Return the command with file-written heredoc bodies removed.
 *
 * `cat > file <<EOF ... EOF` merely WRITES the body, so the body is data. A heredoc piped to
 * an interpreter (`bash <<EOF`, `psql <<EOF`) really does execute what it contains, so it is
 * left intact. Anything ambiguous is left intact too: a false negative here is a bypass, and
 * a false positive is only an inconvenience.
 */
function executablePart(cmd) {
  return String(cmd == null ? "" : cmd).replace(
    /^(.*?)<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2([\s\S]*?)^\3\s*$/gm,
    (match, head) => {
      const writesToFile = />\s*\S/.test(head) || /\btee\b/.test(head);
      // Judge the interpreter on the COMMAND words only. Tested against the whole head, the
      // file being written counted: `cat > deploy.sh` matched `sh`, `cat > .git/hooks/x`
      // matched `git`, and the body of a script merely being saved was judged as run.
      const command = head
        .replace(/>>?\s*\S+/g, " ")
        .replace(/\btee\s+(?:-a\s+)?\S+/g, "tee ");
      return writesToFile && !INTERPRETER.test(command) ? head : match;
    },
  );
}

/**
 * True when `needle` appears in COMMAND POSITION — at the start, or after a shell separator.
 *
 * `grep -rn test .` mentions "test"; it does not run one. Matching a bare word anywhere is
 * what made a read-only grep satisfy a verification gate for an unknown length of time.
 */
function atCommandPosition(cmd, needle) {
  const src =
    typeof needle === "string"
      ? needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      : needle.source;
  // The needle is grouped so an alternation (`tsc|eslint`) is anchored on every branch, not
  // only the first. A newline separates commands exactly as `;` does.
  return new RegExp(
    `(?:^|[\\n;&|\`(]\\s*)\\s*(?:sudo\\s+)?(?:${src})\\b`,
    "i",
  ).test(String(cmd == null ? "" : cmd));
}

// Commands that verify work: build, vet, lint, type-check, test, format and security gates.
// Used with atCommandPosition, so naming one in an argument is not running it.
//
// The last group is infra validation. Without it an infra-only commit could never satisfy
// commit-gate.js, because nothing that checks a manifest, an alert rule or a workflow
// counted, and the only way through was an unrelated linter run to write the marker.
// `kubectl kustomize` alone is absent on purpose: it renders and verifies nothing.
const VERIFICATION_GATE =
  /go\s+(?:test|vet|build)|gofmt|staticcheck|golangci-lint|govulncheck|gosec|npx\s+tsc|tsc|npx\s+eslint|eslint|pytest|ruff|mypy|vitest|jest|cargo\s+(?:test|build|clippy)|markdownlint|make\s+(?:test|lint|build|check)|npm\s+(?:test|run\s+\S+)|pnpm\s+(?:test|build|lint)|yarn\s+(?:test|build|lint)|bundle\s+exec\s+(?:rspec|rubocop)|dotnet\s+(?:test|build)|(?:python3?\s+)?(?:\S*\/)?validate-manifests(?:-selftest)?\.py|promtool\s+(?:check|test)|actionlint|terraform\s+validate|kubeconform|helm\s+lint|shellcheck|node\s+--test/;

module.exports = {
  executablePart,
  atCommandPosition,
  INTERPRETER,
  VERIFICATION_GATE,
};
