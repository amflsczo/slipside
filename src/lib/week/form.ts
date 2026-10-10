// The payslip form for one pay period, shared by the browser (live payslip) and the server (save).
// buildForm: pay period + settings lists + saved payslip → what the form shows.
// parseWeek: what the form holds (untrusted on the server) → clean numbers, or field errors.
// toWeekRecord: parsed week + payslip → rows for the database.
import type { ExtraKind, Payslip, WeekInput } from '#lib/calc/reversePayslip.ts';
import type { IsoDate } from '#lib/dates.ts';
import { PERIOD_MESSAGES, checkPeriod, dayCount, periodDates, type Period } from '#lib/period.ts';
import { fromMinor, minorDigits, toMinor } from '#lib/format/money.ts';

export type SavedWeek = {
	currency: string;
	netPay: string;
	notes: string | null;
	updatedAt: string;
	days: { date: IsoDate; hours: string }[];
	deductions: { name: string; amount: string }[];
	ot: { name: string; multiplier: string; hours: string }[];
	extras: { name: string; kind: ExtraKind; unitAmount: string; quantity: string }[];
};

/** The active items from Settings that make up a new week's rows. */
export type WeekTypes = {
	deductions: { name: string }[];
	extras: { name: string; kind: 'per_day' | 'per_week'; defaultAmount: string | null }[];
	otRates: { name: string; multiplier: string }[];
};

export type WeekForm = {
	/** The pay period, both days included. */
	start: IsoDate;
	end: IsoDate;
	currency: string;
	net: string;
	/** custom: a one-off row the user added, so its name is editable and it can be removed. */
	deductions: { name: string; amount: string; custom: boolean }[];
	days: { date: IsoDate; hours: string }[];
	ot: { name: string; multiplier: string; hours: string }[];
	/** per_day: quantity = days. per_week (shown as "per payslip"): "1" when paid, else "0". */
	extras: {
		name: string;
		kind: ExtraKind;
		unitAmount: string;
		quantity: string;
		custom: boolean;
	}[];
	notes: string;
};

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const notIn = <T extends { name: string }>(types: T[], rows: { name: string }[]) =>
	types.filter((type) => !rows.some((row) => sameName(row.name, type.name)));
/** "8.00" → "8", "1.500" → "1.5" */
const plainNumber = (value: string) => String(Number(value));

export function buildForm(
	period: Period,
	settingsCurrency: string,
	types: WeekTypes,
	saved: SavedWeek | null
): WeekForm {
	// A saved week keeps the currency it was saved in.
	const currency = saved?.currency ?? settingsCurrency;
	const digits = minorDigits(currency);
	const amount = (value: string | null) => {
		const minor = value === null ? null : toMinor(value, digits);
		return minor === null ? '' : fromMinor(minor, digits);
	};

	const savedDeductions = saved?.deductions ?? [];
	const savedOt = saved?.ot ?? [];
	const savedExtras = saved?.extras ?? [];

	return {
		start: period.start,
		end: period.end,
		currency,
		net: saved ? amount(saved.netPay) : '',
		deductions: [
			...savedDeductions.map((d) => ({ name: d.name, amount: amount(d.amount), custom: false })),
			...notIn(types.deductions, savedDeductions).map((t) => ({
				name: t.name,
				amount: '',
				custom: false
			}))
		],
		days: periodDates(period).map((date) => {
			const day = saved?.days.find((d) => d.date === date);
			return { date, hours: day && Number(day.hours) ? plainNumber(day.hours) : '' };
		}),
		ot: [
			...savedOt.map((o) => ({
				name: o.name,
				multiplier: plainNumber(o.multiplier),
				hours: plainNumber(o.hours)
			})),
			...notIn(types.otRates, savedOt).map((t) => ({
				name: t.name,
				multiplier: plainNumber(t.multiplier),
				hours: ''
			}))
		],
		extras: [
			...savedExtras.map((e) => ({
				name: e.name,
				kind: e.kind,
				unitAmount: amount(e.unitAmount),
				quantity: plainNumber(e.quantity),
				custom: e.kind === 'bonus'
			})),
			...notIn(types.extras, savedExtras).map((t) => ({
				name: t.name,
				kind: t.kind,
				unitAmount: amount(t.defaultAmount),
				quantity: t.kind === 'per_week' ? '0' : '',
				custom: false
			}))
		],
		notes: saved?.notes ?? ''
	};
}

/**
 * Puts a device draft back onto the current form. The rows come from `base` (the latest
 * Settings and saved week), so items added or unhidden since the draft still show up;
 * the draft only supplies what was typed. Typed rows that are no longer in the lists
 * (hidden since, or one-off rows) are kept so nothing typed is lost.
 */
