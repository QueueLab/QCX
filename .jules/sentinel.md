# Sentinel Security Journal

## 2025-05-14 - [Vulnerability] Mass Assignment in Drizzle Server Actions
**Vulnerability:** Use of the spread operator (`...noteData`) in Drizzle `.set()` or `.values()` calls allowed client-supplied input to overwrite protected fields like `userId`.
**Learning:** Even if the `where` clause checks for the correct `userId`, mass assignment can still allow a user to "transfer" their records to another user by changing the `userId` in the payload.
**Prevention:** Always explicitly list mutable columns in database operations within server actions.

## 2025-05-14 - [Vulnerability] Wildcard Enumeration in ILIKE Queries
**Vulnerability:** Unsanitized user input in `ILIKE` patterns (`%${query}%`) allowed authenticated users to enumerate records (e.g., all user emails) by using `%` or `_` wildcards.
**Learning:** Drizzle's `ilike` operator does not automatically escape wildcards. Postgres requires an explicit `ESCAPE` clause to treat these characters as literals.
**Prevention:** Sanitize user input by escaping `%`, `_`, and `\` and using `sql`${column} ILIKE ${pattern} ESCAPE '\\'` template literals.
