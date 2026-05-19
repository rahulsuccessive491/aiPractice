---
name: auth
description: Authentication and registration rules for the AI Skills Portal — email-domain lock, password policy, JWT flow, protected routes, and the SSO swap-in plan. Use this skill whenever you're touching login, registration, sessions, or access control.
---

# Auth & registration

## Current model (Sprint 1)

Email + password registration with a hard `@successive.tech` domain lock. JWT in the response body, stored in `localStorage` on the client and sent as `Authorization: Bearer <token>` on every API call.

> Why not SSO yet: risk register says SSO can slip — Sprint 1 ships a mock login so the rest of the POC is unblocked. SSO swaps in during Sprint 4.

## Registration rules (must hold both client- and server-side)

| Field | Rule |
|---|---|
| `first_name` | required, trimmed, non-empty |
| `last_name`  | required, trimmed, non-empty |
| `mobile`     | required, matches `/^\+?[0-9\s\-()]{10,20}$/` |
| `department` | required (dropdown on client) |
| `email`      | valid format AND domain === `successive.tech` |
| `password`   | ≥ 8 chars, ≥ 1 letter, ≥ 1 number |
| `confirm_password` | must equal `password` |

Domain configurable via `ALLOWED_EMAIL_DOMAIN` env var; defaults to `successive.tech`. **Both** layers must enforce it — never trust the client.

## Password storage

- `bcryptjs` hash, cost factor 10.
- Never log, never return the hash in any response.
- `publicUser()` in `backend/src/routes/auth.js` is the single function that shapes a user for API responses — keep it the only place that decides what's public.

## JWT

- Signed with `JWT_SECRET` from `.env`.
- Expiry `JWT_EXPIRES_IN` (default `7d`).
- Claims: `{ sub: userId, email, role, iat, exp }`.
- Verified by `middleware/auth.js` → attaches `req.user = { id, email, role }`.

The server warns and falls back to a dev-only secret if `JWT_SECRET` is unset — **never** ship to prod without setting it.

## Endpoints

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/auth/register` | public | full reg payload | `{ token, user }` |
| POST | `/api/auth/login`    | public | `{ email, password }` | `{ token, user }` |
| GET  | `/api/users/me`      | bearer | — | `{ user }` |
| PATCH| `/api/users/me`      | bearer | editable subset | `{ user }` |
| GET  | `/api/users/teams`   | bearer | — | `{ teams }` |
| GET  | `/api/users/tags`    | bearer | — | `{ tags }` |

Error envelope: `{ "error": "human message", "fields"?: { field: "field-level message" } }`.

## Frontend flow

1. `AuthProvider` bootstraps: reads `token` from `localStorage`, calls `/api/users/me`.
2. If the call 401s, token is dropped and the user is sent to `/login`.
3. `register()` and `login()` set token and user state on success; field errors come back via `result.fields`.
4. `<ProtectedRoute>` wraps any page that needs auth.

## Roles

`developer | lead | manager | admin`. Defined in DB but **not enforced anywhere yet** in Sprint 1. Use `requireRole(...)` middleware (already exported from `middleware/auth.js`) when the dashboard ships in Sprint 3.

## Swapping in SSO (Sprint 4 plan)

- Adapter point: `routes/auth.js`. Add a new `/api/auth/sso/callback` that finds-or-creates a user from the IdP profile and returns the same `{ token, user }` shape.
- `password_hash` becomes nullable for SSO-only users. Add a migration that drops `NOT NULL` on `password_hash`.
- Client gets a "Sign in with company SSO" button; existing email/password path stays for fallback/admin use.

## Don'ts

- Don't store passwords in any column other than `password_hash`.
- Don't relax the domain check without explicit stakeholder sign-off.
- Don't return the JWT in a cookie until we've thought through CSRF (currently bearer-only).
- Don't add "forgot password" to Sprint 1 — Sprint 4 backlog.
- Don't trust client-only validation. Re-run every rule server-side.
