import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Neon connection string.' },
	BETTER_AUTH_URL: {
		description:
			'The app origin (base URL): `http://localhost:5173` locally, the Vercel URL in production.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. Use a long random string (32+ characters). See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	}
});
