# LNQ Backend

## Non-CRUD routes

- `GET /health`
  - Health check endpoint.
  - Returns: `{ "status": "ok" }`

## API documentation

- `GET /api-docs`
  - Swagger UI.
- `GET /api-docs.json`
  - OpenAPI spec as a JSON object.
- `GET /swagger.json`
  - OpenAPI spec as JSON (stringified response).

## CRUD routes

- Products: `/api/products`
- Orders: `/api/orders`

## Deployment notes (Docker)

- If you run via `docker-compose.prod.yml`, the Postgres hostname is `postgres` (service name).
- If you run the backend container without docker-compose, `postgres` will not resolve; set `DB_HOST` (or `DATABASE_URL`) to the real DB hostname/IP.
