## 2025-05-14 - [IDOR in Server Actions]
**Vulnerability:** Several server actions in `lib/actions/chat.ts` accepted a `userId` parameter from the client and used it directly for database queries without verification, allowing any authenticated user to read or modify data belonging to other users.
**Learning:** Next.js Server Actions are public API endpoints. Parameters passed from the client cannot be trusted for authorization.
**Prevention:** Always retrieve the `userId` from a secure session (e.g., via `getCurrentUserIdOnServer()`) inside the server action and ignore or verify any `userId` passed as an argument.

## 2025-05-14 - [Wildcard Enumeration in SQL]
**Vulnerability:** The `searchUsers` function used unescaped user input in an `ilike` query, allowing users to enumerate the entire user table using wildcard characters like `%` or `_`.
**Learning:** Wildcard characters in `LIKE`/`ILIKE` queries can be abused to bypass filters or extract data if not properly escaped.
**Prevention:** Always escape `%`, `_`, and `\` in user input before using it in a `LIKE`/`ILIKE` query. Also, enforce length limits on search queries.
