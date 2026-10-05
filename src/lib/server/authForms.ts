import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';

// Only allow same-site relative redirects after login (no `//evil.com`).
export function safeNext(value: string | null | undefined): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return '/';
	}
	return value;
}

// Turn Better Auth / network errors into a friendly form failure.
export function authFailure<V extends Record<string, string>>(
	error: unknown,
	fallback: string,
	values: V
) {
	if (error instanceof APIError) {
		return fail(400, { ...values, message: error.message || fallback });
	}
	console.error(error);
	return fail(503, {
		...values,
		message: "We couldn't reach the server just now. Please try again."
	});
}
