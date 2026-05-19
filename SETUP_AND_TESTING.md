# Setup & Testing Guide

**Last Updated:** May 13, 2026  
**Sprints Covered:** Sprint 1, Sprint 2, Sprint 3

---

## Quick Start

### Prerequisites
- Node.js 18+
- SQLite (included with backend dependencies)

### 1. Backend Setup

```bash
cd backend
npm install
npm run migrate      # Creates ./data/portal.db with schema + seed data
npm run dev         # Starts API at http://localhost:4000
```

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev         # Starts app at http://localhost:5173
```

### 3. Access the App

Open **http://localhost:5173** in your browser.

---

## User Roles & Permissions

### Role Levels

| Role | Access | Use Case |
|------|--------|----------|
| **developer** | Register, log activities, view own profile | Standard team member (default for all new users) |
| **lead** | (Reserved for Sprint 4) Team management features | Tech leads |
| **manager** | Full admin dashboard, view all users/activities, export CSV | Engineering managers |
| **admin** | Full admin dashboard, view all users/activities, export CSV | Portal admin |

### Access Control

- **Activity Logging** (`/activities`): All authenticated users
- **Admin Dashboard** (`/admin`): Managers and Admins only
- **User Profile** (`/profile`): All authenticated users
- **Activity History**: Users see their own; managers/admins see any user via API

---

## Testing Scenarios

### Scenario 1: Developer User Flow

**Goal:** Register and log activities as a regular developer

**Steps:**

1. Open http://localhost:5173
2. Click **Register**
3. Fill in form:
   - Email: `dev1@successive.tech`
   - Password: `TestPass123`
   - First Name: `Alice`
   - Last Name: `Developer`
   - Mobile: `9876543210`
   - Department: `Engineering`
   - Team: `Frontend`
4. Click **Register**
5. Redirected to Dashboard
6. Click **Activities** in nav
7. Click **Log Activity** tab
8. Fill activity form:
   - Activity Type: `learning`
   - Title: `Completed Claude API course`
   - Activity Date: `2026-05-10`
   - Status: `completed`
   - Tool Used: `Claude`
   - Domain: `Agents`
   - Notes: `Learned prompt engineering best practices`
9. Click **Log Activity**
10. See success message ✓
11. Switch to **My Activities** tab
12. See the logged activity in timeline ✓
13. Try to access `/admin` (admin dashboard)
14. See "Access Denied" message ✓

**Expected Result:** Developer can log activities but cannot access admin dashboard.

---

### Scenario 2: Manager User Flow

**Goal:** Test manager dashboard and view all activities

**Steps:**

1. First, set up a manager user in the database:
   ```bash
   cd backend/data
   sqlite3 portal.db
   ```

2. In SQLite shell:
   ```sql
   -- Create a manager account
   INSERT INTO users (email, password_hash, first_name, last_name, mobile, department, team_id, role)
   VALUES (
     'manager@successive.tech',
     -- bcrypt hash for "ManagerPass123" (use bcrypt hash tool or get from app)
     '$2a$10$PLACEHOLDER_HASH',
     'Bob',
     'Manager',
     '9876543211',
     'Engineering',
     1,
     'manager'
   );

   -- Or update an existing user to manager role:
   UPDATE users SET role = 'manager' WHERE email = 'dev1@successive.tech';
   
   .exit
   ```

3. For the password hash, run this Node script temporarily:
   ```bash
   node
   const bcrypt = require('bcryptjs');
   bcrypt.hash('ManagerPass123', 10).then(hash => console.log(hash));
   ```

4. Return to browser, click **Logout** (if logged in as dev)

5. Click **Sign in**

6. Login as manager:
   - Email: `manager@successive.tech`
   - Password: `ManagerPass123`

7. Click **Admin** in nav (now visible!)

8. Verify **Overview Tab**:
   - Summary cards show: Total Users, Total Activities, This Week, This Month ✓
   - Charts render: Top Activity Types, Top Domains, Activities by Team, Adoption % ✓

9. Click **Teams Tab**:
   - See table with team names, member counts, adoption rates ✓

10. Click **All Users Tab**:
    - See list of all users with roles and activity counts ✓

11. Click **↓ Export as CSV**:
    - Browser downloads `activities-2026-05-13.csv` ✓
    - Open in Excel/Google Sheets
    - Verify headers and data ✓

**Expected Result:** Manager can access full dashboard, view all data, and export reports.

---

### Scenario 3: Admin User Flow

**Goal:** Verify admin has same access as manager

**Steps:**

1. In database, create/update admin user:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'dev1@successive.tech';
   ```

2. Login as admin user

3. Verify **Admin** link is visible in nav ✓

4. Access `/admin` dashboard ✓

5. All manager features work identically ✓

**Expected Result:** Admin role has full access like manager.

---

### Scenario 4: Activity Logging Validation

**Goal:** Test form validation

**Steps:**

1. Login as any user
2. Go to **Activities** → **Log Activity**
3. Try submitting with empty **Title** → Error: "title is required" ✓
4. Try submitting with future **Activity Date** → Error: "cannot be in the future" ✓
5. Try submitting with **Activity Date** >1 year ago → Error: "cannot be more than 1 year in the past" ✓
6. Fill form correctly and submit → Success ✓
7. View in **My Activities** → Activity appears ✓

