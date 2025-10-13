# InstantDB Authentication Refactor

## ✅ Completed Steps

### 1. Installed InstantDB Packages
```bash
pnpm add @instantdb/react @instantdb/admin
```

**Packages installed:**
- `@instantdb/admin@0.22.13` - Server-side InstantDB operations
- `@instantdb/react@0.22.13` - Client-side InstantDB hooks

### 2. Created InstantDB Helper Library
**File**: `/lib/instantdb.ts`

**Features:**
- `getInstantDBAdmin()` - Returns InstantDB admin client instance
- `getUserByEmail(email)` - Query user by email from InstantDB
- `createInstantDBUser(data)` - Create new user in InstantDB with bcrypt hashed password
- `id()` - Export InstantDB ID generator

**Key Points:**
- Requires `NEXT_PUBLIC_INSTANTDB_APP_ID` environment variable
- Optional `INSTANTDB_ADMIN_TOKEN` for admin operations
- Implements singleton pattern for admin client
- Auto-generates user IDs with InstantDB's `id()` function

### 3. Refactored Signup Endpoint
**File**: `/app/api/auth/signup/route.ts`

**Changes:**
- ❌ Removed: Prisma imports (`prisma`, `createUser`, `getUserByEmail` from `@/lib/db-helpers`)
- ✅ Added: InstantDB imports (`getUserByEmail`, `createInstantDBUser` from `@/lib/instantdb`)
- ✅ Changed: User creation now uses `createInstantDBUser()` with InstantDB
- ✅ Changed: User lookup uses InstantDB `getUserByEmail()`
- ✅ Fixed: Logger calls use correct Pino API (`logger.info(message, data)`)
- ✅ Kept: bcrypt password hashing, rate limiting, validation logic

## ⏳ Remaining Tasks

### 4. Update Auth Configuration (auth.config.ts)
**File**: `/auth.config.ts`

**Needs to change:**
- Replace Prisma adapter with InstantDB for NextAuth.js
- Update `authorize()` function in CredentialsProvider to use InstantDB
- Change user lookup from `getUserByEmail()` (Prisma) to InstantDB version

**Current authorize function uses:**
```typescript
const user = await getUserByEmail(credentials.email);
```

**Should use InstantDB:**
```typescript
import { getUserByEmail } from '@/lib/instantdb';
const user = await getUserByEmail(credentials.email);
```

### 5. Verify Password Comparison
The `verifyPassword()` function from `@/lib/db-helpers` needs to be available or reimplemented:

```typescript
// Add to lib/instantdb.ts
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
```

### 6. Update Middleware (if needed)
**File**: `/middleware.ts`

Check if middleware uses any Prisma-specific user lookups that need to be switched to InstantDB.

### 7. Environment Variables Required

Add to `.env.local`:
```bash
# InstantDB Configuration
NEXT_PUBLIC_INSTANTDB_APP_ID="your_instantdb_app_id_here"
INSTANTDB_ADMIN_TOKEN="your_admin_token_here" # Optional
```

Get these from: https://instantdb.com/dash

### 8. Test Authentication Flow

Once all changes are complete:

1. **Test Signup:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
   ```

2. **Test Signin:**
   - Visit http://localhost:3000/auth/signin
   - Enter credentials
   - Verify authentication succeeds

3. **Verify User in InstantDB:**
   - Check InstantDB dashboard
   - Confirm user exists with hashed password

### 9. Remove Old Prisma Dependencies (Optional)

Once InstantDB auth is confirmed working:
- Remove Prisma from package.json
- Delete `prisma/` directory
- Remove `lib/db-helpers.ts` (Prisma-based helpers)
- Remove `@auth/prisma-adapter` dependency

## InstantDB Schema Required

The InstantDB schema must include a `users` entity with these fields:

```typescript
users: {
  email: string (unique, indexed)
  password: string (bcrypt hashed)
  name: string (optional)
  plan: string (default: "FREE")
  tokenBalance: number (default: 10000)
  contextUsed: number (default: 0)
  createdAt: number (timestamp)
  updatedAt: number (timestamp)
}
```

## Benefits of InstantDB Auth

1. **Single Database** - Auth and project data in one place
2. **Real-time Sync** - InstantDB provides real-time updates
3. **No Sync Issues** - No user mismatch between auth and data databases
4. **Simpler Architecture** - One database client instead of two
5. **Edge Compatible** - Works in Vercel Edge Functions
6. **Type Safety** - InstantDB provides TypeScript support

## Migration Notes

- The existing PostgreSQL/Prisma setup is still in place but no longer used for auth
- Projects API routes were already migrated to InstantDB (see `INSTANTDB_MIGRATION.md`)
- This refactor completes the full migration to InstantDB-only architecture
- Prisma can be safely removed once testing confirms everything works

## Next Steps

1. Add `NEXT_PUBLIC_INSTANTDB_APP_ID` to `.env.local`
2. Update `auth.config.ts` to use InstantDB
3. Add `verifyPassword` helper to `lib/instantdb.ts`
4. Restart server with `pnpm run dev`
5. Test signup and signin flows
6. Verify users appear in InstantDB dashboard

## Rollback Plan

If issues arise, revert these files from git:
- `lib/instantdb.ts` (delete)
- `app/api/auth/signup/route.ts` (git checkout)
- `auth.config.ts` (git checkout - once modified)

Original Prisma-based code is in git history.
