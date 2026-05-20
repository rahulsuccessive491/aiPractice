# Profile Setup Flow — AI Agent Prompt (Step-by-Step)

> **Usage:** Feed each Phase to the AI agent separately. Do NOT send all at once.
> Each phase builds on the previous. Complete and verify before moving to the next.

---

## Context & Overview

Build a **post-login profile setup flow** for an AI Skills Portal. After a user logs in for the first time (or if their profile is incomplete), they must complete a multi-step profile setup before accessing the app. The screen is gated — users cannot bypass it.

**Tech Stack Reference:** Match the existing stack in this codebase (React/Next.js frontend, check existing auth and user schema before building).

---

## Phase 1 — Profile Setup Gate (Locked Screen)

**Prompt for Agent:**

```
After a user successfully logs in, check if their profile setup is complete (use a flag like `profile_completed: boolean` on the user record).

If profile is NOT complete:
- Show a full-screen overlay/modal that LOCKS the UI. The user cannot navigate away, close it, or access any other part of the app.
- Display a welcome message: "Welcome to AI Skills Portal! Complete your profile to get started."
- Show a single CTA button: "Set Up My Profile"
- Clicking the button navigates the user to /profile-setup

If profile IS complete:
- Allow normal app navigation.

Requirements:
- Block all route changes while profile is incomplete (route guard / middleware)
- No skip/close button
- Persist the `profile_completed` flag in the database and check it on every session
```

---

## Phase 2 — Stepper UI Shell

**Prompt for Agent:**

```
Build a multi-step stepper form at route /profile-setup.

Steps (in order):
1. Personal Details
2. Skills
3. AI Profile & POC
4. Certifications

Requirements:
- Show a top progress stepper (step name + number + completion indicator)
- User can go Back to previous steps but cannot skip forward
- Each step has a "Save & Continue" button
- Data from each step is saved to the backend before moving to the next
- On final step completion, set `profile_completed = true` on the user record and redirect to dashboard
- Show a completion percentage or progress bar
- Stepper must be mobile-responsive
```

---

## Phase 3 — Step 1: Personal Details

**Prompt for Agent:**

```
Build Step 1: Personal Details form.

Pre-fill the following fields from the logged-in user's existing data (read-only where noted):
- Full Name (editable)
- Email (read-only, from auth)
- Work Email (editable, may differ from login email)
- Mobile Number (editable)
- Department (editable — dropdown from a predefined department list)
- Designation / Role (editable)
- Reporting Manager (searchable dropdown from user list)
- Location / Office (editable — dropdown)
- Date of Joining (editable — date picker)
- LinkedIn Profile URL (optional, editable)
- Profile Photo (upload, max 2MB, jpg/png only)

Validation:
- Mobile: numeric, 10 digits
- Work Email: valid email format
- All required fields must be filled before proceeding
- Show inline validation errors

On "Save & Continue": POST data to /api/profile/personal-details, then advance stepper.
```

---

## Phase 4 — Step 2: Skills

**Prompt for Agent:**

```
Build Step 2: Skills Selection with AI-powered suggestions.

Behavior:
- Show a primary skill category selector (e.g., Frontend, Backend, AI/ML, DevOps, Data, Cloud, Mobile, etc.)
- When the user selects a category, call an API /api/skills/suggestions?category=<selected> that returns relevant skills for that category
- Display returned skills as selectable chip/tag components
- User can select multiple skills across multiple categories
- User can also type and add a custom skill not in the list
- Selected skills appear in a "Your Skills" section below
- Each selected skill should have a proficiency level selector: Beginner / Intermediate / Advanced / Expert
- User can remove selected skills

AI Suggestion Logic (backend):
- Maintain a predefined skills taxonomy per category
- Optionally: call an LLM to generate additional contextual skill suggestions based on the user's department + designation (from Step 1)

On "Save & Continue": POST { skills: [{ name, category, proficiency }] } to /api/profile/skills
```

---

## Phase 5 — Step 3: AI Profile & POC Details

**Prompt for Agent:**

```
Build Step 3: AI Initiatives / Proof of Concept (POC) tracking.

This step tracks the user's active or past AI projects/POCs.

Each POC entry should capture:
- S.No (auto-incremented)
- Team Member(s) — multi-select from user list
- Project / POC Name
- Category (dropdown: Automation, GenAI, ML Model, Analytics, Other)
- Problem Statement (textarea)
- AI Tools / Stack Used (multi-tag input)
- Current Status (dropdown: Not Started / In Progress / Completed / On Hold)
- Progress % (slider 0–100)
- Expected Outcome (textarea)
- Business Impact (textarea)
- Repo / Demo Link (URL input, optional)
- Challenges / Blockers (textarea, optional)
- Next Steps (textarea, optional)
- Start Date (date picker)
- End Date (date picker, optional)
- Last Updated (auto-set to current date on save)
- Remarks (textarea, optional)
- POC Lead / Owner Name (pre-fill with current user, editable)

UI Behavior:
- Show one POC form by default
- "Add Another POC" button appends a new collapsible POC entry
- Each POC entry can be collapsed/expanded (show POC name as header when collapsed)
- Each entry has a Delete button (with confirmation)

On "Save & Continue": POST array of POC objects to /api/profile/poc
```

