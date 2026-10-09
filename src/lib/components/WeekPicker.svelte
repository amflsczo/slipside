<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Button from './Button.svelte';
	import { addDays, formatRange, type IsoDate } from '#lib/dates.ts';

	let {
		weekStart,
		currentWeek,
		previousWeek,
		nextWeek
	}: {
		weekStart: IsoDate;
		currentWeek: IsoDate;
		previousWeek: IsoDate;
		/** null when this is the current week (no future weeks). */
		nextWeek: IsoDate | null;
	} = $props();

	const weeksAgo = $derived(
		Math.round((Date.parse(currentWeek) - Date.parse(weekStart)) / (7 * 24 * 3600 * 1000))
	);
	const relative = $derived(
		weeksAgo === 0
			? 'This week'
			: weeksAgo === 1
				? 'Last week'
				: weeksAgo > 1
					? `${weeksAgo} weeks ago`
					: 'A future week'
	);
	const arrow =
		'grid size-10 shrink-0 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-base-200';
</script>

<div class="flex flex-wrap items-center gap-2">
	<nav
		aria-label="Week"
		class="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-card p-1 shadow-soft sm:max-w-sm sm:flex-none"
	>
		<a href="/?week={previousWeek}" class={arrow} aria-label="Previous week">
			<ChevronLeft size={18} aria-hidden="true" />
		</a>
		<div class="min-w-0 flex-1 px-2 text-center" aria-live="polite">
			<p class="truncate font-display text-base font-semibold text-ink sm:min-w-52">
				{formatRange(weekStart, addDays(weekStart, 6))}
			</p>
			<p class="font-mono text-[0.7rem] font-medium tracking-wider text-ink-muted uppercase">
				{relative}
			</p>
		</div>
		{#if nextWeek}
			<a href="/?week={nextWeek}" class={arrow} aria-label="Next week">
				<ChevronRight size={18} aria-hidden="true" />
			</a>
		{:else}
			<!-- No future weeks: shown but not usable, so the layout doesn't shift. -->
			<span class="{arrow} pointer-events-none opacity-30" aria-hidden="true">
				<ChevronRight size={18} />
			</span>
		{/if}
	</nav>
	{#if weekStart !== currentWeek}
		<Button variant="secondary" href="/" class="rounded-full">Go to this week</Button>
	{/if}
</div>
