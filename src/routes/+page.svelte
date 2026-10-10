<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Settings from '@lucide/svelte/icons/settings';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import WeekEditor from '#lib/components/WeekEditor.svelte';
	import WeekPicker from '#lib/components/WeekPicker.svelte';
	import { minorDigits, toMinor } from '#lib/format/money.ts';
	import { clock, firstName, greeting, longDay } from '#lib/greeting.svelte.ts';
	import { addDays } from '#lib/dates.ts';
	import { buildForm } from '#lib/week/form.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const initial = $derived(
		data.needsSetup
			? null
			: buildForm(
					// Until this page moves to pay periods, every period is a 7-day week.
					{ start: data.weekStart, end: addDays(data.weekStart, 6) },
					data.currency,
					data.types,
					data.saved
				)
	);

	// The usual rate is in the Settings currency, so it only applies to weeks in that currency.
	const usualRate = $derived(
		!data.needsSetup && data.usualRate && initial?.currency === data.currency
			? toMinor(data.usualRate, minorDigits(data.currency))
			: null
	);
</script>

<div class="flex flex-col gap-4 sm:gap-5">
	<PageHeader
		eyebrow={longDay(clock.now)}
		title="{greeting(clock.now)}, {firstName(data.user?.name ?? '')}"
		subtitle="Enter your payslip and hours to see where your pay comes from."
		icon={CalendarDays}
	/>

	{#if data.needsSetup || !initial}
		<EmptyState
			icon={Settings}
			title="Set up your pay first"
			hint="Choose your currency, pay week and deductions in Settings. It takes a minute."
		>
			{#snippet action()}<Button href="/settings">Go to Settings</Button>{/snippet}
		</EmptyState>
	{:else}
		<WeekPicker
			weekStart={data.weekStart}
			currentWeek={data.currentWeek}
			previousWeek={data.previousWeek}
			nextWeek={data.nextWeek}
		/>

		<!-- Remounts (fresh form + draft check) when the week changes or after a save. -->
		{#key `${data.weekStart}:${data.saved?.updatedAt ?? 'new'}`}
			<WeekEditor
				{initial}
				owner={data.user?.email ?? ''}
				saved={data.saved !== null}
				{usualRate}
				tolerancePct={data.rateTolerancePct}
			/>
		{/key}
	{/if}
</div>
