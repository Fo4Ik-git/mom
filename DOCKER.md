# Docker deploy

Дані на SSD: **`/mnt/ssd/calculator`**

| Шлях | Призначення |
|------|-------------|
| `/mnt/ssd/calculator/db/dev.db` | SQLite **на диску сервера** (не в контейнері) |
| `db/backups/` | Копії перед деплоєм |
| `.env.docker` | Секрети |

## Деплой

```bash
# Збірка на сервері (рекомендовано)
./scripts/deploy-remote-build.sh user 192.168.1.68

# Збірка на ПК → образ на сервер
./scripts/deploy.sh user 192.168.1.68
```

Один SSH у кінці: `deploy-server.sh` — repair/backup → build → migrate → up.

## Перший раз на сервері

```bash
sudo mkdir -p /mnt/ssd/calculator
sudo chown -R $USER:$USER /mnt/ssd/calculator
chmod u+rwX /mnt/ssd/calculator
```

Якщо rsync скаржиться на `failed to set times` — перевірте власника каталогу (`ls -la /mnt/ssd`).

## Доступ к БД на сервере (без Docker)

Контейнер монтує папку хоста → всё, что пишет приложение, лежит здесь:

**`/mnt/ssd/calculator/db/dev.db`**

```bash
# на сервере
ls -la /mnt/ssd/calculator/db/
sqlite3 /mnt/ssd/calculator/db/dev.db

# DBeaver / DB Browser for SQLite / TablePlus
# Open file → /mnt/ssd/calculator/db/dev.db
```

В контейнере тот же файл виден как `/app/db/dev.db` (`DATABASE_URL=file:/app/db/dev.db`).

После исправления пути деплой создаёт файл именно на SSD. Если файла нет — ещё раз:

```bash
./scripts/deploy-remote-build.sh user host
```

## Ручне обслуговування БД

```bash
cd /mnt/ssd/calculator
bash scripts/ssd-db-remote.sh status   # repair | backup | restore | scan
```

## Логи

```bash
ssh user@host 'cd /mnt/ssd/calculator && docker compose --env-file .env.docker logs -f'
```
