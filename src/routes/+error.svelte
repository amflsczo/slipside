<script lang="ts">
	import { page } from '$app/state';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import FileQuestion from '@lucide/svelte/icons/file-question';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';

	const notFound = $derived(page.status === 404);
</script>

<!-- Signed in, this sits inside the shell's <main>; signed out it is the page's own <main>. -->
<svelte:element
	this={page.data.user ? 'div' : 'main'}
	id={page.data.user ? undefined : 'main-content'}
	class="mx-auto flex w-full max-w-3xl flex-col gap-4 {page.data.user ? 'pt-6' : 'px-4 py-16'}"
>
	{#if notFound}
		<EmptyState
			level={1}
			icon={FileQuestion}
			title="Page not found"
			hint="That page doesn't exist. The link may be old or mistyped."
		>
			{#snippet action()}<Button href="/">Go home</Button>{/snippet}
		</EmptyState>
	{:else}
		<EmptyState
			level={1}
			icon={CloudOff}
			title="We couldn't load this just now"
			hint="The connection may have dropped or the server is waking up. Your data is safe."
		>
			{#snippet action()}
				<Button onclick={() => location.reload()}>Try again</Button>
			{/snippet}
		</EmptyState>
	{/if}
</svelte:element>
