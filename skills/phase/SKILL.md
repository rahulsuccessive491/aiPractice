---
name: phase
description: Current sprint context — what week we're in, what's done, what's next, and what NOT to build yet. Use this skill at the start of any work session to ground decisions about what belongs in the current sprint vs a future one.
---

# Current phase — Sprint 1, Week 1

> Keep this skill updated at sprint boundaries.

## Where we are

**Sprint 1 — Foundation & Setup.** End-of-week target: a developer can register with their `@successive.tech` email, log in, and view/edit their profile. Core infrastructure is in place.

## Sprint 1 task list (status)

| Task | Status | Notes |
|---|---|---|
| Project setup (repo, env, folders, README) | ✅ done | Monorepo: `backend/`, `frontend/`, `skills/` |
| Data model (Users, Activities, Teams, Tags) | ✅ done | `backend/src/migrations/001_initial_schema.sql` — activity/tag tables exist now but used in Sprint 2 |
| Auth integration | ✅ done (modified) | Email/password with `@successive.tech` lock. **SSO swapped to Sprint 4** per risk-register mitigation |
| Base UI shell | ✅ done | Nav, layout, light/dark theme toggle, responsive grid |
| User profile page | ✅ done | First/last name, mobile, dept, team, stack, tools, bio — editable |

## What's intentionally NOT in Sprint 1

Do not start any of these until the sprint flips:
- Activity log form, list view, certification tracker → **Sprint 2**
- Domain tagging UI (data model is ready, UI isn't) → **Sprint 2**
- Leadership dashboard, team breakdown, CSV export, charts → **Sprint 3**
- Notifications, SSO integration, pilot rollout, manager deck → **Sprint 4**
- Tests (unit, integration, e2e) → explicitly **deferred** for the POC

## What's next (Sprint 2 preview)

- Activity log form (type, tool, domain, date, notes)
- Personal timeline
- Certification tracker (in-progress/completed)
- Tagging UI surfacing the seeded tags

The schema is already in place — Sprint 2 is mostly route handlers + UI on top of existing tables.

## When this skill is stale

If today's work matches Sprint 2/3/4 above, treat this skill as out of date and update it before adding more tasks. The right edits:

1. Update **Where we are** to the new sprint/week.
2. Move completed items from the next-sprint section into the current task list.
3. Refresh **What's intentionally NOT in Sprint X** for the new sprint.

## Decisions log (Sprint 1)

- **2026-05-13** — Replaced SSO with email/password registration for Sprint 1; SSO deferred to Sprint 4. Reason: avoid IdP setup blocking the POC. Domain locked to `@successive.tech` server-side and client-side.
- **2026-05-13** — Chose SQLite for dev DB, Postgres-portable schema. Reason: zero local setup; swap is a `db.js` change later.
- **2026-05-13** — No automated tests this phase. Reason: explicit stakeholder direction; revisit at Sprint 4.
