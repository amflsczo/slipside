<script lang="ts" generics="T extends string">
	import { cn } from '#lib/utils.ts';

	let {
		tabs,
		value,
		onchange,
		label,
		idPrefix
	}: {
		tabs: readonly { id: T; label: string }[];
		value: T;
		onchange: (id: T) => void;
		label: string;
		/** Tabs get id `${idPrefix}-tab-${id}` and control `${idPrefix}-panel`. */
		idPrefix: string;
	} = $props();

	function select(id: T, button: HTMLButtonElement) {
		onchange(id);
		button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}
</script>

<!-- Phones: tabs wrap and stretch evenly. sm+: one row that scrolls sideways. -->
<div
	role="tablist"
	aria-label={label}
	class="flex flex-wrap gap-1 rounded-3xl border border-base-300/70 bg-card p-1 sm:flex-nowrap sm:overflow-x-auto sm:rounded-full"
>
	{#each tabs as tab (tab.id)}
		{@const active = tab.id === value}
		<button
			type="button"
			role="tab"
			id="{idPrefix}-tab-{tab.id}"
			aria-selected={active}
			aria-controls="{idPrefix}-panel"
			class={cn(
				'min-h-10 flex-1 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 sm:flex-none',
				active ? 'bg-sidebar-active text-sidebar-active-ink' : 'text-ink-muted hover:bg-base-200/60'
			)}
			onclick={(e) => select(tab.id, e.currentTarget)}>{tab.label}</button
		>
	{/each}
</div>
