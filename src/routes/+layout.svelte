<script lang="ts">
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

	const active = (href: string) => isActive(href, page.url.pathname);
	const groups = [
		{ id: 'main', label: null },
		{ id: 'more', label: 'More' }
	] as const;

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

<svelte:window bind:scrollY />

<a
	href="#main-content"
	class="sr-only rounded-lg bg-card px-4 py-2 text-sm font-medium text-ink shadow-soft focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60"
	>Skip to content</a
>

{#if data.user}
	<div class="flex min-h-dvh bg-surface">
		<!-- Side nav (lg+): a floating panel, collapsible to icons only. -->
		<aside
			class={cn(
				'sticky top-3 my-3 ml-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col rounded-3xl bg-sidebar p-3 shadow-soft transition-[width] duration-200 lg:flex print:hidden!',
				collapsed ? 'w-21' : 'w-66'
			)}
		>
			<a
				href="/"
				class={cn('mb-4 flex min-h-10 items-center', collapsed ? 'justify-center' : 'px-2')}
			>
				<BrandMark showName={!collapsed} />
				{#if collapsed}<span class="sr-only">Slipside home</span>{/if}
			</a>

			<div
				class={cn(
					'mb-4 flex items-center gap-3 rounded-2xl bg-sidebar-hover/60',
					collapsed ? 'justify-center p-2' : 'p-3'
				)}
			>
				<Avatar name={data.user.name} />
				{#if !collapsed}
					<div class="min-w-0">
						<p class="text-xs text-sidebar-muted">{greeting(clock.now)},</p>
						<p class="truncate text-sm font-semibold text-sidebar-ink">{data.user.name}</p>
					</div>
				{/if}
			</div>

			<nav aria-label="Primary" class="flex flex-1 flex-col gap-1 overflow-y-auto">
				{#each groups as group (group.id)}
					{#if group.label}
						{#if collapsed}
							<div class="mx-3 my-2 border-t border-sidebar-border" role="none"></div>
						{:else}
							<p
								class="mt-4 mb-1 px-3 text-[0.7rem] font-semibold tracking-wider text-sidebar-muted uppercase"
							>
								{group.label}
							</p>
						{/if}
					{/if}
					{#each NAV.filter((item) => item.group === group.id) as item (item.href)}
						{@const current = active(item.href)}
						<a
							href={item.href}
							title={collapsed ? item.label : undefined}
							aria-current={current ? 'page' : undefined}
							class={cn(
								'relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150',
								collapsed && 'justify-center',
								current
									? 'bg-sidebar-active/10 font-semibold text-sidebar-active before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-sidebar-active'
									: 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink'
							)}
						>
							<item.icon size={18} strokeWidth={current ? 2.4 : 2} aria-hidden="true" />
							<span class={collapsed ? 'sr-only' : ''}>{item.label}</span>
						</a>
					{/each}
				{/each}
			</nav>

			<button
				type="button"
				class={cn(
					'mt-2 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink',
					collapsed && 'justify-center'
				)}
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				onclick={toggleCollapsed}
			>
				{#if collapsed}
					<PanelLeftOpen size={18} aria-hidden="true" />
				{:else}
					<PanelLeftClose size={18} aria-hidden="true" /> Collapse
				{/if}
			</button>
		</aside>

		<div class="flex min-w-0 flex-1 flex-col">
			<header
				class={cn(
					'sticky top-0 z-30 pt-safe transition-[background-color,box-shadow] duration-200 print:hidden!',
					scrollY > 4 && 'bg-surface/80 shadow-[0_1px_0_rgb(16_24_40/0.06)] backdrop-blur-md'
				)}
			>
				<div class="flex h-16 items-center gap-3 px-4 lg:px-8">
					<a href="/" class="lg:hidden" aria-label="Slipside home"><BrandMark /></a>
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
				class="flex-1 px-4 pt-2 pb-28 focus:outline-none lg:px-8 lg:pb-10 print:p-0!"
			>
				{@render children()}
			</main>
		</div>
	</div>

	<!-- Bottom nav (< lg): floating above the home indicator. -->
	<nav
		aria-label="Primary"
		class="fixed inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-30 mx-auto grid max-w-lg grid-cols-4 gap-1 rounded-2xl border border-base-300/70 bg-card/92 p-1.5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-lg lg:hidden print:hidden!"
	>
		{#each NAV.filter((item) => item.primary) as item (item.href)}
			{@const current = active(item.href)}
			<a
				href={item.href}
				aria-current={current ? 'page' : undefined}
				class={cn(
					'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.66rem] font-semibold transition-colors duration-150',
					current ? 'bg-sidebar-active/10 text-sidebar-active' : 'text-ink-muted hover:text-ink'
				)}
			>
				<item.icon size={20} strokeWidth={current ? 2.5 : 2} aria-hidden="true" />
				{item.label}
			</a>
		{/each}
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
