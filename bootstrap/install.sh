#!/usr/bin/env bash
#
# install.sh — Bootstrap installer for the global Claude Code config.
#
# Installs the rules / skills / agents / commands / hooks surface
# into the user's ~/.claude/ directory and (optionally) integrates
# with installed IDEs (VS Code, Cursor, Windsurf, JetBrains).
#
# Usage:
#   ./bootstrap/install.sh [--config-dir PATH]... [--all]
#                          [--prefix PATH] [--no-ide] [--dry-run] [--force]
#
# Target selection (which Claude config directory to install into):
#   --config-dir PATH   Install into PATH. Repeatable to target several
#                       profiles in one run (e.g. ~/.claude and
#                       ~/.claude-work). Skips the interactive menu.
#   --all               Install into every detected config directory
#                       ($CLAUDE_CONFIG_DIR + ~/.claude + sibling
#                       ~/.claude-* profiles). Skips the menu.
#   --prefix PATH       Back-compat alias for --config-dir.
#
#   With no target flag and an interactive terminal, the installer
#   detects the available config directories and prompts you to pick
#   one, several, or all. With no target flag and no terminal, it
#   installs into $CLAUDE_CONFIG_DIR if set, otherwise ~/.claude.
#
# Other options:
#   --no-ide        Skip IDE integration step
#   --dry-run       Print actions without making changes
#   --force         Overwrite existing destination without backup
#   -h, --help      Show this help
#
# Exit codes:
#   0  success
#   1  prerequisite missing
#   2  user aborted
#   3  copy / link failed
#   4  verification failed
#
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly REPO_ROOT
readonly DEFAULT_PREFIX="${HOME}/.claude"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
readonly TIMESTAMP

# PREFIX is the CURRENT install target. With multi-config support it is
# reassigned once per selected directory inside main()'s install loop;
# every install helper (backup_existing / copy_payload / rewrite_paths /
# ensure_runtime_dirs) reads it. It starts at the default so a sourced
# script (tests) sees a sane value without running selection.
PREFIX="${DEFAULT_PREFIX}"
# CONFIG_DIRS collects explicit --config-dir / --prefix targets.
# TARGETS is the resolved, deduped list main() iterates over.
CONFIG_DIRS=()
TARGETS=()
INSTALL_ALL=false
SKIP_IDE=false
DRY_RUN=false
FORCE=false

log()       { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
log_info()  { log "INFO  $*"; }
log_warn()  { log "WARN  $*"; }
log_error() { log "ERROR $*"; }

usage() {
  cat <<'EOF'
install.sh — Bootstrap installer for the global Claude Code config.

Usage:
  ./bootstrap/install.sh [--config-dir PATH]... [--all]
                         [--prefix PATH] [--no-ide] [--dry-run] [--force]

Target selection (which Claude config directory to install into):
  --config-dir PATH   Install into PATH. Repeatable to target several
                      profiles in one run (e.g. ~/.claude and
                      ~/.claude-work). Skips the interactive menu.
  --all               Install into every detected config directory
                      ($CLAUDE_CONFIG_DIR + ~/.claude + sibling
                      ~/.claude-* profiles). Skips the menu.
  --prefix PATH       Back-compat alias for --config-dir.

  With no target flag and an interactive terminal, the installer
  detects the available config directories and prompts you to pick
  one, several, or all. With no target flag and no terminal, it
  installs into $CLAUDE_CONFIG_DIR if set, otherwise ~/.claude.

Other options:
  --no-ide        Skip IDE integration step
  --dry-run       Print actions without making changes
  --force         Overwrite existing destination without backup
  -h, --help      Show this help
EOF
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --prefix)      [ $# -ge 2 ] || { log_error "--prefix needs a PATH"; exit 1; }
                     CONFIG_DIRS+=("$2"); shift 2 ;;
      --config-dir)  [ $# -ge 2 ] || { log_error "--config-dir needs a PATH"; exit 1; }
                     CONFIG_DIRS+=("$2"); shift 2 ;;
      --all)         INSTALL_ALL=true; shift ;;
      --no-ide)      SKIP_IDE=true; shift ;;
      --dry-run)     DRY_RUN=true; shift ;;
      --force)       FORCE=true; shift ;;
      -h|--help)     usage; exit 0 ;;
      *) log_error "unknown option: $1"; usage; exit 1 ;;
    esac
  done
}

