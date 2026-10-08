<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '#lib/utils.ts';

	type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

	let {
		variant = 'primary',
		size = 'md',
		href,
		loading = false,
		disabled = false,
		class: className,
		children,
		...rest
	}: Omit<HTMLButtonAttributes, 'class'> & {
		variant?: Variant;
		size?: 'sm' | 'md';
		href?: string;
		loading?: boolean;
		class?: string;
		children: Snippet;
	} = $props();

	const VARIANTS: Record<Variant, string> = {
		primary: 'bg-sidebar-active text-sidebar-active-ink hover:brightness-110',
		accent: 'bg-positive text-positive-ink hover:brightness-110',
		secondary: 'border border-base-300 bg-card text-ink hover:bg-base-200',
		ghost: 'text-ink-muted hover:bg-base-200 hover:text-ink',
		danger: 'bg-error text-white hover:brightness-110'
	};
	const SIZES = { sm: 'min-h-8 px-3 py-1.5 text-xs', md: 'min-h-10 px-4 py-2 text-sm' };

	const classes = $derived(
		cn(
			'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
			VARIANTS[variant],
			SIZES[size],
			className
		)
	);
</script>

{#if href}
	<a {href} class={classes} {...rest as HTMLAnchorAttributes}>{@render children()}</a>
{:else}
	<button class={classes} disabled={disabled || loading} {...rest}>
		{#if loading}<span class="loading loading-xs loading-spinner" aria-hidden="true"></span>{/if}
		{@render children()}
	</button>
{/if}
