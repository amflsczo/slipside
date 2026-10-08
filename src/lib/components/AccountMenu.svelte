<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';
	import Avatar from './Avatar.svelte';

	let { user }: { user: { name: string; email: string } } = $props();

	let open = $state(false);
	let root: HTMLDivElement;
	const menuId = $props.id();

	function onWindowClick(event: MouseEvent) {
		if (open && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<!-- Closes on Escape, an outside click, or when focus leaves the menu. -->
<div
	bind:this={root}
	class="relative"
	role="presentation"
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) {
			open = false;
			root.querySelector<HTMLButtonElement>('button')?.focus();
		}
	}}
	onfocusout={(e) => {
		if (!root.contains(e.relatedTarget as Node | null)) open = false;
	}}
>
	<button
		type="button"
		class="flex min-h-10 items-center gap-2 rounded-full bg-card p-1 pr-2 shadow-soft hover:bg-base-200 sm:pr-3"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls={menuId}
		onclick={() => (open = !open)}
	>
		<Avatar name={user.name} class="size-8" />
		<span class="hidden max-w-40 truncate text-sm font-semibold text-ink sm:inline"
			>{user.name}</span
		>
		<span class="sr-only sm:hidden">Account menu for {user.name}</span>
		<ChevronDown size={16} class="text-ink-muted" aria-hidden="true" />
	</button>

	{#if open}
		<div
			id={menuId}
			role="menu"
			class="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-base-300/70 bg-card p-1.5 shadow-[0_16px_40px_-12px_rgb(16_24_40/0.25)]"
		>
			<div class="border-b border-base-300/70 px-2.5 pt-1.5 pb-2.5" role="none">
				<p class="truncate text-sm font-semibold text-ink">{user.name}</p>
				<p class="truncate text-xs text-ink-muted">{user.email}</p>
			</div>
			<a
				href="/settings"
				role="menuitem"
				class="mt-1 flex items-center gap-2.5 rounded-xl p-2.5 text-sm text-ink hover:bg-base-200"
				onclick={() => (open = false)}
			>
				<Settings size={16} aria-hidden="true" /> Settings
			</a>
			<form method="post" action="/logout" role="none">
				<button
					role="menuitem"
					class="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-sm text-ink hover:bg-base-200"
				>
					<LogOut size={16} aria-hidden="true" /> Log out
				</button>
			</form>
		</div>
	{/if}
</div>