# normalize_dir — expand a leading ~, collapse trailing slashes.
# Keeps a bare "/" intact. Pure string work; does not touch the FS.
normalize_dir() {
  local d="$1"
  # Expand a leading ~ / ~/ to $HOME. Done via prefix-strip rather than a
  # "~/"* case glob so ShellCheck doesn't read it as a (non-expanding)
  # quoted tilde (SC2088).
  if [ "${d}" = "~" ]; then
    d="${HOME}"
  elif [ "${d#\~/}" != "${d}" ]; then
    d="${HOME}/${d#\~/}"
  fi
  while [ "${#d}" -gt 1 ] && [ "${d%/}" != "${d}" ]; do
    d="${d%/}"
  done
  printf '%s' "${d}"
}

# detect_config_dirs — emit candidate Claude config directories, one
# per line, deduped, in priority order:
#   1. $CLAUDE_CONFIG_DIR (the active profile, when set) — the
#      documented override that relocates every ~/.claude path.
#   2. $HOME/.claude (the default profile).
#   3. Sibling profile dirs $HOME/.claude-* (e.g. .claude-work),
#      excluding installer backups (*.bak.*, *.uninstalled.*).
# Candidates need not exist yet; the installer creates the target.
detect_config_dirs() {
  local -a cands=()
  if [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then
    cands+=("$(normalize_dir "${CLAUDE_CONFIG_DIR}")")
  fi
  cands+=("$(normalize_dir "${HOME}/.claude")")
  local g
  for g in "${HOME}"/.claude-*; do
    [ -d "${g}" ] || continue
    case "${g}" in
      *.bak.*|*.uninstalled.*) continue ;;
    esac
    cands+=("$(normalize_dir "${g}")")
  done

  # Dedupe preserving order. `seen` is a |-delimited membership string;
  # path chars never include "|" in practice, and the surrounding
  # delimiters make the match exact.
  local seen="|" c
  for c in "${cands[@]+"${cands[@]}"}"; do
    case "${seen}" in
      *"|${c}|"*) continue ;;
    esac
    seen="${seen}${c}|"
    printf '%s\n' "${c}"
  done
}

# prompt_targets — interactive menu. Reads detected dirs as args,
# writes the menu to stderr, and prints the chosen dir(s) to stdout
# (one per line). Returns non-zero on invalid input.
prompt_targets() {
  local -a detected=("$@")
  local i d state
  {
    printf '\n'
    printf 'Multiple Claude config directories can host The Council.\n'
    printf 'Each is an independent profile (switched via CLAUDE_CONFIG_DIR).\n\n'
    printf 'Select where to install:\n\n'
    i=1
    for d in "${detected[@]}"; do
      if [ -d "${d}" ]; then state="exists"; else state="will be created"; fi
      printf '  %d) %s  (%s)\n' "${i}" "${d}" "${state}"
      i=$((i + 1))
    done
    printf '  a) all of the above\n'
    printf '  c) a custom path not listed above\n\n'
    printf 'Enter choice [number(s) space/comma separated, "a", or "c"; default 1]: '
  } >&2

  local reply
  read -r reply || reply=""
  reply="$(printf '%s' "${reply}" | tr ',' ' ')"

  case "${reply}" in
    ""|" ")
      printf '%s\n' "${detected[0]}" ;;
    a|A|all|ALL)
      printf '%s\n' "${detected[@]}" ;;
    c|C|custom)
      local custom
      printf 'Enter the config directory path: ' >&2
      read -r custom || custom=""
      if [ -z "${custom}" ]; then
        log_error "no path entered"
        return 1
      fi
      normalize_dir "${custom}"; printf '\n' ;;
    *)
      # The script-wide IFS is $'\n\t' (no space), so split the index
      # list on spaces/tabs/newlines locally. `local IFS` is restored
      # on return. Validate EVERY token before emitting anything, so an
      # invalid token yields no partial selection (the caller treats an
      # empty result as "nothing selected" and aborts cleanly).
      local tok idx count="${#detected[@]}" out=""
      local IFS=$' \t\n'
      for tok in ${reply}; do
        case "${tok}" in
          *[!0-9]*|"")
            log_error "invalid selection: '${tok}' (expected a number, 'a', or 'c')"
            return 1 ;;
        esac
        idx="${tok}"
        if [ "${idx}" -lt 1 ] || [ "${idx}" -gt "${count}" ]; then
          log_error "selection out of range: ${idx} (1-${count})"
          return 1
        fi
        out="${out}${detected[$((idx - 1))]}
