<script lang="ts">
	import { goto } from '$app/navigation';
	import { shortDate, shortRange } from '#lib/dates.ts';
	import { formatMoney, formatRate, minorDigits } from '#lib/format/money.ts';
	import type { HistoryEntry } from '#lib/history.ts';
	import { cn } from '#lib/utils.ts';

	let {
		entries,
		currency
	}: {
		/** One currency's payslips for the year, any order. */
		entries: HistoryEntry[];
		currency: string;
	} = $props();

	// One series at a time: net pay first, rate and hours one tap away (one axis, never two).
	const METRICS = [
		{ id: 'net', label: 'Net' },
		{ id: 'rate', label: 'Rate' },
		{ id: 'hours', label: 'Hours' }
	] as const;
	type Metric = (typeof METRICS)[number]['id'];
	let metric = $state<Metric>('net');

	const oldestFirst = $derived(
		[...entries].sort((a, b) => a.paid.localeCompare(b.paid) || a.start.localeCompare(b.start))
	);
	const value = (e: HistoryEntry): number | null =>
		metric === 'net' ? e.net : metric === 'rate' ? e.rate : e.regularHours + e.otHours;

	const unit = $derived(10 ** minorDigits(currency));
	const wholeMoney = $derived(
		new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
	);
	/** Full value, for tooltips, labels and the table. */
	const show = (n: number) =>
		metric === 'net'
			? formatMoney(n, currency)
			: metric === 'rate'
				? `${formatRate(n, currency)}/hr`
				: `${Number(n.toFixed(2))} hrs`;
	/** Axis ticks: clean, short. */
	const tick = (n: number) => (metric === 'hours' ? String(n) : wholeMoney.format(n / unit));

	// --- Geometry ---
	let width = $state(640);
	const height = 190;
	const pad = { top: 22, right: 8, bottom: 26, left: 52 };
	const plotW = $derived(Math.max(0, width - pad.left - pad.right));
	const plotH = height - pad.top - pad.bottom;

	/** A clean top for the axis and 3–5 round ticks (1, 2, 2.5 or 5 × 10ⁿ). */
	const scale = $derived.by(() => {
		const values = oldestFirst.map(value).filter((v): v is number => v !== null);
		// Money ticks step in whole major units (pounds), hours in hours.
		const step0 = metric === 'hours' ? 1 : unit;
		const max = Math.max(...values, step0) / step0;
		const raw = max / 4;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)! * step0;
		const top = Math.ceil(Math.max(...values, step0) / step) * step;
		return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
	});
	const y = (v: number) => pad.top + plotH - (v / scale.top) * plotH;

	// Bars: at most 24px, centred in equal slots, with at least a 2px gap.
	const slot = $derived(oldestFirst.length ? plotW / oldestFirst.length : 0);
	const barW = $derived(Math.max(2, Math.min(24, slot - 2)));
	const x = (i: number) => pad.left + slot * i + (slot - barW) / 2;

	/** A bar with a 4px rounded top and a square base. */
	function barPath(i: number, v: number) {
		const left = x(i);
		const top = y(v);
		const base = pad.top + plotH;
		const r = Math.min(4, barW / 2, base - top);
		return `M${left},${base}V${top + r}Q${left},${top} ${left + r},${top}H${left + barW - r}Q${left + barW},${top} ${left + barW},${top + r}V${base}Z`;
	}

	/** Month markers under the first payslip paid in each month. */
	const months = $derived(
		oldestFirst.flatMap((e, i) =>
			i === 0 || e.paid.slice(0, 7) !== oldestFirst[i - 1]!.paid.slice(0, 7)
				? [
						{
							i,
							label: new Date(`${e.paid}T00:00:00Z`).toLocaleString('en', {
								month: 'short',
								timeZone: 'UTC'
							})
						}
					]
				: []
		)
	);

	/**
	 * Where the latest payslip's label goes: centred on its bar but kept inside the chart, and
	 * lifted above any neighbouring bar the text would overlap (labels never sit on a mark).
	 */
	const endLabel = $derived.by(() => {
		const i = oldestFirst.length - 1;
		const v = i >= 0 ? value(oldestFirst[i]!) : null;
		if (v === null) return null;
		const text = show(v);
		const half = (text.length * 6.6) / 2; // 11px mono is about 6.6px a character
		const cx = Math.min(Math.max(x(i) + barW / 2, pad.left + half), width - pad.right - half);
		let top = y(v);
		oldestFirst.forEach((e, j) => {
			const w = value(e);
			if (w !== null && x(j) < cx + half && x(j) + barW > cx - half) top = Math.min(top, y(w));
		});
		return { x: cx, y: top - 6, text };
	});

	// --- Hover ---
	let hovered = $state<number | null>(null);
	const summary = $derived(
		`${METRICS.find((m) => m.id === metric)!.label} per payslip, ${oldestFirst.length} payslips. The table below lists every value.`
	);
