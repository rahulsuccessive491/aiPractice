---
name: backend
description: Backend conventions for the AI Skills Portal — folder layout, route/middleware patterns, env vars, error handling, and what NOT to introduce. Use this skill any time you're adding an endpoint, middleware, env var, or new dependency to the server.
---

# Backend conventions

## Folder layout

```
backend/
├── package.json
├── .env.example
└── src/
    ├── server.js              app wiring + listen
    ├── db.js                  DB driver wrapper (the only file that talks to better-sqlite3)
    ├── migrate.js             runs every .sql in migrations/ in order
    ├── migrations/            *.sql files, 3-digit prefix
    ├── middleware/
    │   ├── auth.js            requireAuth, requireRole
    │   └── validation.js      hand-rolled validators
    └── routes/
        ├── auth.js            /api/auth/register, /api/auth/login
        └── users.js           /api/users/me, /api/users/teams, /api/users/tags
```

## Boot flow (server.js)

1. `dotenv.config()` first.
2. Mount `helmet`, JSON parser, `morgan`, `cors` (allowlist from `CORS_ORIGIN`).
3. Mount `/api/health`, then `/api/auth`, then `/api/users`.
4. 404 catch-all → JSON error.
5. Final error handler → JSON `{ error }`.

## API conventions

- Prefix: `/api`.
- Request body: JSON only.
- Success: 2xx with the payload (`{ user }`, `{ teams }`, etc.). 201 on resource creation.
- Failure envelope: `{ "error": "human message", "fields"?: { field: "message" } }`.
- Validation errors → **400** + `fields`.
- Auth failures → **401**.
- Permission failures → **403**.
- Conflicts (duplicate email) → **409**.

## Adding a route

1. Make/extend a router under `routes/`.
2. Validate input in `middleware/validation.js` (or inline if trivial).
3. Use `requireAuth` for any non-public route; add `requireRole('manager','admin')` once Sprint 3 ships.
4. Read/write via the `db` wrapper — never import `better-sqlite3` outside `db.js`/`migrate.js`.
5. Shape output via a small helper (see `publicUser()` in `routes/auth.js`) — don't leak password hashes, tokens, etc.

## Validation

- Located in `middleware/validation.js`.
- Pure functions returning `{ ok, errors }`.
- Keep rules duplicated client-side too (see `frontend/src/pages/Register.jsx`) — server is the source of truth, client is the fast feedback path.
- Domain rule is non-negotiable: `email.split('@')[1] === ALLOWED_EMAIL_DOMAIN`.

## Env vars

Documented in `.env.example`. Required:
- `PORT` (default `4000`)
- `JWT_SECRET` (warn at boot if missing — never deploy without it)
- `JWT_EXPIRES_IN` (default `7d`)
- `ALLOWED_EMAIL_DOMAIN` (default `successive.tech`)
- `DB_FILE` (default `./data/portal.db`)
- `CORS_ORIGIN` (CSV, default `http://localhost:5173`)

Read env vars **once** near the file that uses them; don't sprinkle `process.env.X` deep in business logic.

## Error handling

- Throw `Error` with `.status` if you need a specific HTTP code; the global handler reads it.
- Never send stack traces to clients.
- `console.error` for unexpected errors is fine in dev; Sprint 4 will introduce structured logging.

## Security baseline (current)

- `helmet` for headers.
- bcrypt cost 10 for passwords.
- JWT with server-side secret.
- CORS allowlist.
- Body limit 256kb (raise only if a justified need shows up).
- **Rate limiting:** not yet — Sprint 4. Log the first deferred item that needs it.

## Don'ts

- Don't add an ORM (Sequelize/Prisma/Knex) without an explicit decision — the Postgres swap plan assumes raw SQL.
- Don't add async/await around `better-sqlite3` calls — it's synchronous on purpose.
- Don't put secret defaults in code beyond the dev-only JWT fallback. New secrets must come from env.
- Don't return password hashes, raw user rows, or other DB columns directly — go through a `publicX()` shaper.
- Don't add tests this phase. (Yes, really. Sprint 4 decision.)
