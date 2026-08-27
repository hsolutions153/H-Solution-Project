


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."device_type_enum" AS ENUM (
    'WHEELCHAIR',
    'SCOOTER'
);


ALTER TYPE "public"."device_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."issue_type_enum" AS ENUM (
    'BATTERY',
    'MOTOR',
    'TIRE',
    'BRAKE',
    'OTHER'
);


ALTER TYPE "public"."issue_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."item_type_enum" AS ENUM (
    'SPARE_PART',
    'LABOR',
    'SERVICE'
);


ALTER TYPE "public"."item_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."kyc_status_enum" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."kyc_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."quote_status_enum" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);


ALTER TYPE "public"."quote_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."repair_status_enum" AS ENUM (
    'PENDING',
    'ASSIGNED',
    'ACCEPTED',
    'ARRIVED',
    'DIAGNOSED',
    'REPAIRING',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."repair_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."severity_enum" AS ENUM (
    'MINOR',
    'MAJOR'
);


ALTER TYPE "public"."severity_enum" OWNER TO "postgres";


CREATE TYPE "public"."skills_enum" AS ENUM (
    'WHEELCHAIR',
    'SCOOTER',
    'BOTH'
);


ALTER TYPE "public"."skills_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" character varying(10) NOT NULL,
    "user_id" character varying(10),
    "action" character varying(50) NOT NULL,
    "entity_type" character varying(100) NOT NULL,
    "entity_id" character varying(10),
    "old_data" "jsonb",
    "new_data" "jsonb",
    "description" "text",
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_audit_action" CHECK ((("action")::"text" = ANY ((ARRAY['LOGIN'::character varying, 'LOGOUT'::character varying, 'CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'APPROVE'::character varying, 'REJECT'::character varying, 'ASSIGN'::character varying, 'ACCEPT'::character varying, 'CANCEL'::character varying, 'PAYMENT'::character varying])::"text"[])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_devices" (
    "id" character varying(10) NOT NULL,
    "customer_id" character varying(10) NOT NULL,
    "device_type" character varying(50) NOT NULL,
    "manufacturer" character varying(100) NOT NULL,
    "model_name" character varying(100) NOT NULL,
    "serial_number" character varying(100),
    "frame_number" character varying(100),
    "image_url" character varying(500),
    "notes" "text",
    "purchase_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_device_type" CHECK ((("device_type")::"text" = ANY ((ARRAY['WHEELCHAIR'::character varying, 'SCOOTER'::character varying])::"text"[])))
);


ALTER TABLE "public"."customer_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otps" (
    "id" character varying(10) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "otp_code" character varying(6) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_used" boolean DEFAULT false NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_otp_code" CHECK ((("otp_code")::"text" ~ '^[0-9]{6}$'::"text"))
);


