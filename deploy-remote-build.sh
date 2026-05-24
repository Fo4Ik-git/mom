#!/bin/bash
# Sync sources to /mnt/ssd/calculator and build on server.
# Does not modify dev.db — only prisma migrate deploy on container start.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/deploy-ssd.sh
source "${SCRIPT_DIR}/scripts/deploy-ssd.sh"

REMOTE_USER="${1:-}"
REMOTE_IP="${2:-}"

if [ -z "$REMOTE_USER" ]; then
  read -p "Enter remote username: " REMOTE_USER
fi
if [ -z "$REMOTE_IP" ]; then
  read -p "Enter remote IP address: " REMOTE_IP
fi

if [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_IP" ]; then
  echo "Usage: ./deploy-remote-build.sh [user] [host]"
  exit 1
fi

REMOTE_SERVER="${REMOTE_USER}@${REMOTE_IP}"

if [ ! -f .env.docker ]; then
  echo "Missing .env.docker — copy from .env.docker.example and fill in values."
  exit 1
fi

prepare_ssd_for_deploy "${REMOTE_SERVER}"

echo "Syncing project to ${SSD_BASE} ..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'build' \
  --exclude '.git' \
  --exclude 'prisma/*.db' \
  --exclude 'prisma/*.db-journal' \
  --exclude 'logs' \
  --exclude '.idea' \
  --exclude '.DS_Store' \
  --exclude '*.tar' \
  --exclude '.env' \
  --exclude '.env.local' \
  ./ "${REMOTE_SERVER}:${SSD_BASE}/"

scp .env.docker "${REMOTE_SERVER}:${SSD_BASE}/.env.docker"

echo "Building and starting on server..."
ssh "${REMOTE_SERVER}" <<EOF
set -e
cd ${SSD_BASE}
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d --remove-orphans
docker image prune -f
echo "Deployment successful."
EOF

echo "Done. App: ${SSD_BASE}"
