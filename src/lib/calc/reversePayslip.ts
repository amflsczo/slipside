// The reverse payslip (PLAN.md §3): from net pay, deductions, hours, OT and extras, work out
// gross pay, the real hourly rate and a line-by-line breakdown that adds back to net.
// Pure maths: no database or UI code. All money is integer minor units (see format/money.ts).

export type ExtraKind = 'per_day' | 'per_week' | 'bonus';

export type WeekInput = {
	/** Net pay from the payslip, in minor units. */
	net: number;
	deductions: { name: string; amount: number }[];
	/** Regular hours per day (OT is entered separately). */
	dayHours: number[];
	ot: { name: string; multiplier: number; hours: number }[];
	/** per_day: quantity = days; per_week and bonus: quantity = 1. */
	extras: { name: string; kind: ExtraKind; unitAmount: number; quantity: number }[];
};

export type PayslipIssue =
	/** Weighted hours are 0, so there is no rate to work out. */
	| 'no-hours'
	/** Extras are as large as, or larger than, gross pay: probably a typo. */
	| 'extras-exceed-gross'
	/** A negative amount, hours, quantity or multiplier was entered. */
	| 'negative-value';

export type Payslip = {
	net: number;
	deductions: { name: string; amount: number }[];
	totalDeductions: number;
	gross: number;
	extras: { name: string; kind: ExtraKind; unitAmount: number; quantity: number; amount: number }[];
	extrasTotal: number;
	payFromHours: number;
	regularHours: number;
	otHours: number;
	weightedHours: number;
	/** Minor units per hour, unrounded. Round only for display. null when there's no valid rate. */
	hourlyRate: number | null;
	regularPay: number | null;
	ot: { name: string; multiplier: number; hours: number; pay: number | null }[];
	/** Rounding moved onto regular pay (or the largest OT line) so the lines add back to net. */
	roundingAdjustment: number;
	issues: PayslipIssue[];
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function reversePayslip(input: WeekInput): Payslip {
	const issues: PayslipIssue[] = [];
	const values = [
		input.net,
		...input.deductions.map((d) => d.amount),
		...input.dayHours,
		...input.ot.flatMap((o) => [o.hours, o.multiplier]),
		...input.extras.flatMap((e) => [e.unitAmount, e.quantity])
	];
	if (values.some((value) => value < 0)) issues.push('negative-value');

	const totalDeductions = sum(input.deductions.map((d) => d.amount));
	const gross = input.net + totalDeductions;

	const extras = input.extras.map((e) => ({
		...e,
		amount: Math.round(e.unitAmount * e.quantity)
	}));
	const extrasTotal = sum(extras.map((e) => e.amount));
	const payFromHours = gross - extrasTotal;

	const regularHours = sum(input.dayHours);
	const otHours = sum(input.ot.map((o) => o.hours));
	const weightedHours = regularHours + sum(input.ot.map((o) => o.hours * o.multiplier));

	const base = {
		net: input.net,
		deductions: input.deductions,
		totalDeductions,
		gross,
		extras,
		extrasTotal,
		payFromHours,
		regularHours,
		otHours,
		weightedHours
	};

	if (weightedHours <= 0) issues.push('no-hours');
	if (payFromHours <= 0) issues.push('extras-exceed-gross');
	if (weightedHours <= 0 || payFromHours <= 0) {
		return {
			...base,
			hourlyRate: null,
			regularPay: null,
			ot: input.ot.map((o) => ({ ...o, pay: null })),
			roundingAdjustment: 0,
			issues
		};
	}

	const hourlyRate = payFromHours / weightedHours;
	const ot = input.ot.map((o) => ({ ...o, pay: Math.round(hourlyRate * o.hours * o.multiplier) }));
	const exactRegular = Math.round(hourlyRate * regularHours);
	// Whatever rounding left over goes on regular pay, so the lines add back to net exactly.
	let regularPay = payFromHours - sum(ot.map((o) => o.pay));
	let roundingAdjustment = regularPay - exactRegular;

	// With no regular hours, put the difference on the largest OT line instead.
	if (regularHours === 0 && regularPay !== 0) {
		const largest = ot.reduce((best, line) => (line.pay > best.pay ? line : best));
		largest.pay += regularPay;
		roundingAdjustment = regularPay;
		regularPay = 0;
	}

	return { ...base, hourlyRate, regularPay, ot, roundingAdjustment, issues };
}

/** True when the breakdown adds back to the net pay from the payslip. */
export function balances(payslip: Payslip): boolean {
	if (payslip.regularPay === null) return false;
	const otPay = sum(payslip.ot.map((o) => o.pay ?? 0));
	return payslip.regularPay + otPay + payslip.extrasTotal - payslip.totalDeductions === payslip.net;
}

export type RateCheck =
	{ status: 'ok' | 'high' | 'low'; diffPct: number } | { status: 'unknown'; diffPct: null };

/**
 * Compares the week's rate against the usual rate from Settings (both minor units per hour).
 * Outside the tolerance (a percentage, default 2) the week is flagged high or low.
 */
export function checkRate(
	hourlyRate: number | null,
	usualRate: number | null,
	tolerancePct: number
): RateCheck {
	if (hourlyRate === null || usualRate === null || usualRate <= 0) {
		return { status: 'unknown', diffPct: null };
	}
	const diffPct = ((hourlyRate - usualRate) / usualRate) * 100;
	// A hair of slack so a difference of exactly the tolerance isn't flagged by float noise.
	if (Math.abs(diffPct) <= tolerancePct + 1e-9) return { status: 'ok', diffPct };
	return { status: diffPct > 0 ? 'high' : 'low', diffPct };
}
