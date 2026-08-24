CREATE TYPE "public"."contract_status_v1" AS ENUM('BLANK_ISSUED', 'DRAFT', 'GENERATED', 'SIGNATURE_REQUESTED', 'SIGNED', 'ACTIVE', 'CLOSED', 'AMENDED', 'VOIDED');--> statement-breakpoint
ALTER TYPE "public"."alert_severity" ADD VALUE 'HIGH' BEFORE 'CRITICAL';--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"source_ref" text DEFAULT '' NOT NULL,
	"effective_date" date,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer,
	"label" text,
	"expires_at" timestamp with time zone,
	"metadata" jsonb,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"task_kind" text NOT NULL,
	"basis" text NOT NULL,
	"interval_km" integer,
	"interval_days" integer,
	"last_done_km" integer,
	"last_done_at" timestamp with time zone,
	"next_due_km" integer,
	"next_due_at" timestamp with time zone,
	"estimated_cost" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"plan_id" uuid,
	"task_kind" text NOT NULL,
	"vendor_id" uuid,
	"vendor_name" text,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mileage_km" integer,
	"parts_cost" bigint NOT NULL,
	"labor_cost" bigint NOT NULL,
	"total_cost" bigint NOT NULL,
	"downtime_hours" integer NOT NULL,
	"window_id" uuid,
	"notes" text,
	"invoice_object_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"channel" text DEFAULT 'WHATSAPP' NOT NULL,
	"template" text NOT NULL,
	"to_phone" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"integration_status" text DEFAULT 'MOCK' NOT NULL,
	"related_type" text,
	"related_id" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"contract_version_id" uuid,
	"provider" text NOT NULL,
	"mode" text NOT NULL,
	"provider_ref" text,
	"signer_name" text NOT NULL,
	"signer_phone" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"evidence_object_key" text,
	"requested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "telematics_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"vehicle_id" uuid,
	"status" text DEFAULT 'UNAVAILABLE' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telematics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_positions" (
	"vehicle_id" uuid PRIMARY KEY NOT NULL,
	"agency_id" uuid NOT NULL,
	"lat" text NOT NULL,
	"lng" text NOT NULL,
	"speed_kmh" integer DEFAULT 0 NOT NULL,
	"heading" integer,
	"ignition_on" boolean,
	"voltage" text,
	"fixed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"from_branch_id" uuid NOT NULL,
	"to_branch_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reservation_id" uuid,
	"status" text DEFAULT 'RECOMMENDED' NOT NULL,
	"distance_km" integer,
	"executed_by" uuid,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'GARAGE' NOT NULL,
	"phone" text,
	"city" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_rules" ADD COLUMN "category" text DEFAULT 'OPERATIONS' NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "category" text DEFAULT 'OPERATIONS' NOT NULL;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "zones" jsonb;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "estimated_value" bigint;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telematics_devices" ADD CONSTRAINT "telematics_devices_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_transfers" ADD CONSTRAINT "vehicle_transfers_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_rules_uq" ON "compliance_rules" USING btree ("agency_id","key");--> statement-breakpoint
CREATE INDEX "documents_entity_idx" ON "documents" USING btree ("agency_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "plans_vehicle_idx" ON "maintenance_plans" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "records_vehicle_idx" ON "maintenance_records" USING btree ("vehicle_id","performed_at");--> statement-breakpoint
CREATE INDEX "notif_status_idx" ON "notification_outbox" USING btree ("agency_id","status");--> statement-breakpoint
CREATE INDEX "sigreq_contract_idx" ON "signature_requests" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_provider_uq" ON "telematics_devices" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telematics_idempotent_uq" ON "telematics_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "telematics_vehicle_time_idx" ON "telematics_events" USING btree ("vehicle_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transfers_status_idx" ON "vehicle_transfers" USING btree ("agency_id","status");--> statement-breakpoint
CREATE INDEX "vendors_agency_idx" ON "vendors" USING btree ("agency_id");