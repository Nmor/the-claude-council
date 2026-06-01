#!/usr/bin/env bash
# verify-no-orphans.sh
#
# Detects orphan files — markdown / scripts / configs that exist on
# disk but are referenced nowhere else in the repo. Orphans signal
# dead documentation, stale rules, or accidental drift from the
# canonical structure.
#
# An orphan is a tracked file under canonical surfaces (rules/,
# skills/, agents/, commands/, docs/, templates/, ide-integrations/,
# bootstrap/, tests/) that:
#   - is not a README, CHANGELOG, LICENSE, or top-level entry doc
#   - does not appear in any other file's text (links, references,
#     auto-skills.md mapping, frontmatter, etc.)
#
# Exit codes:
#   0 — no orphans
#   1 — one or more orphans
#
# Usage:
#   bash tests/verify-no-orphans.sh
#
# Run from the repo root. Discovers the repo root via git when
# possible, falls back to the script's own dirname.

set -uo pipefail
IFS=$'\n\t'

# Find the repo root. `git rev-parse` short-circuits the cd-pwd
# fallback via subshell grouping; without the parens, both branches
# emit output and REPO_ROOT carries a newline.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || (cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd))"
cd "${REPO_ROOT}"

ORPHANS=()

# Files that are entry points / scaffold defaults and are never
# orphans even if they're not referenced.
ENTRY_POINTS=(
  "README.md"
  "CHANGELOG.md"
  "LICENSE"
  "CLAUDE.md"
  "MEMORY.md"
  "docs/no-discards.md"
)

is_entry_point() {
  local path="$1"
  for entry in "${ENTRY_POINTS[@]}"; do
    [ "${path}" = "${entry}" ] && return 0
  done
  return 1
}

# Build the candidate set: tracked .md / .sh / .ps1 / .json files
# under canonical surfaces. Bash 3.2-compatible: mktemp + while-read
# instead of mapfile (which is bash 4+).
CANDIDATES_FILE="$(mktemp)"
trap 'rm -f "${CANDIDATES_FILE}"' EXIT
find . \
  \( -path './rules/*' \
     -o -path './skills/*' \
     -o -path './agents/*' \
     -o -path './commands/*' \
     -o -path './docs/*' \
     -o -path './templates/*' \
     -o -path './ide-integrations/*' \
     -o -path './bootstrap/*' \
     -o -path './tests/*' \) \
  \( -name '*.md' -o -name '*.sh' -o -name '*.ps1' -o -name '*.json' \) \
  -type f \
  -not -path '*/node_modules/*' \
  -not -path '*/.local/*' \
  | sort > "${CANDIDATES_FILE}"

CANDIDATE_COUNT=$(wc -l < "${CANDIDATES_FILE}" | tr -d ' ')

echo "── Orphan sweep ─────────────────────────────────────────"
echo "Scanning ${CANDIDATE_COUNT} candidate files..."

# Build a single concatenated reference corpus so each candidate is
# searched against everything-else exactly once. Excludes the
# candidate file itself when grepping.
REFERENCE_DIRS=(
  "rules"
  "skills"
  "agents"
  "commands"
  "docs"
  "templates"
  "ide-integrations"
  "bootstrap"
  "tests"
)
REFERENCE_ROOTS=("README.md" "CHANGELOG.md" "CLAUDE.md")

while IFS= read -r candidate; do
  [ -z "${candidate}" ] && continue
  rel="${candidate#./}"

  if is_entry_point "${rel}"; then
    continue
  fi

  # README files inside subdirectories are entry points for that
  # subdirectory; never orphans.
  if [[ "$(basename "${rel}")" = "README.md" ]]; then
    continue
  fi

  # Slash-command files (commands/*.md) are entry points — invoked
  # by the user typing `/<name>`, not referenced from markdown.
  if [[ "${rel}" == commands/*.md ]]; then
    continue
  fi

  # SKILL.md files inside skills/<name>/ are entry points for that
  # skill directory; never orphans (the directory name appears in
  # auto-skills.md, but the SKILL.md file itself often does not).
  if [[ "${rel}" == skills/*/SKILL.md ]]; then
    skill_dir="$(dirname "${rel}")"
    skill_name="$(basename "${skill_dir}")"
    # Check if the skill name is referenced anywhere
    set +e
    refs="$(
      grep -rlF "${skill_name}" \
        "${REFERENCE_DIRS[@]}" \
        "${REFERENCE_ROOTS[@]}" \
        2>/dev/null \
        | grep -v "^${rel}$" \
        | head -n 1
    )"
    set -e
    if [ -z "${refs}" ]; then
      ORPHANS+=("${rel} (skill directory not referenced)")
    fi
    continue
  fi

  # Files inside a skill directory (skills/<name>/**, beyond SKILL.md)
  # are skill-internal assets. They count as referenced if any other
  # file in the same skill tree mentions their stem.
  if [[ "${rel}" == skills/*/* ]] && [[ "${rel}" != skills/*/SKILL.md ]]; then
    skill_dir="skills/$(echo "${rel}" | awk -F/ '{print $2}')"
    asset_stem="$(basename "${rel}")"
    asset_stem="${asset_stem%.*}"
    set +e
    internal_refs="$(
      grep -rlF "${asset_stem}" "${skill_dir}" 2>/dev/null \
        | grep -v "^${rel}$" \
        | head -n 1
    )"
    set -e
    if [ -n "${internal_refs}" ]; then
      continue
    fi
  fi

  # Match by basename (with extension) AND by stem (without ext).
  # Many references drop the extension, e.g., `frontend-design` for
  # `frontend-design.md`. Either form counts as a real reference.
  basename_only="$(basename "${rel}")"
  stem="${basename_only%.*}"

  set +e
  refs="$(
    {
      grep -rlF "${basename_only}" \
        "${REFERENCE_DIRS[@]}" \
        "${REFERENCE_ROOTS[@]}" \
        2>/dev/null
      grep -rlwF "${stem}" \
        "${REFERENCE_DIRS[@]}" \
        "${REFERENCE_ROOTS[@]}" \
        2>/dev/null
    } | grep -v "^${rel}$" | head -n 1
  )"
  set -e

  if [ -z "${refs}" ]; then
    ORPHANS+=("${rel}")
  fi
done < "${CANDIDATES_FILE}"

if [ "${#ORPHANS[@]}" -eq 0 ]; then
  echo "✓ No orphans found across ${CANDIDATE_COUNT} candidate files."
  exit 0
fi

echo ""
echo "✗ Orphan candidates: ${#ORPHANS[@]}"
printf '  - %s\n' "${ORPHANS[@]}"
echo ""
echo "Each orphan is a file that is not referenced anywhere else."
echo "Either reference it from an index / rule / skill / agent, OR"
echo "remove it if it's truly unused."
exit 1
