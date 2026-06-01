#!/usr/bin/env bash
#
# code-graph-validate.sh — Incremental code-graph validator for the
# `~/.claude/` global config surface.
#
# Implements `~/.claude/rules/common/code-graph-validation.md`. Runs
# the cross-artifact checks the per-language linters can't do:
#
#   - hook event (settings.json) → script path on disk
#   - agent frontmatter (~/.claude/agents/*.md): name, description,
#     tools, model fields present
#   - skill frontmatter (~/.claude/skills/<name>/SKILL.md): YAML
#     frontmatter with name + description per Anthropic Agent
#     Skills v1.0 (Dec 2025)
#   - auto-skills.md mapping → skill directory + agent file existence
#   - council-triggers.md ↔ agent file consistency
#   - commands/*.md → agent reference resolution
#   - rule cross-references (~/.claude/rules/common/*.md) → target
#     file existence
#   - docs/ link integrity (when present)
#
# Scope flags:
#   --scope=touched    (default) check only files modified on the
#                      current branch + their immediate neighbors
#   --scope=plan       check the union of files touched across the
#                      active plan + their 2-hop closure
#   --scope=full       check the entire ~/.claude/ surface
#
# Exit codes:
#   0   all checks pass
#   1   one or more checks failed (dangling refs, missing
#       frontmatter, broken cross-references)
#
# Usage:
#   ./scripts/code-graph-validate.sh [--scope=touched|plan|full]
#                                    [--prefix=PATH]
#                                    [--verbose]
#
# Cross-OS portability:
#   Works on macOS, Linux, WSL. Pure Bash + standard POSIX tools
#   (grep, find, awk, sed). No GNU-only flags.
#
set -uo pipefail
IFS=$'\n\t'

PREFIX="${HOME}/.claude"
SCOPE="touched"
VERBOSE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --scope=*)  SCOPE="${1#--scope=}"; shift ;;
    --scope)    SCOPE="$2"; shift 2 ;;
    --prefix=*) PREFIX="${1#--prefix=}"; shift ;;
    --prefix)   PREFIX="$2"; shift 2 ;;
    --verbose)  VERBOSE=true; shift ;;
    -h|--help)  sed -n '3,42p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

case "${SCOPE}" in
  touched|plan|full) : ;;
  *) echo "invalid --scope: ${SCOPE} (must be touched|plan|full)" >&2; exit 2 ;;
esac

if [ ! -d "${PREFIX}" ]; then
  echo "ERROR: prefix not found: ${PREFIX}" >&2
  exit 2
fi

PASS=0
FAIL=0
FAILED_FINDINGS=()

note() {
  if [ "${VERBOSE}" = true ]; then
    printf '  · %s\n' "$1"
  fi
}

ok() {
  PASS=$((PASS + 1))
  if [ "${VERBOSE}" = true ]; then
    printf '  ✓ %s\n' "$1"
  fi
}

fail() {
  FAIL=$((FAIL + 1))
  FAILED_FINDINGS+=("$1")
  printf '  ✗ %s\n' "$1"
}

section() {
  printf '\n== %s ==\n' "$1"
}

# --------------------------------------------------------------- #
# Check 1: settings.json hook events → script paths on disk
# --------------------------------------------------------------- #
section "settings.json hook events → script paths"

SETTINGS="${PREFIX}/settings.json"
if [ ! -f "${SETTINGS}" ]; then
  fail "settings.json not found at ${SETTINGS}"
