<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Slipside</title></svelte:head>

<main class="min-h-dvh bg-base-200 px-4 py-6">
	<div class="mx-auto flex max-w-md flex-col gap-4">
		<div class="card bg-base-100 shadow-sm">
			<div class="card-body">
				<h1 class="card-title text-2xl">Hello, {data.user.name}!</h1>
				<p class="text-base-content/70">You're signed in as {data.user.email}.</p>
				<p class="text-base-content/70">The payslip tracker screens arrive in the next phases.</p>
				<form method="post" action="/logout" class="mt-2 card-actions justify-end">
					<button class="btn btn-outline btn-lg">Log out</button>
				</form>
			</div>
		</div>
	</div>
</main>