export function mergeDraft(base: WeekForm, draft: WeekForm): WeekForm {
	const typed = (value: string) => value.trim() !== '';
	const match = <T extends { name: string; custom?: boolean }>(rows: T[], name: string) =>
		rows.find((row) => !row.custom && sameName(row.name, name));
	const missingFrom = (rows: { name: string; custom?: boolean }[], name: string) =>
		!rows.some((row) => !row.custom && sameName(row.name, name));

	const baseExtras = base.extras.filter((e) => !e.custom);

	return {
		...base,
		net: draft.net,
		notes: draft.notes,
		deductions: [
			...base.deductions
				.filter((d) => !d.custom)
				.map((row) => ({
					...row,
					amount: match(draft.deductions, row.name)?.amount ?? row.amount
				})),
			...draft.deductions.filter(
				(d) => d.custom || (missingFrom(base.deductions, d.name) && typed(d.amount))
			)
		],
		days: base.days.map((day) => ({
			...day,
			hours: draft.days.find((d) => d.date === day.date)?.hours ?? day.hours
		})),
		ot: [
			...base.ot.map((row) => ({ ...row, hours: match(draft.ot, row.name)?.hours ?? row.hours })),
			...draft.ot.filter((o) => missingFrom(base.ot, o.name) && typed(o.hours))
		],
		extras: [
			...baseExtras.map((row) => {
				const typedRow = draft.extras.find(
					(e) => !e.custom && e.kind === row.kind && sameName(e.name, row.name)
				);
				return typedRow
					? { ...row, unitAmount: typedRow.unitAmount, quantity: typedRow.quantity }
					: row;
			}),
			// One-off bonuses live only in the form, so the draft's are the current ones.
			...draft.extras.filter(
				(e) =>
					e.custom || (missingFrom(baseExtras, e.name) && typed(e.unitAmount) && e.quantity !== '0')
			)
		]
	};
}

export type ParsedWeek = {
	start: IsoDate;
	end: IsoDate;
	currency: string;
	digits: number;
	notes: string | null;
	net: number;
	/** Only rows with an amount. */
	deductions: { name: string; amount: number }[];
	/** Every day of the period; blank counts as 0. */
	days: { date: IsoDate; hours: number }[];
	/** Only rows with hours. */
	ot: { name: string; multiplier: number; hours: number }[];
	/** Only extras that were paid in this period. */
	extras: { name: string; kind: ExtraKind; unitAmount: number; quantity: number }[];
};

/** Field path (e.g. "period", "net", "days.2.hours", "extras.0.unitAmount") → message. */
export type FieldErrors = Record<string, string>;

const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));
const MAX_NAME = 60;
const MAX_NOTES = 500;
const MAX_ROWS = 50;

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const list = (value: unknown) => (Array.isArray(value) ? value.slice(0, MAX_ROWS) : []);
const field = (row: unknown, key: string) =>
	row && typeof row === 'object' ? (row as Record<string, unknown>)[key] : undefined;

/** Parses a typed number with up to `places` decimals; null when blank. Throws a message. */
function decimalText(value: unknown, places: number, max: number, message: string) {
	const text = str(value);
	if (!text) return null;
	if (!new RegExp(`^\\d*(\\.\\d{0,${places}})?$`).test(text) || text === '.') throw message;
	const n = Number(text);
	if (n > max) throw message;
	return n;
}

/**
 * `today` (the user's date) rejects a period that starts in the future. The server passes it;
 * the live payslip in the browser leaves it out.
 */
