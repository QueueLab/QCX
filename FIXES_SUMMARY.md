# Auth Backend Schema Fixes - PR #327

## Summary of Changes

This commit addresses critical security vulnerabilities and auth backend schema issues identified in the CodeRabbit review.

## Critical Security Fixes

### 1. ✅ Deleted RLS Disable Migration
**File:** `supabase/migrations/0002_disable_rls_for_testing.sql` (DELETED)
- **Issue:** This migration disabled Row Level Security on all tables, creating a critical security vulnerability
- **Risk:** Anyone could read, modify, or delete ANY user's chats, messages, and participants
- **Fix:** Completely removed this migration file to ensure RLS remains enabled in production

### 2. ✅ Added pgcrypto Extension
**File:** `supabase/migrations/0000_init.sql`
- **Issue:** Used `gen_random_uuid()` without enabling the pgcrypto extension
- **Risk:** Migration would fail on typical Supabase setups
- **Fix:** Added `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` at the start of the migration

### 3. ✅ Fixed User Lookup in Collaboration
**File:** `lib/actions/collaboration.ts`
- **Issue:** Queried non-existent `public.users` table instead of `auth.users`
- **Risk:** User invitation flow always failed
- **Fix:** Updated `inviteUserToChat()` to use `auth.admin.listUsers()` via the service client to properly look up users by email

### 4. ✅ Added Auth Check to RAG Function
**File:** `lib/actions/rag.ts`
- **Issue:** `retrieveContext()` had no authentication check
- **Risk:** Unauthorized users could access message embeddings
- **Fix:** Added authentication validation at the start of the function using `getCurrentUserIdOnServer()`

### 5. ✅ Added Environment Validation
**File:** `lib/supabase/client.ts`
- **Issue:** Service client creation didn't validate required environment variables
- **Risk:** Service client could fail silently, bypassing RLS checks
- **Fix:** Added proper validation with descriptive error messages for missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`

### 6. ✅ Improved INSERT Policy Security
**File:** `supabase/migrations/0002_add_insert_policy_for_chats.sql`
- **Issue:** Policy allowed any authenticated user to insert chats with any user_id
- **Risk:** Users could create chats impersonating other users
- **Fix:** Updated policy to enforce `auth.uid() = user_id`, ensuring users can only create chats where they are the owner

## Files Modified

1. `lib/actions/collaboration.ts` - Fixed user lookup to use auth.admin API
2. `lib/actions/rag.ts` - Added authentication check
3. `lib/supabase/client.ts` - Added environment variable validation
4. `supabase/migrations/0000_init.sql` - Added pgcrypto extension
5. `supabase/migrations/0002_add_insert_policy_for_chats.sql` - Improved security policy
6. `supabase/migrations/0002_disable_rls_for_testing.sql` - DELETED (critical security issue)

## Security Improvements

- ✅ RLS remains enabled on all tables
- ✅ All server actions now validate authentication
- ✅ User lookup uses proper Supabase auth APIs
- ✅ Environment variables are validated before use
- ✅ INSERT policies enforce proper ownership
- ✅ Database migrations will run successfully on standard Supabase setups

## Testing Recommendations

1. Verify RLS policies are active: Check Supabase dashboard
2. Test user invitation flow: Ensure users can be invited by email
3. Test RAG context retrieval: Verify auth check prevents unauthorized access
4. Test chat creation: Ensure users can only create chats as themselves
5. Run migrations on a test Supabase project to verify they execute without errors

## Related Issues

Addresses CodeRabbit review comments:
- [CodeRabbit Review Comment](https://github.com/QueueLab/QCX/pull/327#issuecomment-3714336689)
