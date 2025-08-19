/*
  Warnings:

  - You are about to drop the column `additional_data` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `is_username_verified` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_email` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_facebook` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_google` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_phone` on the `auth_credentials` table. All the data in the column will be lost.
  - You are about to drop the column `last_used_username` on the `auth_credentials` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."auth_credentials" DROP COLUMN "additional_data",
DROP COLUMN "is_username_verified",
DROP COLUMN "last_used_email",
DROP COLUMN "last_used_facebook",
DROP COLUMN "last_used_google",
DROP COLUMN "last_used_phone",
DROP COLUMN "last_used_username",
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "password_changed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "admins_hire_date_idx" ON "public"."admins"("hire_date");

-- CreateIndex
CREATE INDEX "auth_credentials_is_email_verified_idx" ON "public"."auth_credentials"("is_email_verified");

-- CreateIndex
CREATE INDEX "auth_credentials_is_phone_verified_idx" ON "public"."auth_credentials"("is_phone_verified");

-- CreateIndex
CREATE INDEX "auth_credentials_email_is_email_verified_idx" ON "public"."auth_credentials"("email", "is_email_verified");

-- CreateIndex
CREATE INDEX "auth_credentials_phone_is_phone_verified_idx" ON "public"."auth_credentials"("phone", "is_phone_verified");

-- CreateIndex
CREATE INDEX "customers_birth_date_idx" ON "public"."customers"("birth_date");

-- CreateIndex
CREATE INDEX "customers_id_card_idx" ON "public"."customers"("id_card");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "public"."customers"("created_at");

-- CreateIndex
CREATE INDEX "merchants_business_name_idx" ON "public"."merchants"("business_name");

-- CreateIndex
CREATE INDEX "merchants_contact_person_idx" ON "public"."merchants"("contact_person");

-- CreateIndex
CREATE INDEX "merchants_created_at_idx" ON "public"."merchants"("created_at");

-- CreateIndex
CREATE INDEX "user_roles_role_type_status_idx" ON "public"."user_roles"("role_type", "status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE INDEX "users_last_login_at_idx" ON "public"."users"("last_login_at");
