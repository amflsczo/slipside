<script lang="ts">
	import Banknote from '@lucide/svelte/icons/banknote';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Callout from './Callout.svelte';
	import StatTile from './StatTile.svelte';
	import { balances, checkRate, type Payslip } from '#lib/calc/reversePayslip.ts';
	import { formatMoney, formatRate } from '#lib/format/money.ts';

	let {
		payslip,
		currency,
		period,
		emptyMessage,
		usualRate,
		tolerancePct
	}: {
		/** null while the form can't be calculated yet. */
		payslip: Payslip | null;
		currency: string;
		/** The pay period, e.g. "Oct 14 – 20, 2026". */
		period?: string;
		/** Why there's no payslip yet. */
		emptyMessage: string;
		/** Minor units per hour, from Settings; null when not set or a different currency. */
		usualRate: number | null;
		tolerancePct: number;
	} = $props();

	const money = (minor: number) => formatMoney(minor, currency);
	const hours = (n: number) => `${Number(n.toFixed(2))} ${n === 1 ? 'hr' : 'hrs'}`;
	const pct = (n: number) => `${Math.abs(n).toFixed(1)}%`;

	const rate = $derived(payslip ? checkRate(payslip.hourlyRate, usualRate, tolerancePct) : null);

	const PLACEHOLDER = ['Regular pay', 'Overtime', 'Gross pay', 'Deductions', 'Net pay'];
	const sectionLabel =
		'pb-1 font-sans text-2xs font-semibold tracking-wider text-ink-muted uppercase';
</script>

