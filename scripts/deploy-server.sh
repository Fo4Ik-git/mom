#!/bin/bash
# Runs on the server (one SSH session from deploy-remote-build.sh or deploy.sh).
set -euo pipefail

SSD_BASE="${SSD_BASE:-/mnt/ssd/calculator}"
SSD_DB_DIR="${SSD_DB_DIR:-${SSD_BASE}/db}"
SSD_DB_FILE="${SSD_DB_FILE:-${SSD_DB_DIR}/dev.db}"
SSD_LOGS_DIR="${SSD_LOGS_DIR:-${SSD_BASE}/logs}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
SKIP_BUILD="${SKIP_BUILD:-0}"

cd "${SSD_BASE}"

mkdir -p "${SSD_DB_DIR}" "${SSD_DB_DIR}/backups" "${SSD_LOGS_DIR}"
chmod 777 "${SSD_DB_DIR}" "${SSD_LOGS_DIR}" 2>/dev/null || true

if [ -f scripts/ssd-db-remote.sh ]; then
  bash scripts/ssd-db-remote.sh repair
  bash scripts/ssd-db-remote.sh backup
fi

compose() {
  docker compose -f "${COMPOSE_FILE}" --env-file .env.docker "$@"
}

if [ "${SKIP_BUILD}" = "1" ]; then
  echo "=== Using pre-loaded image ==="
else
  echo "=== Building Docker image ==="
  compose build
fi

echo "=== Database: migrate + admin seed ==="
compose run --rm --no-deps \
  --entrypoint /app/scripts/docker-db-init.sh \
  calculator

if [ ! -f "${SSD_DB_FILE}" ]; then
  echo "ERROR: database missing: ${SSD_DB_FILE}"
  compose logs --tail 60 calculator 2>/dev/null || true
  exit 1
fi
echo "Database OK: $(du -h "${SSD_DB_FILE}" | cut -f1)  ${SSD_DB_FILE}"

echo "=== Starting application ==="
compose up -d --remove-orphans

sleep 3
if ! compose ps --status running 2>/dev/null | grep -q calculator; then
  echo "ERROR: calculator is not running."
  compose logs --tail 80 calculator
  exit 1
fi

if [ -f scripts/ssd-db-remote.sh ]; then
  bash scripts/ssd-db-remote.sh backup
fi

docker image prune -f
compose ps
echo ""
echo "Deployment successful."
echo "Database on server (open without Docker):"
echo "  ${SSD_DB_FILE}"
echo "  sqlite3 ${SSD_DB_FILE}"
echo "  # GUI: SQLite → Open → ${SSD_DB_FILE}"
