CREATE TYPE "public"."extra_kind" AS ENUM('per_day', 'per_week');--> statement-breakpoint
CREATE TABLE "deduction_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deduction_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expense_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extra_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "extra_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "extra_kind" DEFAULT 'per_day' NOT NULL,
	"default_amount" numeric(12, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ot_rates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ot_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"multiplier" numeric(6, 3) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"currency" text NOT NULL,
	"week_start_day" smallint DEFAULT 1 NOT NULL,
	"date_format" text DEFAULT 'DD/MM/YYYY' NOT NULL,
	"usual_rate" numeric(12, 2),
	"rate_tolerance_pct" numeric(5, 2) DEFAULT '2' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deduction_types" ADD CONSTRAINT "deduction_types_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_types" ADD CONSTRAINT "extra_types_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ot_rates" ADD CONSTRAINT "ot_rates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deduction_types_user_name_idx" ON "deduction_types" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "expense_categories_user_name_idx" ON "expense_categories" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "extra_types_user_name_idx" ON "extra_types" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "ot_rates_user_name_idx" ON "ot_rates" USING btree ("user_id",lower("name"));