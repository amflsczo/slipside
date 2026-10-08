import { describe, expect, it } from 'vitest';
import { balances, checkRate, reversePayslip, type WeekInput } from './reversePayslip.ts';
import { toMinor } from '../format/money.ts';

const week = (overrides: Partial<WeekInput>): WeekInput => ({
	net: 0,
	deductions: [],
	dayHours: [],
	ot: [],
	extras: [],
	...overrides
});

describe('reversePayslip', () => {
	it('works out a normal week with deductions, OT and a per-day extra', () => {
		const result = reversePayslip(
			week({
				net: 50000,
				deductions: [
					{ name: 'Tax', amount: 8000 },
					{ name: 'Insurance', amount: 3000 }
				],
				dayHours: [8, 8, 8, 8, 8],
				ot: [{ name: 'Overtime', multiplier: 1.5, hours: 4 }],
				extras: [{ name: 'Shift allowance', kind: 'per_day', unitAmount: 1000, quantity: 2 }]
			})
		);

		expect(result.totalDeductions).toBe(11000);
		expect(result.gross).toBe(61000);
		expect(result.extrasTotal).toBe(2000);
		expect(result.payFromHours).toBe(59000);
		expect(result.regularHours).toBe(40);
		expect(result.otHours).toBe(4);
		expect(result.weightedHours).toBe(46);
		expect(result.hourlyRate).toBeCloseTo(1282.6087, 3);
		expect(result.ot[0]!.pay).toBe(7696);
		expect(result.regularPay).toBe(51304);
		expect(result.roundingAdjustment).toBe(0);
		expect(result.issues).toEqual([]);
		expect(balances(result)).toBe(true);
	});

	it('handles a week with no OT', () => {
		const result = reversePayslip(
			week({ net: 40000, deductions: [{ name: 'Tax', amount: 5000 }], dayHours: [8, 8, 8, 8, 8] })
		);

		expect(result.gross).toBe(45000);
		expect(result.hourlyRate).toBe(1125);
		expect(result.regularPay).toBe(45000);
		expect(result.ot).toEqual([]);
		expect(balances(result)).toBe(true);
	});

	it('takes extras off gross before working out the rate', () => {
		const result = reversePayslip(
			week({
				net: 30000,
				dayHours: [10, 10],
				extras: [
					{ name: 'Weekly bonus', kind: 'per_week', unitAmount: 5000, quantity: 1 },
					{ name: 'One-off', kind: 'bonus', unitAmount: 5000, quantity: 1 }
				]
			})
		);

		expect(result.extrasTotal).toBe(10000);
		expect(result.payFromHours).toBe(20000);
		expect(result.hourlyRate).toBe(1000);
		expect(balances(result)).toBe(true);
	});

	it('flags a week that is extras only, with no hours', () => {
		const result = reversePayslip(
			week({
				net: 10000,
				extras: [{ name: 'Bonus', kind: 'bonus', unitAmount: 10000, quantity: 1 }]
			})
		);

		expect(result.issues).toEqual(['no-hours', 'extras-exceed-gross']);
		expect(result.hourlyRate).toBeNull();
		expect(result.regularPay).toBeNull();
		expect(balances(result)).toBe(false);
	});

	it('returns no rate, not a crash, when there are zero hours', () => {
		const result = reversePayslip(
			week({ net: 50000, dayHours: [0, 0], ot: [{ name: 'OT', multiplier: 1.5, hours: 0 }] })
		);

		expect(result.weightedHours).toBe(0);
		expect(result.hourlyRate).toBeNull();
		expect(result.regularPay).toBeNull();
		expect(result.ot[0]!.pay).toBeNull();
		expect(result.issues).toEqual(['no-hours']);
	});

	it('warns when extras are larger than gross pay', () => {
		const result = reversePayslip(
			week({
				net: 10000,
				dayHours: [10],
				extras: [{ name: 'Allowance', kind: 'per_day', unitAmount: 5000, quantity: 3 }]
			})
		);

		expect(result.payFromHours).toBe(-5000);
		expect(result.hourlyRate).toBeNull();
		expect(result.issues).toEqual(['extras-exceed-gross']);
	});

	it('flags negative values', () => {
		const result = reversePayslip(week({ net: -100, dayHours: [8] }));
		expect(result.issues).toContain('negative-value');
	});

	it('puts the rounding difference on regular pay so the lines add back to net', () => {
		const result = reversePayslip(
			week({
				net: 10000,
				dayHours: [1],
				ot: [
					{ name: 'OT A', multiplier: 1, hours: 1 },
					{ name: 'OT B', multiplier: 1, hours: 1 }
				]
			})
		);

		expect(result.ot.map((o) => o.pay)).toEqual([3333, 3333]);
		expect(result.regularPay).toBe(3334);
		expect(result.roundingAdjustment).toBe(1);
		expect(balances(result)).toBe(true);
	});

	it('puts the rounding difference on the largest OT line when there are no regular hours', () => {
		const result = reversePayslip(
			week({
				net: 10000,
				ot: [
					{ name: 'OT A', multiplier: 1, hours: 1 },
					{ name: 'OT B', multiplier: 1, hours: 1 },
					{ name: 'OT C', multiplier: 1, hours: 1 }
				]
			})
		);

		expect(result.regularPay).toBe(0);
		expect(result.ot.map((o) => o.pay)).toEqual([3334, 3333, 3333]);
		expect(result.roundingAdjustment).toBe(1);
		expect(balances(result)).toBe(true);
	});

	it('works in a currency with no decimals (JPY)', () => {
		const net = toMinor('200000.00', 0)!;
		const result = reversePayslip(
			week({ net, deductions: [{ name: 'Tax', amount: 30000 }], dayHours: [8, 8, 8, 8, 8] })
		);

		expect(result.gross).toBe(230000);
		expect(result.hourlyRate).toBe(5750);
		expect(balances(result)).toBe(true);
	});
});

describe('checkRate', () => {
	it('is ok within the tolerance, including exactly on it', () => {
		expect(checkRate(1275, 1250, 2)).toEqual({ status: 'ok', diffPct: 2 });
		expect(checkRate(1250, 1250, 2).status).toBe('ok');
	});

	it('flags a rate above or below the tolerance', () => {
		expect(checkRate(1300, 1250, 2)).toEqual({ status: 'high', diffPct: 4 });
		expect(checkRate(1200, 1250, 2)).toEqual({ status: 'low', diffPct: -4 });
	});

	it('is unknown without a usual rate or a computed rate', () => {
		expect(checkRate(1250, null, 2).status).toBe('unknown');
		expect(checkRate(null, 1250, 2).status).toBe('unknown');
		expect(checkRate(1250, 0, 2).status).toBe('unknown');
	});
});
