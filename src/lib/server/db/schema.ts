import {
	boolean,
	check,
	date,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { PAY_LENGTHS } from '../../period.ts';
import { user } from './auth.schema';

export * from './auth.schema';

// Every user-owned table has user_id; all access goes through #lib/server/queries.ts,
// which always filters by the signed-in user's id.
const userId = () =>
	text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' });

const id = () => integer('id').primaryKey().generatedAlwaysAsIdentity();

export const payLength = pgEnum('pay_length', PAY_LENGTHS);

export const settings = pgTable('settings', {
	userId: userId().primaryKey(),
	currency: text('currency').notNull(),
	/** How often the user is usually paid; only suggests dates for a new payslip. */
	payLength: payLength('pay_length').notNull().default('week'),
	dateFormat: text('date_format').notNull().default('DD/MM/YYYY'),
	usualRate: numeric('usual_rate', { precision: 12, scale: 2 }),
	rateTolerancePct: numeric('rate_tolerance_pct', { precision: 5, scale: 2 }).notNull().default('2')
});

export const deductionTypes = pgTable(
	'deduction_types',
	{
		id: id(),
		userId: userId(),
		name: text('name').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		active: boolean('active').notNull().default(true)
	},
	(t) => [uniqueIndex('deduction_types_user_name_idx').on(t.userId, sql`lower(${t.name})`)]
);

export const extraKind = pgEnum('extra_kind', ['per_day', 'per_week']);

export const extraTypes = pgTable(
	'extra_types',
	{
		id: id(),
		userId: userId(),
		name: text('name').notNull(),
		kind: extraKind('kind').notNull().default('per_day'),
		defaultAmount: numeric('default_amount', { precision: 12, scale: 2 }),
		sortOrder: integer('sort_order').notNull().default(0),
		active: boolean('active').notNull().default(true)
	},
	(t) => [uniqueIndex('extra_types_user_name_idx').on(t.userId, sql`lower(${t.name})`)]
);

export const otRates = pgTable(
	'ot_rates',
	{
		id: id(),
		userId: userId(),
		name: text('name').notNull(),
		multiplier: numeric('multiplier', { precision: 6, scale: 3 }).notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		active: boolean('active').notNull().default(true)
	},
	(t) => [uniqueIndex('ot_rates_user_name_idx').on(t.userId, sql`lower(${t.name})`)]
);

export const expenseCategories = pgTable(
	'expense_categories',
	{
		id: id(),
		userId: userId(),
		name: text('name').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		active: boolean('active').notNull().default(true)
	},
	(t) => [uniqueIndex('expense_categories_user_name_idx').on(t.userId, sql`lower(${t.name})`)]
);

// Pay periods are snapshots (PLAN.md section 5): each saved payslip keeps its own currency and
// the names, amounts and multipliers it was saved with, so editing Settings never changes history.
// A period covers period_start to period_end, both included, 1 to 62 days, and a user's periods
// never overlap (an exclusion constraint added in migration 0003; Drizzle can't declare it).
// Child rows have no user_id; they are only ever reached through their user-filtered period.
const amount = (name: string) => numeric(name, { precision: 12, scale: 2 }).notNull();

export const periodExtraKind = pgEnum('period_extra_kind', ['per_day', 'per_week', 'bonus']);

export const payPeriods = pgTable(
	'pay_periods',
	{
		id: id(),
		userId: userId(),
		periodStart: date('period_start', { mode: 'string' }).notNull(),
		periodEnd: date('period_end', { mode: 'string' }).notNull(),
		/** The day it was paid; when null, the end date stands in for it. */
		payDate: date('pay_date', { mode: 'string' }),
		currency: text('currency').notNull(),
		netPay: amount('net_pay'),
		totalDeductions: amount('total_deductions'),
		grossPay: amount('gross_pay'),
		extrasTotal: amount('extras_total'),
		payFromHours: amount('pay_from_hours'),
		regularHours: numeric('regular_hours', { precision: 6, scale: 2 }).notNull(),
		otHours: numeric('ot_hours', { precision: 6, scale: 2 }).notNull(),
		// Major units per hour, 4 places; null when the period has no valid rate (e.g. no hours).
		hourlyRate: numeric('hourly_rate', { precision: 12, scale: 4 }),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		uniqueIndex('pay_periods_user_start_idx').on(t.userId, t.periodStart),
		check(
			'pay_periods_dates_check',
			sql`${t.periodEnd} >= ${t.periodStart} and ${t.periodEnd} - ${t.periodStart} < 62`
		)
	]
);

const periodId = () =>
	integer('period_id')
		.notNull()
		.references(() => payPeriods.id, { onDelete: 'cascade' });

export const payPeriodDays = pgTable(
	'pay_period_days',
	{
		id: id(),
		periodId: periodId(),
		date: date('date', { mode: 'string' }).notNull(),
		hours: numeric('hours', { precision: 5, scale: 2 }).notNull()
	},
	(t) => [index('pay_period_days_period_idx').on(t.periodId)]
);

export const payPeriodOt = pgTable(
	'pay_period_ot',
	{
		id: id(),
		periodId: periodId(),
		name: text('name').notNull(),
		multiplier: numeric('multiplier', { precision: 6, scale: 3 }).notNull(),
		hours: numeric('hours', { precision: 6, scale: 2 }).notNull(),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('pay_period_ot_period_idx').on(t.periodId)]
);

export const payPeriodDeductions = pgTable(
	'pay_period_deductions',
	{
		id: id(),
		periodId: periodId(),
		name: text('name').notNull(),
		amount: amount('amount'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('pay_period_deductions_period_idx').on(t.periodId)]
);

export const payPeriodExtras = pgTable(
	'pay_period_extras',
	{
		id: id(),
		periodId: periodId(),
		name: text('name').notNull(),
		/** per_week is shown as "per payslip": paid once per period, whatever its length. */
		kind: periodExtraKind('kind').notNull(),
		unitAmount: amount('unit_amount'),
		quantity: numeric('quantity', { precision: 6, scale: 2 }).notNull(),
		amount: amount('amount'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('pay_period_extras_period_idx').on(t.periodId)]
);
