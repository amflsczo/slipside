<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#lib/utils.ts';

	let {
		summary,
		class: className,
		children
	}: { summary?: Snippet; class?: string; children: Snippet } = $props();
</script>

<!-- The form's last card: status on the left, actions on the right. It stays in the page flow. -->
<div
	class={cn(
		'flex flex-wrap items-center gap-3 rounded-3xl bg-card p-4 shadow-soft sm:px-6',
		className
	)}
>
	{#if summary}<div class="min-w-0 flex-1 text-sm text-ink-muted">{@render summary()}</div>{/if}
	<div class="flex flex-1 flex-wrap justify-end gap-2 sm:flex-none">{@render children()}</div>
</div>
