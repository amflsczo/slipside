<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';
	import Tags from '@lucide/svelte/icons/tags';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ExpenseFields from '#lib/components/ExpenseFields.svelte';
	import ExpenseSheet from '#lib/components/ExpenseSheet.svelte';
	import MonthSlip from '#lib/components/MonthSlip.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { addDays, dayLabel, monthLabel } from '#lib/dates.ts';
	import { fromDraft, parseExpense, type ExpenseDraft, type ExpenseRow } from '#lib/expenses.ts';
	import { formatMoney } from '#lib/format/money.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const AMOUNT_ID = 'quick-add-amount';

	// Post to this page's own URL (?month=…) plus the action, so the month is kept.
	const actionUrl = (name: string) => {
		const query = page.url.searchParams.toString();
		return `?${query ? `${query}&` : ''}/${name}`;
	};
	const monthHref = (month: string) =>
		month === data.thisMonth ? '/expenses' : `/expenses?month=${month}`;
	/** "September", or "December 2025" across a new year. */
	const lastMonthName = $derived.by(() => {
		if (data.needsSetup) return '';
		const label = monthLabel(data.previousMonth);
		return data.previousMonth.slice(0, 4) === data.month.slice(0, 4) ? label.split(' ')[0]! : label;
	});
	const money = (minor: number) => (data.needsSetup ? '' : formatMoney(minor, data.currency));

	// --- Quick add ---
	const blank = (): ExpenseDraft => ({
		amount: '',
		date: data.needsSetup ? '' : data.defaultDate,
		category: '',
		note: ''
	});
	let draft = $state<ExpenseDraft>(untrack(blank));
	let attempted = $state(false);
	let adding = $state(false);

	// --- The list, a page at a time ---
	// The first page shows; "Show more" adds a page, and from then on reaching the end of the
	// list adds the next one. Whole days stay together, so a page can run a little over.
	const PAGE = 10;
	let limit = $state(PAGE);
	let autoLoad = $state(false);
	const visibleDays = $derived.by(() => {
		if (data.needsSetup) return [];
		const days = [];
		let shown = 0;
		for (const day of data.days) {
			if (shown >= limit) break;
			days.push(day);
			shown += day.rows.length;
		}
		return days;
	});
	const hiddenCount = $derived(
		data.needsSetup ? 0 : data.totals.count - visibleDays.reduce((n, day) => n + day.rows.length, 0)
	);
	function showMore() {
		limit += PAGE;
		autoLoad = true;
	}
	/** Adds the next page when this element (after the list) nears the end of the list's box. */
	function loadOnScroll(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				limit += PAGE;
				// Look again once the page has drawn: still in view (a short page) loads another.
				observer.unobserve(node);
				tick().then(() => requestAnimationFrame(() => node.isConnected && observer.observe(node)));
			},
			{ root: node.closest('[data-scroller]'), rootMargin: '200px 0px' }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}

	// The list scrolls inside its own box (no scrollbar); a fade at an edge shows there's
	// more that way.
	let fadeTop = $state(false);
	let fadeBottom = $state(false);
	function scrollFade(node: HTMLElement) {
		const update = () => {
			fadeTop = node.scrollTop > 4;
			fadeBottom = node.scrollTop + node.clientHeight < node.scrollHeight - 4;
		};
		const resize = new ResizeObserver(update);
		resize.observe(node);
		if (node.firstElementChild) resize.observe(node.firstElementChild);
		node.addEventListener('scroll', update, { passive: true });
		update();
		return {
			destroy() {
				resize.disconnect();
				node.removeEventListener('scroll', update);
			}
		};
	}
	const fadeMask = $derived(
		fadeTop || fadeBottom
			? `linear-gradient(to bottom, ${fadeTop ? 'transparent, #000 2rem' : '#000'}, ${fadeBottom ? '#000 calc(100% - 3rem), transparent' : '#000'})`
			: undefined
	);

	// Another month (or currency): new expenses default to a date in it, and the list starts
	// from its first page again.
	let shownMonth = untrack(() => (data.needsSetup ? '' : `${data.month} ${data.currency}`));
	$effect(() => {
		if (data.needsSetup) return;
		const key = `${data.month} ${data.currency}`;
		if (key === shownMonth) return;
		if (data.month !== shownMonth.split(' ')[0]) {
			draft.date = data.defaultDate;
			attempted = false;
		}
		shownMonth = key;
		limit = PAGE;
		autoLoad = false;
	});

	const parsed = $derived(
		data.needsSetup
			? null
			: parseExpense(fromDraft(draft), {
					today: data.today,
					currency: data.currency,
					categories: data.categories
				})
	);
	const errors = $derived(attempted && parsed && !parsed.ok ? parsed.errors : {});

	const submitAdd: SubmitFunction = ({ cancel }) => {
		attempted = true;
		if (parsed && !parsed.ok) {
			cancel();
			tick().then(() =>
				document.querySelector<HTMLElement>('#quick-add [aria-invalid="true"]')?.focus()
			);
			return;
		}
		adding = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					await update({ reset: false });
					// Ready for the next one: same date and category, new amount and note.
					draft.amount = '';
					draft.note = '';
					attempted = false;
					document.getElementById(AMOUNT_ID)?.focus();
					toast.show(String(result.data?.message ?? 'Expense added.'));
				} else if (result.type === 'failure') {
					toast.show(String(result.data?.error ?? 'Something went wrong.'), 'error');
				} else {
					toast.show("Couldn't save just now. Please try again.", 'error');
				}
			} finally {
				adding = false;
			}
		};
	};

	// --- Editing ---
	let editing = $state<ExpenseRow | null>(null);
	let sheetOpen = $state(false);
	function edit(row: ExpenseRow) {
		editing = row;
		sheetOpen = true;
	}

	/** "Today", "Yesterday", "Tomorrow" or "Sat · Oct 10". */
	function dayHeading(date: string) {
		if (data.needsSetup) return '';
		if (date === data.today) return 'Today';
		if (date === addDays(data.today, -1)) return 'Yesterday';
		if (date === addDays(data.today, 1)) return 'Tomorrow';
		const d = dayLabel(date);
		return `${d.weekday} · ${d.month} ${d.day}`;
	}

	function chooseCurrency(currency: string) {
		const url = new URL(location.href);
		url.searchParams.set('currency', currency);
		goto(url, { reset: false });
	}
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
	<PageHeader title="Expenses" subtitle="What you spend, day by day." icon={Wallet} />

	{#if data.needsSetup}
		<EmptyState
			icon={Settings}
			title="Set up your pay first"
			hint="Choose your currency in Settings. Expenses are kept in it."
		>
			{#snippet action()}<Button href="/settings">Go to Settings</Button>{/snippet}
		</EmptyState>
	{:else}
		<!-- Month picker, with the month's total. -->
		<div class="form-surface flex flex-wrap items-center gap-2">
			<div class="flex items-center rounded-xl bg-card shadow-soft">
				<a
					href={monthHref(data.previousMonth)}
					class="grid size-10 place-items-center rounded-l-xl text-ink-muted hover:bg-base-200 hover:text-ink"
					aria-label="Previous month, {monthLabel(data.previousMonth)}"
				>
					<ChevronLeft size={18} aria-hidden="true" />
				</a>
				<h2 class="min-w-36 px-1 text-center font-display text-base font-semibold text-ink">
					{monthLabel(data.month)}
				</h2>
				<a
					href={monthHref(data.nextMonth)}
					class="grid size-10 place-items-center rounded-r-xl text-ink-muted hover:bg-base-200 hover:text-ink"
					aria-label="Next month, {monthLabel(data.nextMonth)}"
				>
					<ChevronRight size={18} aria-hidden="true" />
				</a>
			</div>
			{#if data.month !== data.thisMonth}
				<Button href="/expenses" variant="secondary" size="sm">This month</Button>
			{/if}
			{#if data.currencies.length > 1}
				<label class="sr-only" for="expenses-currency">Currency</label>
				<select
					id="expenses-currency"
					class="select w-auto min-w-24"
					value={data.currency}
					onchange={(e) => chooseCurrency(e.currentTarget.value)}
				>
					{#each data.currencies as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
			{/if}
			{#if data.totals.count > 0}
				<p class="ml-auto text-sm text-ink-muted">
					<span class="font-mono font-semibold text-ink tabular-nums"
						>{money(data.totals.total)}</span
					>
					spent{data.totals.upcoming ? ` · incl. ${money(data.totals.upcoming)} upcoming` : ''}
				</p>
			{/if}
		</div>

		<div
			class="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:items-start"
		>
			<!-- Phones: quick add, the list, then the summary. Desktop: the list, with quick add and
			     the summary beside it. -->
			<section
				id="quick-add"
				class="rounded-3xl bg-card p-4 shadow-soft sm:p-5 lg:col-start-2 lg:row-start-1"
				aria-labelledby="quick-add-title"
			>
				<h2
					id="quick-add-title"
					class="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
				>
					Add an expense
				</h2>
				<form
					method="POST"
					action={actionUrl('add')}
					use:enhance={submitAdd}
					novalidate
					class="form-surface flex flex-col gap-3"
				>
					<ExpenseFields
						bind:value={draft}
						currency={data.currency}
						today={data.today}
						categories={data.categories.map((c) => ({ value: String(c.id), label: c.name }))}
						{errors}
						layout="wide"
						amountId={AMOUNT_ID}
					/>
					{#if data.categories.length === 0}
						<p class="flex items-center gap-1.5 text-xs text-ink-muted">
							<Tags size={14} aria-hidden="true" />
							<span
								>Add categories like Groceries or Transport in <a
									href="/settings#categories"
									class="font-medium text-sidebar-active underline-offset-2 hover:underline"
									>Settings</a
								>.</span
							>
						</p>
					{/if}
					<Button type="submit" loading={adding} class="mt-1 w-full">
						<Plus size={16} aria-hidden="true" />Add expense
					</Button>
				</form>
			</section>

			<!-- The month's expenses, by day. -->
			<div class="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
				{#if data.days.length === 0}
					<EmptyState
						icon={Wallet}
						title="No expenses in {monthLabel(data.month)}"
						hint={data.month === data.thisMonth
							? 'Add what you spend as you go. It takes a few seconds.'
							: data.month > data.thisMonth
								? 'Planned bills dated this month show up here.'
								: 'Nothing was added for this month.'}
					/>
				{:else}
					<!-- A fixed-height box that scrolls by itself, so the page doesn't grow. The padding
					     keeps the cards' shadows from being cut off. -->
					<div
						data-scroller
						use:scrollFade
						class="-m-2 scrollbar-none max-h-[65dvh] overflow-y-auto p-2 sm:max-h-[70dvh] lg:max-h-[calc(100dvh-11rem)]"
						style:mask-image={fadeMask}
						style:-webkit-mask-image={fadeMask}
					>
						<div class="flex flex-col gap-4 sm:gap-5">
							{#each visibleDays as day (day.date)}
								<section
									class="overflow-hidden rounded-3xl bg-card shadow-soft"
									aria-label="{dayHeading(day.date)}, {money(day.total)}"
								>
									<header
										class="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6"
									>
										<h3 class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase">
											{dayHeading(day.date)}
										</h3>
										<p class="font-mono text-sm font-semibold text-ink tabular-nums">
											{money(day.total)}
										</p>
									</header>
									<ul class="divide-y divide-rule">
										{#each day.rows as row (row.id)}
											<li>
												<button
													type="button"
													class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-base-200/40 sm:px-6"
													onclick={() => edit(row)}
													aria-label="Edit {row.categoryName}{row.note
														? `, ${row.note}`
														: ''}, {money(row.amount)}"
												>
													<div class="min-w-0 flex-1">
														<p class="flex items-center gap-2 text-sm font-medium text-ink">
															<span class="truncate">{row.categoryName}</span>
															{#if row.upcoming}
																<span
																	class="shrink-0 rounded-full bg-info/12 px-2 py-0.5 text-2xs font-semibold text-info"
																	>Upcoming</span
																>
															{/if}
														</p>
														{#if row.note}
															<p class="truncate text-xs text-ink-muted">{row.note}</p>
														{/if}
													</div>
													<p class="shrink-0 font-mono text-sm text-ink tabular-nums">
														{money(row.amount)}
													</p>
													<ChevronRight
														size={16}
														class="shrink-0 text-ink-muted"
														aria-hidden="true"
													/>
												</button>
											</li>
										{/each}
									</ul>
								</section>
							{/each}
							{#if hiddenCount > 0}
								{#if autoLoad}
									<!-- Reaching here loads the next page. -->
									<div use:loadOnScroll class="flex justify-center py-2" aria-hidden="true">
										<span class="loading loading-sm loading-dots text-ink-muted"></span>
									</div>
								{:else}
									<div class="flex flex-col items-center">
										<Button variant="ghost" size="sm" onclick={showMore}>Show more</Button>
										<p class="text-2xs text-ink-muted tabular-nums">
											{data.totals.count - hiddenCount} of {data.totals.count}
										</p>
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<div class="min-w-0 lg:col-start-2 lg:row-start-2">
				{#if data.totals.count > 0 || data.summary.payslips > 0}
					<MonthSlip
						title={monthLabel(data.month)}
						{lastMonthName}
						currency={data.currency}
						summary={data.summary}
						byCategory={data.byCategory}
					/>
				{/if}
			</div>
		</div>

		<ExpenseSheet
			bind:open={sheetOpen}
			row={editing}
			today={data.today}
			categories={data.categories}
			{actionUrl}
		/>
	{/if}
</div>
