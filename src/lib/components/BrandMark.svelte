<script lang="ts">
	let { showName = true }: { showName?: boolean } = $props();
</script>

<span class="flex items-center gap-2.5">
	<!-- A payslip with a torn edge; matches favicon.svg. -->
	<span
		class="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-active text-sidebar-active-ink"
		aria-hidden="true"
	>
		<svg viewBox="0 0 32 32" class="size-7">
			<path
				d="M9 6h14v19l-2.33-1.6L18.33 25 16 23.4 13.67 25l-2.34-1.6L9 25z"
				fill="currentColor"
			/>
			<path
				d="M12 11h8M12 14.5h8M12 18h5"
				stroke="var(--color-sidebar-active)"
				stroke-width="1.6"
				stroke-linecap="round"
			/>
		</svg>
	</span>
	{#if showName}<span class="font-display text-xl font-semibold text-ink">Slipside</span>{/if}
</span>
