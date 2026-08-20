set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on sequences from "service_role";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "anon";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "authenticated";

alter default privileges for role "postgres" in schema "public" revoke all on tables from "service_role";

create table "public"."audit_logs" (
  "id"          character varying(10)    not null,
  "user_id"     character varying(10),
  "action"      character varying(50)    not null,
  "entity_type" character varying(100)   not null,
  "entity_id"   character varying(10),
  "old_data"    jsonb,
  "new_data"    jsonb,
  "description" text,
  "ip_address"  character varying(45),
  "user_agent"  text,
  "created_at"  timestamp with time zone not null default now(),
  constraint "audit_logs_pkey" primary key (id),
  constraint "chk_audit_action"
    check
    (((action)::text = ANY ((ARRAY['LOGIN'::character varying, 'LOGOUT'::character varying, 'CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying,
    'APPROVE'::character varying,
    'REJECT'::character varying, 'ASSIGN'::character varying, 'ACCEPT'::character varying, 'CANCEL'::character varying, 'PAYMENT'::character varying])::text[])))
);

alter table "public"."audit_logs"
  enable row level security;

create table "public"."customer_devices" (
  "id"            character varying(10)    not null,
  "customer_id"   character varying(10)    not null,
  "device_type"   character varying(50)    not null,
  "manufacturer"  character varying(100)   not null,
  "model_name"    character varying(100)   not null,
  "serial_number" character varying(100),
  "frame_number"  character varying(100),
  "image_url"     character varying(500),
  "notes"         text,
  "purchase_date" date,
  "created_at"    timestamp with time zone not null default now(),
  "created_by"    character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"    timestamp with time zone not null default now(),
  "updated_by"    character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_device_type" check (((device_type)::text = ANY ((ARRAY['WHEELCHAIR'::character varying, 'SCOOTER'::character varying])::text[]))),
  constraint "customer_devices_pkey" primary key (id)
);

alter table "public"."customer_devices"
  enable row level security;

create table "public"."otps" (
  "id"         character varying(10)    not null,
  "phone"      character varying(20)    not null,
  "otp_code"   character varying(6)     not null,
  "expires_at" timestamp with time zone not null,
  "is_used"    boolean                  not null default false,
  "used_at"    timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  constraint "chk_otp_code" check (((otp_code)::text ~ '^[0-9]{6}$'::text)),
  constraint "otps_pkey" primary key (id)
);

alter table "public"."otps"
  enable row level security;

create table "public"."payment_history" (
  "id"               character varying(10)    not null,
  "payment_id"       character varying(10)    not null,
  "action"           character varying(30)    not null,
  "old_status"       character varying(30),
  "new_status"       character varying(30),
  "amount"           numeric(12,0),
  "transaction_code" character varying(100),
  "changed_by"       character varying(10),
  "note"             text,
  "created_at"       timestamp with time zone not null default now(),
  constraint "chk_payment_history_action"
    check
    (((action)::text = ANY ((ARRAY['CREATED'::character varying, 'PAYMENT_PENDING'::character varying, 'PAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character
    varying, 'CANCELLED'::character varying])::text[]))),
  constraint "chk_payment_history_amount" check (((amount IS NULL) OR (amount >= (0)::numeric))),
  constraint "payment_history_pkey" primary key (id)
);

alter table "public"."payment_history"
  enable row level security;

create table "public"."payments" (
  "id"               character varying(10)    not null,
  "repair_id"        character varying(10)    not null,
  "payment_code"     character varying(30)    not null,
  "amount"           numeric(12,0)            not null,
  "currency"         character varying(3)     not null default 'VND'::character varying,
  "payment_method"   character varying(50)    not null,
  "payment_status"   character varying(30)    not null default 'UNPAID'::character varying,
  "transaction_code" character varying(100),
  "failure_reason"   text,
  "paid_at"          timestamp with time zone,
  "note"             text,
  "created_at"       timestamp with time zone not null default now(),
  "created_by"       character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"       timestamp with time zone not null default now(),
  "updated_by"       character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_currency" check (((currency)::text = ANY ((ARRAY['VND'::character varying, 'USD'::character varying])::text[]))),
  constraint "chk_payment_amount" check ((amount >= (0)::numeric)),
  constraint "chk_payment_method" check (((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'BANK_TRANSFER'::character varying])::text[]))),
  constraint "chk_payment_status"
    check
    (((payment_status)::text = ANY ((ARRAY['UNPAID'::character varying, 'PENDING'::character varying, 'PAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character
    varying, 'CANCELLED'::character varying])::text[]))),
  constraint "payments_payment_code_key" unique (payment_code),
  constraint "payments_pkey" primary key (id),
  constraint "payments_repair_id_key" unique (repair_id)
);