export function parseWeek(
	raw: unknown,
	today?: IsoDate
): { ok: true; week: ParsedWeek } | { ok: false; errors: FieldErrors } {
	const errors: FieldErrors = {};
	const at = <T>(path: string, read: () => T, fallback: T): T => {
		try {
			return read();
		} catch (message) {
			errors[path] = String(message);
			return fallback;
		}
	};

	const start = str(field(raw, 'start'));
	const end = str(field(raw, 'end'));
	// Without `today`, any start date passes the future check.
	const problem = checkPeriod({ start, end }, today ?? '9999-12-31');
	if (problem) errors.period = PERIOD_MESSAGES[problem];
	const period = { start, end };
	// The day limits below scale with the period; 0 days while the dates are wrong.
	const length = problem ? 0 : dayCount(period);
	const currency = str(field(raw, 'currency')).toUpperCase();
	if (!CURRENCIES.has(currency)) errors.currency = 'Unknown currency.';
	const digits = minorDigits(currency);

	const moneyText = (value: unknown) => {
		const text = str(value).replace(/[\s,]/g, '');
		if (!text) return null;
		if (text.startsWith('-')) throw "Can't be negative.";
		const minor = toMinor(text, digits);
		if (minor === null || minor > 1e12) {
			throw digits === 0 ? 'Use a whole number, like 500.' : 'Use an amount like 12.50.';
		}
		return minor;
	};
	const name = (value: unknown) => {
		const text = str(value).replace(/\s+/g, ' ');
		if (!text) throw 'Enter a name.';
		if (text.length > MAX_NAME) throw `Keep it under ${MAX_NAME} characters.`;
		return text;
	};

	const net = at('net', () => moneyText(field(raw, 'net')), null);
	if (net === null && !errors.net) errors.net = 'Enter the net pay from your payslip.';

	const deductions = list(field(raw, 'deductions')).flatMap((row, i) => {
		const amount = at(`deductions.${i}.amount`, () => moneyText(field(row, 'amount')), null);
		if (!amount) return [];
		const rowName = at(`deductions.${i}.name`, () => name(field(row, 'name')), '');
		return [{ name: rowName, amount }];
	});

	const rawDays = list(field(raw, 'days'));
	const expectedDates = problem ? [] : periodDates(period);
	const days = expectedDates.map((date, i) => {
		const row = rawDays.find((d) => field(d, 'date') === date);
		const hours = at(
			`days.${i}.hours`,
			() => decimalText(field(row, 'hours'), 2, 24, 'Use hours like 7.5 (up to 24).'),
			null
		);
		return { date, hours: hours ?? 0 };
	});

	const ot = list(field(raw, 'ot')).flatMap((row, i) => {
		const hours = at(
			`ot.${i}.hours`,
			() => decimalText(field(row, 'hours'), 2, 24 * length, 'Use hours like 2.5.'),
			null
		);
		if (!hours) return [];
		const multiplier = at(
			`ot.${i}.multiplier`,
			() => {
				const m = decimalText(field(row, 'multiplier'), 3, 10, 'Unknown OT multiplier.');
				if (!m) throw 'Unknown OT multiplier.';
				return m;
			},
			1
		);
		return [{ name: at(`ot.${i}.name`, () => name(field(row, 'name')), ''), multiplier, hours }];
	});

	const extras = list(field(raw, 'extras')).flatMap((row, i) => {
		const kind = field(row, 'kind');
		if (kind !== 'per_day' && kind !== 'per_week' && kind !== 'bonus') return [];
		const unitAmount = at(
			`extras.${i}.unitAmount`,
			() => moneyText(field(row, 'unitAmount')),
			null
		);
		let quantity = 1;
		if (kind === 'per_day') {
			quantity = at(
				`extras.${i}.quantity`,
				() => {
					const days = decimalText(
						field(row, 'quantity'),
						0,
						length,
						`Use a number of days, 0 to ${length}.`
					);
					return days ?? 0;
				},
				0
			);
		} else if (kind === 'per_week') {
			quantity = str(field(row, 'quantity')) === '1' ? 1 : 0;
		}
		if (!unitAmount || !quantity) return [];
		const rowName = at(`extras.${i}.name`, () => name(field(row, 'name')), '');
		return [{ name: rowName, kind: kind as ExtraKind, unitAmount, quantity }];
	});

	const notes = str(field(raw, 'notes'));
	if (notes.length > MAX_NOTES) errors.notes = `Keep notes under ${MAX_NOTES} characters.`;

	if (Object.keys(errors).length) return { ok: false, errors };
	return {
		ok: true,
		week: {
			start,
			end,
			currency,
			digits,
			notes: notes || null,
			net: net!,
			deductions,
			days,
			ot,
			extras
		}
	};
}

export const toInput = (week: ParsedWeek): WeekInput => ({
	net: week.net,
	deductions: week.deductions,
	dayHours: week.days.map((d) => d.hours),
	ot: week.ot,
	extras: week.extras
});

/** Database rows for a parsed week (decimal strings, as numeric columns expect). */
export function toWeekRecord(week: ParsedWeek, payslip: Payslip) {
	const money = (minor: number) => fromMinor(minor, week.digits);
	return {
		start: week.start,
		end: week.end,
		summary: {
			currency: week.currency,
			netPay: money(payslip.net),
			totalDeductions: money(payslip.totalDeductions),
			grossPay: money(payslip.gross),
			extrasTotal: money(payslip.extrasTotal),
			payFromHours: money(payslip.payFromHours),
			regularHours: payslip.regularHours.toFixed(2),
			otHours: payslip.otHours.toFixed(2),
			// Stored in major units per hour, unrounded to 4 places.
			hourlyRate:
				payslip.hourlyRate === null ? null : (payslip.hourlyRate / 10 ** week.digits).toFixed(4),
			notes: week.notes
		},
		days: week.days.map((d) => ({ date: d.date, hours: d.hours.toFixed(2) })),
		deductions: week.deductions.map((d, sortOrder) => ({
			name: d.name,
			amount: money(d.amount),
			sortOrder
		})),
		ot: week.ot.map((o, sortOrder) => ({
			name: o.name,
			multiplier: String(o.multiplier),
			hours: o.hours.toFixed(2),
			sortOrder
		})),
		extras: payslip.extras.map((e, sortOrder) => ({
			name: e.name,
			kind: e.kind,
			unitAmount: money(e.unitAmount),
			quantity: String(e.quantity),
			amount: money(e.amount),
			sortOrder
		}))
	};
}

export type WeekRecord = ReturnType<typeof toWeekRecord>;