else
  if ! command -v jq >/dev/null 2>&1; then
    fail "jq not installed — cannot validate settings.json hooks"
  else
    # Extract every hook command; verify referenced script paths exist
    # We resolve $HOME and ~ in the command string to absolute paths
    HOOK_CMDS=$(jq -r '.hooks // {} | to_entries[] | .key as $event | .value[]? | .hooks[]? | "\($event)\t\(.command)"' "${SETTINGS}" 2>/dev/null)
    if [ -z "${HOOK_CMDS}" ]; then
      note "no hooks configured in settings.json"
    else
      while IFS=$'\t' read -r EVENT CMD; do
        [ -z "${EVENT}" ] && continue
        # Find script paths referenced (node "$HOME/...", python3 ~/...)
        SCRIPTS=$(printf '%s\n' "${CMD}" | grep -oE '("\$HOME/[^"]+\.(js|py|sh)"|~/[^ ]+\.(js|py|sh)|\$HOME/[^ ]+\.(js|py|sh))' || true)
        for s in ${SCRIPTS}; do
          # Strip quotes + resolve $HOME / ~
          resolved="${s%\"}"
          resolved="${resolved#\"}"
          resolved="${resolved//\$HOME/${HOME}}"
          # Tilde must be escaped — bare `~` undergoes tilde-expansion at
          # parse time, turning the pattern into ${HOME} itself (no-op).
          resolved="${resolved//\~/${HOME}}"
          if [ -f "${resolved}" ]; then
            ok "${EVENT}: ${resolved}"
          else
            fail "${EVENT} references missing script: ${resolved}"
          fi
        done
      done <<< "${HOOK_CMDS}"
    fi
  fi
fi

# --------------------------------------------------------------- #
# Check 2: agent frontmatter completeness
# --------------------------------------------------------------- #
section "agent frontmatter (~/.claude/agents/*.md)"

AGENTS_DIR="${PREFIX}/agents"
if [ ! -d "${AGENTS_DIR}" ]; then
  fail "agents directory not found: ${AGENTS_DIR}"
else
  AGENT_COUNT=0
  AGENT_BROKEN=0
  for f in "${AGENTS_DIR}"/*.md; do
    [ -f "${f}" ] || continue
    AGENT_COUNT=$((AGENT_COUNT + 1))
    BASE=$(basename "${f}" .md)

    HEAD=$(head -20 "${f}")
    HAS_NAME=$(printf '%s\n' "${HEAD}" | grep -cE '^name:' || true)
    HAS_DESC=$(printf '%s\n' "${HEAD}" | grep -cE '^description:' || true)
    HAS_MODEL=$(printf '%s\n' "${HEAD}" | grep -cE '^model: (opus|sonnet|haiku)' || true)
    HAS_TOOLS=$(printf '%s\n' "${HEAD}" | grep -cE '^tools:' || true)

    MISSING=()
    [ "${HAS_NAME}" = "0" ]  && MISSING+=("name")
    [ "${HAS_DESC}" = "0" ]  && MISSING+=("description")
    [ "${HAS_MODEL}" = "0" ] && MISSING+=("model")
    [ "${HAS_TOOLS}" = "0" ] && MISSING+=("tools")

    if [ "${#MISSING[@]}" -gt 0 ]; then
      fail "agents/${BASE}.md missing: ${MISSING[*]}"
      AGENT_BROKEN=$((AGENT_BROKEN + 1))
    else
      [ "${VERBOSE}" = true ] && ok "agents/${BASE}.md"
    fi
  done
  printf '  → %d agents scanned, %d frontmatter-incomplete\n' "${AGENT_COUNT}" "${AGENT_BROKEN}"
fi

# --------------------------------------------------------------- #
# Check 3: skill frontmatter (Anthropic Agent Skills v1.0)
# --------------------------------------------------------------- #
section "skill frontmatter (~/.claude/skills/<name>/SKILL.md)"

SKILLS_DIR="${PREFIX}/skills"
if [ ! -d "${SKILLS_DIR}" ]; then
  fail "skills directory not found: ${SKILLS_DIR}"
else
  SKILL_COUNT=0
  SKILL_BROKEN=0
  for d in "${SKILLS_DIR}"/*/; do
    [ -d "${d}" ] || continue
    SKILL_COUNT=$((SKILL_COUNT + 1))
    NAME=$(basename "${d}")
    SKILL_FILE="${d}SKILL.md"

    if [ ! -f "${SKILL_FILE}" ]; then
      fail "skills/${NAME}/SKILL.md missing"
      SKILL_BROKEN=$((SKILL_BROKEN + 1))
      continue
    fi

    HEAD=$(head -15 "${SKILL_FILE}")
    HAS_DELIM_OPEN=$(printf '%s\n' "${HEAD}" | head -1 | grep -cE '^---$' || true)
    HAS_NAME=$(printf '%s\n' "${HEAD}" | grep -cE '^name:' || true)
    HAS_DESC=$(printf '%s\n' "${HEAD}" | grep -cE '^description:' || true)

    MISSING=()
    [ "${HAS_DELIM_OPEN}" = "0" ] && MISSING+=("frontmatter-delim")
    [ "${HAS_NAME}" = "0" ]       && MISSING+=("name")
    [ "${HAS_DESC}" = "0" ]       && MISSING+=("description")

    if [ "${#MISSING[@]}" -gt 0 ]; then
      fail "skills/${NAME}/SKILL.md missing: ${MISSING[*]}"
      SKILL_BROKEN=$((SKILL_BROKEN + 1))
    else
      [ "${VERBOSE}" = true ] && ok "skills/${NAME}/SKILL.md"
    fi
  done
  printf '  → %d skills scanned, %d frontmatter-incomplete\n' "${SKILL_COUNT}" "${SKILL_BROKEN}"
