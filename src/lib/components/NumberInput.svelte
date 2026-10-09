<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.ts';

	let {
		value = $bindable(''),
		symbol,
		suffix,
		invalid = false,
		class: className,
		...rest
	}: Omit<HTMLInputAttributes, 'value' | 'class'> & {
		value?: string;
		/** Shown before the number, e.g. "£". */
		symbol?: string;
		/** Shown after the number, e.g. "hrs". */
		suffix?: string;
		invalid?: boolean;
		class?: string;
	} = $props();
</script>

<!-- A div, not a label: the Field's own <label for> names the input. -->
<div class={cn('input w-full', invalid && 'input-error', className)}>
	{#if symbol}<span class="text-ink-muted" aria-hidden="true">{symbol}</span>{/if}
	<input
		bind:value
		class="min-w-0 tabular-nums"
		inputmode="decimal"
		autocomplete="off"
		aria-invalid={invalid || undefined}
		{...rest}
	/>
	{#if suffix}<span class="text-xs text-ink-muted" aria-hidden="true">{suffix}</span>{/if}
</div>
