<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	let {
		label,
		required = false,
		optional = false,
		error,
		hint,
		children
	}: {
		label: string;
		required?: boolean;
		optional?: boolean;
		error?: string;
		hint?: string;
		/** Receives the id to put on the control. */
		children: Snippet<[string]>;
	} = $props();

	const id = $props.id();
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-baseline justify-between gap-2">
		<label for={id} class="text-[0.8rem] font-medium text-ink">
			{label}{#if required}<span class="ml-0.5 text-error" aria-hidden="true">*</span>{/if}
		</label>
		{#if optional}<span class="text-xs text-ink-muted">Optional</span>{/if}
	</div>
	{@render children(id)}
	{#if error}
		<p role="alert" class="flex items-center gap-1 text-xs text-error">
			<CircleAlert size={14} aria-hidden="true" />{error}
		</p>
	{:else if hint}
		<p class="text-xs text-ink-muted">{hint}</p>
	{/if}
</div>
