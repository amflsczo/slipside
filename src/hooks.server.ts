import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';

// Everything else requires a signed-in user.
const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];

const isPublic = (pathname: string) =>
	PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!building) {
		const session = await auth.api.getSession({ headers: event.request.headers });

		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}

		if (!event.locals.user && !isPublic(event.url.pathname)) {
			const next = event.url.pathname + event.url.search;
			redirect(303, next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`);
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
