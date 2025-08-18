/*
  Warnings:

  - You are about to drop the column `credential_data` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `identifier` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_at` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `auth_credentials` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `auth_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `auth_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `auth_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `auth_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[facebook_id]` on the table `auth_credentials` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[google_id]` on the table `auth_credentials` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."auth_credentials_is_verified_idx";

-- DropIndex
DROP INDEX "public"."auth_credentials_provider_identifier_idx";

-- DropIndex
DROP INDEX "public"."auth_credentials_provider_identifier_key";

-- DropIndex
DROP INDEX "public"."auth_credentials_user_id_idx";

-- DropIndex
DROP INDEX "public"."auth_credentials_user_id_provider_key";

-- AlterTable
ALTER TABLE "public"."auth_credentials" DROP COLUMN "credential_data",
DROP COLUMN "identifier",
DROP COLUMN "is_verified",
DROP COLUMN "last_used_at",
DROP COLUMN "provider",
ADD COLUMN     "additional_data" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facebook_id" TEXT,
ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "hashed_password" TEXT,
ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_facebook_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_google_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_username_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_used_email" TIMESTAMP(3),
ADD COLUMN     "last_used_facebook" TIMESTAMP(3),
ADD COLUMN     "last_used_google" TIMESTAMP(3),
ADD COLUMN     "last_used_phone" TIMESTAMP(3),
ADD COLUMN     "last_used_username" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_user_id_key" ON "public"."auth_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_username_key" ON "public"."auth_credentials"("username");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_email_key" ON "public"."auth_credentials"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_phone_key" ON "public"."auth_credentials"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_facebook_id_key" ON "public"."auth_credentials"("facebook_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_google_id_key" ON "public"."auth_credentials"("google_id");

-- CreateIndex
CREATE INDEX "auth_credentials_email_idx" ON "public"."auth_credentials"("email");

-- CreateIndex
CREATE INDEX "auth_credentials_phone_idx" ON "public"."auth_credentials"("phone");

-- CreateIndex
CREATE INDEX "auth_credentials_username_idx" ON "public"."auth_credentials"("username");

-- CreateIndex
CREATE INDEX "auth_credentials_facebook_id_idx" ON "public"."auth_credentials"("facebook_id");

-- CreateIndex
CREATE INDEX "auth_credentials_google_id_idx" ON "public"."auth_credentials"("google_id");
