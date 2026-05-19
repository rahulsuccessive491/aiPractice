# 🎯 FRONTEND TESTING ONLY - Complete Guide

**You don't need to touch the database. Just use these credentials!**

---

## ⚡ Super Quick Start (3 steps)

### Step 1: Generate Test User Passwords

```bash
cd backend
node generate-test-users.js
```

Copy all the output. This gives you the SQL to insert test users.

### Step 2: Paste into Migration File

Open: `backend/src/migrations/001_initial_schema.sql`

Go to the END of the file (after the tags INSERT)

Paste the SQL from Step 1.

### Step 3: Start Everything

```bash
# Terminal 1: Backend
cd backend
npm run migrate     # Creates test users
npm run dev         # Ready at http://localhost:4000

# Terminal 2: Frontend
cd frontend
npm run dev         # Ready at http://localhost:5173
```

**Done!** Open http://localhost:5173 and start testing.

---

## 👥 Login Credentials (After Setup)

Use these to login:

### Admin User
```
URL:      http://localhost:5173
Email:    amit@successive.tech
Password: Amit@123
Role:     admin ✅ Has access to Admin Dashboard
```

### Manager User
```
URL:      http://localhost:5173
Email:    sumit@successive.tech
Password: Sumit@123
Role:     manager ✅ Has access to Admin Dashboard
```

### Developer User
```
URL:      http://localhost:5173
Email:    dev@successive.tech
Password: Dev@123
Role:     developer ❌ NO Admin Dashboard (This is expected!)
```

### Developer User 2
```
URL:      http://localhost:5173
Email:    alice@successive.tech
Password: Alice@123
Role:     developer ❌ NO Admin Dashboard
```

---

## 🧪 What to Test

### Test 1: Developer Access (5 mins)

1. Go to http://localhost:5173
2. Click **Register** (skip - already registered)
3. Click **Sign in**
4. Use: `dev@successive.tech` / `Dev@123`
5. You should see:
   - ✅ Dashboard
   - ✅ Activities link in nav
   - ❌ Admin link should NOT appear
6. Click **Activities**
7. Click **Log Activity**
8. Fill and submit:
   ```
   Activity Type: Learning
   Title: Completed Claude API course
   Date: 2026-05-10
   Tool: Claude
   Domain: Agents
   ```
9. See success message ✅
10. Click **My Activities** → See activity in timeline ✅

**Expected:** Developer can log activities but cannot access admin

---

### Test 2: Manager Access (5 mins)

1. Click **Logout** (top right)
2. Click **Sign in**
3. Use: `sumit@successive.tech` / `Sumit@123`
4. You should see:
   - ✅ Dashboard
   - ✅ Activities link in nav
   - ✅ **Admin link NOW VISIBLE!**
5. Click **Admin**
6. You should see:
   - ✅ "Leadership Dashboard" heading
   - ✅ 4 summary cards (Total Users, Activities, This Week, This Month)
   - ✅ 4 charts with data
7. Click **Teams** tab:
   - ✅ Table with team breakdown
   - ✅ Adoption % column
8. Click **All Users** tab:
   - ✅ List of all users
   - ✅ Activity counts per user
9. Click **↓ Export as CSV** button:
   - ✅ CSV file downloads
   - ✅ Open in Excel/Google Sheets
   - ✅ See activity data

**Expected:** Manager sees full dashboard with all features

---

### Test 3: Admin Access (5 mins)

1. Click **Logout**
2. Click **Sign in**
3. Use: `amit@successive.tech` / `Amit@123`
4. Click **Admin**
5. Verify all features work (same as manager) ✅

**Expected:** Admin has same access as manager

---

## 📋 Complete Feature Checklist

### Sprint 1 - Foundation ✅
- [ ] Register page exists
- [ ] Login works with correct credentials
- [ ] Login fails with wrong password
- [ ] Dashboard displays after login
- [ ] Profile page shows user info
- [ ] Can edit profile
- [ ] Dark/light theme toggle works

### Sprint 2 - Activity Logging ✅
- [ ] Activities link visible in nav
- [ ] Can log activity from form
- [ ] Activity validation works (rejects empty title)
- [ ] Activity date validation works (no future)
- [ ] Activity appears in history timeline
- [ ] Can view activity details
- [ ] Activity type dropdown shows 5 types
- [ ] Tool dropdown shows 4 tools
- [ ] Domain dropdown shows 6 domains

### Sprint 3 - Admin Dashboard ✅
- [ ] Developer cannot see Admin link
- [ ] Manager sees Admin link
- [ ] Admin sees Admin link
- [ ] Developer cannot access /admin (gets Access Denied)
- [ ] Manager can access /admin (sees dashboard)
- [ ] Admin can access /admin (sees dashboard)
- [ ] Overview tab shows 4 cards
- [ ] Overview tab shows 4 charts
- [ ] Teams tab shows adoption %
- [ ] All Users tab lists everyone
- [ ] CSV export downloads file
- [ ] CSV opens in Excel without errors

