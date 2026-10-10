<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { SubmitFunction } from '$app/forms';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trash from '@lucide/svelte/icons/trash';
	import X from '@lucide/svelte/icons/x';
	import ActionBar from './ActionBar.svelte';
	import Button from './Button.svelte';
	import Callout from './Callout.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import InfoTip from './InfoTip.svelte';
	import NumberInput from './NumberInput.svelte';
	import PayslipPanel from './PayslipPanel.svelte';
	import PeriodSheet from './PeriodSheet.svelte';
	import PeriodPicker from './PeriodPicker.svelte';
	import { reversePayslip } from '#lib/calc/reversePayslip.ts';
	import { dayLabel, formatRange, type IsoDate } from '#lib/dates.ts';
	import type { Period } from '#lib/period.ts';
	import { periodHref } from '#lib/periodNav.ts';
	import {
		currencySymbol,
		formatMoney,
		minorDigits,
		toMinor
	} from '#lib/format/money.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { carried, clearDraft, readDraft, writeDraft } from '#lib/payslip/draft.ts';
	import {
		mergeDraft,
		parsePayslip,
		toInput,
		withPeriod,
		type PayslipForm
	} from '#lib/payslip/form.ts';

	let {
		initial,
		owner,
		saved,
		usualRate,
		tolerancePct,
		today,
		savedPeriods,
		previousHref,
		nextHref,
		homeHref
	}: {
		/** The payslip as saved (or a new one from Settings). The parent remounts on change. */
		initial: PayslipForm;
		/** Whose device draft this is (the account email). */
		owner: string;
		saved: boolean;
		usualRate: number | null;
		tolerancePct: number;
		today: IsoDate;
		/** Every saved payslip's dates (for overlap warnings while choosing dates). */
		savedPeriods: Period[];
		previousHref: string;
		nextHref: string | null;
		homeHref: string | null;
	} = $props();

	const uid = $props.id();

	// Post to this page's own URL (e.g. ?period=…) plus the action. SvelteKit lands on the
	// posted URL after an action, so a bare "?/save" would drop the period.
	const actionUrl = (name: string) => {
		const query = page.url.searchParams.toString();
		return `?${query ? `${query}&` : ''}/${name}`;
	};
	const clone = (value: PayslipForm): PayslipForm => JSON.parse(JSON.stringify(value));
	const initialJson = untrack(() => JSON.stringify(initial));
	/**
	 * Where this payslip lives: its saved start, or a new payslip's start. Keys the device draft,
	 * and tells a save which payslip to update even after its dates change in the form.
	 */
	const savedStart = untrack(() => initial.start);
	const currency = untrack(() => initial.currency);
	const symbol = currencySymbol(currency);
	const digits = minorDigits(currency);

	let form = $state(untrack(() => clone(initial)));
	let restoredAt = $state<string | null>(null);
	let attempted = $state(false);
	let pending = $state(false);
	let deleting = $state(false);
	let confirmDelete = $state(false);
	let deleteForm: HTMLFormElement;

	// --- Draft kept on this device (PLAN.md §2a, rule 4) ---
	let keepDraft = $state(false);
	let draftTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		// A new payslip whose dates were just changed: keep what was typed, quietly.
		if (carried.form?.start === savedStart) {
			form = mergeDraft(clone(initial), carried.form);
			carried.form = null;
			keepDraft = true;
			return () => clearTimeout(draftTimer);
		}
		const draft = readDraft(owner, savedStart);
		if (draft) {
			// Rows follow the current Settings; the draft only fills in what was typed.
			const merged = mergeDraft(clone(initial), draft.form);
			if (JSON.stringify(merged) !== initialJson) {
				form = merged;
				restoredAt = draft.savedAt;
			} else {
				clearDraft(owner, savedStart);
			}
		}
		keepDraft = true;
		return () => clearTimeout(draftTimer);
	});

	$effect(() => {
		if (!keepDraft) return;
		const snapshot = $state.snapshot(form);
		clearTimeout(draftTimer);
		if (JSON.stringify(snapshot) === initialJson) clearDraft(owner, savedStart);
		else draftTimer = setTimeout(() => writeDraft(owner, savedStart, snapshot), 300);
	});

	/** After a save or delete: the server copy is now the truth. */
	function dropDraft() {
		keepDraft = false;
		clearTimeout(draftTimer);
		clearDraft(owner, savedStart);
	}

	function discard() {
		form = clone(initial);
		restoredAt = null;
		attempted = false;
		clearDraft(owner, savedStart);
	}

	// --- Changing the dates ---
	let changingDates = $state(false);
	const hoursOn = $derived(form.days.filter((d) => Number(d.hours) > 0).map((d) => d.date));

	/**
	 * A saved payslip takes its new dates in the form; saving moves it. A new payslip lives at
	 * its dates, so the page moves there, carrying what was typed (also kept as a draft there).
	 */
	function changeDates(period: Period) {
		const next = withPeriod($state.snapshot(form) as PayslipForm, period);
		if (saved) {
			form = next;
			return;
		}
		keepDraft = false;
		clearTimeout(draftTimer);
		clearDraft(owner, savedStart);
		writeDraft(owner, period.start, next);
		carried.form = next;
		goto(periodHref({ period, saved: false }), { reset: false });
	}

	// --- Live calculation ---
	const parsed = $derived(parsePayslip(form));
	const errors = $derived(parsed.ok ? {} : parsed.errors);
	const payslip = $derived(parsed.ok ? reversePayslip(toInput(parsed.value)) : null);
	const dirty = $derived(JSON.stringify(form) !== initialJson);

	/** A field's error. A blank net pay only counts once Save has been pressed. */
	const err = (path: string): string | undefined =>
		path === 'net' && !attempted && !form.net.trim() ? undefined : errors[path];

	const emptyMessage = $derived(
		!form.net.trim()
			? 'Enter the net pay from your payslip to see the breakdown.'
			: 'Fix the highlighted fields to see the breakdown.'
	);

	const totalHours = $derived(
		form.days.reduce((total, day) => total + (Number(day.hours) || 0), 0)
	);
	const dayError = $derived(
		form.days.map((day, i) => ({ day, message: err(`days.${i}.hours`) })).find((d) => d.message)
	);
	const fmtHours = (n: number) => `${Number(n.toFixed(2))} ${n === 1 ? 'hr' : 'hrs'}`;

	/** "= £20.00" next to an extra, while typing. */
	function extraAmount(row: PayslipForm['extras'][number]) {
		const unit = toMinor(row.unitAmount.replace(/[\s,]/g, ''), digits);
		const quantity =
			row.kind === 'per_day' ? Number(row.quantity) || 0 : Number(row.quantity === '1');
		if (unit === null || !row.unitAmount.trim() || !quantity) return null;
		return formatMoney(Math.round(unit * (row.kind === 'bonus' ? 1 : quantity)), currency);
	}

	async function addRow(kind: 'deduction' | 'bonus') {
		if (kind === 'deduction') form.deductions.push({ name: '', amount: '', custom: true });
		else form.extras.push({ name: '', kind: 'bonus', unitAmount: '', quantity: '1', custom: true });
		await tick();
		const list = kind === 'deduction' ? form.deductions : form.extras;
		document.getElementById(`${uid}-${kind}-name-${list.length - 1}`)?.focus();
	}

	// --- Save and delete ---
	const submit: SubmitFunction = ({ cancel }) => {
		attempted = true;
		if (!parsed.ok) {
			cancel();
			toast.show('Some fields need fixing. Check the highlighted ones.', 'error');
			tick().then(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
			return;
		}
		pending = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					dropDraft();
					await update({ reset: false });
					toast.show(String(result.data?.message ?? 'Payslip saved.'));
				} else if (result.type === 'failure') {
					toast.show(String(result.data?.error ?? 'Something went wrong.'), 'error');
				} else if (result.type === 'redirect') {
					// A saved payslip whose start date changed moves to its new URL.
					const moved = result.location.startsWith('/?period=');
					if (moved) dropDraft();
					await update();
					if (moved) toast.show('Payslip saved.');
				} else {
					toast.show(
						"Couldn't save just now. Your entry is kept on this device; try again.",
						'error'
					);
				}
			} finally {
				pending = false;
			}
		};
	};

	const submitDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					dropDraft();
					confirmDelete = false;
					await update();
					toast.show(String(result.data?.message ?? 'Payslip deleted.'));
				} else {
					confirmDelete = false;
					const message =
						result.type === 'failure' ? result.data?.error : "Couldn't delete just now. Try again.";
					toast.show(String(message ?? 'Something went wrong.'), 'error');
				}
			} finally {
				deleting = false;
			}
		};
	};

	const time = (iso: string) =>
		new Date(iso).toLocaleString('en', {
			weekday: 'short',
			hour: 'numeric',
			minute: '2-digit'
		});
	/** Periods over a week show the hours as a calendar of week rows. */
	const calendar = $derived(form.days.length > 7);

	/** The deductions typed so far, for the section heading. */
	const deductionTotal = $derived(
		form.deductions.reduce(
			(total, d) => total + (toMinor(d.amount.replace(/[\s,]/g, ''), digits) ?? 0),
			0
		)
	);

	// Notes stay a one-line "+ Add a note" until opened (or already written).
	let noteOpen = $state(false);
	async function openNote() {
		noteOpen = true;
		await tick();
		document.getElementById(`${uid}-notes`)?.focus();
	}

	// Ledger layout: label on the left, a fixed-width amount column on the right.
	const section = 'border-t border-dashed border-rule px-4 py-3.5 sm:px-6';
	const head = 'mb-2 flex min-h-8 items-center justify-between gap-3';
	const headTitle = 'font-mono text-2xs font-semibold tracking-widest text-ink-muted uppercase';
	const row =
		'grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_10rem]';
	const field = 'h-9 w-full [&_input]:text-right';
	const addButton =
		'inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-sidebar-active transition-colors hover:bg-sidebar-active/10';
	const link = 'font-semibold text-sidebar-active hover:underline';
	const removeButton =
		'grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-base-200 hover:text-ink';
