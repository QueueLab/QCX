## 2025-05-22 - [Mass Assignment in Server Actions]
**Vulnerability:** Use of object spreads (...data) in Drizzle .set() and .values() methods within Next.js Server Actions.
**Learning:** Server Actions can receive any JSON payload from the client. Using spreads directly on these inputs can allow attackers to overwrite protected fields like 'userId' or 'id', leading to data corruption or privilege escalation.
**Prevention:** Always explicitly map allowed fields from client-provided objects when performing database operations in Server Actions.
