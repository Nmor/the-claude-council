#!/usr/bin/env bash
# verify-link-integrity.sh
#
# Walks every markdown file under the repo and verifies that every
# in-repo link target exists. External URLs are skipped; only
# internal cross-references are checked.
#
# Exit codes:
#   0 — all links resolve
#   1 — one or more broken links
#
# Usage:
#   bash tests/verify-link-integrity.sh
#
# Bash 3.2-compatible (macOS default ships bash 3.2 only; no mapfile,
# no associative arrays, no PIPESTATUS gymnastics).

set -uo pipefail
IFS=$'\n\t'

# Find the repo root. `git rev-parse` short-circuits the cd-pwd
# fallback via subshell grouping; without the parens, both branches
# emit output and REPO_ROOT carries a newline.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || (cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd))"
cd "${REPO_ROOT}"

BROKEN_FILE="$(mktemp)"
trap 'rm -f "${BROKEN_FILE}"' EXIT
SCANNED=0

# Build the file list. Excludes runtime + vendor dirs.
FILE_LIST="$(mktemp)"
trap 'rm -f "${BROKEN_FILE}" "${FILE_LIST}"' EXIT
find . \
  -type f \
  -name '*.md' \
  -not -path './.git/*' \
  -not -path './node_modules/*' \
  -not -path './.local/*' \
  -not -path './sessions/*' \
  -not -path './projects/*' \
  -not -path './file-history/*' \
  | sort > "${FILE_LIST}"

FILE_COUNT=$(wc -l < "${FILE_LIST}" | tr -d ' ')

echo "── Link integrity sweep ─────────────────────────────────"
echo "Scanning ${FILE_COUNT} markdown files..."

while IFS= read -r md_file; do
  [ -z "${md_file}" ] && continue

  # Extract every [text](target) link target. Strip fenced code
  # blocks (``` ... ```) and HTML comments (<!-- ... -->) first so
  # example links inside code blocks or commented-out template
  # examples don't count as real navigation links. Both can span
  # multiple lines, so the awk pipeline maintains state across
  # lines. Inline code spans (`...`) are NOT stripped because real
  # links often contain backtick-styled text in the link text
  # (e.g., [`name`](path)) — stripping would destroy the link.
  # Inline-code-span false positives must be rewritten at source.
  set +e
  TARGETS="$(
    awk '
      BEGIN { infence = 0; incomment = 0 }
      /^```/ { infence = 1 - infence; next }
      {
        if (infence) next
        line = $0
        out = ""
        while (length(line) > 0) {
          if (incomment) {
            end = index(line, "-->")
            if (end == 0) { line = ""; break }
            line = substr(line, end + 3)
            incomment = 0
          } else {
            start = index(line, "<!--")
            if (start == 0) { out = out line; break }
            out = out substr(line, 1, start - 1)
            line = substr(line, start + 4)
            incomment = 1
          }
        }
        print out
      }
    ' "${md_file}" 2>/dev/null \
      | grep -oE '\[[^]]+\]\([^)]+\)' 2>/dev/null \
      | sed -E 's/.*\(([^)]+)\)/\1/'
  )"
  set -e

  [ -z "${TARGETS}" ] && continue

  while IFS= read -r raw_target; do
    [ -z "${raw_target}" ] && continue
    SCANNED=$((SCANNED + 1))

    # Skip external links
    case "${raw_target}" in
      http://*|https://*|mailto:*|ssh://*|git://*|ftp://*) continue ;;
    esac

    # Strip fragment + query
    target="${raw_target%%#*}"
    target="${target%%\?*}"

    # Skip pure anchor links
    [ -z "${target}" ] && continue

    # Resolve relative paths against the link source's directory
    src_dir="$(dirname "${md_file}")"
    if [ "${target:0:1}" = "/" ]; then
      resolved_path="${REPO_ROOT}${target}"
    else
      resolved_path="${src_dir}/${target}"
    fi

    # Normalise (collapse ../ and ./)
    if command -v python3 >/dev/null 2>&1; then
      normalised="$(python3 -c "import os,sys;print(os.path.normpath(sys.argv[1]))" "${resolved_path}")"
    else
      normalised="${resolved_path}"
    fi

    if [ ! -e "${normalised}" ]; then
      printf '%s → %s\n' "${md_file}" "${raw_target}" >> "${BROKEN_FILE}"
    fi
  done <<< "${TARGETS}"
done < "${FILE_LIST}"

BROKEN_COUNT=$(wc -l < "${BROKEN_FILE}" | tr -d ' ')

echo "Scanned: ${SCANNED} links across ${FILE_COUNT} files"

if [ "${BROKEN_COUNT}" -eq 0 ]; then
  echo "✓ All in-repo links resolve."
  exit 0
fi

echo ""
echo "✗ Broken links: ${BROKEN_COUNT}"
sed 's/^/  - /' "${BROKEN_FILE}"
exit 1