{#snippet line(name: string, amount: string, detail?: string, negative = false)}
	<div class="flex items-baseline gap-2 py-1">
		<dt class="min-w-0">
			{name}
			{#if detail}<span class="block text-2xs text-ink-muted">{detail}</span>{/if}
		</dt>
		<dd class="flex min-w-0 flex-1 items-baseline gap-2">
			<span class="leader" aria-hidden="true"></span>
			<span class={negative ? 'text-negative' : ''}>{amount}</span>
		</dd>
	</div>
{/snippet}

<!-- A printed payslip: torn bottom edge, dotted leaders, ruled totals. -->
<section class="drop-shadow-soft" aria-labelledby="payslip-title">
	<div class="rounded-t-3xl bg-card px-4 pt-4 pb-9 slip-edge sm:px-6 sm:pt-6">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<h2
					id="payslip-title"
					class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
				>
					Payslip
				</h2>
				{#if period}<p class="mt-0.5 text-xs text-ink-muted tabular-nums">{period}</p>{/if}
			</div>
			<span
				class="flex shrink-0 items-center gap-1.5 rounded-full bg-sidebar-active/10 px-2.5 py-1 text-2xs font-semibold text-sidebar-active"
			>
				<span class="size-1.5 rounded-full bg-sidebar-active" aria-hidden="true"></span>
				Updates as you type
			</span>
		</div>

		<hr class="my-4 border-0 border-t border-dashed border-rule" />

		{#if !payslip}
			<dl
				class="flex flex-col gap-1 font-mono text-xs text-ink-muted opacity-60"
				aria-hidden="true"
			>
				{#each PLACEHOLDER as name (name)}
					<div class="flex items-baseline gap-2 py-1">
						<dt>{name}</dt>
						<dd class="flex flex-1 items-baseline gap-2"><span class="leader"></span>—</dd>
					</div>
				{/each}
			</dl>
			<p class="mt-5 text-center text-sm text-ink-muted">{emptyMessage}</p>
		{:else}
			<p class="font-mono text-2xs font-medium tracking-wider text-ink-muted uppercase">Net pay</p>
			<p class="mt-1 truncate font-display text-5xl leading-none font-semibold text-ink">
				{money(payslip.net)}
			</p>

			<div class="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-base-200/70 p-3">
				<StatTile icon={Banknote} label="Gross" value={money(payslip.gross)} tone="positive" />
				<StatTile
					icon={Gauge}
					label="Rate"
					value={payslip.hourlyRate === null ? '—' : formatRate(payslip.hourlyRate, currency)}
					unit={payslip.hourlyRate === null ? undefined : '/hr'}
					tone={rate?.status === 'high' || rate?.status === 'low' ? 'warning' : 'accent'}
				/>
				<StatTile
					icon={Clock}
					label="Hours"
					value={String(Number(payslip.regularHours.toFixed(2)))}
					hint={payslip.otHours ? `+ ${hours(payslip.otHours)} OT` : 'No overtime'}
					tone="info"
				/>
			</div>

			<div class="mt-4 flex flex-col gap-2 empty:hidden" aria-live="polite">
				{#if payslip.issues.includes('no-hours')}
					<Callout tone="warning" title="No hours entered">
						Enter your hours (and any overtime) to work out your hourly rate.
					</Callout>
				{:else if payslip.issues.includes('extras-exceed-gross')}
					<Callout tone="warning" title="Extras are more than your gross pay">
						That leaves nothing for your hours, so there's no rate. Check the extras for a typo.
					</Callout>
				{/if}

				{#if rate && rate.status === 'ok' && usualRate !== null}
					<Callout tone="success" title="In line with your usual rate">
						{formatRate(usualRate, currency)}/hr, within {tolerancePct}%.
					</Callout>
				{:else if rate && (rate.status === 'high' || rate.status === 'low') && usualRate !== null}
					<Callout
						tone="warning"
						title="{pct(rate.diffPct)} {rate.status === 'low' ? 'below' : 'above'} your usual rate"
					>
						Your usual rate is {formatRate(usualRate, currency)}/hr.
						{rate.status === 'low'
							? 'Check for missing overtime, hours or a payslip mistake.'
							: 'Check your hours, or whether something was paid twice.'}
					</Callout>
				{/if}
			</div>

			<dl class="mt-5 font-mono text-xs text-ink tabular-nums">
				<div class={sectionLabel}>Earnings</div>
				{#if payslip.regularPay !== null && payslip.hourlyRate !== null}
					{@render line(
						'Regular pay',
						money(payslip.regularPay),
						`${hours(payslip.regularHours)} × ${formatRate(payslip.hourlyRate, currency)}`
					)}
				{/if}
				{#each payslip.ot as ot, i (i)}
					{#if ot.pay !== null && ot.hours > 0}
						{@render line(ot.name, money(ot.pay), `${hours(ot.hours)} × ${ot.multiplier}`)}
					{/if}
				{/each}
				{#each payslip.extras as extra, i (i)}
					{@render line(
						extra.name,
						money(extra.amount),
						extra.kind === 'per_day'
							? `${money(extra.unitAmount)} × ${extra.quantity} ${extra.quantity === 1 ? 'day' : 'days'}`
							: undefined
					)}
				{/each}

				<div class="mt-1 flex items-baseline gap-2 border-t border-rule py-2 font-semibold">
					<dt class="flex-1">Gross pay</dt>
					<dd>{money(payslip.gross)}</dd>
				</div>

				{#if payslip.deductions.length}
					<div class="{sectionLabel} pt-2">Deductions</div>
					{#each payslip.deductions as deduction, i (i)}
						{@render line(deduction.name, `−${money(deduction.amount)}`, undefined, true)}
					{/each}
				{/if}

				<!-- Accounting style: a single rule above the total, a double rule under it. -->
				<div
					class="mt-1 flex items-baseline gap-2 border-t border-b-[3px] border-double border-t-ink/50 border-b-ink/50 py-2 text-sm font-bold"
				>
					<dt class="flex-1">Net pay</dt>
					<dd>{money(payslip.net)}</dd>
				</div>
			</dl>

			{#if balances(payslip)}
				<p class="mt-3 flex items-center gap-1.5 text-xs font-medium text-positive">
					<CircleCheck size={14} aria-hidden="true" /> Adds back to the net pay on your payslip.
				</p>
			{/if}
			{#if payslip.roundingAdjustment !== 0}
				<p class="mt-1 text-xs text-ink-muted">
					Includes a {money(Math.abs(payslip.roundingAdjustment))} rounding difference so the lines add
					up exactly.
				</p>
			{/if}
		{/if}
	</div>
</section>
