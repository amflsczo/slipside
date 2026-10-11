import { describe, expect, it } from 'vitest';
import {
	categoryTotals,
	buildMonths,
	groupByDay,
	groupMonthsByYear,
	mergeCategoryTotals,
	monthRange,
	rangeSummary,
	monthSummary,
	parseExpense,
	spendingTotals,
	toExpenseForm,
	toExpenseRecord,
	toExpenseRow,
	type ExpenseRecord
} from './expenses.ts';

const categories = [
	{ id: 1, name: 'Groceries' },
	{ id: 2, name: 'Transport' }
];
const options = { today: '2026-10-11', currency: 'GBP', categories };
const form = (over: Record<string, unknown> = {}) => ({
	date: '2026-10-11',
	amount: '12.40',
	categoryId: 1,
	note: '',
	...over
});

describe('checking an expense', () => {
	it('turns the form into a clean expense', () => {
		const result = parseExpense(form({ note: '  Tesco   run ' }), options);
		expect(result).toEqual({
			ok: true,
			value: {
				date: '2026-10-11',
				amount: 1240,
				categoryId: 1,
				categoryName: 'Groceries',
				note: 'Tesco run'
			}
		});
	});

	it('allows no category, thousands separators and planned bills up to a year ahead', () => {
		const result = parseExpense(
			form({ categoryId: null, amount: '1,250.00', date: '2027-10-11' }),
			options
		);
		expect(result.ok && result.value).toMatchObject({
			amount: 125000,
			categoryId: null,
			categoryName: null
		});
	});

	it('reports each problem against its field', () => {
		const result = parseExpense(
			{ date: '2027-12-01', amount: '-5', categoryId: 9, note: 'x'.repeat(201) },
			options
		);
		expect(!result.ok && result.errors).toEqual({
			date: 'Pick a date within the next year.',
			amount: 'Use an amount like 12.50.',
			categoryId: 'Pick a category from the list.',
			note: 'Keep notes under 200 characters.'
		});
	});

	it('needs an amount above zero, and a real date', () => {
		expect(parseExpense(form({ amount: '' }), options)).toMatchObject({
			ok: false,
			errors: { amount: 'Enter an amount.' }
		});
		expect(parseExpense(form({ amount: '0' }), options)).toMatchObject({
			ok: false,
			errors: { amount: 'Enter an amount above zero.' }
		});
		expect(parseExpense(form({ date: '2026-02-30' }), options)).toMatchObject({
			ok: false,
			errors: { date: 'Pick a date.' }
		});
	});

	it('follows the currency’s decimals', () => {
		const yen = { ...options, currency: 'JPY' };
		expect(parseExpense(form({ amount: '500' }), yen)).toMatchObject({
			ok: true,
			value: { amount: 500 }
		});
		expect(parseExpense(form({ amount: '500.5' }), yen)).toMatchObject({
			ok: false,
			errors: { amount: 'Use a whole number, like 500.' }
		});
	});

	it('stores decimal strings with the currency', () => {
		const result = parseExpense(form(), options);
		if (!result.ok) throw new Error('expected a valid expense');
		expect(toExpenseRecord(result.value, 'GBP')).toEqual({
			date: '2026-10-11',
			amount: '12.40',
			currency: 'GBP',
			categoryId: 1,
			categoryName: 'Groceries',
			note: null
		});
	});
});

const record = (over: Partial<ExpenseRecord>): ExpenseRecord => ({
	id: 1,
	date: '2026-10-11',
	amount: '10.00',
	currency: 'GBP',
	categoryId: 1,
	categoryName: 'Groceries',
	note: null,
	...over
});
const today = '2026-10-11';
const rows = [
	record({ id: 1, date: '2026-10-11', amount: '12.40' }),
	record({ id: 2, date: '2026-10-11', amount: '6.50', categoryId: 2, categoryName: 'Transport' }),
	record({ id: 3, date: '2026-10-10', amount: '35.00', categoryId: 1, categoryName: 'Groceries' }),
	// Its category was deleted: the link is gone, the saved name stays.
	record({ id: 4, date: '2026-10-09', amount: '20.00', categoryId: null, categoryName: 'Gym' }),
	record({ id: 5, date: '2026-10-02', amount: '4.00', categoryId: null, categoryName: null }),
	// Rent planned for later this month.
	record({ id: 6, date: '2026-10-28', amount: '550.00', categoryId: null, categoryName: 'Rent' })
].map((r) => toExpenseRow(r, today));

describe('expense rows', () => {
	it('reads amounts in minor units, names "Uncategorised" and marks planned bills', () => {
		expect(rows[0]).toMatchObject({ amount: 1240, upcoming: false });
		expect(rows[4]!.categoryName).toBe('Uncategorised');
		expect(rows[5]!.upcoming).toBe(true);
	});

	it('round-trips to the edit form', () => {
		expect(toExpenseForm(rows[0]!)).toEqual({
			date: '2026-10-11',
			amount: '12.40',
			categoryId: 1,
			note: ''
		});
	});
});