"
      done
      printf '%s' "${out}" ;;
  esac
}

# resolve_targets — populate the global TARGETS array from flags or the
# interactive menu, applying this precedence:
#   explicit --config-dir/--prefix  ∪  (--all → all detected)
#   else interactive menu (tty)  else default (CLAUDE_CONFIG_DIR | ~/.claude)
# The result is normalized + deduped and always has at least one entry.
resolve_targets() {
  local -a chosen=()
  local c

  for c in "${CONFIG_DIRS[@]+"${CONFIG_DIRS[@]}"}"; do
    chosen+=("$(normalize_dir "${c}")")
  done

  if [ "${INSTALL_ALL}" = true ]; then
    while IFS= read -r c; do
      [ -n "${c}" ] && chosen+=("${c}")
    done < <(detect_config_dirs)
  fi

  # No explicit targets: prompt when interactive, else fall back.
  if [ "${#chosen[@]}" -eq 0 ]; then
    if [ -t 0 ] && [ -t 1 ]; then
      local -a detected=()
      while IFS= read -r c; do
        [ -n "${c}" ] && detected+=("${c}")
      done < <(detect_config_dirs)
      while IFS= read -r c; do
        [ -n "${c}" ] && chosen+=("${c}")
      done < <(prompt_targets "${detected[@]}")
      if [ "${#chosen[@]}" -eq 0 ]; then
        log_error "no install target selected"
        exit 2
      fi
    elif [ -n "${CLAUDE_CONFIG_DIR:-}" ]; then
      chosen+=("$(normalize_dir "${CLAUDE_CONFIG_DIR}")")
    else
      chosen+=("$(normalize_dir "${DEFAULT_PREFIX}")")
    fi
  fi

  # Dedupe preserving order into the global TARGETS.
  TARGETS=()
  local seen="|" t
  for t in "${chosen[@]+"${chosen[@]}"}"; do
    case "${seen}" in
      *"|${t}|"*) continue ;;
    esac
    seen="${seen}${t}|"
    TARGETS+=("${t}")
  done
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "required command missing: $cmd"
    exit 1
  fi
}

check_prereqs() {
  log_info "checking prerequisites"
  log_info "detected platform: $(detect_platform)"
  require_cmd cp
  require_cmd mkdir
  require_cmd find

  # claude CLI optional — warn only
  if ! command -v claude >/dev/null 2>&1; then
    log_warn "claude CLI not on PATH — install from https://docs.claude.com/claude-code"
    log_warn "the global config will still install; claude CLI must be installed separately"
  fi
}

backup_existing() {
  if [ ! -e "${PREFIX}" ]; then
    return 0
  fi

  if [ "${FORCE}" = true ]; then
    log_warn "--force set; overwriting ${PREFIX} without backup"
    return 0
  fi

  local backup="${PREFIX}.bak.${TIMESTAMP}"
  log_info "backing up existing ${PREFIX} -> ${backup}"
  if [ "${DRY_RUN}" = true ]; then
    log_info "(dry-run) would: mv ${PREFIX} ${backup}"
  else
    mv "${PREFIX}" "${backup}"
  fi
}

