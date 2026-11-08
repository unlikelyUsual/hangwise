-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'companion', 'admin');

-- CreateEnum
CREATE TYPE "companion_status" AS ENUM ('draft', 'listed', 'paused', 'suspended');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('requested', 'accepted', 'hold', 'expired', 'declined', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "fee_policy" AS ENUM ('unknown', 'configured');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('unavailable', 'not_started', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('not_started', 'pending', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('not_configured', 'pending', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('unavailable', 'not_started', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "report_category" AS ENUM ('policy', 'safety', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_private_profiles" (
    "user_id" UUID NOT NULL,
    "phone_e164" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "country_code" VARCHAR(2),
    "terms_accepted_at" TIMESTAMPTZ(6),
    "privacy_accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_private_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "companion_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_name" TEXT NOT NULL,
    "age_years" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "status" "companion_status" NOT NULL DEFAULT 'draft',
    "hourly_rate_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "languages" TEXT[],
    "boundaries" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companion_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" UUID NOT NULL,
    "companion_profile_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "companion_profile_id" UUID NOT NULL,
    "venue_name" TEXT NOT NULL,
    "venue_area" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'requested',
    "price_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "platform_fee_minor" INTEGER,
    "fee_policy" "fee_policy" NOT NULL,
    "customer_note" TEXT,
    "hold_expires_at" TIMESTAMPTZ(6),
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "cancelled_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "booking_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'unavailable',
    "provider" TEXT NOT NULL DEFAULT 'unconfigured',
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "external_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'not_started',
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "external_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "companion_profile_id" UUID NOT NULL,
    "status" "payout_status" NOT NULL DEFAULT 'not_configured',
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "external_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_references" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'unconfigured',
    "status" "verification_status" NOT NULL DEFAULT 'unavailable',
    "external_reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "payload_sha256" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "subject_user_id" UUID,
    "booking_id" UUID,
    "category" "report_category" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_user_id" UUID NOT NULL,
    "blocked_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_user_id","blocked_user_id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "monitored" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companion_profiles_user_id_key" ON "companion_profiles"("user_id");

-- CreateIndex
CREATE INDEX "companion_profiles_status_city_idx" ON "companion_profiles"("status", "city");

-- CreateIndex
CREATE INDEX "availability_companion_profile_id_starts_at_idx" ON "availability"("companion_profile_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_customer_id_created_at_idx" ON "bookings"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_companion_profile_id_status_idx" ON "bookings"("companion_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_actor_user_id_idempotency_key_key" ON "idempotency_records"("actor_user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_booking_id_key" ON "conversations"("booking_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "verification_references_user_id_idx" ON "verification_references"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_external_event_id_key" ON "webhook_events"("provider", "external_event_id");

-- CreateIndex
CREATE INDEX "check_ins_booking_id_idx" ON "check_ins"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_author_user_id_key" ON "reviews"("booking_id", "author_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_private_profiles" ADD CONSTRAINT "user_private_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companion_profiles" ADD CONSTRAINT "companion_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_companion_profile_id_fkey" FOREIGN KEY ("companion_profile_id") REFERENCES "companion_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_companion_profile_id_fkey" FOREIGN KEY ("companion_profile_id") REFERENCES "companion_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_companion_profile_id_fkey" FOREIGN KEY ("companion_profile_id") REFERENCES "companion_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_references" ADD CONSTRAINT "verification_references_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
