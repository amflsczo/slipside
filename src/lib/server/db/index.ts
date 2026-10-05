import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import { retryingFetch } from './retry';
import { DATABASE_URL } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Neon's HTTP driver: one stateless request per query, no pool, no keep-alive,
// so nothing touches the database unless a request needs it.
neonConfig.fetchFunction = retryingFetch;

const client = neon(DATABASE_URL);

export const db = drizzle(client, { schema });
