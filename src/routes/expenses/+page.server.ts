import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isMonth, monthBounds, shiftMonth, todayIn } from '#lib/dates.ts';
import {
	KEPT,
	categoryTotals,
	groupByDay,
	monthSummary,
	parseExpense,
	spendingTotals,
	toExpenseRecord,
	toExpenseRow
} from '#lib/expenses.ts';
import { FormError, runAction } from '#lib/server/forms.ts';
import { forUser } from '#lib/server/queries.ts';

// /expenses?month=2026-10 — one month at a time (this month by default).
export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const today = todayIn(cookies.get('tz'));
	const thisMonth = today.slice(0, 7);
	const asked = url.searchParams.get('month');
	const month = isMonth(asked) ? asked : thisMonth;

	const data = await forUser(locals.user!.id).loadExpensesMonth(month);
	if (!data.general) return { needsSetup: true as const };

	const all = data.expenses.map((record) => toExpenseRow(record, today));
	// One currency at a time: the asked-for one, else Settings', else whatever the month has.
	const currencies = [...new Set(all.map((r) => r.currency))].sort();
	const askedCurrency = url.searchParams.get('currency');
	const currency =
		askedCurrency && currencies.includes(askedCurrency)
			? askedCurrency
			: currencies.length && !currencies.includes(data.general.currency)
				? currencies[0]!
				: data.general.currency;
	const rows = all.filter((r) => r.currency === currency);
	const totals = spendingTotals(rows);
	const inCurrency = <T extends { currency: string }>(list: T[]) =>
		list.find((row) => row.currency === currency) ?? null;

	// A new expense lands in the month being viewed: today in this month, else its last
	// (past) or first (future) day.
	const { from, to } = monthBounds(month);
	const defaultDate = month === thisMonth ? today : month < thisMonth ? to : from;

	return {
		needsSetup: false as const,
		month,
		thisMonth,
		previousMonth: shiftMonth(month, -1),
		nextMonth: shiftMonth(month, 1),
		today,
		defaultDate,
		currency,
		/** Shown when the month has expenses in more than one currency. */
		currencies,
		/** The quick-add chips: visible categories, in Settings order. */
		categories: data.categories.filter((c) => c.active).map(({ id, name }) => ({ id, name })),
		days: groupByDay(rows),
		totals,
		byCategory: categoryTotals(rows),
		/** Net pay received − spending, and last month's, for the summary slip. */
		summary: monthSummary(currency, totals, inCurrency(data.income), {
			spent: inCurrency(data.lastMonth.spent),
			income: inCurrency(data.lastMonth.income)
		})
	};
};

/**
 * The expense fields from a posted form. Category "kept" means: leave the saved name of a
 * deleted category as it is (there's no category to link to).
 */
const fields = (form: FormData) => ({
	date: form.get('date'),
	amount: form.get('amount'),
	categoryId: form.get('categoryId') === KEPT ? null : form.get('categoryId'),
	note: form.get('note')
});

export const actions: Actions = {
	add: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const today = todayIn(cookies.get('tz'));
		return runAction(async () => {
			const user = forUser(locals.user!.id);
			const { currency, categories } = await user.expenseContext();
			if (!currency) throw new FormError('Set up your pay in Settings first.');
			const parsed = parseExpense(fields(form), { today, currency, categories });
			if (!parsed.ok) throw new FormError(Object.values(parsed.errors)[0]!);
			await user.addExpense(toExpenseRecord(parsed.value, currency));
		}, 'Expense added.');
	},

	update: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id) || id <= 0) error(400, 'Unknown expense.');
		const today = todayIn(cookies.get('tz'));
		return runAction(async () => {
			const user = forUser(locals.user!.id);
			const [{ categories }, saved] = await Promise.all([
				user.expenseContext(),
				user.savedExpense(id)
			]);
			if (!saved) throw new FormError('That expense was deleted. Refresh the page.');
			const { currency } = saved;
			const parsed = parseExpense(fields(form), { today, currency, categories });
			if (!parsed.ok) throw new FormError(Object.values(parsed.errors)[0]!);
			if (form.get('categoryId') === KEPT) parsed.value.categoryName = saved.categoryName;
			const found = await user.updateExpense(id, toExpenseRecord(parsed.value, currency));
			if (!found) throw new FormError('That expense was deleted. Refresh the page.');
		}, 'Expense saved.');
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id) || id <= 0) error(400, 'Unknown expense.');
		return runAction(async () => {
			const found = await forUser(locals.user!.id).deleteExpense(id);
			if (!found) throw new FormError('That expense was already deleted.');
		}, 'Expense deleted.');
	}
};
