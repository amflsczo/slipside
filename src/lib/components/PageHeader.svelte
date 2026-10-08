<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let {
		title,
		subtitle,
		eyebrow,
		icon: Icon,
		back = false,
		action
	}: {
		title: string;
		subtitle?: string;
		/** Small uppercase line above the title. Space is kept even while it's empty. */
		eyebrow?: string;
		icon?: LucideIcon;
		/** Show the back button (pages you drill into, not top-level nav pages). */
		back?: boolean;
		action?: Snippet;
	} = $props();
</script>

<header class="flex items-center gap-3">
	{#if back}
		<button
			type="button"
			class="grid size-10 shrink-0 place-items-center rounded-full bg-card text-ink shadow-soft hover:bg-base-200"
			aria-label="Go back"
			onclick={() => history.back()}
		>
			<ArrowLeft size={18} aria-hidden="true" />
		</button>
	{/if}
	{#if Icon}
		<div
			class="hidden size-11 shrink-0 place-items-center rounded-2xl bg-sidebar-active/12 text-sidebar-active sm:grid"
		>
			<Icon size={22} aria-hidden="true" />
		</div>
	{/if}
	<div class="min-w-0 flex-1">
		{#if eyebrow !== undefined}
			<p class="mb-0.5 min-h-4 text-[0.7rem] font-semibold tracking-wider text-ink-muted uppercase">
				{eyebrow}
			</p>
		{/if}
		<h1 class="text-xl leading-tight font-extrabold text-ink sm:text-2xl">{title}</h1>
		{#if subtitle}<p class="mt-0.5 line-clamp-2 text-sm text-ink-muted">{subtitle}</p>{/if}
	</div>
	{@render action?.()}
</header>
