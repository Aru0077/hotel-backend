-- CreateEnum
CREATE TYPE "public"."role_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."auth_provider" AS ENUM ('USERNAME', 'EMAIL', 'PHONE', 'FACEBOOK', 'GOOGLE', 'SMS_OTP');

-- CreateEnum
CREATE TYPE "public"."merchant_verify_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_type" TEXT NOT NULL,
    "status" "public"."role_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_credentials" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "credential_data" JSONB,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."merchants" (
    "id" SERIAL NOT NULL,
    "user_role_id" INTEGER NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_license" TEXT,
    "contact_person" TEXT NOT NULL,
    "business_address" TEXT,
    "business_type" TEXT,
    "verification_status" "public"."merchant_verify_status" NOT NULL DEFAULT 'PENDING',
    "business_phone" TEXT,
    "business_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" SERIAL NOT NULL,
    "user_role_id" INTEGER NOT NULL,
    "real_name" TEXT,
    "id_card" TEXT,
    "birth_date" DATE,
    "gender" "public"."gender",
    "preferences" JSONB,
    "address" TEXT,
    "emergency_contact" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" SERIAL NOT NULL,
    "user_role_id" INTEGER NOT NULL,
    "employee_id" TEXT NOT NULL,
    "hire_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "manager_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."positions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_positions" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "admin_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."department_permissions" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_definitions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_type_idx" ON "public"."user_roles"("role_type");

-- CreateIndex
CREATE INDEX "user_roles_status_idx" ON "public"."user_roles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_type_key" ON "public"."user_roles"("user_id", "role_type");

-- CreateIndex
CREATE INDEX "auth_credentials_user_id_idx" ON "public"."auth_credentials"("user_id");

-- CreateIndex
CREATE INDEX "auth_credentials_provider_identifier_idx" ON "public"."auth_credentials"("provider", "identifier");

-- CreateIndex
CREATE INDEX "auth_credentials_is_verified_idx" ON "public"."auth_credentials"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_provider_identifier_key" ON "public"."auth_credentials"("provider", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_user_id_provider_key" ON "public"."auth_credentials"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_user_role_id_key" ON "public"."merchants"("user_role_id");

-- CreateIndex
CREATE INDEX "merchants_verification_status_idx" ON "public"."merchants"("verification_status");

-- CreateIndex
CREATE INDEX "merchants_business_type_idx" ON "public"."merchants"("business_type");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_role_id_key" ON "public"."customers"("user_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_card_key" ON "public"."customers"("id_card");

-- CreateIndex
CREATE INDEX "customers_real_name_idx" ON "public"."customers"("real_name");

-- CreateIndex
CREATE INDEX "customers_gender_idx" ON "public"."customers"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_role_id_key" ON "public"."admins"("user_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_employee_id_key" ON "public"."admins"("employee_id");

-- CreateIndex
CREATE INDEX "admins_employee_id_idx" ON "public"."admins"("employee_id");

-- CreateIndex
CREATE INDEX "admins_is_active_idx" ON "public"."admins"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "public"."departments"("name");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "public"."departments"("parent_id");

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "public"."departments"("manager_id");

-- CreateIndex
CREATE INDEX "departments_is_active_idx" ON "public"."departments"("is_active");

-- CreateIndex
CREATE INDEX "departments_name_idx" ON "public"."departments"("name");

-- CreateIndex
CREATE INDEX "positions_department_id_idx" ON "public"."positions"("department_id");

-- CreateIndex
CREATE INDEX "positions_is_active_idx" ON "public"."positions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "positions_department_id_name_key" ON "public"."positions"("department_id", "name");

-- CreateIndex
CREATE INDEX "admin_positions_admin_id_idx" ON "public"."admin_positions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_positions_position_id_idx" ON "public"."admin_positions"("position_id");

-- CreateIndex
CREATE INDEX "admin_positions_assigned_at_idx" ON "public"."admin_positions"("assigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_positions_admin_id_position_id_key" ON "public"."admin_positions"("admin_id", "position_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "public"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "public"."permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "public"."permissions"("module");

-- CreateIndex
CREATE INDEX "permissions_code_idx" ON "public"."permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_is_active_idx" ON "public"."permissions"("is_active");

-- CreateIndex
CREATE INDEX "department_permissions_department_id_idx" ON "public"."department_permissions"("department_id");

-- CreateIndex
CREATE INDEX "department_permissions_permission_id_idx" ON "public"."department_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_permissions_department_id_permission_id_key" ON "public"."department_permissions"("department_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_definitions_name_key" ON "public"."role_definitions"("name");

-- CreateIndex
CREATE INDEX "role_definitions_name_idx" ON "public"."role_definitions"("name");

-- CreateIndex
CREATE INDEX "role_definitions_is_active_idx" ON "public"."role_definitions"("is_active");

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auth_credentials" ADD CONSTRAINT "auth_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."merchants" ADD CONSTRAINT "merchants_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_user_role_id_fkey" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_positions" ADD CONSTRAINT "admin_positions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_positions" ADD CONSTRAINT "admin_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_permissions" ADD CONSTRAINT "department_permissions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_permissions" ADD CONSTRAINT "department_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
