import { describe, expect, it } from 'vitest';
import {
	buildEntries,
	groupByMonth,
	groupByYear,
	itemTotals,
	pickCurrency,
	pickYear,
	toRow,
	totals,
	type HistoryRecord
} from './history.ts';

const record = (over: Partial<HistoryRecord>): HistoryRecord => ({
	start: '2026-10-05',
	end: '2026-10-11',
	payDate: null,
	currency: 'GBP',
	netPay: '400.00',
	grossPay: '500.00',
	totalDeductions: '100.00',
	extrasTotal: '20.00',
	payFromHours: '480.00',
	regularHours: '40.00',
	otHours: '0.00',
	hourlyRate: '12.0000',
	...over
});

// Weekly payslips, a one-day payslip on Oct 15, and a week paid in the next month.
const sep = toRow(
	record({
		start: '2026-09-28',
		end: '2026-10-04',
		payDate: '2026-10-06',
		netPay: '380.00',
		hourlyRate: '11.5000'
	})
);
const week = toRow(record({}));
const oneDay = toRow(
	record({
		start: '2026-10-15',
		end: '2026-10-15',
		netPay: '95.00',
		grossPay: '110.00',
		totalDeductions: '15.00',
		extrasTotal: '0.00',
		payFromHours: '110.00',
		regularHours: '8.00',
		hourlyRate: '13.7500'
	})
);
const august = toRow(
	record({ start: '2026-08-24', end: '2026-08-30', netPay: '390.00', hourlyRate: '12.0000' })
);

describe('history rows', () => {
	it('reads stored totals into minor units and hours', () => {
		expect(week).toMatchObject({
			paid: '2026-10-11',
			days: 7,
			net: 40000,
			gross: 50000,
			deductions: 10000,
			extras: 2000,
			fromHours: 48000,
			regularHours: 40,
			otHours: 0,
			rate: 1200
		});
	});

	it('counts a payslip on its pay date, or its end date without one', () => {
		expect(sep.paid).toBe('2026-10-06');
		expect(week.paid).toBe('2026-10-11');
	});

	it('handles currencies without decimals and payslips without a rate', () => {
		const yen = toRow(record({ currency: 'JPY', netPay: '50000.00', hourlyRate: null }));
		expect(yen.net).toBe(50000);
		expect(yen.rate).toBeNull();
	});
});

describe('comparing with the previous payslip', () => {
	const entries = buildEntries([sep, oneDay, week], { usualRate: 1200, tolerancePct: 2 });

	it('lists newest first by pay date', () => {
		expect(entries.map((e) => e.start)).toEqual(['2026-10-15', '2026-10-05', '2026-09-28']);
	});

	it('shows the change in net and in rate', () => {
		const [, weekEntry] = entries;
		expect(weekEntry!.vsPrevious).toEqual({
			net: { amount: 2000, pct: (2000 / 38000) * 100 },
			rate: { amount: 50, pct: (50 / 1150) * 100 },
			differentLength: false
		});
	});

	it('marks payslips of different lengths, where net alone misleads', () => {
		const [dayEntry] = entries;
		expect(dayEntry!.vsPrevious!.net.amount).toBe(9500 - 40000);
		expect(dayEntry!.vsPrevious!.differentLength).toBe(true);
		expect(dayEntry!.vsPrevious!.rate!.amount).toBe(1375 - 1200);
	});

	it('compares the oldest with the payslip before the year, or nothing', () => {
		expect(entries.at(-1)!.vsPrevious).toBeNull();
		const withBefore = buildEntries([sep], { before: august, usualRate: null, tolerancePct: 2 });
		expect(withBefore[0]!.vsPrevious!.net.amount).toBe(38000 - 39000);
	});

	it('flags rates outside the tolerance, like the payslip page', () => {
		expect(entries.map((e) => e.rateCheck.status)).toEqual(['high', 'ok', 'low']);
		const noUsual = buildEntries([week], { usualRate: null, tolerancePct: 2 });
		expect(noUsual[0]!.rateCheck.status).toBe('unknown');
	});

	it('leaves the rate change out when a payslip has no rate', () => {
		const noRate = toRow(record({ start: '2026-10-12', end: '2026-10-18', hourlyRate: null }));
		const [latest] = buildEntries([week, noRate], { usualRate: null, tolerancePct: 2 });
		expect(latest!.vsPrevious!.rate).toBeNull();
	});
});

