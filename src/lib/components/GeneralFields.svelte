<script lang="ts" module>
	// Fixed 'en' so server and browser render the same names.
	const names = new Intl.DisplayNames('en', { type: 'currency' });
	const CURRENCY_OPTIONS = Intl.supportedValuesOf('currency').map((code) => ({
		code,
		label: `${code} · ${names.of(code) ?? code}`
	}));
</script>

<script lang="ts">
	import Field from './Field.svelte';
	import { DATE_FORMATS, WEEKDAYS } from '#lib/templates.ts';

	type Values = {
		currency: string;
		weekStartDay: number;
		dateFormat: string;
		usualRate: string | null;
		rateTolerancePct: string;
	};

	let { values, showRate = true }: { values: Values; showRate?: boolean } = $props();
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

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
	<Field label="Pay week starts on">
		{#snippet children(id)}
			<select {id} class="select w-full" name="weekStartDay" value={values.weekStartDay}>
				{#each WEEKDAYS as day, i (day)}
					<option value={i}>{day}</option>
				{/each}
			</select>
		{/snippet}
	</Field>

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
		<Field label="Usual hourly rate" optional hint="Used to spot weeks where the rate looks off.">
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
		<Field label="Flag weeks that differ by more than">
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
