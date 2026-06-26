-- Drop derived path and share_path columns from chats
ALTER TABLE "chats" DROP COLUMN IF EXISTS "path";
ALTER TABLE "chats" DROP COLUMN IF EXISTS "share_path";
