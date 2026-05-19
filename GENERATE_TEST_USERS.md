# 🔐 Generate Test User Passwords

This file explains how to set up the test users in the database.

---

## ⚡ One-Line Setup (Recommended)

```bash
cd backend
node generate-test-users.js
```

This will output SQL INSERT statements with proper bcrypt hashes.

---

## 📋 What It Generates

The script creates 4 test users with these credentials:

| Email | Password | Role | 
|-------|----------|------|
| amit@successive.tech | Amit@123 | admin |
| sumit@successive.tech | Sumit@123 | manager |
| dev@successive.tech | Dev@123 | developer |
| alice@successive.tech | Alice@123 | developer |

---

## 🛠️ Step-by-Step Setup

### Step 1: Generate the hashes

```bash
cd backend
node generate-test-users.js
```

**Output will look like:**
```
✅ amit@successive.tech
   Role:     admin
   Password: Amit@123
   Hash:     $2a$10$XQVsJZ5KEQSZ8XfP2PZqzOqRjbRDNzxCkTcPQTxNdZPGPZq/nBZi6

✅ sumit@successive.tech
   Role:     manager
   Password: Sumit@123
   Hash:     $2a$10$YYBxjN7iKL2mN3pO4qR5sOqRjbRDNzxCkTcPQTxNdZPGPZq/nBZi6
   
... (continues for all 4 users)
```

### Step 2: Copy the SQL

The script outputs an SQL INSERT statement. Copy the entire block that starts with:

```sql
INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, mobile, department, team_id, role) VALUES
  ('amit@successive.tech', '$2a$10$...', ...
  ...
);
```

### Step 3: Paste into Migration

Open: `backend/src/migrations/001_initial_schema.sql`

At the very end of the file, paste the SQL INSERT statement you copied.

### Step 4: Create Database

```bash
npm run migrate
```

This will create the database with all 4 test users.

### Step 5: Start the App

```bash
npm run dev
```

---

## ✅ Done!

You can now login with any of these credentials:

```
amit@successive.tech / Amit@123
sumit@successive.tech / Sumit@123
dev@successive.tech / Dev@123
alice@successive.tech / Alice@123
```

---

## 🔄 If You Need to Reset

To recreate the users:

```bash
# Delete the database
rm backend/data/portal.db

# Regenerate with migration
npm run migrate
```

---

## 📝 Already Done?

If you've already pasted the INSERT statement into the migration file, just run:

```bash
npm run migrate
npm run dev
```

Then open http://localhost:5173 and login!

---

## ❓ Questions?

See **QUICK_LOGIN_TESTING.md** for complete testing guide with URLs and roles.