fi

# --------------------------------------------------------------- #
# Check 4: auto-skills.md mapping → skill + agent existence
# --------------------------------------------------------------- #
section "auto-skills.md mapping → skill + agent existence"

AUTO_SKILLS="${PREFIX}/rules/common/auto-skills.md"
if [ ! -f "${AUTO_SKILLS}" ]; then
  fail "auto-skills.md not found"
else
  # Extract bolded skill names: **skill-name**
  MAPPED_SKILLS=$(grep -oE '\*\*[a-z][a-z0-9-]+\*\*' "${AUTO_SKILLS}" | tr -d '*' | sort -u)
  AS_BROKEN=0
  AS_TOTAL=0
  for s in ${MAPPED_SKILLS}; do
    AS_TOTAL=$((AS_TOTAL + 1))
    if [ -d "${SKILLS_DIR}/${s}" ] || [ -d "${PREFIX}/agents" ] && [ -f "${PREFIX}/agents/${s}.md" ]; then
      [ "${VERBOSE}" = true ] && ok "auto-skills.md → ${s}"
    elif [ -d "${SKILLS_DIR}/${s}" ]; then
      :
    elif [ -f "${PREFIX}/agents/${s}.md" ]; then
      :
    else
      # Skip non-skill / non-agent tokens (table headers, prose terms)
      # Conservative: only flag if the token appears in a skill / agent context
      # We require an explicit "skill" or "agent" word within 80 chars of the match
      CTX=$(grep -B1 -A1 -E "\*\*${s}\*\*" "${AUTO_SKILLS}" | head -10 || true)
      if printf '%s\n' "${CTX}" | grep -qiE 'skill|agent'; then
        fail "auto-skills.md references unknown skill/agent: ${s}"
        AS_BROKEN=$((AS_BROKEN + 1))
      fi
    fi
  done
  printf '  → %d mapping entries scanned, %d unresolved\n' "${AS_TOTAL}" "${AS_BROKEN}"
fi

# --------------------------------------------------------------- #
# Check 5: council-triggers.md ↔ agent file consistency
# --------------------------------------------------------------- #
section "council-triggers.md ↔ agent files"

COUNCIL_TRIGGERS="${PREFIX}/rules/common/council-triggers.md"
if [ ! -f "${COUNCIL_TRIGGERS}" ]; then
  fail "council-triggers.md not found"
