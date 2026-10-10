<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cn } from '#lib/utils.ts';

	let {
		summary,
		class: className,
		children
	}: { summary?: Snippet; class?: string; children: Snippet } = $props();
</script>

<!-- The form's last card: a short status on the left, the actions on the right, in one row.
     It stays in the page flow. -->
<div
	class={cn(
		'flex items-center gap-3 rounded-3xl bg-card py-3 pr-3 pl-5 shadow-soft sm:py-3.5 sm:pr-4 sm:pl-6',
		className
	)}
>
	<div class="min-w-0 flex-1 text-sm text-ink-muted">{@render summary?.()}</div>
	<div class="flex shrink-0 items-center gap-1.5">{@render children()}</div>
</div>
