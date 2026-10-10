<script lang="ts">
	import type { Snippet } from 'svelte';
	import Info from '@lucide/svelte/icons/info';

	let {
		label,
		children
	}: {
		/** Read out for the button, e.g. "What does Paid this time mean?" */
		label: string;
		/** The explanation: one or two short sentences. */
		children: Snippet;
	} = $props();

	let open = $state(false);
	let root: HTMLSpanElement;
	const id = $props.id();

	function onWindowClick(event: MouseEvent) {
		if (open && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<!-- A small "i" that opens a short explanation. Tap or click to open; Escape, a tap elsewhere
     or moving focus away closes it. -->
<span
	bind:this={root}
	class="relative inline-flex"
	role="presentation"
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) {
			e.stopPropagation();
			open = false;
		}
	}}
	onfocusout={(e) => {
		if (!root.contains(e.relatedTarget as Node | null)) open = false;
	}}
>
	<button
		type="button"
		class="grid size-6 place-items-center rounded-full text-ink-muted transition-colors hover:bg-base-200 hover:text-sidebar-active aria-expanded:bg-sidebar-active/10 aria-expanded:text-sidebar-active"
		aria-label={label}
		aria-expanded={open}
		aria-controls={id}
		onclick={() => (open = !open)}
	>
		<Info size={15} aria-hidden="true" />
	</button>
	{#if open}
		<span
			{id}
			role="note"
			class="absolute top-full left-1/2 z-30 mt-1.5 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-ink px-3 py-2.5 text-xs leading-relaxed text-card shadow-[0_12px_30px_-10px_rgb(0_0_0/0.4)] sm:left-0 sm:translate-x-0"
		>
			{@render children()}
		</span>
	{/if}
</span>
