<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import { cn } from '#lib/utils.ts';

	type Tone = 'accent' | 'positive' | 'negative' | 'warning' | 'error' | 'info';

	let {
		icon: Icon,
		label,
		value,
		unit,
		hint,
		tone = 'accent'
	}: {
		icon?: LucideIcon;
		label: string;
		value: string;
		unit?: string;
		hint?: string;
		tone?: Tone;
	} = $props();

	const TONES: Record<Tone, string> = {
		accent: 'text-sidebar-active',
		positive: 'text-positive',
		negative: 'text-negative',
		warning: 'text-warning',
		error: 'text-error',
		info: 'text-info'
	};
</script>

<div class="min-w-0">
	<p
		class="flex items-center gap-1.5 font-mono text-[0.7rem] font-medium tracking-wider text-ink-muted uppercase"
	>
		{#if Icon}<Icon size={13} class={cn('shrink-0', TONES[tone])} aria-hidden="true" />{/if}
		<span class="truncate">{label}</span>
	</p>
	<p class="mt-1 truncate font-display text-lg font-semibold text-ink">
		{value}{#if unit}<span class="ml-0.5 font-sans text-xs font-medium text-ink-muted">{unit}</span
			>{/if}
	</p>
	{#if hint}<p class="truncate text-xs text-ink-muted">{hint}</p>{/if}
</div>
