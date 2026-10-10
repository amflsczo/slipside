<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let pending = $state(false);
</script>

<AuthCard title="Log in" subtitle="Welcome back. Log in to check your latest payslip.">
	<form
		method="post"
		class="flex flex-col gap-4"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update({ reset: false });
				pending = false;
			};
		}}
	>
		<Field label="Email" required>
			{#snippet children(id)}
				<input
					{id}
					class="input w-full"
					type="email"
					name="email"
					autocomplete="email"
					value={form?.email ?? ''}
					required
				/>
			{/snippet}
		</Field>
		<Field label="Password" required>
			{#snippet children(id)}
				<input
					{id}
					class="input w-full"
					type="password"
					name="password"
					autocomplete="current-password"
					required
				/>
			{/snippet}
		</Field>

		{#if form?.message}
			<div
				role="alert"
				class="flex items-start gap-3 rounded-2xl border border-error/30 bg-error/6 px-4 py-3 text-sm text-ink"
			>
				<CircleAlert size={18} class="mt-px shrink-0 text-error" aria-hidden="true" />
				{form.message}
			</div>
		{/if}

		<Button class="mt-1 w-full" loading={pending}>{pending ? 'Logging in…' : 'Log in'}</Button>
	</form>

	{#snippet footer()}
		No account? <a
			class="font-semibold text-sidebar-active hover:underline"
			href="/register{page.url.search}">Create one</a
		>
	{/snippet}
</AuthCard>
