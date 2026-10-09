<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trash from '@lucide/svelte/icons/trash';
	import X from '@lucide/svelte/icons/x';
	import ActionBar from './ActionBar.svelte';
	import Button from './Button.svelte';
	import Callout from './Callout.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import Field from './Field.svelte';
	import FormSection from './FormSection.svelte';
	import NumberInput from './NumberInput.svelte';
	import PayslipPanel from './PayslipPanel.svelte';
	import { reversePayslip } from '#lib/calc/reversePayslip.ts';
	import { addDays, dayLabel, formatRange } from '#lib/dates.ts';
	import {
		currencySymbol,
		formatMoney,
		formatRate,
		minorDigits,
		toMinor
	} from '#lib/format/money.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { clearDraft, readDraft, writeDraft } from '#lib/week/draft.ts';
	import { mergeDraft, parseWeek, toInput, type WeekForm } from '#lib/week/form.ts';

	let {
		initial,
		owner,
		saved,
		usualRate,
		tolerancePct
	}: {
		/** The week as saved (or as a new week from Settings). The parent remounts on change. */
		initial: WeekForm;
		/** Whose device draft this is (the account email). */
		owner: string;
		saved: boolean;
		usualRate: number | null;
		tolerancePct: number;
	} = $props();

	const uid = $props.id();
	const clone = (value: WeekForm): WeekForm => JSON.parse(JSON.stringify(value));
	const initialJson = untrack(() => JSON.stringify(initial));
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
		const draft = readDraft(owner, form.weekStart);
		if (draft) {
			// Rows follow the current Settings; the draft only fills in what was typed.
			const merged = mergeDraft(clone(initial), draft.form);
			if (JSON.stringify(merged) !== initialJson) {
				form = merged;
				restoredAt = draft.savedAt;
			} else {
				clearDraft(owner, form.weekStart);
			}
		}
		keepDraft = true;
		return () => clearTimeout(draftTimer);
	});

	$effect(() => {
		if (!keepDraft) return;
		const snapshot = $state.snapshot(form);
		clearTimeout(draftTimer);
		if (JSON.stringify(snapshot) === initialJson) clearDraft(owner, snapshot.weekStart);
		else draftTimer = setTimeout(() => writeDraft(owner, snapshot), 300);
	});

	/** After a save or delete: the server copy is now the truth. */
	function dropDraft() {
		keepDraft = false;
		clearTimeout(draftTimer);
		clearDraft(owner, form.weekStart);
	}

	function discard() {
		form = clone(initial);
		restoredAt = null;
		attempted = false;
		clearDraft(owner, form.weekStart);
	}

	// --- Live calculation ---
	const parsed = $derived(parseWeek(form));
	const errors = $derived(parsed.ok ? {} : parsed.errors);
	const payslip = $derived(parsed.ok ? reversePayslip(toInput(parsed.week)) : null);
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
	function extraAmount(row: WeekForm['extras'][number]) {
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
					toast.show(String(result.data?.message ?? 'Week saved.'));
				} else if (result.type === 'failure') {
					toast.show(String(result.data?.error ?? 'Something went wrong.'), 'error');
				} else if (result.type === 'redirect') {
					await update();
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
					toast.show(String(result.data?.message ?? 'Week deleted.'));
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
	const removeButton =
		'mt-6.5 grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-base-200 hover:text-ink';
</script>

<form
	method="post"
	action="?/save"
	use:enhance={submit}
	novalidate
	class="flex flex-col gap-4 sm:gap-5"
>
	<input type="hidden" name="payload" value={JSON.stringify(form)} />

	<div
		class="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_26rem]"
	>
		<div class="flex min-w-0 flex-col gap-4 sm:gap-5">
			{#if restoredAt}
				<Callout title="Restored your unsaved changes">
					From {time(restoredAt)}, kept on this device. Save the week to keep them for good.
					{#snippet action()}
						<Button type="button" variant="ghost" size="sm" onclick={discard}>
							<RotateCcw size={14} aria-hidden="true" /> Discard
						</Button>
					{/snippet}
				</Callout>
			{/if}

			<FormSection step={1} title="Net pay" description="The take-home amount on your payslip.">
				<Field label="Net pay" required error={err('net')}>
					{#snippet children(fid)}
						<NumberInput
							id={fid}
							{symbol}
							bind:value={form.net}
							invalid={!!err('net')}
							placeholder={digits ? '0.00' : '0'}
							class="sm:max-w-xs"
						/>
					{/snippet}
				</Field>
			</FormSection>

			<FormSection
				step={2}
				title="Deductions"
				description="Each deduction on your payslip. Leave any you didn't have blank."
			>
				{#snippet action()}
					<Button type="button" variant="ghost" size="sm" onclick={() => addRow('deduction')}>
						<Plus size={14} aria-hidden="true" /> Add
					</Button>
				{/snippet}
				{#if form.deductions.length === 0}
					<p class="text-sm text-ink-muted">
						No deductions set up. <a
							href="/settings"
							class="font-semibold text-sidebar-active hover:underline">Add them in Settings</a
						>, or add a one-off here.
					</p>
				{/if}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
					{#each form.deductions as row, i (i)}
						{#if row.custom}
							<div class="flex items-start gap-2 sm:col-span-2">
								<div class="min-w-0 flex-1">
									<Field
										label="Name"
										id="{uid}-deduction-name-{i}"
										error={err(`deductions.${i}.name`)}
									>
										{#snippet children(fid)}
											<input
												id={fid}
												class="input w-full"
												bind:value={row.name}
												maxlength="60"
												autocomplete="off"
												placeholder="e.g. Uniform"
												aria-invalid={!!err(`deductions.${i}.name`) || undefined}
											/>
										{/snippet}
									</Field>
								</div>
								<div class="w-36 sm:w-48">
									<Field label="Amount" error={err(`deductions.${i}.amount`)}>
										{#snippet children(fid)}
											<NumberInput
												id={fid}
												{symbol}
												bind:value={row.amount}
												invalid={!!err(`deductions.${i}.amount`)}
											/>
										{/snippet}
									</Field>
								</div>
								<button
									type="button"
									class={removeButton}
									aria-label="Remove {row.name || 'this deduction'}"
									onclick={() => form.deductions.splice(i, 1)}
								>
									<X size={16} aria-hidden="true" />
								</button>
							</div>
						{:else}
							<Field label={row.name} error={err(`deductions.${i}.amount`)}>
								{#snippet children(fid)}
									<NumberInput
										id={fid}
										{symbol}
										bind:value={row.amount}
										invalid={!!err(`deductions.${i}.amount`)}
									/>
								{/snippet}
							</Field>
						{/if}
					{/each}
				</div>
			</FormSection>

			<FormSection
				step={3}
				title="Hours"
				description="Regular hours each day. Overtime goes in the next step."
			>
				<div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
					{#each form.days as day, i (day.date)}
						{@const label = dayLabel(day.date)}
						<div class="flex min-w-0 flex-col gap-1">
							<label for="{uid}-day-{i}" class="text-center leading-tight">
								<span class="block text-xs font-semibold text-ink">{label.weekday}</span>
								<span class="text-xs text-ink-muted">{label.day}</span>
							</label>
							<input
								id="{uid}-day-{i}"
								class="input w-full px-1 text-center tabular-nums {err(`days.${i}.hours`)
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
				<div class="flex items-start justify-between gap-3">
					{#if dayError}
						<p role="alert" class="text-xs text-error">
							{dayLabel(dayError.day.date).weekday}: {dayError.message}
						</p>
					{:else}
						<span></span>
					{/if}
					<p class="shrink-0 text-sm text-ink-muted">
						Total <span class="font-semibold text-ink tabular-nums">{fmtHours(totalHours)}</span>
					</p>
				</div>
			</FormSection>

			<FormSection step={4} title="Overtime" description="Hours worked at each overtime rate.">
				{#if form.ot.length === 0}
					<p class="text-sm text-ink-muted">
						No overtime rates set up. <a
							href="/settings"
							class="font-semibold text-sidebar-active hover:underline">Add them in Settings</a
						> if you're paid overtime.
					</p>
				{:else}
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
						{#each form.ot as row, i (i)}
							<Field label="{row.name} × {row.multiplier}" error={err(`ot.${i}.hours`)}>
								{#snippet children(fid)}
									<NumberInput
										id={fid}
										suffix="hrs"
										placeholder="0"
										bind:value={row.hours}
										invalid={!!err(`ot.${i}.hours`)}
									/>
								{/snippet}
							</Field>
						{/each}
					</div>
				{/if}
			</FormSection>

			<FormSection
				step={5}
				title="Extras"
				description="Allowances and bonuses on top of your hours."
			>
				{#snippet action()}
					<Button type="button" variant="ghost" size="sm" onclick={() => addRow('bonus')}>
						<Plus size={14} aria-hidden="true" /> Add bonus
					</Button>
				{/snippet}
				{#if form.extras.length === 0}
					<p class="text-sm text-ink-muted">
						No allowances set up. <a
							href="/settings"
							class="font-semibold text-sidebar-active hover:underline">Add them in Settings</a
						>, or add a one-off bonus.
					</p>
				{/if}
				{#each form.extras as row, i (i)}
					{@const amount = extraAmount(row)}
					<div class="rounded-2xl border border-base-300/70 p-3 sm:p-4">
						<div class="mb-3 flex items-center gap-2">
							{#if row.kind === 'per_week'}
								<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
									<input
										type="checkbox"
										class="checkbox checkbox-sm checkbox-primary"
										checked={row.quantity === '1'}
										onchange={(e) => (row.quantity = e.currentTarget.checked ? '1' : '0')}
									/>
									<span class="truncate text-sm font-semibold text-ink">{row.name}</span>
									<span class="badge shrink-0 badge-ghost badge-sm">Paid this week</span>
								</label>
							{:else}
								<p class="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
									{row.kind === 'bonus' ? 'One-off bonus' : row.name}
								</p>
								<span class="badge shrink-0 badge-ghost badge-sm">
									{row.kind === 'bonus' ? 'This week only' : 'Per day'}
								</span>
							{/if}
							{#if amount}
								<span class="shrink-0 font-mono text-[0.8rem] font-semibold text-ink tabular-nums"
									>= {amount}</span
								>
							{/if}
							{#if row.custom}
								<button
									type="button"
									class="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-base-200 hover:text-ink"
									aria-label="Remove {row.name || 'this bonus'}"
									onclick={() => form.extras.splice(i, 1)}
								>
									<X size={16} aria-hidden="true" />
								</button>
							{/if}
						</div>

						<div class="grid grid-cols-2 gap-3 sm:max-w-md">
							{#if row.kind === 'bonus'}
								<Field label="Name" id="{uid}-bonus-name-{i}" error={err(`extras.${i}.name`)}>
									{#snippet children(fid)}
										<input
											id={fid}
											class="input w-full"
											bind:value={row.name}
											maxlength="60"
											autocomplete="off"
											placeholder="e.g. Christmas bonus"
											aria-invalid={!!err(`extras.${i}.name`) || undefined}
										/>
									{/snippet}
								</Field>
							{/if}
							<Field
								label={row.kind === 'per_day' ? 'Amount per day' : 'Amount'}
								error={err(`extras.${i}.unitAmount`)}
							>
								{#snippet children(fid)}
									<NumberInput
										id={fid}
										{symbol}
										bind:value={row.unitAmount}
										invalid={!!err(`extras.${i}.unitAmount`)}
									/>
								{/snippet}
							</Field>
							{#if row.kind === 'per_day'}
								<Field label="Days" error={err(`extras.${i}.quantity`)}>
									{#snippet children(fid)}
										<NumberInput
											id={fid}
											inputmode="numeric"
											placeholder="0"
											suffix="of 7"
											bind:value={row.quantity}
											invalid={!!err(`extras.${i}.quantity`)}
										/>
									{/snippet}
								</Field>
							{/if}
						</div>
					</div>
				{/each}
			</FormSection>

			<FormSection step={6} title="Notes" description="Anything to remember about this week.">
				<Field label="Notes" optional error={err('notes')}>
					{#snippet children(fid)}
						<textarea
							id={fid}
							class="textarea w-full"
							rows="3"
							maxlength="500"
							placeholder="e.g. Covered a late shift on Friday"
							bind:value={form.notes}></textarea>
					{/snippet}
				</Field>
			</FormSection>
		</div>

		<aside
			class="xl:sticky xl:top-6 xl:-mx-3 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:px-3 xl:pb-4"
		>
			<PayslipPanel
				{payslip}
				{currency}
				period={formatRange(form.weekStart, addDays(form.weekStart, 6))}
				{emptyMessage}
				{usualRate}
				{tolerancePct}
			/>
		</aside>
	</div>

	<ActionBar>
		{#snippet summary()}
			<span class="flex flex-wrap items-center gap-x-2 gap-y-1">
				{#if dirty}
					<span class="badge badge-sm font-medium badge-warning">Unsaved changes</span>
				{:else if saved}
					<span class="badge badge-sm font-medium badge-success">Saved</span>
				{:else}
					<span class="badge badge-sm font-medium badge-neutral">Not saved yet</span>
				{/if}
				{#if payslip}
					<span class="tabular-nums">
						Gross {formatMoney(payslip.gross, currency)}{#if payslip.hourlyRate !== null}
							· {formatRate(payslip.hourlyRate, currency)}/hr{/if}
					</span>
				{/if}
			</span>
		{/snippet}
		{#if saved}
			<Button type="button" variant="ghost" onclick={() => (confirmDelete = true)}>
				<Trash size={16} aria-hidden="true" /> Delete
			</Button>
		{/if}
		<Button variant="accent" class="flex-1 sm:flex-none" loading={pending}>
			{pending ? 'Saving…' : saved ? 'Update week' : 'Save week'}
		</Button>
	</ActionBar>
</form>

<form bind:this={deleteForm} method="post" action="?/delete" use:enhance={submitDelete} hidden>
	<input type="hidden" name="weekStart" value={form.weekStart} />
</form>

<ConfirmDialog
	bind:open={confirmDelete}
	title="Delete this week?"
	message="Its pay, hours and breakdown are removed for good. Your Settings lists aren't affected."
	confirmLabel="Delete week"
	pending={deleting}
	onconfirm={() => deleteForm.requestSubmit()}
/>
