import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { reversePayslip } from '#lib/calc/reversePayslip.ts';
import { formatRange, isIsoDate, todayIn } from '#lib/dates.ts';
import { findOverlap } from '#lib/period.ts';
import { defaultTarget, neighbours, periodHref, resolveTarget } from '#lib/periodNav.ts';
import { FormError, runAction } from '#lib/server/forms.ts';
import { forUser, isPeriodClash } from '#lib/server/queries.ts';
import { parseWeek, toInput, toWeekRecord } from '#lib/week/form.ts';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Links from before pay periods: ?week=<start> is now ?period=<start>.
	const week = url.searchParams.get('week');
	if (week !== null) redirect(308, isIsoDate(week) ? `/?period=${week}` : '/');

	const today = todayIn(cookies.get('tz'));
	const user = forUser(locals.user!.id);
	const page = await user.loadPayslipPage();
	if (!page.general) return { needsSetup: true as const };

	const length = page.general.payLength;
	const target = resolveTarget({
		saved: page.periods,
		length,
		today,
		start: url.searchParams.get('period'),
		end: url.searchParams.get('end')
	});
	if ('redirect' in target) redirect(303, target.redirect);

	const { period } = target;
	const savedId = target.saved ? page.periods.find((p) => p.start === period.start)?.id : undefined;
	const saved = savedId === undefined ? null : await user.loadSavedPeriod(savedId);
	const { previous, next } = neighbours(period, page.periods, length, today);
	const home = defaultTarget(page.periods, length, today);

	return {
		needsSetup: false as const,
		period: { start: period.start, end: period.end },
		today,
		previousHref: periodHref(previous),
		nextHref: next && periodHref(next),
		/** A link back to the next payslip to fill in, when this isn't it. */
		homeHref: home.period.start === period.start ? null : '/',
		currency: page.general.currency,
		usualRate: page.general.usualRate,
		rateTolerancePct: Number(page.general.rateTolerancePct),
		types: page.types,
		saved
	};
};

export const actions: Actions = {
	save: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const today = todayIn(cookies.get('tz'));
		let moved: string | null = null;

		const result = await runAction(async () => {
			let payload: unknown;
			try {
				payload = JSON.parse(String(form.get('payload')));
			} catch {
				throw new FormError("Couldn't read the form. Refresh the page and try again.");
			}
			const parsed = parseWeek(payload, today);
			if (!parsed.ok) {
				throw new FormError(
					parsed.errors.period ?? 'Some fields need fixing. Check the highlighted ones.'
				);
			}
			const { week } = parsed;

			const user = forUser(locals.user!.id);
			const periods = await user.periodDates();
			// The saved payslip being edited, if it still exists (it may have been deleted elsewhere).
			const savedStart = form.get('savedStart');
			const editing = periods.find((p) => p.start === savedStart)?.start ?? null;
			const clash = findOverlap(week, periods, editing);
			if (clash) {
				throw new FormError(
					`These dates overlap your ${formatRange(clash.start, clash.end)} payslip. Pick other dates, or edit that payslip.`
				);
			}

			try {
				await user.savePeriod(toWeekRecord(week, reversePayslip(toInput(week))), editing);
			} catch (e) {
				// Another tab saved overlapping dates between the check above and this save.
				if (isPeriodClash(e)) {
					throw new FormError('These dates overlap another payslip. Refresh and try again.');
				}
				throw e;
			}
			if (editing && editing !== week.start) moved = week.start;
		}, 'Payslip saved.');

		// A saved payslip that now starts on another day lives at a new URL.
		if (moved) redirect(303, `/?period=${moved}`);
		return result;
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const start = form.get('start');
		if (!isIsoDate(start)) error(400, 'Unknown payslip.');
		return runAction(async () => {
			const found = await forUser(locals.user!.id).deletePeriod(start);
			if (!found) throw new FormError('That payslip was already deleted.');
		}, 'Payslip deleted.');
	}
};
