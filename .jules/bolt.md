# Bolt's Journal

## 2025-05-14 - [Database Indexing for Performance]
**Learning:** Found that the core tables (`chats`, `messages`, `calendar_notes`) were missing indexes on frequently queried and sorted columns (foreign keys and `created_at`). In Drizzle ORM, foreign key constraints do not automatically create indexes in PostgreSQL.
**Action:** Always check for missing indexes on foreign keys and columns used in `WHERE` and `ORDER BY` clauses to ensure query performance scales with data growth.
