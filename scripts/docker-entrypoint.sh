#!/bin/sh
set -e

cd /app

export DATABASE_URL="${DATABASE_URL:-file:./prisma/dev.db}"

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