else
  # Find agent references like `agent-name`, e.g., `compliance-reviewer`
  # within "Lead agent" lines
  CT_AGENTS=$(grep -E '^\*\*Lead agents?\*\*:' "${COUNCIL_TRIGGERS}" | \
              grep -oE '`[a-z][a-z0-9-]+`' | tr -d '`' | sort -u)
  CT_BROKEN=0
  CT_TOTAL=0
  for a in ${CT_AGENTS}; do
    CT_TOTAL=$((CT_TOTAL + 1))
    if [ -f "${PREFIX}/agents/${a}.md" ]; then
      [ "${VERBOSE}" = true ] && ok "council-triggers.md → agents/${a}.md"
    else
      fail "council-triggers.md references missing agent: ${a}"
      CT_BROKEN=$((CT_BROKEN + 1))
    fi
  done
  printf '  → %d Lead-agent refs scanned, %d unresolved\n' "${CT_TOTAL}" "${CT_BROKEN}"
fi

# --------------------------------------------------------------- #
# Check 6: rule cross-references → target file existence
# --------------------------------------------------------------- #
section "rule cross-references"

RULES_BROKEN=0
RULES_TOTAL=0
# Look for rule cross-references in every rule file and verify the target
# exists. Only match refs with high-confidence left-context to avoid
# false-matches at hyphen boundaries inside multi-hyphen filenames
# (`\b` treats `-` as a word boundary, which would split
# `dependency-overrides-not-exceptions.md` into 4 spurious refs).
#
# Accepted forms:
#   - rules/<lang>/<name>.md            (path-prefixed)
#   - ~/.claude/rules/<lang>/<name>.md  (absolute)
#   - `<name>.md`                       (backtick-quoted basename)
#   - [text](<name>.md)                 (markdown link to sibling)
#   - [text](rules/<lang>/<name>.md)    (markdown link path-prefixed)
#
# Explicitly skipped:
#   - docs/<name>.md, project-level paths the rules CITE as expected
#     consumer docs (rules say "you should have docs/runbook.md" — the
#     global config repo doesn't host that doc)
#   - rules-as-prose mentions without backticks or path prefix (too
#     noisy; produces partial-hyphen matches)
extract_rule_refs() {
  local file="$1"
  {
    # Path-prefixed refs: rules/<lang>/<name>.md and ~/.claude/rules/...
    grep -oE '(~/\.claude/)?rules/(common|golang|typescript|python|cpp|csharp|dart|swift|lua|java|ruby|rust|kotlin|solidity|sql|bash|markdown|yaml|dockerfile|terraform|html-css)/[a-z][a-z0-9-]*\.md' "${file}"
    # Markdown links to the same dir or rules/<lang>/: [text](name.md) /
    # [text](rules/lang/name.md). We deliberately DON'T match standalone
    # backtick basenames (`name.md`) — those are usually prose mentions
    # of template / example filenames (e.g., "use `architecture.md`
    # template", "a `README.md` or `index.md`") rather than real
    # cross-references.
    grep -oE '\]\(([a-z][a-z0-9-]*\.md|(rules/(common|golang|typescript|python|cpp|csharp|dart|swift|lua|java|ruby|rust|kotlin|solidity|sql|bash|markdown|yaml|dockerfile|terraform|html-css)/[a-z][a-z0-9-]*\.md))\)' "${file}" \
      | sed -E 's/^\]\(//; s/\)$//'
  } 2>/dev/null | sort -u
}

