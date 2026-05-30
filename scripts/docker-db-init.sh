#!/bin/sh
# Migrate SQLite + optional admin seed (container entrypoint + deploy).
set -e

cd /app

strip_quotes() {
  printf '%s' "$1" | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

export DATABASE_URL="$(strip_quotes "${DATABASE_URL:-file:/app/db/dev.db}")"

DB_PATH="${DATABASE_URL#file:}"
case "${DB_PATH}" in
  ./*) DB_PATH="/app/${DB_PATH#./}" ;;
  /*) ;;
  *) DB_PATH="/app/${DB_PATH}" ;;
esac
DB_DIR="$(dirname "${DB_PATH}")"

if [ -d "${DB_PATH}" ]; then
  echo "ERROR: ${DB_PATH} is a directory. On host: bash scripts/ssd-db-remote.sh repair"
  exit 1
fi

if [ ! -d "${DB_DIR}" ] || [ ! -w "${DB_DIR}" ]; then
  echo "ERROR: cannot write to database dir: ${DB_DIR}"
  exit 1
fi

PRISMA_CLI="./migrate/node_modules/prisma/build/index.js"
if [ ! -f "${PRISMA_CLI}" ]; then
  echo "ERROR: Prisma CLI missing at ${PRISMA_CLI}"
  exit 1
fi

echo "Running Prisma migrations..."
node "${PRISMA_CLI}" migrate deploy

if [ ! -f "${DB_PATH}" ]; then
  echo "ERROR: database file not created: ${DB_PATH}"
  exit 1
fi

if [ -n "${ADMIN_EMAIL}" ] && [ -n "${ADMIN_PASSWORD}" ]; then
  echo "Ensuring admin..."
  node /app/scripts/docker-seed-admin.mjs
fi
