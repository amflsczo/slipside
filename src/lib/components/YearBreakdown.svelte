<script lang="ts">
	import { formatMoney, formatRate } from '#lib/format/money.ts';
	import type { ItemTotal, Totals } from '#lib/history.ts';

	let {
		year,
		currency,
		totals,
		deductions,
		extras,
		thisYear
	}: {
		year: number;
		currency: string;
		totals: Totals;
		/** Each deduction added up across the year, largest first. */
		deductions: ItemTotal[];
		/** Each extra added up across the year, largest first. */
		extras: ItemTotal[];
		/** True for the current year, which reads "so far". */
		thisYear: boolean;
	} = $props();

	const money = (minor: number) => formatMoney(minor, currency);
	const hours = (n: number) => `${Number(n.toFixed(2))} hrs`;
	const sectionLabel =
		'pb-1 font-sans text-2xs font-semibold tracking-wider text-ink-muted uppercase';
</script>

{#snippet line(name: string, amount: string, negative = false)}
	<div class="flex items-baseline gap-2 py-1">
		<dt class="min-w-0">{name}</dt>
		<dd class="flex min-w-0 flex-1 items-baseline gap-2">
			<span class="leader" aria-hidden="true"></span>
			<span class={negative ? 'text-negative' : ''}>{amount}</span>
		</dd>
	</div>
{/snippet}

<!-- The year as one printed slip: what the stored payslips add up to (never recalculated). -->
<section class="drop-shadow-soft" aria-labelledby="breakdown-title">
	<div class="rounded-t-3xl bg-card px-4 pt-4 pb-9 slip-edge sm:px-6 sm:pt-6">
		<h2
			id="breakdown-title"
			class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
		>
			{year}{thisYear ? ' so far' : ''}
		</h2>
		<p class="mt-0.5 text-xs text-ink-muted">
			{totals.count}
			{totals.count === 1 ? 'payslip' : 'payslips'}, added up
		</p>

		<hr class="my-4 border-0 border-t border-dashed border-rule" />

		<dl class="font-mono text-xs text-ink tabular-nums">
			<div class={sectionLabel}>Earnings</div>
			{@render line('Pay from hours', money(totals.fromHours))}
			{#each extras as item (item.name)}
				{@render line(item.name, money(item.total))}
			{/each}

			<div class="mt-1 flex items-baseline gap-2 border-t border-rule py-2 font-semibold">
				<dt class="flex-1">Gross pay</dt>
				<dd>{money(totals.gross)}</dd>
			</div>

			{#if deductions.length}
				<div class="{sectionLabel} pt-2">Deductions</div>
				{#each deductions as item (item.name)}
					{@render line(item.name, `−${money(item.total)}`, true)}
				{/each}
			{/if}

			<div
				class="mt-1 flex items-baseline gap-2 border-t border-b-[3px] border-double border-t-ink/50 border-b-ink/50 py-2 text-sm font-bold"
			>
				<dt class="flex-1">Net pay</dt>
				<dd>{money(totals.net)}</dd>
			</div>
		</dl>

		<p class="mt-3 text-xs text-ink-muted tabular-nums">
			{hours(
				totals.regularHours
			)}{#if totals.otHours}{` + ${hours(totals.otHours)} overtime`}{/if}{#if totals.averageRate !== null}{` · avg ${formatRate(totals.averageRate, currency)}/hr`}{/if}
		</p>
	</div>
</section>