</script>

<section class="rounded-3xl bg-card p-4 shadow-soft sm:p-6" aria-labelledby="chart-title">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<h2
			id="chart-title"
			class="font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
		>
			{metric === 'net' ? 'Net pay' : metric === 'rate' ? 'Hourly rate' : 'Hours'} per payslip
		</h2>
		<div class="flex rounded-full bg-base-200/80 p-0.5" role="group" aria-label="What to chart">
			{#each METRICS as m (m.id)}
				<button
					type="button"
					class={cn(
						'min-h-8 rounded-full px-3 text-xs font-semibold transition-colors',
						metric === m.id ? 'bg-card text-ink shadow-soft' : 'text-ink-muted hover:text-ink'
					)}
					aria-pressed={metric === m.id}
					onclick={() => (metric = m.id)}>{m.label}</button
				>
			{/each}
		</div>
	</div>

	<div class="relative" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label={summary} class="block overflow-visible">
			<!-- Gridlines and ticks: recessive, solid hairlines. -->
			{#each scale.ticks as t (t)}
				<line
					x1={pad.left}
					x2={width - pad.right}
					y1={y(t)}
					y2={y(t)}
					class="stroke-base-300"
					stroke-width="1"
				/>
				<text
					x={pad.left - 8}
					y={y(t)}
					dy="0.32em"
					text-anchor="end"
					class="fill-ink-muted font-mono text-2xs tabular-nums">{tick(t)}</text
				>
			{/each}

			{#each months as m (m.i)}
				<text
					x={x(m.i) + barW / 2}
					y={height - 6}
					text-anchor="middle"
					class="fill-ink-muted font-mono text-2xs uppercase">{m.label}</text
				>
			{/each}

			{#each oldestFirst as e, i (e.start)}
				{@const v = value(e)}
				{#if v !== null && v > 0}
					<path
						d={barPath(i, v)}
						class={cn(
							'cursor-pointer fill-chart transition-opacity',
							hovered !== null && hovered !== i && 'opacity-45'
						)}
					/>
				{/if}
				<!-- The hit area is the whole slot, taller than the bar. -->
				<rect
					x={pad.left + slot * i}
					y={pad.top}
					width={slot}
					height={plotH}
					fill="transparent"
					class="cursor-pointer"
					role="presentation"
					onpointerenter={() => (hovered = i)}
					onpointerleave={() => (hovered = null)}
					onclick={() => goto(`/?period=${e.start}`)}
				/>
			{/each}

			<!-- One direct label: the latest payslip, above every bar it spans. -->
			{#if endLabel && hovered === null}
				<text
					x={endLabel.x}
					y={endLabel.y}
					text-anchor="middle"
					class="fill-ink font-mono text-2xs font-semibold tabular-nums">{endLabel.text}</text
				>
			{/if}
		</svg>

		{#if hovered !== null}
			{@const e = oldestFirst[hovered]!}
			{@const v = value(e)}
			<div
				class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-card shadow-[0_12px_30px_-10px_rgb(0_0_0/0.4)]"
				style="left: {Math.min(Math.max(x(hovered) + barW / 2, 70), width - 70)}px"
				aria-hidden="true"
			>
				<p class="font-mono text-sm font-semibold tabular-nums">
					{v === null ? 'No rate' : show(v)}
				</p>
				<p class="text-2xs whitespace-nowrap text-card/75">
					{shortRange(e.start, e.end)} · paid {shortDate(e.paid)}
				</p>
			</div>
		{/if}
	</div>

	<details class="mt-3 text-sm">
		<summary class="w-fit text-xs font-semibold text-sidebar-active hover:underline">
			Show as a table
		</summary>
		<table class="mt-2 w-full text-left text-xs">
			<thead class="text-ink-muted">
				<tr>
					<th class="py-1.5 font-medium">Payslip</th>
					<th class="py-1.5 font-medium">Paid</th>
					<th class="py-1.5 text-right font-medium">Net</th>
					<th class="py-1.5 text-right font-medium">Rate</th>
					<th class="py-1.5 text-right font-medium">Hours</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-dashed divide-rule/60 font-mono tabular-nums">
				{#each oldestFirst as e (e.start)}
					<tr>
						<td class="py-1.5 font-sans">
							<a href="/?period={e.start}" class="hover:underline">{shortRange(e.start, e.end)}</a>
						</td>
						<td class="py-1.5 font-sans text-ink-muted">{shortDate(e.paid)}</td>
						<td class="py-1.5 text-right">{formatMoney(e.net, currency)}</td>
						<td class="py-1.5 text-right">
							{e.rate === null ? '—' : `${formatRate(e.rate, currency)}/hr`}
						</td>
						<td class="py-1.5 text-right">{Number((e.regularHours + e.otHours).toFixed(2))}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</details>
</section>
