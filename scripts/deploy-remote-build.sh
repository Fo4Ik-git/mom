#!/bin/bash
# Sync code to server, build image there, migrate DB, start app.
# One SSH session at the end (no password loop).
#
# Usage: ./scripts/deploy-remote-build.sh [user] [host]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SSD_BASE="/mnt/ssd/calculator"

cd "${PROJECT_ROOT}"

REMOTE_USER="${1:-}"
REMOTE_IP="${2:-}"

if [ -z "$REMOTE_USER" ]; then
  read -r -p "SSH user: " REMOTE_USER
fi
if [ -z "$REMOTE_IP" ]; then
  read -r -p "Server IP: " REMOTE_IP
fi

if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_IP" ]; then
  echo "Usage: ./scripts/deploy-remote-build.sh [user] [host]"
  exit 1
fi

REMOTE="${REMOTE_USER}@${REMOTE_IP}"

if [ ! -f .env.docker ]; then
  echo "Missing .env.docker"
  exit 1
fi

echo "=== Sync to ${SSD_BASE} ==="
# Do not use -a on SSD: root dir often rejects chown/utime/chmod (rsync exit 23).
rsync -rlvz --delete \
  --omit-dir-times --no-times --no-perms --no-owner --no-group \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'build' \
  --exclude '.git' \
  --exclude 'prisma/*.db' \
  --exclude 'prisma/*.db-journal' \
  --exclude 'db/' \
  --exclude 'logs' \
  --exclude '.idea' \
  --exclude '.DS_Store' \
  --exclude '*.tar' \
  --exclude '.env' \
  --exclude '.env.local' \
  ./ "${REMOTE}:${SSD_BASE}/"

scp .env.docker "${REMOTE}:${SSD_BASE}/.env.docker"

echo "=== Deploy on server (single SSH) ==="
ssh "${REMOTE}" "chmod +x ${SSD_BASE}/scripts/*.sh && SKIP_BUILD=0 bash ${SSD_BASE}/scripts/deploy-server.sh"

echo ""
echo "Database on server: ${SSD_BASE}/db/dev.db"
echo "  ssh ${REMOTE} \"ls -la ${SSD_BASE}/db/dev.db\""
echo "  sqlite3 ${SSD_BASE}/db/dev.db   # on the server"
