// The in-progress This Week form, kept on this device as it's typed (PLAN.md §2a, rule 4),
// so a reload or a failed save never loses it. One draft per account and week.
import type { WeekForm } from './form.ts';

export type Draft = { savedAt: string; form: WeekForm };

const key = (owner: string, weekStart: string) => `slipside:week-draft:${owner}:${weekStart}`;

export function readDraft(owner: string, weekStart: string): Draft | null {
	try {
		const raw = localStorage.getItem(key(owner, weekStart));
		if (!raw) return null;
		const draft = JSON.parse(raw) as Draft;
		const form = draft?.form;
		// Ignore anything that doesn't look like this week's form (e.g. an older app version).
		const valid =
			form?.weekStart === weekStart &&
			typeof form.net === 'string' &&
			[form.deductions, form.ot, form.extras].every(Array.isArray) &&
			Array.isArray(form.days) &&
			form.days.length === 7;
		return valid ? draft : null;
	} catch {
		return null;
	}
}

export function writeDraft(owner: string, form: WeekForm) {
	try {
		const draft: Draft = { savedAt: new Date().toISOString(), form };
		localStorage.setItem(key(owner, form.weekStart), JSON.stringify(draft));
	} catch {
		// storage full or unavailable: the form still works, it just isn't kept
	}
}

export function clearDraft(owner: string, weekStart: string) {
	try {
		localStorage.removeItem(key(owner, weekStart));
	} catch {
		// storage unavailable: nothing to clear
	}
}
