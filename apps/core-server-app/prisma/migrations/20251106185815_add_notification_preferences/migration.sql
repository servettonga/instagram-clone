/*
  Warnings:

  - The values [like,comment,follow,subscription] on the enum `notification_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."notification_type_new" AS ENUM ('follow_request', 'follow_accepted', 'post_like', 'post_comment', 'comment_like', 'comment_reply', 'mention', 'system');
ALTER TABLE "public"."notifications" ALTER COLUMN "type" TYPE "public"."notification_type_new" USING ("type"::text::"public"."notification_type_new");
ALTER TYPE "public"."notification_type" RENAME TO "notification_type_old";
ALTER TYPE "public"."notification_type_new" RENAME TO "notification_type";
DROP TYPE "public"."notification_type_old";
COMMIT;

-- CreateTable
CREATE TABLE "public"."notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "follow_web" BOOLEAN NOT NULL DEFAULT true,
    "like_web" BOOLEAN NOT NULL DEFAULT true,
    "comment_web" BOOLEAN NOT NULL DEFAULT true,
    "mention_web" BOOLEAN NOT NULL DEFAULT true,
    "follow_email" BOOLEAN NOT NULL DEFAULT true,
    "like_email" BOOLEAN NOT NULL DEFAULT true,
    "comment_email" BOOLEAN NOT NULL DEFAULT true,
    "mention_email" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "public"."notification_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "public"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
