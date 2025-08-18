/*
  Warnings:

  - The values [USERNAME,EMAIL,PHONE,SMS_OTP] on the enum `auth_provider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."auth_provider_new" AS ENUM ('USERNAME_PASSWORD', 'EMAIL_PASSWORD', 'PHONE_PASSWORD', 'EMAIL_CODE', 'PHONE_CODE', 'FACEBOOK', 'GOOGLE');
ALTER TYPE "public"."auth_provider" RENAME TO "auth_provider_old";
ALTER TYPE "public"."auth_provider_new" RENAME TO "auth_provider";
DROP TYPE "public"."auth_provider_old";
COMMIT;
