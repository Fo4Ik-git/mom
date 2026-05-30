#!/bin/bash
# Run on the server (deploy-server.sh calls repair/backup; or run manually).
# Protects SQLite at /mnt/ssd/calculator/db/dev.db — backup, repair, never delete on deploy.

set -euo pipefail

SSD_BASE="${SSD_BASE:-/mnt/ssd/calculator}"
SSD_DB_DIR="${SSD_DB_DIR:-${SSD_BASE}/db}"
SSD_DB_FILE="${SSD_DB_FILE:-${SSD_DB_DIR}/dev.db}"
SSD_DB_BACKUP_DIR="${SSD_DB_BACKUP_DIR:-${SSD_DB_DIR}/backups}"
MAX_DB_BACKUPS="${MAX_DB_BACKUPS:-14}"

mkdir -p "${SSD_DB_DIR}" "${SSD_DB_BACKUP_DIR}"

prune_old_backups() {
  local list
  list="$(ls -1t "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal || true)"
  if [ -z "${list}" ]; then
    return 0
  fi
  echo "${list}" | tail -n +"$((MAX_DB_BACKUPS + 1))" | while read -r old; do
    rm -f "${old}" "${old}-journal" "${old}-wal" "${old}-shm" 2>/dev/null || true
  done
}

is_sqlite_file() {
  local path="$1"
  [ -f "${path}" ] && file "${path}" 2>/dev/null | grep -qi sqlite
}

find_largest_db() {
  local search_root="$1"
  local best="" size=0 candidate candidate_size
  while IFS= read -r candidate; do
    [ -z "${candidate}" ] && continue
    if is_sqlite_file "${candidate}" || [[ "${candidate}" == *.db ]]; then
      candidate_size="$(stat -c%s "${candidate}" 2>/dev/null || stat -f%z "${candidate}" 2>/dev/null || echo 0)"
      if [ "${candidate_size}" -gt "${size}" ]; then
        best="${candidate}"
        size="${candidate_size}"
      fi
    fi
  done < <(find "${search_root}" -type f \( -name 'dev.db' -o -name '*.db' \) 2>/dev/null)
  echo "${best}"
}

find_recovery_source() {
  local source=""
  if [ -d "${SSD_DB_FILE}" ]; then
    source="$(find_largest_db "${SSD_DB_FILE}")"
    [ -n "${source}" ] && echo "${source}" && return 0
  fi
  if [ -f "${SSD_DB_FILE}" ]; then
    echo "${SSD_DB_FILE}"
    return 0
  fi
  source="$(find_largest_db "${SSD_DB_DIR}")"
  [ -n "${source}" ] && echo "${source}" && return 0
  local latest
  latest="$(ls -1t "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | grep -v '\.dir\.' | head -1 || true)"
  [ -n "${latest}" ] && [ -f "${latest}" ] && echo "${latest}" && return 0
  local dir_backup
  dir_backup="$(ls -1td "${SSD_DB_BACKUP_DIR}"/dev.db.dir.[0-9]* 2>/dev/null | head -1 || true)"
  if [ -n "${dir_backup}" ] && [ -d "${dir_backup}" ]; then
    source="$(find_largest_db "${dir_backup}")"
    [ -n "${source}" ] && echo "${source}" && return 0
  fi
  return 1
}

repair_database_file() {
  if [ -f "${SSD_DB_FILE}" ]; then
    echo "Database file OK: ${SSD_DB_FILE} ($(du -h "${SSD_DB_FILE}" | cut -f1))"
    return 0
  fi

  if [ ! -d "${SSD_DB_FILE}" ]; then
    local latest
    latest="$(ls -1t "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | grep -v '\.dir\.' | head -1 || true)"
    if [ -n "${latest}" ] && [ -f "${latest}" ]; then
      cp -a "${latest}" "${SSD_DB_FILE}"
      echo "Restored database from backup: ${latest}"
      return 0
    fi
    echo "Nothing to repair: ${SSD_DB_FILE} does not exist."
    echo "  Run: $0 scan   — search for .db files"
    echo "  Run: $0 restore — restore latest backup"
    return 0
  fi

  echo "WARNING: ${SSD_DB_FILE} is a directory (Docker file-mount bug)."

  local stamp dir_backup recovered temp
  stamp="$(date +%Y%m%d-%H%M%S)"
  dir_backup="${SSD_DB_BACKUP_DIR}/dev.db.dir.${stamp}"

  echo "Saving full directory copy to ${dir_backup} ..."
  cp -a "${SSD_DB_FILE}" "${dir_backup}"

  recovered="$(find_largest_db "${SSD_DB_FILE}")"
  if [ -z "${recovered}" ]; then
    recovered="$(find_largest_db "${dir_backup}")"
  fi

  temp="${SSD_DB_BACKUP_DIR}/dev.db.recovering.${stamp}"
  if [ -n "${recovered}" ] && [ -f "${recovered}" ]; then
    cp -a "${recovered}" "${temp}"
    rm -rf "${SSD_DB_FILE}"
    mv "${temp}" "${SSD_DB_FILE}"
    echo "Recovered database from: ${recovered}"
    echo "Directory backup kept at: ${dir_backup}"
    return 0
  fi

  rm -rf "${SSD_DB_FILE}"

  local latest
  latest="$(ls -1t "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | grep -v '\.dir\.' | grep -v recovering | head -1 || true)"
  if [ -n "${latest}" ] && [ -f "${latest}" ]; then
    cp -a "${latest}" "${SSD_DB_FILE}"
    echo "Restored database from backup: ${latest}"
    echo "Empty directory backup kept at: ${dir_backup}"
    return 0
  fi

  echo "No database file found inside directory."
  echo "Directory backup saved at: ${dir_backup}"
  echo "Search manually: $0 scan"
  return 1
}

