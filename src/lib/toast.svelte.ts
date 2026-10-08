// One app-wide toast for save / error messages (rendered in +layout.svelte).
type Toast = { id: number; text: string; kind: 'success' | 'error' | 'info' | 'warning' };

let current = $state<Toast | null>(null);
let nextId = 0;

export const toast = {
	get current() {
		return current;
	},
	show(text: string, kind: Toast['kind'] = 'success') {
		const id = ++nextId;
		current = { id, text, kind };
		// UI timer only; nothing here talks to the server. Warnings and errors stay longer to read.
		setTimeout(
			() => {
				if (current?.id === id) current = null;
			},
			kind === 'warning' || kind === 'error' ? 6000 : 3500
		);
	},
	dismiss() {
		current = null;
	}
};
