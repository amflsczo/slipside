<script lang="ts">
	import { goto } from '$app/navigation';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import Settings from '@lucide/svelte/icons/settings';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Button from '#lib/components/Button.svelte';
	import HistoryChart from '#lib/components/HistoryChart.svelte';
	import StatTile from '#lib/components/StatTile.svelte';
	import YearBreakdown from '#lib/components/YearBreakdown.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { monthLabel, shortDate, shortRange } from '#lib/dates.ts';
	import { formatMoney, formatRate } from '#lib/format/money.ts';
	import type { Change, HistoryEntry } from '#lib/history.ts';
	import { cn } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const allEntries = $derived(data.needsSetup ? [] : data.months.flatMap((m) => m.entries));
	const thisYear = new Date().getFullYear();

	const money = (minor: number) => (data.needsSetup ? '' : formatMoney(minor, data.currency));
	const rate = (minor: number) => (data.needsSetup ? '' : `${formatRate(minor, data.currency)}/hr`);
	const signed = (minor: number, format: (n: number) => string) =>
		`${minor > 0 ? '+' : minor < 0 ? '−' : '±'}${format(Math.abs(minor))}`;
	const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

	/** Year or currency changed: reload the page with the new choice. */
	function choose(param: 'year' | 'currency', value: string) {
		const url = new URL(location.href);
		url.searchParams.set(param, value);
		if (param === 'year') url.searchParams.delete('currency');
		goto(url, { reset: false });
	}

	/** The change from the previous payslip, read out in words. */
	function describe(entry: HistoryEntry) {
		const change = entry.vsPrevious;
		if (!change) return 'The first payslip, nothing to compare with.';
		const word = (c: Change, format: (n: number) => string) =>
			c.amount === 0
				? 'no change'
				: `${c.amount > 0 ? 'up' : 'down'} ${format(Math.abs(c.amount))}`;
		let text = `Net pay ${word(change.net, money)} from the previous payslip`;
		if (change.differentLength) {
			text += ', which covered a different number of days';
			if (change.rate) text += `; rate ${word(change.rate, (n) => `${rate(n)}`)}`;
		}
		return `${text}.`;
	}

	const tone = (amount: number) =>
		amount > 0 ? 'text-positive' : amount < 0 ? 'text-negative' : 'text-ink-muted';
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
	<PageHeader
		title="History"
		subtitle="Your payslips, by the month you were paid."
		icon={ChartLine}
	/>

	{#if data.needsSetup}
		<EmptyState
			icon={Settings}
			title="Set up your pay first"
			hint="Choose your currency and how often you're paid in Settings. It takes a minute."
		>
			{#snippet action()}<Button href="/settings">Go to Settings</Button>{/snippet}
		</EmptyState>
	{:else}
		<!-- Year (and currency, when more than one was used that year). -->
		<div class="form-surface flex flex-wrap items-center gap-2">
			<label class="sr-only" for="history-year">Year</label>
			<select
				id="history-year"
				class="select w-auto min-w-28 font-semibold"
				value={String(data.year)}
				onchange={(e) => choose('year', e.currentTarget.value)}
			>
				{#each data.years as y (y)}
					<option value={String(y)}>{y}</option>
				{/each}
			</select>
			{#if data.currencies.length > 1}
				<label class="sr-only" for="history-currency">Currency</label>
				<select
					id="history-currency"
					class="select w-auto min-w-24"
					value={data.currency}
					onchange={(e) => choose('currency', e.currentTarget.value)}
				>
					{#each data.currencies as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
			{/if}
			{#if data.yearTotals.count > 0}
				<p class="ml-auto text-sm text-ink-muted">
					<span class="font-mono font-semibold text-ink tabular-nums"
						>{money(data.yearTotals.net)}</span
					>
					net · {data.yearTotals.count}
					{data.yearTotals.count === 1 ? 'payslip' : 'payslips'}
				</p>
			{/if}
		</div>

		{#if data.months.length === 0}
			<EmptyState
				icon={ReceiptText}
				title="No payslips in {data.year} yet"
				hint={data.years.length > 1
					? 'Saved payslips show up here, by the month they were paid. Pick another year above to see earlier ones.'
					: 'Saved payslips show up here, by the month they were paid.'}
			>
				{#snippet action()}<Button href="/">Enter a payslip</Button>{/snippet}
			</EmptyState>
		{/if}

		{#if data.months.length > 0}
			{@const t = data.yearTotals}
			<!-- The year at a glance. -->
			<section
				class="grid grid-cols-2 gap-4 rounded-3xl bg-card p-4 shadow-soft sm:grid-cols-4 sm:p-6"
				aria-label="{data.year} summary"
			>
				<StatTile
					icon={Wallet}
					label="Net pay"
					value={money(t.net)}
					hint="Gross {money(t.gross)}"
					tone="positive"
				/>
				<StatTile
					icon={Gauge}
					label="Average rate"
					value={t.averageRate === null ? '—' : rate(t.averageRate).replace('/hr', '')}
					unit={t.averageRate === null ? undefined : '/hr'}
					hint="Weighted by hours"
				/>
				<StatTile
					icon={Clock}
					label="Hours"
					value={String(t.regularHours)}
					hint={t.otHours ? `+ ${t.otHours} overtime` : 'No overtime'}
					tone="info"
				/>
				<StatTile
					icon={ReceiptText}
					label="Payslips"
					value={String(t.count)}
					hint="{data.months.length} {data.months.length === 1 ? 'month' : 'months'}"
				/>
			</section>

			<HistoryChart entries={allEntries} currency={data.currency} />

			<div class="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div class="flex min-w-0 flex-col gap-4 sm:gap-5">
					{#each data.months as group (group.month)}
						<section class="rounded-3xl bg-card shadow-soft" aria-labelledby="month-{group.month}">
							<header
								class="flex items-baseline justify-between gap-3 border-b border-dashed border-rule px-4 pt-4 pb-3 sm:px-6"
							>
								<h2
									id="month-{group.month}"
									class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
								>
									{monthLabel(group.month)}
								</h2>
								<p class="text-xs text-ink-muted">
									<span class="font-mono font-semibold text-ink tabular-nums"
										>{money(group.totals.net)}</span
									>
									· {group.totals.count}
									{group.totals.count === 1 ? 'payslip' : 'payslips'}
								</p>
							</header>

							<ul class="divide-y divide-dashed divide-rule/60">
								{#each group.entries as entry (entry.start)}
									{@const change = entry.vsPrevious}
									{@const flagged =
										entry.rateCheck.status === 'high' || entry.rateCheck.status === 'low'}
									<li>
										<a
											href="/?period={entry.start}"
											class="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-base-200/50 sm:px-6"
										>
											<div class="min-w-0 flex-1">
												<p
													class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink"
												>
													{shortRange(entry.start, entry.end)}
													{#if flagged}
														<span
															class="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-2xs font-semibold text-ink"
															title="{Math.abs(entry.rateCheck.diffPct ?? 0).toFixed(1)}% {entry
																.rateCheck.status === 'high'
																? 'above'
																: 'below'} your usual rate"
														>
															<TriangleAlert size={11} class="text-warning" aria-hidden="true" />
															Rate {entry.rateCheck.status}
														</span>
													{/if}
												</p>
												<p class="mt-0.5 text-xs text-ink-muted tabular-nums">
													{days(
														entry.days
													)}{#if entry.rate !== null}{` · ${rate(entry.rate)}`}{/if}{#if entry.paid !== entry.end}{` · paid ${shortDate(entry.paid)}`}{/if}
												</p>
											</div>

											<div class="shrink-0 text-right">
												<p class="font-mono text-sm font-semibold text-ink tabular-nums">
													{money(entry.net)}
												</p>
												{#if change}
													<p class="mt-0.5 font-mono text-xs tabular-nums" aria-hidden="true">
														<span class={tone(change.net.amount)}
															>{signed(change.net.amount, money)}</span
														>
														{#if change.differentLength && change.rate}
															<span class="text-ink-muted">{' · rate '}</span>
															<span class={tone(change.rate.amount)}
																>{signed(change.rate.amount, rate)}</span
															>
														{/if}
													</p>
												{/if}
												<span class="sr-only">{describe(entry)}</span>
											</div>
											<ChevronRight
												size={16}
												class={cn(
													'shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5'
												)}
												aria-hidden="true"
											/>
										</a>
									</li>
								{/each}
							</ul>
						</section>
					{/each}
				</div>
				<aside class="lg:sticky lg:top-6">
					<YearBreakdown
						year={data.year}
						currency={data.currency}
						totals={data.yearTotals}
						deductions={data.deductionTotals}
						extras={data.extraTotals}
						thisYear={data.year === thisYear}
					/>
				</aside>
			</div>
		{/if}
	{/if}
</div>
