
# LNQ Backend

LNQ Backend is a Node.js/TypeScript REST API for e-commerce, featuring product, order, and image management, with PostgreSQL and MinIO integration. It supports local development, Dockerized deployment, and includes a full OpenAPI spec.

---

## Features
- Products & Orders CRUD API
- Image upload and retrieval (MinIO/S3)
- Health check endpoint
- Swagger/OpenAPI documentation
- Docker & Docker Compose support
- Pre-commit hooks for tests/build

---

## Endpoints

### Non-CRUD
- `GET /health` — Health check (`{"status":"ok"}`)

### API Docs
- `GET /api-docs` — Swagger UI
- `GET /api-docs.json` — OpenAPI JSON
- `GET /swagger.json` — OpenAPI JSON (stringified)

### CRUD
- Products: `/api/products`
- Orders: `/api/orders`
- Images: `/api/images/:filename`

See `swagger.json` or `/api-docs` for full details.

---

## Getting Started

### Prerequisites
- Node.js 22.x (or compatible)
- pnpm (recommended)
- Docker & Docker Compose (for containerized setup)

### Install dependencies
```sh
pnpm install
```

### Environment Variables
Create a `.env` file in the project root. Example:

```
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=images-dev
PORT=3000
```

---

## Local Development

### Start PostgreSQL & MinIO (Docker Compose)
```
docker-compose up -d
```

### Run migrations & generate DB client
```
pnpm db:push
pnpm db:generate
```

### Start the server (dev mode)
```
pnpm dev
```

---

## Scripts

| Script                | Description                                 |
|-----------------------|---------------------------------------------|
| pnpm dev              | Start dev server with auto-reload           |
| pnpm build            | Build TypeScript to dist/                   |
| pnpm start            | Run built server (after build)              |
| pnpm test             | Run all tests (Jest)                        |
| pnpm test:watch       | Watch mode for tests                        |
| pnpm test:coverage    | Run tests with coverage                     |
| pnpm db:push          | Push latest schema to DB                    |
| pnpm db:migrate       | Run DB migrations                           |
| pnpm db:generate      | Generate Drizzle ORM client                 |
| pnpm swagger:export   | Export OpenAPI spec to swagger.json         |
| pnpm docker:build     | Build Docker image locally                  |
| pnpm docker:btp       | Build & push Docker image to GHCR           |
| pnpm compose:up       | Start all services (dev)                    |
| pnpm compose:down     | Stop all services (dev)                     |
| pnpm compose:prod:up  | Start all services (prod)                   |
| pnpm compose:prod:down| Stop all services (prod)                    |

---

## Docker Usage

### Build & Run (local)
```
pnpm docker:build
docker run --env-file .env -p 3000:3000 lnq-backend:latest
```

### Compose (dev)
```
pnpm compose:up
```

### Compose (prod)
```
pnpm compose:prod:up
```

---

## Pre-commit Hooks

Husky is used to run tests and build before every commit. If a commit fails, check your code and try again.

If you need to debug the hook, add `set -x` to `.husky/pre-commit`.

---

## Testing

Run all tests:
```
pnpm test
```
Test files are in `src/__tests__/`.

---

## Troubleshooting

- **DB connection errors:** Ensure Postgres is running and `DATABASE_URL` is correct.
- **MinIO errors:** Ensure MinIO is running and credentials match your `.env`.
- **Docker build fails:** Check Docker context and file paths.
- **Pre-commit hook fails:** Ensure `.husky/pre-commit` is executable and has LF line endings.

---

## Project Structure

- `src/` — Source code (routes, services, db, etc.)
- `drizzle/` — DB migrations
- `scripts/` — Docker/CI scripts
- `dist/` — Compiled output (after build)
- `swagger.json` — OpenAPI spec

---

## License

ISC
