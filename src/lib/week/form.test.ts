import { describe, expect, it } from 'vitest';
import { balances, reversePayslip } from '../calc/reversePayslip.ts';
import {
	buildForm,
	mergeDraft,
	parseWeek,
	toInput,
	toWeekRecord,
	type SavedWeek,
	type WeekTypes
} from './form.ts';

const types: WeekTypes = {
	deductions: [{ name: 'Tax' }, { name: 'Insurance' }],
	extras: [
		{ name: 'Night shift', kind: 'per_day', defaultAmount: '10.00' },
		{ name: 'Travel', kind: 'per_week', defaultAmount: '25.00' }
	],
	otRates: [{ name: 'Overtime', multiplier: '1.500' }]
};

const saved: SavedWeek = {
	currency: 'GBP',
	netPay: '500.00',
	notes: 'Covered for Sam',
	updatedAt: '2026-10-08T10:00:00.000Z',
	days: [
		{ date: '2026-10-05', hours: '8.00' },
		{ date: '2026-10-06', hours: '7.50' }
	],
	deductions: [{ name: 'Tax', amount: '80.00' }],
	ot: [{ name: 'Overtime', multiplier: '1.500', hours: '4.00' }],
	extras: [{ name: 'Night shift', kind: 'per_day', unitAmount: '10.00', quantity: '2.00' }]
};

describe('buildForm', () => {
	it('builds a new week from the Settings lists', () => {
		const form = buildForm('2026-10-05', 'GBP', types, null);

		expect(form.net).toBe('');
		expect(form.deductions.map((d) => d.name)).toEqual(['Tax', 'Insurance']);
		expect(form.days).toHaveLength(7);
		expect(form.days[0]).toEqual({ date: '2026-10-05', hours: '' });
		expect(form.ot).toEqual([{ name: 'Overtime', multiplier: '1.5', hours: '' }]);
		expect(form.extras).toEqual([
			{ name: 'Night shift', kind: 'per_day', unitAmount: '10.00', quantity: '', custom: false },
			{ name: 'Travel', kind: 'per_week', unitAmount: '25.00', quantity: '0', custom: false }
		]);
	});

	it('shows a saved week as saved, then adds Settings items it does not have', () => {
		const form = buildForm('2026-10-05', 'EUR', types, saved);

		expect(form.currency).toBe('GBP'); // the saved week's currency, not the current setting
		expect(form.net).toBe('500.00');
		expect(form.deductions).toEqual([
			{ name: 'Tax', amount: '80.00', custom: false },
			{ name: 'Insurance', amount: '', custom: false }
		]);
		expect(form.days.slice(0, 3).map((d) => d.hours)).toEqual(['8', '7.5', '']);
		expect(form.ot).toEqual([{ name: 'Overtime', multiplier: '1.5', hours: '4' }]);
		expect(form.extras.map((e) => [e.name, e.quantity])).toEqual([
			['Night shift', '2'],
			['Travel', '0']
		]);
		expect(form.notes).toBe('Covered for Sam');
	});

	it('shows amounts with the right decimals for the currency', () => {
		const form = buildForm(
			'2026-10-05',
			'JPY',
			{ ...types, extras: [] },
			{
				...saved,
				currency: 'JPY',
				netPay: '200000.00'
			}
		);
		expect(form.net).toBe('200000');
	});
});

describe('parseWeek', () => {
	const filled = () => {
		const form = buildForm('2026-10-05', 'GBP', types, null);
		form.net = '500';
		form.deductions[0]!.amount = '80';
		form.deductions[1]!.amount = '30';
		for (const day of form.days.slice(0, 5)) day.hours = '8';
		form.ot[0]!.hours = '4';
		form.extras[0]!.quantity = '2';
		return form;
	};

	it('turns the form into numbers the calculation can use', () => {
		const result = parseWeek(filled());
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const { week } = result;
		expect(week.net).toBe(50000);
		expect(week.deductions).toEqual([
			{ name: 'Tax', amount: 8000 },
			{ name: 'Insurance', amount: 3000 }
		]);
		expect(week.days.map((d) => d.hours)).toEqual([8, 8, 8, 8, 8, 0, 0]);
		expect(week.ot).toEqual([{ name: 'Overtime', multiplier: 1.5, hours: 4 }]);
		// Travel (per week) wasn't ticked, so it's left out.
		expect(week.extras).toEqual([
			{ name: 'Night shift', kind: 'per_day', unitAmount: 1000, quantity: 2 }
		]);

		const payslip = reversePayslip(toInput(week));
		expect(payslip.gross).toBe(61000);
		expect(balances(payslip)).toBe(true);
	});

	it('accepts thousands separators in amounts', () => {
		const form = filled();
		form.net = '1,250.50';
		const result = parseWeek(form);
		expect(result.ok && result.week.net).toBe(125050);
	});

	it('includes a per-week extra only when ticked, and one-off bonuses', () => {
		const form = filled();
		form.extras[1]!.quantity = '1';
		form.extras.push({
			name: 'Christmas bonus',
			kind: 'bonus',
			unitAmount: '50',
			quantity: '1',
			custom: true
		});
		const result = parseWeek(form);
		expect(result.ok && result.week.extras.map((e) => [e.name, e.unitAmount, e.quantity])).toEqual([
			['Night shift', 1000, 2],
			['Travel', 2500, 1],
			['Christmas bonus', 5000, 1]
		]);
	});

	it('reports each problem against its field', () => {
		const form = filled();
		form.net = '';
		form.deductions[0]!.amount = '-5';
		form.days[2]!.hours = '25';
		form.ot[0]!.hours = 'abc';
		form.extras[0]!.quantity = '9';
		form.deductions.push({ name: '', amount: '10', custom: true });

		const result = parseWeek(form);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors).toEqual({
			net: 'Enter the net pay from your payslip.',
			'deductions.0.amount': "Can't be negative.",
			'deductions.2.name': 'Enter a name.',
			'days.2.hours': 'Use hours like 7.5 (up to 24).',
			'ot.0.hours': 'Use hours like 2.5.',
			'extras.0.quantity': 'Use a number of days, 0 to 7.'
		});
	});

	it('rejects decimals in a currency without them', () => {
		const form = buildForm('2026-10-05', 'JPY', types, null);
		form.net = '1000.5';
		const result = parseWeek(form);
		expect(!result.ok && result.errors.net).toBe('Use a whole number, like 500.');
	});

	it('rejects anything that is not a week form (server input is untrusted)', () => {
		const result = parseWeek({ weekStart: 'nope', currency: 'XYZ', net: 5 });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(Object.keys(result.errors)).toEqual(['weekStart', 'currency', 'net']);
	});
});

