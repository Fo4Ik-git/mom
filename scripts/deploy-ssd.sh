#!/bin/bash
# SSD paths for deploy. Database is never modified by deploy scripts.

SSD_BASE="/mnt/ssd/calculator"
SSD_DB_DIR="${SSD_BASE}/db"
SSD_LOGS_DIR="${SSD_BASE}/logs"
SSD_DB_FILE="${SSD_DB_DIR}/dev.db"

ensure_ssd_dirs() {
  local remote_server="$1"
  ssh -t "${remote_server}" "sudo mkdir -p ${SSD_BASE} ${SSD_DB_DIR} ${SSD_LOGS_DIR} && sudo chown -R \$(id -u):\$(id -g) ${SSD_BASE} 2>/dev/null || sudo chmod -R 777 ${SSD_BASE}"
  ssh "${remote_server}" "mkdir -p ${SSD_DB_DIR} ${SSD_LOGS_DIR}"
}

prepare_ssd_for_deploy() {
  local remote_server="$1"
  ensure_ssd_dirs "${remote_server}"
  if ssh "${remote_server}" "test -f ${SSD_DB_FILE}"; then
    echo "Database: ${SSD_DB_FILE} (unchanged by deploy)."
  else
    echo "Database: ${SSD_DB_FILE} not found yet."
    echo "  It will be created on first container start (migrations + optional admin seed)."
  fi
  echo "Schema updates: prisma migrate deploy runs when the container starts."
}
