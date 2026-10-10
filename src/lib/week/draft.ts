// The in-progress payslip form, kept on this device as it's typed (PLAN.md §2a, rule 4),
// so a reload or a failed save never loses it. One draft per account and payslip, keyed by
// where the payslip lives: a saved payslip's saved start, or a new payslip's start. A saved
// payslip's draft can hold new dates that aren't saved yet.
import { addDays, isIsoDate } from '#lib/dates.ts';
import { checkPeriod, dayCount } from '#lib/period.ts';
import type { WeekForm } from './form.ts';

export type Draft = { savedAt: string; form: WeekForm };

// The key still says "week" so drafts typed before pay periods are found.
const key = (owner: string, start: string) => `slipside:week-draft:${owner}:${start}`;

/** Drafts typed before pay periods had `weekStart` and seven days; give them start and end. */
function upgrade(form: Record<string, unknown>) {
	if (!('start' in form) && isIsoDate(form.weekStart)) {
		const { weekStart, ...rest } = form;
		return { ...rest, start: weekStart, end: addDays(weekStart, 6) };
	}
	return form;
}

export function readDraft(owner: string, start: string): Draft | null {
	try {
		const raw = localStorage.getItem(key(owner, start));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		const form = parsed?.form && upgrade(parsed.form);
		// Ignore anything that doesn't look like a payslip form (e.g. a much older app version).
		const valid =
			checkPeriod(form ?? {}, '9999-12-31') === null &&
			typeof form.net === 'string' &&
			[form.deductions, form.ot, form.extras].every(Array.isArray) &&
			Array.isArray(form.days) &&
			form.days.length === dayCount(form);
		return valid ? { savedAt: parsed.savedAt, form: form as WeekForm } : null;
	} catch {
		return null;
	}
}

export function writeDraft(owner: string, start: string, form: WeekForm) {
	try {
		const draft: Draft = { savedAt: new Date().toISOString(), form };
		localStorage.setItem(key(owner, start), JSON.stringify(draft));
	} catch {
		// storage full or unavailable: the form still works, it just isn't kept
	}
}

export function clearDraft(owner: string, start: string) {
	try {
		localStorage.removeItem(key(owner, start));
	} catch {
		// storage unavailable: nothing to clear
	}
}

/**
 * What was typed on a new payslip whose dates were just changed. The page moves to the new
 * dates and picks this up, so nothing typed is lost and no "restored" note is shown.
 */
export const carried: { form: WeekForm | null } = { form: null };
