// User-scoped data access (PLAN.md section 6). There is no row-level security, so every
// query in the app goes through `forUser(userId)`, which always filters by that user.
// Multi-statement operations use db.batch(): one HTTP round trip, run as a transaction.
import { and, asc, eq, inArray, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from './db';
import {
	deductionTypes,
	expenseCategories,
	extraTypes,
	otRates,
	settings,
	payPeriodDays,
	payPeriodDeductions,
	payPeriodExtras,
	payPeriodOt,
	payPeriods
} from './db/schema';
import type { IsoDate } from '#lib/dates.ts';
import type { PayLength } from '#lib/period.ts';
import { TEMPLATES, type ExtraKind, type TemplateId } from '#lib/templates.ts';
import type { SavedPayslip, PayslipRecord } from '#lib/payslip/form.ts';

export const LISTS = {
	deductions: deductionTypes,
	extras: extraTypes,
	otRates: otRates,
	categories: expenseCategories
} as const;
export type ListKey = keyof typeof LISTS;

export const isListKey = (value: string): value is ListKey => value in LISTS;

// All four list tables share id, user_id, name, sort_order and active. For the shared
// operations we treat them as the simplest one; the columns are looked up per table.
type AnyList = typeof deductionTypes;
const listTable = (key: ListKey) => LISTS[key] as unknown as AnyList;

export type GeneralSettings = {
	currency: string;
	payLength: PayLength;
	dateFormat: string;
	usualRate: string | null;
	rateTolerancePct: string;
};

// Fields that only some lists have (extras: kind/defaultAmount, OT rates: multiplier).
export type ListFields = {
	name: string;
	kind?: ExtraKind;
	defaultAmount?: string | null;
	multiplier?: string;
};

/** True when a write failed because the name already exists in that list. */
/** A save refused because the dates overlap (or start on) another of the user's payslips. */
export function isPeriodClash(error: unknown): boolean {
	for (let e = error; e; e = (e as { cause?: unknown }).cause) {
		const { code, constraint } = e as { code?: string; constraint?: string };
		if (code === '23P01' || (code === '23505' && constraint?.startsWith('pay_periods_'))) {
			return true;
		}
	}
	return false;
}

/** A list item refused because the name is already in that list (the *_user_name_idx indexes). */
export function isDuplicateName(error: unknown): boolean {
	for (let e = error; e; e = (e as { cause?: unknown }).cause) {
		const { code, constraint } = e as { code?: string; constraint?: string };
		if (code === '23505' && (constraint === undefined || constraint.endsWith('_user_name_idx'))) {
			return true;
		}
	}
	return false;
}

const byOrder = (table: { sortOrder: AnyColumn; id: AnyColumn }) => [
	asc(table.sortOrder),
	asc(table.id)
];

const batch = (items: BatchItem<'pg'>[]) =>
	db.batch(items as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);

export function forUser(userId: string) {
	const mine = (table: AnyList, id?: number): SQL =>
		id === undefined ? eq(table.userId, userId) : and(eq(table.userId, userId), eq(table.id, id))!;

	// Next sort position at the end of a list, computed inside the INSERT itself.
	const nextSortOrder = (table: AnyList, offset = 0) =>
		sql<number>`(select coalesce(max(${table.sortOrder}), -1) + 1 + ${offset} from ${table} where ${table.userId} = ${userId})`;

	const listQuery = (table: AnyList) =>
		db
			.select()
			.from(table)
			.where(mine(table))
			.orderBy(...byOrder(table));

	// Inserts a template's items, skipping names the user already has.
	function templateInserts(templateId: TemplateId): BatchItem<'pg'>[] {
		const t = TEMPLATES[templateId];
		const toName = (name: string) => ({ name });
		const items: [ListKey, ListFields[]][] = [
			['deductions', t.deductions.map(toName)],
			['extras', t.extras],
			['otRates', t.otRates],
			['categories', t.expenseCategories.map(toName)]
		];
		return items
			.filter(([, fields]) => fields.length > 0)
			.map(([key, fields]) => {
				const table = listTable(key);
				const values = fields.map((f, i) => ({
					...f,
					userId,
					sortOrder: nextSortOrder(table, i)
				}));
				return db
					.insert(table)
					.values(values as unknown as (typeof table.$inferInsert)[])
					.onConflictDoNothing();
			});
	}

	const activeList = (table: AnyList) =>
		db
			.select()
			.from(table)
			.where(and(eq(table.userId, userId), eq(table.active, true)))
			.orderBy(...byOrder(table));

	// The id of this user's period starting on `start`, as a subquery, so a save can write
	// the period and its rows in one batch without waiting for the id.
	const periodIdOf = (start: IsoDate) =>
		sql<number>`(select ${payPeriods.id} from ${payPeriods} where ${payPeriods.userId} = ${userId} and ${payPeriods.periodStart} = ${start})`;

	/** The dates of all this user's payslips, oldest first: small (one row per payslip). */
	const periodDatesQuery = () =>
		db
			.select({ id: payPeriods.id, start: payPeriods.periodStart, end: payPeriods.periodEnd })
			.from(payPeriods)
			.where(eq(payPeriods.userId, userId))
			.orderBy(asc(payPeriods.periodStart));

	return {
		/**
		 * The payslip page's first round trip: settings, the active list items, and the dates of
		 * every saved payslip, so the caller can work out which period to show.
		 */
		async loadPayslipPage() {
			const active = <T extends typeof extraTypes | typeof otRates>(table: T) =>
				and(eq(table.userId, userId), eq(table.active, true));

			const [[general], deductions, extras, ot, periods] = await db.batch([
				db.select().from(settings).where(eq(settings.userId, userId)).limit(1),
				activeList(deductionTypes),
				db
					.select()
					.from(extraTypes)
					.where(active(extraTypes))
					.orderBy(...byOrder(extraTypes)),
				db
					.select()
					.from(otRates)
					.where(active(otRates))
					.orderBy(...byOrder(otRates)),
				periodDatesQuery()
			]);

			return { general: general ?? null, types: { deductions, extras, otRates: ot }, periods };
		},

		/** The dates of all this user's payslips, oldest first. */
		periodDates: () => periodDatesQuery(),

		/** One saved payslip with its rows, in one round trip; null if it's gone. */
		async loadSavedPeriod(id: number): Promise<SavedPayslip | null> {
			const mine = and(eq(payPeriods.userId, userId), eq(payPeriods.id, id));
			const ids = db.select({ id: payPeriods.id }).from(payPeriods).where(mine);
			const [[period], days, ot, deductions, extras] = await db.batch([
				db.select().from(payPeriods).where(mine).limit(1),
				db.select().from(payPeriodDays).where(inArray(payPeriodDays.periodId, ids)),
				db
					.select()
					.from(payPeriodOt)
					.where(inArray(payPeriodOt.periodId, ids))
					.orderBy(asc(payPeriodOt.sortOrder)),
				db
					.select()
					.from(payPeriodDeductions)
					.where(inArray(payPeriodDeductions.periodId, ids))
					.orderBy(asc(payPeriodDeductions.sortOrder)),
				db
					.select()
					.from(payPeriodExtras)
					.where(inArray(payPeriodExtras.periodId, ids))
					.orderBy(asc(payPeriodExtras.sortOrder))
			]);
			if (!period) return null;
			return {
				currency: period.currency,
				netPay: period.netPay,
				payDate: period.payDate,
				notes: period.notes,
				updatedAt: period.updatedAt.toISOString(),
				days,
				deductions,
				ot,
				extras
			};
		},

		/**
		 * Saves a payslip and all its rows in one transaction (one round trip). `savedStart` is
		 * the start of the saved payslip being edited (its dates may change); null for a new one.
		 * The database refuses overlapping periods (see isPeriodClash).
		 */
		async savePeriod(record: PayslipRecord, savedStart: IsoDate | null) {
			const periodId = periodIdOf(record.start);
			const children = [
				[payPeriodDays, record.days],
				[payPeriodDeductions, record.deductions],
				[payPeriodOt, record.ot],
				[payPeriodExtras, record.extras]
			] as const;
			const dates = { periodStart: record.start, periodEnd: record.end };

			await batch([
				savedStart
					? db
							.update(payPeriods)
							.set({ ...record.summary, ...dates, updatedAt: sql`now()` })
							.where(and(eq(payPeriods.userId, userId), eq(payPeriods.periodStart, savedStart)))
					: db.insert(payPeriods).values({ ...record.summary, ...dates, userId }),
				// Replace the rows: simplest way to handle added, changed and removed lines.
				...children.map(([table]) => db.delete(table).where(eq(table.periodId, periodId))),
				...children
					.filter(([, rows]) => rows.length > 0)
					.map(([table, rows]) =>
						db.insert(table).values(
							rows.map((row) => ({
								...row,
								periodId
							})) as unknown as (typeof table.$inferInsert)[]
						)
					)
			]);
		},

		/** Returns false if there was no saved payslip (or it isn't this user's). */
		async deletePeriod(start: IsoDate) {
			const rows = await db
				.delete(payPeriods)
				.where(and(eq(payPeriods.userId, userId), eq(payPeriods.periodStart, start)))
				.returning({ id: payPeriods.id });
			return rows.length > 0;
		},

		/** Everything the Settings screen needs, in one round trip. */
		async loadSettingsPage() {
			const [[general], deductions, extras, ot, categories] = await db.batch([
				db.select().from(settings).where(eq(settings.userId, userId)).limit(1),
				listQuery(deductionTypes),
				db
					.select()
					.from(extraTypes)
					.where(eq(extraTypes.userId, userId))
					.orderBy(...byOrder(extraTypes)),
				db
					.select()
					.from(otRates)
					.where(eq(otRates.userId, userId))
					.orderBy(...byOrder(otRates)),
				listQuery(listTable('categories'))
			]);
			return {
				general: general ?? null,
				lists: { deductions, extras, otRates: ot, categories }
			};
		},

		/** First-run setup: saves general settings and fills the lists from a template. */
		async setup(values: GeneralSettings, templateId: TemplateId) {
			await batch([
				db
					.insert(settings)
					.values({ ...values, userId })
					.onConflictDoNothing(),
				...templateInserts(templateId)
			]);
		},

		async updateGeneral(values: GeneralSettings) {
			await db
				.insert(settings)
				.values({ ...values, userId })
				.onConflictDoUpdate({ target: settings.userId, set: values });
		},

		/** Adds a template's items that aren't in the lists yet. */
		async applyTemplate(templateId: TemplateId) {
			const inserts = templateInserts(templateId);
			if (inserts.length) await batch(inserts);
		},

		async addItem(key: ListKey, fields: ListFields) {
			const table = listTable(key);
			await db.insert(table).values({
				...fields,
				userId,
				sortOrder: nextSortOrder(table)
			} as unknown as typeof table.$inferInsert);
		},

		/** Returns false if the item doesn't exist (or isn't this user's). */
		async updateItem(key: ListKey, id: number, fields: ListFields) {
			const table = listTable(key);
			const rows = await db
				.update(table)
				.set(fields as Partial<typeof table.$inferInsert>)
				.where(mine(table, id))
				.returning({ id: table.id });
			return rows.length > 0;
		},

		/** Returns false if the item doesn't exist (or isn't this user's). */
		async setActive(key: ListKey, id: number, active: boolean) {
			const table = listTable(key);
			const rows = await db
				.update(table)
				.set({ active })
				.where(mine(table, id))
				.returning({ id: table.id });
			return rows.length > 0;
		},

		/** Moves an item one place up or down, renumbering the list in one transaction. */
		async move(key: ListKey, id: number, direction: -1 | 1) {
			const table = listTable(key);
			const items = await listQuery(table);
			const from = items.findIndex((item) => item.id === id);
			const to = from + direction;
			if (from < 0 || to < 0 || to >= items.length) return;
			[items[from], items[to]] = [items[to], items[from]];
			const updates = items
				.map((item, sortOrder) => ({ item, sortOrder }))
				.filter(({ item, sortOrder }) => item.sortOrder !== sortOrder)
				.map(({ item, sortOrder }) =>
					db.update(table).set({ sortOrder }).where(mine(table, item.id))
				);
			if (updates.length) await batch(updates);
		}
	};
}
