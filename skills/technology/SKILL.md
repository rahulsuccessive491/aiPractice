---
name: technology
description: Tech stack, libraries, versions, and the rationale for each choice in the AI Skills Portal. Use this skill any time you're about to add a dependency, swap a library, change runtimes, or touch infrastructure — to confirm the existing choices and the why behind them.
---

# Technology stack — AI Skills Portal

Authoritative list of every tech choice in this repo and why. If you're about to add a new library, check here first.

## Runtime baseline

- **Node.js** ≥ 18 (uses `node --watch` for dev, native `fetch` upstream, ESM-capable)
- **npm** as the package manager (no yarn/pnpm lockfiles in this repo)

## Frontend

| Concern | Choice | Why |
|---|---|---|
| Framework | **React 18** | Plan doc mandates React; widely known in team |
| Build tool | **Vite 5** | Fast dev server, zero-config JSX, proxy to backend |
| Styling | **Tailwind CSS 3** | Utility-first, fast iteration, plan doc mandates Tailwind |
| Dark mode | Tailwind `darkMode: 'class'` + `ThemeContext` | Persisted to `localStorage`, applied pre-paint via inline script in `index.html` to avoid FOUC |
| Routing | **react-router-dom v6** | Standard, hook-based, supports nested + protected routes |
| HTTP | **fetch** wrapped in `src/lib/api.js` | Keeps install small; adds JWT header + error normalisation |
| State | React Context (`AuthContext`, `ThemeContext`) | No Redux/Zustand until proven needed |
| Icons | Inline SVG | No icon-lib dependency until volume justifies it |
| Fonts | Inter via Google Fonts CDN | Single weight load, system-font fallback |

### Things explicitly NOT used yet (and why)
- **No TypeScript** — JS-only to keep onboarding zero-friction for the POC. Re-evaluate in Sprint 4.
- **No component library (shadcn/MUI/Chakra)** — Tailwind primitives are sufficient for Sprint 1 UI.
- **No state library** — Context is enough for auth + theme.
- **No Storybook / tests** — Explicitly deferred by stakeholder for this phase.

## Backend

| Concern | Choice | Why |
|---|---|---|
| Server | **Express 4** | Lightweight, plan doc mandates it |
| Auth | **bcryptjs** + **jsonwebtoken** | bcryptjs avoids native build issues across machines; JWT for stateless sessions |
| Database driver | **better-sqlite3** | Synchronous, fast, single-file DB → zero dev setup. See `database` skill for the Postgres migration plan |
| Validation | Hand-rolled validators in `middleware/validation.js` | Rules are small and explicit; avoids an extra dep for ~50 lines of code |
| Security headers | **helmet** | Sensible defaults |
| Logging | **morgan** | Dev-friendly request log |
| CORS | **cors** | Configurable via `CORS_ORIGIN` env var |
| Env | **dotenv** | `.env` in `backend/`, never committed |

### API conventions
- All routes prefixed with `/api`.
- JSON request + response bodies.
- Errors: `{ "error": "message", "fields"?: { field: "message" } }`.
- Auth: `Authorization: Bearer <jwt>` on protected routes.
- See the `backend` and `auth` skills for full details.

## Database

- **Today:** SQLite (`backend/data/portal.db`)
- **Target:** PostgreSQL in Sprint 4 / production
- Schema uses only portable types (`TEXT`, `INTEGER`, `REAL`); migration to Postgres is a driver change in `db.js`, not a rewrite.
- See the `database` skill for the full schema and migration plan.

## Hosting & infra (current)

- Local-only during POC. No Docker yet (kept lean for Sprint 1).
- Sprint 4 decision: company cloud vs AWS/Azure — to be made after manager approval.

## Versions are pinned with `^`

Standard caret ranges in `package.json`. Lockfiles are not in the repo yet — generated on first `npm install`.

## When adding a new dependency

1. Confirm it isn't already replaceable by what's listed above.
2. Update this file with the choice and the reason.
3. Prefer pure-JS deps (avoid native builds) so contributors don't need toolchains.
4. Update the relevant skill (`backend` / `frontend`) if it introduces a new convention.
