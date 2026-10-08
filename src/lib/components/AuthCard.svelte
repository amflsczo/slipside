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
</script>

<div class="min-h-dvh bg-surface lg:grid lg:grid-cols-2 lg:gap-6 lg:p-6">
	<!-- Hero (lg+ only) -->
	<aside
		class="relative hidden overflow-hidden rounded-[2rem] p-10 text-white lg:flex lg:flex-col lg:justify-between"
		style="background: linear-gradient(145deg, var(--color-sidebar-active), var(--color-navy))"
	>
		<span class="absolute -top-24 -right-24 size-80 rounded-full bg-white/10" aria-hidden="true"
		></span>
		<span class="absolute -bottom-32 -left-20 size-96 rounded-full bg-white/10" aria-hidden="true"
		></span>

		<div class="relative flex items-center gap-2.5">
			<span class="grid size-10 place-items-center rounded-xl bg-white/15" aria-hidden="true">
				<ReceiptText size={22} />
			</span>
			<span class="text-lg font-extrabold tracking-tight">Slipside</span>
		</div>

		<div class="relative max-w-md">
			<h2 class="text-4xl leading-tight font-extrabold">Check every payslip, week by week.</h2>
			<p class="mt-3 text-base text-white/85">
				Log your hours, overtime and extras, and see when what you were paid doesn't add up.
			</p>
			<ul class="mt-8 flex flex-wrap gap-2.5">
				{#each FEATURES as feature (feature.text)}
					<li
						class="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-medium backdrop-blur-sm"
					>
						<feature.icon size={16} aria-hidden="true" />
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
				<h1 class="text-xl leading-tight font-extrabold text-ink sm:text-2xl">{title}</h1>
				<p class="mt-1 mb-6 text-sm text-ink-muted">{subtitle}</p>
				{@render children()}
			</div>
			{#if footer}<p class="mt-5 text-center text-sm text-ink-muted">{@render footer()}</p>{/if}
		</div>
	</main>
</div>
