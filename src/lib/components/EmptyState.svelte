<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';

	let {
		icon: Icon,
		title,
		hint,
		level,
		action
	}: {
		icon: LucideIcon;
		title: string;
		hint?: string;
		/** Render the title as a heading of this level (e.g. 1 on the error page). */
		level?: 1 | 2 | 3;
		action?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-col items-center rounded-2xl border border-dashed border-base-300/70 bg-card px-6 py-14 text-center"
>
	<div
		class="mb-3 grid size-12 place-items-center rounded-full bg-sidebar-active/10 text-sidebar-active"
	>
		<Icon size={22} aria-hidden="true" />
	</div>
	<svelte:element this={level ? `h${level}` : 'p'} class="text-base font-bold text-ink">
		{title}
	</svelte:element>
	{#if hint}<p class="mt-1 max-w-xs text-sm text-ink-muted">{hint}</p>{/if}
	{#if action}<div class="mt-5">{@render action()}</div>{/if}
</div>
