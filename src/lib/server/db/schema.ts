import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	smallint,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth.schema';

export * from './auth.schema';

// Every user-owned table has user_id; all access goes through #lib/server/queries.ts,
// which always filters by the signed-in user's id.
const userId = () =>
	text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' });

const id = () => integer('id').primaryKey().generatedAlwaysAsIdentity();

export const settings = pgTable('settings', {
	userId: userId().primaryKey(),
	currency: text('currency').notNull(),
	// 0 = Sunday ... 6 = Saturday (JavaScript's Date.getDay())
	weekStartDay: smallint('week_start_day').notNull().default(1),
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

// Weeks are snapshots (PLAN.md section 5): each saved week keeps its own currency and the
// names, amounts and multipliers it was saved with, so editing Settings never changes history.
// Child rows have no user_id; they are only ever reached through their user-filtered week.
const amount = (name: string) => numeric(name, { precision: 12, scale: 2 }).notNull();

export const weekExtraKind = pgEnum('week_extra_kind', ['per_day', 'per_week', 'bonus']);

export const weeks = pgTable(
	'weeks',
	{
		id: id(),
		userId: userId(),
		weekStart: date('week_start', { mode: 'string' }).notNull(),
		currency: text('currency').notNull(),
		netPay: amount('net_pay'),
		totalDeductions: amount('total_deductions'),
		grossPay: amount('gross_pay'),
		extrasTotal: amount('extras_total'),
		payFromHours: amount('pay_from_hours'),
		regularHours: numeric('regular_hours', { precision: 6, scale: 2 }).notNull(),
		otHours: numeric('ot_hours', { precision: 6, scale: 2 }).notNull(),
		// Major units per hour, 4 places; null when the week has no valid rate (e.g. no hours).
		hourlyRate: numeric('hourly_rate', { precision: 12, scale: 4 }),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('weeks_user_week_idx').on(t.userId, t.weekStart)]
);

const weekId = () =>
	integer('week_id')
		.notNull()
		.references(() => weeks.id, { onDelete: 'cascade' });

export const weekDays = pgTable(
	'week_days',
	{
		id: id(),
		weekId: weekId(),
		date: date('date', { mode: 'string' }).notNull(),
		hours: numeric('hours', { precision: 5, scale: 2 }).notNull()
	},
	(t) => [index('week_days_week_idx').on(t.weekId)]
);

export const weekOt = pgTable(
	'week_ot',
	{
		id: id(),
		weekId: weekId(),
		name: text('name').notNull(),
		multiplier: numeric('multiplier', { precision: 6, scale: 3 }).notNull(),
		hours: numeric('hours', { precision: 6, scale: 2 }).notNull(),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('week_ot_week_idx').on(t.weekId)]
);

export const weekDeductions = pgTable(
	'week_deductions',
	{
		id: id(),
		weekId: weekId(),
		name: text('name').notNull(),
		amount: amount('amount'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('week_deductions_week_idx').on(t.weekId)]
);

export const weekExtras = pgTable(
	'week_extras',
	{
		id: id(),
		weekId: weekId(),
		name: text('name').notNull(),
		kind: weekExtraKind('kind').notNull(),
		unitAmount: amount('unit_amount'),
		quantity: numeric('quantity', { precision: 6, scale: 2 }).notNull(),
		amount: amount('amount'),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [index('week_extras_week_idx').on(t.weekId)]
);