</script>

{#snippet fieldError(message: string | undefined)}
	{#if message}
		<p role="alert" class="mt-1 flex items-center justify-end gap-1 text-xs text-error">
			<CircleAlert size={13} aria-hidden="true" />{message}
		</p>
	{/if}
{/snippet}

<PeriodPicker
	period={form}
	{today}
	{previousHref}
	{nextHref}
	{homeHref}
	onchange={() => (changingDates = true)}
/>
{#if errors.period}
	<Callout tone="warning" title="Check the dates">{errors.period}</Callout>
{/if}

<form
	method="post"
	action={actionUrl('save')}
	use:enhance={submit}
	novalidate
	class="flex flex-col gap-4 sm:gap-5"
>
	<input type="hidden" name="payload" value={JSON.stringify(form)} />
	{#if saved}<input type="hidden" name="savedStart" value={savedStart} />{/if}

	<div
		class="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_26rem]"
	>
		<div class="flex min-w-0 flex-col gap-4 sm:gap-5">
			{#if restoredAt}
				<Callout title="Restored your unsaved changes">
					From {time(restoredAt)}, kept on this device. Save the payslip to keep them for good.
					{#snippet action()}
						<Button type="button" variant="ghost" size="sm" onclick={discard}>
							<RotateCcw size={14} aria-hidden="true" /> Discard
						</Button>
					{/snippet}
				</Callout>
			{/if}

			<!-- One card that mirrors the printed slip: label on the left, amount on the right. -->
			<div class="form-surface rounded-3xl bg-card shadow-soft">
				<div class="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-6 sm:pt-5">
					<h2 class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase">
						Your payslip
					</h2>
					<a
						href="/help#enter"
						class="text-xs font-medium text-ink-muted transition-colors hover:text-sidebar-active"
						>How to fill this in</a
					>
				</div>

				<section class={section} aria-label="Net pay">
					<div class={row}>
						<label for="{uid}-net" class="text-sm font-semibold text-ink">
							Net pay<span class="ml-0.5 text-error" aria-hidden="true">*</span>
							<span class="block text-xs font-normal text-ink-muted">Take-home amount</span>
						</label>
						<NumberInput
							id="{uid}-net"
							{symbol}
							bind:value={form.net}
							invalid={!!err('net')}
							placeholder={digits ? '0.00' : '0'}
							class="{field} font-semibold"
						/>
					</div>
					{@render fieldError(err('net'))}
				</section>

				<section class={section} aria-labelledby="{uid}-ded-h">
					<div class={head}>
						<h3 id="{uid}-ded-h" class={headTitle}>Deductions</h3>
						<div class="flex items-center gap-2">
							{#if deductionTotal > 0}
								<span class="font-mono text-xs text-negative tabular-nums"
									>−{formatMoney(deductionTotal, currency)}</span
								>
							{/if}
							<button type="button" class={addButton} onclick={() => addRow('deduction')}>
								<Plus size={13} aria-hidden="true" /> Add
							</button>
						</div>
					</div>
					{#if form.deductions.length === 0}
						<p class="text-sm text-ink-muted">
							None set up. <a href="/settings" class={link}>Add them in Settings</a>, or tap Add.
						</p>
					{/if}
					<div class="flex flex-col gap-1.5">
						{#each form.deductions as item, i (i)}
							<div class={row}>
								{#if item.custom}
									<div class="flex min-w-0 items-center gap-1">
										<input
											id="{uid}-deduction-name-{i}"
											class="input h-9 w-full"
											bind:value={item.name}
											maxlength="60"
											autocomplete="off"
											placeholder="Deduction name"
											aria-label="Deduction name"
											aria-invalid={!!err(`deductions.${i}.name`) || undefined}
										/>
										<button
											type="button"
											class={removeButton}
											aria-label="Remove {item.name || 'this deduction'}"
											onclick={() => form.deductions.splice(i, 1)}
										>
											<X size={15} aria-hidden="true" />
										</button>
									</div>
								{:else}
									<label for="{uid}-ded-{i}" class="truncate text-sm text-ink">{item.name}</label>
								{/if}
								<NumberInput
									id="{uid}-ded-{i}"
									{symbol}
									bind:value={item.amount}
									invalid={!!err(`deductions.${i}.amount`)}
									aria-label={item.custom ? `${item.name || 'Deduction'} amount` : undefined}
									class={field}
								/>
							</div>
							{@render fieldError(err(`deductions.${i}.name`) ?? err(`deductions.${i}.amount`))}
						{/each}
					</div>
				</section>

				<section class={section} aria-labelledby="{uid}-hours-h">
					<div class={head}>
						<h3 id="{uid}-hours-h" class={headTitle}>Hours</h3>
						<p class="text-xs text-ink-muted">
							Total <span class="font-mono font-semibold text-ink tabular-nums"
								>{fmtHours(totalHours)}</span
							>
						</p>
					</div>
					<div class="grid grid-cols-7 gap-x-1.5 sm:gap-x-2 {calendar ? 'gap-y-2' : ''}">
						{#if calendar}
							<!-- Columns follow the period's first week, so the weekdays are the same down each one. -->
							{#each form.days.slice(0, 7) as day (day.date)}
								<span
									class="text-center text-2xs font-semibold tracking-wide text-ink-muted uppercase"
									aria-hidden="true">{dayLabel(day.date).weekday}</span
								>
							{/each}
						{/if}
						{#each form.days as day, i (day.date)}
							{@const label = dayLabel(day.date)}
							<div class="flex min-w-0 flex-col gap-1">
								<label for="{uid}-day-{i}" class="text-center text-2xs leading-tight">
									{#if calendar}
										<span class="sr-only">{label.weekday}</span>
										<span
											class={label.day === 1 || i === 0
												? 'font-semibold text-ink'
												: 'text-ink-muted'}
											>{label.day === 1 || i === 0
												? `${label.month} ${label.day}`
												: label.day}</span
										>
									{:else}
										<span class="font-semibold text-ink">{label.weekday}</span>
										<span class="text-ink-muted">{label.day}</span>
									{/if}
								</label>
								<input
									id="{uid}-day-{i}"
									class="input h-9 w-full px-0 text-center tabular-nums {err(`days.${i}.hours`)
										? 'input-error'
										: ''}"
									inputmode="decimal"
									autocomplete="off"
									placeholder="0"
									bind:value={day.hours}
									aria-invalid={!!err(`days.${i}.hours`) || undefined}
								/>
							</div>
						{/each}
					</div>
					{#if dayError}
						<p role="alert" class="mt-1.5 text-xs text-error">
							{dayLabel(dayError.day.date).weekday}
							{dayLabel(dayError.day.date).day}: {dayError.message}
						</p>
					{/if}
				</section>

				<section class={section} aria-labelledby="{uid}-ot-h">
					{#if form.ot.length === 0}
						<p class="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-muted">
							<span id="{uid}-ot-h" class={headTitle}>Overtime</span>
							None set up · <a href="/settings" class={link}>Add rates in Settings</a>
						</p>
					{:else}
						<h3 id="{uid}-ot-h" class="{headTitle} mb-1.5">Overtime</h3>
						<div class="flex flex-col gap-1.5">
							{#each form.ot as rate, i (i)}
								<div class={row}>
									<label for="{uid}-ot-{i}" class="truncate text-sm text-ink">
										{rate.name}
										<span class="font-mono text-xs text-ink-muted">×{rate.multiplier}</span>
									</label>
									<NumberInput
										id="{uid}-ot-{i}"
										suffix="hrs"
										placeholder="0"
										bind:value={rate.hours}
										invalid={!!err(`ot.${i}.hours`)}
										class={field}
									/>
								</div>
								{@render fieldError(err(`ot.${i}.hours`))}
							{/each}
						</div>
					{/if}
				</section>

				<section class={section} aria-labelledby="{uid}-ex-h">
					<div class={head}>
						<h3 id="{uid}-ex-h" class={headTitle}>Extras</h3>
						<button type="button" class={addButton} onclick={() => addRow('bonus')}>
							<Plus size={13} aria-hidden="true" /> Bonus
						</button>
					</div>
					{#if form.extras.length === 0}
						<p class="text-sm text-ink-muted">
							None set up. <a href="/settings" class={link}>Add allowances in Settings</a>, or add a
							bonus.
						</p>
					{/if}
					<!-- Each extra: name and total on top (like the slip), what to fill in underneath. -->
					<div class="flex flex-col divide-y divide-dashed divide-rule/60">
						{#each form.extras as extra, i (i)}
							{@const amount = extraAmount(extra)}
							<div class="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
								<div class="flex items-baseline justify-between gap-3">
									{#if extra.kind === 'bonus'}
										<p class="text-sm font-medium text-ink">One-off bonus</p>
									{:else}
										<p class="min-w-0 text-sm font-medium text-ink">{extra.name}</p>
									{/if}
									<span
										class="shrink-0 font-mono text-sm tabular-nums {amount
											? 'font-semibold text-ink'
											: 'text-ink-muted'}"
										aria-label="{extra.name || 'Bonus'} total: {amount ?? 'nothing'}"
										>{amount ?? '—'}</span
									>
								</div>

								{#if extra.kind === 'per_day'}
									<!-- Reads as a sentence: £35 a day × 5 days. -->
									<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-ink-muted">
										<NumberInput
											{symbol}
											bind:value={extra.unitAmount}
											invalid={!!err(`extras.${i}.unitAmount`)}
											aria-label="{extra.name}: amount a day"
											class="{field} w-28"
										/>
										<span>a day ×</span>
										<NumberInput
											inputmode="numeric"
											placeholder="0"
											suffix={extra.quantity === '1' ? 'day' : 'days'}
											bind:value={extra.quantity}
											invalid={!!err(`extras.${i}.quantity`)}
											aria-label="{extra.name}: number of days (up to {form.days.length})"
											class="{field} w-24"
										/>
									</div>
									<p class="text-xs text-ink-muted">
										Paid per day · up to {form.days.length}
										{form.days.length === 1 ? 'day' : 'days'} in this payslip
									</p>
								{:else if extra.kind === 'per_week'}
									<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
										<div class="flex items-center gap-1">
											<label class="flex items-center gap-2.5 text-sm text-ink">
												<input
													type="checkbox"
													class="toggle toggle-primary toggle-sm"
													checked={extra.quantity === '1'}
													onchange={(e) => (extra.quantity = e.currentTarget.checked ? '1' : '0')}
												/>
												Paid this time
											</label>
											<InfoTip label="What does Paid this time mean?">
												Turn this on if <strong class="font-semibold">{extra.name}</strong> is on this
												payslip. It's paid once, at the amount you type, however many days the payslip
												covers. Leave it off if you didn't get it this time.
											</InfoTip>
										</div>
										<NumberInput
											{symbol}
											bind:value={extra.unitAmount}
											invalid={!!err(`extras.${i}.unitAmount`)}
											aria-label="{extra.name}: amount"
											class="{field} w-28 sm:w-40"
										/>
									</div>
									<p class="text-xs text-ink-muted">Paid once per payslip, whatever its length</p>
								{:else}
									<div class="flex items-center gap-2">
										<input
											id="{uid}-bonus-name-{i}"
											class="input h-9 min-w-0 flex-1"
											bind:value={extra.name}
											maxlength="60"
											autocomplete="off"
											placeholder="What it's for, e.g. Christmas"
											aria-label="Bonus name"
											aria-invalid={!!err(`extras.${i}.name`) || undefined}
										/>
										<NumberInput
											{symbol}
											bind:value={extra.unitAmount}
											invalid={!!err(`extras.${i}.unitAmount`)}
											aria-label="{extra.name || 'Bonus'}: amount"
											class="{field} w-28 sm:w-40"
										/>
										<button
											type="button"
											class={removeButton}
											aria-label="Remove {extra.name || 'this bonus'}"
											onclick={() => form.extras.splice(i, 1)}
										>
											<X size={15} aria-hidden="true" />
										</button>
									</div>
								{/if}
								{@render fieldError(
									err(`extras.${i}.name`) ??
										err(`extras.${i}.unitAmount`) ??
										err(`extras.${i}.quantity`)
								)}
							</div>
						{/each}
					</div>
				</section>

				<section class="{section} pb-4 sm:pb-5" aria-label="Notes">
					{#if noteOpen || form.notes}
						<label for="{uid}-notes" class="{headTitle} mb-1.5 block">Notes</label>
						<textarea
							id="{uid}-notes"
							class="textarea w-full"
							rows="2"
							maxlength="500"
							placeholder="e.g. Covered a late shift on Friday"
							bind:value={form.notes}></textarea>
						{@render fieldError(err('notes'))}
					{:else}
						<button type="button" class={addButton} onclick={openNote}>
							<Plus size={13} aria-hidden="true" /> Add a note
						</button>
					{/if}
				</section>
			</div>
		</div>

		<aside
			class="xl:sticky xl:top-6 xl:row-span-2 xl:-mx-3 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:px-3 xl:pb-4"
		>
			<PayslipPanel
				{payslip}
				{currency}
				period={formatRange(form.start, form.end)}
				{emptyMessage}
				{usualRate}
				{tolerancePct}
			/>
		</aside>

		<!-- Under the form card on wide screens (same width); last on the page on phones. -->
		<ActionBar class="xl:col-start-1">
			{#snippet summary()}
				<!-- Just the save state: a coloured dot and a few words. -->
				<span class="flex items-center gap-2 text-xs font-medium" role="status">
					<span
						class="size-2 shrink-0 rounded-full {dirty
							? 'bg-warning'
							: saved
								? 'bg-positive'
								: 'bg-base-300'}"
						aria-hidden="true"
					></span>
					<span class={dirty ? 'text-ink' : 'text-ink-muted'}>
						{dirty ? 'Unsaved changes' : saved ? 'Saved' : 'Not saved yet'}
					</span>
				</span>
			{/snippet}
			{#if saved}
				<button
					type="button"
					class="grid size-10 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-error/10 hover:text-error"
					aria-label="Delete payslip"
					title="Delete payslip"
					onclick={() => (confirmDelete = true)}
				>
					<Trash size={17} aria-hidden="true" />
				</button>
			{/if}
			<Button variant="accent" loading={pending}>
				{pending ? 'Saving…' : saved ? 'Update payslip' : 'Save payslip'}
			</Button>
		</ActionBar>
	</div>
</form>

<form
	bind:this={deleteForm}
	method="post"
	action={actionUrl('delete')}
	use:enhance={submitDelete}
	hidden
>
	<!-- The saved start: the form's dates may have changed without being saved. -->
	<input type="hidden" name="start" value={savedStart} />
</form>

<ConfirmDialog
	bind:open={confirmDelete}
	title="Delete this payslip?"
	message="Its pay, dates, hours and breakdown are removed for good. Your Settings lists aren't affected."
	confirmLabel="Delete payslip"
	pending={deleting}
	onconfirm={() => deleteForm.requestSubmit()}
/>

<PeriodSheet
	bind:open={changingDates}
	period={form}
	{today}
	{savedPeriods}
	editingStart={saved ? savedStart : null}
	{hoursOn}
	onapply={changeDates}
/>
