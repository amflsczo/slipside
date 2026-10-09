<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		step,
		title,
		description,
		action,
		children
	}: {
		step: number;
		title: string;
		description?: string;
		action?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class="form-surface rounded-3xl bg-card p-4 shadow-soft sm:p-6">
	<!-- Numbered like a ledger entry: 01, 02… -->
	<div class="mb-4 flex items-start gap-3 border-b border-dashed border-rule pb-3.5">
		<span
			class="mt-0.5 shrink-0 font-mono text-xs font-semibold text-sidebar-active tabular-nums"
			aria-hidden="true">{String(step).padStart(2, '0')}</span
		>
		<div class="min-w-0 flex-1">
			<h2 class="font-display text-lg leading-tight font-semibold text-ink">{title}</h2>
			{#if description}<p class="mt-1 text-sm text-ink-muted">{description}</p>{/if}
		</div>
		{@render action?.()}
	</div>
	<div class="flex flex-col gap-4 sm:gap-5">{@render children()}</div>
</section>