copy_payload() {
  log_info "installing config surface into ${PREFIX}"

  # The payload is everything in the repo except the bootstrap
  # surface itself + version-control + IDE temp files + ANY per-
  # user runtime / local state.  When the install runs from a clone
  # most of these dirs don't exist; the excludes are defensive so
  # that running install.sh from a populated ~/.claude/ (or against
  # a self-update layout where the source already has runtime state)
  # cannot leak personal content into the consumer's install.
  local -a excludes=(
    # Version control + CI + docs (consumer doesn't need these)
    --exclude='.git'
    --exclude='.github'
    --exclude='bootstrap'
    --exclude='tests'
    --exclude='docs'
    --exclude='README.md'
    --exclude='INSTALL.md'
    --exclude='CHANGELOG.md'
    --exclude='CODE_OF_CONDUCT.md'
    --exclude='SECURITY.md'
    --exclude='LICENSE'
    --exclude='.gitignore'
    --exclude='.markdownlint.jsonc'
    # OS junk
    --exclude='.DS_Store'
    --exclude='*.swp'
    --exclude='*.bak'
    --exclude='*.orig'
    --exclude='Thumbs.db'
    # Per-user / per-session RUNTIME directories (gitignored)
    --exclude='projects'
    --exclude='sessions'
    --exclude='session-env'
    --exclude='telemetry'
    --exclude='statsig'
    --exclude='file-history'
    --exclude='shell-snapshots'
    --exclude='todos'
    --exclude='ide'
    --exclude='debug'
    --exclude='cache'
    --exclude='downloads'
    --exclude='backups'
    --exclude='contexts'
    --exclude='mcp-configs'
    # Per-user PLAN / AUDIT / MEMORY state (gitignored everywhere)
    --exclude='plans'
    --exclude='audits'
    --exclude='memory'
    # Per-user staging surfaces
    --exclude='.local'
    --exclude='.last-cleanup'
    --exclude='.claude-skipped'
    --exclude='mcp-needs-auth-cache.json'
    --exclude='plugins/installed_plugins.json'
    # Dev tooling artefacts
    --exclude='node_modules'
    --exclude='__pycache__'
    --exclude='*.pyc'
    --exclude='.pytest_cache'
    --exclude='*.lock-info'
  )

  if [ "${DRY_RUN}" = true ]; then
    log_info "(dry-run) would: rsync -a ${excludes[*]} ${REPO_ROOT}/ ${PREFIX}/"
    return 0
  fi

  mkdir -p "${PREFIX}"

  if command -v rsync >/dev/null 2>&1; then
    rsync -a "${excludes[@]}" "${REPO_ROOT}/" "${PREFIX}/"
  else
    # rsync-free fallback: cp then prune the unwanted paths
    cp -R "${REPO_ROOT}/." "${PREFIX}/"
    for path in .git .github bootstrap tests docs README.md INSTALL.md \
                CHANGELOG.md LICENSE .gitignore projects sessions \
                session-env telemetry statsig file-history shell-snapshots \
                todos ide debug cache downloads backups; do
      rm -rf "${PREFIX:?}/${path}" 2>/dev/null || true
    done
  fi
  log_info "config surface installed"
}

rewrite_paths() {
  # Belt-and-suspenders sweep: the global rule
  # ~/.claude/rules/common/rule-authoring-global-vs-project.md
  # forbids project-specific absolute paths from appearing in shipped
  # config. Authoring review should catch every leak, but a typo can
  # slip past. This pass scans the installed payload for the original
  # author's home path and rewrites it to use the installer's $HOME.
  log_info "scanning installed payload for stray absolute paths"

  if [ "${DRY_RUN}" = true ]; then
    log_info "(dry-run) would: scan ${PREFIX} for stray author paths and rewrite"
    return 0
  fi

  # The author path that must NEVER appear in shipped config.
  local author_path='/Users/APPLE/'

  local hits
  hits="$(grep -rl \
            --include='*.md' --include='*.json' --include='*.js' \
            --include='*.py' --include='*.sh' --include='*.ts' \
            --include='*.tsx' --include='*.yaml' --include='*.yml' \
            --include='*.toml' --include='*.xml' \
            --binary-files=without-match \
            -F "${author_path}" "${PREFIX}" 2>/dev/null || true)"

  if [ -z "${hits}" ]; then
    log_info "  no stray author paths found"
    return 0
  fi

  local count
  count="$(printf '%s\n' "${hits}" | wc -l | tr -d ' ')"
  log_warn "found stray author paths in ${count} file(s); rewriting to \$HOME"

  if ! command -v perl >/dev/null 2>&1; then
    log_error "perl not on PATH; cannot rewrite stray paths automatically"
    log_error "files containing the author path:"
    printf '%s\n' "${hits}" >&2
    log_error "fix manually by replacing '${author_path}' with '${HOME}/' in each file"
    return 3
  fi

  printf '%s\n' "${hits}" | while IFS= read -r f; do
    [ -z "${f}" ] && continue
    # Use HOME at install time, not literal ${HOME}. Each install bakes
    # the installer's home directory. The replacement uses Perl's
    # $ENV{HOME} which expands once per file at execution.
    perl -i -pe 'BEGIN { $h = $ENV{HOME} . "/" } s|/Users/APPLE/|$h|g' "${f}"
  done
  log_info "  rewrite complete; ${count} file(s) now reference the installer's \$HOME"
}

