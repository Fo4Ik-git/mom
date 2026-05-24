# Docker deploy (Calculator)

Усе на SSD: **`/mnt/ssd/calculator`**

| Шлях | Призначення |
|------|-------------|
| `/mnt/ssd/calculator/db/dev.db` | SQLite (деплой **не чіпає**) |
| `/mnt/ssd/calculator/db/backups/` | Автокопії перед кожним деплоєм |
| `/mnt/ssd/calculator/.env.docker` | Секрети |
| `/mnt/ssd/calculator/docker-compose.yml` | Compose (збірка на Pi) |

## База даних

**Деплой ніколи не перезаписує `dev.db`.**

- Код і образ оновлюються через `deploy.sh` / `deploy-remote-build.sh`
- **Перед деплоєм** — автоматична копія: `db/backups/dev.db.YYYYMMDD-HHMMSS` (зберігаються останні 14)
- **Міграції** — `prisma migrate deploy` при **старті контейнера**
- **Новий адмін** — якщо в `.env.docker` є `ADMIN_EMAIL` / `ADMIN_PASSWORD` і такого email ще немає в БД

Контейнер монтує **каталог** `/mnt/ssd/calculator/db` → `/data` (не окремий файл). Якщо монтувати файл, якого ще немає, Docker створює **папку** замість файлу — дані зникають.

```bash
./deploy-remote-build.sh fo4ik 192.168.1.68
# або
./deploy.sh fo4ik 192.168.1.68
```

### Відновлення з бекапу (на сервері)

```bash
cd /mnt/ssd/calculator
ls -lt db/backups/
cp -a db/backups/dev.db.YYYYMMDD-HHMMSS db/dev.db
docker compose --env-file .env.docker restart
```

Або вручну:

```bash
bash scripts/ssd-db-remote.sh backup   # копія зараз
bash scripts/ssd-db-remote.sh repair   # якщо dev.db став папкою
bash scripts/ssd-db-remote.sh status
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
