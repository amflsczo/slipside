<script lang="ts" module>
	// Fixed 'en' so server and browser render the same names.
	const names = new Intl.DisplayNames('en', { type: 'currency' });
	const CURRENCY_OPTIONS = Intl.supportedValuesOf('currency').map((code) => ({
		code,
		label: `${code} · ${names.of(code) ?? code}`
	}));
</script>

<script lang="ts">
	import ChoiceGroup from './ChoiceGroup.svelte';
	import Field from './Field.svelte';
	import { PAY_LENGTHS, PAY_LENGTH_LABELS, type PayLength } from '#lib/period.ts';
	import { DATE_FORMATS } from '#lib/templates.ts';

	type Values = {
		currency: string;
		payLength: PayLength;
		dateFormat: string;
		usualRate: string | null;
		rateTolerancePct: string;
	};

	let { values, showRate = true }: { values: Values; showRate?: boolean } = $props();

	const PAY_LENGTH_HINTS: Record<PayLength, string> = {
		day: 'A payslip for each day',
		week: 'A payslip every 7 days',
		fortnight: 'A payslip every 14 days',
		month: 'A payslip once a month'
	};
	const payLengthOptions = PAY_LENGTHS.map((value) => ({
		value,
		label: PAY_LENGTH_LABELS[value],
		description: PAY_LENGTH_HINTS[value]
	}));
	// Follows `values` (e.g. a template's suggestion) until the user picks one.
	let picked = $state<PayLength | null>(null);
	const payLength = $derived(picked ?? values.payLength);
</script>

<Field label="Currency" required>
	{#snippet children(id)}
		<select {id} class="select w-full" name="currency" value={values.currency} required>
			<option value="" disabled>Choose a currency</option>
			{#each CURRENCY_OPTIONS as option (option.code)}
				<option value={option.code}>{option.label}</option>
			{/each}
		</select>
	{/snippet}
</Field>

<div class="flex flex-col gap-1.5">
	<ChoiceGroup
		legend="How often are you usually paid?"
		name="payLength"
		options={payLengthOptions}
		value={payLength}
		onchange={(value) => (picked = value)}
		class="grid-cols-2 lg:grid-cols-4"
	/>
	<p class="text-xs text-ink-muted">
		This only suggests the dates for a new payslip. You can change any payslip's dates.
	</p>
</div>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
	<Field label="Date format">
		{#snippet children(id)}
			<select {id} class="select w-full" name="dateFormat" value={values.dateFormat}>
				{#each DATE_FORMATS as format (format)}
					<option value={format}>{format}</option>
				{/each}
			</select>
		{/snippet}
	</Field>
</div>

{#if showRate}
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
		<Field
			label="Usual hourly rate"
			optional
			hint="Used to spot payslips where the rate looks off."
		>
			{#snippet children(id)}
				<input
					{id}
					class="input w-full tabular-nums"
					name="usualRate"
					inputmode="decimal"
					autocomplete="off"
					placeholder="e.g. 12.50"
					value={values.usualRate ?? ''}
				/>
			{/snippet}
		</Field>
		<Field label="Flag payslips that differ by more than">
			{#snippet children(id)}
				<label class="input w-full">
					<input
						{id}
						class="tabular-nums"
						name="rateTolerancePct"
						inputmode="decimal"
						autocomplete="off"
						value={values.rateTolerancePct}
					/>
					<span class="text-ink-muted" aria-hidden="true">%</span>
				</label>
			{/snippet}
		</Field>
	</div>
{:else}
	<input type="hidden" name="usualRate" value={values.usualRate ?? ''} />
	<input type="hidden" name="rateTolerancePct" value={values.rateTolerancePct} />
{/if}
