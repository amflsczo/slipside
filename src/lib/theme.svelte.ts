// Light / dark mode for this device. app.html applies the saved choice before first paint;
// with nothing saved it follows the OS setting.
export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'app-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

let mode = $state<ThemeMode>('system');
let resolved = $state<'light' | 'dark'>('light');

function apply() {
	resolved = mode === 'system' ? (darkQuery().matches ? 'dark' : 'light') : mode;
	document.documentElement.setAttribute('data-theme', resolved);
}

export const theme = {
	get mode() {
		return mode;
	},
	get resolved() {
		return resolved;
	},
	/** Call once in the browser (root layout). Returns a cleanup function. */
	init() {
		try {
			const stored = localStorage.getItem(KEY);
			if (stored === 'light' || stored === 'dark') mode = stored;
		} catch {
			// storage unavailable: follow the OS
		}
		apply();
		const query = darkQuery();
		const onChange = () => mode === 'system' && apply();
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	},
	set(value: ThemeMode) {
		mode = value;
		try {
			if (value === 'system') localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, value);
		} catch {
			// storage unavailable: applies for this visit only
		}
		apply();
	},
	toggle() {
		theme.set(resolved === 'dark' ? 'light' : 'dark');
	}
};
