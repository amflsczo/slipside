<script lang="ts">
	import ChoiceGroup from './ChoiceGroup.svelte';
	import { theme, type ThemeMode } from '#lib/theme.svelte.ts';

	const OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
		{ value: 'system', label: 'Match this device', description: 'Follows your phone or computer' },
		{ value: 'light', label: 'Light', description: 'Always light' },
		{ value: 'dark', label: 'Dark', description: 'Always dark' }
	];
</script>

<ChoiceGroup
	legend="Theme (this device)"
	options={OPTIONS}
	value={theme.mode}
	onchange={theme.set}
	class="sm:grid-cols-3"
/>