backup_database() {
  if [ -d "${SSD_DB_FILE}" ]; then
    echo "Cannot backup: ${SSD_DB_FILE} is a directory. Run: $0 repair"
    exit 1
  fi

  if [ ! -f "${SSD_DB_FILE}" ]; then
    echo "Database backup skipped (no file at ${SSD_DB_FILE})."
    return 0
  fi

  local stamp backup
  stamp="$(date +%Y%m%d-%H%M%S)"
  backup="${SSD_DB_BACKUP_DIR}/dev.db.${stamp}"

  cp -a "${SSD_DB_FILE}" "${backup}"
  for suffix in -journal -wal -shm; do
    if [ -f "${SSD_DB_FILE}${suffix}" ]; then
      cp -a "${SSD_DB_FILE}${suffix}" "${backup}${suffix}"
    fi
  done

  prune_old_backups
  echo "Database backup: ${backup} ($(du -h "${backup}" | cut -f1))"
}

restore_database() {
  local latest="${1:-}"
  if [ -z "${latest}" ]; then
    latest="$(ls -1t "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | grep -v '\.dir\.' | grep -v recovering | head -1 || true)"
  fi
  if [ -z "${latest}" ] || [ ! -f "${latest}" ]; then
    echo "No backup found in ${SSD_DB_BACKUP_DIR}"
    echo "Run: $0 scan"
    exit 1
  fi
  if [ -d "${SSD_DB_FILE}" ]; then
    local stamp dir_backup
    stamp="$(date +%Y%m%d-%H%M%S)"
    dir_backup="${SSD_DB_BACKUP_DIR}/dev.db.dir.${stamp}"
    cp -a "${SSD_DB_FILE}" "${dir_backup}"
    rm -rf "${SSD_DB_FILE}"
    echo "Saved directory to ${dir_backup}"
  fi
  cp -a "${latest}" "${SSD_DB_FILE}"
  echo "Restored ${SSD_DB_FILE} from ${latest}"
}

scan_database() {
  echo "=== ${SSD_DB_DIR} ==="
  ls -la "${SSD_DB_DIR}" 2>/dev/null || true
  echo ""
  echo "=== SQLite / .db files under ${SSD_BASE} ==="
  find "${SSD_BASE}" -type f \( -name '*.db' -o -name '*.db-journal' -o -name '*.db-wal' \) 2>/dev/null \
    | while read -r path; do
      echo "$(du -h "${path}" | cut -f1)  ${path}  ($(file -b "${path}" 2>/dev/null || echo unknown))"
    done
  echo ""
  echo "=== Backups ==="
  ls -lt "${SSD_DB_BACKUP_DIR}" 2>/dev/null || echo "(no backups dir)"
}

status_database() {
  if [ -d "${SSD_DB_FILE}" ]; then
    echo "PROBLEM: ${SSD_DB_FILE} is a directory (not a file)."
    echo "  Run: $0 repair"
    echo "  Inspect: $0 scan"
    exit 1
  fi

  if [ -f "${SSD_DB_FILE}" ]; then
    echo "Database: ${SSD_DB_FILE} ($(du -h "${SSD_DB_FILE}" | cut -f1))"
    local count
    count="$(ls -1 "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | grep -v '\.dir\.' | grep -v recovering | wc -l | tr -d ' ')"
    echo "Backups: ${SSD_DB_BACKUP_DIR} (${count} file(s), keep last ${MAX_DB_BACKUPS})"
    return 0
  fi

  echo "Database: ${SSD_DB_FILE} not found."
  echo "  Backups / stray files: $0 scan"
  echo "  Restore latest backup: $0 restore"
  echo "  Or start container to create a fresh database."
}

action="${1:-status}"
case "${action}" in
  backup) backup_database ;;
  repair) repair_database_file ;;
  restore) restore_database "${2:-}" ;;
  scan) scan_database ;;
  status) status_database ;;
  *)
    echo "Usage: $0 {status|scan|repair|backup|restore [backup-file]}"
    exit 1
    ;;
esac
