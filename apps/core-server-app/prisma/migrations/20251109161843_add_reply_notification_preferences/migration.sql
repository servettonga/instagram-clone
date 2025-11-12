-- AlterTable
ALTER TABLE "public"."notification_preferences" ADD COLUMN     "reply_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reply_web" BOOLEAN NOT NULL DEFAULT true;
