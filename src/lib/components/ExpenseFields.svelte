<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Field from './Field.svelte';
	import NumberInput from './NumberInput.svelte';
	import { addDays, type IsoDate } from '#lib/dates.ts';
	import {
		MAX_DAYS_AHEAD,
		MAX_NOTE,
		type ExpenseDraft,
		type ExpenseErrors
	} from '#lib/expenses.ts';
	import { currencySymbol, minorDigits } from '#lib/format/money.ts';
	import { cn } from '#lib/utils.ts';

	let {
		value = $bindable(),
		currency,
		today,
		categories,
		errors = {},
		layout = 'stacked',
		amountId
	}: {
		value: ExpenseDraft;
		currency: string;
		today: IsoDate;
		/** The chips, in order; "No category" is added at the end. */
		categories: { value: string; label: string }[];
		errors?: ExpenseErrors;
		/** "wide": amount, date and note side by side on larger screens (quick add). */
		layout?: 'stacked' | 'wide';
		/** Fixed id for the amount input, to focus it after adding. */
		amountId?: string;
	} = $props();

	const uid = $props.id();
	const symbol = $derived(currencySymbol(currency));
	const placeholder = $derived(minorDigits(currency) === 0 ? '0' : '0.00');
	const chips = $derived([...categories, { value: '', label: 'No category' }]);
</script>

<div class={cn('grid gap-3', layout === 'wide' && 'sm:grid-cols-2')}>
	<Field label="Amount" required error={errors.amount} id={amountId}>
		{#snippet children(id)}
			<NumberInput
				{id}
				name="amount"
				bind:value={value.amount}
				{symbol}
				{placeholder}
				invalid={!!errors.amount}
			/>
		{/snippet}
	</Field>
	<Field label="Date" required error={errors.date}>
		{#snippet children(id)}
			<input
				{id}
				type="date"
				name="date"
				class={cn('input w-full', errors.date && 'input-error')}
				bind:value={value.date}
				min="2000-01-01"
				max={addDays(today, MAX_DAYS_AHEAD)}
				aria-invalid={!!errors.date || undefined}
			/>
		{/snippet}
	</Field>
</div>

<fieldset>
	<legend class="mb-1.5 text-xs font-medium text-ink">Category</legend>
	<div class="flex flex-wrap gap-1.5">
		{#each chips as chip (chip.value)}
			{@const selected = chip.value === value.category}
			<label
				class={cn(
					'inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sidebar-active',
					selected
						? 'border-sidebar-active bg-sidebar-active text-sidebar-active-ink'
						: chip.value === ''
							? 'border-dashed border-base-300 text-ink-muted hover:bg-base-200/60'
							: 'border-base-300 text-ink hover:bg-base-200/60'
				)}
			>
				<input
					type="radio"
					class="sr-only"
					name="categoryId"
					value={chip.value}
					checked={selected}
					onchange={() => (value.category = chip.value)}
				/>
				{#if selected}<Check size={12} strokeWidth={3} aria-hidden="true" />{/if}
				{chip.label}
			</label>
		{/each}
	</div>
	{#if errors.categoryId}
		<p role="alert" class="mt-1 text-xs text-error">{errors.categoryId}</p>
	{/if}
</fieldset>

<Field label="Note" optional error={errors.note} id="{uid}-note">
	{#snippet children(id)}
		<input
			{id}
			name="note"
			class={cn('input w-full', errors.note && 'input-error')}
			bind:value={value.note}
			maxlength={MAX_NOTE}
			placeholder="e.g. Tesco, train to work"
			autocomplete="off"
			aria-invalid={!!errors.note || undefined}
		/>
	{/snippet}
</Field>