describe('totals', () => {
	it('groups by day, newest first, with day totals', () => {
		expect(groupByDay(rows).map((d) => [d.date, d.total, d.rows.map((r) => r.id)])).toEqual([
			['2026-10-28', 55000, [6]],
			['2026-10-11', 1890, [2, 1]],
			['2026-10-10', 3500, [3]],
			['2026-10-09', 2000, [4]],
			['2026-10-02', 400, [5]]
		]);
	});

	it('totals each category, keeping linked ones together and naming the rest', () => {
		expect(categoryTotals(rows).map((c) => [c.name, c.total, c.count])).toEqual([
			['Rent', 55000, 1],
			['Groceries', 4740, 2],
			['Gym', 2000, 1],
			['Transport', 650, 1],
			['Uncategorised', 400, 1]
		]);
	});

	it('keeps a renamed category on one line (it groups by the link)', () => {
		const renamed = [
			toExpenseRow(record({ id: 7, categoryId: 1, categoryName: 'Food' }), today),
			toExpenseRow(record({ id: 8, categoryId: 1, categoryName: 'Food' }), today)
		];
		expect(categoryTotals(renamed)).toEqual([{ key: 'id:1', name: 'Food', total: 2000, count: 2 }]);
	});

	it('adds up the month, including how much is still upcoming', () => {
		expect(spendingTotals(rows)).toEqual({
			count: 6,
			total: 1240 + 650 + 3500 + 2000 + 400 + 55000,
			upcoming: 55000
		});
	});
});

describe('the month summary', () => {
	const totals = { count: 3, total: 60000, upcoming: 55000 };
	it('takes spending away from net pay received', () => {
		expect(
			monthSummary(
				'GBP',
				totals,
				{ total: '837.60', count: 2 },
				{ spent: { total: '410.00', count: 9 }, income: { total: '401.00', count: 1 } }
			)
		).toEqual({
			income: 83760,
			payslips: 2,
			spent: 60000,
			upcoming: 55000,
			leftOver: 23760,
			lastMonth: { income: 40100, spent: 41000, leftOver: -900 }
		});
	});

	it('works with no payslips paid, and nothing last month', () => {
		const summary = monthSummary('JPY', { count: 1, total: 500, upcoming: 0 }, null, {
			spent: null,
			income: null
		});
		expect(summary).toMatchObject({ income: 0, payslips: 0, leftOver: -500, lastMonth: null });
	});
});

describe('year and all time', () => {
	const spent = [
		{ month: '2026-09', currency: 'GBP', total: '18.00', upcoming: '0', count: 1 },
		{ month: '2026-10', currency: 'GBP', total: '682.39', upcoming: '550.00', count: 5 },
		{ month: '2025-12', currency: 'GBP', total: '40.00', upcoming: '0', count: 2 },
		{ month: '2026-08', currency: 'PHP', total: '500.00', upcoming: '0', count: 1 }
	];
	const income = [
		{ month: '2026-10', currency: 'GBP', total: '932.60', count: 3 },
		{ month: '2026-07', currency: 'GBP', total: '400.00', count: 1 }
	];

	it('runs a year from January, to this month or a later planned bill', () => {
		expect(monthRange(2026, '2026-10', spent, 'GBP')).toEqual({ from: '2026-01', to: '2026-10' });
		expect(monthRange(2025, '2026-10', spent, 'GBP')).toEqual({ from: '2025-01', to: '2025-12' });
		const planned = [...spent, { month: '2026-12', currency: 'GBP' }];
		expect(monthRange(2026, '2026-10', planned, 'GBP')).toEqual({ from: '2026-01', to: '2026-12' });
		expect(monthRange(2027, '2026-10', spent, 'GBP')).toBeNull();
	});

	it('runs all time from the first month with anything in the currency', () => {
		expect(monthRange(null, '2026-10', [...spent, ...income], 'GBP')).toEqual({
			from: '2025-12',
			to: '2026-10'
		});
		expect(monthRange(null, '2026-10', [], 'GBP')).toBeNull();
	});

	it('fills every month, with what was spent and received', () => {
		const months = buildMonths('GBP', spent, income, { from: '2026-07', to: '2026-10' });
		expect(months.map((m) => [m.month, m.spent, m.income, m.leftOver])).toEqual([
			['2026-07', 0, 40000, 40000],
			['2026-08', 0, 0, 0],
			['2026-09', 1800, 0, -1800],
			['2026-10', 68239, 93260, 25021]
		]);
		expect(months[3]).toMatchObject({ count: 5, upcoming: 55000, payslips: 3 });
	});

	it('adds months up by year, and into one summary', () => {
		const months = buildMonths('GBP', spent, income, { from: '2025-12', to: '2026-10' });
		expect(groupMonthsByYear(months).map((y) => [y.year, y.spent, y.income, y.count])).toEqual([
			[2026, 70039, 133260, 6],
			[2025, 4000, 0, 2]
		]);
		expect(rangeSummary(months)).toEqual({
			income: 133260,
			payslips: 4,
			spent: 74039,
			upcoming: 55000,
			leftOver: 59221,
			lastMonth: null
		});
	});

	it('merges category sums, keeping deleted categories by name', () => {
		expect(
			mergeCategoryTotals(
				[
					{ currency: 'GBP', categoryId: 1, categoryName: 'Food', total: '10.00', count: 2 },
					{ currency: 'GBP', categoryId: null, categoryName: 'Gym', total: '20.00', count: 1 },
					{ currency: 'GBP', categoryId: null, categoryName: 'gym ', total: '5.00', count: 1 },
					{ currency: 'GBP', categoryId: null, categoryName: null, total: '1.00', count: 1 },
					{ currency: 'PHP', categoryId: 1, categoryName: 'Food', total: '99.00', count: 1 }
				],
				'GBP'
			)
		).toEqual([
			{ key: 'name:gym', name: 'Gym', total: 2500, count: 2 },
			{ key: 'id:1', name: 'Food', total: 1000, count: 2 },
			{ key: 'none', name: 'Uncategorised', total: 100, count: 1 }
		]);
	});
});
