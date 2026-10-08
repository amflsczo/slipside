import { fail, type ActionFailure } from '@sveltejs/kit';
import { isDuplicateName } from './queries';

/** A validation problem to show to the user as-is. */
export class FormError extends Error {}

const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

export function text(form: FormData, key: string, label: string, max = 60): string {
	const value = (form.get(key)?.toString() ?? '').trim().replace(/\s+/g, ' ');
	if (!value) throw new FormError(`Please enter a ${label}.`);
	if (value.length > max) throw new FormError(`${capitalise(label)} is too long (max ${max}).`);
	return value;
}

// Accepts "1,234.50", "1234.5", " 12 " and returns a plain decimal string.
function decimal(form: FormData, key: string, label: string, places: number): string | null {
	const raw = (form.get(key)?.toString() ?? '').replace(/[\s,]/g, '');
	if (!raw) return null;
	if (!new RegExp(`^\\d{1,9}(\\.\\d{0,${places}})?$`).test(raw)) {
		throw new FormError(
			`${capitalise(label)} must be a number with at most ${places} decimal places.`
		);
	}
	return raw.replace(/\.$/, '');
}

export function money(form: FormData, key: string, label: string): string | null {
	return decimal(form, key, label, 2);
}

export function multiplier(form: FormData, key: string): string {
	const value = decimal(form, key, 'multiplier', 3);
	if (value === null) throw new FormError('Please enter a multiplier, for example 1.5.');
	const n = Number(value);
	if (n <= 0 || n > 10) throw new FormError('Multiplier must be between 0 and 10.');
	return value;
}

export function percent(form: FormData, key: string, label: string): string {
	const value = decimal(form, key, label, 2) ?? '0';
	if (Number(value) > 100) throw new FormError(`${capitalise(label)} must be 100 or less.`);
	return value;
}

export function currency(form: FormData, key: string): string {
	const value = (form.get(key)?.toString() ?? '').trim().toUpperCase();
	if (!CURRENCIES.has(value)) throw new FormError('Please choose a currency.');
	return value;
}

export function oneOf<T extends string>(form: FormData, key: string, options: readonly T[]): T {
	const value = form.get(key)?.toString() ?? '';
	if (!options.includes(value as T)) throw new FormError('Please choose an option from the list.');
	return value as T;
}

export function int(form: FormData, key: string, min: number, max: number): number {
	const value = Number(form.get(key));
	if (!Number.isInteger(value) || value < min || value > max) {
		throw new FormError('Please choose an option from the list.');
	}
	return value;
}

/**
 * Runs a form action, turning failures into friendly messages:
 * validation → 400, duplicate name → 400, anything else (e.g. database unreachable) → 503.
 */
export async function runAction(
	work: () => Promise<void>,
	successMessage: string
): Promise<{ message: string } | ActionFailure<{ error: string }>> {
	try {
		await work();
		return { message: successMessage };
	} catch (error) {
		if (error instanceof FormError) return fail(400, { error: error.message });
		if (isDuplicateName(error)) {
			return fail(400, { error: 'That name is already in this list.' });
		}
		console.error(error);
		return fail(503, { error: "Couldn't save just now. Please try again." });
	}
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
