# Docker deployment

The application remains local. The deployment profile builds the actual React frontend, serves it through Nginx and runs Django with Gunicorn and PostgreSQL. It does not use the Vite development server. The profile has separate volumes from the development stack.

1. Copy `.env.example` to `.env.deploy` in the repository root.
2. Set a random `SECRET_KEY` and `DATABASE_PASSWORD`. These values are required; no fallback credentials are used.
3. Start from the repository root:

```sh
docker compose --env-file .env.deploy -f compose.deploy.yaml up --build -d --wait
```

Open <http://127.0.0.1:8080>. API requests use the same origin at `/api/`. PostgreSQL and Gunicorn have no host ports. Stop with:

```sh
docker compose --env-file .env.deploy -f compose.deploy.yaml down
```

This preserves database volumes. To inspect logs, append `logs --tail 100 api web` instead of `down`. Rebuild after application changes. The catalog directory is mounted read-only; replacing its Parquet artifacts requires restarting the API to clear its caches.

## Future server deployment

After a server and domain are assigned, copy this checkout and the catalog, set the domain in `ALLOWED_HOSTS`, and place a TLS reverse proxy in front of the localhost listener. Keep `BIND_ADDRESS=127.0.0.1` when the proxy runs on the host. Forward the original Host header, terminate HTTPS at the proxy, configure trusted origins if session authentication is enabled, and open only the public proxy's ports. Do not expose PostgreSQL directly. Change development credentials before using existing local volumes in another environment.

Back up PostgreSQL with `pg_dump` and separately preserve the catalog files and their provenance. First-request catalog synchronization and monthly aggregation can take longer than warmed queries. This is a development-origin application: operational monitoring, independent scientific validation, shared rate-limiting across Gunicorn workers and an agreed availability target remain future work.
