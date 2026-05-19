---
name: plan
description: Master plan for the AI Skills Portal — problem, solution, scope of each phase, success metrics, risks, and what's intentionally out-of-scope right now. Use this skill any time you're scoping new work, weighing trade-offs, or deciding whether something belongs in this sprint vs a later one.
---

# AI Skills Portal — master plan

This is the authoritative scope reference. If a request would expand scope, check it against this skill first.

## Problem

~300 developers across PHP, Java, .NET, Node.js, Frontend, etc. No centralised view of who is learning AI, what tools are in use, what's been certified. Leadership has no data to measure AI adoption.

## Solution (one-line)

An internal portal where every developer logs in, registers their AI activities + certifications, and leadership sees aggregated adoption data live.

## Why this is being built with Claude

The portal itself is a proof-of-concept for AI-native development. Every line should be possible to (re)derive by pairing a developer with Claude using the skills in this folder.

## Phase 1 — POC (Month 1, 4 sprints)

| Sprint | Week | Goal | Key deliverable |
|---|---|---|---|
| 1 | Foundation & Auth | Repo, DB schema, auth, base UI shell, profile page | Developer can register/log in and see profile |
| 2 | Activity logging core | Log activities, certifications, tag by domain | Activities visible on user timeline |
| 3 | Dashboard & reporting | Leadership dashboard, per-team filter, CSV export | Manager can answer "who is doing AI this month?" |
| 4 | Polish, pilot, SSO, demo | UI polish, notifications, SSO swap-in, pilot feedback, manager demo | Green light for company-wide rollout |

## Phase 1 features (locked scope)

In scope:
- SSO **or** email/password registration (`@successive.tech` only). Sprint 1 ships email/password; SSO swap-in is Sprint 4 per risk register.
- Personal profile (stack, team, AI focus areas).
- Activity logging with type/tool/domain/notes/date.
- Certification tracker (in-progress / completed).
- Admin/leadership dashboard with team + domain breakdown.
- Module tagging (e-commerce, ERP, agents, automation…).

Explicitly **out of scope** in Phase 1 (Phase 2/3 backlog):
- Peer recognition / leaderboards
- Auto knowledge-sharing (repos, articles)
- Skill-gap analysis / suggestions
- Coursera / LinkedIn Learning API ingestion
- Manager structured feedback loop

## Success metrics (end of Week 4)

- ≥ 20 developers actively using the portal
- ≥ 100 AI activities logged
- Manager can answer "how many developers are actively practising AI this month?"
- ≥ 3 different domain tags represented
- Portal running stably, no manual data entry from management

## User roles

| Role | Who | Can do |
|---|---|---|
| Developer | All 300 devs | Log activities, manage own profile, see own timeline |
| Team Lead | Tech leads | View team logs, comment/feedback (Sprint 2+) |
| Manager | Eng managers | Full dashboard, all teams, export reports |
| Admin | Portal owner | User mgmt, config, data cleanup |

## Risks & mitigations (active)

| Risk | Mitigation |
|---|---|
| SSO integration slips | Email/password mock in Sprint 1, swap to SSO in Sprint 4 — *active path* |
| Low engagement | Gamify in Phase 2; for POC, focus on simplicity |
| Scope creep | Strict sprint scope; new ideas go to Phase 2 backlog |
| Data quality | Dropdowns + required fields + validation |

## How to use this skill

Before:
- Adding a feature → check it isn't in the Phase 2/3 list above.
- Removing a required field → check it isn't load-bearing for success metrics.
- Building a flashy view → confirm it serves one of the four sprint goals.

If a request expands scope, surface that explicitly to the user and offer to log it as a Phase 2 item rather than absorbing it.
