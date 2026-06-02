#!/usr/bin/env bash
#
# verify.sh — Post-install self-test for the global Claude config.
#
# Confirms the rules / skills / agents / commands / templates surface
# is present, well-formed, and free of broken cross-references.
#
# Usage:  ./bootstrap/verify.sh [--prefix PATH] [--verbose]
#
# Exit codes:
#   0  all checks pass
#   1  one or more checks failed
#
set -euo pipefail
IFS=$'\n\t'

PREFIX="${HOME}/.claude"
VERBOSE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix)  PREFIX="$2"; shift 2 ;;
    --verbose) VERBOSE=true; shift ;;
    -h|--help) sed -n '3,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

PASS=0
FAIL=0
FAILED_CHECKS=()

check() {
  local name="$1"
  local actual="$2"
  local op="$3"
  local expected="$4"

  local ok=false
  case "${op}" in
    -eq) [ "${actual}" -eq "${expected}" ] && ok=true ;;
    -ge) [ "${actual}" -ge "${expected}" ] && ok=true ;;
    -gt) [ "${actual}" -gt "${expected}" ] && ok=true ;;
    -le) [ "${actual}" -le "${expected}" ] && ok=true ;;
  esac

  if [ "${ok}" = true ]; then
    PASS=$((PASS + 1))
    [ "${VERBOSE}" = true ] && printf '  ✓ %s  (got %s, expected %s %s)\n' "${name}" "${actual}" "${op}" "${expected}"
    return 0
  fi
  FAIL=$((FAIL + 1))
  FAILED_CHECKS+=("${name}: got ${actual}, expected ${op} ${expected}")
  printf '  ✗ %s  (got %s, expected %s %s)\n' "${name}" "${actual}" "${op}" "${expected}"
}

printf '\n== Phase A: Layout exists ==\n'
check "PREFIX is a directory"          "$([ -d "${PREFIX}" ] && echo 1 || echo 0)" -eq 1
check "CLAUDE.md present"              "$([ -f "${PREFIX}/CLAUDE.md" ] && echo 1 || echo 0)" -eq 1
check "rules/common/ directory"        "$([ -d "${PREFIX}/rules/common" ] && echo 1 || echo 0)" -eq 1
check "skills/ directory"              "$([ -d "${PREFIX}/skills" ] && echo 1 || echo 0)" -eq 1
check "agents/ directory"              "$([ -d "${PREFIX}/agents" ] && echo 1 || echo 0)" -eq 1
check "commands/ directory"            "$([ -d "${PREFIX}/commands" ] && echo 1 || echo 0)" -eq 1
check "hooks/ directory"               "$([ -d "${PREFIX}/hooks" ] && echo 1 || echo 0)" -eq 1
check "templates/ directory"           "$([ -d "${PREFIX}/templates" ] && echo 1 || echo 0)" -eq 1

