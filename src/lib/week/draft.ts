// The in-progress payslip form, kept on this device as it's typed (PLAN.md §2a, rule 4),
// so a reload or a failed save never loses it. One draft per account and period start date.
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
		// Ignore anything that doesn't look like this period's form (e.g. a much older app version).
		const valid =
			form?.start === start &&
			checkPeriod(form, '9999-12-31') === null &&
			typeof form.net === 'string' &&
			[form.deductions, form.ot, form.extras].every(Array.isArray) &&
			Array.isArray(form.days) &&
			form.days.length === dayCount(form);
		return valid ? { savedAt: parsed.savedAt, form: form as WeekForm } : null;
	} catch {
		return null;
	}
}

export function writeDraft(owner: string, form: WeekForm) {
	try {
		const draft: Draft = { savedAt: new Date().toISOString(), form };
		localStorage.setItem(key(owner, form.start), JSON.stringify(draft));
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