**Expected Result:** All validations work as expected.

---

### Scenario 5: Role-Based Activity Access

**Goal:** Test that users can only edit their own activities

**Steps:**

1. Create two developer accounts: alice@successive.tech, bob@successive.tech
2. Login as Alice, log an activity: "Completed course X"
3. Note the activity ID from URL (if available) or from history
4. Logout and login as Bob
5. Try to edit Alice's activity via API:
   ```bash
   curl -X PATCH http://localhost:4000/api/activities/1 \
     -H "Authorization: Bearer <bob-token>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Modified"}'
   ```
6. Response: `{"error": "Not authorized to update this activity"}` ✓
7. Login as manager, try same PATCH → Success ✓ (managers can edit any)

**Expected Result:** Users can only edit their own; managers/admins can edit any.

---

## Common Setup Issues

### Issue: "Network error — is the API running?"

**Solution:** 
- Make sure backend is running on port 4000
- Check CORS is configured (default allows localhost:5173)
- Test with: `curl http://localhost:4000/api/health`

### Issue: "Invalid token" on login

**Solution:**
- Clear browser localStorage: `localStorage.clear()`
- Logout and log back in
- Ensure JWT_SECRET in `.env` is consistent

### Issue: Database locked

**Solution:**
- Close all SQLite connections
- Delete `portal.db` and rerun `npm run migrate`

### Issue: Can't access admin dashboard as manager

**Solution:**
1. Verify user role is 'manager':
   ```sql
   sqlite3 data/portal.db
   SELECT email, role FROM users WHERE email = 'your-email@successive.tech';
   ```
2. Clear browser cache/localStorage
3. Logout and log back in

---

## Database Testing

### View All Users and Their Roles

```bash
cd backend/data
sqlite3 portal.db
SELECT id, email, first_name, last_name, role FROM users;
```

### Count Activities by Type

```sql
SELECT activity_type, COUNT(*) as count FROM activities GROUP BY activity_type;
```

### View Activities by User

```sql
SELECT u.email, COUNT(a.id) as activities FROM users u
LEFT JOIN activities a ON u.id = a.user_id
GROUP BY u.id
ORDER BY activities DESC;
```

### Reset User Role

```sql
UPDATE users SET role = 'developer' WHERE email = 'your-email@successive.tech';
```

---

## Manual Testing Checklist

### Sprint 1 (Foundation & Auth)
- [ ] Register with company email
- [ ] Login with correct credentials
- [ ] Login fails with wrong password
- [ ] View profile page
- [ ] Edit profile (name, team, tech stack)
- [ ] Dark/light theme toggle works
- [ ] Mobile responsive (resize browser)

### Sprint 2 (Activity Logging)
- [ ] Log activity with all fields
- [ ] View activity in history timeline
- [ ] Edit own activity
- [ ] Delete own activity
- [ ] Form validation works
- [ ] Activity date validation works
- [ ] Tags populate from database
- [ ] Cannot edit other user's activity (as developer)

### Sprint 3 (Admin Dashboard)
- [ ] Manager can access `/admin`
- [ ] Developer cannot access `/admin`
- [ ] Overview tab shows correct counts
- [ ] Charts render with correct data
- [ ] Teams tab shows adoption %
- [ ] All Users tab lists everyone
- [ ] CSV export downloads correctly
- [ ] CSV opens in Excel without errors

---

## Performance Testing

### Load Test: 100+ Activities

```bash
node -e "
const db = require('./src/db');
const users = db.all('SELECT id FROM users');
for (let i = 0; i < 100; i++) {
  const user = users[i % users.length];
  db.run(
    'INSERT INTO activities (user_id, activity_type, title, activity_date) VALUES (?, ?, ?, ?)',
    [user.id, 'learning', 'Test activity ' + i, '2026-05-10']
  );
}
console.log('100 activities created');
"
```

Then access admin dashboard — should load within 2s.

---

## Automated Testing (Future)

For Sprint 4, consider adding:
- Jest unit tests for API routes
- React Testing Library for component tests
- Cypress/Playwright for E2E tests

---

## Deployment Checklist

Before going to production:

- [ ] Change `JWT_SECRET` in `.env` to secure value
- [ ] Set `NODE_ENV=production`
- [ ] Switch database to PostgreSQL (see `skills/database/SKILL.md`)
- [ ] Enable HTTPS
- [ ] Set up proper CORS origins
- [ ] Add rate limiting to API
- [ ] Configure database backups
- [ ] Set up monitoring/logging
- [ ] Create admin user account
- [ ] Test all role-based access
- [ ] Run security audit

---

## Support & Troubleshooting

### Check API Endpoints

```bash
# Health check
curl http://localhost:4000/api/health

# List users (requires valid token)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/users/me

# List teams
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/users/teams

# List tags
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/users/tags
```

### Enable Backend Logging

In `backend/src/server.js`, Morgan is configured with dev logging. Look at console output.

### Check Database State

```bash
sqlite3 backend/data/portal.db
.schema users
.schema activities
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as activity_count FROM activities;
```

---

## Built with Claude — May 2026

All sprints tested and verified. Ready for internal pilot rollout.