printf '\n== Phase B: Inventory floors ==\n'
# Floor (rules/common/) is the always-loaded surface. Per the
# lazy-rules-loading architecture (v1.1.0), the rest of the rule
# content lives under rules-library/ and is loaded ON DEMAND via
# skill paths: triggers + skill body references — never auto-walked.
RULES_FLOOR=$(find "${PREFIX}/rules/common" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
LIBRARY_COMMON=$(find "${PREFIX}/rules-library/common" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
LIBRARY_LANG_DIRS=$(find "${PREFIX}/rules-library" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | grep -v '/common$' | wc -l | tr -d ' ')
LIBRARY_TOTAL=$(find "${PREFIX}/rules-library" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
SKILLS=$(find "${PREFIX}/skills" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
SKILLS_WITH_PATHS=0
for s in "${PREFIX}"/skills/*/SKILL.md; do
  [ -f "${s}" ] || continue
  head -40 "${s}" | grep -qE '^paths:' && SKILLS_WITH_PATHS=$((SKILLS_WITH_PATHS + 1))
done
AGENTS=$(find "${PREFIX}/agents" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
COMMANDS=$(find "${PREFIX}/commands" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

# Kept for compatibility with the SUMMARY printf below.
RULES_COMMON="${RULES_FLOOR}"
LANG_DIRS="${LIBRARY_LANG_DIRS}"

check "rules/common/*.md (Floor) ≥ 10"   "${RULES_FLOOR}"      -ge 10
check "rules-library/*.md       ≥ 100"   "${LIBRARY_TOTAL}"    -ge 100
check "rules-library/common/    ≥ 40"    "${LIBRARY_COMMON}"   -ge 40
check "rules-library/ lang dirs ≥ 15"    "${LIBRARY_LANG_DIRS}" -ge 15
check "skills/                  ≥ 90"    "${SKILLS}"           -ge 90
check "skills with paths: trigger ≥ 25"  "${SKILLS_WITH_PATHS}" -ge 25
check "agents/*.md              ≥ 25"    "${AGENTS}"           -ge 25
check "commands/*.md            ≥ 30"    "${COMMANDS}"         -ge 30

printf '\n== Phase C: Agent frontmatter sanity ==\n'
BAD_AGENTS=0
for f in "${PREFIX}"/agents/*.md; do
  [ -f "${f}" ] || continue
  if ! head -10 "${f}" | grep -qE '^name:' || \
     ! head -10 "${f}" | grep -qE '^description:' || \
     ! head -10 "${f}" | grep -qE '^model:'; then
    BAD_AGENTS=$((BAD_AGENTS + 1))
    [ "${VERBOSE}" = true ] && echo "    bad: ${f}"
  fi
done
check "agents missing required frontmatter" "${BAD_AGENTS}" -eq 0

printf '\n== Phase D: Skill SKILL.md presence ==\n'
SKILL_NO_FILE=0
for d in "${PREFIX}"/skills/*/; do
  [ -f "${d}SKILL.md" ] || SKILL_NO_FILE=$((SKILL_NO_FILE + 1))
done
check "skills missing SKILL.md" "${SKILL_NO_FILE}" -eq 0

printf '\n== Phase E: Hook executability ==\n'
HOOK_NOT_EXEC=0
for h in "${PREFIX}"/hooks/*.py "${PREFIX}"/hooks/*.sh; do
  [ -f "${h}" ] || continue
  [ -x "${h}" ] || HOOK_NOT_EXEC=$((HOOK_NOT_EXEC + 1))
done
check "hooks not executable" "${HOOK_NOT_EXEC}" -eq 0

printf '\n== Phase F: Broken cross-references ==\n'
# Collect every referenced rule path. Each ref must resolve to a file
# in EITHER rules/ (Floor) OR rules-library/ (lazy-loaded library).
# Use a temporary disable of -e because grep returns 1 on no-match,
# which under `set -euo pipefail` would abort the whole script.
set +e
REFS=$(grep -rho -E '(rules(-library)?/(common|golang|typescript|python|cpp|csharp|dart|java|kotlin|lua|rust|ruby|swift|bash|sql|markdown|yaml|dockerfile|terraform|html-css|solidity)/[a-z][a-z0-9-]*\.md)' \
  "${PREFIX}/rules" "${PREFIX}/rules-library" "${PREFIX}/skills" "${PREFIX}/CLAUDE.md" "${PREFIX}/agents" 2>/dev/null \
  | sort -u)
set -e
BROKEN=0
if [ -n "${REFS}" ]; then
  while IFS= read -r p; do
    [ -n "${p}" ] || continue
    # Resolve: try the path verbatim first. If that fails AND the path
    # starts with rules/<lang>/<name>.md (Floor-style shorthand), check
    # whether the target lives in rules-library/<lang>/<name>.md.
    if [ -f "${PREFIX}/${p}" ]; then
      continue
    fi
    library_form="${p/rules\//rules-library/}"
    if [ "${library_form}" != "${p}" ] && [ -f "${PREFIX}/${library_form}" ]; then
      continue
    fi
    BROKEN=$((BROKEN + 1))
    [ "${VERBOSE}" = true ] && echo "    broken: ${p}"
  done <<< "${REFS}"
fi
check "broken rule cross-references" "${BROKEN}" -eq 0

printf '\n== Phase G: No project contamination ==\n'
# Token list is per-user + gitignored at ${PREFIX}/.local/project-tokens
# (one regex per line). It contains the operator's own workspace / repo /
# vendor names. Global rules + skills + agents must NEVER mention any of
# them. The scan is OPT-IN — if the token file is absent, Phase G passes
# silently (rather than aborting on a missing user-config). The contamination
# audit shape is documented in principal-level-mandate.md.
TOKENS_FILE="${PREFIX}/.local/project-tokens"
if [ -s "${TOKENS_FILE}" ]; then
  set +e
  CONTAM_FILES=$(grep -rliEf "${TOKENS_FILE}" \
    "${PREFIX}/rules/common" "${PREFIX}/skills" "${PREFIX}/agents" 2>/dev/null \
    | grep -v 'principal-level-mandate\.md' \
    | grep -v 'skill-create\.md')
  set -e
  CONTAM=0
  if [ -n "${CONTAM_FILES}" ]; then
    CONTAM=$(printf '%s\n' "${CONTAM_FILES}" | wc -l | tr -d ' ')
    [ "${VERBOSE}" = true ] && printf '%s\n' "${CONTAM_FILES}" | sed 's/^/    contam: /'
  fi
  check "files with workspace contamination" "${CONTAM}" -eq 0
else
  printf '  ⊘ skipped — %s not present (create it with one regex per line to enable)\n' "${TOKENS_FILE}"
fi

printf '\n== Phase H: Code-graph validation (full scope) ==\n'
# Per ~/.claude/rules/common/code-graph-validation.md rule 9 — the
# pre-push gate runs full-graph validation across the touched-in-plan
# surface + 2-hop closure. verify.sh is the canonical end-to-end check
# script, so it includes the full-scope run.
CODE_GRAPH="${PREFIX}/scripts/code-graph-validate.sh"
if [ -x "${CODE_GRAPH}" ]; then
  CODE_GRAPH_OUT=$("${CODE_GRAPH}" --scope=full --prefix="${PREFIX}" 2>&1)
  CODE_GRAPH_RC=$?
  if [ "${VERBOSE}" = true ]; then
    printf '%s\n' "${CODE_GRAPH_OUT}" | sed 's/^/    /'
  else
    # Show summary line(s) only (PASS / FAIL counts).
    printf '%s\n' "${CODE_GRAPH_OUT}" | grep -E '^(PASS|FAIL|Total|Code-graph)' \
      | sed 's/^/    /' || true
  fi
  check "code-graph validation (full scope)" "${CODE_GRAPH_RC}" -eq 0
else
  printf '  ⊘ skipped — %s not executable\n' "${CODE_GRAPH}"
fi

printf '\n================================================================\n'
printf 'VERIFICATION SUMMARY\n'
printf '================================================================\n'
printf 'Inventory: %s rules.common, %s lang subfolders, %s skills, %s agents, %s commands\n' \
  "${RULES_COMMON}" "${LANG_DIRS}" "${SKILLS}" "${AGENTS}" "${COMMANDS}"
printf 'Checks:    %s passed, %s failed\n' "${PASS}" "${FAIL}"

if [ "${FAIL}" -gt 0 ]; then
  printf '\nFailed checks:\n'
  for entry in "${FAILED_CHECKS[@]}"; do
    printf '  - %s\n' "${entry}"
  done
  printf '\n✗ FAIL\n'
  exit 1
fi

printf '\n✓ PASS — global Claude config is healthy.\n'
exit 0
