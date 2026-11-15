# Guía de Deployment para 3 Meses (Opciones Gratuitas / Estudiantes)

Este proyecto (`EarthSync · TerraSync`) está preparado con **arquitectura dual** para mantenerse desplegado durante **3 meses (o más) sin costo** y con funcionamiento garantizado:

1. **Conexión en vivo a PostgreSQL + Django** cuando exista `VITE_API_BASE_URL` o proxy `/api`.
2. **Respaldo automático en snapshots estáticos** (`public/data-snapshots/catalog-events.json` y `model-metrics.json`) si el servidor entra en reposo o si se publica únicamente en **GitHub Pages**.

---

## Comparativa de Opciones Recomendadas

| Opción | Frontend | Backend Django | PostgreSQL | Costo (3 meses) | Ventajas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. GitHub Pages + DigitalOcean Student Pack (Recomendada)** | **GitHub Pages** (`gh-pages` via `.github/workflows/deploy-pages.yml`) | **DigitalOcean Droplet ($6/mes)** usando el crédito estudiantil ($200 USD gratis con GitHub Student Developer Pack) | PostgreSQL 16 incluido en `compose.deploy.yaml` | **$0 USD** (~$18 USD cubiertos por el crédito) | Cero tiempos de espera por hibernación ("cold start"), soporta exportación nativa `.xlsx`, Redis y los 3,290+ eventos en PostgreSQL en `<50 ms`. |
| **2. 100% Gratis Híbrida (Render + Neon + GitHub Pages)** | **GitHub Pages** | **Render Free Web Service** (Docker / `deployment/api.Dockerfile`) | **Neon.tech Free Tier** (0.5 GB PostgreSQL serverless permanente) | **$0 USD** | Sin tarjeta de crédito. Cuando Render hiberna tras 15 min sin visitas, el frontend usa el snapshot local mientras el contenedor despierta. |
| **3. 100% Autónoma en GitHub Pages** | **GitHub Pages** | No requerido (`public/data-snapshots/`) | Precompilado desde PostgreSQL al ejecutar `python scripts/export_static_snapshots.py` | **$0 USD** | Disponibilidad continua del 100%, velocidad `<15 ms`, mantenimiento cero durante los 3 meses. |

---

## Pasos Rápidos de Publicación

### A. Publicar en GitHub Pages (automático)
1. En el repositorio de GitHub ve a **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. (Opcional si despliegas backend en Render/DigitalOcean) Agrega la variable de repositorio `VITE_API_BASE_URL=https://tu-backend.onrender.com`.
3. Haz push a la rama `integration` o `main`; el flujo [deploy-pages.yml](../../.github/workflows/deploy-pages.yml) compilará el sitio con `VITE_BASE_PATH=/404-Gravity-Not-Found/` y publicará la PWA.

### B. Levantar Backend + PostgreSQL con `compose.deploy.yaml` (DigitalOcean / VPS estudiantil)
```bash
cp .env.example .env.deploy
# Configura SECRET_KEY y DATABASE_PASSWORD en .env.deploy
docker compose --env-file .env.deploy -f compose.deploy.yaml up -d --build
```
