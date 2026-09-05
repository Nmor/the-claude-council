#!/usr/bin/env bash
#
# install.sh — Bootstrap installer for the global Claude Code config.
#
# Installs the rules / skills / agents / commands / hooks surface
# into the user's ~/.claude/ directory and (optionally) integrates
# with installed IDEs (VS Code, Cursor, Windsurf, JetBrains).
#
# Usage:
#   ./bootstrap/install.sh [--prefix PATH] [--no-ide] [--dry-run] [--force]
#
# Options:
#   --prefix PATH   Install into PATH instead of ~/.claude (testing)
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

PREFIX="${DEFAULT_PREFIX}"
SKIP_IDE=false
DRY_RUN=false
FORCE=false

log()       { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
log_info()  { log "INFO  $*"; }
log_warn()  { log "WARN  $*"; }
log_error() { log "ERROR $*"; }

usage() {
  sed -n '3,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --prefix)   PREFIX="$2"; shift 2 ;;
      --no-ide)   SKIP_IDE=true; shift ;;
      --dry-run)  DRY_RUN=true; shift ;;
      --force)    FORCE=true; shift ;;
      -h|--help)  usage; exit 0 ;;
      *) log_error "unknown option: $1"; usage; exit 1 ;;
    esac
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

  report_optional_capability
}

# report_optional_capability names the external binaries the Council's enabled plugins
# shell out to, and reports which are missing.
#
# It REPORTS and does not install. Two reasons: these are third-party tools that belong
# to the operator's judgement rather than an installer's, and an LSP plugin whose binary
# is absent fails at runtime with "Executable not found in $PATH" — a failure that reads
# as the plugin being broken rather than a prerequisite being unmet. Naming it here turns
# a confusing runtime error into a one-line install.
#
# Nothing below is required: the config installs and works without all of it.
report_optional_capability() {
  local missing=0

  log_info "checking optional capability (reported, never auto-installed)"

  # Language servers backing the LSP plugins in settings.json enabledPlugins. These give
  # Claude automatic diagnostics after every edit — what Golden Rule 5 requires.
  if ! command -v gopls >/dev/null 2>&1; then
    log_warn "gopls absent -> gopls-lsp inert.  go install golang.org/x/tools/gopls@latest"
    missing=1
  fi
  if ! command -v typescript-language-server >/dev/null 2>&1; then
    log_warn "typescript-language-server absent -> typescript-lsp inert.  npm i -g typescript-language-server typescript"
    missing=1
  fi
  if ! command -v pyright-langserver >/dev/null 2>&1; then
    log_warn "pyright-langserver absent -> pyright-lsp inert.  npm i -g pyright"
    missing=1
  fi

  # Token-efficiency + codebase-graph tooling referenced by the capability-uplift plan.
  if ! command -v rtk >/dev/null 2>&1; then
    log_info  "optional: rtk — council-default.md routes verbose listings through it (91% measured).  brew tap rtk-ai/tap && brew install rtk"
  fi
  if ! command -v graphify >/dev/null 2>&1; then
    log_info  "optional: graphify (codebase knowledge graph).  uv tool install graphifyy && graphify install --platform claude"
  fi

  # A language server installed into a directory that is not on PATH is the failure mode
  # that looks like a broken plugin, so it is called out separately from "not installed".
  case ":${PATH}:" in
    *":${HOME}/go/bin:"*) ;;
    *) [ -x "${HOME}/go/bin/gopls" ] && log_warn "gopls exists in ~/go/bin but that is NOT on PATH — add it to your shell profile" ;;
  esac
  case ":${PATH}:" in
    *":${HOME}/.npm-global/bin:"*) ;;
    *) [ -x "${HOME}/.npm-global/bin/typescript-language-server" ] && log_warn "typescript-language-server exists in ~/.npm-global/bin but that is NOT on PATH — add it to your shell profile" ;;
  esac

  [ "${missing}" -eq 0 ] && log_info "all language servers present"
  return 0
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
    # Must name the SAME destination the else-branch writes. A dry run that
    # reports a different path than it takes is worse than no dry run: it is
    # the output people read to decide whether to proceed, and a reader who
    # later finds no extensions.json concludes the install failed when it did
    # not.
    log_info "(dry-run) would: cp ${ext_file} ${target_dir}/extensions.recommended.json"
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
  cat <<EOF

================================================================
✓ Global Claude config installed at ${PREFIX}

Next steps:
  1. Run the self-test:        ${SCRIPT_DIR}/verify.sh
  2. Read the council protocol: ${PREFIX}/CLAUDE.md
  3. Open the docs:            ${REPO_ROOT}/docs/ARCHITECTURE.md

The 15 Floor rules, 160 Library rules, 121 skills, 32 agents,
33 commands, and 14 hooks are now active for every Claude Code
session. Floor rules + CLAUDE.md (~240 KB) load on every
session; the Library + skill bodies load on demand via skill
paths: triggers (lazy-load architecture, ~92% cold-load drop
vs the monolith).

If you backed up an existing ${PREFIX}, the backup is at:
  ${PREFIX}.bak.${TIMESTAMP}

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
  backup_existing
  copy_payload
  rewrite_paths
  ensure_runtime_dirs
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
