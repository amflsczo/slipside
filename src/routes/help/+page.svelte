<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import Gauge from '@lucide/svelte/icons/gauge';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Pencil from '@lucide/svelte/icons/pencil';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Scale from '@lucide/svelte/icons/scale';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { cn } from '#lib/utils.ts';

	// One topic shows at a time. Text uses **bold** for the words people tap or read on screen.
	type Topic = {
		id: string;
		title: string;
		icon: LucideIcon;
		group: 'Guides' | 'Reference';
		/** One line under the title. */
		summary: string;
		/** Numbered steps (guides) or bullet points (reference). */
		steps?: string[];
		bullets?: string[];
		note?: string;
		/** Questions and answers, shown as tap-to-open rows. */
		faq?: { q: string; a: string }[];
	};

	const TOPICS: Topic[] = [
		{
			id: 'start',
			title: 'Get started',
			icon: Rocket,
			group: 'Guides',
			summary: 'Set up once, then enter your first payslip.',
			steps: [
				'Create an account and log in.',
				'In **Settings**, pick a template (or **Blank**), your currency and how often you’re usually paid. Tap **Save and continue**.',
				'Open **Payslip**, enter your payslip and tap **Save payslip**.'
			]
		},
		{
			id: 'enter',
			title: 'Enter a payslip',
			icon: ReceiptText,
			group: 'Guides',
			summary: 'Copy the numbers from your payslip and see where your pay comes from.',
			steps: [
				'**Net pay**: type the take-home amount from your payslip.',
				'**Deductions**: type each deduction on your payslip. Leave blank any you didn’t have.',
				'**Hours**: type your regular hours for each day.',
				'**Overtime**: type the hours at each overtime rate.',
				'**Extras**: fill in allowances and bonuses. Tick **Paid this payslip** for extras paid once per payslip.',
				'Check the breakdown. It updates as you type.',
				'Tap **Save payslip**.'
			],
			note: 'The breakdown appears once net pay is entered. **Adds back to the net pay on your payslip** means the numbers match.'
		},
		{
			id: 'dates',
			title: 'Change a payslip’s dates',
			icon: CalendarRange,
			group: 'Guides',
			summary: 'For a one-day job, a short week or a longer period.',
			steps: [
				'Tap the dates at the top of the payslip.',
				'Pick **Just today**, **1 week**, **2 weeks** or **1 month**, or set **Start** and **End** yourself.',
				'Tap **Apply**, then **Save payslip**.'
			],
			note: 'If days with hours fall outside the new dates, you’re asked before they’re removed.'
		},
		{
			id: 'move',
			title: 'Move between payslips',
			icon: ArrowLeftRight,
			group: 'Guides',
			summary: 'Open earlier payslips, or fill in one you missed.',
			steps: [
				'Tap **‹** or **›** next to the dates to open the previous or next payslip.',
				'If there’s a gap between payslips, the arrows open a new payslip that fills it.',
				'Tap **Go to latest** to get back to the next payslip to fill in.'
			]
		},
		{
			id: 'edit',
			title: 'Edit or delete a payslip',
			icon: Pencil,
			group: 'Guides',
			summary: 'Fix a mistake, or remove a payslip.',
			steps: [
				'Open the payslip with the arrows.',
				'Change anything, then tap **Update payslip**.',
				'To remove it, tap **Delete** and confirm.'
			],
			note: 'Deleting can’t be undone.'
		},
		{
			id: 'rate',
			title: 'Spot pay problems',
			icon: Gauge,
			group: 'Guides',
			summary: 'Get a warning when a payslip’s hourly rate looks wrong.',
			steps: [
				'Go to **Settings** → **General** and enter your **Usual hourly rate**.',
				'Set how far off a payslip can be before it’s flagged (2% to start with).',
				'Each payslip now shows whether its rate is in line with your usual rate, or how far above or below it is.'
			]
		},
		{
			id: 'lists',
			title: 'Set up your lists',
			icon: ListChecks,
			group: 'Guides',
			summary: 'Choose the deductions, extras and overtime rates on your payslips.',
			steps: [
				'Go to **Settings** and open **Deductions**, **Extras**, **OT rates** or **Categories**.',
				'Type a name and tap **Add**.',
				'Use the arrows to reorder, the pencil to rename and the eye to hide.'
			],
			note: 'Hidden items stop appearing on new payslips. Past payslips keep them. To add a country’s common items, use **Add items from a template** on the General tab.'
		},
		{
			id: 'rules',
			title: 'Rules',
			icon: Scale,
			group: 'Reference',
			summary: 'What Slipside allows, and what it never changes.',
			bullets: [
				'A payslip covers **1 to 62 days**, first and last day included.',
				'Payslips **can’t overlap**. Each day belongs to one payslip at most.',
				'A payslip **can’t start after today**. It can end after today, so you can fill in the current period as you go.',
				'A new payslip starts **the day after your last one**, for your usual length. You can change its dates.',
				'Changing **How often are you usually paid?** only changes the dates suggested for new payslips.',
				'**Saved payslips don’t change** when you edit Settings. Renaming or hiding an item, or changing your currency, only affects new payslips.',
				'Each payslip keeps **the currency it was saved in**. Amounts are never converted between currencies.',
				'**Deleting a payslip is permanent.**'
			]
		},
		{
			id: 'data',
			title: 'Your data',
			icon: ShieldCheck,
			group: 'Reference',
			summary: 'Where your entries are kept.',
			bullets: [
				'Your payslips and settings are saved to your account when you tap **Save**.',
				'**Unsaved changes are kept on this device only**, so a reload doesn’t lose them. Save to see them on your other devices.',
				'On a shared device, **log out** when you’re done (account menu → **Log out**).',
				'Light or dark theme is set **per device**.'
			]
		},
		{
			id: 'faq',
			title: 'Quick answers',
			icon: CircleHelp,
			group: 'Reference',
			summary: 'Tap a question to see the answer.',
			faq: [
				{
					q: 'The breakdown is empty.',
					a: 'Enter your net pay. If it’s still empty, fix the fields marked in red.'
				},
				{
					q: '“These dates overlap your … payslip.”',
					a: 'Pick dates that don’t include days from that payslip, or open that payslip and change its dates first.'
				},
				{
					q: '“Restored your unsaved changes.”',
					a: 'Changes you didn’t save on this device came back. Tap **Save payslip** to keep them, or **Discard** to drop them.'
				},
				{
					q: 'My rate is flagged.',
					a: 'Check your hours and overtime first, then your payslip. A low rate often means missing hours or overtime.'
				},
				{
					q: 'No hourly rate shows.',
					a: 'Enter your hours. If your extras add up to more than your gross pay, check them for a typo.'
				},
				{
					q: 'An item is missing from my payslip.',
					a: 'It may be hidden. Go to **Settings**, find it and tap the eye to show it again.'
				},
				{
					q: 'I was paid for just one day.',
					a: 'Tap the dates at the top of the payslip and choose **Just today**.'
				},
				{ q: 'Where are History and Expenses?', a: 'They’re coming in a later update.' }
			]
		}
	];

	const GROUPS = ['Guides', 'Reference'] as const;
	const guides = TOPICS.filter((t) => t.group === 'Guides');

	/** "**Save**" → <strong>Save</strong>. The text is escaped first, so only that markup gets through. */
	const rich = (text: string) =>
		text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>');

	const signedIn = $derived(!!page.data.user);
	const uid = $props.id();

	// The open topic lives in the URL hash (/help#dates), so a link can open a topic directly.
	let current = $state('start');
	const topic = $derived(TOPICS.find((t) => t.id === current) ?? TOPICS[0]!);
	const guideIndex = $derived(guides.findIndex((g) => g.id === topic.id));
	let panel: HTMLElement;

	const fromHash = () => {
		const id = location.hash.slice(1);
		if (TOPICS.some((t) => t.id === id)) current = id;
	};
	onMount(() => {
		fromHash();
		addEventListener('hashchange', fromHash);
		return () => removeEventListener('hashchange', fromHash);
	});

	async function open(id: string, { focusPanel = false } = {}) {
		current = id;
		history.replaceState(history.state, '', `#${id}`);
		await tick();
		document
			.getElementById(`${uid}-tab-${id}`)
			?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		if (focusPanel) {
			panel.focus({ preventScroll: true });
			// On phones the panel is below the tabs: bring its top into view.
			if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
		}
	}

	/** Arrow keys move between topics, as in any tab list. */
	function onKeydown(event: KeyboardEvent) {
		const keys: Record<string, number> = {
			ArrowDown: 1,
			ArrowRight: 1,
			ArrowUp: -1,
			ArrowLeft: -1
		};
		let index = TOPICS.findIndex((t) => t.id === current);
		if (event.key in keys) index = (index + keys[event.key]! + TOPICS.length) % TOPICS.length;
		else if (event.key === 'Home') index = 0;
		else if (event.key === 'End') index = TOPICS.length - 1;
		else return;
		event.preventDefault();
		const next = TOPICS[index]!.id;
		open(next).then(() => document.getElementById(`${uid}-tab-${next}`)?.focus());
	}
