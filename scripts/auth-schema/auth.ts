// Used only by `npm run auth:schema` to generate src/lib/server/db/auth.schema.ts.
// The Better Auth CLI can't load SvelteKit 3 modules ($app/*), so this mirrors the
// schema-affecting options of src/lib/server/auth.ts. Keep the two in sync when
// adding plugins or user fields.
import { betterAuth } from 'better-auth/minimal';

export const auth = betterAuth({
	emailAndPassword: { enabled: true }
});