describe('totals and months', () => {
	it('adds up money and hours, with an hours-weighted average rate', () => {
		const t = totals([week, oneDay]);
		expect(t).toMatchObject({
			count: 2,
			net: 49500,
			gross: 61000,
			deductions: 11500,
			extras: 2000,
			fromHours: 59000,
			regularHours: 48,
			otHours: 0
		});
		// (1200 × 40 + 1375 × 8) / 48, so the one-day payslip counts for less.
		expect(t.averageRate).toBeCloseTo((1200 * 40 + 1375 * 8) / 48);
	});

	it('has no average rate when no payslip had one', () => {
		expect(totals([toRow(record({ hourlyRate: null }))]).averageRate).toBeNull();
		expect(totals([]).count).toBe(0);
	});

	it('groups by the month paid, newest month first', () => {
		const months = groupByMonth(
			buildEntries([august, sep, week, oneDay], { usualRate: null, tolerancePct: 2 })
		);
		expect(months.map((m) => [m.month, m.entries.length, m.totals.net])).toEqual([
			// The Sep 28 – Oct 4 week was paid on Oct 6, so it counts in October.
			['2026-10', 3, 38000 + 40000 + 9500],
			['2026-08', 1, 39000]
		]);
	});
});

describe('totals per deduction and extra', () => {
	it('reads one currency, largest first', () => {
		const records = [
			{ name: 'Pension', currency: 'GBP', total: '45.50', count: 3 },
			{ name: 'Income Tax (PAYE)', currency: 'GBP', total: '1204.80', count: 14 },
			{ name: 'SSS', currency: 'PHP', total: '900.00', count: 2 }
		];
		expect(itemTotals(records, 'GBP')).toEqual([
			{ name: 'Income Tax (PAYE)', total: 120480, count: 14 },
			{ name: 'Pension', total: 4550, count: 3 }
		]);
	});
});

describe('which year and currency to show', () => {
	it('shows the asked-for year, else this year, else the latest with payslips', () => {
		expect(pickYear([2026, 2025], 2025, 2026)).toBe(2025);
		expect(pickYear([2026, 2025], 2019, 2026)).toBe(2026);
		expect(pickYear([2025, 2024], null, 2026)).toBe(2025);
		expect(pickYear([], null, 2026)).toBe(2026);
		expect(pickYear([2025], 2026, 2026)).toBe(2026); // this year, even if empty so far
	});

	it('shows the asked-for currency, else Settings, else the most used', () => {
		const php = toRow(record({ currency: 'PHP' }));
		expect(pickCurrency([week, php], 'PHP', 'GBP')).toBe('PHP');
		expect(pickCurrency([week, php], 'USD', 'GBP')).toBe('GBP');
		expect(pickCurrency([php, php, week], null, 'USD')).toBe('PHP');
		expect(pickCurrency([], null, 'GBP')).toBeNull();
	});
});

describe('all time, by year', () => {
	it('totals each year payslips were paid in, newest first', () => {
		const dec = toRow(
			record({ start: '2025-12-29', end: '2026-01-04', payDate: '2025-12-31', netPay: '300.00' })
		);
		const older = toRow(record({ start: '2025-06-02', end: '2025-06-08', netPay: '350.00' }));
		const years = groupByYear([week, oneDay, dec, older]);
		expect(years.map((y) => [y.year, y.totals.count, y.totals.net])).toEqual([
			[2026, 2, 40000 + 9500],
			// Ends in January 2026 but was paid on Dec 31, so it counts in 2025.
			[2025, 2, 30000 + 35000]
		]);
	});
});
