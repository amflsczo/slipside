<script lang="ts">
	import { goto } from '$app/navigation';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Settings from '@lucide/svelte/icons/settings';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ExpenseViews from '#lib/components/ExpenseViews.svelte';
	import MonthSlip from '#lib/components/MonthSlip.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SpendingChart from '#lib/components/SpendingChart.svelte';
	import { monthLabel } from '#lib/dates.ts';
	import { formatMoney } from '#lib/format/money.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const money = (minor: number) => (data.needsSetup ? '' : formatMoney(minor, data.currency));
	const signed = (minor: number) => `${minor < 0 ? '−' : ''}${money(Math.abs(minor))}`;
	const count = (n: number) => `${n} ${n === 1 ? 'expense' : 'expenses'}`;
	/** Keeps the currency when more than one is in use. */
	const withCurrency = (href: string) =>
		!data.needsSetup && data.currencies.length > 1
			? `${href}${href.includes('?') ? '&' : '?'}currency=${data.currency}`
			: href;
	const monthHref = (month: string) =>
		withCurrency(
			!data.needsSetup && month === data.thisMonth ? '/expenses' : `/expenses?month=${month}`
		);
	const yearHref = (year: number) => withCurrency(`/expenses/overview?year=${year}`);

	const rangeTitle = $derived(
		data.needsSetup
			? ''
			: data.allTime
				? 'All time'
				: `${data.year}${data.year === data.thisYear ? ' so far' : ''}`
	);
	/** Months with anything in them, newest first (the chart shows the empty ones too). */
	const monthCards = $derived(
		data.needsSetup ? [] : [...data.months].filter((m) => m.count || m.payslips).reverse()
	);
	const hasExpenses = $derived(!data.needsSetup && data.summary.spent > 0);

	function choose(param: 'year' | 'currency', value: string) {
		const url = new URL(location.href);
		url.searchParams.set(param, value);
		if (param === 'year') url.searchParams.delete('currency');
		goto(url, { reset: false });
	}
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
	<PageHeader
		title="Expenses"
		subtitle={!data.needsSetup && data.allTime
			? 'All your spending, by year. Pick a year to see its months.'
			: 'Your spending, month by month.'}
		icon={Wallet}
	/>

	{#if data.needsSetup}
		<EmptyState
			icon={Settings}
			title="Set up your pay first"
			hint="Choose your currency in Settings. Expenses are kept in it."
		>
			{#snippet action()}<Button href="/settings">Go to Settings</Button>{/snippet}
		</EmptyState>
	{:else}
		<!-- View, year (and currency, when more than one is used), with the total. -->
		<div class="form-surface flex flex-wrap items-center gap-2">
			<ExpenseViews current={data.allTime ? 'all' : 'year'} year={data.year} />
			{#if !data.allTime}
				<label class="sr-only" for="expenses-year">Year</label>
				<select
					id="expenses-year"
					class="select w-auto min-w-24 font-semibold"
					value={String(data.year)}
					onchange={(e) => choose('year', e.currentTarget.value)}
				>
					{#each data.years as y (y)}
						<option value={String(y)}>{y}</option>
					{/each}
				</select>
			{/if}
			{#if data.currencies.length > 1}
				<label class="sr-only" for="expenses-currency">Currency</label>
				<select
					id="expenses-currency"
					class="select w-auto min-w-24"
					value={data.currency}
					onchange={(e) => choose('currency', e.currentTarget.value)}
				>
					{#each data.currencies as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
			{/if}
			{#if hasExpenses}
				<p class="ml-auto text-sm text-ink-muted">
					<span class="font-mono font-semibold text-ink tabular-nums"
						>{money(data.summary.spent)}</span
					>
					spent{data.allTime ? ' all time' : ` in ${data.year}`}
				</p>
			{/if}
		</div>

		{#if !hasExpenses}
			<EmptyState
				icon={Wallet}
				title={data.allTime ? 'No expenses yet' : `No expenses in ${data.year}`}
				hint={data.allTime
					? 'Add what you spend on the Month view. Your months and years add up here.'
					: 'Expenses dated this year show up here, month by month.'}
			>
				{#snippet action()}<Button href="/expenses">Add an expense</Button>{/snippet}
			</EmptyState>
		{:else}
			<SpendingChart points={data.months} currency={data.currency} hrefFor={monthHref} />

			<div class="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div class="flex min-w-0 flex-col gap-3">
					{#if data.allTime}
						<!-- One card per year, opening that year. -->
						{#each data.yearGroups as group (group.year)}
							{@render card(
								yearHref(group.year),
								`${group.year}${group.year === data.thisYear ? ' so far' : ''}`,
								group
							)}
						{/each}
					{:else}
						<!-- One card per month with anything in it, opening that month. -->
						{#each monthCards as m (m.month)}
							{@render card(monthHref(m.month), monthLabel(m.month).split(' ')[0]!, m)}
						{/each}
					{/if}
				</div>

				<MonthSlip
					title={rangeTitle}
					currency={data.currency}
					summary={data.summary}
					byCategory={data.byCategory}
				/>
			</div>
		{/if}
	{/if}
</div>

{#snippet card(
	href: string,
	title: string,
	sums: { spent: number; count: number; leftOver: number; income: number; upcoming: number }
)}
	<a
		{href}
		class="group flex items-center gap-3 rounded-3xl bg-card px-4 py-4 shadow-soft transition-colors hover:bg-base-200/40 sm:px-6"
	>
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline justify-between gap-3">
				<h2 class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase">
					{title}
				</h2>
				<p class="font-mono text-sm font-semibold text-ink tabular-nums">{money(sums.spent)}</p>
			</div>
			<p class="mt-1 text-xs text-ink-muted tabular-nums">
				{count(sums.count)}{sums.upcoming
					? ` · incl. ${money(sums.upcoming)} upcoming`
					: ''}{' · '}<span class="whitespace-nowrap"
					>left over <span class={sums.leftOver < 0 ? 'text-negative' : ''}
						>{signed(sums.leftOver)}</span
					></span
				>
			</p>
		</div>
		<ChevronRight
			size={16}
			class="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
			aria-hidden="true"
		/>
	</a>
{/snippet}
