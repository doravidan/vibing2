# Fix "User not found in database" Issue

## 🔴 Problem

You're getting **"User not found in database"** error when trying to save projects because:

1. **You're logged in with a PostgreSQL user** (from before the migration)
2. **The app now looks for users in InstantDB** (after migration)
3. **Your old user doesn't exist in InstantDB** - only in PostgreSQL

## ✅ Solution: Create a New User in InstantDB

You MUST sign up with a **NEW account** that will be stored in InstantDB.

### Step 1: Kill All Processes

Run this command to stop everything:

```bash
killall -9 node pnpm cargo tauri
sleep 3
rm -rf /Users/I347316/dev/vibing2/.next
```

### Step 2: Clear Browser Data

1. Open your browser
2. Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
3. Select "Cookies and other site data"
4. Select "Cached images and files"
5. Clear data for **Last hour**
6. Close ALL browser tabs for localhost:3000

### Step 3: Restart Server Clean

```bash
cd /Users/I347316/dev/vibing2
pnpm run dev
```

Wait for: `> Ready on http://localhost:3000`

### Step 4: Sign Up with NEW Account

1. **Go to**: http://localhost:3000/auth/signup
2. **Create NEW user**:
   - Email: `newuser@example.com` (DIFFERENT from old account)
   - Password: `NewPassword123`
   - Name: `New User`
3. Click "Sign Up"

### Step 5: Sign In

1. **Go to**: http://localhost:3000/auth/signin
2. **Enter NEW credentials**:
   - Email: `newuser@example.com`
   - Password: `NewPassword123`
3. Click "Sign In"

### Step 6: Test Everything

1. **Dashboard**: http://localhost:3000/dashboard (should load)
2. **Create Project**: http://localhost:3000/create (should work)
3. **Auto-save**: Should work now (no "User not found" error)

## 🎯 Why This Is Necessary

### Before Migration (PostgreSQL):
```
User "old@example.com" → Stored in PostgreSQL
Project Save → Looks for user in PostgreSQL ✅ Works
```

### After Migration (InstantDB):
```
User "old@example.com" → ONLY in PostgreSQL (not in InstantDB)
Project Save → Looks for user in InstantDB ❌ "User not found"
```

### After Creating New User:
```
User "newuser@example.com" → Stored in InstantDB ✅
Project Save → Looks for user in InstantDB ✅ Works!
```

## 🔍 How to Verify

### Check InstantDB Dashboard
1. Visit: https://instantdb.com/dash
2. Select app: `4a7c9af4-d678-423e-84ac-03e85390bc73`
3. Go to "Explorer"
4. Query `users` collection
5. You should see your NEW user with:
   - Email: `newuser@example.com`
   - Password: Bcrypt hash (starts with `$2a$10$`)
   - Created timestamp

### Test Project Creation
1. Go to: http://localhost:3000/create
2. Type a prompt: "create a simple calculator"
3. Click "Generate"
4. **Auto-save should work** - no errors
5. Go to dashboard - you should see your project

## ❌ Common Mistakes

### Mistake 1: Using Old Credentials
```
❌ Signing in with old PostgreSQL account
✅ Creating and using NEW InstantDB account
```

### Mistake 2: Not Clearing Browser Data
```
❌ Old session cookie still active
✅ Clear cookies and start fresh
```

### Mistake 3: Multiple Servers Running
```
❌ 48 background processes fighting for ports
✅ Kill ALL processes and start ONE clean server
```

## 🚀 Quick Fix Script

Save this as `fix-auth.sh` and run it:

```bash
#!/bin/bash

echo "🧹 Cleaning up processes..."
killall -9 node pnpm cargo tauri 2>/dev/null
sleep 3

echo "🗑️  Removing build cache..."
cd /Users/I347316/dev/vibing2
rm -rf .next

echo "🚀 Starting server..."
pnpm run dev &

echo ""
echo "✅ Server starting..."
echo ""
echo "📋 Next steps:"
echo "1. Clear browser cookies for localhost:3000"
echo "2. Go to: http://localhost:3000/auth/signup"
echo "3. Create NEW account (different email)"
echo "4. Sign in with NEW account"
echo "5. Test project creation"
echo ""
echo "Wait 10 seconds for server to start, then visit:"
echo "http://localhost:3000/auth/signup"
```

## 📝 Summary

**The Problem**: Old user in PostgreSQL, app looks in InstantDB
**The Solution**: Create new user in InstantDB
**The Result**: Everything works perfectly!

After you create a new user and sign in with it:
- ✅ Signup works
- ✅ Signin works
- ✅ Dashboard loads
- ✅ Projects save
- ✅ Auto-save works
- ✅ No "User not found" errors

**Remember**: You MUST use the NEW InstantDB account, not your old PostgreSQL account!
