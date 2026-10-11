// Expenses: money going out. Validation and totals (pure); the queries live in
// #lib/server/queries.ts. Each expense is linked to its category (renames carry over) and
// keeps the category's name too, so a deleted category still shows; none = "Uncategorised".
import { addDays, isIsoDate, shiftMonth, type IsoDate } from './dates.ts';
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
	return addUpCategories(rows.map((row) => ({ ...row, count: 1 })));
}

/** Adds up per-category sums from the database (decimal strings) for one currency. */
export function mergeCategoryTotals(
	rows: {
		currency: string;
		categoryId: number | null;
		categoryName: string | null;
		total: string;
		count: number;
	}[],
	currency: string
): CategoryTotal[] {
	const digits = minorDigits(currency);
	return addUpCategories(
		rows
			.filter((row) => row.currency === currency)
			.map((row) => ({
				categoryId: row.categoryId,
				categoryName: row.categoryName ?? UNCATEGORISED,
				amount: toMinor(row.total, digits) ?? 0,
				count: row.count
			}))
	);
}

function addUpCategories(
	parts: { categoryId: number | null; categoryName: string; amount: number; count: number }[]
): CategoryTotal[] {
	const groups = new Map<string, CategoryTotal>();
	for (const part of parts) {
		const key =
			part.categoryId !== null
				? `id:${part.categoryId}`
				: part.categoryName === UNCATEGORISED
					? 'none'
					: `name:${part.categoryName.trim().toLowerCase()}`;
		const group = groups.get(key) ?? { key, name: part.categoryName, total: 0, count: 0 };
		group.total += part.amount;
		group.count += part.count;
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

/** A month's money in and out, as the summary slip shows it (minor units). */
export type MonthSummary = {
	/** Net pay of the payslips paid this month. */
	income: number;
	payslips: number;
	spent: number;
	/** Planned bills (dated after today), included in `spent`. */
	upcoming: number;
	/** Income − spent; negative when more went out than came in. */
	leftOver: number;
	/** Last month's figures, or null when it had neither payslips nor expenses. */
	lastMonth: { income: number; spent: number; leftOver: number } | null;
};

type SumRow = { total: string; count: number } | null;

/** Builds the summary from the month query's sums (decimal strings) and the month's rows. */
export function monthSummary(
	currency: string,
	totals: SpendingTotals,
	income: SumRow,
	lastMonth: { spent: SumRow; income: SumRow }
): MonthSummary {
	const digits = minorDigits(currency);
	const minor = (row: SumRow) => (row ? (toMinor(row.total, digits) ?? 0) : 0);
	const inThisMonth = minor(income);
	const lastIncome = minor(lastMonth.income);
	const lastSpent = minor(lastMonth.spent);
	return {
		income: inThisMonth,
		payslips: income?.count ?? 0,
		spent: totals.total,
		upcoming: totals.upcoming,
		leftOver: inThisMonth - totals.total,
		lastMonth:
			lastMonth.spent || lastMonth.income
				? { income: lastIncome, spent: lastSpent, leftOver: lastIncome - lastSpent }
				: null
	};
}

// --- Year and All time ---

/** One month's sums from the database (decimal strings), per currency. */
type MonthSum = { month: string; currency: string; total: string; count: number };

export type MonthPoint = {
	/** "2026-10" */
	month: string;
	spent: number;
	count: number;
	/** Planned bills (dated after today), included in `spent`. */
	upcoming: number;
	/** Net pay of the payslips paid that month. */
	income: number;
	payslips: number;
	leftOver: number;
};

/**
 * Every month from `from` to `to` (both "YYYY-MM"), with what was spent and received in
 * `currency`; months with nothing are zero, so the chart's line doesn't skip them.
 */
export function buildMonths(
	currency: string,
	spent: (MonthSum & { upcoming: string })[],
	income: MonthSum[],
	range: { from: string; to: string }
): MonthPoint[] {
	const digits = minorDigits(currency);
	const minor = (value: string) => toMinor(value, digits) ?? 0;
	const out: MonthPoint[] = [];
	for (let month = range.from; month <= range.to; month = shiftMonth(month, 1)) {
		const s = spent.find((r) => r.month === month && r.currency === currency);
		const i = income.find((r) => r.month === month && r.currency === currency);
		const point = {
			month,
			spent: s ? minor(s.total) : 0,
			count: s?.count ?? 0,
			upcoming: s ? minor(s.upcoming) : 0,
			income: i ? minor(i.total) : 0,
			payslips: i?.count ?? 0
		};
		out.push({ ...point, leftOver: point.income - point.spent });
	}
	return out;
}

/**
 * The months to show. A year: January to December for a past year; this year runs to this
 * month (or later, when bills are planned). All time: the first month with anything in
 * `currency` to the last (at least this month). Null when there's nothing at all.
 */
export function monthRange(
	year: number | null,
	thisMonth: string,
	months: { month: string; currency: string }[],
	currency: string
): { from: string; to: string } | null {
	const used = months
		.filter((r) => r.currency === currency)
		.map((r) => r.month)
		.sort();
	const last = used.at(-1);
	if (year === null) {
		if (!used.length) return null;
		return { from: used[0]!, to: last! > thisMonth ? last! : thisMonth };
	}
	const from = `${year}-01`;
	const inYear = used.filter((m) => m.startsWith(`${year}-`)).at(-1);
	const thisYear = Number(thisMonth.slice(0, 4));
	if (year < thisYear) return { from, to: `${year}-12` };
	if (year === thisYear) return { from, to: inYear && inYear > thisMonth ? inYear : thisMonth };
	return inYear ? { from, to: inYear } : null;
}

export type YearGroup = {
	year: number;
	spent: number;
	income: number;
	leftOver: number;
	count: number;
	upcoming: number;
};

/** Months added up per year, newest year first. */
export function groupMonthsByYear(points: MonthPoint[]): YearGroup[] {
	const years = new Map<number, YearGroup>();
	for (const p of points) {
		const year = Number(p.month.slice(0, 4));
		const g = years.get(year) ?? { year, spent: 0, income: 0, leftOver: 0, count: 0, upcoming: 0 };
		g.spent += p.spent;
		g.income += p.income;
		g.leftOver += p.leftOver;
		g.count += p.count;
		g.upcoming += p.upcoming;
		years.set(year, g);
	}
	return [...years.values()].sort((a, b) => b.year - a.year);
}

/** A range's months as one summary, in the slip's shape (no comparison). */
export function rangeSummary(points: MonthPoint[]): MonthSummary {
	const sum = (pick: (p: MonthPoint) => number) => points.reduce((t, p) => t + pick(p), 0);
	return {
		income: sum((p) => p.income),
		payslips: sum((p) => p.payslips),
		spent: sum((p) => p.spent),
		upcoming: sum((p) => p.upcoming),
		leftOver: sum((p) => p.leftOver),
		lastMonth: null
	};
}
