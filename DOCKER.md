# Docker deploy (Calculator)

Усе на SSD: **`/mnt/ssd/calculator`**

| Шлях | Призначення |
|------|-------------|
| `/mnt/ssd/calculator/db/dev.db` | SQLite (деплой **не чіпає**) |
| `/mnt/ssd/calculator/.env.docker` | Секрети |
| `/mnt/ssd/calculator/docker-compose.yml` | Compose (збірка на Pi) |

## База даних

**Деплой ніколи не перезаписує `dev.db`.**

- Код і образ оновлюються через `deploy.sh` / `deploy-remote-build.sh`
- **Міграції** — `prisma migrate deploy` при **старті контейнера**
- **Новий адмін** — якщо в `.env.docker` є `ADMIN_EMAIL` / `ADMIN_PASSWORD` і такого email ще немає в БД

```bash
./deploy-remote-build.sh fo4ik 192.168.1.68
# або
./deploy.sh fo4ik 192.168.1.68
```

## Перший раз на сервері

```bash
sudo mkdir -p /mnt/ssd/calculator/db /mnt/ssd/calculator/logs
sudo chown -R $USER:$USER /mnt/ssd/calculator
```

## Логи

```bash
ssh user@host 'cd /mnt/ssd/calculator && docker compose --env-file .env.docker logs -f'
```
