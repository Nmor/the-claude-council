#!/usr/bin/env bash
#
# uninstall.sh — Remove the global Claude config installed by install.sh.
#
# By default this moves ${HOME}/.claude/ to a timestamped backup directory
# instead of deleting it outright. Pass --purge to delete unconditionally.
#
# Usage: ./bootstrap/uninstall.sh [--prefix PATH] [--purge] [--dry-run]
#
set -euo pipefail
IFS=$'\n\t'

PREFIX="${HOME}/.claude"
PURGE=false
DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --prefix)  PREFIX="$2"; shift 2 ;;
    --purge)   PURGE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) sed -n '3,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

if [ ! -e "${PREFIX}" ]; then
  echo "nothing to uninstall — ${PREFIX} does not exist"
  exit 0
fi

if [ "${PURGE}" = true ]; then
  printf 'WARNING: --purge will DELETE %s and ALL its contents.\n' "${PREFIX}"
  printf 'This includes per-project memory, session history, learning candidates.\n'
  printf 'Type "yes-delete" to confirm: '
  read -r confirm
  if [ "${confirm}" != "yes-delete" ]; then
    echo "aborted."
    exit 2
  fi

  if [ "${DRY_RUN}" = true ]; then
    echo "(dry-run) would: rm -rf ${PREFIX}"
  else
    rm -rf "${PREFIX}"
    echo "purged ${PREFIX}"
  fi
  exit 0
fi

# Default: archive to timestamped backup
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="${PREFIX}.uninstalled.${TIMESTAMP}"

if [ "${DRY_RUN}" = true ]; then
  echo "(dry-run) would: mv ${PREFIX} ${BACKUP}"
else
  mv "${PREFIX}" "${BACKUP}"
  echo "archived ${PREFIX} -> ${BACKUP}"
  echo "to restore: mv ${BACKUP} ${PREFIX}"
  echo "to purge:   rm -rf ${BACKUP}"
fi