alter table "public"."payments"
  enable row level security;

create table "public"."quote_history" (
  "id"         character varying(10)    not null,
  "quote_id"   character varying(10)    not null,
  "action"     character varying(30)    not null,
  "old_data"   jsonb,
  "new_data"   jsonb,
  "changed_by" character varying(10)    not null,
  "note"       text,
  "created_at" timestamp with time zone not null default now(),
  constraint "chk_quote_history_action"
    check
    (((action)::text = ANY ((ARRAY['CREATED'::character varying, 'UPDATED'::character varying, 'SENT'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character
    varying])::text[]))),
  constraint "quote_history_pkey" primary key (id)
);

alter table "public"."quote_history"
  enable row level security;

create table "public"."quote_items" (
  "id"         character varying(10)    not null,
  "quote_id"   character varying(10)    not null,
  "item_name"  character varying(200)   not null,
  "item_type"  character varying(50)    not null,
  "quantity"   numeric(10,2)            not null default 1,
  "unit_price" numeric(12,0)            not null default 0,
  "note"       text,
  "created_at" timestamp with time zone not null default now(),
  "created_by" character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at" timestamp with time zone not null default now(),
  "updated_by" character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_quote_item_price" check ((unit_price >= (0)::numeric)),
  constraint "chk_quote_item_quantity" check ((quantity > (0)::numeric)),
  constraint "chk_quote_item_type" check (((item_type)::text = ANY ((ARRAY['SPARE_PART'::character varying, 'LABOR'::character varying, 'SERVICE'::character varying])::text[]))),
  constraint "quote_items_pkey" primary key (id)
);

alter table "public"."quote_items"
  enable row level security;

create table "public"."refresh_tokens" (
  "id"         character varying(10)    not null,
  "user_id"    character varying(10)    not null,
  "token_hash" character varying(500)   not null,
  "device_id"  character varying(255),
  "expires_at" timestamp with time zone not null,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "created_by" character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at" timestamp with time zone not null default now(),
  "updated_by" character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "refresh_tokens_pkey" primary key (id)
);

alter table "public"."refresh_tokens"
  enable row level security;

create table "public"."repair_quote_items" (
  "id"         character varying(10)       not null,
  "quote_id"   character varying(10)       not null,
  "item_name"  character varying(200)      not null,
  "quantity"   numeric(10,2)               default 1,
  "unit_price" numeric(12,0)               not null default 0,
  "subtotal"   numeric(12,0)               default 0,
  "note"       text,
  "created_at" timestamp without time zone not null default current_timestamp,
  "updated_at" timestamp without time zone not null default current_timestamp,
  constraint "repair_quote_items_pkey" primary key (id)
);

create table "public"."repair_quotes" (
  "id"              character varying(10)    not null,
  "repair_id"       character varying(10)    not null,
  "diagnosis_note"  text                     not null,
  "severity"        character varying(50)    not null,
  "labor_fee"       numeric(12,0)            not null default 0,
  "parts_cost"      numeric(12,0)            not null default 0,
  "estimated_price" numeric(12,0)            not null default 0,
  "status"          character varying(50)    not null default 'PENDING'::character varying,
  "reject_reason"   text,
  "replied_by"      character varying(10),
  "replied_at"      timestamp with time zone,
  "created_at"      timestamp with time zone not null default now(),
  "created_by"      character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"      timestamp with time zone not null default now(),
  "updated_by"      character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_estimated_price" check ((estimated_price >= (0)::numeric)),
  constraint "chk_labor_fee" check ((labor_fee >= (0)::numeric)),
  constraint "chk_parts_cost" check ((parts_cost >= (0)::numeric)),
  constraint "chk_quote_severity" check (((severity)::text = ANY ((ARRAY['MINOR'::character varying, 'MAJOR'::character varying])::text[]))),
  constraint "chk_quote_status" check (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying])::text[]))),
  constraint "repair_quotes_pkey" primary key (id)
);

alter table "public"."repair_quotes"
  enable row level security;