---

## Phase 6 — Step 4: Certifications

**Prompt for Agent:**

```
Build Step 4: Certifications.

Add Certificate Form (user fills per certificate):
- Certificate Name
- Issuing Organization
- Issue Date (date picker)
- Expiry Date (date picker, optional — check "No Expiry" checkbox)
- Certificate ID / Credential ID (optional)
- Certificate URL (optional)
- Upload File (PDF or Image, max 10MB) — store in file storage, save URL to DB

Behavior:
- User can add multiple certificates using an "Add Certificate" button
- After submitting a certificate, it appears in a table below the form
- Table columns: S.No | Certificate Name | Issuing Org | Issue Date | Expiry | Status | Comments | Actions
- Status values: Pending (default) | Approved | Rejected
- Comments column shows the latest feedback from reviewer
- Actions: View | Delete (only if status is Pending)

Approval Workflow:
- On certificate submission, create an approval request in the notifications/activity system
- Notify the user's Reporting Manager (from Step 1) and any Super Admin
- They can Approve or Reject with a comment from the notification panel

On final "Complete Profile": 
- POST certificates to /api/profile/certifications
- Set user.profile_completed = true
- Redirect to /dashboard
```

---

## Phase 7 — Notification & Approval System

**Prompt for Agent:**

```
Build a Notification and Activity Feed system to support profile update approvals.

Trigger notifications when:
- User submits a new certificate (notify Reporting Manager + Super Admin)
- User updates POC details (notify Reporting Manager)
- User profile is approved or rejected by a reviewer (notify the user)

Notification Panel (Bell icon in top nav):
- Show count badge for unread notifications
- Dropdown/drawer lists recent notifications with:
  - Type icon (certificate, POC, profile)
  - Message: e.g., "Rahul Chauhan added a new certificate: AWS Solutions Architect"
  - Timestamp (relative: "2 hours ago")
  - Action buttons inline: Approve / Reject (for reviewers) or View (for users)
  - If Reject: show a textarea for feedback/comment before confirming

Role-Based Access:
- Roles: Employee | Team Lead | Manager | Super Admin
- Team Lead: can approve/reject certificates for their direct reports
- Manager: same as Lead + can see all team members
- Super Admin: full access to all users and all approval actions

Activity Log:
- Maintain an audit trail: who changed what, when, and what action was taken
- Visible to Managers and Super Admins in a dedicated /admin/activity-log page

API Endpoints needed:
- POST /api/notifications/send
- GET /api/notifications (for current user)
- PATCH /api/notifications/:id/read
- PATCH /api/certifications/:id/review — body: { status: 'approved'|'rejected', comment: string }
```

---

## Phase 8 — Admin / Reviewer Dashboard

**Prompt for Agent:**

```
Build a lightweight reviewer dashboard at /admin/reviews (accessible to Lead, Manager, Super Admin only).

Features:
- Pending Approvals tab: list all pending certificate submissions with user info, cert details, uploaded file preview/download, Approve/Reject buttons
- Team Profiles tab: view all team members' profile completion status
- Filter by: Department, Status, Date Range
- Export to CSV button for the table

Route guard: redirect to /dashboard if the user's role is Employee.
```

---

## Additions & Optimizations Suggested

The following were not in the original spec but are recommended:

| # | Feature | Reason |
|---|---------|--------|
| 1 | **Profile Completion % indicator** on dashboard | Encourages users to fill remaining sections |
| 2 | **Edit Profile** post-setup (all 4 steps accessible as tabs) | Profile data changes over time |
| 3 | **POC Status Timeline** (visual progress tracker per POC) | Better visibility for managers |
| 4 | **Skill Endorsements** — teammates can endorse skills | Adds credibility, LinkedIn-style |
| 5 | **Certificate Expiry Alerts** — auto-notify before expiry | Keeps certifications current |
| 6 | **AI Summary Card** — auto-generate a short bio from profile data | Useful for directory/org chart |
| 7 | **Bulk import** for POC data via CSV | Useful for users with many projects |
| 8 | **Profile Visibility Settings** — control what teammates can see | Privacy control |
| 9 | **Re-submission flow** for rejected certificates | User can correct and resubmit |
| 10 | **Draft saving** — auto-save form state every 30s | Prevents data loss mid-form |

---

## Execution Order for Agent

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

After each phase: review the output, test the feature, then proceed.

---

## Key Data Models (Reference)

```
User: { id, name, email, work_email, mobile, department, designation, manager_id, role, profile_completed }
Skill: { id, user_id, name, category, proficiency }
POC: { id, user_id, poc_name, category, problem_statement, tools, status, progress, start_date, end_date, ... }
Certificate: { id, user_id, name, org, issue_date, expiry_date, file_url, status, comment }
Notification: { id, recipient_id, type, message, read, action_taken, created_at }
```
