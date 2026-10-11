import type { PageServerLoad } from './$types';
import { todayIn } from '#lib/dates.ts';
import {
	buildMonths,
	groupMonthsByYear,
	mergeCategoryTotals,
	monthRange,
	rangeSummary
} from '#lib/expenses.ts';
import { forUser } from '#lib/server/queries.ts';

// /expenses/overview?year=2026 — a year of spending, month by month.
// /expenses/overview?year=all — all time, by year, each year linking to its own page.
export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const today = todayIn(cookies.get('tz'));
	const thisMonth = today.slice(0, 7);
	const thisYear = Number(today.slice(0, 4));
	const allTime = url.searchParams.get('year') === 'all';
	const asked = Number(url.searchParams.get('year'));
	const year = Number.isInteger(asked) && asked >= 2000 && asked <= 2100 ? asked : thisYear;

	const data = await forUser(locals.user!.id).loadExpensesRange(allTime ? null : year, today);
	if (!data.general) return { needsSetup: true as const };

	// One currency at a time: the asked-for one, else Settings', else whatever was spent in.
	const currencies = [...new Set(data.spent.map((r) => r.currency))].sort();
	const askedCurrency = url.searchParams.get('currency');
	const currency =
		askedCurrency && currencies.includes(askedCurrency)
			? askedCurrency
			: currencies.length && !currencies.includes(data.general.currency)
				? currencies[0]!
				: data.general.currency;

	const range = monthRange(
		allTime ? null : year,
		thisMonth,
		[...data.spent, ...data.income],
		currency
	);
	const months = range ? buildMonths(currency, data.spent, data.income, range) : [];

	return {
		needsSetup: false as const,
		allTime,
		year,
		thisYear,
		thisMonth,
		years: [...new Set([thisYear, ...data.years])].sort((a, b) => b - a),
		currency,
		currencies,
		months,
		yearGroups: allTime ? groupMonthsByYear(months) : [],
		summary: rangeSummary(months),
		byCategory: mergeCategoryTotals(data.byCategory, currency)
	};
};