create table "public"."repair_requests_history" (
  "id"         character varying(10)    not null,
  "repair_id"  character varying(10)    not null,
  "status"     character varying(50)    not null,
  "changed_by" character varying(10)    not null,
  "note"       text,
  "changed_at" timestamp with time zone not null default now(),
  constraint "chk_repair_history_status"
    check
    (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ASSIGNED'::character varying, 'ACCEPTED'::character varying, 'ARRIVED'::character varying, 'DIAGNOSED'::character
    varying, 'REPAIRING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))),
  constraint "repair_requests_history_pkey" primary key (id)
);

alter table "public"."repair_requests_history"
  enable row level security;

create table "public"."repair_requests_images" (
  "id"          character varying(10)    not null,
  "repair_id"   character varying(10)    not null,
  "image_url"   character varying(500)   not null,
  "image_type"  character varying(30)    not null,
  "description" character varying(255),
  "created_at"  timestamp with time zone not null default now(),
  "created_by"  character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_repair_image_type" check (((image_type)::text = ANY ((ARRAY['BEFORE_REPAIR'::character varying, 'AFTER_REPAIR'::character varying])::text[]))),
  constraint "repair_requests_images_pkey" primary key (id)
);

alter table "public"."repair_requests_images"
  enable row level security;

create table "public"."repair_requests" (
  "id"                character varying(10)    not null,
  "request_code"      character varying(20)    not null,
  "customer_id"       character varying(10)    not null,
  "technician_id"     character varying(10),
  "device_id"         character varying(10)    not null,
  "issue_type"        character varying(50)    not null,
  "issue_description" text                     not null,
  "location_address"  character varying(255)   not null,
  "latitude"          numeric(10,8),
  "longitude"         numeric(11,8),
  "is_sos"            boolean                  not null default false,
  "status"            character varying(50)    not null default 'PENDING'::character varying,
  "assigned_at"       timestamp with time zone,
  "accepted_at"       timestamp with time zone,
  "arrived_at"        timestamp with time zone,
  "diagnosed_at"      timestamp with time zone,
  "repairing_at"      timestamp with time zone,
  "completed_at"      timestamp with time zone,
  "cancelled_at"      timestamp with time zone,
  "cancel_reason"     text,
  "total_amount"      numeric(12,0),
  "created_at"        timestamp with time zone not null default now(),
  "created_by"        character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"        timestamp with time zone not null default now(),
  "updated_by"        character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_issue_type"
    check
    (((issue_type)::text = ANY ((ARRAY['BATTERY'::character varying, 'MOTOR'::character varying, 'TIRE'::character varying, 'BRAKE'::character varying, 'OTHER'::character
    varying])::text[]))),
  constraint "chk_latitude" check (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
  constraint "chk_longitude" check (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))),
  constraint "chk_repair_amount" check (((total_amount IS NULL) OR (total_amount >= (0)::numeric))),
  constraint "chk_repair_status"
    check
    (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ASSIGNED'::character varying, 'ACCEPTED'::character varying, 'ARRIVED'::character varying, 'DIAGNOSED'::character
    varying, 'REPAIRING'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))),
  constraint "repair_requests_pkey" primary key (id),
  constraint "repair_requests_request_code_key" unique (request_code)
);

alter table "public"."repair_requests"
  enable row level security;

create table "public"."repair_reviews" (
  "id"            character varying(10)       not null,
  "repair_id"     character varying(10)       not null,
  "customer_id"   character varying(10)       not null,
  "technician_id" character varying(10)       not null,
  "rating"        numeric(3,2)                not null,
  "comment"       text,
  "created_at"    timestamp without time zone not null default current_timestamp,
  "updated_at"    timestamp without time zone not null default current_timestamp,
  constraint "repair_reviews_pkey" primary key (id)
);

create table "public"."reviews" (
  "id"            character varying(10)    not null,
  "repair_id"     character varying(10)    not null,
  "customer_id"   character varying(10)    not null,
  "technician_id" character varying(10)    not null,
  "rating"        smallint                 not null,
  "comment"       text,
  "created_at"    timestamp with time zone not null default now(),
  "created_by"    character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"    timestamp with time zone not null default now(),
  "updated_by"    character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_review_rating" check (((rating >= 1) AND (rating <= 5))),
  constraint "reviews_pkey" primary key (id),
  constraint "reviews_repair_id_key" unique (repair_id)
);

alter table "public"."reviews"
  enable row level security;

create table "public"."roles" (
  "id"          character varying(10)  not null,
  "code"        character varying(100) not null,
  "name"        character varying(150) not null,
  "description" character varying(255),
  constraint "roles_code_key" unique (code),
  constraint "roles_pkey" primary key (id)
);

