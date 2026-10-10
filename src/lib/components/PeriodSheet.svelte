<script lang="ts">
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import Button from './Button.svelte';
	import Callout from './Callout.svelte';
	import { cn } from '#lib/utils.ts';
	import { addDays, formatRange, shortDate, type IsoDate } from '#lib/dates.ts';
	import {
		MAX_PERIOD_DAYS,
		PERIOD_MESSAGES,
		PRESETS,
		applyPreset,
		checkPeriod,
		datesOutside,
		dayCount,
		findOverlap,
		type Period,
		type PresetId
	} from '#lib/period.ts';

	let {
		open = $bindable(false),
		period,
		today,
		savedPeriods,
		editingStart,
		hoursOn,
		onapply
	}: {
		open?: boolean;
		/** The dates the payslip has now. */
		period: Period;
		today: IsoDate;
		/** Every saved payslip's dates, to warn about overlaps while choosing. */
		savedPeriods: Period[];
		/** The saved start of the payslip being edited (not an overlap with itself); null if new. */
		editingStart: IsoDate | null;
		/** Dates that have hours typed, to warn before a shorter period drops them. */
		hoursOn: IsoDate[];
		onapply: (period: Period) => void;
	} = $props();

	let dialog: HTMLDialogElement;
	const id = $props.id();
	let start = $state('');
	let end = $state('');

	// Start from the payslip's dates each time the sheet opens.
	$effect(() => {
		if (open && !dialog.open) {
			start = period.start;
			end = period.end;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	const chosen = $derived({ start, end });
	const problem = $derived(checkPeriod(chosen, today));
	const clash = $derived(problem ? null : findOverlap(chosen, savedPeriods, editingStart));
	const dropped = $derived(problem || clash ? [] : datesOutside(chosen, hoursOn));
	const unchanged = $derived(start === period.start && end === period.end);
	const message = $derived(
		problem
			? PERIOD_MESSAGES[problem]
			: clash
				? `Overlaps your ${formatRange(clash.start, clash.end)} payslip.`
				: null
	);
	const droppedList = $derived(
		dropped.length <= 3
			? dropped.map(shortDate).join(', ')
			: `${dropped.slice(0, 2).map(shortDate).join(', ')} and ${dropped.length - 2} more days`
	);

	function pick(preset: PresetId) {
		({ start, end } = applyPreset(preset, start || period.start, today));
	}
	const isPreset = (preset: PresetId) => {
		const p = applyPreset(preset, start || period.start, today);
		return p.start === start && p.end === end;
	};

	/** Moving the start past the end (or too far from it) pulls the end along. */
	function onStartInput() {
		if (!start) return;
		if (end < start) end = start;
		else if (end > addDays(start, MAX_PERIOD_DAYS - 1)) end = addDays(start, MAX_PERIOD_DAYS - 1);
	}

	function apply() {
		if (message || unchanged) return;
		onapply({ start, end });
		open = false;
	}
</script>

<!-- Native <dialog>: focus stays inside, Escape or a backdrop click cancels.
     Phones: a sheet from the bottom. Larger screens: a centred card. -->
<dialog
	bind:this={dialog}
	aria-labelledby="{id}-title"
	class="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-card p-5 text-ink shadow-[0_20px_60px_-15px_rgb(0_0_0/0.45)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-dialog-in max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6"
	onclose={() => (open = false)}
	onclick={(e) => {
		if (e.target === dialog) open = false;
	}}
>
	<div class="form-surface flex flex-col gap-4">
		<div class="flex items-start gap-3">
			<span
				class="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-active/12 text-sidebar-active"
				aria-hidden="true"
			>
				<CalendarRange size={20} />
			</span>
			<div class="min-w-0">
				<h2 id="{id}-title" class="font-display text-lg font-semibold">Payslip dates</h2>
				<p class="text-sm text-ink-muted">The days this payslip covers, both included.</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2" role="group" aria-label="Quick picks">
			{#each PRESETS as preset (preset.id)}
				{@const active = isPreset(preset.id)}
				<button
					type="button"
					class={cn(
						'min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150',
						active
							? 'border-sidebar-active bg-sidebar-active text-sidebar-active-ink'
							: 'border-base-300 text-ink hover:bg-base-200'
					)}
					aria-pressed={active}
					onclick={() => pick(preset.id)}>{preset.label}</button
				>
			{/each}
		</div>

		<div class="grid grid-cols-2 gap-3">
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.8rem] font-medium">Start</span>
				<input
					type="date"
					class="input w-full"
					max={today}
					bind:value={start}
					oninput={onStartInput}
					required
				/>
			</label>
			<label class="flex min-w-0 flex-col gap-1.5">
				<span class="text-[0.8rem] font-medium">End</span>
				<input
					type="date"
					class="input w-full"
					min={start || undefined}
					max={start ? addDays(start, MAX_PERIOD_DAYS - 1) : undefined}
					bind:value={end}
					required
				/>
			</label>
		</div>

		<p class="min-h-5 text-sm" aria-live="polite">
			{#if message}
				<span class="font-medium text-error">{message}</span>
			{:else}
				<span class="font-semibold tabular-nums">{formatRange(start, end)}</span>
				<span class="text-ink-muted"
					>· {dayCount(chosen)} {dayCount(chosen) === 1 ? 'day' : 'days'}</span
				>
			{/if}
		</p>

		{#if dropped.length}
			<Callout tone="warning" title="Some hours will be removed">
				Hours on {droppedList} fall outside these dates.
			</Callout>
		{/if}

		<div class="flex gap-2">
			<Button type="button" variant="secondary" class="flex-1" onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button
				type="button"
				variant="accent"
				class="flex-1"
				disabled={!!message || unchanged}
				onclick={apply}
			>
				{dropped.length ? 'Remove hours and apply' : 'Apply'}
			</Button>
		</div>
	</div>
</dialog>
