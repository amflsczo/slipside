<script lang="ts">
	import { goto } from '$app/navigation';
	import { monthLabel } from '#lib/dates.ts';
	import type { MonthPoint } from '#lib/expenses.ts';
	import { formatMoney, minorDigits } from '#lib/format/money.ts';

	let {
		points,
		currency,
		hrefFor
	}: {
		/** Every month in the range, oldest first (months with nothing are zero). */
		points: MonthPoint[];
		currency: string;
		/** Where a month's point leads (its month view). */
		hrefFor: (month: string) => string;
	} = $props();

	const unit = $derived(10 ** minorDigits(currency));
	const wholeMoney = $derived(
		new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
	);
	const money = (minor: number) => formatMoney(minor, currency);
	const shortMonth = (month: string) =>
		new Date(`${month}-01T00:00:00Z`).toLocaleString('en', { month: 'short', timeZone: 'UTC' });

	// --- Geometry ---
	let width = $state(640);
	const height = 190;
	// The latest month's value is labelled to the right of its dot, so room is kept for it.
	const endText = $derived(points.length ? money(points.at(-1)!.spent) : '');
	const pad = $derived({ top: 22, right: endText.length * 6.6 + 14, bottom: 26, left: 52 });
	const plotW = $derived(Math.max(0, width - pad.left - pad.right));
	const plotH = $derived(height - pad.top - pad.bottom);

	/** A clean top for the axis and 3–5 round ticks (1, 2, 2.5 or 5 × 10ⁿ whole units). */
	const scale = $derived.by(() => {
		const max = Math.max(...points.map((p) => p.spent), unit) / unit;
		const raw = max / 4;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)! * unit;
		const top = Math.ceil(Math.max(max * unit, unit) / step) * step;
		return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
	});
	const y = (v: number) => pad.top + plotH - (v / scale.top) * plotH;

	// Months sit evenly across the plot; a single month sits in the middle.
	const inset = 10;
	const x = (i: number) =>
		points.length === 1
			? pad.left + plotW / 2
			: pad.left + inset + (i / (points.length - 1)) * (plotW - inset * 2);

	const linePath = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.spent)}`).join(''));
	const showDots = $derived(points.length <= 24);

	/** Month labels, at least ~34px apart; January carries the year. */
	const labels = $derived.by(() => {
		const out: { i: number; label: string }[] = [];
		let lastX = -Infinity;
		points.forEach((p, i) => {
			const isJan = p.month.endsWith('-01');
			// Across years, the first month carries its year too ("Nov ’25").
			const spansYears = points[0]!.month.slice(0, 4) !== points.at(-1)!.month.slice(0, 4);
			const label =
				isJan && points.length > 1
					? p.month.slice(0, 4)
					: i === 0 && spansYears
						? `${shortMonth(p.month)} ’${p.month.slice(2, 4)}`
						: shortMonth(p.month);
			if (x(i) - lastX >= 34) {
				out.push({ i, label });
				lastX = x(i);
			} else if (isJan && out.length) {
				out[out.length - 1] = { i, label };
				lastX = x(i);
			}
		});
		return out;
	});

	/** The latest month's value, labelled once, in the room kept to the right of its dot. */
	const endLabel = $derived(
		points.length
			? { x: x(points.length - 1) + 8, y: y(points.at(-1)!.spent), anchor: 'start', text: endText }
			: null
	);

	// --- Hover ---
	let hovered = $state<number | null>(null);
	function nearest(event: MouseEvent) {
		const box = (event.currentTarget as SVGElement).getBoundingClientRect();
		const px = event.clientX - box.left + pad.left;
		let best: number | null = null;
		let gap = Infinity;
		points.forEach((_, i) => {
			const d = Math.abs(x(i) - px);
			if (d < gap) {
				gap = d;
				best = i;
			}
		});
		return best;
	}
	const summary = $derived(
		`Spending per month, ${points.length} months. The table below lists every month.`
	);
</script>

<section class="rounded-3xl bg-card p-4 shadow-soft sm:p-6" aria-labelledby="spending-chart-title">
	<h2
		id="spending-chart-title"
		class="mb-3 font-mono text-xs font-semibold tracking-[0.2em] text-ink uppercase"
	>
		Spent per month
	</h2>

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
					class="fill-ink-muted font-mono text-2xs tabular-nums">{wholeMoney.format(t / unit)}</text
				>
			{/each}

			{#each labels as l (l.i)}
				<text
					x={x(l.i)}
					y={height - 6}
					text-anchor="middle"
					class="fill-ink-muted font-mono text-2xs uppercase">{l.label}</text
				>
			{/each}

			<!-- The 2px line. -->
			<path
				d={linePath}
				class="fill-none stroke-chart"
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>

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

			<!-- Dots with a 2px ring in the card colour. -->
			{#each points as p, i (p.month)}
				{#if showDots || i === hovered || i === points.length - 1}
					<circle
						cx={x(i)}
						cy={y(p.spent)}
						r={i === hovered ? 6 : 4}
						class="fill-chart stroke-card transition-[r]"
						stroke-width="2"
					/>
				{/if}
			{/each}

			{#if endLabel && hovered === null}
				<text
					x={endLabel.x}
					y={endLabel.y}
					dy="0.32em"
					text-anchor={endLabel.anchor}
					class="fill-ink font-mono text-2xs font-semibold tabular-nums">{endLabel.text}</text
				>
			{/if}

			<!-- The whole plot is the hit area: the crosshair finds the nearest month. -->
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
					if (i !== null) goto(hrefFor(points[i]!.month));
				}}
			/>
		</svg>

		{#if hovered !== null}
			{@const p = points[hovered]!}
			<div
				class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-card shadow-[0_12px_30px_-10px_rgb(0_0_0/0.4)]"
				style="left: {Math.min(Math.max(x(hovered), 70), width - 70)}px"
				aria-hidden="true"
			>
				<p class="font-mono text-sm font-semibold tabular-nums">{money(p.spent)}</p>
				<p class="text-2xs whitespace-nowrap text-card/75">
					{monthLabel(p.month)} · {p.count}
					{p.count === 1 ? 'expense' : 'expenses'}
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
					<th class="py-1.5 font-medium">Month</th>
					<th class="py-1.5 text-right font-medium">Spent</th>
					<th class="py-1.5 text-right font-medium">Net pay</th>
					<th class="py-1.5 text-right font-medium">Left over</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-dashed divide-rule/60 font-mono tabular-nums">
				{#each points as p (p.month)}
					<tr>
						<td class="py-1.5 font-sans">
							<a href={hrefFor(p.month)} class="hover:underline">{monthLabel(p.month)}</a>
						</td>
						<td class="py-1.5 text-right">{money(p.spent)}</td>
						<td class="py-1.5 text-right">{money(p.income)}</td>
						<td class="py-1.5 text-right {p.leftOver < 0 ? 'text-negative' : ''}">
							{p.leftOver < 0 ? '−' : ''}{money(Math.abs(p.leftOver))}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</details>
</section>
