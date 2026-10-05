import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';
import { authFailure } from '#lib/server/authForms.ts';

const MIN_PASSWORD = 8;

export const load: PageServerLoad = (event) => {
	if (event.locals.user) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const values = { name, email };

		if (!name || !email) {
			return fail(400, { ...values, message: 'Please enter your name and email.' });
		}
		if (password.length < MIN_PASSWORD) {
			return fail(400, {
				...values,
				message: `Password must be at least ${MIN_PASSWORD} characters.`
			});
		}

		try {
			// Signs the new user in straight away.
			await auth.api.signUpEmail({ body: { name, email, password } });
		} catch (error) {
			return authFailure(error, 'Registration failed', values);
		}

		redirect(303, '/');
	}
};
