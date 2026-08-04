# MZT APPS — self-hosted deployment

Single Proxmox host running Jenkins + Docker Compose. Caddy is the single public
entrypoint so `/api` and `/storage` stay same-origin (no CORS).

```
http://<server-ip>:3015   -> Caddy -> frontend (Nitro, port 3000)
                        \-> /api|/storage -> backend (Laravel nginx+php-fpm, :80)
                        \-> db (MariaDB 11.4, internal :3306)
```

## Host layout (`$DEPLOY_DIR`, default `/opt/mzt`)

```
/opt/mzt/
  docker-compose.yml     <- copied from frontend repo deploy/
  Caddyfile              <- copied from frontend repo deploy/
  .env                   <- cp deploy/.env.example .env  then edit
  db/init/               <- drop the SQL dump here (first boot only)
  storage/               <- mirror of backend repo storage/app (media files)
  backend/               <- git clone Misyad/laravel-mzt
  frontend/              <- git clone Misyad/maziltu-design-studio
```

## One-time host preparation

**1. Prerequisites**
```sh
apt-get update && apt-get install -y git docker-ce docker-compose-v2
usermod -aG docker jenkins      # whichever user Jenkins runs as
```

**2. Data the operator must supply (NOT in git):**
```sh
# Database dump (from the cPanel backup), placed so MariaDB imports it on first boot:
cp mazw9983_alvinade_maziltu.sql /opt/mzt/db/init/

# Media files: mirror the local backend's storage/app (photos, bar codes, etc):
#   local:  D:\MZT APPS\laravel-mzt\storage\app
#   host:   /opt/mzt/storage  (must contain storage/app/public/... layout)
scp -r storage/app/. jenkins@HOST:/opt/mzt/storage/

# Backend .env values -> edit /opt/mzt/.env
#   APP_KEY : (cd laravel-mzt && php artisan key:generate --show)
#   MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD
#   VITE_API_BASE_URL = http://<server-ip>:3015/api
#   APP_URL           = http://<server-ip>:3015
```
`db/init` is only imported the very first time the `dbdata` volume is empty.
To re-import: `docker compose down -v && docker compose up -d` (destroys all data).

**3. Create the Jenkins pipeline** pointing at the frontend repo
(`Misyad/maziltu-design-studio`, branch `main`, Jenkinsfile `deploy/Jenkinsfile`).

## First deploy via Jenkins

1. Run `Sync source` (clones repos, copies orchestration, creates `.env`).
2. Fill in `/opt/mzt/.env` (APP_KEY, passwords, IP).
3. Place the SQL dump + media, then run the `Deploy` stage (or trigger the whole
   pipeline; it preserves `.env`/`db/init`/`storage`).

```sh
cd /opt/mzt && docker compose up -d --build
```

Then verify:
- `http://<IP>:3015`                  -> frontend
- `http://<IP>:3015/api/public/stats` -> backend (public endpoint)
- Login at `http://<IP>:3015/login`

## Adding a domain later

Swap the `http://:80` address in `Caddyfile` for the domain (e.g. `app.example.com`)
and Caddy auto-provisions HTTPS. Rebuild the frontend with the matching
`VITE_API_BASE_URL = https://app.example.com/api` and set `APP_URL` to match.

## Notes / caveats

- No CORS: `/api` and `/storage` are proxied by Caddy, so the browser only ever
  talks to the single public origin.
- The browser uses `VITE_API_BASE_URL`; the SSR node-server uses
  `SSR_API_BASE_URL` (default `http://host.docker.internal:3015/api`, which the
  host routes back to Caddy). `extra_hosts` maps `host.docker.internal`.
- File session/cache drivers are used; they live in the image's `storage/framework`
  so they reset on container recreate (fine for this app).
- If the app uploads new media, the host bind dir must be writable by the
  container's `www-data` (run `chown -R www-data:www-data /opt/mzt/storage` on
  the host) — media may be read-only if only reading existing files.
- `APP_KEY` and MYSQL passwords are passed as container env; Laravel's PHP-FPM is
  configured with `clear_env = no` so `env()` reads them (no `.env` file needed
  inside the image).