alter table "public"."roles"
  enable row level security;

create table "public"."technician_profile_history" (
  "id"            character varying(10)    not null,
  "technician_id" character varying(10)    not null,
  "action"        character varying(30)    not null,
  "old_data"      jsonb,
  "new_data"      jsonb,
  "changed_by"    character varying(10)    not null,
  "note"          text,
  "created_at"    timestamp with time zone not null default now(),
  constraint "chk_technician_history_action"
    check
    (((action)::text = ANY ((ARRAY['CREATED'::character varying, 'UPDATED'::character varying, 'KYC_SUBMITTED'::character varying, 'KYC_APPROVED'::character varying,
    'KYC_REJECTED'::character varying])::text[]))),
  constraint "technician_profile_history_pkey" primary key (id)
);

alter table "public"."technician_profile_history"
  enable row level security;

create table "public"."technician_profiles" (
  "user_id"          character varying(10)    not null,
  "id_card_number"   character varying(12)    not null,
  "id_card_front"    character varying(500)   not null,
  "id_card_back"     character varying(500)   not null,
  "certificate_img"  character varying(500)   not null,
  "skills"           character varying(50)    not null default 'BOTH'::character varying,
  "specialization"   character varying(255),
  "experience_years" smallint                 not null default 0,
  "kyc_status"       character varying(50)    not null default 'PENDING'::character varying,
  "kyc_reviewed_by"  character varying(10),
  "kyc_reviewed_at"  timestamp with time zone,
  "kyc_note"         text,
  "is_online"        boolean                  not null default false,
  "last_latitude"    numeric(10,8),
  "last_longitude"   numeric(11,8),
  "last_location_at" timestamp with time zone,
  "rating_avg"       numeric(3,2)             not null default 0.00,
  "total_jobs_done"  integer                  not null default 0,
  "created_at"       timestamp with time zone not null default now(),
  "created_by"       character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"       timestamp with time zone not null default now(),
  "updated_by"       character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "chk_experience_years" check ((experience_years >= 0)),
  constraint "chk_latitude" check (((last_latitude IS NULL) OR ((last_latitude >= ('-90'::integer)::numeric) AND (last_latitude <= (90)::numeric)))),
  constraint "chk_longitude" check (((last_longitude IS NULL) OR ((last_longitude >= ('-180'::integer)::numeric) AND (last_longitude <= (180)::numeric)))),
  constraint "chk_rating_avg" check (((rating_avg >= (0)::numeric) AND (rating_avg <= (5)::numeric))),
  constraint "chk_technician_skills" check (((skills)::text = ANY ((ARRAY['WHEELCHAIR'::character varying, 'SCOOTER'::character varying, 'BOTH'::character varying])::text[]))),
  constraint "chk_total_jobs_done" check ((total_jobs_done >= 0)),
  constraint "technician_profiles_id_card_number_key" unique (id_card_number),
  constraint "technician_profiles_pkey" primary key (user_id)
);

alter table "public"."technician_profiles"
  enable row level security;

create table "public"."users" (
  "id"            character varying(10)    not null,
  "role_id"       character varying(10)    not null,
  "full_name"     character varying(100)   not null,
  "phone"         character varying(20)    not null,
  "email"         character varying(150)   not null,
  "password_hash" character varying(255),
  "address"       character varying(255),
  "is_active"     boolean                  not null default true,
  "is_online"     boolean                  not null default false,
  "locked_reason" text,
  "created_at"    timestamp with time zone not null default now(),
  "created_by"    character varying(20)    not null default 'SYSTEM'::character varying,
  "updated_at"    timestamp with time zone not null default now(),
  "updated_by"    character varying(20)    not null default 'SYSTEM'::character varying,
  constraint "users_email_key" unique (email),
  constraint "users_phone_key" unique (phone),
  constraint "users_pkey" primary key (id)
);

alter table "public"."users"
  enable row level security;

create type "public"."device_type_enum" as enum (
  'WHEELCHAIR',
  'SCOOTER'
);

create type "public"."issue_type_enum" as enum (
  'BATTERY',
  'MOTOR',
  'TIRE',
  'BRAKE',
  'OTHER'
);

create type "public"."item_type_enum" as enum (
  'SPARE_PART',
  'LABOR',
  'SERVICE'
);

alter table "public"."repair_quote_items"
  add column "item_type" public.item_type_enum not null;

