#!/bin/sh
set -e

cd /app

/app/scripts/docker-db-init.sh

echo "Starting calculator..."
exec node server.js
