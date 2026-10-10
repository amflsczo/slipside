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

	// Points sit at the day each payslip was paid, so gaps in time show as gaps.
	const DAY = 86_400_000;
	const time = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
	const span = $derived.by(() => {
		const first = oldestFirst[0] ? time(oldestFirst[0].paid) : 0;
		const last = oldestFirst.at(-1) ? time(oldestFirst.at(-1)!.paid) : 0;
		// A little room either side; a single payslip sits in the middle.
		const margin = Math.max((last - first) * 0.04, 3 * DAY);
		return { from: first - margin, to: last + margin };
	});
	const inset = 6; // keeps the first and last dots off the edges
	const xAt = (iso: string) =>
		pad.left + inset + ((time(iso) - span.from) / (span.to - span.from)) * (plotW - inset * 2);
	const x = (i: number) => xAt(oldestFirst[i]!.paid);

	type Point = { i: number; x: number; y: number };
	/** Runs of points with a value; a payslip without one (e.g. no rate) breaks the line. */
	const runs = $derived.by(() => {
		const out: Point[][] = [[]];
		oldestFirst.forEach((e, i) => {
			const v = value(e);
			if (v === null) {
				if (out.at(-1)!.length) out.push([]);
			} else out.at(-1)!.push({ i, x: x(i), y: y(v) });
		});
		return out.filter((run) => run.length);
	});
	const linePath = (run: Point[]) => run.map((pt, k) => `${k ? 'L' : 'M'}${pt.x},${pt.y}`).join('');
	// Dots on every payslip while there's room; on busy years only the hovered and latest.
	const showDots = $derived(oldestFirst.length <= 24);

	/** Month markers at the start of each month inside the span. */
	const months = $derived.by(() => {
		const out: { key: string; x: number; label: string }[] = [];
		const d = new Date(span.from);
		d.setUTCDate(1);
		d.setUTCMonth(d.getUTCMonth() + 1);
		while (d.getTime() <= span.to) {
			const iso = d.toISOString().slice(0, 10);
			out.push({
				key: iso,
				x: xAt(iso),
				// January carries the year, so a span across years reads clearly.
				label:
					d.getUTCMonth() === 0
						? String(d.getUTCFullYear())
						: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })
			});
			d.setUTCMonth(d.getUTCMonth() + 1);
		}
		// The first payslip's month starts before the span: label it under that payslip,
		// when there's room before the next month's label (also covers spans inside one month).
		if (oldestFirst[0] && (!out.length || out[0]!.x - xAt(oldestFirst[0].paid) > 36)) {
			const iso = oldestFirst[0].paid;
			out.unshift({
				key: iso,
				x: xAt(iso),
				label: new Date(time(iso)).toLocaleString('en', { month: 'short', timeZone: 'UTC' })
			});
		}
		// Keep labels at least ~34px apart; years win over months when they'd collide.
		const kept: typeof out = [];
		for (const label of out) {
			const prev = kept.at(-1);
			if (!prev || label.x - prev.x >= 34) kept.push(label);
			else if (/^\d{4}$/.test(label.label) && !/^\d{4}$/.test(prev.label))
				kept[kept.length - 1] = label;
		}
		return kept;
	});

	/**
	 * The latest payslip's value, labelled once, where the line isn't: to the right of the dot
	 * when there's room, else below it when the line comes in from above, else above it.
	 */
	const endLabel = $derived.by(() => {
		const i = oldestFirst.length - 1;
		const v = i >= 0 ? value(oldestFirst[i]!) : null;
		if (v === null) return null;
		const text = show(v);
		const w = text.length * 6.6; // 11px mono is about 6.6px a character
		const px = x(i);
		const py = y(v);
		if (px + 10 + w <= width - pad.right)
			return { x: px + 10, y: py, dy: '0.32em', anchor: 'start', text };
		const prev = i > 0 ? value(oldestFirst[i - 1]!) : null;
		const fromAbove = prev !== null && y(prev) < py;
		const below = fromAbove && py + 18 <= pad.top + plotH;
		return {
			x: Math.max(px - 4, pad.left + w),
			y: below ? py + 16 : Math.max(py - 10, 10),
			dy: '0.32em',
			anchor: 'end',
			text
		};
	});

	/** The nearest payslip to the pointer (the crosshair snaps to it). */
	function nearest(event: MouseEvent) {
		const box = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = event.clientX - box.left;
		let best: number | null = null;
		let gap = Infinity;
		oldestFirst.forEach((_, i) => {
			const d = Math.abs(x(i) - px);
			if (d < gap) {
				gap = d;
				best = i;
			}
		});
		return best;
	}

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

			{#each months as m (m.key)}
				<text
					x={m.x}
					y={height - 6}
					text-anchor="middle"
					class="fill-ink-muted font-mono text-2xs uppercase">{m.label}</text
				>
			{/each}

			<!-- The 2px line. -->
			{#each runs as run, k (k)}
				<path
					d={linePath(run)}
					class="fill-none stroke-chart"
					stroke-width="2"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{/each}

			<!-- The crosshair: a hairline at the hovered payslip. -->
			{#if hovered !== null}
				<line
					x1={x(hovered)}
					x2={x(hovered)}
					y1={pad.top}
					y2={pad.top + plotH}
					class="stroke-ink-muted/40"
					stroke-width="1"
				/>
			{/if}

			<!-- Dots with a 2px ring in the card colour, so they read where they cross the line. -->
			{#each runs as run, k (k)}
				{#each run as pt (pt.i)}
					{#if showDots || pt.i === hovered || pt.i === oldestFirst.length - 1}
						<circle
							cx={pt.x}
							cy={pt.y}
							r={pt.i === hovered ? 6 : 4}
							class="fill-chart stroke-card transition-[r]"
							stroke-width="2"
						/>
					{/if}
				{/each}
			{/each}

			<!-- One direct label: the latest payslip. -->
			{#if endLabel && hovered === null}
				<text
					x={endLabel.x}
					y={endLabel.y}
					dy={endLabel.dy}
					text-anchor={endLabel.anchor}
					class="fill-ink font-mono text-2xs font-semibold tabular-nums">{endLabel.text}</text
				>
			{/if}

			<!-- The whole plot is the hit area: the crosshair finds the nearest payslip. -->
			<rect
				x={pad.left}
				y={pad.top}
				width={plotW}
				height={plotH}
				fill="transparent"
				class="cursor-pointer"
				role="presentation"
				onpointermove={(e) => (hovered = nearest(e))}
				onpointerleave={() => (hovered = null)}
				onclick={(e) => {
					const i = nearest(e);
					if (i !== null) goto(`/?period=${oldestFirst[i]!.start}`);
				}}
			/>
		</svg>

		{#if hovered !== null}
			{@const e = oldestFirst[hovered]!}
			{@const v = value(e)}
			<div
				class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-card shadow-[0_12px_30px_-10px_rgb(0_0_0/0.4)]"
				style="left: {Math.min(Math.max(x(hovered), 70), width - 70)}px"
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
