import type { SubmitFunction } from '$app/forms';
import { toast } from './toast.svelte';

/**
 * use:enhance handler for settings-style forms: tracks the pending state, refreshes the
 * page data once on success and shows the action's message as a toast.
 */
export function feedback(
	setPending: (pending: boolean) => void,
	onSuccess?: () => void
): SubmitFunction {
	return () => {
		setPending(true);
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					await update();
					const message = result.data?.message;
					if (typeof message === 'string') toast.show(message);
					onSuccess?.();
				} else if (result.type === 'failure') {
					await update({ reset: false });
					toast.show(String(result.data?.error ?? 'Something went wrong.'), 'error');
				} else if (result.type === 'redirect') {
					await update();
				} else {
					toast.show("Couldn't save just now. Please try again.", 'error');
				}
			} finally {
				setPending(false);
			}
		};
	};
}
