#!/bin/bash
# Build image on PC, upload to server, start (no build on server).
#
# Usage: ./scripts/deploy.sh [user] [host]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SSD_BASE="/mnt/ssd/calculator"
IMAGE_ARCHIVE="calculator-image.tar"

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
  echo "Usage: ./scripts/deploy.sh [user] [host]"
  exit 1
fi

REMOTE="${REMOTE_USER}@${REMOTE_IP}"

if [ ! -f .env.docker ]; then
  echo "Missing .env.docker"
  exit 1
fi

echo "=== Build image on PC ==="
docker compose --env-file .env.docker build

echo "=== Save image ==="
docker save -o "${IMAGE_ARCHIVE}" calculator:latest

echo "=== Upload ==="
ssh "${REMOTE}" "mkdir -p ${SSD_BASE}/scripts ${SSD_BASE}/db/backups ${SSD_BASE}/logs"
rsync -rlvz --omit-dir-times --no-times --no-perms --no-owner --no-group \
  scripts/deploy-server.sh scripts/ssd-db-remote.sh "${REMOTE}:${SSD_BASE}/scripts/"
scp docker-compose.yml .env.docker "${IMAGE_ARCHIVE}" "${REMOTE}:${SSD_BASE}/"

echo "=== Deploy on server (single SSH) ==="
ssh "${REMOTE}" <<EOF
set -euo pipefail
cd ${SSD_BASE}
docker load -i ${IMAGE_ARCHIVE}
rm -f ${IMAGE_ARCHIVE}
chmod +x scripts/*.sh
SKIP_BUILD=1 bash scripts/deploy-server.sh
EOF

rm -f "${IMAGE_ARCHIVE}"
echo "Done. http://${REMOTE_IP}:$(grep -E '^HOST_PORT=' .env.docker 2>/dev/null | cut -d= -f2 || echo 3004)"
