// History: past payslips, read from their stored totals (never recalculated), grouped by the
// month they were paid. Pure functions; the query lives in #lib/server/queries.ts.
import { checkRate, type RateCheck } from './calc/reversePayslip.ts';
import type { IsoDate } from './dates.ts';
import { minorDigits, toMinor } from './format/money.ts';
import { dayCount } from './period.ts';

/** One saved payslip's summary as the database returns it (numeric columns are strings). */
export type HistoryRecord = {
	start: IsoDate;
	end: IsoDate;
	payDate: IsoDate | null;
	currency: string;
	netPay: string;
	grossPay: string;
	totalDeductions: string;
	extrasTotal: string;
	payFromHours: string;
	regularHours: string;
	otHours: string;
	/** Major units per hour (4 places); null when the payslip had no rate. */
	hourlyRate: string | null;
};

/** The same payslip in numbers: money in minor units (pence, cents), hours as decimals. */
export type HistoryRow = {
	start: IsoDate;
	end: IsoDate;
	/** The day it counts on: its pay date, or its end date when none was given. */
	paid: IsoDate;
	days: number;
	currency: string;
	net: number;
	gross: number;
	deductions: number;
	extras: number;
	fromHours: number;
	regularHours: number;
	otHours: number;
	/** Minor units per hour, unrounded; null when there was no rate. */
	rate: number | null;
};

export function toRow(record: HistoryRecord): HistoryRow {
	const digits = minorDigits(record.currency);
	const money = (value: string) => toMinor(value, digits) ?? 0;
	return {
		start: record.start,
		end: record.end,
		paid: record.payDate ?? record.end,
		days: dayCount(record),
		currency: record.currency,
		net: money(record.netPay),
		gross: money(record.grossPay),
		deductions: money(record.totalDeductions),
		extras: money(record.extrasTotal),
		fromHours: money(record.payFromHours),
		regularHours: Number(record.regularHours),
		otHours: Number(record.otHours),
		rate: record.hourlyRate === null ? null : Number(record.hourlyRate) * 10 ** digits
	};
}

/** Newest first: by the day it was paid, then by start date. */
const newestFirst = (a: HistoryRow, b: HistoryRow) =>
	b.paid.localeCompare(a.paid) || b.start.localeCompare(a.start);

/** A change from the previous payslip: the amount, and the percentage when there's a base. */
export type Change = { amount: number; pct: number | null };

const change = (now: number, before: number): Change => ({
	amount: now - before,
	pct: before === 0 ? null : ((now - before) / Math.abs(before)) * 100
});

export type HistoryEntry = HistoryRow & {
	/** Compared with the payslip paid just before it (same currency); null for the first one. */
	vsPrevious: {
		net: Change;
		/** null when either payslip has no rate. */
		rate: Change | null;
		/** The two payslips cover different numbers of days, so net alone can mislead. */
		differentLength: boolean;
	} | null;
	/** Against the usual rate from Settings (only for payslips in the Settings currency). */
	rateCheck: RateCheck;
};

/**
 * Adds the comparison and the rate check to one currency's payslips, newest first.
 * `before` is the last payslip paid before these (e.g. in the previous year), so the oldest
 * one in the list still has something to compare with.
 */
export function buildEntries(
	rows: HistoryRow[],
	options: { before?: HistoryRow | null; usualRate: number | null; tolerancePct: number }
): HistoryEntry[] {
	const sorted = [...rows].sort(newestFirst);
	return sorted.map((row, i) => {
		const previous = sorted[i + 1] ?? options.before ?? null;
		return {
			...row,
			vsPrevious: previous
				? {
						net: change(row.net, previous.net),
						rate:
							row.rate === null || previous.rate === null ? null : change(row.rate, previous.rate),
						differentLength: row.days !== previous.days
					}
				: null,
			rateCheck: checkRate(row.rate, options.usualRate, options.tolerancePct)
		};
	});
}

