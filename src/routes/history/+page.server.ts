import type { PageServerLoad } from './$types';
import { todayIn } from '#lib/dates.ts';
import { minorDigits, toMinor } from '#lib/format/money.ts';
import {
	buildEntries,
	groupByMonth,
	groupByYear,
	itemTotals,
	pickCurrency,
	pickYear,
	toRow,
	totals
} from '#lib/history.ts';
import { forUser } from '#lib/server/queries.ts';

// /history?year=2026&currency=GBP — one year at a time, by the month each payslip was paid.
// /history?year=all — all time, by year, each year linking to its own page.
export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const thisYear = Number(todayIn(cookies.get('tz')).slice(0, 4));
	const allTime = url.searchParams.get('year') === 'all';
	const asked = Number(url.searchParams.get('year'));
	const requested = Number.isInteger(asked) && asked >= 2000 && asked <= 2100 ? asked : null;

	const user = forUser(locals.user!.id);
	let data = await user.loadHistory(allTime ? null : (requested ?? thisYear));
	if (!data.general) return { needsSetup: true as const };
	// The asked-for year may have nothing (or nothing yet this year): show a year that does.
	const year = pickYear(data.years, requested, thisYear);
	if (!allTime && year !== (requested ?? thisYear)) data = await user.loadHistory(year);
	const general = data.general!;

	const rows = data.records.map(toRow);
	const currencies = [...new Set(rows.map((r) => r.currency))].sort();
	const currency = pickCurrency(rows, url.searchParams.get('currency'), general.currency);

	const inCurrency = rows.filter((r) => r.currency === currency);
	const before = data.before.map(toRow).find((r) => r.currency === currency) ?? null;
	// The usual rate is in the Settings currency, so it only flags payslips in that currency.
	const usualRate =
		currency && currency === general.currency && general.usualRate
			? toMinor(general.usualRate, minorDigits(currency))
			: null;
	const entries = buildEntries(inCurrency, {
		before,
		usualRate,
		tolerancePct: Number(general.rateTolerancePct)
	});

	return {
		needsSetup: false as const,
		year,
		allTime,
		years: [...new Set([thisYear, ...data.years])].sort((a, b) => b - a),
		currency: currency ?? general.currency,
		currencies,
		entries,
		months: allTime ? [] : groupByMonth(entries),
		yearGroups: allTime ? groupByYear(inCurrency) : [],
		yearTotals: totals(entries),
		deductionTotals: currency ? itemTotals(data.deductionTotals, currency) : [],
		extraTotals: currency ? itemTotals(data.extraTotals, currency) : []
	};
};
