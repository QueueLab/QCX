## 2026-02-16 - IDOR and Wildcard Enumeration in Server Actions
**Vulnerability:** IDOR in `getChatMessages` and `updateDrawingContext` allowed unauthorized access/modification to chat data. `searchUsers` was susceptible to wildcard enumeration.
**Learning:** Exported server actions in Next.js ('use server') are public endpoints and must implement their own authentication and authorization checks, even if they are only intended for use in protected pages.
**Prevention:** Always retrieve the current user session within the server action and verify ownership/permissions before performing database operations. Escape special SQL characters in `LIKE`/`ILIKE` patterns from user input.