create type "public"."kyc_status_enum" as enum (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

create type "public"."quote_status_enum" as enum (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

create type "public"."repair_status_enum" as enum (
  'PENDING',
  'ASSIGNED',
  'ACCEPTED',
  'ARRIVED',
  'DIAGNOSED',
  'REPAIRING',
  'COMPLETED',
  'CANCELLED'
);

create type "public"."severity_enum" as enum (
  'MINOR',
  'MAJOR'
);

create type "public"."skills_enum" as enum (
  'WHEELCHAIR',
  'SCOOTER',
  'BOTH'
);

create or replace function public.update_updated_at_column()
  returns trigger
  language plpgsql
  AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

alter table "public"."payment_history"
  add constraint "fk_payment_history_payment" foreign key (payment_id) references public.payments(id) on delete cascade;

alter table "public"."quote_history"
  add constraint "fk_quote_history_quote" foreign key (quote_id) references public.repair_quotes(id) on delete cascade;

alter table "public"."quote_items"
  add constraint "fk_quote_items_quote" foreign key (quote_id) references public.repair_quotes(id) on delete cascade;

alter table "public"."repair_requests"
  add constraint "fk_repair_device" foreign key (device_id) references public.customer_devices(id);

alter table "public"."payments"
  add constraint "fk_payment_repair" foreign key (repair_id) references public.repair_requests(id);

alter table "public"."repair_quotes"
  add constraint "fk_quote_repair" foreign key (repair_id) references public.repair_requests(id);

alter table "public"."repair_requests_history"
  add constraint "fk_repair_history_repair" foreign key (repair_id) references public.repair_requests(id) on delete cascade;

alter table "public"."repair_requests_images"
  add constraint "fk_repair_images_repair" foreign key (repair_id) references public.repair_requests(id) on delete cascade;

alter table "public"."reviews"
  add constraint "fk_review_repair" foreign key (repair_id) references public.repair_requests(id);

alter table "public"."repair_requests"
  add constraint "fk_repair_technician" foreign key (technician_id) references public.technician_profiles(user_id);

alter table "public"."reviews"
  add constraint "fk_review_technician" foreign key (technician_id) references public.technician_profiles(user_id);

alter table "public"."technician_profile_history"
  add constraint "fk_technician_history_technician" foreign key (technician_id) references public.technician_profiles(user_id);

alter table "public"."users"
  add constraint "fk_users_role" foreign key (role_id) references public.roles(id);

alter table "public"."audit_logs"
  add constraint "fk_audit_user" foreign key (user_id) references public.users(id);

alter table "public"."customer_devices"
  add constraint "fk_customer_devices_customer" foreign key (customer_id) references public.users(id);

alter table "public"."payment_history"
  add constraint "fk_payment_history_user" foreign key (changed_by) references public.users(id);

alter table "public"."quote_history"
  add constraint "fk_quote_history_user" foreign key (changed_by) references public.users(id);

alter table "public"."refresh_tokens"
  add constraint "fk_refresh_tokens_user" foreign key (user_id) references public.users(id);

alter table "public"."repair_quotes"
  add constraint "fk_quote_replied_by" foreign key (replied_by) references public.users(id);

alter table "public"."repair_requests"
  add constraint "fk_repair_customer" foreign key (customer_id) references public.users(id);

alter table "public"."repair_requests_history"
  add constraint "fk_repair_history_user" foreign key (changed_by) references public.users(id);

alter table "public"."reviews"
  add constraint "fk_review_customer" foreign key (customer_id) references public.users(id);

alter table "public"."technician_profile_history"
  add constraint "fk_technician_history_changed_by" foreign key (changed_by) references public.users(id);

alter table "public"."technician_profiles"
  add constraint "fk_technician_kyc_reviewer" foreign key (kyc_reviewed_by) references public.users(id);

alter table "public"."technician_profiles"
  add constraint "fk_technician_user" foreign key (user_id) references public.users(id);

create index idx_audit_logs_action on public.audit_logs using btree (action, created_at);

create index idx_audit_logs_created on public.audit_logs using btree (created_at);

create index idx_audit_logs_entity on public.audit_logs using btree (entity_type, entity_id);

create index idx_audit_logs_user on public.audit_logs using btree (user_id, created_at);

create index idx_customer_devices_customer on public.customer_devices using btree (customer_id);

create index idx_customer_devices_serial on public.customer_devices using btree (serial_number);

create index idx_customer_devices_type on public.customer_devices using btree (device_type);

create index idx_otps_phone_active on public.otps using btree (phone, is_used, expires_at);

create index idx_otps_phone_created on public.otps using btree (phone, created_at);

create index idx_payment_history_action on public.payment_history using btree (action, created_at);

create index idx_payment_history_changed_by on public.payment_history using btree (changed_by, created_at);

create index idx_payment_history_payment on public.payment_history using btree (payment_id, created_at);

create index idx_payments_created on public.payments using btree (created_at);

create index idx_payments_method on public.payments using btree (payment_method);

create index idx_payments_status on public.payments using btree (payment_status);

create index idx_payments_transaction on public.payments using btree (transaction_code);

create index idx_quote_history_action on public.quote_history using btree (action, created_at);

create index idx_quote_history_changed_by on public.quote_history using btree (changed_by, created_at);

create index idx_quote_history_quote on public.quote_history using btree (quote_id, created_at);

create index idx_quote_items_quote on public.quote_items using btree (quote_id);

create index idx_refresh_tokens_expires on public.refresh_tokens using btree (expires_at);

create index idx_refresh_tokens_revoked on public.refresh_tokens using btree (revoked_at);

create index idx_refresh_tokens_user on public.refresh_tokens using btree (user_id);

create index idx_repair_history_repair on public.repair_requests_history using btree (repair_id, changed_at);

create index idx_repair_history_status on public.repair_requests_history using btree (status, changed_at);

create index idx_repair_images_repair on public.repair_requests_images using btree (repair_id);

create index idx_repair_images_type on public.repair_requests_images using btree (repair_id, image_type);

create index idx_repair_quotes_repair on public.repair_quotes using btree (repair_id);

create index idx_repair_quotes_status on public.repair_quotes using btree (status);

create index idx_repair_requests_created on public.repair_requests using btree (created_at);

create index idx_repair_requests_customer on public.repair_requests using btree (customer_id, status);

create index idx_repair_requests_sos on public.repair_requests using btree (is_sos, status);

create index idx_repair_requests_status on public.repair_requests using btree (status);

create index idx_repair_requests_technician on public.repair_requests using btree (technician_id, status);

create index idx_reviews_customer on public.reviews using btree (customer_id);

create index idx_reviews_rating on public.reviews using btree (rating);

create index idx_reviews_technician on public.reviews using btree (technician_id);

create index idx_technician_available on public.technician_profiles using btree (is_online, kyc_status);

create index idx_technician_profile_history_action on public.technician_profile_history using btree (action, created_at);

create index idx_technician_profile_history on public.technician_profile_history using btree (technician_id, created_at);

create index idx_technician_rating on public.technician_profiles using btree (rating_avg desc);

create index idx_users_active on public.users using btree (is_active);

create index idx_users_online on public.users using btree (is_online);

create index idx_users_role on public.users using btree (role_id);

create trigger set_updated_at_repair_quote_items
  before update on public.repair_quote_items
  for each row
  execute function public.update_updated_at_column();

create trigger set_updated_at_repair_reviews
  before update on public.repair_reviews
  for each row
  execute function public.update_updated_at_column();

grant execute on function "public"."update_updated_at_column"() to public, "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."audit_logs" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."customer_devices" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."otps" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."payment_history" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."payments" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quote_history" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."quote_items" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."refresh_tokens" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."repair_quote_items" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."repair_quotes" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."repair_requests" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."repair_requests_history" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."repair_requests_images" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."repair_reviews" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."reviews" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."roles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."technician_profile_history" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."technician_profiles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."users" to "anon", "authenticated", "postgres", "service_role";

grant usage on type "public"."device_type_enum" to "postgres";

grant usage on type "public"."issue_type_enum" to "postgres";

grant usage on type "public"."item_type_enum" to "postgres";

grant usage on type "public"."kyc_status_enum" to "postgres";

grant usage on type "public"."quote_status_enum" to "postgres";

grant usage on type "public"."repair_status_enum" to "postgres";

grant usage on type "public"."severity_enum" to "postgres";

grant usage on type "public"."skills_enum" to "postgres";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "anon";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public" grant select, update, usage on sequences to "service_role";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "anon";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "authenticated";

alter default privileges for role "postgres" in schema "public" grant execute on FUNCTIONS to "service_role";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "anon";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "authenticated";

alter default privileges for role "postgres" in schema "public" grant delete, insert, maintain, references, select, trigger, truncate, update on tables to "service_role";

