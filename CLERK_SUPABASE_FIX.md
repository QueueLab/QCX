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

3. **Updated `clerk_id()` function (v1, later reverted)**: Initially attempted to extract the Clerk user ID from the JWT `sub` claim: `SELECT auth.jwt() ->> 'sub'`. However, this returned the Supabase `auth.users.id` (UUID), not the Clerk user ID string, causing all RLS policies to fail.

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

---

# Fix v2: clerk_id() Function Correction

## Problem Summary (v2)

The initial `clerk_id()` function from Fix v1 returned the wrong value. It used `SELECT auth.jwt() ->> 'sub'` which returns the Supabase `auth.users.id` (a UUID like `85a812de-...`), but the `clerk_user_id` column stores Clerk user IDs (strings like `user_3GEXlPN...`). Since these two ID formats will never match, the `is_clerk_user()` function and all RLS policies that depend on it always returned `false`, blocking all Clerk-authenticated users from accessing data.

## Root Cause

In Supabase, `auth.jwt() ->> 'sub'` returns the Supabase internal user ID (UUID from `auth.users.id`). It does NOT return the Clerk user ID. Clerk and Supabase have separate identity systems:

- **Supabase**: Uses UUIDs (e.g., `85a812de-f4e4-4cba-aee7-24efe4d663e3`)
- **Clerk**: Uses prefixed strings (e.g., `user_3GEXlPNzzZIDVjF2kCadMx5NvNf`)

The `public.users` table bridges these by storing both: `id` (UUID, same as `auth.users.id`) and `clerk_user_id` (Clerk string).

## Fix Applied

### QCX-BACKEND (Supabase) — Migration 0004

1. **Rewrote `clerk_id()` function**: Instead of returning `auth.jwt() ->> 'sub'`, it now looks up the Clerk ID from the `public.users` table using the current session's `auth.uid()`:

   ```sql
   SELECT public.users.clerk_user_id
   FROM public.users
   WHERE public.users.id = auth.uid()
   LIMIT 1;
   ```

   This correctly returns the Clerk user ID string (e.g., `user_3GEXlPNzzZIDVjF2kCadMx5NvNf`) for the currently authenticated user.

2. **Verified `is_clerk_user()` function**: No changes needed — it already correctly calls `public.clerk_id()` and compares against `clerk_user_id`. With the fixed `clerk_id()` function, this now works correctly.

3. **Re-applied all 12 RLS policies** across 8 tables to ensure they use the corrected `clerk_id()` and `is_clerk_user()` functions.

## Verification

All components verified after fix:
- `clerk_id()` function: returns Clerk user ID string (not Supabase UUID)
- `is_clerk_user()` function: correctly returns `true` for Clerk-authenticated users
- RLS policies: 12 policies across 8 tables, all using corrected `is_clerk_user()`
- Correct SQL query pattern: `SELECT id FROM users WHERE clerk_user_id = '<clerk-id>'` works

## How It Works After the Fix (v2)

When a Clerk-authenticated user makes a request:

1. **Clerk** authenticates the user and provides a JWT.
2. **Supabase** receives the request with a valid session. `auth.uid()` returns the Supabase UUID (e.g., `85a812de-...`).
3. **`clerk_id()`** looks up `public.users.clerk_user_id` where `public.users.id = auth.uid()`, returning the Clerk ID (e.g., `user_3GEX...`).
4. **RLS policies** check `clerk_user_id = clerk_id()` — now comparing `user_3GEX...` = `user_3GEX...` → `true`.
5. The user can access their chats, messages, and all other data.

## Deployment Notes (v2)

- Migration `0004_fix_clerk_id_function.sql` applied to QCX-BACKEND (project: `mofqapxwyphzjrqegjeq`).
- All 12 RLS policies re-applied with corrected function references.
- The migration is tracked in the repo's Drizzle migration system.
- Run via `npm run db:migrate` or `bun run db:migrate` to apply to local/dev environments.

