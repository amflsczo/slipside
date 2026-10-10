<script lang="ts">
	import { enhance } from '$app/forms';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ActionBar from '#lib/components/ActionBar.svelte';
	import Button from '#lib/components/Button.svelte';
	import ChoiceGroup from '#lib/components/ChoiceGroup.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormSection from '#lib/components/FormSection.svelte';
	import GeneralFields from '#lib/components/GeneralFields.svelte';
	import ListManager from '#lib/components/ListManager.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import SegmentedTabs from '#lib/components/SegmentedTabs.svelte';
	import ThemePicker from '#lib/components/ThemePicker.svelte';
	import { feedback } from '#lib/formFeedback.ts';
	import type { PayLength } from '#lib/period.ts';
	import { TEMPLATES, TEMPLATE_IDS, type TemplateId } from '#lib/templates.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const TABS = [
		{ id: 'general', label: 'General' },
		{ id: 'deductions', label: 'Deductions' },
		{ id: 'extras', label: 'Extras' },
		{ id: 'otRates', label: 'OT rates' },
		{ id: 'categories', label: 'Categories' }
	] as const;
	let tab = $state<(typeof TABS)[number]['id']>('general');

	let pending = $state(false);
	const setPending = (p: boolean) => (pending = p);

	// First-run setup: picking a template pre-selects its suggested currency etc.
	let template = $state<TemplateId>('blank');
	let setupValues = $state({
		currency: '',
		payLength: 'week' as PayLength,
		dateFormat: 'DD/MM/YYYY',
		usualRate: null as string | null,
		rateTolerancePct: '2'
	});
	function pickTemplate(id: TemplateId) {
		template = id;
		Object.assign(setupValues, TEMPLATES[id].suggested);
	}

	const counts = (id: TemplateId) => {
		const t = TEMPLATES[id];
		if (id === 'blank') return 'Empty lists; add your own';
		return `${t.deductions.length} deductions, ${t.otRates.length} OT rates, ${t.extras.length} extras, ${t.expenseCategories.length} categories`;
	};
	const templateOptions = TEMPLATE_IDS.map((id) => ({
		value: id,
		label: TEMPLATES[id].label,
		description: counts(id)
	}));
</script>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5">
	<PageHeader
		title="Settings"
		subtitle="How often you're paid, your currency and the lists you pick from on each payslip."
		icon={SettingsIcon}
	/>

	{#if !data.general}
		<form
			method="post"
			action="?/setup"
			class="flex flex-col gap-4 sm:gap-5"
			use:enhance={feedback(setPending)}
		>
			<FormSection
				step={1}
				title="Pick a starting template"
				description="It only pre-fills your lists. You can change everything later."
			>
				<ChoiceGroup
					legend="Template"
					hideLegend
					name="template"
					options={templateOptions}
					value={template}
					onchange={pickTemplate}
					class="lg:grid-cols-3"
				/>
			</FormSection>

			<FormSection
				step={2}
				title="Your pay"
				description="How often you're paid and how amounts are shown."
			>
				<GeneralFields values={setupValues} showRate={false} />
			</FormSection>

			<ActionBar>
				{#snippet summary()}{TEMPLATES[template].label} template{/snippet}
				<Button variant="accent" class="flex-1 sm:flex-none" loading={pending}>
					{pending ? 'Saving…' : 'Save and continue'}
				</Button>
			</ActionBar>
		</form>
	{:else}
		<SegmentedTabs
			tabs={TABS}
			value={tab}
			onchange={(id) => (tab = id)}
			label="Settings sections"
			idPrefix="settings"
		/>

		<div
			role="tabpanel"
			id="settings-panel"
			aria-labelledby="settings-tab-{tab}"
			class="flex flex-col gap-4 sm:gap-5"
		>
			{#if tab === 'general'}
				<form method="post" action="?/general" use:enhance={feedback(setPending)}>
					<Panel title="Pay settings" class="form-surface">
						<div class="flex flex-col gap-4 sm:gap-5">
							<GeneralFields values={data.general} />
							<div class="flex justify-end">
								<Button class="w-full sm:w-auto" loading={pending}>
									{pending ? 'Saving…' : 'Save settings'}
								</Button>
							</div>
						</div>
					</Panel>
				</form>

				<Panel title="Appearance">
					<ThemePicker />
				</Panel>

				<Panel
					title="Add items from a template"
					subtitle="Adds only the items you don't already have."
					class="form-surface"
				>
					<form
						method="post"
						action="?/applyTemplate"
						class="flex flex-col gap-3 sm:flex-row sm:items-end"
						use:enhance={feedback(setPending)}
					>
						<div class="flex-1">
							<Field label="Template">
								{#snippet children(id)}
									<select {id} class="select w-full" name="template">
										{#each TEMPLATE_IDS.filter((t) => t !== 'blank') as t (t)}
											<option value={t}>{TEMPLATES[t].label}</option>
										{/each}
									</select>
								{/snippet}
							</Field>
						</div>
						<Button variant="secondary" disabled={pending}>Add items</Button>
					</form>
				</Panel>
			{:else if tab === 'deductions'}
				<Panel
					title="Deductions"
					subtitle="The deductions on your payslip, e.g. tax, insurance, pension. Shown in this order on This Week."
					class="form-surface"
				>
					<ListManager list="deductions" items={data.lists.deductions} singular="deduction" />
				</Panel>
			{:else if tab === 'extras'}
				<Panel
					title="Extras"
					subtitle="Extra pay on top of your hours: per-day amounts (e.g. a shift allowance × days) or a fixed amount once per payslip."
					class="form-surface"
				>
					<ListManager list="extras" items={data.lists.extras} singular="extra" fields="extra" />
				</Panel>
			{:else if tab === 'otRates'}
				<Panel
					title="OT rates"
					subtitle="Overtime rates and their multipliers, e.g. Overtime × 1.5."
					class="form-surface"
				>
					<ListManager
						list="otRates"
						items={data.lists.otRates}
						singular="OT rate"
						fields="multiplier"
					/>
				</Panel>
			{:else}
				<Panel title="Categories" subtitle="Categories for your expenses." class="form-surface">
					<ListManager list="categories" items={data.lists.categories} singular="category" />
				</Panel>
			{/if}
		</div>
	{/if}
</div>
