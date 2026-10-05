// Retry helper for Neon cold starts (PLAN.md section 2a, rule 3).
// Only retries failures where the database could not be reached; query errors
// (bad SQL, constraint violations) are returned to the caller straight away.

const RETRIES = 2;
const DELAY_MS = 500;

// Gateway-style statuses mean the request never reached a running database.
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
	fn: () => Promise<T>,
	shouldRetry: (error: unknown) => boolean = () => true
): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (attempt >= RETRIES || !shouldRetry(error)) throw error;
			await sleep(DELAY_MS);
		}
	}
}

class RetryableResponse extends Error {
	constructor(readonly response: Response) {
		super(`Database unavailable (HTTP ${response.status})`);
	}
}

// Drop-in replacement for fetch, used by the Neon HTTP driver for every query.
// A thrown fetch error is a network failure, so the query never ran.
export const retryingFetch: typeof fetch = async (input, init) => {
	try {
		return await withRetry(async () => {
			const response = await fetch(input, init);
			if (RETRYABLE_STATUS.has(response.status)) throw new RetryableResponse(response);
			return response;
		});
	} catch (error) {
		// Out of retries on a gateway status: hand the last response to the driver as-is.
		if (error instanceof RetryableResponse) return error.response;
		throw error;
	}
};
