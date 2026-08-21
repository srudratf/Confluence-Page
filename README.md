# Confluence Page

ThoughtFocus AI for Developers hub: a Vite + React UI backed by an Express + SQLite API.

## Run locally

```bash
npm install
npm run dev
```

This starts the API on `http://localhost:3001` and the Vite app with `/api` proxied to it. The first boot migrates SQLite and seeds demo data into `data/` (gitignored).

Optional:

```bash
cp .env.example .env
npm run db:migrate
npm run db:seed
```

## Demo accounts

Passwords are not shown in the login UI.

- Admin: `admin@thoughtfocus.com` / `Admin123!`
- Member: `member@thoughtfocus.com` / `Member123!`

Admin can create artifacts. Both roles can read artifacts and upload files.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + Vite together |
| `npm run dev:server` | Express only |
| `npm run dev:web` | Vite only |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed` | Idempotent demo users, BRD, Architecture, RACI, Blog, and sample files under `data/uploads/` |
| `npm test` | Frontend Vitest |
| `npm run test:server` | API + SQLite tests |
| `npm run test:smoke` | Login → create → upload → download → delete |
| `npm run test:all` | Frontend + server tests |

## API

Versioned at `/api/v1`. Contract: [server/openapi.yaml](server/openapi.yaml).

Auth uses a signed JWT in `Authorization: Bearer <token>`. Seed includes BRD, Architecture, RACI, and Blog. Artifact files still live on disk under `data/uploads/` with metadata in SQLite.
