<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { cn } from '#lib/utils.ts';

	type Tone = 'neutral' | 'success' | 'warning' | 'error';

	let {
		tone = 'neutral',
		title,
		children,
		action,
		class: className
	}: {
		tone?: Tone;
		title: string;
		children?: Snippet;
		action?: Snippet;
		class?: string;
	} = $props();

	const TONES = {
		neutral: { box: 'border-base-300 bg-base-200/60', icon: 'text-ink-muted', Icon: Info },
		success: { box: 'border-positive/30 bg-positive/7', icon: 'text-positive', Icon: CircleCheck },
		warning: { box: 'border-warning/40 bg-warning/8', icon: 'text-warning', Icon: TriangleAlert },
		error: { box: 'border-error/30 bg-error/6', icon: 'text-error', Icon: CircleAlert }
	};
	const style = $derived(TONES[tone]);
</script>

<div class={cn('flex items-start gap-3 rounded-2xl border px-4 py-3', style.box, className)}>
	<style.Icon size={18} class={cn('mt-px shrink-0', style.icon)} aria-hidden="true" />
	<div class="min-w-0 flex-1 text-sm">
		<p class="font-bold text-ink">{title}</p>
		{#if children}<div class="mt-0.5 text-ink-muted">{@render children()}</div>{/if}
	</div>
	{@render action?.()}
</div>
