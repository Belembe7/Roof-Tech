-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADVERTISER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdvertiserType" AS ENUM ('OWNER', 'AGENT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('IDENTITY', 'LISTING_AUTHORIZATION');

-- CreateEnum
CREATE TYPE "VerificationDocumentType" AS ENUM ('IDENTITY_DOCUMENT', 'AUTHORIZATION_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'ROOM', 'ANNEX');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('UNCONFIRMED', 'AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('INCORRECT_INFORMATION', 'POSSIBLE_FRAUD', 'UNAVAILABLE_PROPERTY', 'UNAUTHORIZED_LISTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255),
    "phone" VARCHAR(32),
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertiser_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "advertiser_type" "AdvertiserType" NOT NULL,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "advertiser_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(24) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "advertiser_id" UUID NOT NULL,
    "neighborhood_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "monthly_rent" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2),
    "visit_fee" DECIMAL(12,2),
    "other_initial_cost" DECIMAL(12,2),
    "bedrooms" SMALLINT NOT NULL,
    "bathrooms" SMALLINT NOT NULL,
    "parking_spaces" SMALLINT NOT NULL DEFAULT 0,
    "area_m2" DECIMAL(8,2),
    "moderation_status" "ModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'UNCONFIRMED',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "image_url" VARCHAR(2048) NOT NULL,
    "storage_key" VARCHAR(512),
    "alt_text" VARCHAR(180),
    "display_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_features" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_feature_values" (
    "property_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "value" VARCHAR(160),

    CONSTRAINT "property_feature_values_pkey" PRIMARY KEY ("property_id","feature_id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL,
    "advertiser_id" UUID NOT NULL,
    "verification_type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" UUID NOT NULL,
    "verification_request_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "document_type" "VerificationDocumentType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "reporter_id" UUID,
    "reason" "ReportReason" NOT NULL,
    "description" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_checks" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "confirmed_by" UUID,
    "status" "AvailabilityStatus" NOT NULL,
    "checked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(80) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "advertiser_profiles_user_id_key" ON "advertiser_profiles"("user_id");

-- CreateIndex
CREATE INDEX "advertiser_profiles_verification_status_idx" ON "advertiser_profiles"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_province_key" ON "cities"("name", "province");

-- CreateIndex
CREATE INDEX "neighborhoods_city_id_name_idx" ON "neighborhoods"("city_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "neighborhoods_city_id_slug_key" ON "neighborhoods"("city_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "properties_reference_key" ON "properties"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_moderation_status_availability_status_created_at_idx" ON "properties"("moderation_status", "availability_status", "created_at");

-- CreateIndex
CREATE INDEX "properties_neighborhood_id_property_type_monthly_rent_idx" ON "properties"("neighborhood_id", "property_type", "monthly_rent");

-- CreateIndex
CREATE INDEX "properties_bedrooms_monthly_rent_idx" ON "properties"("bedrooms", "monthly_rent");

-- CreateIndex
CREATE INDEX "properties_is_demo_moderation_status_availability_status_idx" ON "properties"("is_demo", "moderation_status", "availability_status");

-- CreateIndex
CREATE INDEX "property_images_property_id_display_order_idx" ON "property_images"("property_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "property_images_property_id_display_order_key" ON "property_images"("property_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "property_features_name_key" ON "property_features"("name");

-- CreateIndex
CREATE UNIQUE INDEX "property_features_slug_key" ON "property_features"("slug");

-- CreateIndex
CREATE INDEX "property_feature_values_feature_id_property_id_idx" ON "property_feature_values"("feature_id", "property_id");

-- CreateIndex
CREATE INDEX "verification_requests_status_created_at_idx" ON "verification_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_requests_advertiser_id_verification_type_idx" ON "verification_requests"("advertiser_id", "verification_type");

-- CreateIndex
CREATE UNIQUE INDEX "verification_documents_storage_key_key" ON "verification_documents"("storage_key");

-- CreateIndex
CREATE INDEX "verification_documents_verification_request_id_idx" ON "verification_documents"("verification_request_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_property_id_created_at_idx" ON "reports"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "availability_checks_property_id_checked_at_idx" ON "availability_checks"("property_id", "checked_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "advertiser_profiles" ADD CONSTRAINT "advertiser_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertiser_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_feature_values" ADD CONSTRAINT "property_feature_values_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_feature_values" ADD CONSTRAINT "property_feature_values_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "property_features"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertiser_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_checks" ADD CONSTRAINT "availability_checks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_checks" ADD CONSTRAINT "availability_checks_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
