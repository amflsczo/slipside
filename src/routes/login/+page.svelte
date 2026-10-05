<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let pending = $state(false);
</script>

<svelte:head><title>Log in · Slipside</title></svelte:head>

<AuthCard title="Log in">
	<form
		method="post"
		class="flex flex-col gap-3"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update({ reset: false });
				pending = false;
			};
		}}
	>
		<label class="floating-label">
			<span>Email</span>
			<input
				class="input w-full input-lg"
				type="email"
				name="email"
				autocomplete="email"
				placeholder="Email"
				value={form?.email ?? ''}
				required
			/>
		</label>
		<label class="floating-label">
			<span>Password</span>
			<input
				class="input w-full input-lg"
				type="password"
				name="password"
				autocomplete="current-password"
				placeholder="Password"
				required
			/>
		</label>

		{#if form?.message}
			<div role="alert" class="alert alert-soft alert-error">{form.message}</div>
		{/if}

		<button class="btn btn-lg btn-primary" disabled={pending}>
			{#if pending}<span class="loading loading-spinner"></span>{/if}
			Log in
		</button>
	</form>

	<p class="text-center text-sm">
		No account? <a class="link link-primary" href="/register{page.url.search}">Create one</a>
	</p>
</AuthCard>
