// Pay periods: a payslip covers `start` to `end`, both included, 1 to MAX_PERIOD_DAYS days.
// Settings' usual length only suggests dates for a new payslip; any payslip can use other
// dates, as long as it doesn't overlap another payslip or start after today.
import { addDays, addMonths, datesBetween, daysBetween, isIsoDate, type IsoDate } from './dates.ts';

export const PAY_LENGTHS = ['day', 'week', 'fortnight', 'month'] as const;
export type PayLength = (typeof PAY_LENGTHS)[number];

export const isPayLength = (value: unknown): value is PayLength =>
	PAY_LENGTHS.includes(value as PayLength);

/** For the Settings question "How often are you usually paid?" */
export const PAY_LENGTH_LABELS: Record<PayLength, string> = {
	day: 'Every day',
	week: 'Every week',
	fortnight: 'Every 2 weeks',
	month: 'Every month'
};

export const MAX_PERIOD_DAYS = 62;

export type Period = { start: IsoDate; end: IsoDate };

export const dayCount = (period: Period) => daysBetween(period.start, period.end) + 1;
export const periodDates = (period: Period) => datesBetween(period.start, period.end);
export const contains = (period: Period, date: IsoDate) =>
	period.start <= date && date <= period.end;

/**
 * The period of `length` starting on `start`. A month runs to the day before the same date
 * next month (Mar 1 → Mar 31, Oct 16 → Nov 15); from the 29th–31st it can be a few days short.
 */
export function periodFrom(start: IsoDate, length: PayLength): Period {
	const end = {
		day: start,
		week: addDays(start, 6),
		fortnight: addDays(start, 13),
		month: addDays(addMonths(start, 1), -1)
	}[length];
	return { start, end };
}

/** The period of `length` ending on `end`; used for a first payslip (the period ending today). */
export function periodEndingOn(end: IsoDate, length: PayLength): Period {
	const start = {
		day: end,
		week: addDays(end, -6),
		fortnight: addDays(end, -13),
		month: addDays(addMonths(end, -1), 1)
	}[length];
	return { start, end };
}

/**
 * The dates a new payslip suggests: from the day after the last saved payslip ends, for the
 * usual length. With no saved payslips, the period ending today. null when the last payslip
 * already runs past today, since a new one would start in the future.
 */
export function suggestNextPeriod(
	lastEnd: IsoDate | null,
	length: PayLength,
	today: IsoDate
): Period | null {
	if (lastEnd === null) return periodEndingOn(today, length);
	const start = addDays(lastEnd, 1);
	return start > today ? null : periodFrom(start, length);
}

/** Quick picks in the Change dates sheet. */
export const PRESETS = [
	{ id: 'today', label: 'Just today' },
	{ id: 'week', label: '1 week' },
	{ id: 'fortnight', label: '2 weeks' },
	{ id: 'month', label: '1 month' }
] as const;
export type PresetId = (typeof PRESETS)[number]['id'];

/** "Just today" is today only; the others keep the current start and set the length. */
export const applyPreset = (preset: PresetId, start: IsoDate, today: IsoDate): Period =>
	preset === 'today' ? { start: today, end: today } : periodFrom(start, preset);

export type PeriodProblem = 'invalid' | 'end-before-start' | 'too-long' | 'starts-in-future';

export const PERIOD_MESSAGES: Record<PeriodProblem, string> = {
	invalid: 'Pick a start and end date.',
	'end-before-start': "The end date can't be before the start date.",
	'too-long': `A payslip can cover up to ${MAX_PERIOD_DAYS} days.`,
	'starts-in-future': "A payslip can't start after today."
};

/** What's wrong with these dates, or null. The end may be after today (a period in progress). */
export function checkPeriod(
	period: { start: unknown; end: unknown },
	today: IsoDate
): PeriodProblem | null {
	const { start, end } = period;
	if (!isIsoDate(start) || !isIsoDate(end)) return 'invalid';
	if (end < start) return 'end-before-start';
	if (dayCount({ start, end }) > MAX_PERIOD_DAYS) return 'too-long';
	if (start > today) return 'starts-in-future';
	return null;
}

/** True when the two periods share at least one day. Back-to-back periods don't overlap. */
export const overlaps = (a: Period, b: Period) => a.start <= b.end && b.start <= a.end;

/**
 * The first saved period that `period` overlaps, or null. `editingStart` is the saved start
 * of the payslip being edited, so it isn't compared with itself while its dates change.
 */
export function findOverlap(
	period: Period,
	saved: Period[],
	editingStart: IsoDate | null = null
): Period | null {
	return saved.find((other) => other.start !== editingStart && overlaps(period, other)) ?? null;
}

/** The dates from `dates` that fall outside `period`, e.g. days with hours a shorter period would drop. */
export const datesOutside = (period: Period, dates: IsoDate[]) =>
	dates.filter((date) => !contains(period, date));
