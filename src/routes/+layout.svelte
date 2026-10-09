<script lang="ts">
	import '@fontsource-variable/fraunces/soft.css';
	import '@fontsource-variable/jetbrains-mono';
	import '@fontsource-variable/plus-jakarta-sans';
	import './layout.css';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Info from '@lucide/svelte/icons/info';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import Sun from '@lucide/svelte/icons/sun';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import AccountMenu from '#lib/components/AccountMenu.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import BrandMark from '#lib/components/BrandMark.svelte';
	import { clock, greeting } from '#lib/greeting.svelte.ts';
	import { NAV, isActive, titleFor } from '#lib/nav.ts';
	import { theme } from '#lib/theme.svelte.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { cn } from '#lib/utils.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const COLLAPSE_KEY = 'app-sidebar-collapsed';
	let collapsed = $state(false);
	let scrollY = $state(0);

	onMount(() => {
		try {
			collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
		} catch {
			// storage unavailable: start expanded
		}
		const stopClock = clock.start();
		const stopTheme = theme.init();
		return () => {
			stopClock();
			stopTheme();
		};
	});

	function toggleCollapsed() {
		collapsed = !collapsed;
		try {
			localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
		} catch {
			// storage unavailable: applies for this visit only
		}
	}

	// Phones: the top bar slides away while scrolling down and comes back on scroll up,
	// unless something in it has focus (e.g. the account menu is open).
	let topBar = $state<HTMLElement>();
	let barHidden = $state(false);
	let lastY = 0;
	function onScroll() {
		const y = window.scrollY;
		if (Math.abs(y - lastY) < 8) return;
		barHidden = y > lastY && y > 72 && !topBar?.contains(document.activeElement);
		lastY = y;
	}

	const active = (href: string) => isActive(href, page.url.pathname);
	const groups = [
		{ id: 'main', label: 'Menu' },
		{ id: 'more', label: 'More' }
	] as const;
	const dock = NAV.filter((item) => item.primary);
	const dockIndex = $derived(dock.findIndex((item) => active(item.href)));

	// Side nav: an icon rail on tablets (md); on desktops (lg+) full width unless collapsed.
	const label = $derived(collapsed ? 'sr-only' : 'max-lg:sr-only');
	const wideOnly = $derived(collapsed ? 'hidden' : 'hidden lg:block');
	const railOnly = $derived(collapsed ? '' : 'lg:hidden');
	const align = $derived(collapsed ? 'justify-center' : 'justify-center lg:justify-start');
	const sideItem =
		'group relative flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors duration-150';
	const sideIdle = 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink';

	const TOAST_STYLES = {
		success: { cls: 'alert-success', icon: CircleCheck },
		error: { cls: 'alert-error', icon: CircleAlert },
		warning: { cls: 'alert-warning', icon: TriangleAlert },
		info: { cls: 'alert-info', icon: Info }
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{titleFor(page.url.pathname, page.status, !!page.error)}</title>
</svelte:head>

<svelte:window bind:scrollY onscroll={onScroll} />

<!-- Rail tooltips: shown on hover/focus while the labels are hidden. The real label is sr-only. -->
{#snippet tip(text: string)}
	<span
		aria-hidden="true"
		class="{railOnly} pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-x-1 -translate-y-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-card opacity-0 shadow-soft transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
		>{text}</span
	>
{/snippet}

<a
	href="#main-content"
	class="sr-only rounded-lg bg-card px-4 py-2 text-sm font-medium text-ink shadow-soft focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60"
	>Skip to content</a
>

{#if data.user}
	<div class="flex min-h-dvh bg-surface">
		<!-- Side nav (md+): the dark "ledger spine". Holds nav, account and theme. -->
		<aside
			class={cn(
				'sticky top-3 z-40 my-3 ml-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col rounded-[1.75rem] bg-sidebar p-3 text-sidebar-ink ring-1 shadow-soft ring-sidebar-border transition-[width] duration-200 md:flex print:hidden! [&_:focus-visible]:outline-sidebar-ink',
				collapsed ? 'w-20' : 'w-20 lg:w-64'
			)}
		>
			<a
				href="/"
				class={cn('group relative mb-6 flex min-h-12 items-center gap-2.5 px-1.5', align)}
			>
				<BrandMark showName={false} />
				<span class="{label} font-display text-xl font-semibold">Slipside</span>
			</a>

			<nav aria-label="Primary" class="flex flex-1 flex-col gap-1">
				{#each groups as group (group.id)}
					{#if group.id !== 'main'}
						<div class="{railOnly} mx-3 my-3 border-t border-sidebar-border" role="none"></div>
					{/if}
					<p
						class="{wideOnly} mb-1 px-3 font-mono text-[0.7rem] font-medium tracking-widest text-sidebar-muted uppercase {group.id !==
						'main'
							? 'mt-5'
							: ''}"
						aria-hidden="true"
					>
						{group.label}
					</p>
					{#each NAV.filter((item) => item.group === group.id) as item (item.href)}
						{@const current = active(item.href)}
						<a
							href={item.href}
							aria-current={current ? 'page' : undefined}
							class={cn(
								sideItem,
								align,
								current ? 'bg-sidebar-ink font-semibold text-sidebar' : sideIdle
							)}
						>
							<item.icon
								size={19}
								class="shrink-0"
								strokeWidth={current ? 2.3 : 2}
								aria-hidden="true"
							/>
							<span class={label}>{item.label}</span>
							{#if current}
								<span
									class="{wideOnly} ml-auto size-1.5 rounded-full bg-sidebar-active"
									aria-hidden="true"
								></span>
							{/if}
							{@render tip(item.label)}
						</a>
					{/each}
				{/each}
			</nav>

			<!-- Footer: who's signed in, theme, log out, collapse. -->
			<div class="flex flex-col gap-1 border-t border-sidebar-border pt-3">
				<div
					class={cn(
						'mb-1 flex items-center gap-3 rounded-2xl',
						collapsed
							? 'justify-center p-1'
							: 'justify-center p-1 lg:justify-start lg:bg-sidebar-hover lg:p-2.5'
					)}
					title={data.user.name}
				>
					<Avatar name={data.user.name} />
					<div class="{wideOnly} min-w-0">
						<p class="text-xs text-sidebar-muted">{greeting(clock.now)},</p>
						<p class="truncate text-sm font-semibold">{data.user.name}</p>
					</div>
				</div>
				<button type="button" class={cn(sideItem, align, sideIdle)} onclick={theme.toggle}>
					{#if theme.resolved === 'dark'}
						<Sun size={18} class="shrink-0" aria-hidden="true" />
					{:else}
						<Moon size={18} class="shrink-0" aria-hidden="true" />
					{/if}
					<span class={label}>{theme.resolved === 'dark' ? 'Light mode' : 'Dark mode'}</span>
					{@render tip(theme.resolved === 'dark' ? 'Light mode' : 'Dark mode')}
				</button>
				<form method="post" action="/logout">
					<button class={cn(sideItem, align, sideIdle)}>
						<LogOut size={18} class="shrink-0" aria-hidden="true" />
						<span class={label}>Log out</span>
						{@render tip('Log out')}
					</button>
				</form>
				<button
					type="button"
					class={cn(sideItem, align, sideIdle, 'max-lg:hidden')}
					onclick={toggleCollapsed}
				>
					{#if collapsed}
						<PanelLeftOpen size={18} class="shrink-0" aria-hidden="true" />
					{:else}
						<PanelLeftClose size={18} class="shrink-0" aria-hidden="true" />
					{/if}
					<span class={label}>{collapsed ? 'Expand sidebar' : 'Collapse'}</span>
					{@render tip('Expand sidebar')}
				</button>
			</div>
		</aside>

		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Top bar (phones only): slides away on scroll down, frosts once scrolled. -->
			<header
				bind:this={topBar}
				class={cn(
					'sticky top-0 z-30 pt-safe transition-[translate,background-color,box-shadow] duration-300 md:hidden print:hidden!',
					scrollY > 4 && 'bg-surface/80 shadow-[0_1px_0_rgb(40_32_16/0.08)] backdrop-blur-md',
					barHidden && '-translate-y-full'
				)}
			>
				<div class="flex h-14 items-center gap-2 px-4">
					<a href="/" aria-label="Slipside home"><BrandMark /></a>
					<div class="flex-1"></div>
					<button
						type="button"
						class="grid size-10 place-items-center rounded-full bg-card text-ink shadow-soft hover:bg-base-200"
						aria-label={theme.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
						onclick={theme.toggle}
					>
						{#if theme.resolved === 'dark'}
							<Sun size={18} aria-hidden="true" />
						{:else}
							<Moon size={18} aria-hidden="true" />
						{/if}
					</button>
					<AccountMenu user={data.user} />
				</div>
			</header>

			<main
				id="main-content"
				tabindex="-1"
				class="flex-1 px-4 pt-2 pb-32 focus:outline-none sm:px-6 md:pt-6 md:pb-10 lg:px-10 lg:pt-8 print:p-0!"
			>
				<div class="mx-auto w-full max-w-[88rem]">
					<!-- A short rise on each new section; week changes (same path) don't replay it. -->
					{#key page.url.pathname}
						<div in:fly={{ y: 8, duration: prefersReducedMotion.current ? 0 : 220 }}>
							{@render children()}
						</div>
					{/key}
				</div>
			</main>
		</div>
	</div>

	<!-- Dock (phones): floats above the home indicator; the light pill slides to the current tab. -->
	<nav
		aria-label="Primary"
		class="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-[1.75rem] bg-sidebar p-1.5 shadow-[0_14px_36px_-12px_rgb(0_0_0/0.5)] ring-1 ring-sidebar-border md:hidden print:hidden! [&_:focus-visible]:outline-sidebar-ink"
	>
		<div class="relative grid" style="grid-template-columns: repeat({dock.length}, minmax(0, 1fr))">
			{#if dockIndex >= 0}
				<span
					class="absolute inset-y-0 left-0 rounded-[1.35rem] bg-sidebar-ink transition-transform duration-300 ease-[cubic-bezier(0.3,1.25,0.5,1)]"
					style="width: {100 / dock.length}%; transform: translateX({dockIndex * 100}%)"
					aria-hidden="true"
				></span>
			{/if}
			{#each dock as item (item.href)}
				{@const current = active(item.href)}
				<a
					href={item.href}
					aria-current={current ? 'page' : undefined}
					class={cn(
						'relative flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-[0.7rem] font-semibold transition-colors duration-200',
						current ? 'text-sidebar' : 'text-sidebar-muted active:text-sidebar-ink'
					)}
				>
					<item.icon size={20} strokeWidth={current ? 2.4 : 2} aria-hidden="true" />
					<span class="max-w-full truncate px-1">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
{:else}
	{@render children()}
{/if}

{#if toast.current}
	{@const style = TOAST_STYLES[toast.current.kind]}
	{#key toast.current.id}
		<div
			class="pointer-events-none fixed inset-x-0 top-[calc(1rem+env(safe-area-inset-top))] z-50 flex justify-center px-4"
			transition:fly={{ y: -16, duration: prefersReducedMotion.current ? 0 : 200 }}
		>
			<div
				role={toast.current.kind === 'error' ? 'alert' : 'status'}
				class="pointer-events-auto alert w-full max-w-sm rounded-2xl text-sm shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] {style.cls}"
			>
				<style.icon size={18} aria-hidden="true" />
				<span>{toast.current.text}</span>
				<button
					type="button"
					class="grid size-8 place-items-center rounded-full hover:bg-black/10"
					onclick={toast.dismiss}
					aria-label="Dismiss"
				>
					<X size={16} aria-hidden="true" />
				</button>
			</div>
		</div>
	{/key}
{/if}
