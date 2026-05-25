#!/bin/bash
# SSD paths for deploy. Database lives on disk — deploy never deletes it.

SSD_BASE="/mnt/ssd/calculator"
SSD_DB_DIR="${SSD_BASE}/db"
SSD_LOGS_DIR="${SSD_BASE}/logs"
SSD_DB_FILE="${SSD_DB_DIR}/dev.db"
SSD_DB_BACKUP_DIR="${SSD_DB_DIR}/backups"

# SQLite: host /mnt/ssd/calculator/db/dev.db → container /app/db/dev.db
SSD_DATABASE_URL="file:./db/dev.db"

ensure_ssd_dirs() {
  local remote_server="$1"
  ssh -t "${remote_server}" "sudo mkdir -p ${SSD_BASE} ${SSD_DB_DIR} ${SSD_LOGS_DIR} ${SSD_DB_BACKUP_DIR} && sudo chown -R \$(id -u):\$(id -g) ${SSD_BASE} 2>/dev/null || sudo chmod -R 777 ${SSD_BASE}"
  ssh "${remote_server}" "mkdir -p ${SSD_DB_DIR} ${SSD_LOGS_DIR} ${SSD_DB_BACKUP_DIR} && chmod 777 ${SSD_DB_DIR} 2>/dev/null || true"
}

run_ssd_db_action() {
  local remote_server="$1"
  local action="$2"
  ssh "${remote_server}" "bash ${SSD_BASE}/scripts/ssd-db-remote.sh ${action}" 2>/dev/null || \
    _run_ssd_db_action_inline "${remote_server}" "${action}"
}

_run_ssd_db_action_inline() {
  local remote_server="$1"
  local action="$2"
  ssh "${remote_server}" \
    "ACTION='${action}' SSD_BASE='${SSD_BASE}' SSD_DB_DIR='${SSD_DB_DIR}' SSD_DB_FILE='${SSD_DB_FILE}' SSD_DB_BACKUP_DIR='${SSD_DB_BACKUP_DIR}' MAX_DB_BACKUPS='14' bash -s" <<'REMOTE'
set -euo pipefail
SSD_BASE="${SSD_BASE:-/mnt/ssd/calculator}"
SSD_DB_DIR="${SSD_DB_DIR:-${SSD_BASE}/db}"
SSD_DB_FILE="${SSD_DB_FILE:-${SSD_DB_DIR}/dev.db}"
SSD_DB_BACKUP_DIR="${SSD_DB_BACKUP_DIR:-${SSD_DB_DIR}/backups}"
MAX_DB_BACKUPS="${MAX_DB_BACKUPS:-14}"
SCRIPT="${SSD_BASE}/scripts/ssd-db-remote.sh"
if [ -f "${SCRIPT}" ]; then
  exec bash "${SCRIPT}" "${ACTION}"
fi
mkdir -p "${SSD_DB_DIR}" "${SSD_DB_BACKUP_DIR}"
echo "ssd-db-remote.sh not on server yet; upload scripts/ folder first."
exit 1
REMOTE
}

backup_ssd_database() {
  run_ssd_db_action "$1" backup
}

repair_ssd_database() {
  run_ssd_db_action "$1" repair
}

prepare_ssd_for_deploy() {
  local remote_server="$1"
  ensure_ssd_dirs "${remote_server}"
  echo "Protecting database before deploy..."
  run_ssd_db_action "${remote_server}" repair
  run_ssd_db_action "${remote_server}" backup
  run_ssd_db_action "${remote_server}" status
  echo "Schema updates: prisma migrate deploy runs when the container starts."
}

prestart_ssd_database() {
  local remote_server="$1"
  echo "Pre-start database check..."
  run_ssd_db_action "${remote_server}" repair
  run_ssd_db_action "${remote_server}" backup
}
