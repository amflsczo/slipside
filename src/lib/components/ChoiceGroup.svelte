<script lang="ts" generics="T extends string | number">
	import Check from '@lucide/svelte/icons/check';
	import { cn } from '#lib/utils.ts';

	let {
		legend,
		hideLegend = false,
		name,
		options,
		value,
		onchange,
		class: className
	}: {
		legend: string;
		hideLegend?: boolean;
		/** Form field name; leave out for choices that aren't submitted. */
		name?: string;
		options: { value: T; label: string; description?: string }[];
		value: T;
		onchange: (value: T) => void;
		/** Grid columns, e.g. 'sm:grid-cols-2 lg:grid-cols-3'. */
		class?: string;
	} = $props();
</script>

<fieldset>
	<legend class={hideLegend ? 'sr-only' : 'mb-1.5 text-[0.8rem] font-medium text-ink'}
		>{legend}</legend
	>
	<div class={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
		{#each options as option (option.value)}
			{@const selected = option.value === value}
			<label
				class={cn(
					'relative flex min-h-10 cursor-pointer flex-col justify-center rounded-xl border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sidebar-active',
					selected
						? 'border-sidebar-active bg-sidebar-active/7 ring-1 ring-sidebar-active ring-inset'
						: 'border-base-300 hover:bg-base-200/60'
				)}
			>
				<input
					type="radio"
					class="sr-only"
					{name}
					value={option.value}
					checked={selected}
					onchange={() => onchange(option.value)}
				/>
				<span class="pr-7 text-sm font-medium text-ink">{option.label}</span>
				{#if option.description}
					<span class="pr-7 text-xs text-ink-muted">{option.description}</span>
				{/if}
				{#if selected}
					<span
						class="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-sidebar-active text-sidebar-active-ink"
						aria-hidden="true"
					>
						<Check size={12} strokeWidth={3} />
					</span>
				{/if}
			</label>
		{/each}
	</div>
</fieldset>
