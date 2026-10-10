<script lang="ts">
	import type { Snippet } from 'svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import Wallet from '@lucide/svelte/icons/wallet';
	import BrandMark from './BrandMark.svelte';

	let {
		title,
		subtitle,
		children,
		footer
	}: { title: string; subtitle: string; children: Snippet; footer?: Snippet } = $props();

	const FEATURES = [
		{ icon: Clock, text: 'Hours and overtime' },
		{ icon: ReceiptText, text: 'Deductions and extras' },
		{ icon: Wallet, text: 'Work expenses' }
	];

	// A sample slip for the hero. It adds up: 38 × 12.10 + 4 × 1.5 × 12.10 − 84.20 − 15.97.
	const SAMPLE = {
		earnings: [
			{ name: 'Regular pay', detail: '38 hrs × 12.10', amount: '459.80' },
			{ name: 'Overtime', detail: '4 hrs × 1.5', amount: '72.60' }
		],
		gross: '532.40',
		deductions: [
			{ name: 'Income tax', amount: '84.20' },
			{ name: 'Pension', amount: '15.97' }
		],
		net: '432.23'
	};
</script>

<div class="min-h-dvh bg-surface lg:grid lg:grid-cols-2 lg:gap-6 lg:p-6">
	<!-- Hero (lg+ only). Fixed colours: it looks the same in light and dark mode. -->
	<aside
		class="relative hidden overflow-hidden rounded-[2rem] p-10 text-white lg:flex lg:flex-col lg:justify-between"
		style="background: linear-gradient(160deg, #1f6b4f, #16201b 75%)"
	>
		<div class="relative flex items-center gap-2.5">
			<span class="grid size-10 place-items-center rounded-xl bg-white/15" aria-hidden="true">
				<ReceiptText size={22} />
			</span>
			<span class="font-display text-2xl font-semibold">Slipside</span>
		</div>

		<!-- Decorative: a printed payslip, slightly askew. -->
		<div class="relative mx-auto my-8 w-full max-w-xs -rotate-3" aria-hidden="true">
			<div class="drop-shadow-[0_24px_30px_rgb(0_0_0/0.35)]">
				<div
					class="rounded-t-2xl px-6 pt-5 pb-9 font-mono text-xs text-[#16201b] slip-edge"
					style="background: #fffdf8"
				>
					<div class="flex justify-between text-2xs tracking-[0.2em] uppercase">
						<span class="font-semibold">Payslip</span><span class="text-[#5f5b52]">Wk 42</span>
					</div>
					<div class="my-3 border-t border-dashed border-[#16201b]/25"></div>
					{#each SAMPLE.earnings as row (row.name)}
						<div class="flex items-baseline gap-2 py-0.5">
							<span>{row.name}</span><span class="leader" style="border-color: rgb(22 32 27 / 0.3)"
							></span><span>{row.amount}</span>
						</div>
						<div class="text-2xs text-[#5f5b52]">{row.detail}</div>
					{/each}
					<div class="mt-2 flex justify-between border-t border-[#16201b]/25 pt-1.5 font-semibold">
						<span>Gross</span><span>{SAMPLE.gross}</span>
					</div>
					{#each SAMPLE.deductions as row (row.name)}
						<div class="flex items-baseline gap-2 py-0.5 text-[#a4452c]">
							<span>{row.name}</span><span class="leader" style="border-color: rgb(22 32 27 / 0.3)"
							></span><span>−{row.amount}</span>
						</div>
					{/each}
					<div
						class="mt-2 flex justify-between border-t border-b-[3px] border-double border-[#16201b]/50 py-1.5 text-sm font-bold"
					>
						<span>Net pay</span><span>{SAMPLE.net}</span>
					</div>
				</div>
			</div>
			<span
				class="absolute -top-3 -right-4 rotate-6 rounded-full bg-[#5fb48d] px-3 py-1 font-sans text-xs font-bold text-[#0b1d14] shadow-lg"
				>✓ Adds up</span
			>
		</div>

		<div class="relative max-w-md">
			<h2 class="font-display text-4xl leading-tight font-semibold">
				Check every payslip, week by week.
			</h2>
			<p class="mt-3 text-base text-white/80">
				Log your hours, overtime and extras, and see when what you were paid doesn't add up.
			</p>
			<ul class="mt-6 flex flex-wrap gap-2">
				{#each FEATURES as feature (feature.text)}
					<li
						class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium"
					>
						<feature.icon size={15} aria-hidden="true" />
						{feature.text}
					</li>
				{/each}
			</ul>
		</div>
	</aside>

	<main id="main-content" class="flex min-h-dvh items-center justify-center px-4 py-10 lg:min-h-0">
		<div class="w-full max-w-sm">
			<div class="mb-6 flex justify-center lg:hidden"><BrandMark /></div>
			<div class="form-surface rounded-3xl bg-card p-6 shadow-soft sm:p-8">
				<h1 class="font-display text-2xl leading-tight font-semibold text-ink sm:text-3xl">
					{title}
				</h1>
				<p class="mt-1 mb-6 text-sm text-ink-muted">{subtitle}</p>
				{@render children()}
			</div>
			{#if footer}<p class="mt-5 text-center text-sm text-ink-muted">{@render footer()}</p>{/if}
		</div>
	</main>
</div>
