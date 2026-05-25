#!/bin/bash
# Build on your PC → upload image to /mnt/ssd/calculator → run (no build on server).
# db/ is never synced; dev.db is backed up on the server before container start.
#
# Run from project root:
#   ./scripts/deploy.sh [user] [host]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=deploy-ssd.sh
source "${SCRIPT_DIR}/deploy-ssd.sh"

cd "${PROJECT_ROOT}"

REMOTE_USER="${1:-}"
REMOTE_IP="${2:-}"

if [ -z "$REMOTE_USER" ]; then
  read -p "SSH user: " REMOTE_USER
fi
if [ -z "$REMOTE_IP" ]; then
  read -p "Server IP: " REMOTE_IP
fi

if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_IP" ]; then
  echo "Usage: ./scripts/deploy.sh [user] [host]"
  exit 1
fi

REMOTE_SERVER="${REMOTE_USER}@${REMOTE_IP}"
IMAGE_ARCHIVE="calculator-image.tar"
CONTAINER_NAME="calculator-1"

if [ ! -f .env.docker ]; then
  echo "Create .env.docker from .env.docker.example first."
  exit 1
fi

echo "=== 1/4 Build image on this PC ==="
if docker image inspect "calculator:latest" &>/dev/null; then
  read -p "Image calculator:latest exists. Rebuild? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose --env-file .env.docker build --no-cache
  fi
else
  docker compose --env-file .env.docker build
fi

echo "=== 2/4 Save image ==="
docker save -o "${IMAGE_ARCHIVE}" "calculator:latest"
echo "Archive size: $(du -h "${IMAGE_ARCHIVE}" | cut -f1)"

prepare_ssd_for_deploy "${REMOTE_SERVER}"

echo "=== 3/4 Upload to ${SSD_BASE} ==="
scp docker-compose.deploy.yml "${IMAGE_ARCHIVE}" .env.docker "${REMOTE_SERVER}:${SSD_BASE}/"
scp scripts/ssd-db-remote.sh scripts/deploy-ssd.sh "${REMOTE_SERVER}:${SSD_BASE}/scripts/" 2>/dev/null || true
ssh "${REMOTE_SERVER}" "chmod +x ${SSD_BASE}/scripts/*.sh 2>/dev/null || true"

echo "=== 4/4 Start on server ==="
prestart_ssd_database "${REMOTE_SERVER}"

ssh "${REMOTE_SERVER}" <<EOF
set -e
cd ${SSD_BASE}
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true
docker load -i ${IMAGE_ARCHIVE}
docker compose -f docker-compose.deploy.yml --env-file .env.docker up -d --no-build --remove-orphans
rm -f ${IMAGE_ARCHIVE}
docker image prune -f
docker compose -f docker-compose.deploy.yml --env-file .env.docker ps
EOF

rm -f "${IMAGE_ARCHIVE}"
echo ""
echo "Done. ${SSD_BASE}"
echo "Open: http://${REMOTE_IP}:$(grep -E '^HOST_PORT=|^APP_PORT=' .env.docker | head -1 | cut -d= -f2 || echo 3004)"
