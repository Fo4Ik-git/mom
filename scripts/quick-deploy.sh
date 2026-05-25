#!/bin/bash
# Quick deploy wizard for Mom (calculator platform).
#
# Run from project root:
#   ./scripts/quick-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Calculator — деплой у Docker (дані на SSD: /mnt/ssd/calculator)"
echo "========================================================"
echo ""

read -p "IP сервера: " SERVER_IP
read -p "SSH користувач [$(whoami)]: " USERNAME
USERNAME=${USERNAME:-$(whoami)}
read -p "Порт додатку [3004]: " APP_PORT
APP_PORT=${APP_PORT:-3004}

echo ""
echo "Сервер: ${USERNAME}@${SERVER_IP}"
echo "Порт:   ${APP_PORT}"
echo "SSD:    /mnt/ssd/calculator/db, /mnt/ssd/calculator/logs"
echo ""

if [ ! -f .env.docker ]; then
  echo "Створюємо .env.docker з прикладу..."
  cp .env.docker.example .env.docker
  sed -i.bak "s|YOUR_SERVER_IP|${SERVER_IP}|g" .env.docker
  sed -i.bak "s|:3004|:${APP_PORT}|g" .env.docker
  rm -f .env.docker.bak
  echo "Відредагуйте .env.docker (AUTH_SECRET, паролі) перед продакшеном!"
fi

read -p "Продовжити? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  exit 0
fi

echo ""
echo "1) Збірка на ПК + готовий образ на сервер (рекомендовано)"
echo "2) Збірка на сервері (rsync коду)"
read -p "Вибір [1]: " deploy_method
deploy_method=${deploy_method:-1}

export APP_PORT
if [ "$deploy_method" = "2" ]; then
  "${SCRIPT_DIR}/deploy-remote-build.sh" "$USERNAME" "$SERVER_IP"
else
  "${SCRIPT_DIR}/deploy.sh" "$USERNAME" "$SERVER_IP"
fi

echo ""
echo "Готово: http://${SERVER_IP}:${APP_PORT}"
echo "Логи:  ssh ${USERNAME}@${SERVER_IP} 'cd /mnt/ssd/calculator && docker compose -f docker-compose.deploy.yml --env-file .env.docker logs -f'"
