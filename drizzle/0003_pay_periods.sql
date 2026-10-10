-- Weeks become pay periods: a start and end date (1 to 62 days, never overlapping), an optional
-- pay date, and Settings' usual pay length. Every change is a rename or an added column, so no
-- saved row is lost; existing weeks become 7-day periods (end = start + 6).
-- Hand-written because drizzle-kit can't generate renames without its interactive prompt; the
-- snapshot (meta/0003_snapshot.json) matches src/lib/server/db/schema.ts.

-- Settings: how often the user is usually paid. week_start_day stays until the payslip page
-- moves to pay periods.
CREATE TYPE "public"."pay_length" AS ENUM('day', 'week', 'fortnight', 'month');--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "pay_length" "pay_length" DEFAULT 'week' NOT NULL;--> statement-breakpoint

ALTER TYPE "public"."week_extra_kind" RENAME TO "period_extra_kind";--> statement-breakpoint

-- weeks → pay_periods
ALTER TABLE "weeks" RENAME TO "pay_periods";--> statement-breakpoint
ALTER TABLE "pay_periods" RENAME COLUMN "week_start" TO "period_start";--> statement-breakpoint
ALTER TABLE "pay_periods" RENAME CONSTRAINT "weeks_pkey" TO "pay_periods_pkey";--> statement-breakpoint
ALTER TABLE "pay_periods" RENAME CONSTRAINT "weeks_user_id_user_id_fk" TO "pay_periods_user_id_user_id_fk";--> statement-breakpoint
ALTER INDEX "weeks_user_week_idx" RENAME TO "pay_periods_user_start_idx";--> statement-breakpoint
ALTER SEQUENCE "weeks_id_seq" RENAME TO "pay_periods_id_seq";--> statement-breakpoint
ALTER TABLE "pay_periods" ADD COLUMN "period_end" date;--> statement-breakpoint
UPDATE "pay_periods" SET "period_end" = "period_start" + 6;--> statement-breakpoint
ALTER TABLE "pay_periods" ALTER COLUMN "period_end" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD COLUMN "pay_date" date;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_dates_check" CHECK ("pay_periods"."period_end" >= "pay_periods"."period_start" and "pay_periods"."period_end" - "pay_periods"."period_start" < 62);--> statement-breakpoint
-- No two of a user's periods may share a day. Not in the snapshot: Drizzle can't declare it.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_no_overlap" EXCLUDE USING gist ("user_id" WITH =, daterange("period_start", "period_end", '[]') WITH &&);--> statement-breakpoint

-- week_days → pay_period_days
ALTER TABLE "week_days" RENAME TO "pay_period_days";--> statement-breakpoint
ALTER TABLE "pay_period_days" RENAME COLUMN "week_id" TO "period_id";--> statement-breakpoint
ALTER TABLE "pay_period_days" RENAME CONSTRAINT "week_days_pkey" TO "pay_period_days_pkey";--> statement-breakpoint
ALTER TABLE "pay_period_days" RENAME CONSTRAINT "week_days_week_id_weeks_id_fk" TO "pay_period_days_period_id_pay_periods_id_fk";--> statement-breakpoint
ALTER INDEX "week_days_week_idx" RENAME TO "pay_period_days_period_idx";--> statement-breakpoint
ALTER SEQUENCE "week_days_id_seq" RENAME TO "pay_period_days_id_seq";--> statement-breakpoint

-- week_ot → pay_period_ot
ALTER TABLE "week_ot" RENAME TO "pay_period_ot";--> statement-breakpoint
ALTER TABLE "pay_period_ot" RENAME COLUMN "week_id" TO "period_id";--> statement-breakpoint
ALTER TABLE "pay_period_ot" RENAME CONSTRAINT "week_ot_pkey" TO "pay_period_ot_pkey";--> statement-breakpoint
ALTER TABLE "pay_period_ot" RENAME CONSTRAINT "week_ot_week_id_weeks_id_fk" TO "pay_period_ot_period_id_pay_periods_id_fk";--> statement-breakpoint
ALTER INDEX "week_ot_week_idx" RENAME TO "pay_period_ot_period_idx";--> statement-breakpoint
ALTER SEQUENCE "week_ot_id_seq" RENAME TO "pay_period_ot_id_seq";--> statement-breakpoint

-- week_deductions → pay_period_deductions
ALTER TABLE "week_deductions" RENAME TO "pay_period_deductions";--> statement-breakpoint
ALTER TABLE "pay_period_deductions" RENAME COLUMN "week_id" TO "period_id";--> statement-breakpoint
ALTER TABLE "pay_period_deductions" RENAME CONSTRAINT "week_deductions_pkey" TO "pay_period_deductions_pkey";--> statement-breakpoint
ALTER TABLE "pay_period_deductions" RENAME CONSTRAINT "week_deductions_week_id_weeks_id_fk" TO "pay_period_deductions_period_id_pay_periods_id_fk";--> statement-breakpoint
ALTER INDEX "week_deductions_week_idx" RENAME TO "pay_period_deductions_period_idx";--> statement-breakpoint
ALTER SEQUENCE "week_deductions_id_seq" RENAME TO "pay_period_deductions_id_seq";--> statement-breakpoint

-- week_extras → pay_period_extras
ALTER TABLE "week_extras" RENAME TO "pay_period_extras";--> statement-breakpoint
ALTER TABLE "pay_period_extras" RENAME COLUMN "week_id" TO "period_id";--> statement-breakpoint
ALTER TABLE "pay_period_extras" RENAME CONSTRAINT "week_extras_pkey" TO "pay_period_extras_pkey";--> statement-breakpoint
ALTER TABLE "pay_period_extras" RENAME CONSTRAINT "week_extras_week_id_weeks_id_fk" TO "pay_period_extras_period_id_pay_periods_id_fk";--> statement-breakpoint
ALTER INDEX "week_extras_week_idx" RENAME TO "pay_period_extras_period_idx";--> statement-breakpoint
ALTER SEQUENCE "week_extras_id_seq" RENAME TO "pay_period_extras_id_seq";--> statement-breakpoint

-- Postgres 18 names NOT NULL constraints after the table and column (weeks_currency_not_null);
-- give them the new names too.
DO $$
DECLARE
	c record;
	renames constant text[][] := array[
		['pay_periods', 'weeks_'],
		['pay_period_days', 'week_days_'],
		['pay_period_ot', 'week_ot_'],
		['pay_period_deductions', 'week_deductions_'],
		['pay_period_extras', 'week_extras_']
	];
	i int;
BEGIN
	FOR i IN 1 .. array_length(renames, 1) LOOP
		FOR c IN
			SELECT conname FROM pg_constraint
			WHERE conrelid = ('public.' || renames[i][1])::regclass
				AND contype = 'n' AND starts_with(conname, renames[i][2])
		LOOP
			EXECUTE format(
				'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
				renames[i][1],
				c.conname,
				replace(
					replace(renames[i][1] || '_' || substr(c.conname, length(renames[i][2]) + 1), '_week_start_', '_period_start_'),
					'_week_id_', '_period_id_'
				)
			);
		END LOOP;
	END LOOP;
END $$;
