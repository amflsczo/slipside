// Time-of-day greeting. The time zone is only known in the browser, so the server renders
// the neutral fallback and the clock fills in once the root layout starts it.
let now = $state<Date | null>(null);

export const clock = {
	get now() {
		return now;
	},
	/** Call once in the browser (root layout). Returns a cleanup function. */
	start() {
		now = new Date();
		const timer = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(timer);
	}
};

export function greeting(date: Date | null) {
	if (!date) return 'Hello';
	const hour = date.getHours();
	if (hour >= 5 && hour < 12) return 'Good morning';
	if (hour >= 12 && hour < 18) return 'Good afternoon';
	return 'Good evening';
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "Wednesday, Oct 8" in the viewer's time zone; empty until the clock starts. */
export const longDay = (date: Date | null) =>
	date ? date.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' }) : '';
