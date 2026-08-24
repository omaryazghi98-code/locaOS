CREATE TYPE "public"."action_kind" AS ENUM('NOTIFY', 'CREATE_TASK', 'REQUIRE_APPROVAL', 'SUGGESTION');--> statement-breakpoint
CREATE TYPE "public"."alert_channel" AS ENUM('EVENT', 'SCHEDULE', 'SIGNAL');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('INFO', 'ATTENTION', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('BLANK_ISSUED', 'DRAFT', 'SIGNED', 'ACTIVE', 'CLOSED', 'AMENDED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."deposit_method" AS ENUM('CASH_HELD', 'CARD_PREAUTH', 'BANK');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('PLANNED', 'HELD', 'PRE_AUTHORIZED', 'RELEASED', 'PARTIALLY_CHARGED', 'SETTLED');--> statement-breakpoint
CREATE TYPE "public"."fleet_status" AS ENUM('IN_FLEET', 'FOR_SALE', 'SOLD', 'RETIRED');--> statement-breakpoint
CREATE TYPE "public"."identity_doc_type" AS ENUM('CIN', 'PASSPORT', 'RESIDENCE_PERMIT', 'DRIVER_LICENSE');--> statement-breakpoint
CREATE TYPE "public"."inspection_kind" AS ENUM('DEPARTURE', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'TRANSFER', 'DEPOSIT_CASH', 'REFUND');--> statement-breakpoint
CREATE TYPE "public"."payment_purpose" AS ENUM('RENTAL', 'DEPOSIT', 'DAMAGE', 'FUEL', 'FINE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('DRAFT', 'CONFIRMED', 'VEHICLE_ASSIGNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('AVAILABLE', 'RESERVED', 'PREPARING', 'CONTRACT_READY', 'IN_TRANSIT', 'RENTED', 'OVERDUE', 'AWAITING_INSPECTION', 'INSPECTED', 'CLEANING', 'MAINTENANCE', 'IMMOBILIZED', 'ACCIDENT', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."vehicle_doc_type" AS ENUM('REGISTRATION', 'VT', 'INSURANCE', 'VIGNETTE');--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"rc_number" text,
	"ice_number" text,
	"if_number" text,
	"default_lang" text DEFAULT 'fr' NOT NULL,
	"currency" text DEFAULT 'MAD' NOT NULL,
	"tz" text DEFAULT 'Africa/Casablanca' NOT NULL,
	"contract_prefix" text DEFAULT 'L' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"channel" "alert_channel" NOT NULL,
	"event_type" text,
	"schedule_key" text,
	"severity" "alert_severity" NOT NULL,
	"action_kind" "action_kind" DEFAULT 'NOTIFY' NOT NULL,
	"dedup_window_minutes" integer DEFAULT 1440 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"rule_key" text NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"source_kind" text DEFAULT 'RULE' NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"dedup_key" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"evidence" jsonb,
	"status" "alert_status" DEFAULT 'OPEN' NOT NULL,
	"assignee_id" uuid,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"requested_action" jsonb NOT NULL,
	"requested_by" uuid NOT NULL,
	"decided_by" uuid,
	"decision" text,
	"decided_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"source" text DEFAULT 'api' NOT NULL,
	"ip" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"opened_by" uuid NOT NULL,
	"closed_by" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"opening_balance" bigint NOT NULL,
	"expected_mad" bigint,
	"counted" jsonb,
	"counted_mad" bigint,
	"counted_mad_equivalent" bigint,
	"variance_mad" bigint,
	"variance_explanation" text,
	"status" text DEFAULT 'OPEN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaning_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"assigned_to" uuid,
	"status" text DEFAULT 'TODO' NOT NULL,
	"next_pickup_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_rule_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"min_fleet_size" integer,
	"age_cap_ice_years" integer,
	"age_cap_hybrid_years" integer,
	"age_cap_ev_years" integer,
	"enabled" boolean DEFAULT false NOT NULL,
	"source_label" text DEFAULT 'Cahier des charges (secondary sources) — verify with your accountant' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"language" text DEFAULT 'fr' NOT NULL,
	"captured_by" uuid,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"resulting_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_sequences" (
	"agency_id" uuid PRIMARY KEY NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"language" text NOT NULL,
	"name" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"body" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"template_id" uuid,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"rendered_object_key" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"reservation_id" uuid,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"branch_id" uuid,
	"language" text DEFAULT 'fr' NOT NULL,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"deposit_id" uuid,
	"current_version_id" uuid,
	"signed_object_key" text,
	"scanned_object_key" text,
	"voided_reason" text,
	"blank_issued_at" timestamp with time zone,
	"reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"severity" text DEFAULT 'ATTENTION' NOT NULL,
	"note" text,
	"evidence" jsonb,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"kind" text DEFAULT 'INDIVIDUAL' NOT NULL,
	"segment" text DEFAULT 'DOMESTIC' NOT NULL,
	"first_name" text,
	"last_name" text,
	"company_name" text,
	"phone" text NOT NULL,
	"email" text,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "damages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"discovered_inspection_id" uuid,
	"preexisting" boolean DEFAULT false NOT NULL,
	"zone_code" text NOT NULL,
	"severity" text DEFAULT 'MINOR' NOT NULL,
	"description" text,
	"photo_object_keys" jsonb,
	"resolution" text DEFAULT 'NONE' NOT NULL,
	"charge_payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"deposit_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text NOT NULL,
	"damage_id" uuid,
	"approved_by" uuid NOT NULL,
	"payment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"method" "deposit_method" NOT NULL,
	"provider" text,
	"provider_ref" text,
	"preauth_expires_at" timestamp with time zone,
	"status" "deposit_status" DEFAULT 'PLANNED' NOT NULL,
	"held_by" uuid,
	"released_by" uuid,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "identity_doc_type" NOT NULL,
	"number_encrypted" text NOT NULL,
	"number_last4" text NOT NULL,
	"issuer_country" text,
	"issue_date" date,
	"expiry_date" date,
	"front_object_key" text,
	"back_object_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"inspection_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"object_key" text NOT NULL,
	"checksum" text,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"client_uuid" text NOT NULL,
	"kind" "inspection_kind" NOT NULL,
	"contract_id" uuid,
	"reservation_id" uuid,
	"vehicle_id" uuid NOT NULL,
	"customer_id" uuid,
	"performed_by" uuid,
	"performed_by_name" text,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_seconds" integer,
	"mileage_km" integer,
	"fuel_level_pct" integer,
	"checklist" jsonb,
	"location" jsonb,
	"customer_ack" boolean DEFAULT false NOT NULL,
	"customer_ack_name" text,
	"device_info" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"kind" text DEFAULT 'PLANNED' NOT NULL,
	"note" text,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"direction" "payment_direction" DEFAULT 'IN' NOT NULL,
	"method" "payment_method" NOT NULL,
	"purpose" "payment_purpose",
	"amount" bigint NOT NULL,
	"currency" text DEFAULT 'MAD' NOT NULL,
	"fx_rate" numeric,
	"mad_equivalent" bigint,
	"contract_id" uuid,
	"reservation_id" uuid,
	"deposit_id" uuid,
	"reverses_payment_id" uuid,
	"provider_ref" text,
	"received_by" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cash_session_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"reservation_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"lines" jsonb NOT NULL,
	"days" integer NOT NULL,
	"subtotal" bigint NOT NULL,
	"discount" bigint NOT NULL,
	"total" bigint NOT NULL,
	"deposit_required" bigint NOT NULL,
	"below_floor" boolean DEFAULT false NOT NULL,
	"inputs" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"category_id" uuid NOT NULL,
	"branch_out_id" uuid NOT NULL,
	"branch_in_id" uuid NOT NULL,
	"pickup_at" timestamp with time zone NOT NULL,
	"return_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'DRAFT' NOT NULL,
	"flight_number" text,
	"delivery_kind" text,
	"delivery_address" text,
	"assigned_to_id" uuid,
	"quote_id" uuid,
	"notes" text,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"agency_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"permission_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"agency_id" uuid,
	"device_info" text,
	"ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"default_daily_rate" bigint NOT NULL,
	"floor_daily_rate" bigint NOT NULL,
	"default_deposit" bigint NOT NULL,
	"min_driver_age" integer DEFAULT 21 NOT NULL,
	"min_license_years" integer DEFAULT 2 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" "vehicle_doc_type" NOT NULL,
	"ref_number" text,
	"issued_at" date,
	"expires_at" date,
	"object_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"fuel_type" text DEFAULT 'PETROL' NOT NULL,
	"battery_kwh" numeric
);
--> statement-breakpoint
CREATE TABLE "vehicle_state_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"from_status" "vehicle_status" NOT NULL,
	"to_status" "vehicle_status" NOT NULL,
	"interrupted_status" "vehicle_status",
	"actor_id" uuid,
	"actor_name" text,
	"actor_kind" text DEFAULT 'USER' NOT NULL,
	"reason" text,
	"source_type" text,
	"source_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"current_branch_id" uuid,
	"plate" text NOT NULL,
	"vin" text NOT NULL,
	"operational_status" "vehicle_status" DEFAULT 'AVAILABLE' NOT NULL,
	"fleet_status" "fleet_status" DEFAULT 'IN_FLEET' NOT NULL,
	"current_mileage_km" integer DEFAULT 0 NOT NULL,
	"fuel_level_pct" integer DEFAULT 100 NOT NULL,
	"first_registration_date" date,
	"acquired_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_flags" ADD CONSTRAINT "customer_flags_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_discovered_inspection_id_inspections_id_fk" FOREIGN KEY ("discovered_inspection_id") REFERENCES "public"."inspections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_charges" ADD CONSTRAINT "deposit_charges_deposit_id_deposits_id_fk" FOREIGN KEY ("deposit_id") REFERENCES "public"."deposits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_photos" ADD CONSTRAINT "inspection_photos_inspection_id_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_windows" ADD CONSTRAINT "maintenance_windows_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_category_id_vehicle_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."vehicle_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_state_transitions" ADD CONSTRAINT "vehicle_state_transitions_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_category_id_vehicle_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."vehicle_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_rules_uq" ON "alert_rules" USING btree ("agency_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_dedup_uq" ON "alerts" USING btree ("agency_id","dedup_key");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("agency_id","status","severity");--> statement-breakpoint
CREATE INDEX "approvals_pending_idx" ON "approvals" USING btree ("agency_id","decision");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_events" USING btree ("agency_id","entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_events" USING btree ("agency_id","actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_agency_name_uq" ON "branches" USING btree ("agency_id","name");--> statement-breakpoint
CREATE INDEX "cash_branch_idx" ON "cash_sessions" USING btree ("branch_id","opened_at");--> statement-breakpoint
CREATE INDEX "cleaning_agency_idx" ON "cleaning_tasks" USING btree ("agency_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_agency_uq" ON "compliance_rule_sets" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX "consent_customer_idx" ON "consent_records" USING btree ("customer_id","purpose");--> statement-breakpoint
CREATE INDEX "amendments_contract_idx" ON "contract_amendments" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_uq" ON "contract_templates" USING btree ("agency_id","language","name");--> statement-breakpoint
CREATE UNIQUE INDEX "cversions_uq" ON "contract_versions" USING btree ("contract_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_number_uq" ON "contracts" USING btree ("agency_id","number");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("agency_id","status");--> statement-breakpoint
CREATE INDEX "flags_customer_idx" ON "customer_flags" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_agency_phone_uq" ON "customers" USING btree ("agency_id","phone");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("agency_id","last_name");--> statement-breakpoint
CREATE INDEX "damages_vehicle_idx" ON "damages" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "deposit_charges_idx" ON "deposit_charges" USING btree ("deposit_id");--> statement-breakpoint
CREATE INDEX "deposits_contract_idx" ON "deposits" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "identity_customer_idx" ON "identity_documents" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "identity_expiry_idx" ON "identity_documents" USING btree ("agency_id","expiry_date");--> statement-breakpoint
CREATE INDEX "photos_inspection_idx" ON "inspection_photos" USING btree ("inspection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspections_client_uq" ON "inspections" USING btree ("agency_id","client_uuid");--> statement-breakpoint
CREATE INDEX "inspections_contract_idx" ON "inspections" USING btree ("contract_id","kind");--> statement-breakpoint
CREATE INDEX "inspections_vehicle_idx" ON "inspections" USING btree ("vehicle_id","submitted_at");--> statement-breakpoint
CREATE INDEX "maint_vehicle_idx" ON "maintenance_windows" USING btree ("vehicle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_agency_uq" ON "memberships" USING btree ("user_id","agency_id");--> statement-breakpoint
CREATE INDEX "outbox_unprocessed_idx" ON "outbox_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "payments_received_idx" ON "payments" USING btree ("agency_id","received_at");--> statement-breakpoint
CREATE INDEX "payments_session_idx" ON "payments" USING btree ("cash_session_id");--> statement-breakpoint
CREATE INDEX "payments_contract_idx" ON "payments" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_res_version_uq" ON "quotes" USING btree ("reservation_id","version");--> statement-breakpoint
CREATE INDEX "res_pickup_idx" ON "reservations" USING btree ("agency_id","pickup_at");--> statement-breakpoint
CREATE INDEX "res_vehicle_idx" ON "reservations" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "role_permissions_pk_idx" ON "role_permissions" USING btree ("agency_id","role_key","permission_key");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_agency_code_uq" ON "vehicle_categories" USING btree ("agency_id","code");--> statement-breakpoint
CREATE INDEX "vdocs_idx" ON "vehicle_documents" USING btree ("vehicle_id","type","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "models_uq" ON "vehicle_models" USING btree ("agency_id","make","model","year");--> statement-breakpoint
CREATE INDEX "vst_vehicle_idx" ON "vehicle_state_transitions" USING btree ("vehicle_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_uq" ON "vehicles" USING btree ("agency_id","plate");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("agency_id","operational_status");