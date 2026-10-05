import type { PageServerLoad } from './$types';

// hooks.server.ts already guarantees a signed-in user here.
export const load: PageServerLoad = (event) => {
	return { user: event.locals.user! };
};
