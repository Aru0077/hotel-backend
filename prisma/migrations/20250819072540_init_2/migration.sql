/*
  Warnings:

  - You are about to drop the `admin_positions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `department_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `positions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_definitions` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `role_type` on the `user_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."role_type" AS ENUM ('ADMIN', 'MERCHANT', 'CUSTOMER');

-- DropForeignKey
ALTER TABLE "public"."admin_positions" DROP CONSTRAINT "admin_positions_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."admin_positions" DROP CONSTRAINT "admin_positions_position_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."department_permissions" DROP CONSTRAINT "department_permissions_department_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."department_permissions" DROP CONSTRAINT "department_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."positions" DROP CONSTRAINT "positions_department_id_fkey";

-- AlterTable
ALTER TABLE "public"."user_roles" DROP COLUMN "role_type",
ADD COLUMN     "role_type" "public"."role_type" NOT NULL;

-- DropTable
DROP TABLE "public"."admin_positions";

-- DropTable
DROP TABLE "public"."department_permissions";

-- DropTable
DROP TABLE "public"."departments";

-- DropTable
DROP TABLE "public"."permissions";

-- DropTable
DROP TABLE "public"."positions";

-- DropTable
DROP TABLE "public"."role_definitions";

-- CreateIndex
CREATE INDEX "user_roles_role_type_idx" ON "public"."user_roles"("role_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_type_key" ON "public"."user_roles"("user_id", "role_type");