export type Totals = {
	count: number;
	net: number;
	gross: number;
	deductions: number;
	extras: number;
	fromHours: number;
	regularHours: number;
	otHours: number;
	/**
	 * The average hourly rate, weighted by each payslip's hours (regular + overtime), so a
	 * long payslip counts for more than a one-day one. null when no payslip had a rate.
	 */
	averageRate: number | null;
};

export function totals(rows: HistoryRow[]): Totals {
	let weighted = 0;
	let weight = 0;
	const sum = (pick: (row: HistoryRow) => number) => rows.reduce((t, row) => t + pick(row), 0);
	for (const row of rows) {
		const hours = row.regularHours + row.otHours;
		if (row.rate !== null && hours > 0) {
			weighted += row.rate * hours;
			weight += hours;
		}
	}
	return {
		count: rows.length,
		net: sum((r) => r.net),
		gross: sum((r) => r.gross),
		deductions: sum((r) => r.deductions),
		extras: sum((r) => r.extras),
		fromHours: sum((r) => r.fromHours),
		// Rounded to 2 places like the stored values, so 0.1 + 0.2 shows as 0.3.
		regularHours: Math.round(sum((r) => r.regularHours) * 100) / 100,
		otHours: Math.round(sum((r) => r.otHours) * 100) / 100,
		averageRate: weight > 0 ? weighted / weight : null
	};
}

export type MonthGroup = {
	/** "2026-10" */
	month: string;
	totals: Totals;
	entries: HistoryEntry[];
};

/** Groups entries (newest first) by the month they were paid, newest month first. */
export function groupByMonth(entries: HistoryEntry[]): MonthGroup[] {
	const groups = new Map<string, HistoryEntry[]>();
	for (const entry of entries) {
		const month = entry.paid.slice(0, 7);
		groups.set(month, [...(groups.get(month) ?? []), entry]);
	}
	return [...groups]
		.sort(([a], [b]) => b.localeCompare(a))
		.map(([month, list]) => ({ month, totals: totals(list), entries: list }));
}

export type YearGroup = { year: number; totals: Totals };

/** Totals for each year payslips were paid in, newest year first (the all-time view). */
export function groupByYear(rows: HistoryRow[]): YearGroup[] {
	const groups = new Map<number, HistoryRow[]>();
	for (const row of rows) {
		const year = Number(row.paid.slice(0, 4));
		groups.set(year, [...(groups.get(year) ?? []), row]);
	}
	return [...groups]
		.sort(([a], [b]) => b - a)
		.map(([year, list]) => ({ year, totals: totals(list) }));
}

/** A deduction or extra added up over the shown range, as the database returns it. */
export type ItemTotalRecord = { name: string; currency: string; total: string; count: number };
export type ItemTotal = { name: string; total: number; count: number };

/** One currency's item totals in minor units, largest first. */
export function itemTotals(records: ItemTotalRecord[], currency: string): ItemTotal[] {
	const digits = minorDigits(currency);
	return records
		.filter((r) => r.currency === currency)
		.map((r) => ({ name: r.name, total: toMinor(r.total, digits) ?? 0, count: Number(r.count) }))
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/**
 * The year to show: the one asked for if it has payslips (or is this year), else this year
 * if it has any, else the latest year with payslips, else this year.
 */
export function pickYear(years: number[], requested: number | null, thisYear: number): number {
	if (requested !== null && (years.includes(requested) || requested === thisYear)) return requested;
	if (years.includes(thisYear) || years.length === 0) return thisYear;
	return Math.max(...years);
}

/**
 * The currency to show: the one asked for if that year has it, else the Settings currency if
 * it does, else the year's most used one. null when the year has no payslips.
 */
export function pickCurrency(
	rows: HistoryRow[],
	requested: string | null,
	settingsCurrency: string
): string | null {
	const counts = new Map<string, number>();
	for (const row of rows) counts.set(row.currency, (counts.get(row.currency) ?? 0) + 1);
	if (requested && counts.has(requested)) return requested;
	if (counts.has(settingsCurrency)) return settingsCurrency;
	const [top] = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	return top?.[0] ?? null;
}
