<script lang="ts">
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children: Snippet } = $props();
</script>

<main class="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-8">
	<div class="card w-full max-w-sm bg-base-100 shadow-md">
		<div class="card-body gap-4">
			<h1 class="card-title text-2xl">{title}</h1>
			{@render children()}
		</div>
	</div>
</main>
