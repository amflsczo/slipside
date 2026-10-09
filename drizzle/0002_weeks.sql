CREATE TYPE "public"."week_extra_kind" AS ENUM('per_day', 'per_week', 'bonus');--> statement-breakpoint
CREATE TABLE "week_days" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "week_days_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_id" integer NOT NULL,
	"date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_deductions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "week_deductions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_id" integer NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_extras" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "week_extras_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" "week_extra_kind" NOT NULL,
	"unit_amount" numeric(12, 2) NOT NULL,
	"quantity" numeric(6, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_ot" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "week_ot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_id" integer NOT NULL,
	"name" text NOT NULL,
	"multiplier" numeric(6, 3) NOT NULL,
	"hours" numeric(6, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "weeks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"currency" text NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"total_deductions" numeric(12, 2) NOT NULL,
	"gross_pay" numeric(12, 2) NOT NULL,
	"extras_total" numeric(12, 2) NOT NULL,
	"pay_from_hours" numeric(12, 2) NOT NULL,
	"regular_hours" numeric(6, 2) NOT NULL,
	"ot_hours" numeric(6, 2) NOT NULL,
	"hourly_rate" numeric(12, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "week_days" ADD CONSTRAINT "week_days_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_deductions" ADD CONSTRAINT "week_deductions_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_extras" ADD CONSTRAINT "week_extras_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_ot" ADD CONSTRAINT "week_ot_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "week_days_week_idx" ON "week_days" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "week_deductions_week_idx" ON "week_deductions" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "week_extras_week_idx" ON "week_extras" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "week_ot_week_idx" ON "week_ot" USING btree ("week_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weeks_user_week_idx" ON "weeks" USING btree ("user_id","week_start");