</script>

<!-- Signed in, this sits inside the shell's <main>; signed out it is the page's own <main>. -->
<svelte:element
	this={signedIn ? 'div' : 'main'}
	id={signedIn ? undefined : 'main-content'}
	class="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5 {signedIn ? '' : 'px-4 py-8'}"
>
	{#if !signedIn}
		<div class="flex items-center justify-between gap-3">
			<a href="/login" aria-label="Slipside: log in"><BrandMark /></a>
			<Button href="/login" variant="secondary" size="sm">Log in</Button>
		</div>
	{/if}

	<PageHeader
		title="Help"
		subtitle="Pick a topic. Each guide is a few short steps."
		icon={CircleHelp}
	/>

	<div class="grid gap-4 sm:gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
		<!-- Phones and tablets: the phone's own picker, grouped like the list. -->
		<div class="form-surface flex flex-col gap-1.5 lg:hidden">
			<label for="{uid}-topic" class="text-xs font-medium text-ink">Topic</label>
			<select
				id="{uid}-topic"
				class="select w-full"
				value={topic.id}
				onchange={(e) => open(e.currentTarget.value)}
			>
				{#each GROUPS as group (group)}
					<optgroup label={group}>
						{#each TOPICS.filter((t) => t.group === group) as t (t.id)}
							<option value={t.id}>{t.title}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</div>

		<!-- lg+: a grouped list of topics beside the guide. -->
		<div
			role="tablist"
			aria-label="Help topics"
			tabindex="-1"
			onkeydown={onKeydown}
			class="sticky top-6 hidden flex-col gap-1 rounded-3xl bg-card p-3 shadow-soft lg:flex"
		>
			{#each GROUPS as group (group)}
				<p
					class="px-3 pt-2 pb-1 font-mono text-2xs font-medium tracking-widest text-ink-muted uppercase first:pt-1"
					aria-hidden="true"
				>
					{group}
				</p>
				{#each TOPICS.filter((t) => t.group === group) as t (t.id)}
					{@const selected = t.id === topic.id}
					<button
						type="button"
						role="tab"
						id="{uid}-tab-{t.id}"
						aria-selected={selected}
						aria-controls="{uid}-panel"
						tabindex={selected ? 0 : -1}
						onclick={() => open(t.id, { focusPanel: true })}
						class={cn(
							'flex min-h-10 items-center gap-2.5 rounded-2xl px-3 text-left text-sm font-medium transition-colors duration-150',
							selected
								? 'bg-sidebar-active/10 font-semibold text-sidebar-active'
								: 'text-ink hover:bg-base-200'
						)}
					>
						<t.icon size={16} class="shrink-0" aria-hidden="true" />
						{t.title}
					</button>
				{/each}
			{/each}
		</div>

		<div
			bind:this={panel}
			id="{uid}-panel"
			role="tabpanel"
			aria-labelledby="{uid}-tab-{topic.id}"
			tabindex="-1"
			class="scroll-mt-20 rounded-3xl bg-card p-5 shadow-soft focus:outline-none sm:p-7"
		>
			<header class="mb-5 flex items-start gap-3 border-b border-dashed border-rule pb-4">
				<span
					class="grid size-11 shrink-0 place-items-center rounded-2xl bg-sidebar-active/12 text-sidebar-active"
					aria-hidden="true"
				>
					<topic.icon size={22} />
				</span>
				<div class="min-w-0">
					{#if guideIndex >= 0}
						<p class="font-mono text-2xs font-medium tracking-wider text-ink-muted uppercase">
							Guide {guideIndex + 1} of {guides.length}
						</p>
					{/if}
					<h2 class="font-display text-xl leading-tight font-semibold text-ink sm:text-2xl">
						{topic.title}
					</h2>
					<p class="mt-1 text-sm text-ink-muted">{topic.summary}</p>
				</div>
			</header>

			{#if topic.steps}
				<ol class="flex flex-col gap-3.5">
					{#each topic.steps as step, i (i)}
						<li class="flex gap-3 text-sm leading-relaxed text-ink-muted">
							<span
								class="grid size-7 shrink-0 place-items-center rounded-full bg-sidebar-active text-xs font-bold text-sidebar-active-ink"
								aria-hidden="true">{i + 1}</span
							>
							<span class="pt-0.5">{@html rich(step)}</span>
						</li>
					{/each}
				</ol>
			{/if}

			{#if topic.bullets}
				<ul class="flex flex-col gap-3">
					{#each topic.bullets as item, i (i)}
						<li class="flex gap-3 text-sm leading-relaxed text-ink-muted">
							<span
								class="mt-2.5 size-1.5 shrink-0 rounded-full bg-sidebar-active"
								aria-hidden="true"
							></span>
							<span>{@html rich(item)}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if topic.faq}
				<div class="divide-y divide-base-300/70">
					{#each topic.faq as item, i (i)}
						<details class="group">
							<summary
								class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden"
							>
								{item.q}
								<ChevronDown
									size={18}
									class="shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180"
									aria-hidden="true"
								/>
							</summary>
							<p class="pb-4 text-sm leading-relaxed text-ink-muted">{@html rich(item.a)}</p>
						</details>
					{/each}
				</div>
			{/if}

			{#if topic.note}
				<p class="mt-5 rounded-2xl bg-base-200/70 px-4 py-3 text-sm leading-relaxed text-ink-muted">
					{@html rich(topic.note)}
				</p>
			{/if}

			<!-- Guides read in order: previous / next, like turning pages. -->
			{#if guideIndex >= 0}
				{@const prev = guides[guideIndex - 1]}
				{@const next = guides[guideIndex + 1]}
				<nav
					aria-label="More guides"
					class="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-rule pt-4"
				>
					{#if prev}
						<button
							type="button"
							class="flex min-h-10 items-center gap-1 rounded-full px-2 text-sm font-medium text-ink-muted hover:text-ink"
							aria-label="Previous: {prev.title}"
							onclick={() => open(prev.id, { focusPanel: true })}
						>
							<ChevronLeft size={16} aria-hidden="true" />
							<span class="max-sm:hidden">{prev.title}</span>
							<span class="sm:hidden">Previous</span>
						</button>
					{:else}
						<span></span>
					{/if}
					{#if next}
						<Button
							type="button"
							variant="accent"
							aria-label="Next: {next.title}"
							onclick={() => open(next.id, { focusPanel: true })}
						>
							<span>Next<span class="max-sm:hidden">: {next.title}</span></span>
							<ChevronRight size={16} aria-hidden="true" />
						</Button>
					{/if}
				</nav>
			{/if}
		</div>
	</div>
</svelte:element>
