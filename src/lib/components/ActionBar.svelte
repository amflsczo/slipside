<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#lib/utils.ts';

	let {
		summary,
		class: className,
		children
	}: { summary?: Snippet; class?: string; children: Snippet } = $props();
</script>

<!-- The form's last card. Phones: status on its own line, then a full-width row of buttons.
     sm+: one row, status on the left and buttons on the right. It stays in the page flow. -->
<div
	class={cn(
		'flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:px-6',
		className
	)}
>
	{#if summary}<div class="min-w-0 text-sm text-ink-muted sm:flex-1">{@render summary()}</div>{/if}
	<div class="flex items-center gap-2 sm:justify-end">{@render children()}</div>
</div>
