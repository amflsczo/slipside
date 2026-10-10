<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
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

	// Plain text with **bold** for the words people tap or read on screen.
	type Guide = {
		id: string;
		title: string;
		icon: LucideIcon;
		/** Numbered steps, or bullet points when `bullets` is set. */
		steps: string[];
		bullets?: boolean;
		note?: string;
	};

	const GUIDES: Guide[] = [
		{
			id: 'start',
			title: 'Get started',
			icon: Rocket,
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
			bullets: true,
			steps: [
				'**‹** and **›** open the previous and next payslip.',
				'If there’s a gap between payslips, the arrows open a new payslip that fills it.',
				'**Go to latest** opens the next payslip to fill in.'
			]
		},
		{
			id: 'edit',
			title: 'Edit or delete a payslip',
			icon: Pencil,
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
			steps: [
				'Go to **Settings** and open **Deductions**, **Extras**, **OT rates** or **Categories**.',
				'Type a name and tap **Add**.',
				'Use the arrows to reorder, the pencil to rename and the eye to hide.'
			],
			note: 'Hidden items stop appearing on new payslips. Past payslips keep them. To add a country’s common items, use **Add items from a template** on the General tab.'
		}
	];

	const RULES = [
		'A payslip covers **1 to 62 days**, first and last day included.',
		'Payslips **can’t overlap**. Each day belongs to one payslip at most.',
		'A payslip **can’t start after today**. It can end after today, so you can fill in the current period as you go.',
		'A new payslip starts **the day after your last one**, for your usual length. You can change its dates.',
		'Changing **How often are you usually paid?** only changes the dates suggested for new payslips.',
		'**Saved payslips don’t change** when you edit Settings. Renaming or hiding an item, or changing your currency, only affects new payslips.',
		'Each payslip keeps **the currency it was saved in**. Amounts are never converted between currencies.',
		'**Deleting a payslip is permanent.**'
	];

	const DATA = [
		'Your payslips and settings are saved to your account when you tap **Save**.',
		'**Unsaved changes are kept on this device only**, so a reload doesn’t lose them. Save to see them on your other devices.',
		'On a shared device, **log out** when you’re done (account menu → **Log out**).',
		'Light or dark theme is set **per device**.'
	];

	const FAQ = [
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
		{
			q: 'Where are History and Expenses?',
			a: 'They’re coming in a later update.'
		}
	];

	/** "**Save**" → <strong>Save</strong>. The text is escaped first, so only that markup gets through. */
	const rich = (text: string) =>
		text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>');

	const signedIn = $derived(!!page.data.user);
</script>

{#snippet card(id: string, title: string, Icon: LucideIcon, body: Snippet)}
	<section {id} class="scroll-mt-20 rounded-3xl bg-card p-4 shadow-soft sm:p-6">
		<h2 class="mb-3 flex items-center gap-2.5 font-display text-lg font-semibold text-ink">
			<span
				class="grid size-8 shrink-0 place-items-center rounded-xl bg-sidebar-active/12 text-sidebar-active"
				aria-hidden="true"
			>
				<Icon size={17} />
			</span>
			{title}
		</h2>
		{@render body()}
	</section>
{/snippet}

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
		subtitle="Short guides to using Slipside, and the rules it follows."
		icon={CircleHelp}
	/>

	<nav aria-label="On this page" class="flex flex-wrap gap-2">
		{#each [...GUIDES.map( (g) => [g.id, g.title] ), ['rules', 'Rules'], ['data', 'Your data'], ['faq', 'Quick answers']] as [id, title] (id)}
			<a
				href="#{id}"
				class="rounded-full border border-base-300 bg-card px-3.5 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-sidebar-active hover:text-sidebar-active"
				>{title}</a
			>
		{/each}
	</nav>

	<div class="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
		{#each GUIDES as guide (guide.id)}
			{#snippet body()}
				{#if guide.bullets}
					<ul class="flex flex-col gap-2 text-sm text-ink-muted">
						{#each guide.steps as step, i (i)}
							<li class="flex gap-2.5">
								<span
									class="mt-1.5 size-1.5 shrink-0 rounded-full bg-sidebar-active"
									aria-hidden="true"
								></span>
								<span>{@html rich(step)}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<ol class="flex flex-col gap-2.5 text-sm text-ink-muted">
						{#each guide.steps as step, i (i)}
							<li class="flex gap-2.5">
								<span
									class="grid size-5.5 shrink-0 place-items-center rounded-full bg-sidebar-active/12 font-mono text-[0.7rem] font-semibold text-sidebar-active"
									aria-hidden="true">{i + 1}</span
								>
								<span class="pt-px">{@html rich(step)}</span>
							</li>
						{/each}
					</ol>
				{/if}
				{#if guide.note}
					<p class="mt-3 rounded-2xl bg-base-200/70 px-3.5 py-2.5 text-xs text-ink-muted">
						{@html rich(guide.note)}
					</p>
				{/if}
			{/snippet}
			{@render card(guide.id, guide.title, guide.icon, body)}
		{/each}
	</div>

	<div class="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
		{#snippet rules()}
			<ul class="flex flex-col gap-2 text-sm text-ink-muted">
				{#each RULES as rule, i (i)}
					<li class="flex gap-2.5">
						<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-sidebar-active" aria-hidden="true"
						></span>
						<span>{@html rich(rule)}</span>
					</li>
				{/each}
			</ul>
		{/snippet}
		{@render card('rules', 'Rules', Scale, rules)}

		{#snippet data()}
			<ul class="flex flex-col gap-2 text-sm text-ink-muted">
				{#each DATA as item, i (i)}
					<li class="flex gap-2.5">
						<span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-sidebar-active" aria-hidden="true"
						></span>
						<span>{@html rich(item)}</span>
					</li>
				{/each}
			</ul>
		{/snippet}
		{@render card('data', 'Your data', ShieldCheck, data)}
	</div>

	{#snippet faq()}
		<div class="divide-y divide-base-300/70">
			{#each FAQ as item, i (i)}
				<details class="group py-1">
					<summary
						class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden"
					>
						{item.q}
						<ChevronDown
							size={16}
							class="shrink-0 text-ink-muted transition-transform duration-150 group-open:rotate-180"
							aria-hidden="true"
						/>
					</summary>
					<p class="pb-3 text-sm text-ink-muted">{@html rich(item.a)}</p>
				</details>
			{/each}
		</div>
	{/snippet}
	{@render card('faq', 'Quick answers', CircleHelp, faq)}
</svelte:element>
