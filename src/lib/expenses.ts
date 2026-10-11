// Expenses: money going out. Validation and totals (pure); the queries live in
// #lib/server/queries.ts. Each expense is linked to its category (renames carry over) and
// keeps the category's name too, so a deleted category still shows; none = "Uncategorised".
import { addDays, isIsoDate, type IsoDate } from './dates.ts';
import { fromMinor, minorDigits, toMinor } from './format/money.ts';

export const MAX_NOTE = 200;
/** How far ahead a planned bill can be dated. */
export const MAX_DAYS_AHEAD = 366;
export const UNCATEGORISED = 'Uncategorised';
/** The form's category value for "keep the deleted category's saved name". */
export const KEPT = 'kept';

/** What the add / edit form holds (strings, as typed). */
export type ExpenseForm = {
	date: string;
	amount: string;
	/** null: no category. */
	categoryId: number | null;
	note: string;
};

export type ParsedExpense = {
	date: IsoDate;
	/** Minor units (pence, cents). */
	amount: number;
	categoryId: number | null;
	/** The category's name now, saved with the expense; null without a category. */
	categoryName: string | null;
	note: string | null;
};

export type ExpenseErrors = Partial<Record<keyof ExpenseForm, string>>;

/** The page's form state: the category is the chosen chip's value ("" none, or KEPT). */
export type ExpenseDraft = { amount: string; date: string; category: string; note: string };

/** A draft as parseExpense reads it. */
export const fromDraft = (draft: ExpenseDraft) => ({
	date: draft.date,
	amount: draft.amount,
	categoryId: draft.category === KEPT ? null : draft.category,
	note: draft.note
});

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * Checks an expense from the form (untrusted on the server). `categories` are the user's
 * categories (hidden ones too, so editing an old expense still works).
 */
export function parseExpense(
	raw: unknown,
	options: { today: IsoDate; currency: string; categories: { id: number; name: string }[] }
): { ok: true; value: ParsedExpense } | { ok: false; errors: ExpenseErrors } {
	const field = (key: string) =>
		raw && typeof raw === 'object' ? (raw as Record<string, unknown>)[key] : undefined;
	const errors: ExpenseErrors = {};

	const date = str(field('date'));
	const latest = addDays(options.today, MAX_DAYS_AHEAD);
	if (!isIsoDate(date) || date < '2000-01-01') errors.date = 'Pick a date.';
	else if (date > latest) errors.date = 'Pick a date within the next year.';

	const digits = minorDigits(options.currency);
	const text = str(field('amount')).replace(/[\s,]/g, '');
	const amount = text && !text.startsWith('-') ? toMinor(text, digits) : null;
	if (!text) errors.amount = 'Enter an amount.';
	else if (amount === null || amount > 1e12) {
		errors.amount = digits === 0 ? 'Use a whole number, like 500.' : 'Use an amount like 12.50.';
	} else if (amount <= 0) errors.amount = 'Enter an amount above zero.';

	const rawCategory = field('categoryId');
	const categoryId =
		rawCategory === null || rawCategory === undefined || rawCategory === ''
			? null
			: Number(rawCategory);
	const category = categoryId === null ? null : options.categories.find((c) => c.id === categoryId);
	if (categoryId !== null && !category) errors.categoryId = 'Pick a category from the list.';

	const note = str(field('note')).replace(/\s+/g, ' ');
	if (note.length > MAX_NOTE) errors.note = `Keep notes under ${MAX_NOTE} characters.`;

	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		value: {
			date,
			amount: amount!,
			categoryId: category?.id ?? null,
			categoryName: category?.name ?? null,
			note: note || null
		}
	};
}

/** Database values for a parsed expense (decimal strings, as numeric columns expect). */
export const toExpenseRecord = (value: ParsedExpense, currency: string) => ({
	date: value.date,
	amount: fromMinor(value.amount, minorDigits(currency)),
	currency,
	categoryId: value.categoryId,
	categoryName: value.categoryName,
	note: value.note
});

/** One saved expense as the queries return it (the category name is the current one). */
export type ExpenseRecord = {
	id: number;
	date: IsoDate;
	amount: string;
	currency: string;
	categoryId: number | null;
	categoryName: string | null;
	note: string | null;
};

export type ExpenseRow = Omit<ExpenseRecord, 'amount' | 'categoryName'> & {
	amount: number;
	categoryName: string;
	/** Dated after today: a planned bill. */
	upcoming: boolean;
};

export const toExpenseRow = (record: ExpenseRecord, today: IsoDate): ExpenseRow => ({
	...record,
	amount: toMinor(record.amount, minorDigits(record.currency)) ?? 0,
	categoryName: record.categoryName ?? UNCATEGORISED,
	upcoming: record.date > today
});

/** The form for an existing expense (for editing). */
export const toExpenseForm = (row: ExpenseRow): ExpenseForm => ({
	date: row.date,
	amount: fromMinor(row.amount, minorDigits(row.currency)),
	categoryId: row.categoryId,
	note: row.note ?? ''
});

/** Newest first: by date, then the most recently added. */
const newestFirst = (a: ExpenseRow, b: ExpenseRow) => b.date.localeCompare(a.date) || b.id - a.id;

export type DayGroup = { date: IsoDate; total: number; rows: ExpenseRow[] };

/** Expenses by day, newest day first, with day totals. */
export function groupByDay(rows: ExpenseRow[]): DayGroup[] {
	const days = new Map<IsoDate, ExpenseRow[]>();
	for (const row of [...rows].sort(newestFirst))
		days.set(row.date, [...(days.get(row.date) ?? []), row]);
	return [...days].map(([date, list]) => ({
		date,
		total: list.reduce((t, r) => t + r.amount, 0),
		rows: list
	}));
}

export type CategoryTotal = { key: string; name: string; total: number; count: number };

/**
 * Spending per category, largest first. Linked expenses group by their category (so a
 * renamed category stays one line); unlinked ones by their saved name; the rest together.
 */
export function categoryTotals(rows: ExpenseRow[]): CategoryTotal[] {
	const groups = new Map<string, CategoryTotal>();
	for (const row of rows) {
		const key =
			row.categoryId !== null
				? `id:${row.categoryId}`
				: row.categoryName === UNCATEGORISED
					? 'none'
					: `name:${row.categoryName.trim().toLowerCase()}`;
		const group = groups.get(key) ?? { key, name: row.categoryName, total: 0, count: 0 };
		group.total += row.amount;
		group.count += 1;
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export type SpendingTotals = {
	count: number;
	total: number;
	/** The part dated after today (planned bills); included in `total`. */
	upcoming: number;
};

export function spendingTotals(rows: ExpenseRow[]): SpendingTotals {
	return {
		count: rows.length,
		total: rows.reduce((t, r) => t + r.amount, 0),
		upcoming: rows.filter((r) => r.upcoming).reduce((t, r) => t + r.amount, 0)
	};
}
