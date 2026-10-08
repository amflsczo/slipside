<script lang="ts">
	import { cn } from '#lib/utils.ts';

	let { name, class: className }: { name: string; class?: string } = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]!.toUpperCase())
			.join('') || '?'
	);
</script>

<span
	class={cn(
		'grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-active text-xs font-bold text-sidebar-active-ink',
		className
	)}
	aria-hidden="true">{initials}</span
>
