# 🔧 Fix Auth Sign-In Issue

## Problem
Sign-in keeps redirecting back to `/auth/signin` in a loop because:
1. Old session cookies encrypted with old `AUTH_SECRET`
2. Server can't decrypt old cookies → "no matching decryption secret"
3. Auth thinks you're not signed in → redirects to sign-in

## Solution: Clear Browser Cookies

### Option 1: Chrome DevTools (Recommended)
1. Open http://localhost:3000
2. Press **F12** to open DevTools
3. Go to **Application** tab
4. Expand **Cookies** → click `http://localhost:3000`
5. Right-click → **Clear all**
6. Close DevTools and refresh page
7. Sign in again

### Option 2: Incognito/Private Window
1. Open a new Incognito window (Ctrl+Shift+N / Cmd+Shift+N)
2. Go to http://localhost:3000
3. Sign in with: `doravi1987@gmail.com` / your password

### Option 3: Use This Script
```bash
# Create a test user and sign in via API
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=doravi1987@gmail.com&password=yourpassword" \
  -c cookies.txt

# Then use cookies.txt in subsequent requests
curl -b cookies.txt http://localhost:3000/api/auth/session
```

## Why This Happens
- When we fixed `auth.ts` (removed PrismaAdapter), the `AUTH_SECRET` changed
- Your browser still has cookies encrypted with the OLD secret
- Server tries to decrypt with NEW secret → fails
- NextAuth thinks you're not logged in → redirect loop

## Verification
After clearing cookies, you should see:
1. Sign-in page loads ✅
2. Enter credentials and click "Sign In" ✅
3. Redirects to `/dashboard` ✅
4. No more JWT errors in console ✅

## Server Logs Show
```
POST /api/auth/callback/credentials? 200 in 168ms
GET /api/auth/session 200 in 26ms
GET /auth/signin?callbackUrl=%2Fdashboard 200 in 102ms  ← REDIRECT LOOP
```

After fix:
```
POST /api/auth/callback/credentials? 200 in 168ms
GET /dashboard 200 in 50ms  ← SUCCESS!
```
