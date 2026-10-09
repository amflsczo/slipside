<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#lib/utils.ts';

	let {
		summary,
		class: className,
		children
	}: { summary?: Snippet; class?: string; children: Snippet } = $props();
</script>

<!-- Sticks above the dock on phones, near the bottom of the window on desktop.
     Its parent must be a block or flex container (in a grid, sticky is limited to the cell). -->
<div
	class={cn(
		'sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-base-300/70 bg-card/90 p-3 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-md md:bottom-4',
		className
	)}
>
	{#if summary}<div class="min-w-0 flex-1 text-sm text-ink-muted">{@render summary()}</div>{/if}
	<div class="flex flex-1 flex-wrap justify-end gap-2 sm:flex-none">{@render children()}</div>
</div>