ALTER TABLE "public"."otps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "id" character varying(10) NOT NULL,
    "payment_id" character varying(10) NOT NULL,
    "action" character varying(30) NOT NULL,
    "old_status" character varying(30),
    "new_status" character varying(30),
    "amount" numeric(12,0),
    "transaction_code" character varying(100),
    "changed_by" character varying(10),
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_payment_history_action" CHECK ((("action")::"text" = ANY ((ARRAY['CREATED'::character varying, 'PAYMENT_PENDING'::character varying, 'PAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying, 'CANCELLED'::character varying])::"text"[]))),
    CONSTRAINT "chk_payment_history_amount" CHECK ((("amount" IS NULL) OR ("amount" >= (0)::numeric)))
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" character varying(10) NOT NULL,
    "repair_id" character varying(10) NOT NULL,
    "payment_code" character varying(30) NOT NULL,
    "amount" numeric(12,0) NOT NULL,
    "currency" character varying(3) DEFAULT 'VND'::character varying NOT NULL,
    "payment_method" character varying(50) NOT NULL,
    "payment_status" character varying(30) DEFAULT 'UNPAID'::character varying NOT NULL,
    "transaction_code" character varying(100),
    "failure_reason" "text",
    "paid_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_currency" CHECK ((("currency")::"text" = ANY ((ARRAY['VND'::character varying, 'USD'::character varying])::"text"[]))),
    CONSTRAINT "chk_payment_amount" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "chk_payment_method" CHECK ((("payment_method")::"text" = ANY ((ARRAY['CASH'::character varying, 'BANK_TRANSFER'::character varying])::"text"[]))),
    CONSTRAINT "chk_payment_status" CHECK ((("payment_status")::"text" = ANY ((ARRAY['UNPAID'::character varying, 'PENDING'::character varying, 'PAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_history" (
    "id" character varying(10) NOT NULL,
    "quote_id" character varying(10) NOT NULL,
    "action" character varying(30) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" character varying(10) NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_quote_history_action" CHECK ((("action")::"text" = ANY ((ARRAY['CREATED'::character varying, 'UPDATED'::character varying, 'SENT'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying])::"text"[])))
);


ALTER TABLE "public"."quote_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" character varying(10) NOT NULL,
    "quote_id" character varying(10) NOT NULL,
    "item_name" character varying(200) NOT NULL,
    "item_type" character varying(50) NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit_price" numeric(12,0) DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_quote_item_price" CHECK (("unit_price" >= (0)::numeric)),
    CONSTRAINT "chk_quote_item_quantity" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "chk_quote_item_type" CHECK ((("item_type")::"text" = ANY ((ARRAY['SPARE_PART'::character varying, 'LABOR'::character varying, 'SERVICE'::character varying])::"text"[])))
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refresh_tokens" (
    "id" character varying(10) NOT NULL,
    "user_id" character varying(10) NOT NULL,
    "token_hash" character varying(500) NOT NULL,
    "device_id" character varying(255),
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL
);


ALTER TABLE "public"."refresh_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_quote_items" (
    "id" character varying(10) NOT NULL,
    "quote_id" character varying(10) NOT NULL,
    "item_name" character varying(200) NOT NULL,
    "item_type" "public"."item_type_enum" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "unit_price" numeric(12,0) DEFAULT 0 NOT NULL,
    "subtotal" numeric(12,0) DEFAULT 0,
    "note" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."repair_quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_quotes" (
    "id" character varying(10) NOT NULL,
    "repair_id" character varying(10) NOT NULL,
    "diagnosis_note" "text" NOT NULL,
    "severity" character varying(50) NOT NULL,
    "labor_fee" numeric(12,0) DEFAULT 0 NOT NULL,
    "parts_cost" numeric(12,0) DEFAULT 0 NOT NULL,
    "estimated_price" numeric(12,0) DEFAULT 0 NOT NULL,
    "status" character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    "reject_reason" "text",
    "replied_by" character varying(10),
    "replied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_estimated_price" CHECK (("estimated_price" >= (0)::numeric)),
    CONSTRAINT "chk_labor_fee" CHECK (("labor_fee" >= (0)::numeric)),
    CONSTRAINT "chk_parts_cost" CHECK (("parts_cost" >= (0)::numeric)),
    CONSTRAINT "chk_quote_severity" CHECK ((("severity")::"text" = ANY ((ARRAY['MINOR'::character varying, 'MAJOR'::character varying])::"text"[]))),
    CONSTRAINT "chk_quote_status" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying])::"text"[])))
);


