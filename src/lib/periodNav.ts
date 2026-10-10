// Which pay period the payslip page shows, and where previous / next lead (pure, no database).
// URLs: "/" is the next payslip to fill in; "/?period=<start>" is a saved payslip, or a new one
// starting then; "&end=<end>" fixes a new payslip's end date (e.g. a gap shorter than usual).
import { addDays, isIsoDate, type IsoDate } from './dates.ts';
import {
	checkPeriod,
	contains,
	periodEndingOn,
	periodFrom,
	suggestNextPeriod,
	type PayLength,
	type Period
} from './period.ts';

/** A period to show or link to, and whether it's a saved payslip. */
export type Target = { period: Period; saved: boolean };

export type Resolution = Target | { redirect: string };

/** Where a target lives: a saved payslip by its start, a new one with its dates. */
export const periodHref = ({ period, saved }: Target) =>
	saved ? `/?period=${period.start}` : `/?period=${period.start}&end=${period.end}`;

/** Keeps a new period from running into the next saved payslip. */
function clipBefore(period: Period, saved: Period[]): Period {
	const following = saved.find((p) => p.start > period.start);
	return following && period.end >= following.start
		? { start: period.start, end: addDays(following.start, -1) }
		: period;
}

/**
 * The next payslip to fill in: the suggested period after the last saved payslip, or the last
 * payslip itself when the next one would start after today. `saved` is sorted by start; saved
 * payslips never overlap, so the last by start is also the last by end.
 */
export function defaultTarget(saved: Period[], length: PayLength, today: IsoDate): Target {
	const last = saved.at(-1) ?? null;
	// With nothing saved there is always a suggestion (the period ending today).
	const next = suggestNextPeriod(last?.end ?? null, length, today);
	return next ? { period: next, saved: false } : { period: last!, saved: true };
}

/**
 * The period for `?period=start&end=end`. A date inside a saved payslip redirects to that
 * payslip; a future or unreadable start redirects home. A new period uses `end` when it's
 * valid, else the usual length, and stops before the next saved payslip.
 */
export function resolveTarget(input: {
	saved: Period[];
	length: PayLength;
	today: IsoDate;
	start: string | null;
	end: string | null;
}): Resolution {
	const { saved, length, today, start, end } = input;
	if (start === null) return defaultTarget(saved, length, today);
	if (!isIsoDate(start) || start > today) return { redirect: '/' };

	const hit = saved.find((p) => contains(p, start));
	if (hit) {
		return hit.start === start
			? { period: hit, saved: true }
			: { redirect: periodHref({ period: hit, saved: true }) };
	}

	const wanted =
		end !== null && checkPeriod({ start, end }, today) === null
			? { start, end }
			: periodFrom(start, length);
	return { period: clipBefore(wanted, saved), saved: false };
}

/**
 * Previous: the saved payslip just before, or a new period filling the gap before this one
 * (the usual length, starting no earlier than the day after the payslip before it).
 * Next: the saved payslip just after, or a new period after this one; null when it would
 * start after today.
 */
export function neighbours(
	current: Period,
	saved: Period[],
	length: PayLength,
	today: IsoDate
): { previous: Target; next: Target | null } {
	const dayBefore = addDays(current.start, -1);
	const before = saved.filter((p) => p.end < current.start).at(-1);
	let previous: Target;
	if (before?.end === dayBefore) {
		previous = { period: before, saved: true };
	} else {
		const gap = periodEndingOn(dayBefore, length);
		const start = before && gap.start <= before.end ? addDays(before.end, 1) : gap.start;
		previous = { period: { start, end: dayBefore }, saved: false };
	}

	const dayAfter = addDays(current.end, 1);
	const after = saved.find((p) => p.start > current.end);
	let next: Target | null;
	if (after?.start === dayAfter) next = { period: after, saved: true };
	else if (dayAfter > today) next = null;
	else next = { period: clipBefore(periodFrom(dayAfter, length), saved), saved: false };

	return { previous, next };
}
