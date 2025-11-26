-- Add last_read_at column to track when participants last read each chat
ALTER TABLE "chats_participants"
ADD COLUMN IF NOT EXISTS "last_read_at" TIMESTAMP(3);
