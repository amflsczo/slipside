<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Layers from '@lucide/svelte/icons/layers';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Plus from '@lucide/svelte/icons/plus';
	import Button from './Button.svelte';
	import EmptyState from './EmptyState.svelte';
	import { feedback } from '#lib/formFeedback.ts';
	import { toast } from '#lib/toast.svelte.ts';

	type Item = {
		id: number;
		name: string;
		active: boolean;
		kind?: 'per_day' | 'per_week';
		defaultAmount?: string | null;
		multiplier?: string;
	};

	let {
		list,
		items,
		singular,
		fields = 'name'
	}: {
		list: 'deductions' | 'extras' | 'otRates' | 'categories';
		items: Item[];
		singular: string;
		fields?: 'name' | 'extra' | 'multiplier';
	} = $props();

	let editing = $state<number | null>(null);
	let pending = $state(false);
	const setPending = (p: boolean) => (pending = p);

	// Hide/show updates the row straight away and saves in the background; if the save
	// fails the row goes back. Keyed by id until the refreshed list arrives.
	let shownActive = $state<Record<number, boolean>>({});
	const isActive = (item: Item) => shownActive[item.id] ?? item.active;

	const toggle =
		(item: Item): SubmitFunction =>
		() => {
			const next = !isActive(item);
			shownActive[item.id] = next;
			return async ({ result, update }) => {
				if (result.type === 'success') {
					toast.show(String(result.data?.message ?? (next ? 'Shown.' : 'Hidden.')));
					await update();
				} else {
					const message = result.type === 'failure' ? result.data?.error : undefined;
					toast.show(String(message ?? "Couldn't save just now. Please try again."), 'error');
				}
				// The list now matches the server (or the change failed): drop the override,
				// unless another click on this row has replaced it meanwhile.
				if (shownActive[item.id] === next) delete shownActive[item.id];
			};
		};

	const kindLabel = { per_day: 'per day', per_week: 'per payslip' } as const;

	function details(item: Item) {
		if (fields === 'multiplier') return `× ${Number(item.multiplier)}`;
		if (fields === 'extra') {
			const kind = kindLabel[item.kind ?? 'per_day'];
			return item.defaultAmount ? `${kind} · default ${item.defaultAmount}` : kind;
		}
		return '';
	}

	const iconButton =
		'grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-base-200 hover:text-ink disabled:pointer-events-none disabled:opacity-40';
</script>

{#snippet extraInputs(item?: Item)}
	{#if fields === 'extra'}
		<select
			class="select w-full sm:w-36"
			name="kind"
			aria-label="Paid"
			value={item?.kind ?? 'per_day'}
		>
			<option value="per_day">Per day</option>
			<option value="per_week">Per payslip</option>
		</select>
		<input
			class="input w-full tabular-nums sm:w-40"
			name="defaultAmount"
			inputmode="decimal"
			autocomplete="off"
			placeholder="Default amount"
			aria-label="Default amount (optional)"
			value={item?.defaultAmount ?? ''}
		/>
	{:else if fields === 'multiplier'}
		<input
			class="input w-full tabular-nums sm:w-40"
			name="multiplier"
			inputmode="decimal"
			autocomplete="off"
			placeholder="Multiplier, e.g. 1.5"
			aria-label="Multiplier"
			value={item?.multiplier ? Number(item.multiplier) : ''}
			required
		/>
	{/if}
{/snippet}

<form
	method="post"
	action="?/add"
	class="mb-5 flex flex-col gap-2 sm:flex-row"
	use:enhance={feedback(setPending)}
>
	<input type="hidden" name="list" value={list} />
	<input
		class="input w-full sm:flex-1"
		name="name"
		autocomplete="off"
		placeholder="New {singular} name"
		aria-label="New {singular} name"
		maxlength="60"
		required
	/>
	{@render extraInputs()}
	<Button disabled={pending}><Plus size={16} aria-hidden="true" /> Add</Button>
</form>

{#if items.length === 0}
	<EmptyState
		icon={Layers}
		title="Nothing here yet"
		hint="Add one above, or add a template's items from the General tab."
	/>
{:else}
	<ul class="flex flex-col gap-1">
		{#each items as item, i (item.id)}
			<li>
				{#if editing === item.id}
					<form
						method="post"
						action="?/update"
						class="flex flex-col gap-2 rounded-2xl border border-base-300/70 p-3"
						use:enhance={feedback(setPending, () => (editing = null))}
					>
						<input type="hidden" name="list" value={list} />
						<input type="hidden" name="id" value={item.id} />
						<div class="flex flex-col gap-2 sm:flex-row">
							<input
								class="input w-full sm:flex-1"
								name="name"
								autocomplete="off"
								aria-label="Name"
								maxlength="60"
								value={item.name}
								required
							/>
							{@render extraInputs(item)}
						</div>
						<div class="flex flex-wrap justify-end gap-2">
							<Button type="button" variant="secondary" onclick={() => (editing = null)}>
								Cancel
							</Button>
							<Button loading={pending}>Save</Button>
						</div>
					</form>
				{:else}
					<div class="-mx-2 flex items-center gap-1 rounded-2xl p-2 hover:bg-base-200/60">
						<div class="min-w-0 flex-1 pl-1">
							<div class="flex items-center gap-2">
								<span
									class="truncate text-sm font-medium {isActive(item)
										? 'text-ink'
										: 'text-ink-muted'}">{item.name}</span
								>
								{#if !isActive(item)}<span class="badge badge-ghost badge-sm font-medium"
										>Hidden</span
									>{/if}
							</div>
							{#if details(item)}
								<div class="text-xs text-ink-muted tabular-nums">{details(item)}</div>
							{/if}
						</div>
						<form method="post" action="?/move" class="contents" use:enhance={feedback(setPending)}>
							<input type="hidden" name="list" value={list} />
							<input type="hidden" name="id" value={item.id} />
							<button
								class={iconButton}
								name="direction"
								value="up"
								disabled={pending || i === 0}
								aria-label="Move {item.name} up"
								title="Move up"><ArrowUp size={16} aria-hidden="true" /></button
							>
							<button
								class={iconButton}
								name="direction"
								value="down"
								disabled={pending || i === items.length - 1}
								aria-label="Move {item.name} down"
								title="Move down"><ArrowDown size={16} aria-hidden="true" /></button
							>
						</form>
						<form method="post" action="?/toggle" class="contents" use:enhance={toggle(item)}>
							<input type="hidden" name="list" value={list} />
							<input type="hidden" name="id" value={item.id} />
							<button
								class={iconButton}
								name="active"
								value={String(!isActive(item))}
								aria-label="{isActive(item) ? 'Hide' : 'Show'} {item.name}"
								title={isActive(item) ? 'Hide' : 'Show again'}
							>
								{#if isActive(item)}
									<EyeOff size={16} aria-hidden="true" />
								{:else}
									<Eye size={16} aria-hidden="true" />
								{/if}
							</button>
						</form>
						<button
							type="button"
							class={iconButton}
							aria-label="Edit {item.name}"
							title="Edit"
							onclick={() => (editing = item.id)}><Pencil size={16} aria-hidden="true" /></button
						>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
