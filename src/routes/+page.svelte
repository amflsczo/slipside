<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { clock, firstName, greeting, longDay } from '#lib/greeting.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-4">
	<PageHeader
		eyebrow={longDay(clock.now)}
		title="{greeting(clock.now)}, {firstName(data.user?.name ?? '')}"
		subtitle="Here's how this week's hours and pay are shaping up."
		icon={CalendarDays}
	/>
	<EmptyState
		icon={CalendarDays}
		title="The This Week screen is coming soon"
		hint="For now, set up your currency and lists in Settings."
	>
		{#snippet action()}<Button href="/settings">Go to Settings</Button>{/snippet}
	</EmptyState>
</div>
