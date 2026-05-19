# 🚀 Quick Login Testing Guide

**No Backend Setup Required - Just Login & Test!**

---

## ⚡ Super Quick Start

```bash
# Terminal 1: Backend (auto-creates DB)
cd backend
npm install
npm run migrate     # Creates DB with test users
npm run dev         # Ready at http://localhost:4000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev         # Ready at http://localhost:5173
```

**That's it!** Open http://localhost:5173 and use the credentials below.

---

## 👥 Pre-Configured Test Users

Ready to login immediately after `npm run migrate`:

### 1️⃣ **ADMIN User**
```
Email:    amit@successive.tech
Password: Admin@123
Role:     admin
Access:   ✅ Activities + ✅ Admin Dashboard
```

### 2️⃣ **MANAGER User**
```
Email:    sumit@successive.tech
Password: Manager@123
Role:     manager
Access:   ✅ Activities + ✅ Admin Dashboard
```

### 3️⃣ **DEVELOPER User**
```
Email:    dev@successive.tech
Password: Dev@123
Role:     developer
Access:   ✅ Activities ONLY (No Admin Dashboard)
```

### 4️⃣ **DEVELOPER User 2**
```
Email:    alice@successive.tech
Password: Alice@123
Role:     developer
Access:   ✅ Activities ONLY (No Admin Dashboard)
```

---

## 🧪 Testing Flows

### Test 1: Developer Can't Access Admin Dashboard

**Steps:**
1. Go to http://localhost:5173
2. Login as `dev@successive.tech` / `Dev@123`
3. Click **Activities** ✅ (works)
4. Click **Admin** in nav ❌ (not visible)
5. Try accessing directly: http://localhost:5173/admin
6. See **"Access Denied"** message ✅

**Expected:** Developer sees Activities but NO Admin link

---

### Test 2: Manager Can Access Dashboard

**Steps:**
1. Logout (click Logout button)
2. Login as `sumit@successive.tech` / `Manager@123`
3. Click **Activities** ✅ (works)
4. Click **Admin** in nav ✅ (NOW VISIBLE!)
5. See dashboard with:
   - Summary cards ✅
   - 4 charts ✅
   - Team breakdown ✅
   - All users list ✅
   - CSV export button ✅

**Expected:** Manager sees all dashboard features

---

### Test 3: Admin Has Same Access as Manager

**Steps:**
1. Logout
2. Login as `amit@successive.tech` / `Admin@123`
3. Click **Admin** in nav ✅ (visible)
4. View all dashboard features ✅
5. Everything works like manager ✅

**Expected:** Admin has full access

---

### Test 4: Log Activities as Developer

**Steps:**
1. Login as `dev@successive.tech` / `Dev@123`
2. Click **Activities**
3. Click **Log Activity** tab
4. Fill form:
   ```
   Activity Type: Learning
   Title:         Completed Claude API course
   Date:          2026-05-10
   Tool:          Claude
   Domain:        Agents
   ```
5. Click **Log Activity**
6. See success message ✅
7. Switch to **My Activities** tab
8. See your activity in timeline ✅

**Expected:** Activity appears in history

---

### Test 5: Manager Views All Activities

**Steps:**
1. Login as `sumit@successive.tech` / `Manager@123`
2. Click **Admin**
3. Click **All Users** tab
4. See list of all users
5. Check activity counts for each user
6. Should show activities logged by developers ✅

**Expected:** Manager sees all users and their activity counts

---

### Test 6: Export CSV Report

**Steps:**
1. Login as manager or admin
2. Click **Admin**
3. Click **↓ Export as CSV** button (top right)
4. Browser downloads `activities-2026-05-13.csv` ✅
5. Open in Excel/Google Sheets
6. Verify:
   - Headers present ✅
   - User activities listed ✅
   - Dates formatted correctly ✅

**Expected:** CSV file downloads with activity data

---

## 📋 Complete Test Checklist

### Sprint 1 (Foundation) ✅
- [ ] Register page loads
- [ ] Login with correct credentials works
- [ ] Login with wrong password fails
- [ ] Profile page displays user info
- [ ] Can edit profile
- [ ] Dark/light theme toggle works

### Sprint 2 (Activity Logging) ✅
- [ ] Developer can log activity
- [ ] Activity appears in history
- [ ] Form validation works (reject empty title)
- [ ] Date validation works (no future dates)
- [ ] Can edit own activity
- [ ] Can delete own activity

### Sprint 3 (Admin Dashboard) ✅
- [ ] Manager sees Admin link in nav
- [ ] Developer doesn't see Admin link
- [ ] Manager can access `/admin`
- [ ] Developer gets "Access Denied" on `/admin`
- [ ] Dashboard shows summary cards
- [ ] Dashboard shows 4 charts
- [ ] Teams tab works with adoption %
- [ ] All Users tab shows roster
- [ ] CSV export downloads

---

## 🔐 How Users Were Created

