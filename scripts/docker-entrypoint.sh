#!/bin/sh
set -e

cd /app

export DATABASE_URL="${DATABASE_URL:-file:./db/dev.db}"

DB_PATH="${DATABASE_URL#file:}"
case "${DB_PATH}" in
  ./*) DB_PATH="/app/${DB_PATH#./}" ;;
esac
DB_DIR="$(dirname "${DB_PATH}")"

if [ -d "${DB_PATH}" ]; then
  echo "ERROR: ${DB_PATH} is a directory, not a SQLite file."
  echo "On the host run:"
  echo "  docker compose down"
  echo "  bash scripts/ssd-db-remote.sh repair"
  echo "  docker compose up -d"
  exit 1
fi

if [ ! -d "${DB_DIR}" ]; then
  echo "ERROR: database directory missing: ${DB_DIR}"
  exit 1
fi

if [ ! -w "${DB_DIR}" ]; then
  echo "ERROR: cannot write to ${DB_DIR} (container user needs write access)."
  echo "On the host run: chmod 777 /mnt/ssd/calculator/db"
  exit 1
fi

if [ -f ./prisma/schema.prisma ] && [ -f ./migrate/node_modules/prisma/build/index.js ]; then
  echo "Running Prisma migrations..."
  node ./migrate/node_modules/prisma/build/index.js migrate deploy
fi

if [ -n "${ADMIN_EMAIL}" ] && [ -n "${ADMIN_PASSWORD}" ]; then
  echo "Ensuring admin from ADMIN_EMAIL..."
  node /app/scripts/docker-seed-admin.mjs
fi

echo "Starting calculator..."
exec node server.js
