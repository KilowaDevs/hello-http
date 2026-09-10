# hello-http

App mínima para probar un deploy de Diply (y Postgres gestionada del scope).

- `GET /` y `GET /usuarios` → JSON con usuarios mock
- `GET /health` → `ok`
- Escucha `0.0.0.0:$PORT` (Diply inyecta `PORT`)
- Al arrancar: crea tabla `usuarios (nombre, apellido)` e inserta filas mock si está vacía
- `Dockerfile` en la raíz

## Env (Diply / Fase 20)

```text
DATABASE_URL
PGHOST
PGPORT
PGUSER
PGPASSWORD
PGDATABASE
```

## Local

```bash
docker compose up --build
curl http://localhost:3002/
```
