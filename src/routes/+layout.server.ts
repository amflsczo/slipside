import type { LayoutServerLoad } from './$types';

// From the session cookie (hooks.server.ts); no database query here.
export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user ? { name: locals.user.name, email: locals.user.email } : null
	};
};
