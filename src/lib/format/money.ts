// Money as integer minor units (cents, pence; whole yen for JPY), so sums never drift.

/** Decimal places the currency uses: 2 for GBP, 0 for JPY. Unknown codes fall back to 2. */
export function minorDigits(currency: string): number {
	try {
		return (
			new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
				.maximumFractionDigits ?? 2
		);
	} catch {
		return 2;
	}
}

/**
 * Parses a plain amount into minor units without floating-point error: "12.5" → 1250.
 * Returns null for anything that isn't a plain number, or that has more decimals than the
 * currency allows (trailing zeros are fine, so the database's "1000.00" works for JPY).
 */
export function toMinor(value: string | number, digits: number): number | null {
	const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(String(value).trim());
	if (!match || (!match[2] && !match[3])) return null;
	const [, sign, whole, fraction = ''] = match;
	if (/[^0]/.test(fraction.slice(digits))) return null;
	const minor = Number((whole || '0') + fraction.slice(0, digits).padEnd(digits, '0'));
	return sign && minor !== 0 ? -minor : minor;
}

/** Minor units back to a plain decimal string for the database: 1250 → "12.50". */
export function fromMinor(minor: number, digits: number): string {
	const abs = String(Math.abs(Math.round(minor))).padStart(digits + 1, '0');
	const whole = abs.slice(0, abs.length - digits);
	const fraction = digits ? `.${abs.slice(abs.length - digits)}` : '';
	return `${minor < 0 ? '-' : ''}${whole}${fraction}`;
}

/** 1250, 'GBP' → "£12.50". */
export function formatMoney(minor: number, currency: string, locale?: string): string {
	const digits = minorDigits(currency);
	return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
		minor / 10 ** digits
	);
}

/** The hourly rate is kept unrounded in the maths and rounded only here, for display. */
export function formatRate(minorPerHour: number, currency: string, locale?: string): string {
	return formatMoney(Math.round(minorPerHour), currency, locale);
}
