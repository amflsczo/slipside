<script lang="ts">
	import { cn } from '#lib/utils.ts';

	let {
		current,
		year
	}: {
		current: 'month' | 'year' | 'all';
		/** The year the Year link opens (the one being looked at). */
		year: number;
	} = $props();

	const views = $derived([
		{ id: 'month', label: 'Month', href: '/expenses' },
		{ id: 'year', label: 'Year', href: `/expenses/overview?year=${year}` },
		{ id: 'all', label: 'All time', href: '/expenses/overview?year=all' }
	] as const);
</script>

<!-- Month, year or all time: links, so each view has its own address. -->
<nav aria-label="Expenses view" class="flex rounded-full bg-card p-0.5 shadow-soft">
	{#each views as view (view.id)}
		<a
			href={view.href}
			aria-current={view.id === current ? 'page' : undefined}
			class={cn(
				'grid min-h-9 place-items-center rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors',
				view.id === current
					? 'bg-sidebar-active text-sidebar-active-ink'
					: 'text-ink-muted hover:text-ink'
			)}>{view.label}</a
		>
	{/each}
</nav>
