// User-scoped data access (PLAN.md section 6). There is no row-level security, so every
// query in the app goes through `forUser(userId)`, which always filters by that user.
// Multi-statement operations use db.batch(): one HTTP round trip, run as a transaction.
import { and, asc, between, eq, inArray, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from './db';
import {
	deductionTypes,
	expenseCategories,
	extraTypes,
	otRates,
	settings,
	weekDays,
	weekDeductions,
	weekExtras,
	weekOt,
	weeks
} from './db/schema';
import { addDays, type IsoDate } from '#lib/dates.ts';
import { TEMPLATES, type ExtraKind, type TemplateId } from '#lib/templates.ts';
import type { SavedWeek, WeekRecord } from '#lib/week/form.ts';

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
	weekStartDay: number;
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
export function isDuplicateName(error: unknown): boolean {
	for (let e = error; e; e = (e as { cause?: unknown }).cause) {
		if ((e as { code?: string }).code === '23505') return true;
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

	// The id of this user's week starting on `weekStart`, as a subquery, so a save can
	// write the week and its rows in one batch without waiting for the id.
	const weekIdOf = (weekStart: IsoDate) =>
		sql<number>`(select ${weeks.id} from ${weeks} where ${weeks.userId} = ${userId} and ${weeks.weekStart} = ${weekStart})`;

	return {
		/**
		 * Everything the This Week screen needs, in one round trip: settings, the active list
		 * items, and any saved week that could contain `anchor` (it starts within the 6 days
		 * before it). The caller picks the week once it knows the week start day.
		 */
		async loadWeekPage(anchor: IsoDate) {
			const range = between(weeks.weekStart, addDays(anchor, -6), anchor);
			const weekIds = db
				.select({ id: weeks.id })
				.from(weeks)
				.where(and(eq(weeks.userId, userId), range));
			const active = <T extends typeof extraTypes | typeof otRates>(table: T) =>
				and(eq(table.userId, userId), eq(table.active, true));

			const [
				[general],
				deductions,
				extras,
				ot,
				saved,
				days,
				savedOt,
				savedDeductions,
				savedExtras
			] = await db.batch([
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
				db
					.select()
					.from(weeks)
					.where(and(eq(weeks.userId, userId), range)),
				db.select().from(weekDays).where(inArray(weekDays.weekId, weekIds)),
				db
					.select()
					.from(weekOt)
					.where(inArray(weekOt.weekId, weekIds))
					.orderBy(asc(weekOt.sortOrder)),
				db
					.select()
					.from(weekDeductions)
					.where(inArray(weekDeductions.weekId, weekIds))
					.orderBy(asc(weekDeductions.sortOrder)),
				db
					.select()
					.from(weekExtras)
					.where(inArray(weekExtras.weekId, weekIds))
					.orderBy(asc(weekExtras.sortOrder))
			]);

			const toSaved = (week: typeof weeks.$inferSelect): SavedWeek => ({
				currency: week.currency,
				netPay: week.netPay,
				notes: week.notes,
				updatedAt: week.updatedAt.toISOString(),
				days: days.filter((d) => d.weekId === week.id),
				deductions: savedDeductions.filter((d) => d.weekId === week.id),
				ot: savedOt.filter((o) => o.weekId === week.id),
				extras: savedExtras.filter((e) => e.weekId === week.id)
			});

			return {
				general: general ?? null,
				types: { deductions, extras, otRates: ot },
				saved: new Map(saved.map((week) => [week.weekStart, toSaved(week)]))
			};
		},

		/** Saves a week and all its rows in one transaction (one round trip). */
		async saveWeek(record: WeekRecord) {
			const weekId = weekIdOf(record.weekStart);
			const children = [
				[weekDays, record.days],
				[weekDeductions, record.deductions],
				[weekOt, record.ot],
				[weekExtras, record.extras]
			] as const;

			await batch([
				db
					.insert(weeks)
					.values({ ...record.summary, userId, weekStart: record.weekStart })
					.onConflictDoUpdate({
						target: [weeks.userId, weeks.weekStart],
						set: { ...record.summary, updatedAt: sql`now()` }
					}),
				// Replace the rows: simplest way to handle added, changed and removed lines.
				...children.map(([table]) => db.delete(table).where(eq(table.weekId, weekId))),
				...children
					.filter(([, rows]) => rows.length > 0)
					.map(([table, rows]) =>
						db
							.insert(table)
							.values(
								rows.map((row) => ({ ...row, weekId })) as unknown as (typeof table.$inferInsert)[]
							)
					)
			]);
		},

		/** Returns false if there was no saved week (or it isn't this user's). */
		async deleteWeek(weekStart: IsoDate) {
			const rows = await db
				.delete(weeks)
				.where(and(eq(weeks.userId, userId), eq(weeks.weekStart, weekStart)))
				.returning({ id: weeks.id });
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
