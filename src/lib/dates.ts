// Calendar dates as plain "YYYY-MM-DD" strings. The maths runs in UTC so a date never
// shifts by a day because of the server's or the browser's time zone.
export type IsoDate = string;

const toUtc = (iso: IsoDate) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date): IsoDate => date.toISOString().slice(0, 10);

export const isIsoDate = (value: unknown): value is IsoDate =>
	typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(toUtc(value)) === value;

/** Today's date in the given time zone (from the tz cookie); UTC when unknown. */
export function todayIn(timeZone?: string, now = new Date()): IsoDate {
	try {
		// en-CA formats as YYYY-MM-DD.
		return new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(now);
	} catch {
		return toIso(now);
	}
}

export function addDays(iso: IsoDate, days: number): IsoDate {
	const date = toUtc(iso);
	date.setUTCDate(date.getUTCDate() + days);
	return toIso(date);
}

/** The same day `months` later (or earlier), clamped to that month's last day: Jan 31 + 1 → Feb 28. */
export function addMonths(iso: IsoDate, months: number): IsoDate {
	const date = toUtc(iso);
	const day = date.getUTCDate();
	date.setUTCDate(1);
	date.setUTCMonth(date.getUTCMonth() + months);
	const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
	date.setUTCDate(Math.min(day, lastDay));
	return toIso(date);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export const daysBetween = (from: IsoDate, to: IsoDate) =>
	Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);

/** Every date from `start` to `end`, both included; empty when `end` is before `start`. */
export const datesBetween = (start: IsoDate, end: IsoDate) =>
	Array.from({ length: Math.max(0, daysBetween(start, end) + 1) }, (_, i) => addDays(start, i));

const rangeFormat = new Intl.DateTimeFormat('en', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC'
});

/** "Oct 6 – 12, 2026", "Sep 29 – Oct 5, 2026", "Dec 29, 2025 – Jan 4, 2026". */
export const formatRange = (start: IsoDate, end: IsoDate) =>
	rangeFormat.formatRange(toUtc(start), toUtc(end));

const weekdayFormat = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' });

const monthFormat = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });

/** { weekday: "Mon", day: 6, month: "Oct" } for the hours grid. */
export const dayLabel = (iso: IsoDate) => ({
	weekday: weekdayFormat.format(toUtc(iso)),
	day: toUtc(iso).getUTCDate(),
	month: monthFormat.format(toUtc(iso))
});

const shortFormat = new Intl.DateTimeFormat('en', {
	month: 'short',
	day: 'numeric',
	timeZone: 'UTC'
});

/** "Oct 12" */
export const shortDate = (iso: IsoDate) => shortFormat.format(toUtc(iso));