ensure_runtime_dirs() {
  log_info "ensuring runtime directories"
  local -a dirs=(
    "${PREFIX}/audits"
    "${PREFIX}/audits/archive"
    "${PREFIX}/plans"
    "${PREFIX}/plans/archive"
    "${PREFIX}/plans/tasks"
    "${PREFIX}/file-history"
    "${PREFIX}/sessions"
    "${PREFIX}/session-env"
    "${PREFIX}/projects"
    "${PREFIX}/telemetry"
    "${PREFIX}/statsig"
    "${PREFIX}/ide"
    "${PREFIX}/debug"
    "${PREFIX}/cache"
  )
  for d in "${dirs[@]}"; do
    if [ "${DRY_RUN}" = true ]; then
      log_info "(dry-run) would: mkdir -p ${d}"
    else
      mkdir -p "${d}"
    fi
  done
}

detect_ides() {
  local -a found=()
  # Check PATH first (binary `code` / `cursor` / `windsurf` installed
  # via the IDE's "Install code command in PATH" step).
  command -v code >/dev/null 2>&1 && found+=("vscode")
  command -v cursor >/dev/null 2>&1 && found+=("cursor")
  command -v windsurf >/dev/null 2>&1 && found+=("windsurf")

  # macOS — .app bundle installs that haven't added the binary to PATH.
  # Users frequently install via drag-to-Applications and never run
  # "Shell Command: Install code command in PATH" from the IDE menu.
  # We detect by the canonical .app location and the embedded binary
  # path.
  if [ "$(uname -s)" = "Darwin" ]; then
    if ! printf '%s\n' "${found[@]+"${found[@]}"}" | grep -q '^vscode$'; then
      for app in "/Applications/Visual Studio Code.app" \
                 "/Applications/Visual Studio Code - Insiders.app" \
                 "/Applications/Visual Studio Code 3.app" \
                 "${HOME}/Applications/Visual Studio Code.app"; do
        if [ -d "${app}" ]; then
          found+=("vscode"); break
        fi
      done
    fi
    if ! printf '%s\n' "${found[@]+"${found[@]}"}" | grep -q '^cursor$'; then
      for app in "/Applications/Cursor.app" "${HOME}/Applications/Cursor.app"; do
        if [ -d "${app}" ]; then
          found+=("cursor"); break
        fi
      done
    fi
    if ! printf '%s\n' "${found[@]+"${found[@]}"}" | grep -q '^windsurf$'; then
      for app in "/Applications/Windsurf.app" "${HOME}/Applications/Windsurf.app"; do
        if [ -d "${app}" ]; then
          found+=("windsurf"); break
        fi
      done
    fi
  fi

  # Linux — Flatpak installs and Snap installs are common on Ubuntu
  # but don't add binaries to PATH by default. We probe the
  # canonical install paths.
  if [ "$(uname -s)" = "Linux" ]; then
    if ! printf '%s\n' "${found[@]+"${found[@]}"}" | grep -q '^vscode$'; then
      for d in /usr/share/code /snap/code/current /var/lib/flatpak/app/com.visualstudio.code \
               "${HOME}/.local/share/flatpak/app/com.visualstudio.code" /opt/visual-studio-code; do
        if [ -d "${d}" ]; then
          found+=("vscode"); break
        fi
      done
    fi
    if ! printf '%s\n' "${found[@]+"${found[@]}"}" | grep -q '^cursor$'; then
      for d in /usr/share/cursor /opt/cursor "${HOME}/.local/share/applications/cursor.desktop"; do
        if [ -e "${d}" ]; then
          found+=("cursor"); break
        fi
      done
    fi
  fi

  # JetBrains: detect across macOS / Linux / WSL2.
  # macOS:  /Applications/<IDE>.app
  # Linux:  ~/.local/share/JetBrains/Toolbox/apps/  OR  /opt/<ide>/
  # WSL2:   /mnt/c/Program Files/JetBrains/  (Windows-side install)
  # Also: launcher binaries on PATH (`idea`, `goland`, `pycharm`,
  # `webstorm`, `phpstorm`, `rubymine`, `clion`, `rustrover`).
  local -a launchers=(idea goland pycharm webstorm phpstorm rubymine clion rustrover datagrip fleet)
  local launcher
  for launcher in "${launchers[@]}"; do
    if command -v "${launcher}" >/dev/null 2>&1; then
      found+=("jetbrains")
      break
    fi
  done

  if ! printf '%s\n' "${found[@]+"${found[@]}"}" | grep -q '^jetbrains$'; then
    local -a candidate_dirs=(
      "/Applications"
      "${HOME}/.local/share/JetBrains/Toolbox/apps"
      "${HOME}/Applications/JetBrains Toolbox"
      "/opt"
      "/mnt/c/Program Files/JetBrains"
      "/snap/intellij-idea-community"
      "/snap/intellij-idea-ultimate"
      "/snap/pycharm-community"
      "/snap/pycharm-professional"
      "/snap/goland"
      "/snap/webstorm"
    )
    local dir entry matched=false
    for dir in "${candidate_dirs[@]}"; do
      [ -d "${dir}" ] || continue
      for entry in "${dir}"/*; do
        [ -e "${entry}" ] || continue
        case "$(basename "${entry}" | tr '[:upper:]' '[:lower:]')" in
          *intellij*|*idea*|*goland*|*pycharm*|*webstorm*|*phpstorm*|*rubymine*|*clion*|*rustrover*|*datagrip*|*fleet*)
            matched=true
            break 2
            ;;
        esac
      done
    done
    if [ "${matched}" = true ]; then
      found+=("jetbrains")
    fi
  fi

  printf '%s\n' "${found[@]+"${found[@]}"}"
}

# Best-effort platform name for logging
detect_platform() {
  case "$(uname -s 2>/dev/null)" in
    Darwin)  printf 'macos' ;;
    Linux)
      if grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; then
        printf 'linux-wsl'
      else
        printf 'linux'
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*) printf 'windows-git-bash' ;;
    *) printf 'unknown' ;;
  esac
}

integrate_ide_vscode() {
  local ext_file="${PREFIX}/templates/ide-configs/vscode/extensions.json"
  [ -f "${ext_file}" ] || { log_warn "no VS Code extensions template; skipping"; return 0; }

  log_info "VS Code detected — applying recommended extensions list"
  local target_dir="${HOME}/.vscode"
  mkdir -p "${target_dir}"
  if [ "${DRY_RUN}" = true ]; then
    log_info "(dry-run) would: cp ${ext_file} ${target_dir}/extensions.json"
  else
    # User-level recommendations are an opt-in suggestion; don't overwrite
    # an existing list — copy as .recommended for user review.
    cp "${ext_file}" "${target_dir}/extensions.recommended.json"
    log_info "  saved to ${target_dir}/extensions.recommended.json (review + merge manually)"
  fi
}

integrate_ide_cursor() {
  local ext_file="${PREFIX}/templates/ide-configs/cursor/settings.json"
  [ -f "${ext_file}" ] || return 0
  log_info "Cursor detected — see ${PREFIX}/templates/ide-configs/cursor/ for recommended settings"
}

integrate_ide_windsurf() {
  local ext_file="${PREFIX}/templates/ide-configs/windsurf/settings.json"
  [ -f "${ext_file}" ] || return 0
  log_info "Windsurf detected — see ${PREFIX}/templates/ide-configs/windsurf/ for recommended settings"
}

integrate_ide_jetbrains() {
  local readme="${PREFIX}/templates/ide-configs/jetbrains/README.md"
  [ -f "${readme}" ] || return 0
  log_info "JetBrains family detected — see ${readme} for the Claude Code plugin install"
  log_info "  install via: Settings → Plugins → search 'Claude Code'"
}

integrate_ides() {
  if [ "${SKIP_IDE}" = true ]; then
    log_info "--no-ide set; skipping IDE integration"
    return 0
  fi

  local detected
  detected="$(detect_ides)"
  if [ -z "${detected}" ]; then
    log_info "no supported IDEs detected on PATH; skipping IDE integration"
    return 0
  fi

  log_info "integrating with detected IDEs: $(echo "${detected}" | tr '\n' ' ')"
  while IFS= read -r ide; do
    case "${ide}" in
      vscode)    integrate_ide_vscode ;;
      cursor)    integrate_ide_cursor ;;
      windsurf)  integrate_ide_windsurf ;;
      jetbrains) integrate_ide_jetbrains ;;
    esac
  done <<< "${detected}"
}

post_install_message() {
  local targets_block="" first_target="" t
  for t in "${TARGETS[@]+"${TARGETS[@]}"}"; do
    targets_block="${targets_block}  • ${t}
"
    [ -z "${first_target}" ] && first_target="${t}"
  done

  cat <<EOF

================================================================
✓ Global Claude config installed into:
${targets_block}
Next steps:
  1. Run the self-test:        ${SCRIPT_DIR}/verify.sh --prefix "${first_target}"
  2. Read the council protocol: ${first_target}/CLAUDE.md
  3. Open the docs:            ${REPO_ROOT}/docs/ARCHITECTURE.md

If you installed into more than one directory, re-run the
self-test once per target, passing each with --prefix.

The 15 Floor rules, 160 Library rules, 121 skills, 32 agents,
33 commands, and 14 hooks are now active for every Claude Code
session. Floor rules + CLAUDE.md (~240 KB) load on every
session; the Library + skill bodies load on demand via skill
paths: triggers (lazy-load architecture, ~92% cold-load drop
vs the monolith).

Any directory that already existed was backed up alongside
itself as <dir>.bak.${TIMESTAMP} (unless --force was used).

----------------------------------------------------------------
Forking this repo? Apply branch protection to your fork
----------------------------------------------------------------
Before contributors land their first PR, configure branch
protection on the default branch of your fork. The exact
required settings + audit commands are documented at:

  ${REPO_ROOT}/docs/branch-protection.md

Quick reference (run from a clone of your fork; requires
GitHub CLI authenticated as a maintainer):

  OWNER=<your-org-or-user>
  REPO=<your-repo-name>
  gh api "repos/\${OWNER}/\${REPO}/branches/main/protection" --jq '{
    required_pull_request_reviews: .required_pull_request_reviews,
    required_status_checks:        .required_status_checks,
    enforce_admins:                .enforce_admins.enabled,
    restrictions:                  .restrictions
  }'

Per the Council Protocol (~/.claude/CLAUDE.md), no PR merges
to main without explicit CODEOWNER review approval.
================================================================
EOF
}

main() {
  parse_args "$@"
  check_prereqs
  resolve_targets

  log_info "install target(s): $(printf '%s ' "${TARGETS[@]}")"

  # Per-target install. PREFIX is the current target each iteration;
  # the install helpers read it. IDE integration is machine-level
  # (writes to ~/.vscode etc.), so it runs once after the loop.
  local target
  for target in "${TARGETS[@]}"; do
    PREFIX="${target}"
    log_info "──────────────────────────────────────────────"
    log_info "installing into ${PREFIX}"
    backup_existing
    copy_payload
    rewrite_paths
    ensure_runtime_dirs
  done

  integrate_ides

  if [ "${DRY_RUN}" = true ]; then
    log_info "dry-run complete; no changes made"
  else
    post_install_message
  fi
}

# Run main ONLY when this script is executed directly, NOT when
# it is sourced.  Sourcing should expose the helper functions
# without running an install — sourcing is how tests and tooling
# inspect the script without taking destructive action.
# `${BASH_SOURCE[0]}` is the path of this script; `$0` is the
# name of the running shell (when sourced) or the script (when
# executed).  When they're equal, this script is being executed
# directly; when different, it's being sourced.
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi
