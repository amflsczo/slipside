import {
	boolean,
	integer,
	numeric,
	pgEnum,
	pgTable,
	smallint,
	text,
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
