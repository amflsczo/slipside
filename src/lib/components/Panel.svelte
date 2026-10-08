<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.ts';

	let {
		title,
		subtitle,
		action,
		class: className,
		children
	}: {
		title?: string;
		subtitle?: string;
		action?: Snippet;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<section class={cn('rounded-3xl bg-card p-4 shadow-soft sm:p-6', className)}>
	{#if title || action}
		<div class="mb-4 flex items-start justify-between gap-3">
			<div class="min-w-0">
				{#if title}<h2 class="text-base font-bold">{title}</h2>{/if}
				{#if subtitle}<p class="mt-0.5 text-sm text-ink-muted">{subtitle}</p>{/if}
			</div>
			{@render action?.()}
		</div>
	{/if}
	{@render children()}
</section>
