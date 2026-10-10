import { describe, expect, it } from 'vitest';
import { balances, reversePayslip } from '../calc/reversePayslip.ts';
import {
	buildForm,
	mergeDraft,
	withPeriod,
	parsePayslip,
	toInput,
	toPayslipRecord,
	type SavedPayslip,
	type PayslipTypes
} from './form.ts';

const WEEK = { start: '2026-10-05', end: '2026-10-11' };

const types: PayslipTypes = {
	deductions: [{ name: 'Tax' }, { name: 'Insurance' }],
	extras: [
		{ name: 'Night shift', kind: 'per_day', defaultAmount: '10.00' },
		{ name: 'Travel', kind: 'per_week', defaultAmount: '25.00' }
	],
	otRates: [{ name: 'Overtime', multiplier: '1.500' }]
};

const saved: SavedPayslip = {
	currency: 'GBP',
	netPay: '500.00',
	payDate: null,
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
		const form = buildForm(WEEK, 'GBP', types, null);

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
		const form = buildForm(WEEK, 'EUR', types, saved);

		expect(form.currency).toBe('GBP'); // the saved payslip's currency, not the current setting
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
			WEEK,
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

describe('parsePayslip', () => {
	const filled = () => {
		const form = buildForm(WEEK, 'GBP', types, null);
		form.net = '500';
		form.deductions[0]!.amount = '80';
		form.deductions[1]!.amount = '30';
		for (const day of form.days.slice(0, 5)) day.hours = '8';
		form.ot[0]!.hours = '4';
		form.extras[0]!.quantity = '2';
		return form;
	};

	it('turns the form into numbers the calculation can use', () => {
		const result = parsePayslip(filled());
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const { value } = result;
		expect(value.net).toBe(50000);
		expect(value.deductions).toEqual([
			{ name: 'Tax', amount: 8000 },
			{ name: 'Insurance', amount: 3000 }
		]);
		expect(value.days.map((d) => d.hours)).toEqual([8, 8, 8, 8, 8, 0, 0]);
		expect(value.ot).toEqual([{ name: 'Overtime', multiplier: 1.5, hours: 4 }]);
		// Travel (per payslip) wasn't ticked, so it's left out.
		expect(value.extras).toEqual([
			{ name: 'Night shift', kind: 'per_day', unitAmount: 1000, quantity: 2 }
		]);

		const payslip = reversePayslip(toInput(value));
		expect(payslip.gross).toBe(61000);
		expect(balances(payslip)).toBe(true);
	});

	it('accepts thousands separators in amounts', () => {
		const form = filled();
		form.net = '1,250.50';
		const result = parsePayslip(form);
		expect(result.ok && result.value.net).toBe(125050);
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
		const result = parsePayslip(form);
		expect(result.ok && result.value.extras.map((e) => [e.name, e.unitAmount, e.quantity])).toEqual(
			[
				['Night shift', 1000, 2],
				['Travel', 2500, 1],
				['Christmas bonus', 5000, 1]
			]
		);
	});

	it('reports each problem against its field', () => {
		const form = filled();
		form.net = '';
		form.deductions[0]!.amount = '-5';
		form.days[2]!.hours = '25';
		form.ot[0]!.hours = 'abc';
		form.extras[0]!.quantity = '9';
		form.deductions.push({ name: '', amount: '10', custom: true });

		const result = parsePayslip(form);
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
		const form = buildForm(WEEK, 'JPY', types, null);
		form.net = '1000.5';
		const result = parsePayslip(form);
		expect(!result.ok && result.errors.net).toBe('Use a whole number, like 500.');
	});

	it('rejects anything that is not a week form (server input is untrusted)', () => {
		const result = parsePayslip({ start: 'nope', end: '2026-10-11', currency: 'XYZ', net: 5 });
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(Object.keys(result.errors)).toEqual(['period', 'currency', 'net']);
	});
});

describe('toPayslipRecord', () => {
	it('stores amounts as decimal strings and the unrounded rate', () => {
		const form = buildForm(WEEK, 'GBP', types, null);
		form.net = '500';
		form.deductions[0]!.amount = '80';
		form.deductions[1]!.amount = '30';
		for (const day of form.days.slice(0, 5)) day.hours = '8';
		form.ot[0]!.hours = '4';
		form.extras[0]!.quantity = '2';
		const result = parsePayslip(form);
		if (!result.ok) throw new Error('expected a valid payslip');

		const record = toPayslipRecord(result.value, reversePayslip(toInput(result.value)));
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
			payDate: null,
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
		const before = buildForm(WEEK, 'GBP', { ...types, deductions: [{ name: 'Tax' }] }, null);
		before.net = '500';
		before.deductions[0]!.amount = '80';

		// "Insurance" was unhidden in Settings since then.
		const now = buildForm(WEEK, 'GBP', types, null);
		const merged = mergeDraft(now, before);

		expect(merged.net).toBe('500');
		expect(merged.deductions).toEqual([
			{ name: 'Tax', amount: '80', custom: false },
			{ name: 'Insurance', amount: '', custom: false }
		]);
	});

	it('keeps typed rows for items hidden since, and one-off rows', () => {
		const draft = buildForm(WEEK, 'GBP', types, null);
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
			WEEK,
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
		const form = buildForm(WEEK, 'GBP', types, saved);
		expect(mergeDraft(buildForm(WEEK, 'GBP', types, saved), form)).toEqual(form);
	});
});

describe('pay periods of any length', () => {
	const period = (start: string, end: string) => ({ start, end });
	const filledFor = (p: { start: string; end: string }) => {
		const form = buildForm(p, 'GBP', types, null);
		form.net = '100';
		return form;
	};

	it('builds one day per date in the period', () => {
		expect(buildForm(period('2026-10-15', '2026-10-15'), 'GBP', types, null).days).toEqual([
			{ date: '2026-10-15', hours: '' }
		]);
		const fortnight = buildForm(period('2026-10-05', '2026-10-18'), 'GBP', types, null);
		expect(fortnight.days).toHaveLength(14);
		expect(fortnight.days.at(-1)!.date).toBe('2026-10-18');
		const month = buildForm(period('2026-10-01', '2026-10-31'), 'GBP', types, null);
		expect(month.days).toHaveLength(31);
		expect([month.start, month.end]).toEqual(['2026-10-01', '2026-10-31']);
	});

	it('shows saved hours on their dates, whatever the length', () => {
		const form = buildForm(period('2026-10-05', '2026-10-18'), 'GBP', types, {
			...saved,
			days: [{ date: '2026-10-17', hours: '6.00' }]
		});
		expect(form.days.find((d) => d.date === '2026-10-17')!.hours).toBe('6');
		expect(form.days.filter((d) => d.hours)).toHaveLength(1);
	});

	it('parses a one-day payslip', () => {
		const form = filledFor(period('2026-10-15', '2026-10-15'));
		form.days[0]!.hours = '9';
		const result = parsePayslip(form);
		expect(result.ok && [result.value.start, result.value.end]).toEqual([
			'2026-10-15',
			'2026-10-15'
		]);
		expect(result.ok && result.value.days).toEqual([{ date: '2026-10-15', hours: 9 }]);
	});

	it('scales the per-day extra limit with the period', () => {
		const oneDay = filledFor(period('2026-10-15', '2026-10-15'));
		oneDay.extras[0]!.quantity = '2';
		const short = parsePayslip(oneDay);
		expect(!short.ok && short.errors['extras.0.quantity']).toBe('Use a number of days, 0 to 1.');

		const fortnight = filledFor(period('2026-10-05', '2026-10-18'));
		fortnight.extras[0]!.quantity = '10';
		const long = parsePayslip(fortnight);
		expect(long.ok && long.value.extras[0]!.quantity).toBe(10);
	});

	it('scales the overtime hours limit with the period (24 per day)', () => {
		const oneDay = filledFor(period('2026-10-15', '2026-10-15'));
		oneDay.ot[0]!.hours = '25';
		expect(parsePayslip(oneDay).ok).toBe(false);

		const month = filledFor(period('2026-10-01', '2026-10-31'));
		month.ot[0]!.hours = '200';
		const result = parsePayslip(month);
		expect(result.ok && result.value.ot[0]!.hours).toBe(200);
	});

	it('reports bad dates against the period', () => {
		const backwards = filledFor(period('2026-10-05', '2026-10-11'));
		backwards.end = '2026-10-01';
		const result = parsePayslip(backwards);
		expect(!result.ok && result.errors.period).toBe("The end date can't be before the start date.");

		const tooLong = filledFor(period('2026-08-01', '2026-10-01'));
		tooLong.end = '2026-10-02'; // 63 days
		const long = parsePayslip(tooLong);
		expect(!long.ok && long.errors.period).toBe('A payslip can cover up to 62 days.');
	});

	it('rejects a future start only when told what today is', () => {
		const form = filledFor(period('2026-10-21', '2026-10-27'));
		expect(parsePayslip(form).ok).toBe(true); // the live payslip in the browser
		const result = parsePayslip(form, '2026-10-20'); // the server
		expect(!result.ok && result.errors.period).toBe("A payslip can't start after today.");
		expect(parsePayslip(form, '2026-10-21').ok).toBe(true); // a period in progress
	});

	it('stores the period dates on the record', () => {
		const form = filledFor(period('2026-10-05', '2026-10-18'));
		const result = parsePayslip(form);
		if (!result.ok) throw new Error('expected a valid period');
		const record = toPayslipRecord(result.value, reversePayslip(toInput(result.value)));
		expect([record.start, record.end]).toEqual(['2026-10-05', '2026-10-18']);
		expect(record.days).toHaveLength(14);
	});
});

describe('changing a payslip’s dates', () => {
	it('rebuilds the days, keeping hours on dates in both periods', () => {
		const form = buildForm(WEEK, 'GBP', types, null);
		form.days[0]!.hours = '8'; // Oct 5
		form.days[6]!.hours = '4'; // Oct 11
		form.net = '300';

		const shorter = withPeriod(form, { start: '2026-10-05', end: '2026-10-07' });
		expect(shorter.days).toEqual([
			{ date: '2026-10-05', hours: '8' },
			{ date: '2026-10-06', hours: '' },
			{ date: '2026-10-07', hours: '' }
		]);
		expect(shorter.net).toBe('300');

		const longer = withPeriod(form, { start: '2026-10-11', end: '2026-10-12' });
		expect(longer.days).toEqual([
			{ date: '2026-10-11', hours: '4' },
			{ date: '2026-10-12', hours: '' }
		]);
	});

	it('restores a draft with new dates that were not saved yet', () => {
		const base = buildForm(WEEK, 'GBP', types, saved); // saved Oct 5–11, 8 hrs on Oct 5
		const draft = withPeriod(base, { start: '2026-10-05', end: '2026-10-06' });
		draft.days[1]!.hours = '6';

		const merged = mergeDraft(base, draft);
		expect([merged.start, merged.end]).toEqual(['2026-10-05', '2026-10-06']);
		expect(merged.days).toEqual([
			{ date: '2026-10-05', hours: '8' },
			{ date: '2026-10-06', hours: '6' }
		]);
	});
});

describe('the "Paid on" date', () => {
	const filled = (payDate: string) => {
		const form = buildForm(WEEK, 'GBP', types, null);
		form.net = '100';
		form.payDate = payDate;
		return form;
	};

	it('is blank on a new payslip and comes back from a saved one', () => {
		expect(buildForm(WEEK, 'GBP', types, null).payDate).toBe('');
		expect(buildForm(WEEK, 'GBP', types, { ...saved, payDate: '2026-10-14' }).payDate).toBe(
			'2026-10-14'
		);
	});

	it('is optional: blank is saved as null (the end date stands in)', () => {
		const result = parsePayslip(filled(''));
		expect(result.ok && result.value.payDate).toBeNull();
	});

	it('can be any real date from the start onwards, even after the end', () => {
		for (const date of ['2026-10-05', '2026-10-11', '2026-10-16']) {
			const result = parsePayslip(filled(date));
			expect(result.ok && result.value.payDate).toBe(date);
		}
	});

	it('rejects a date before the start, or not a date', () => {
		const early = parsePayslip(filled('2026-10-04'));
		expect(!early.ok && early.errors.payDate).toBe(
			'The pay date can’t be before the payslip starts.'
		);
		const junk = parsePayslip(filled('soon'));
		expect(!junk.ok && junk.errors.payDate).toBe('Pick a date, or leave it blank.');
	});

	it('is stored on the record', () => {
		const result = parsePayslip(filled('2026-10-14'));
		if (!result.ok) throw new Error('expected a valid payslip');
		const record = toPayslipRecord(result.value, reversePayslip(toInput(result.value)));
		expect(record.summary.payDate).toBe('2026-10-14');
	});

	it('survives a draft, and older drafts without it still load', () => {
		const base = buildForm(WEEK, 'GBP', types, { ...saved, payDate: '2026-10-14' });
		const typed = { ...base, payDate: '2026-10-15' };
		expect(mergeDraft(base, typed).payDate).toBe('2026-10-15');
		const { payDate: _unused, ...old } = typed;
		expect(mergeDraft(base, old as typeof typed).payDate).toBe('2026-10-14');
	});
});
