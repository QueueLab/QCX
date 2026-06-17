# Sentinel Security Journal - Critical Learnings

## 2025-05-14 - [IDOR in Server Actions]
**Vulnerability:** Server actions in `lib/actions/chat.ts` were accepting `userId` as an argument from the client, allowing attackers to access or modify other users' chats by providing their IDs. Additionally, `getChatMessages` lacked any authorization check, returning all messages for any given `chatId`.
**Learning:** Next.js server actions (exported functions in files with `'use server'`) are public endpoints. Trusting client-side parameters for user identification is a major security risk. Authorization must be enforced at the entry point of every server action.
**Prevention:** Always retrieve user identity server-side from secure sessions/cookies using utilities like `getCurrentUserIdOnServer()`. For resource access (like messages), verify ownership or public visibility using a database-level check (e.g., `dbGetChat`) before performing the operation.

## 2025-05-14 - [Database UUID Type Safety]
**Vulnerability:** Passing a non-UUID string like `'anonymous'` to a PostgreSQL `uuid` field in a query can cause a database error.
**Learning:** When handling unauthenticated users in database queries, ensure that either a valid UUID is used or the logic explicitly handles the absence of a user ID before hitting the database query that expects a UUID.
**Prevention:** Refactor database utility functions to accept `string | null` and handle the `null` case early to avoid invalid type syntax errors in SQL.
