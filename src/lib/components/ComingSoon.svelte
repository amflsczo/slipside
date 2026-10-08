<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import EmptyState from './EmptyState.svelte';
	import PageHeader from './PageHeader.svelte';

	let {
		title,
		subtitle,
		text,
		icon
	}: { title: string; subtitle: string; text: string; icon: LucideIcon } = $props();
</script>

<div class="flex flex-col gap-4">
	<PageHeader {title} {subtitle} {icon} />
	<EmptyState {icon} title="Coming in a later phase" hint={text} />
</div>
