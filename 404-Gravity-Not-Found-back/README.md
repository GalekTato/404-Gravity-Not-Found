# Backend NASA

Estructura modular de backend construida con **Django REST Framework**, **PostgreSQL**, **Redis** y **Docker Compose**, basada en la arquitectura de `boom-backend` (sin componentes Rust).

---

## 📁 Estructura del Proyecto

```text
backend_nasa/
├── Dockerfile                  # Imagen Docker para el servicio Django (Python 3.12-slim)
├── docker-compose.yml          # Orquestación de servicios (PostgreSQL 16, Redis 7, Django)
├── .dockerignore               # Archivos excluidos del contexto Docker
├── .env.example                # Plantilla de variables de entorno
├── .env                        # Variables de entorno locales
├── .gitignore                  # Reglas de exclusión para Git
├── manage.py                   # Utilidad CLI de Django
├── main.py                     # Entrypoint compatible con WSGI / App Engine
├── requirements.txt            # Dependencias del backend (DRF, Spectacular, Psycopg2, Redis, etc.)
├── README.md                   # Documentación del proyecto
├── dev/                        # Entorno virtual local (Python)
├── static/                     # Archivos estáticos
├── media/                      # Archivos multimedia subidos por usuarios
└── nasa_api/                   # Módulo principal de la aplicación Django
    ├── __init__.py
    ├── settings.py             # Configuración Django, DRF, CORS, Redis y PostgreSQL
    ├── urls.py                 # Enrutamiento y endpoints de Swagger/Redoc
    ├── wsgi.py                 # Configuración WSGI
    ├── models.py               # Modelos de datos
    ├── serializers.py          # Serializadores DRF
    ├── admin.py                # Panel de administración
    ├── permissions.py          # Permisos personalizados
    ├── utils.py                # Funciones auxiliares y utilitarias
    ├── views/                  # Vistas modulares de la API
    │   ├── __init__.py
    │   ├── bootstrap.py        # Endpoint de versión del sistema
    │   └── auth.py             # Endpoints de login y logout por token
    ├── migrations/             # Migraciones de base de datos
    └── management/             # Comandos CLI personalizados
        └── commands/
```

---

## 🚀 Inicio Rápido con Docker

Para levantar la base de datos PostgreSQL, la caché Redis y el servidor web con migraciones automáticas:

```bash
docker compose up --build
```

- **API Base:** `http://localhost:8000/api/version/`
- **Documentación Swagger:** `http://localhost:8000/api/docs/swagger/`
- **Documentación Redoc:** `http://localhost:8000/api/docs/redoc/`
- **Panel Admin:** `http://localhost:8000/admin/`

---

## 💻 Ejecución Local con el Entorno Virtual (`dev`)

Si prefieres ejecutar directamente en tu máquina local:

```bash
# 1. Activar el entorno virtual existente
source dev/bin/activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Aplicar migraciones
python manage.py migrate

# 4. Iniciar el servidor de desarrollo
python manage.py runserver
```
