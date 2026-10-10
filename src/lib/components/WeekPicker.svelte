<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Button from './Button.svelte';
	import { formatRange, type IsoDate } from '#lib/dates.ts';
	import { contains, dayCount, type Period } from '#lib/period.ts';

	let {
		period,
		today,
		previousHref,
		nextHref,
		homeHref
	}: {
		period: Period;
		today: IsoDate;
		previousHref: string;
		/** null when the next payslip would start after today. */
		nextHref: string | null;
		/** The next payslip to fill in, when this isn't it. */
		homeHref: string | null;
	} = $props();

	const days = $derived(dayCount(period));
	const detail = $derived(
		`${days} ${days === 1 ? 'day' : 'days'}${contains(period, today) ? ' · includes today' : ''}`
	);
	const arrow =
		'grid size-10 shrink-0 place-items-center rounded-full text-ink transition-colors duration-150 hover:bg-base-200';
</script>

<div class="flex flex-wrap items-center gap-2">
	<nav
		aria-label="Pay period"
		class="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-card p-1 shadow-soft sm:max-w-sm sm:flex-none"
	>
		<a href={previousHref} class={arrow} aria-label="Previous payslip">
			<ChevronLeft size={18} aria-hidden="true" />
		</a>
		<div class="min-w-0 flex-1 px-2 text-center" aria-live="polite">
			<p class="truncate font-display text-base font-semibold text-ink sm:min-w-52">
				{formatRange(period.start, period.end)}
			</p>
			<p class="font-mono text-[0.7rem] font-medium tracking-wider text-ink-muted uppercase">
				{detail}
			</p>
		</div>
		{#if nextHref}
			<a href={nextHref} class={arrow} aria-label="Next payslip">
				<ChevronRight size={18} aria-hidden="true" />
			</a>
		{:else}
			<!-- No future payslips: shown but not usable, so the layout doesn't shift. -->
			<span class="{arrow} pointer-events-none opacity-30" aria-hidden="true">
				<ChevronRight size={18} />
			</span>
		{/if}
	</nav>
	{#if homeHref}
		<Button variant="secondary" href={homeHref} class="rounded-full">Go to latest</Button>
	{/if}
</div>