---

# Clerk-Supabase Native Third-Party Auth (Clerk) Settings Setup Note

## Native Third-Party Auth Setup Steps (No Shared JWT Secret Needed)

Under the Clerk native Third-Party Auth integration with Supabase, there is **no need** for a shared JWT secret. Supabase validates tokens issued directly by Clerk using Clerk's JSON Web Key Set (JWKS) URL.

### 1. Clerk Dashboard Configuration
1. Go to your **Clerk Dashboard**.
2. Navigate to **JWT Templates** (or **Integrations** -> **Supabase** if using Clerk's legacy integration, but for Native Third-Party Auth, navigate to **Configure** -> **API Keys** -> **JWT Templates** if you wish to configure scopes/claims, or simply use Clerk's native JWT signature).
3. Under Clerk's Native Third-Party Auth, Supabase directly retrieves the JSON Web Key Set (JWKS) from Clerk to verify signature of any standard token issued by Clerk. Therefore, standard session tokens from Clerk can be sent directly to Supabase.

### 2. Supabase Dashboard Configuration
1. Go to your **Supabase Project Dashboard**.
2. Navigate to **Authentication** -> **Third-Party Auth**.
3. Enable **Clerk** Third-Party Auth integration.
4. Set the following fields:
   - **Clerk JWKS URL**: Enter your Clerk JWKS URL (e.g., `https://clerk.<your-domain>.com/.well-known/jwks.json` or development URL like `https://<your-dev-domain>.clerk.accounts.dev/.well-known/jwks.json`).
5. Save the settings.

### 3. Application Integration
The application uses Supabase JS clients initialized with a custom `fetch` handler. The `fetch` handler intercepts out-going requests to Supabase and appends the dynamic Clerk session JWT in the `Authorization` header as `Bearer <clerkToken>`.

- **Client-Side (Browser)**: Retrieves token via Clerk's browser SDK: `window.Clerk.session.getToken()`.
- **Server-Side (Next.js server/API/Actions)**: Retrieves token via `@clerk/nextjs/server` `auth()` helper: `auth().getToken()`.

Both clients use `persistSession: false` since Clerk manages the session lifecycle independently. Tokens are sent without the `{ template: 'supabase' }` option because Supabase validates Clerk tokens directly against the Clerk JWKS.

---

## Dual-Write Consistency and Access Control Guarantees

In a multi-user, real-time collaboration environment, dual-write consistency issues can arise between the primary application database (Drizzle) and the auth/edge function sync in the Supabase backend (QCX-BACKEND). To prevent desynchronization from breaking RLS-authorized Realtime and Storage access, we implement several safety measures:

1. **Stamping Ownership on Individual Messages**: In `saveChat`, instead of stamping all messages with the chat owner's ID, each message is stamped with the `userId` of the individual user that sent it (`userId: msg.userId || effectiveUserId`). This prevents concurrent collaborators' messages from being rewritten or misattributed.
2. **Deterministic Deduplication**: Messages inside a batch transaction are deduplicated using their unique `id` and upserted via `onConflictDoUpdate` (`ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, role = EXCLUDED.role`). This ensures concurrent writes from different collaborators do not conflict or cause duplicate messages.
3. **Graceful User Existence Check**: Webhook path (/api/clerk/webhook) syncs new users to BOTH the primary Drizzle database and the Supabase backend. Furthermore, `getCurrentUserIdOnServer()` uses `resolveClerkUserToDbUser` which deterministically creates or links profile-aligned user records on-demand whenever an action is executed. This guarantees a user is always represented in both stores before attempting database operations.
4. **Resilient Realtime Subscriptions**: Supabase Realtime subscriptions follow the exact same RLS policies deployed in QCX-BACKEND. By ensuring that `is_clerk_user()` and the `chat_participants` access checks are fully reactive, collaborators instantly receive changes they have permission to see, and are automatically unsubscribed/unauthorized on the fly if their access role changes.