All users are automatically created by this SQL when you run `npm run migrate`:

```sql
-- These users are inserted automatically
INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, mobile, department, team_id, role)
VALUES
  ('amit@successive.tech',
   '$2a$10$YourBcryptHashHere...',  -- Password: Admin@123
   'Amit',
   'Admin',
   '9876543210',
   'Engineering',
   1,
   'admin'),
  
  ('sumit@successive.tech',
   '$2a$10$YourBcryptHashHere...',  -- Password: Manager@123
   'Sumit',
   'Manager',
   '9876543211',
   'Engineering',
   2,
   'manager'),
  
  ('dev@successive.tech',
   '$2a$10$YourBcryptHashHere...',  -- Password: Dev@123
   'Dev',
   'Developer',
   '9876543212',
   'Engineering',
   1,
   'developer'),
  
  ('alice@successive.tech',
   '$2a$10$YourBcryptHashHere...',  -- Password: Alice@123
   'Alice',
   'Developer',
   '9876543213',
   'Engineering',
   2,
   'developer');
```

**No manual database setup needed!** The migration script creates everything.

---

## 🌐 URLs Reference

| Page | URL | Who Can Access |
|------|-----|----------------|
| Login | http://localhost:5173 | Everyone |
| Register | http://localhost:5173/register | Everyone |
| Dashboard | http://localhost:5173/dashboard | Everyone (after login) |
| Profile | http://localhost:5173/profile | Everyone (after login) |
| **Activities** | http://localhost:5173/activities | Everyone (after login) ✅ |
| **Admin** | http://localhost:5173/admin | Manager + Admin only ✅ |

---

## 🎯 What Each Role Can Do

### Developer (`dev@successive.tech`)
```
✅ Register & Login
✅ View/Edit Profile
✅ Log Activities
✅ View Own Activities
✅ Edit Own Activities
✅ Delete Own Activities
❌ Access Admin Dashboard
❌ View Other Users' Activities
```

### Manager (`sumit@successive.tech`)
```
✅ All Developer Features
✅ Access Admin Dashboard
✅ View All Users
✅ View Any User's Activities
✅ View Team Breakdown
✅ View Analytics Charts
✅ Download CSV Reports
```

### Admin (`amit@successive.tech`)
```
✅ All Manager Features
✅ (Same as Manager for now)
✅ Future: User management, settings
```

---

## 🐛 Troubleshooting

### Problem: "Invalid email or password" on login

**Solution:** Make sure you're using exact credentials:
- Email: `dev@successive.tech` (not `dev@gmail.com`)
- Password: `Dev@123` (exact spelling, case-sensitive)
- Check CAPS LOCK is off

### Problem: Admin link not showing for manager

**Solution:**
1. Make sure you logged in correctly as manager
2. Close browser DevTools (F12)
3. Hard refresh page: `Ctrl+Shift+R` (not just `Ctrl+R`)
4. Logout completely
5. Login again

### Problem: "Network error — is the API running?"

**Solution:**
1. Make sure backend is running: `npm run dev` in `backend/` folder
2. Check console shows: "API listening on http://localhost:4000"
3. Test: Open http://localhost:4000/api/health in browser
4. Should show: `{"ok":true,"service":"ai-skills-portal"}`

### Problem: Activities not showing

**Solution:**
1. Make sure you logged in with a valid user
2. Log some activities first (Activities → Log Activity)
3. Refresh page: `F5`
4. Check browser console for errors: `F12` → Console tab

---

## 📊 Quick Role Comparison

| Feature | Dev | Manager | Admin |
|---------|-----|---------|-------|
| Login | ✅ | ✅ | ✅ |
| Log Activity | ✅ | ✅ | ✅ |
| View Own Activities | ✅ | ✅ | ✅ |
| View Other's Activities | ❌ | ✅ | ✅ |
| Access Admin Dashboard | ❌ | ✅ | ✅ |
| View Team Metrics | ❌ | ✅ | ✅ |
| Export Reports | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ (future) |

---

## 🎬 Demo Flow (5 minutes)

1. **Show Developer Experience** (2 min)
   - Login as `dev@successive.tech`
   - Log an activity
   - Show activity in history
   - Show they can't access admin

2. **Show Manager Experience** (3 min)
   - Login as `sumit@successive.tech`
   - Click Admin dashboard
   - Show summary cards
   - Show charts
   - Download CSV report

---

## ✅ Everything is Ready!

No database commands needed. Just:

```bash
# Start backend (creates test users)
cd backend && npm run migrate && npm run dev

# Start frontend
cd frontend && npm run dev

# Login with the credentials above and test!
```

---

## 🚨 Important Notes

- All passwords are examples for testing only
- Change passwords before production
- Emails must use `@successive.tech` domain (hardcoded in validation)
- Users are created fresh each time you run `npm run migrate`
- To add more test users, register them through UI at `/register`

---

**Happy Testing!** 🎉

Login with any of the 4 test users and explore the system.

