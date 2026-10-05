<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let pending = $state(false);
</script>

<svelte:head><title>Create account · Slipside</title></svelte:head>

<AuthCard title="Create account">
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
			<span>Name</span>
			<input
				class="input w-full input-lg"
				name="name"
				autocomplete="name"
				placeholder="Name"
				value={form?.name ?? ''}
				required
			/>
		</label>
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
			<span>Password (8+ characters)</span>
			<input
				class="input w-full input-lg"
				type="password"
				name="password"
				autocomplete="new-password"
				placeholder="Password (8+ characters)"
				minlength="8"
				required
			/>
		</label>

		{#if form?.message}
			<div role="alert" class="alert alert-soft alert-error">{form.message}</div>
		{/if}

		<button class="btn btn-lg btn-primary" disabled={pending}>
			{#if pending}<span class="loading loading-spinner"></span>{/if}
			Create account
		</button>
	</form>

	<p class="text-center text-sm">
		Already have an account? <a class="link link-primary" href="/login">Log in</a>
	</p>
</AuthCard>
