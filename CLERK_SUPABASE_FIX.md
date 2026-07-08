# Clerk-Supabase Auth Synchronization Fix

## Problem Summary

Authenticated users were unable to preview their chats in QCX because the Clerk authentication system and the QCX-BACKEND Supabase backend were not properly synchronized. The root cause was that the `clerk_user_id` column on the `public.users` table was **never being populated**, which caused all Clerk-aware Row Level Security (RLS) policies to fail — specifically, the `is_clerk_user()` function always returned `false`, blocking all authenticated users from accessing any data.

## Root Cause Analysis

The synchronization failure stemmed from **three conflicting user creation paths** that each created user records differently without establishing the Clerk-to-Supabase ID bridge:

### Path 1: Supabase `handle_new_user` Trigger
When a user signed up via Clerk, Clerk's JWT was passed to Supabase. The `handle_new_user` trigger fired on `auth.users` insert and created a `public.users` record with the Supabase-generated UUID as `id`, but it **never set `clerk_user_id`**.

### Path 2: Next.js Webhook Route (`/api/clerk/webhook`)
The webhook received Clerk events and used Drizzle ORM to upsert into the **QCX app's own database** (a separate connection via `DATABASE_URL`). It created records with `clerk_user_id` set, but these records lived in the app's database, **not in QCX-BACKEND**.

### Path 3: Supabase Edge Function (`database-access`)
The edge function received the same Clerk webhooks and performed a direct table upsert into QCX-BACKEND. However, it was using the Clerk ID (e.g., `user_abc123`) as the value for the `id` column — which is a `uuid` type — and it **never set `clerk_user_id`**.

### The Critical Gap
All three paths operated in isolation. None of them linked the Supabase UUID to the Clerk ID in the `clerk_user_id` column. Since all RLS policies depend on `is_clerk_user(user_id)` which checks `clerk_user_id = clerk_id()`, and `clerk_user_id` was always `NULL`, **every RLS policy denied access**.

## Fix Applied

### QCX-BACKEND (Supabase) — Direct SQL/Migration Fixes

1. **`sync_clerk_user()` RPC function**: A canonical function that handles all three cases — existing user by Clerk ID, existing user by email (linking), and new user creation. Returns the Supabase UUID for the record.

2. **Updated `handle_new_user` trigger**: Now extracts the Clerk user ID from `auth.jwt()` metadata and stores it in `clerk_user_id`.

3. **Updated `clerk_id()` function**: Correctly extracts the Clerk user ID from the JWT `sub` claim: `SELECT auth.jwt() ->> 'sub'`.

4. **Updated `is_clerk_user(user_id)` function**: Properly checks that the user's `clerk_user_id` matches the current session's Clerk ID.

5. **Updated all RLS policies** on 8 tables: `users`, `chats`, `messages`, `calendar_notes`, `chat_participants`, `locations`, `system_prompts`, `visualizations`. All policies now correctly use `is_clerk_user()` alongside `auth.uid()`.

6. **`users_updated_at` trigger**: Ensures the `updated_at` timestamp is properly maintained on user records.

7. **Deployed edge function v13**: The `database-access` edge function now calls `sync_clerk_user()` RPC instead of performing direct table upserts.

### QCX (Next.js App) — Codebase Fixes

1. **Updated webhook route** (`app/api/clerk/webhook/route.ts`): Now syncs users to **both** the app's database (via Drizzle) and QCX-BACKEND (via Supabase RPC). This ensures both systems have consistent user records with the correct `clerk_user_id`.

2. **Updated schema** (`lib/db/schema.ts`): Added `first_name`, `last_name`, `avatar_url`, `created_at`, `updated_at`, `username`, `phone_number`, and `metadata` columns to match the QCX-BACKEND users table.

3. **Updated `resolveClerkUserToDbUser`** (`lib/auth/get-current-user.ts`): Now syncs full profile data from Clerk (name, avatar) when resolving users, and properly links existing email-based records to their Clerk ID.

4. **New Drizzle migration** (`drizzle/migrations/0003_clerk_auth_sync.sql`): Persists all the QCX-BACKEND SQL changes (functions, triggers, RLS policies) into the repo's tracked migration system.

## Verification

All 6 critical components verified as active in QCX-BACKEND:
- `sync_clerk_user` function: active
- `clerk_id` function: active
- `is_clerk_user` function: active
- `clerk_user_id` column on `users`: present
- `on_auth_user_created` trigger: active
- `users_updated_at` trigger: active
- Edge function `database-access` v13: deployed and ACTIVE
- RLS policies: 12 policies across 8 tables, all using `is_clerk_user()`

## How It Works After the Fix

When a user authenticates with Clerk:

1. **Clerk** issues a JWT containing the Clerk user ID as the `sub` claim.
2. The **Next.js app** uses Clerk middleware to validate the JWT and extract the Clerk ID.
3. `resolveClerkUserToDbUser()` resolves the Clerk ID to the Supabase UUID, creating/linking the record if needed.
4. The **webhook route** simultaneously syncs the user to QCX-BACKEND via `sync_clerk_user()`.
5. When querying chats, RLS policies check `is_clerk_user(user_id)` which now correctly returns `true` because `clerk_user_id` is properly set.
6. The user can now see their chat history.

## Deployment Notes

- The Supabase changes are **already live** in QCX-BACKEND (project: `mofqapxwyphzjrqegjeq`).
- The edge function is deployed as version 13 and is ACTIVE.
- The Next.js codebase changes are committed and ready for deployment.
- The Drizzle migration (`0003_clerk_auth_sync.sql`) should be run via `npm run db:migrate` or `bun run db:migrate` (which sets `EXECUTE_MIGRATIONS=true`).
- The `edge_function/` directory contains the deployed edge function source for reference.
