import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { authFailure, safeNext } from '#lib/server/authForms.ts';

export const load: PageServerLoad = (event) => {
	if (event.locals.user) redirect(303, safeNext(event.url.searchParams.get('next')));
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (error) {
			return authFailure(error, 'Sign in failed', { email });
		}

		redirect(303, safeNext(event.url.searchParams.get('next')));
	}
};