describe('toWeekRecord', () => {
	it('stores amounts as decimal strings and the unrounded rate', () => {
		const form = buildForm('2026-10-05', 'GBP', types, null);
		form.net = '500';
		form.deductions[0]!.amount = '80';
		form.deductions[1]!.amount = '30';
		for (const day of form.days.slice(0, 5)) day.hours = '8';
		form.ot[0]!.hours = '4';
		form.extras[0]!.quantity = '2';
		const result = parseWeek(form);
		if (!result.ok) throw new Error('expected a valid week');

		const record = toWeekRecord(result.week, reversePayslip(toInput(result.week)));
		expect(record.summary).toEqual({
			currency: 'GBP',
			netPay: '500.00',
			totalDeductions: '110.00',
			grossPay: '610.00',
			extrasTotal: '20.00',
			payFromHours: '590.00',
			regularHours: '40.00',
			otHours: '4.00',
			hourlyRate: '12.8261',
			notes: null
		});
		expect(record.days).toHaveLength(7);
		expect(record.extras).toEqual([
			{
				name: 'Night shift',
				kind: 'per_day',
				unitAmount: '10.00',
				quantity: '2',
				amount: '20.00',
				sortOrder: 0
			}
		]);
	});
});

describe('mergeDraft', () => {
	it('shows items unhidden in Settings after the draft was typed', () => {
		const before = buildForm(
			'2026-10-05',
			'GBP',
			{ ...types, deductions: [{ name: 'Tax' }] },
			null
		);
		before.net = '500';
		before.deductions[0]!.amount = '80';

		// "Insurance" was unhidden in Settings since then.
		const now = buildForm('2026-10-05', 'GBP', types, null);
		const merged = mergeDraft(now, before);

		expect(merged.net).toBe('500');
		expect(merged.deductions).toEqual([
			{ name: 'Tax', amount: '80', custom: false },
			{ name: 'Insurance', amount: '', custom: false }
		]);
	});

	it('keeps typed rows for items hidden since, and one-off rows', () => {
		const draft = buildForm('2026-10-05', 'GBP', types, null);
		draft.deductions[1]!.amount = '30'; // Insurance
		draft.deductions.push({ name: 'Uniform', amount: '12', custom: true });
		draft.days[0]!.hours = '8';
		draft.ot[0]!.hours = '2';
		draft.extras[0]!.quantity = '3';
		draft.extras.push({
			name: 'Bonus',
			kind: 'bonus',
			unitAmount: '50',
			quantity: '1',
			custom: true
		});

		// Insurance and the OT rate were hidden since; nothing typed should be lost.
		const now = buildForm(
			'2026-10-05',
			'GBP',
			{ ...types, deductions: [{ name: 'Tax' }], otRates: [] },
			null
		);
		const merged = mergeDraft(now, draft);

		expect(merged.deductions).toEqual([
			{ name: 'Tax', amount: '', custom: false },
			{ name: 'Insurance', amount: '30', custom: false },
			{ name: 'Uniform', amount: '12', custom: true }
		]);
		expect(merged.days[0]!.hours).toBe('8');
		expect(merged.ot).toEqual([{ name: 'Overtime', multiplier: '1.5', hours: '2' }]);
		expect(merged.extras.map((e) => [e.name, e.quantity])).toEqual([
			['Night shift', '3'],
			['Travel', '0'],
			['Bonus', '1']
		]);
	});

	it('changes nothing when the draft matches the form', () => {
		const form = buildForm('2026-10-05', 'GBP', types, saved);
		expect(mergeDraft(buildForm('2026-10-05', 'GBP', types, saved), form)).toEqual(form);
	});
});
