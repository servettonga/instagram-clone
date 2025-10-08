/*
  Warnings:

  - A unique constraint covering the columns `[user_id,provider]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."accounts_email_key";

-- CreateIndex
CREATE INDEX "accounts_email_idx" ON "public"."accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_user_id_provider_key" ON "public"."accounts"("user_id", "provider");
