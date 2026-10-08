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
	<div class="mb-4 flex items-start gap-3">
		<span
			class="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-active/10 text-xs font-bold text-sidebar-active"
			aria-hidden="true">{step}</span
		>
		<div class="min-w-0 flex-1">
			<h2 class="text-[0.95rem] leading-tight font-semibold text-ink">{title}</h2>
			{#if description}<p class="mt-1 text-sm text-ink-muted">{description}</p>{/if}
		</div>
		{@render action?.()}
	</div>
	<div class="flex flex-col gap-4 sm:gap-5">{@render children()}</div>
</section>