ALTER TABLE "public"."repair_quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_requests" (
    "id" character varying(10) NOT NULL,
    "request_code" character varying(20) NOT NULL,
    "customer_id" character varying(10) NOT NULL,
    "technician_id" character varying(10),
    "device_id" character varying(10) NOT NULL,
    "issue_type" character varying(50) NOT NULL,
    "issue_description" "text" NOT NULL,
    "location_address" character varying(255) NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "is_sos" boolean DEFAULT false NOT NULL,
    "status" character varying(50) DEFAULT 'REQUESTED'::character varying NOT NULL,
    "assigned_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "arrived_at" timestamp with time zone,
    "diagnosed_at" timestamp with time zone,
    "repairing_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancel_reason" "text",
    "total_amount" numeric(12,0),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_issue_type" CHECK ((("issue_type")::"text" = ANY ((ARRAY['BATTERY'::character varying, 'MOTOR'::character varying, 'TIRE'::character varying, 'BRAKE'::character varying, 'OTHER'::character varying])::"text"[]))),
    CONSTRAINT "chk_latitude" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "chk_longitude" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric)))),
    CONSTRAINT "chk_repair_amount" CHECK ((("total_amount" IS NULL) OR ("total_amount" >= (0)::numeric))),
    CONSTRAINT "chk_repair_status" CHECK ((("status")::"text" = ANY ((ARRAY['REQUESTED'::character varying, 'CONFIRMED'::character varying, 'ASSIGNED'::character varying, 'ACCEPTED'::character varying, 'EN_ROUTE'::character varying, 'ARRIVED'::character varying, 'DIAGNOSING'::character varying, 'ESTIMATE_SUBMITTED'::character varying, 'WAITING_FOR_APPROVAL'::character varying, 'ESTIMATE_APPROVED'::character varying, 'ESTIMATE_REJECTED'::character varying, 'REPAIRING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."repair_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_requests_history" (
    "id" character varying(10) NOT NULL,
    "repair_id" character varying(10) NOT NULL,
    "status" character varying(50) NOT NULL,
    "changed_by" character varying(10) NOT NULL,
    "note" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_repair_history_status" CHECK ((("status")::"text" = ANY ((ARRAY['REQUESTED'::character varying, 'CONFIRMED'::character varying, 'ASSIGNED'::character varying, 'ACCEPTED'::character varying, 'EN_ROUTE'::character varying, 'ARRIVED'::character varying, 'DIAGNOSING'::character varying, 'ESTIMATE_SUBMITTED'::character varying, 'WAITING_FOR_APPROVAL'::character varying, 'ESTIMATE_APPROVED'::character varying, 'ESTIMATE_REJECTED'::character varying, 'REPAIRING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::"text"[])))
);


ALTER TABLE "public"."repair_requests_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_requests_images" (
    "id" character varying(10) NOT NULL,
    "repair_id" character varying(10) NOT NULL,
    "image_url" character varying(500) NOT NULL,
    "image_type" character varying(30) NOT NULL,
    "description" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_repair_image_type" CHECK ((("image_type")::"text" = ANY ((ARRAY['BEFORE_REPAIR'::character varying, 'AFTER_REPAIR'::character varying])::"text"[])))
);


ALTER TABLE "public"."repair_requests_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_reviews" (
    "id" character varying(10) NOT NULL,
    "repair_id" character varying(10) NOT NULL,
    "customer_id" character varying(10) NOT NULL,
    "technician_id" character varying(10) NOT NULL,
    "rating" numeric(3,2) NOT NULL,
    "comment" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."repair_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" character varying(10) NOT NULL,
    "repair_id" character varying(10) NOT NULL,
    "customer_id" character varying(10) NOT NULL,
    "technician_id" character varying(10) NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_review_rating" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" character varying(10) NOT NULL,
    "code" character varying(100) NOT NULL,
    "name" character varying(150) NOT NULL,
    "description" character varying(255)
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_profile_history" (
    "id" character varying(10) NOT NULL,
    "technician_id" character varying(10) NOT NULL,
    "action" character varying(30) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" character varying(10) NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_technician_history_action" CHECK ((("action")::"text" = ANY ((ARRAY['CREATED'::character varying, 'UPDATED'::character varying, 'KYC_SUBMITTED'::character varying, 'KYC_APPROVED'::character varying, 'KYC_REJECTED'::character varying])::"text"[])))
);


ALTER TABLE "public"."technician_profile_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."technician_profiles" (
    "user_id" character varying(10) NOT NULL,
    "id_card_number" character varying(12) NOT NULL,
    "id_card_front" character varying(500) NOT NULL,
    "id_card_back" character varying(500) NOT NULL,
    "certificate_img" character varying(500) NOT NULL,
    "skills" character varying(50) DEFAULT 'BOTH'::character varying NOT NULL,
    "specialization" character varying(255),
    "experience_years" smallint DEFAULT 0 NOT NULL,
    "kyc_status" character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    "kyc_reviewed_by" character varying(10),
    "kyc_reviewed_at" timestamp with time zone,
    "kyc_note" "text",
    "is_online" boolean DEFAULT false NOT NULL,
    "last_latitude" numeric(10,8),
    "last_longitude" numeric(11,8),
    "last_location_at" timestamp with time zone,
    "rating_avg" numeric(3,2) DEFAULT 0.00 NOT NULL,
    "total_jobs_done" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    CONSTRAINT "chk_experience_years" CHECK (("experience_years" >= 0)),
    CONSTRAINT "chk_latitude" CHECK ((("last_latitude" IS NULL) OR (("last_latitude" >= ('-90'::integer)::numeric) AND ("last_latitude" <= (90)::numeric)))),
    CONSTRAINT "chk_longitude" CHECK ((("last_longitude" IS NULL) OR (("last_longitude" >= ('-180'::integer)::numeric) AND ("last_longitude" <= (180)::numeric)))),
    CONSTRAINT "chk_rating_avg" CHECK ((("rating_avg" >= (0)::numeric) AND ("rating_avg" <= (5)::numeric))),
    CONSTRAINT "chk_technician_skills" CHECK ((("skills")::"text" = ANY ((ARRAY['WHEELCHAIR'::character varying, 'SCOOTER'::character varying, 'BOTH'::character varying])::"text"[]))),
    CONSTRAINT "chk_total_jobs_done" CHECK (("total_jobs_done" >= 0))
);


ALTER TABLE "public"."technician_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" character varying(10) NOT NULL,
    "role_id" character varying(10) NOT NULL,
    "full_name" character varying(100) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "email" character varying(150) NOT NULL,
    "password_hash" character varying(255),
    "address" character varying(255),
    "is_active" boolean DEFAULT true NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL,
    "locked_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" character varying(20) DEFAULT 'SYSTEM'::character varying NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_devices"
    ADD CONSTRAINT "customer_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otps"
    ADD CONSTRAINT "otps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_code_key" UNIQUE ("payment_code");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_repair_id_key" UNIQUE ("repair_id");



ALTER TABLE ONLY "public"."quote_history"
    ADD CONSTRAINT "quote_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_quote_items"
    ADD CONSTRAINT "repair_quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_quotes"
    ADD CONSTRAINT "repair_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_requests_history"
    ADD CONSTRAINT "repair_requests_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_requests_images"
    ADD CONSTRAINT "repair_requests_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_requests"
    ADD CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_requests"
    ADD CONSTRAINT "repair_requests_request_code_key" UNIQUE ("request_code");



ALTER TABLE ONLY "public"."repair_reviews"
    ADD CONSTRAINT "repair_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_repair_id_key" UNIQUE ("repair_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_profile_history"
    ADD CONSTRAINT "technician_profile_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."technician_profiles"
    ADD CONSTRAINT "technician_profiles_id_card_number_key" UNIQUE ("id_card_number");



ALTER TABLE ONLY "public"."technician_profiles"
    ADD CONSTRAINT "technician_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action", "created_at");



CREATE INDEX "idx_audit_logs_created" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_customer_devices_customer" ON "public"."customer_devices" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_devices_serial" ON "public"."customer_devices" USING "btree" ("serial_number");



CREATE INDEX "idx_customer_devices_type" ON "public"."customer_devices" USING "btree" ("device_type");



CREATE INDEX "idx_otps_phone_active" ON "public"."otps" USING "btree" ("phone", "is_used", "expires_at");



CREATE INDEX "idx_otps_phone_created" ON "public"."otps" USING "btree" ("phone", "created_at");



CREATE INDEX "idx_payment_history_action" ON "public"."payment_history" USING "btree" ("action", "created_at");



CREATE INDEX "idx_payment_history_changed_by" ON "public"."payment_history" USING "btree" ("changed_by", "created_at");



CREATE INDEX "idx_payment_history_payment" ON "public"."payment_history" USING "btree" ("payment_id", "created_at");



CREATE INDEX "idx_payments_created" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "idx_payments_method" ON "public"."payments" USING "btree" ("payment_method");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("payment_status");



CREATE INDEX "idx_payments_transaction" ON "public"."payments" USING "btree" ("transaction_code");



CREATE INDEX "idx_quote_history_action" ON "public"."quote_history" USING "btree" ("action", "created_at");



CREATE INDEX "idx_quote_history_changed_by" ON "public"."quote_history" USING "btree" ("changed_by", "created_at");



CREATE INDEX "idx_quote_history_quote" ON "public"."quote_history" USING "btree" ("quote_id", "created_at");



CREATE INDEX "idx_quote_items_quote" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_refresh_tokens_expires" ON "public"."refresh_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_refresh_tokens_revoked" ON "public"."refresh_tokens" USING "btree" ("revoked_at");



CREATE INDEX "idx_refresh_tokens_user" ON "public"."refresh_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_repair_history_repair" ON "public"."repair_requests_history" USING "btree" ("repair_id", "changed_at");



CREATE INDEX "idx_repair_history_status" ON "public"."repair_requests_history" USING "btree" ("status", "changed_at");



CREATE INDEX "idx_repair_images_repair" ON "public"."repair_requests_images" USING "btree" ("repair_id");



CREATE INDEX "idx_repair_images_type" ON "public"."repair_requests_images" USING "btree" ("repair_id", "image_type");



CREATE INDEX "idx_repair_quotes_repair" ON "public"."repair_quotes" USING "btree" ("repair_id");



CREATE INDEX "idx_repair_quotes_status" ON "public"."repair_quotes" USING "btree" ("status");



CREATE INDEX "idx_repair_requests_created" ON "public"."repair_requests" USING "btree" ("created_at");



CREATE INDEX "idx_repair_requests_customer" ON "public"."repair_requests" USING "btree" ("customer_id", "status");



CREATE INDEX "idx_repair_requests_sos" ON "public"."repair_requests" USING "btree" ("is_sos", "status");



CREATE INDEX "idx_repair_requests_status" ON "public"."repair_requests" USING "btree" ("status");



CREATE INDEX "idx_repair_requests_technician" ON "public"."repair_requests" USING "btree" ("technician_id", "status");



CREATE INDEX "idx_reviews_customer" ON "public"."reviews" USING "btree" ("customer_id");



CREATE INDEX "idx_reviews_rating" ON "public"."reviews" USING "btree" ("rating");



CREATE INDEX "idx_reviews_technician" ON "public"."reviews" USING "btree" ("technician_id");



CREATE INDEX "idx_technician_available" ON "public"."technician_profiles" USING "btree" ("is_online", "kyc_status");



CREATE INDEX "idx_technician_profile_history" ON "public"."technician_profile_history" USING "btree" ("technician_id", "created_at");



CREATE INDEX "idx_technician_profile_history_action" ON "public"."technician_profile_history" USING "btree" ("action", "created_at");



CREATE INDEX "idx_technician_rating" ON "public"."technician_profiles" USING "btree" ("rating_avg" DESC);



CREATE INDEX "idx_users_active" ON "public"."users" USING "btree" ("is_active");



CREATE INDEX "idx_users_online" ON "public"."users" USING "btree" ("is_online");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role_id");



CREATE OR REPLACE TRIGGER "set_updated_at_repair_quote_items" BEFORE UPDATE ON "public"."repair_quote_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_repair_reviews" BEFORE UPDATE ON "public"."repair_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "fk_audit_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customer_devices"
    ADD CONSTRAINT "fk_customer_devices_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "fk_payment_history_payment" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "fk_payment_history_user" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payment_repair" FOREIGN KEY ("repair_id") REFERENCES "public"."repair_requests"("id");



ALTER TABLE ONLY "public"."quote_history"
    ADD CONSTRAINT "fk_quote_history_quote" FOREIGN KEY ("quote_id") REFERENCES "public"."repair_quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_history"
    ADD CONSTRAINT "fk_quote_history_user" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "fk_quote_items_quote" FOREIGN KEY ("quote_id") REFERENCES "public"."repair_quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_quotes"
    ADD CONSTRAINT "fk_quote_repair" FOREIGN KEY ("repair_id") REFERENCES "public"."repair_requests"("id");



ALTER TABLE ONLY "public"."repair_quotes"
    ADD CONSTRAINT "fk_quote_replied_by" FOREIGN KEY ("replied_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."refresh_tokens"
    ADD CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."repair_requests"
    ADD CONSTRAINT "fk_repair_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."repair_requests"
    ADD CONSTRAINT "fk_repair_device" FOREIGN KEY ("device_id") REFERENCES "public"."customer_devices"("id");



ALTER TABLE ONLY "public"."repair_requests_history"
    ADD CONSTRAINT "fk_repair_history_repair" FOREIGN KEY ("repair_id") REFERENCES "public"."repair_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_requests_history"
    ADD CONSTRAINT "fk_repair_history_user" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."repair_requests_images"
    ADD CONSTRAINT "fk_repair_images_repair" FOREIGN KEY ("repair_id") REFERENCES "public"."repair_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_requests"
    ADD CONSTRAINT "fk_repair_technician" FOREIGN KEY ("technician_id") REFERENCES "public"."technician_profiles"("user_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_review_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_review_repair" FOREIGN KEY ("repair_id") REFERENCES "public"."repair_requests"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_review_technician" FOREIGN KEY ("technician_id") REFERENCES "public"."technician_profiles"("user_id");



ALTER TABLE ONLY "public"."technician_profile_history"
    ADD CONSTRAINT "fk_technician_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."technician_profile_history"
    ADD CONSTRAINT "fk_technician_history_technician" FOREIGN KEY ("technician_id") REFERENCES "public"."technician_profiles"("user_id");



ALTER TABLE ONLY "public"."technician_profiles"
    ADD CONSTRAINT "fk_technician_kyc_reviewer" FOREIGN KEY ("kyc_reviewed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."technician_profiles"
    ADD CONSTRAINT "fk_technician_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."customer_devices" TO "anon";
GRANT ALL ON TABLE "public"."customer_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_devices" TO "service_role";



GRANT ALL ON TABLE "public"."otps" TO "anon";
GRANT ALL ON TABLE "public"."otps" TO "authenticated";
GRANT ALL ON TABLE "public"."otps" TO "service_role";



GRANT ALL ON TABLE "public"."payment_history" TO "anon";
GRANT ALL ON TABLE "public"."payment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_history" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."quote_history" TO "anon";
GRANT ALL ON TABLE "public"."quote_history" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_history" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."refresh_tokens" TO "anon";
GRANT ALL ON TABLE "public"."refresh_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."refresh_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."repair_quote_items" TO "anon";
GRANT ALL ON TABLE "public"."repair_quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."repair_quotes" TO "anon";
GRANT ALL ON TABLE "public"."repair_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."repair_requests" TO "anon";
GRANT ALL ON TABLE "public"."repair_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_requests" TO "service_role";



GRANT ALL ON TABLE "public"."repair_requests_history" TO "anon";
GRANT ALL ON TABLE "public"."repair_requests_history" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_requests_history" TO "service_role";



GRANT ALL ON TABLE "public"."repair_requests_images" TO "anon";
GRANT ALL ON TABLE "public"."repair_requests_images" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_requests_images" TO "service_role";



GRANT ALL ON TABLE "public"."repair_reviews" TO "anon";
GRANT ALL ON TABLE "public"."repair_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."technician_profile_history" TO "anon";
GRANT ALL ON TABLE "public"."technician_profile_history" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_profile_history" TO "service_role";



GRANT ALL ON TABLE "public"."technician_profiles" TO "anon";
GRANT ALL ON TABLE "public"."technician_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."technician_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







