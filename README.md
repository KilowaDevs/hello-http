# hello-http

App mínima para probar un deploy de Diply (y Postgres gestionada del scope).

- Escucha `0.0.0.0:$PORT` (Diply inyecta `PORT`)
- Al arrancar: crea tablas + seed mock si están vacías
- `Dockerfile` en la raíz

## Endpoints

| Ruta | Qué devuelve |
| --- | --- |
| `GET /health` | `ok` |
| `GET /` | índice de endpoints |
| `GET /build-args` | valores de build args Diply (`HELLO`, `APP_ENV`, `BUILD_MESSAGE`) |
| `GET /usuarios` | usuarios mock |
| `GET /cine` | géneros + películas + actores + reparto |
| `GET /generos` | géneros |
| `GET /peliculas` | películas (con género) |
| `GET /actores` | actores |
| `GET /reparto` | N:N película ↔ actor (con rol) |

## Build args (Fase 19)

Declarados en el `Dockerfile` como `ARG` → `ENV`. En Diply: Scope → Build args (keys `HELLO`, `APP_ENV`, `BUILD_MESSAGE`) y redeploy con rebuild. Luego:

```bash
curl https://<tu-app>/build-args
```

## Schema (relaciones)

```text
usuarios
generos 1──N peliculas
actores N──N peliculas  (vía pelicula_actores)
```

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
curl http://localhost:3002/cine
```
