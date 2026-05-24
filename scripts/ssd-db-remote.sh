#!/bin/bash
# Run on the server (or via ssh from deploy-ssd.sh).
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

repair_database_file() {
  if [ ! -d "${SSD_DB_FILE}" ]; then
    return 0
  fi

  echo "WARNING: ${SSD_DB_FILE} is a directory (Docker file-mount bug). Recovering..."

  local recovered=""
  if [ -f "${SSD_DB_FILE}/dev.db" ]; then
    recovered="${SSD_DB_FILE}/dev.db"
  else
    recovered="$(find "${SSD_DB_FILE}" -maxdepth 3 -type f \( -name 'dev.db' -o -name '*.db' \) 2>/dev/null | head -1 || true)"
  fi

  rm -rf "${SSD_DB_FILE}"

  if [ -n "${recovered}" ] && [ -f "${recovered}" ]; then
    mv "${recovered}" "${SSD_DB_FILE}"
    echo "Recovered database from nested file: ${recovered}"
    return 0
  fi

  local latest
  latest="$(ls -1t "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | head -1 || true)"
  if [ -n "${latest}" ] && [ -f "${latest}" ]; then
    cp -a "${latest}" "${SSD_DB_FILE}"
    echo "Restored database from backup: ${latest}"
    return 0
  fi

  echo "No recovery source found. A new database will be created on container start."
}

backup_database() {
  repair_database_file

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

status_database() {
  repair_database_file

  if [ -f "${SSD_DB_FILE}" ]; then
    echo "Database: ${SSD_DB_FILE} ($(du -h "${SSD_DB_FILE}" | cut -f1), unchanged by deploy sync)"
    local count
    count="$(ls -1 "${SSD_DB_BACKUP_DIR}"/dev.db.[0-9]* 2>/dev/null | grep -v journal | wc -l | tr -d ' ')"
    echo "Backups: ${SSD_DB_BACKUP_DIR} (${count} file(s), keep last ${MAX_DB_BACKUPS})"
  elif [ -d "${SSD_DB_FILE}" ]; then
    echo "Database: ${SSD_DB_FILE} is still a directory — run: $0 repair"
    exit 1
  else
    echo "Database: ${SSD_DB_FILE} not found yet."
    echo "  It will be created on first container start (migrations + optional admin seed)."
  fi
}

action="${1:-status}"
case "${action}" in
  backup) backup_database ;;
  repair) repair_database_file ;;
  status) status_database ;;
  *)
    echo "Usage: $0 {backup|repair|status}"
    exit 1
    ;;
esac