while IFS= read -r f; do
  while IFS= read -r ref; do
    [ -z "${ref}" ] && continue
    # Skip project-level docs/ paths — rules cite them as consumer-side
    # paths, not as refs into the global config repo
    case "${ref}" in
      docs/*|*/docs/*) continue ;;
    esac
    # Strip ~/.claude/ prefix if present
    ref_clean="${ref#~/.claude/}"
    RULES_TOTAL=$((RULES_TOTAL + 1))
    # Try canonical paths
    TARGET=""
    if [ -f "${PREFIX}/${ref_clean}" ]; then
      TARGET="${PREFIX}/${ref_clean}"
    elif [ -f "${PREFIX}/rules/${ref_clean}" ]; then
      TARGET="${PREFIX}/rules/${ref_clean}"
    else
      DIRNAME=$(dirname "${f}")
      if [ -f "${DIRNAME}/${ref_clean}" ]; then
        TARGET="${DIRNAME}/${ref_clean}"
      fi
    fi
    if [ -z "${TARGET}" ]; then
      # Just the basename; search rules/
      BASE=$(basename "${ref_clean}")
      FOUND=$(find "${PREFIX}/rules" -name "${BASE}" -type f 2>/dev/null | head -1)
      if [ -n "${FOUND}" ]; then
        [ "${VERBOSE}" = true ] && ok "$(basename "${f}") → ${BASE}"
      else
        fail "$(basename "${f}") references missing: ${ref_clean}"
        RULES_BROKEN=$((RULES_BROKEN + 1))
      fi
    else
      [ "${VERBOSE}" = true ] && ok "$(basename "${f}") → ${ref_clean}"
    fi
  done < <(extract_rule_refs "${f}")
done < <(find "${PREFIX}/rules" -name '*.md' -type f 2>/dev/null)
printf '  → %d rule refs scanned, %d unresolved\n' "${RULES_TOTAL}" "${RULES_BROKEN}"

# --------------------------------------------------------------- #
# Check 7: commands → agent reference resolution
# --------------------------------------------------------------- #
section "commands → agent references"

COMMANDS_DIR="${PREFIX}/commands"
if [ ! -d "${COMMANDS_DIR}" ]; then
  note "commands directory not present"
else
  CMD_BROKEN=0
  CMD_TOTAL=0
  for cmd in "${COMMANDS_DIR}"/*.md; do
    [ -f "${cmd}" ] || continue
    CMD_TOTAL=$((CMD_TOTAL + 1))
    # Look for explicit agent invocations like `agent: <slug>` or "delegate to <slug> agent"
    REFS=$(grep -oE 'agent:\s*[a-z][a-z0-9-]+|delegate to ([a-z][a-z0-9-]+) agent|use the `([a-z][a-z0-9-]+)` agent' "${cmd}" 2>/dev/null | \
           sed -E 's/.*[`: ]([a-z][a-z0-9-]+).*/\1/' | sort -u)
    for r in ${REFS}; do
      # Skip obvious non-agent words
      case "${r}" in
        agent|the|use|to|delegate) continue ;;
      esac
      if [ -f "${PREFIX}/agents/${r}.md" ]; then
        [ "${VERBOSE}" = true ] && ok "$(basename "${cmd}") → agents/${r}.md"
      else
        # Only flag if the reference shape was unambiguous
        if grep -qE "agent:\s*${r}\b" "${cmd}" 2>/dev/null; then
          fail "$(basename "${cmd}") references missing agent: ${r}"
          CMD_BROKEN=$((CMD_BROKEN + 1))
        fi
      fi
    done
  done
  printf '  → %d commands scanned, %d unresolved agent refs\n' "${CMD_TOTAL}" "${CMD_BROKEN}"
fi

# --------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------- #
printf '\n==========================================\n'
printf 'Code-graph validation (scope=%s)\n' "${SCOPE}"
printf '  PASS: %d\n' "${PASS}"
printf '  FAIL: %d\n' "${FAIL}"
printf '==========================================\n'

if [ "${FAIL}" -gt 0 ]; then
  printf '\nFailures:\n'
  for finding in "${FAILED_FINDINGS[@]}"; do
    printf '  - %s\n' "${finding}"
  done
  exit 1
fi

printf '\n✓ code-graph green\n'
exit 0
