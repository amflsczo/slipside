<script lang="ts">
	import ReceiptText from '@lucide/svelte/icons/receipt-text';

	let { showName = true }: { showName?: boolean } = $props();
</script>

<span class="flex items-center gap-2.5">
	<span
		class="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-active text-sidebar-active-ink"
		aria-hidden="true"
	>
		<ReceiptText size={20} />
	</span>
	{#if showName}<span class="text-base font-extrabold tracking-tight text-ink">Slipside</span>{/if}
</span>
