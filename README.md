# AI Skills Tracking Portal

An internal portal for tracking AI adoption, learning activities, and certifications across our ~300-developer engineering org. Built as a POC with Claude as the primary development assistant.

> **Current phase:** Sprint 2 & 3 — Activity Logging & Admin Dashboard

---

## What's been delivered

### Sprint 1 — Week 1: Foundation & Setup ✅

- Project repo, env, folder structure, README → **done**
- Data model: Users, Teams, Activities, Tags → **done** (SQLite migration; portable to Postgres)
- Auth: email + password registration (`@successive.tech` only) → **done**
- Base UI shell: nav, layout, light/dark theme, responsive grid → **done**
- User profile page: editable name, team, stack, role → **done**

### Sprint 2 — Week 2: Activity Logging Core ✅

- Activity Log Form: Submit activity type, tool, domain, date, notes → **done**
- Log History View: Personal timeline of all logged activities → **done**
- Certification Tracker: Mark certifications as in-progress / completed → **done**
- Domain / Tag System: Tag each activity by domain or category → **done**
- Basic Validation: Required fields, date limits, duplicate prevention → **done**
- Role-based access: Developers can log their own activities → **done**

### Sprint 3 — Week 3: Admin Dashboard & Reporting ✅

- Leadership Dashboard: Overview of total users, activities by week/month → **done**
- Team Breakdown View: Filter by team with adoption % metrics → **done**
- Individual Spotlight: View any developer's activity log (managers/admins only) → **done**
- Charts & Graphs: Bar charts for activities by type, domain, team, adoption % → **done**
- Export to CSV: Download reports for offline use → **done**
- Role-based access: Only Managers and Admins can access dashboard → **done**

> SSO was swapped for email/password registration in this sprint per the risk-register mitigation ("Use mock login for demo, integrate SSO in Sprint 4"). All work email addresses are gated to `@successive.tech`.

---

## Repo layout

```
Gama AI Tracker/
├── backend/                Node.js + Express API
│   ├── src/
│   │   ├── server.js
│   │   ├── db.js
│   │   ├── routes/         auth.js, users.js
│   │   ├── middleware/     auth.js, validation.js
│   │   └── migrations/     001_initial_schema.sql
│   ├── package.json
│   └── .env.example
├── frontend/               React + Vite + Tailwind
│   ├── src/
│   │   ├── App.jsx, main.jsx, index.css
│   │   ├── context/        AuthContext, ThemeContext
│   │   ├── components/     Layout, ThemeToggle, ProtectedRoute, Input, Button
│   │   └── pages/          Register, Login, Profile, Dashboard
│   ├── package.json
│   ├── tailwind.config.js, postcss.config.js, vite.config.js
│   └── index.html
├── skills/                 Project-specific skill files for AI assistants
│   ├── technology/SKILL.md
│   ├── plan/SKILL.md
│   ├── phase/SKILL.md
│   ├── database/SKILL.md
│   ├── auth/SKILL.md
│   ├── frontend/SKILL.md
│   └── backend/SKILL.md
├── AI_Skills_Portal_Plan.docx   Original plan doc
└── README.md
```

---

## Run it locally

You need **Node.js 18+** installed. No database setup needed — dev uses SQLite (file-based).

### 1. Backend

```bash
cd backend
cp .env.example .env        # tweak JWT_SECRET if you want
npm install
npm run migrate             # creates ./data/portal.db with schema + seed teams/tags
npm run dev                 # http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open `http://localhost:5173`, click **Register**, use any `@successive.tech` email, and log in.

---

## Tech stack (Sprint 1)

| Layer    | Tech                       |
|----------|----------------------------|
| Frontend | React 18 + Vite + Tailwind |
| Backend  | Node.js + Express          |
| Database | SQLite (dev) — Postgres-ready schema |
| Auth     | bcrypt + JWT (httpOnly token in client memory) |
| Theme    | Tailwind `dark:` + ThemeContext, persisted to localStorage |

Why SQLite for now: zero-setup dev. Schema is written portably so swapping to PostgreSQL in Sprint 4 / production is a `db.js` driver change, not a rewrite. See `skills/database/SKILL.md`.

---

## Registration rules

- Email must end with `@successive.tech` (server- and client-validated)
- Password ≥ 8 chars, at least 1 letter + 1 number
- Mobile: 10–15 digits, optional `+` country code
- Department, first name, last name are required

See `skills/auth/SKILL.md` for the full rule set.

---

## Skill files

The `skills/` folder contains project-specific SKILL.md files documenting the technology, plan, phase, database, auth, frontend, and backend conventions. These are designed to be loaded by Claude (or any AI assistant) when working on this project so the context stays consistent across sessions.

---

## Roadmap

| Week | Focus                                  | Status      |
|------|----------------------------------------|-------------|
| 1    | Foundation & auth                      | ✅ complete |
| 2    | Activity logging core                  | ✅ complete |
| 3    | Admin dashboard & reporting            | ✅ complete |
| 4    | Polish, pilot feedback, SSO, demo      | next        |

Built with Claude — May 2026.
# aiPractice
