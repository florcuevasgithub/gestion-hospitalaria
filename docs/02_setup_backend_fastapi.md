# Arquitectura Inicial del Backend (FastAPI + Supabase)

## Objetivo
Crear la estructura base del backend usando FastAPI y conectar el cliente de Supabase (Python) para interactuar con la base de datos PostgreSQL.

## Estructura de Carpetas Requerida
Dentro de la carpeta `/backend`, genera lo siguiente:

/backend
  ├── main.py (Punto de entrada de la app)
  ├── /core
  │    └── config.py (Manejo de variables de entorno)
  ├── /db
  │    └── supabase_client.py (Inicialización del cliente supabase-py)
  ├── /api
       └── /routes
            └── pacientes.py (Endpoints relacionados a los pacientes)

## Requisitos Técnicos
1. Usar `pydantic-settings` para cargar `SUPABASE_URL` y `SUPABASE_KEY` desde el `.env`.
2. En `supabase_client.py`, instanciar el cliente usando la librería oficial `supabase`.
3. En `main.py`, inicializar FastAPI, configurar CORS (permitir todo por ahora) e incluir el router de `pacientes.py`.
4. En `pacientes.py`, crear un endpoint GET de prueba `/api/pacientes/test` que haga un `supabase.table('sector').select('*').execute()` para verificar la conexión.

## Dependencias
Generar un `requirements.txt` en `/backend` con: `fastapi`, `uvicorn`, `supabase`, `pydantic-settings`.