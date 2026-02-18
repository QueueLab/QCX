## 2026-02-18 - [IDOR in Chat Message Retrieval]
**Vulnerability:** The `getChatMessages` server action in `lib/actions/chat.ts` was fetching messages by `chatId` without verifying if the requesting user was the owner of the chat or if the chat was public.
**Learning:** High-level server actions were relying on low-level database utilities that lacked authorization logic, assuming callers would perform checks. This led to an IDOR vulnerability where anyone could read any chat's messages if they knew the `chatId`.
**Prevention:** Always perform authorization checks in high-level server actions (the entry points for client calls) using the current user's ID from the session and verifying ownership or visibility of the target resource.
