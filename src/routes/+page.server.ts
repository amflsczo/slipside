import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { reversePayslip } from '#lib/calc/reversePayslip.ts';
import { addDays, isIsoDate, todayIn, weekStartFor } from '#lib/dates.ts';
import { FormError, runAction } from '#lib/server/forms.ts';
import { forUser } from '#lib/server/queries.ts';
import { parseWeek, toInput, toWeekRecord } from '#lib/week/form.ts';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const today = todayIn(cookies.get('tz'));
	const param = url.searchParams.get('week');
	if (param !== null && !isIsoDate(param)) redirect(303, '/');
	const anchor = param ?? today;

	const page = await forUser(locals.user!.id).loadWeekPage(anchor);
	if (!page.general) return { needsSetup: true as const };

	const startDay = page.general.weekStartDay;
	const currentWeek = weekStartFor(today, startDay);
	// A week saved under an older week start day stays reachable by its exact date.
	const weekStart = param && page.saved.has(param) ? param : weekStartFor(anchor, startDay);
	if (param !== null && param !== weekStart) redirect(303, `/?week=${weekStart}`);

	return {
		needsSetup: false as const,
		weekStart,
		currentWeek,
		previousWeek: addDays(weekStart, -7),
		nextWeek: weekStart < currentWeek ? addDays(weekStart, 7) : null,
		currency: page.general.currency,
		usualRate: page.general.usualRate,
		rateTolerancePct: Number(page.general.rateTolerancePct),
		types: page.types,
		saved: page.saved.get(weekStart) ?? null
	};
};

export const actions: Actions = {
	save: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const today = todayIn(cookies.get('tz'));
		return runAction(async () => {
			let payload: unknown;
			try {
				payload = JSON.parse(String(form.get('payload')));
			} catch {
				throw new FormError("Couldn't read the form. Refresh the page and try again.");
			}
			const parsed = parseWeek(payload, today);
			if (!parsed.ok) throw new FormError('Some fields need fixing. Check the highlighted ones.');
			const payslip = reversePayslip(toInput(parsed.week));
			await forUser(locals.user!.id).saveWeek(toWeekRecord(parsed.week, payslip));
		}, 'Week saved.');
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const weekStart = form.get('weekStart');
		if (!isIsoDate(weekStart)) error(400, 'Unknown week.');
		return runAction(async () => {
			const found = await forUser(locals.user!.id).deleteWeek(weekStart);
			if (!found) throw new FormError('That week was already deleted.');
		}, 'Week deleted.');
	}
};