---

## 🎬 Demo Scenario (10 minutes)

Show 3 different user roles:

**Part 1: Developer (3 min)**
- Login as `dev@successive.tech` / `Dev@123`
- Click Activities → Log an activity
- Show it in history timeline
- Try clicking Admin (not visible) → Show they can't access

**Part 2: Manager (4 min)**
- Logout and login as `sumit@successive.tech` / `Sumit@123`
- Click Admin → Show dashboard
- Show summary cards
- Show charts
- Click Teams tab → Show adoption %
- Click export CSV button

**Part 3: Summary (3 min)**
- Explain role-based access
- Show all features are working
- Show data flows correctly

---

## 📊 Verify Everything Works

### Frontend Loads
- [ ] http://localhost:5173 opens
- [ ] Login page displays
- [ ] No console errors (F12 → Console)

### Backend Responds
- [ ] http://localhost:4000/api/health returns `{"ok":true}`
- [ ] Can login and get JWT token
- [ ] Can fetch activities and admin data

### Roles Work
- [ ] Developer: Activities ✅, Admin ❌
- [ ] Manager: Activities ✅, Admin ✅
- [ ] Admin: Activities ✅, Admin ✅

### Features Work
- [ ] Log activity ✅
- [ ] View history ✅
- [ ] View dashboard ✅
- [ ] Export CSV ✅

---

## 🚨 If Something Breaks

### "Invalid email or password"
**Fix:** Check exact spelling (case-sensitive)
- amit@successive.tech (lowercase)
- Amit@123 (capital A, lowercase mit)

### "Network error — is the API running?"
**Fix:** Make sure backend is running
```bash
cd backend
npm run dev
# Should show: "API listening on http://localhost:4000"
```

### Admin link doesn't appear
**Fix:** 
1. Hard refresh: `Ctrl+Shift+R` (not just Ctrl+R)
2. Logout completely
3. Close browser DevTools (F12)
4. Login again

### Activities don't show
**Fix:**
1. Try logging an activity first
2. Hard refresh: `Ctrl+Shift+R`
3. Check browser console for errors: `F12` → Console

---

## 📚 Reference URLs

| Page | URL | Accessible By |
|------|-----|---------------|
| Login/Register | http://localhost:5173 | Everyone |
| Dashboard | http://localhost:5173/dashboard | Everyone (after login) |
| Profile | http://localhost:5173/profile | Everyone (after login) |
| Activities | http://localhost:5173/activities | Everyone (after login) |
| Admin | http://localhost:5173/admin | Manager + Admin only |

---

## 🎯 What Each User Can Do

### Developer (dev@successive.tech)
```
✅ Login
✅ View Profile
✅ Log Activities
✅ View Own Activities
✅ Edit Own Activities
❌ Access Admin Dashboard
```

### Manager (sumit@successive.tech)
```
✅ All Developer Features
✅ Access Admin Dashboard
✅ View All Users
✅ View Team Breakdowns
✅ View Analytics Charts
✅ Export CSV Reports
```

### Admin (amit@successive.tech)
```
✅ All Manager Features
✅ (Everything manager can do)
```

---

## 🎓 Understanding the System

### How it Works
1. **Frontend** (React) → User logs in
2. **Backend** (Node.js) → Validates credentials, returns JWT token
3. **Frontend** → Stores token, uses it for API calls
4. **Backend** → Checks token + user role on each request
5. **Database** → Stores user data, activities, roles

### Why Roles Matter
- **Developer:** Can log activities, can't see admin dashboard
- **Manager:** Can log + see admin analytics (adoption %, teams, export)
- **Admin:** Same as manager (future: user management)

### What Role Does
- **Frontend:** Checks user.role, shows/hides Admin link
- **Backend:** Checks user.role, blocks access to `/api/admin/*` endpoints
- **Combined:** Developer cannot access dashboard even if they find the URL

---

## ✨ Key Points

1. **No Backend Setup Required** - Just run `npm run migrate`
2. **Test Users Pre-Created** - Use the 4 credentials above
3. **Role-Based Access Works** - Try accessing admin as developer
4. **Everything Frontend** - Log, view, export all from the UI
5. **Data Persists** - All activities saved to database

---

## 🚀 You're Ready!

Follow the "Super Quick Start" at the top, login with the credentials provided, and start testing!

**Questions?** See:
- QUICK_LOGIN_TESTING.md for test scenarios
- ARCHITECTURE_AND_DATA_FLOW.md for technical details
- COMPLETE_VERIFICATION_GUIDE.md for full verification
