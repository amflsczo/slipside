<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Button from './Button.svelte';

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel,
		pending = false,
		onconfirm
	}: {
		open?: boolean;
		/** A question that repeats the action, e.g. "Delete this week?" */
		title: string;
		/** What happens afterwards. */
		message: string;
		confirmLabel: string;
		/** While true the dialog stays open with a spinner and can't be dismissed. */
		pending?: boolean;
		onconfirm: () => void;
	} = $props();

	let dialog: HTMLDialogElement;
	const id = $props.id();

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<!-- Native <dialog>: focus stays inside, Escape or a backdrop click cancels. -->
<dialog
	bind:this={dialog}
	aria-labelledby="{id}-title"
	aria-describedby="{id}-message"
	class="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-card p-6 text-ink shadow-[0_20px_60px_-15px_rgb(0_0_0/0.45)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-dialog-in"
	onclose={() => (open = false)}
	oncancel={(e) => pending && e.preventDefault()}
	onclick={(e) => {
		if (e.target === dialog && !pending) open = false;
	}}
>
	<div class="mb-3 grid size-11 place-items-center rounded-full bg-error/10 text-error">
		<TriangleAlert size={20} aria-hidden="true" />
	</div>
	<h2 id="{id}-title" class="font-display text-lg font-semibold">{title}</h2>
	<p id="{id}-message" class="mt-1 text-sm text-ink-muted">{message}</p>
	<div class="mt-6 flex gap-2">
		<Button
			type="button"
			variant="secondary"
			class="flex-1"
			disabled={pending}
			onclick={() => (open = false)}>Cancel</Button
		>
		<Button type="button" variant="danger" class="flex-1" loading={pending} onclick={onconfirm}>
			{confirmLabel}
		</Button>
	</div>
</dialog>
