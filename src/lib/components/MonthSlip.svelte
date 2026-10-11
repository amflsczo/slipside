<script lang="ts">
	import type { CategoryTotal, MonthSummary } from '#lib/expenses.ts';
	import { formatMoney } from '#lib/format/money.ts';

	let {
		title,
		lastMonthName,
		currency,
		summary,
		byCategory
	}: {
		/** e.g. "October 2026". */
		title: string;
		/** e.g. "September". */
		lastMonthName: string;
		currency: string;
		summary: MonthSummary;
		/** Spending per category, largest first. */
		byCategory: CategoryTotal[];
	} = $props();

	const money = (minor: number) => formatMoney(minor, currency);
	/** "£12.00", or "−£12.00" when negative. */
	const signed = (minor: number) => `${minor < 0 ? '−' : ''}${money(Math.abs(minor))}`;
	const sectionLabel =
		'pb-1 font-sans text-2xs font-semibold tracking-wider text-ink-muted uppercase';

	/** "£120.00 more than September", "the same as September". */
	function compare(now: number, then: number, more: string, less: string) {
		if (now === then) return `the same as ${lastMonthName}`;
		return `${money(Math.abs(now - then))} ${now > then ? more : less} than ${lastMonthName}`;
	}
	const last = $derived(summary.lastMonth);
</script>

{#snippet line(name: string, amount: string, negative = false)}
	<div class="flex items-baseline gap-2 py-1">
		<dt class="min-w-0 truncate">{name}</dt>
		<dd class="flex min-w-0 flex-1 items-baseline gap-2">
			<span class="leader" aria-hidden="true"></span>
			<span class={negative ? 'text-negative' : ''}>{amount}</span>
		</dd>
	</div>
{/snippet}

<!-- The month as one printed slip: net pay received − spending = left over. -->
<section class="drop-shadow-soft" aria-labelledby="month-slip-title">
	<div class="rounded-t-3xl bg-card px-4 pt-4 pb-9 slip-edge sm:px-6 sm:pt-6">
		<h2
			id="month-slip-title"
			class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
		>
			{title}
		</h2>
		<p class="mt-0.5 text-xs text-ink-muted">Money in and out</p>

		<hr class="my-4 border-0 border-t border-dashed border-rule" />

		<dl class="font-mono text-xs text-ink tabular-nums">
			<div class={sectionLabel}>In</div>
			{@render line(
				summary.payslips
					? `Net pay · ${summary.payslips} ${summary.payslips === 1 ? 'payslip' : 'payslips'}`
					: 'Net pay · no payslips',
				money(summary.income)
			)}

			<div class="{sectionLabel} pt-2">Out</div>
			{#each byCategory as item (item.key)}
				{@render line(item.name, `−${money(item.total)}`, true)}
			{:else}
				{@render line('No expenses', money(0))}
			{/each}

			<div class="mt-1 flex items-baseline gap-2 border-t border-rule py-2 font-semibold">
				<dt class="flex-1">Spent</dt>
				<dd>{byCategory.length ? `−${money(summary.spent)}` : money(0)}</dd>
			</div>

			<div
				class="flex items-baseline gap-2 border-t border-b-[3px] border-double border-t-ink/50 border-b-ink/50 py-2 text-sm font-bold"
			>
				<dt class="flex-1">Left over</dt>
				<dd class={summary.leftOver < 0 ? 'text-negative' : ''}>{signed(summary.leftOver)}</dd>
			</div>
		</dl>

		<div class="mt-3 flex flex-col gap-1 text-xs text-ink-muted">
			{#if summary.upcoming}
				<p>Includes {money(summary.upcoming)} of upcoming bills.</p>
			{/if}
			{#if !summary.payslips}
				<p>Payslips count in the month they were paid.</p>
			{/if}
			{#if last}
				<p>
					Spent {compare(summary.spent, last.spent, 'more', 'less')}{last.spent
						? ` (${money(last.spent)})`
						: ''}.
				</p>
				<p>
					Left over {compare(summary.leftOver, last.leftOver, 'more', 'less')} ({signed(
						last.leftOver
					)}).
				</p>
			{:else}
				<p>Nothing in {lastMonthName} to compare with.</p>
			{/if}
		</div>
	</div>
</section>
