# Docker deploy (Calculator)

Усе на SSD: **`/mnt/ssd/calculator`**

| Шлях | Призначення |
|------|-------------|
| `/mnt/ssd/calculator/db/dev.db` | SQLite (деплой **не чіпає**) |
| `/mnt/ssd/calculator/db/backups/` | Автокопії перед кожним деплоєм |
| `/mnt/ssd/calculator/.env.docker` | Секрети |
| `/mnt/ssd/calculator/scripts/` | Shell-скрипти (repair, backup, deploy) |

## База даних

**Деплой ніколи не перезаписує `dev.db`.**

- Код і образ оновлюються через `scripts/deploy.sh` / `scripts/deploy-remote-build.sh`
- **Перед деплоєм** — автоматична копія: `db/backups/dev.db.YYYYMMDD-HHMMSS` (зберігаються останні 14)
- **Міграції** — `prisma migrate deploy` при **старті контейнера**

Контейнер монтує `/mnt/ssd/calculator/db` → `/app/db`.  
Файл бази на сервере: **`/mnt/ssd/calculator/db/dev.db`** (Prisma: `file:./db/dev.db`).

Локально (без Docker): **`db/dev.db`** в корне проекта.

```bash
./scripts/deploy-remote-build.sh fo4ik 192.168.1.68
# або
./scripts/deploy.sh fo4ik 192.168.1.68
# або майстер:
./scripts/quick-deploy.sh
```

### Тільки скрипти на сервер (без повного деплою)

```bash
rsync -avz scripts/ user@host:/mnt/ssd/calculator/scripts/
ssh user@host "chmod +x /mnt/ssd/calculator/scripts/*.sh"
```

### Repair / backup на сервері

```bash
cd /mnt/ssd/calculator
docker compose --env-file .env.docker down
bash scripts/ssd-db-remote.sh repair
bash scripts/ssd-db-remote.sh status
docker compose --env-file .env.docker up -d
```

### Відновлення з бекапу

```bash
ls -lt /mnt/ssd/calculator/db/backups/
cp -a /mnt/ssd/calculator/db/backups/dev.db.YYYYMMDD-HHMMSS /mnt/ssd/calculator/db/dev.db
docker compose --env-file .env.docker restart
```

## Перший раз на сервері

```bash
sudo mkdir -p /mnt/ssd/calculator/db/backups /mnt/ssd/calculator/logs
sudo chown -R $USER:$USER /mnt/ssd/calculator
```

## Логи

```bash
ssh user@host 'cd /mnt/ssd/calculator && docker compose --env-file .env.docker logs -f'
```
