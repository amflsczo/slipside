<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { tick } from 'svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import Button from './Button.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import ExpenseFields from './ExpenseFields.svelte';
	import { type IsoDate } from '#lib/dates.ts';
	import {
		KEPT,
		UNCATEGORISED,
		fromDraft,
		parseExpense,
		toExpenseForm,
		type ExpenseDraft,
		type ExpenseRow
	} from '#lib/expenses.ts';
	import { toast } from '#lib/toast.svelte.ts';

	let {
		open = $bindable(false),
		row,
		today,
		categories,
		actionUrl
	}: {
		open?: boolean;
		/** The expense being edited. */
		row: ExpenseRow | null;
		today: IsoDate;
		/** The visible categories (the expense's own hidden one is added). */
		categories: { id: number; name: string }[];
		/** This page's URL plus the action, so the month is kept. */
		actionUrl: (name: string) => string;
	} = $props();

	let dialog: HTMLDialogElement;
	let deleteForm = $state<HTMLFormElement>();
	const id = $props.id();
	let draft = $state<ExpenseDraft>({ amount: '', date: '', category: '', note: '' });
	let attempted = $state(false);
	let saving = $state(false);
	let confirmDelete = $state(false);
	let deleting = $state(false);

	/** A deleted category: the link is gone, only its saved name is left. */
	const deletedName = $derived(
		row && row.categoryId === null && row.categoryName !== UNCATEGORISED ? row.categoryName : null
	);
	// The visible categories, plus this expense's own if it's hidden in Settings.
	const allowed = $derived(
		row?.categoryId != null && !categories.some((c) => c.id === row.categoryId)
			? [...categories, { id: row.categoryId, name: row.categoryName }]
			: categories
	);
	const chips = $derived([
		...allowed.map((c) => ({ value: String(c.id), label: c.name })),
		...(deletedName ? [{ value: KEPT, label: deletedName }] : [])
	]);

	// Fill the form from the expense each time the sheet opens.
	$effect(() => {
		if (open && row && !dialog.open) {
			const form = toExpenseForm(row);
			draft = {
				amount: form.amount,
				date: form.date,
				category: form.categoryId !== null ? String(form.categoryId) : deletedName ? KEPT : '',
				note: form.note
			};
			attempted = false;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	const parsed = $derived(
		row
			? parseExpense(fromDraft(draft), { today, currency: row.currency, categories: allowed })
			: null
	);
	const errors = $derived(attempted && parsed && !parsed.ok ? parsed.errors : {});
	const busy = $derived(saving || deleting);

	const submit: SubmitFunction = ({ cancel }) => {
		attempted = true;
		if (parsed && !parsed.ok) {
			cancel();
			tick().then(() =>
				dialog.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus()
			);
			return;
		}
		saving = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					await update({ reset: false });
					open = false;
					toast.show(String(result.data?.message ?? 'Expense saved.'));
				} else if (result.type === 'failure') {
					toast.show(String(result.data?.error ?? 'Something went wrong.'), 'error');
				} else {
					toast.show("Couldn't save just now. Please try again.", 'error');
				}
			} finally {
				saving = false;
			}
		};
	};

	const submitDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			try {
				confirmDelete = false;
				if (result.type === 'success') {
					await update();
					open = false;
					toast.show(String(result.data?.message ?? 'Expense deleted.'));
				} else {
					const message =
						result.type === 'failure' ? result.data?.error : "Couldn't delete just now. Try again.";
					toast.show(String(message ?? 'Something went wrong.'), 'error');
				}
			} finally {
				deleting = false;
			}
		};
	};
</script>

<!-- Native <dialog>: focus stays inside, Escape or a backdrop click closes it. -->
<dialog
	bind:this={dialog}
	aria-labelledby="{id}-title"
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card p-0 text-ink shadow-[0_20px_60px_-15px_rgb(0_0_0/0.45)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-dialog-in"
	onclose={() => (open = false)}
	oncancel={(e) => busy && e.preventDefault()}
	onclick={(e) => {
		if (e.target === dialog && !busy) open = false;
	}}
>
	{#if row}
		<form
			method="POST"
			action={actionUrl('update')}
			use:enhance={submit}
			novalidate
			class="form-surface flex flex-col gap-4 p-5 sm:p-6"
		>
			<input type="hidden" name="id" value={row.id} />
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 id="{id}-title" class="font-display text-lg font-semibold">Edit expense</h2>
					{#if row.upcoming}
						<p class="text-xs text-ink-muted">Upcoming. It counts in the month it's dated.</p>
					{/if}
				</div>
				<button
					type="button"
					class="-mt-1 -mr-1 grid size-9 place-items-center rounded-full text-ink-muted hover:bg-base-200 hover:text-ink"
					aria-label="Close"
					disabled={busy}
					onclick={() => (open = false)}
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			<ExpenseFields
				bind:value={draft}
				currency={row.currency}
				{today}
				categories={chips}
				{errors}
			/>

			<div class="mt-1 flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					class="text-error hover:bg-error/10 hover:text-error"
					aria-label="Delete expense"
					disabled={busy}
					onclick={() => (confirmDelete = true)}
				>
					<Trash2 size={16} aria-hidden="true" />
				</Button>
				<Button
					type="button"
					variant="secondary"
					class="ml-auto"
					disabled={busy}
					onclick={() => (open = false)}>Cancel</Button
				>
				<Button type="submit" loading={saving} disabled={deleting}>Save</Button>
			</div>
		</form>

		<form
			bind:this={deleteForm}
			method="POST"
			action={actionUrl('delete')}
			use:enhance={submitDelete}
			hidden
		>
			<input type="hidden" name="id" value={row.id} />
		</form>
	{/if}
</dialog>

<ConfirmDialog
	bind:open={confirmDelete}
	title="Delete this expense?"
	message="It's removed from this month's totals. This can't be undone."
	confirmLabel="Delete"
	pending={deleting}
	onconfirm={() => deleteForm?.requestSubmit()}
/>
