# Design system

A calm, card-based UI for internal business apps: forms people file, records they track, and queues reviewers work through. It runs the same on desktop, tablet and phone, in light and dark mode, with one fixed accent colour (brand blue `#0F59AC`).

This guide is written so you can copy it into another project. The class names are **Tailwind CSS v4 + daisyUI v5** utilities, the components are **Svelte 5**, and the icons are **Lucide**. The ideas carry over to other stacks; the exact classes only work with these tools.

---

## 1. Principles

1. **One accent colour.** Every neutral surface takes a small share of the accent, so the whole app feels built around it. The accent itself is the only saturated colour on screen, used for "you are here" and "do this".
2. **Cards on a tinted canvas.** The page background is a soft blue (`#DEE7F5`). Content sits on white (in dark mode, raised) cards with a soft shadow. There are no hard borders between sections.
3. **Rounded and soft.** Large radii (cards `rounded-3xl`, controls `rounded-full` or `rounded-xl`), one soft shadow, and short transitions of 150–200 ms.
4. **Status is colour-coded everywhere.** A record's state (Draft, Pending, Approved, Rejected…) always has the same colour, in pills, card washes and callouts.
5. **Phone first, desktop roomier.** Layouts stack on phones and spread out from `sm` and `lg` up. Action bars stick to the bottom on phones, within thumb reach.
6. **Explain, don't just block.** If something can't be done, a short note says why and what to do instead.
7. **Usable by everyone.** Every screen follows the four POUR principles (Perceivable, Operable, Understandable, Robust) of WCAG 2.2 at level AA. See [§11](#11-accessibility-the-four-pour-principles) for the rules.

---

## 2. Stack and setup

| Concern | Choice |
|---|---|
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), daisyUI v5 as a plugin |
| Font | Plus Jakarta Sans Variable (`@fontsource-variable/plus-jakarta-sans`) |
| Icons | `@lucide/svelte`, imported one by one: `import Plane from '@lucide/svelte/icons/plane'` |
| Class merging | `clsx` + `tailwind-merge`, wrapped in a `cn()` helper |

```ts
// $lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
```

Import the font and stylesheet once, in the root layout:

```svelte
<script>
	import '@fontsource-variable/plus-jakarta-sans';
	import './layout.css';
</script>
```

---

## 3. Colour tokens

Tokens are defined in `@theme`, so each becomes a Tailwind colour (`bg-card`, `text-ink-muted`, `bg-sidebar-active/10`, …). daisyUI supplies the semantic colours (`base-100/200/300`, `base-content`, `success`, `warning`, `error`, `info`, `secondary`).

> The accent is named `sidebar-active` for historical reasons. It is used for much more than the sidebar. Keep the name if you copy components from this app, or rename it everywhere at once. Don't call it `accent`, because that clashes with daisyUI's `accent`.

| Token | Role |
|---|---|
| `sidebar-active` | **The accent.** Primary buttons, active nav and tabs, focus rings, selection, icon chips |
| `sidebar-active-ink` | Text on the accent (always white) |
| `positive` / `positive-ink` | The "go" colour: submit buttons, success, healthy progress |
| `surface` | Page background (canvas) |
| `card` | Card background |
| `ink` | Body text and headings: navy `#0E1A30` in light mode |
| `navy` | `#0E1A30`. Light-mode text, and the dark end of brand gradients |
| `ink-muted` | Secondary text, labels, captions (not tinted) |
| `sidebar`, `sidebar-hover`, `sidebar-border`, `sidebar-ink`, `sidebar-muted` | Side navigation panel |

Paste this into your global stylesheet (`layout.css` / `app.css`):

```css
@import 'tailwindcss';
@plugin 'daisyui';

@theme {
	--color-sidebar: #ffffff;
	--color-sidebar-hover: color-mix(in oklch, #f4f5f9 85%, var(--color-sidebar-active) 15%);
	--color-sidebar-active: #0f59ac; /* brand blue, fixed */
	--color-sidebar-active-ink: #ffffff;
	--color-sidebar-muted: #6b7280;
	--color-sidebar-border: color-mix(in oklch, #e8eaf0 90%, var(--color-sidebar-active) 10%);
	--color-navy: #0e1a30;
	--color-sidebar-ink: var(--color-navy);
	--color-surface: #dee7f5; /* soft blue canvas */
	--color-ink: var(--color-navy);
	--color-ink-muted: #5c6275; /* ≥ 4.5:1 on the canvas and on cards */
	--color-card: #ffffff;

	--color-positive: oklch(0.55 0.12 164);
	--color-positive-ink: #ffffff;

	--font-sans: 'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

	/* A notch more compact than Tailwind's defaults. */
	--text-xs: 0.75rem;     /* 12px — never smaller for labels */
	--text-sm: 0.8125rem;   /* 13px — body text */
	--text-base: 0.9375rem; /* 15px */
	--text-lg: 1.0625rem;   /* 17px */
	--text-xl: 1.1875rem;   /* 19px */
	--text-2xl: 1.375rem;   /* 22px */
	--text-3xl: 1.625rem;   /* 26px */
	--text-4xl: 2rem;       /* 32px */
}

/* Phones: one notch smaller to fit more; body stays 13px, labels keep 12px. */
@media (max-width: 639px) {
	:root {
		--text-sm: 0.8125rem;  /* 13px */
		--text-base: 0.875rem; /* 14px */
		--text-lg: 1rem;       /* 16px */
		--text-xl: 1.125rem;   /* 18px */
		--text-2xl: 1.25rem;   /* 20px */
		--text-3xl: 1.375rem;  /* 22px */
		--text-4xl: 1.75rem;   /* 28px */
	}
}

/* Dark: the same tinting, layered on daisyUI's dark neutrals.
   Sidebar = darkest (base-300), page = middle (base-200), cards = lightest (base-100). */
[data-theme='dark'] {
	--color-surface: color-mix(in oklch, var(--color-base-200) 92%, var(--color-sidebar-active) 8%);
	--color-card: color-mix(in oklch, var(--color-base-100) 97%, var(--color-sidebar-active) 3%);
	--color-ink: var(--color-base-content);
	--color-ink-muted: color-mix(in oklch, var(--color-base-content) 60%, transparent);
	--color-sidebar: color-mix(in oklch, var(--color-base-300) 95%, var(--color-sidebar-active) 5%);
	--color-sidebar-hover: color-mix(in oklch, var(--color-base-200) 88%, var(--color-sidebar-active) 12%);
	--color-sidebar-muted: color-mix(in oklch, var(--color-base-content) 60%, transparent);
	--color-sidebar-border: color-mix(in oklch, var(--color-base-100) 85%, var(--color-sidebar-active) 15%);
	--color-sidebar-ink: var(--color-base-content);
	--color-positive: oklch(0.64 0.13 164);
}

@layer base {
	html, body { height: 100%; }
	body {
		background-color: var(--color-surface);
		color: var(--color-ink);
		font-family: var(--font-sans);
		font-size: var(--text-base);
		font-feature-settings: 'cv11', 'ss01';
		@apply antialiased;
		overscroll-behavior-y: none; /* keeps a fixed bottom nav glued on iOS */
	}
	h1, h2, h3 { letter-spacing: -0.015em; }
	:focus-visible {
		outline: 2px solid var(--color-sidebar-active);
		outline-offset: 2px;
	}
}

::selection {
	background: var(--color-sidebar-active);
	color: var(--color-sidebar-active-ink);
}

/* daisyUI controls follow the type scale on larger screens. */
@media (min-width: 640px) {
	:is(.input, .select, .textarea):not(.input-xs, .input-sm, .select-xs, .select-sm, .textarea-xs, .textarea-sm) {
		font-size: var(--text-sm);
	}
}
.btn:not(.btn-xs, .btn-sm, .btn-lg) {
	font-size: var(--text-sm);
}

/* Reduced motion: CSS transitions and animations finish instantly. */
@media (prefers-reduced-motion: reduce) {
	*, *::before, *::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}

/* The one card shadow. */
@utility shadow-soft {
	box-shadow: 0 1px 2px rgb(16 24 40 / 0.04), 0 8px 24px -12px rgb(16 24 40 / 0.12);
}

/* Safe areas for notches and home indicators. */
@utility pb-safe { padding-bottom: env(safe-area-inset-bottom); }
@utility pt-safe { padding-top: env(safe-area-inset-top); }
@utility min-h-safe-screen {
	min-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}

@media print {
	@page { margin: 12mm; }
	body, .bg-surface { background: #fff; }
}
```

### Accent colour (fixed)

The accent is the **brand blue** `#0F59AC`, and it always takes white text (6.9:1). It is fixed: there is no accent picker, so the palette stays the same for everyone. To change it, edit `--color-sidebar-active` in `layout.css`.

### No flash on load

Put this in `app.html` (or `index.html`) `<head>` so the saved theme applies **before first paint**:

```html
<script>
	(function () {
		try {
			var stored = localStorage.getItem('app-theme');
			var mode = stored === 'light' || stored === 'dark'
				? stored
				: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
			document.documentElement.setAttribute('data-theme', mode);
		} catch (e) {}
	})();
</script>
```

The theme toggle sets `data-theme="light" | "dark"` on `<html>` and saves the choice. With nothing saved, it follows the OS setting.

### Status colours

Use the same mapping in every place a status appears:

| Status | Pill (daisyUI badge) | Wash / tone colour |
|---|---|---|
| Approved | `badge-success` | `--color-positive` |
| Pending | `badge-warning` | `--color-warning` |
| Received | `badge-warning` | `--color-warning` |
| Submitted | `badge-info` | `--color-info` |
| In review (intermediate approval) | `badge-info` | `--color-info` |
| Rejected | `badge-error` | `--color-error` |
| Draft | `badge-neutral` | `--color-ink-muted` |
| Cancelled | `badge-ghost` | `--color-ink-muted` |
| Archived | `bg-base-300 text-ink-muted` chip with an archive icon | `--color-ink-muted` |

### Category tints

When a list mixes several kinds of record, give each kind a tinted icon chip, always `bg-<colour>/12 text-<colour>`:

```ts
const KIND_TINTS = {
	KindA: 'bg-sidebar-active/12 text-sidebar-active',
	KindB: 'bg-info/12 text-info',
	KindC: 'bg-warning/15 text-warning', // warning needs a slightly stronger tint
	KindD: 'bg-positive/12 text-positive',
	KindE: 'bg-secondary/12 text-secondary',
	KindF: 'bg-orange-500/12 text-orange-600'
};
```

---

## 4. Typography

| Use | Classes |
|---|---|
| Page title | `text-xl sm:text-2xl font-extrabold leading-tight text-ink` |
| Detail title (hero) | `text-lg sm:text-xl font-bold leading-snug` |
| Card / panel title | `text-base font-bold` (panel), `text-sm font-semibold` (detail section) |
| Form step title | `text-[0.95rem] font-semibold leading-tight` |
| Body | `text-sm text-ink` |
| Secondary | `text-xs text-ink-muted` or `text-sm text-ink-muted` |
| Field label | `text-[0.8rem] font-medium` |
| Eyebrow / overline | `text-[0.7rem] font-semibold uppercase tracking-wider text-ink-muted` |
| Big number | `text-3xl font-extrabold tracking-tight tabular-nums` |
| Numbers in tables/facts | add `tabular-nums` |

Rules:
- Labels never go below 12px (`text-xs`), except overlines and badges.
- On phones, form inputs use **16px** text, so iOS doesn't zoom in when a field is tapped.
- Long user text that keeps its line breaks uses `whitespace-pre-line`. Anything that might overflow uses `break-words` / `truncate` / `line-clamp-*` with `min-w-0` on the flex child.

---

## 5. Shape, depth, motion

| | Value |
|---|---|
| Card radius | `rounded-3xl` (big cards), `rounded-2xl` (callouts, bars, menus, dialogs) |
| Control radius | `rounded-full` (pills, search, tabs, icon buttons), `rounded-xl` (nav items, choice cards), `rounded-lg` (buttons) |
| Icon chip | `grid place-items-center rounded-full` or `rounded-xl`/`rounded-2xl`, sizes `size-7`–`size-12` |
| Card shadow | `shadow-soft` (the only card shadow) |
| Hover lift | `hover:shadow-[0_12px_32px_-14px_rgb(16_24_40/0.3)]` |
| Floating bars and menus | `shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)]` + `bg-card/90 backdrop-blur-md` |
| Dialog | `shadow-[0_20px_60px_-15px_rgb(0_0_0/0.45)]`, backdrop `bg-black/40 backdrop-blur-[2px]` |
| Hairline | `border-base-300/70` |
| Transitions | `duration-150` (controls), `duration-200` (tabs, shadows); press feedback `active:scale-[0.98]` |
| Layout springs | critically damped (`stiffness 0.25, damping 1`), and instant when `prefers-reduced-motion` is on |

Tinted fills use opacity steps: `/[0.06]`–`/[0.08]` for callout backgrounds, `/10`–`/12` for icon chips and active nav, `/30` for callout borders.

---

## 6. App shell

```
┌──────────┬──────────────────────────────────────────┐
│ Side nav │  Top bar (sticky; frosted once scrolled)  │
│ floating │──────────────────────────────────────────│
│ panel    │  <main> page content                      │
│ (lg+)    │                                           │
└──────────┴──────────────────────────────────────────┘
Phones/tablets: no side nav → brand in top bar, floating bottom nav.
```

- **Canvas:** `bg-surface flex min-h-dvh`.
- **Side nav (lg+):** a floating panel, `bg-sidebar shadow-soft rounded-3xl sticky top-3 my-3 ml-3 h-[calc(100dvh-1.5rem)]`. Width 264px, collapsible to 84px (icons only, remembered in `localStorage`). From top to bottom:
  - the brand mark (an icon in an accent tile)
  - a greeting card (avatar initials + name + role)
  - the main links, then a "More" group with an uppercase overline
  - a Collapse button at the bottom
- **Nav item:** `rounded-xl min-h-10 px-3 text-sm font-medium`.
  - Active: `bg-sidebar-active/10 text-sidebar-active font-semibold`, plus a 4px accent bar on the left edge.
  - Inactive: `text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink`.
- **Top bar:** `sticky top-0 h-16 px-4 lg:px-8 pt-safe`. Once the page scrolls past 4px it frosts: `bg-surface/80 backdrop-blur-md shadow-[0_1px_0_rgb(16_24_40/0.06)]`. On the right are the theme toggle (round `size-10 bg-card shadow-soft` button) and the account pill (avatar + name + chevron), which opens a menu.
- **Bottom nav (< lg):** fixed, floating above the home indicator: `bg-card/92 backdrop-blur-lg rounded-2xl border p-1.5 max-w-lg mx-auto`. Use only 4–5 "primary" items, with the icon above a short label (`text-[0.66rem] font-semibold`). The active item is `bg-sidebar-active/10 text-sidebar-active` with a heavier icon stroke.
- **Main:** `px-4 pt-2 pb-28 lg:px-8 lg:pb-10`. The large bottom padding on phones keeps content clear of the bottom nav.
- **Single nav source:** one `navItems` array (label, href, icon, `visible(user)`, `primary`, `group`) drives the side nav, the bottom nav, and the rule for which pages show a back arrow.
- **Print:** the shell hides itself with `print:hidden!`, and `<main>` drops its padding with `print:p-0!`.

### Page widths

| Page type | Container |
|---|---|
| Lists, dashboards | full width: `flex flex-col gap-4` |
| Detail and form pages | `mx-auto w-full max-w-3xl flex flex-col gap-4 sm:gap-5` |

### Login

A two-column page on `lg`.
- **Left:** a hero card, `rounded-[2rem] p-10 text-white`, with the background `linear-gradient(145deg, var(--color-sidebar-active), var(--color-navy))` (blue to navy). It holds large faint circles (`bg-white/10`), a headline, and glassy feature chips (`bg-white/15 backdrop-blur-sm rounded-2xl`).
- **Right:** the form. On phones, only the form is shown.

---

## 7. Components

Each component lists what it is and its key classes.

### Button
Variants map to intent:

| Variant | Use | Classes |
|---|---|---|
| `primary` | main action | `bg-sidebar-active text-sidebar-active-ink hover:brightness-110` |
| `accent` | **submit / go** | `bg-positive text-positive-ink hover:brightness-110` |
| `secondary` | other actions (print, edit) | `border border-base-300 text-ink hover:bg-base-200` |
| `ghost` | low-emphasis | `text-ink-muted hover:bg-base-200 hover:text-ink` |
| `danger` | destructive confirm | `bg-error text-white hover:brightness-110` |

Base: `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none`. Sizes: `sm` = `px-3 py-1.5 text-xs`, `md` = `px-4 py-2 text-sm`. A button with `href` renders as `<a>`. `loading` shows a daisyUI `loading-spinner loading-xs` and disables the button. Icons go before the label, at size 16.

### Panel
A generic card: `bg-card shadow-soft rounded-3xl p-4 sm:p-6`. It can have a header row with a `text-base font-bold` title and an action on the right.

### PageHeader
A list or section page header. From left to right:
- a round back button (`size-10 bg-card shadow-soft rounded-full`, calls `history.back()`), shown only on pages that aren't top-level nav destinations
- an accent icon tile, `size-11 rounded-2xl bg-sidebar-active/12 text-sidebar-active`, hidden on phones
- the title and a subtitle (`line-clamp-2`)

An optional action sits on the right, e.g. a "New" button as `rounded-full`.

### Back link (detail pages)
A text link above the content: `inline-flex w-fit items-center gap-1.5 text-sm text-ink-muted hover:text-ink`, with `ArrowLeft` at size 16 and a label naming the destination ("My applications", "Travel order TO-0012"). See §9 for where it points.

### StatTile
A headline number:
- a tinted round icon chip and a muted label
- the big number (`text-3xl font-extrabold tabular-nums`) with an optional unit
- an optional thin progress bar (`h-1.5 rounded-full bg-base-200`) and a one-line hint

Tones: accent, error, positive, warning, info, success. With `href` it becomes a link with the hover lift.

### Filter tiles (count cards)
A grid of tiles (`grid-cols-4 lg:grid-cols-7 gap-2.5`), each showing an icon chip, a count and a label. Tapping a tile filters to that kind; tapping it again clears the filter. The selected tile gets `outline-2 outline-sidebar-active` and `aria-pressed`.

### SegmentedTabs
Pill tabs or filters inside a container: `bg-card border border-base-300/70 rounded-full p-1`.
- Active: `bg-sidebar-active text-sidebar-active-ink`. Inactive: `text-ink-muted hover:bg-base-200/60`.
- Optional icon and count bubble.
- On phones the tabs wrap and stretch evenly. From `sm` up they stay on one row and scroll sideways, keeping the active tab in view.
- Each tab is a link (`role="tab"`) or a button (`aria-pressed`).

### SearchField
A rounded pill: `h-9 rounded-full border bg-card px-3.5`. It has a search icon, an input and a clear (×) button. On focus: `focus-within:border-sidebar-active focus-within:ring-3 ring-sidebar-active/15`.

### Toolbar (list filters)
A card holding search + filters: `bg-card shadow-soft rounded-3xl p-3 sm:p-4 lg:flex-row lg:items-end`.
- **Phones:** the filters hide behind a "Filters" ghost button with a count badge of active filters.
- **Selects:** `select select-bordered select-sm rounded-full`, each with an `text-xs text-ink-muted` label above.

### Lists and tables
- **Phones:** a card list. Each row is an `<a>` with `-mx-2 flex items-center gap-3 rounded-2xl p-2 hover:bg-base-200/60`: icon chip, title + meta, a status pill, then a chevron.
- **md+:** a table. Header row `text-xs text-ink-muted border-b`; rows `divide-y divide-base-300`; cells `py-2.5 pr-4`. The actions column holds `btn btn-ghost btn-xs btn-square` icon links (view, edit, print), each with `aria-label` and `title`.
- **Pagination:** "Showing 1–10 of 42", plus previous/next and page-number buttons. Ten rows per page.
- **Empty rows:** one centred muted line, e.g. "No applications match this filter." (§8).

### StatusPill
A daisyUI `badge font-medium` with the status class from §3, `badge-sm` by default.

### Detail page anatomy (top to bottom)
1. **Back link** (§9)
2. **Status note** (only when relevant): a neutral callout explaining Draft / Archived / "can't withdraw" (`rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3` + icon).
3. **DetailHero:** a card whose background is a diagonal **wash in the status colour**: `linear-gradient(135deg, color-mix(in oklch, <status colour> 11%, var(--color-card)) 0%, var(--color-card) 65%)`. It contains:
   - a white icon tile
   - an uppercase overline (kind) with the status pill on the right
   - the title and a "Ref <id>" line
   - below a hairline, a strip of 2–4 **facts**: label (with a small icon) over a bold value, two per row on phones and all on one row on desktop
4. **Contextual callout(s):** e.g. a deadline reminder, in the tone of its state (positive / warning / error / neutral).
5. **DetailSection(s):** a card with a small tinted icon square and a `text-sm font-semibold` title, holding a `<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">` of **InfoItem**s (`dt` = `text-xs text-ink-muted`, `dd` = `text-sm text-ink mt-1`). A `wide` item spans both columns. Show `—` for empty values.
6. **History:** a timeline of what happened, who did it and when.
7. **DetailActions:** the sticky action bar (below).

### Sticky action bar (forms and details)
`sticky bottom-[calc(5.1rem+env(safe-area-inset-bottom))] lg:bottom-4 z-20 rounded-2xl border bg-card/90 backdrop-blur-md p-3`, with the floating shadow.
- It sits **above the bottom nav** on phones.
- **Form version:** a short summary on the left ("3 employees · 12 hrs"). On the right, "Save as draft" (secondary) and **Submit** (accent).
- **Detail version:** the buttons stretch to fill the row on phones (`min-w-[9rem] flex-1`) and align right on desktop. The bar hides itself if it has no buttons.
- While working, button labels change to "Submitting…" / "Saving…".

### FormSection
One numbered step of a long form: `form-surface bg-card shadow-soft rounded-3xl`.
- The header has a round step number (`size-7 bg-sidebar-active/10 text-sidebar-active text-xs font-bold`), a title and a description, plus an optional action on the right (e.g. "Add row").
- The body stacks fields with `gap-4 sm:gap-5`.
- `.form-surface` styles the inputs inside it:

```css
@layer components {
	.form-surface :is(.input, .select, .textarea) {
		border-radius: 0.625rem;
		background-color: var(--color-base-100);
		transition: border-color 150ms, box-shadow 150ms;
	}
	.form-surface :is(.input, .select, .textarea):is(:focus, :focus-within):not(:disabled) {
		outline: none;
		border-color: var(--color-sidebar-active);
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-sidebar-active) 18%, transparent);
	}
	.form-surface :is(.input, .select, .textarea):disabled {
		background-color: var(--color-base-200);
		color: var(--color-ink);
		opacity: 0.85;
	}
	.form-surface .textarea { resize: vertical; line-height: 1.5; }
	.form-surface :is(.input, .textarea)::placeholder { color: var(--color-ink-muted); opacity: 0.7; }
	@media (max-width: 639px) {
		.form-surface :is(.input, .select, .textarea):not(.input-sm, .select-sm, .textarea-sm) { font-size: 1rem; }
	}
}
```

### Field
A label on top: required fields get a red `*`, optional ones get "Optional" on the right. Then the control, then **either** the error (`text-error text-xs` with an alert icon, `role="alert"`) **or** a hint, never both, so the space under the field doesn't jump.

### ChoiceGroup
For 2–6 options, use tappable radio cards instead of a dropdown: a grid of `rounded-xl border px-3 py-2.5` cards.
- Selected: `border-sidebar-active bg-sidebar-active/[0.07]`, an inset accent ring, and a check bubble in the corner.
- Each card has a label and an optional one-line description.
- Keyboard focus shows a ring through `has-[:focus-visible]`.

### Callouts
`flex items-start gap-3 rounded-2xl border px-4 py-3`:

| Tone | Classes |
|---|---|
| Neutral / info note | `border-base-300 bg-base-200/60`, icon `text-ink-muted` |
| Success | `border-positive/30 bg-positive/[0.07] text-positive` |
| Warning | `border-warning/40 bg-warning/[0.08] text-warning` |
| Error / remarks | `border-error/30 bg-error/[0.06]`, icon chip `bg-error/10 text-error` |

The title is bold `text-ink`, with a muted sentence after it.

### EmptyState
A dashed card, `rounded-2xl border border-dashed border-base-300/70 bg-card px-6 py-14 text-center`. It holds an accent icon in a soft circle, one bold line and an optional short hint (`max-w-xs`), plus an optional action. Use it for "not found" and "nothing yet".

### ConfirmDialog
For actions that can't be undone. It uses the native `<dialog>` with `showModal()`, so focus stays inside it and Escape or a backdrop click cancels.
- **Layout:** centred, `max-w-sm rounded-2xl`, with an error-tinted icon circle, a title and a message. Cancel (secondary) and Confirm (danger) sit side by side.
- **While confirming:** the dialog stays open with a spinner until the action finishes.
- **Entry animation:** fade + rise in 160 ms.

### Review panel
For whoever has to make the decision: a card naming the step ("Waiting for your final approval"), one line of context, and decision buttons (approve / return / reject / cancel). Each button opens a confirm dialog. Remarks are required, optional or not asked for, depending on the decision.

### Toasts
Top-centre, `max-w-sm`, daisyUI `alert alert-success|error|info|warning`, each with an icon and a Dismiss button. They slide in with `fly y:-16`. They stay 3.5 s, warnings 6 s.

### Menus / popovers
`absolute mt-2 w-56 rounded-2xl border bg-card p-1.5`, with the shadow `0 16px 40px -12px rgb(16 24 40 / .25)`. Items are `rounded-xl p-2.5 text-sm hover:bg-base-200`. A destructive item uses `text-error hover:bg-error/10`. The menu closes on Escape or when focus leaves it.

### Avatars
Initials in an accent circle: `bg-sidebar-active text-sidebar-active-ink rounded-full text-xs font-bold`, sizes 8–10.

### Loading
- **Pages:** a skeleton block, `bg-base-200 animate-pulse rounded-2xl` (e.g. `h-56` for a detail page, a few `h-20` rows for a list).
- **App boot:** a centred `loading loading-spinner loading-lg text-sidebar-active`.

---

## 8. Writing (UI copy)

- **Plain and short.** Say what happens: "It goes back to them as a draft to correct and submit again."
- **Sentence case** for titles, buttons and labels ("Save as draft", "Print order"). Top-level nav labels may use Title Case.
- **Buttons are verbs.** "Submit report", "Create trip ticket", "Return to office admin".
- **Confirm titles are questions** that repeat the action ("Reject this trip ticket?"). The message says what will happen afterwards.
- **Explain a blocked action** instead of hiding it silently: "This application is already being acted on, so it can't be withdrawn. Ask HR to return it if it needs changes."
- **Empty and not-found states** name the thing and give a likely reason: "Travel order not found — It may have been deleted, or it isn't yours to view."
- **Dates:** medium style ("Oct 2, 2026"), ranges as "Oct 2 – 4, 2026". Durations use units ("3 days", "12 hrs"). Use `—` for missing values.
- **Toasts** are past tense and short: "Trip ticket approved."

---

## 9. Navigation patterns

### Back link goes where you came from
A detail page usually has an obvious parent list, but it can be opened from many places: another record, a dashboard widget, an activity log, a reviewer's queue. Links to it therefore carry the current page as `?from=<path+query>`:

- **The back link** uses `from` when present and names it ("Trip ticket TT-0003", "My applications"). Otherwise it falls back to the page's usual parent.
- **Only paths inside the app** are accepted (must start with `/`, not `//` or `/\`), so `from` can't send anyone to another site.
- **Going back to the origin:** when linking to the page you came from, link back to it as it was rather than adding another `from`. This keeps URLs short when going back and forth between two pages.
- **Print views** keep the chain going, so a print view → detail → origin all works.

A reference implementation is `src/lib/back-link.ts` (`linkFrom(href, page.url)`, `backLink(page.url, fallback)`).

### List state belongs in the URL
- Filters, search, tab and page number go in the **query string**: `?view=archived&kind=Leave&status=Pending&page=2&q=cebu`.
- **Default values are left out**, so an unfiltered list is just the bare path.
- **Update with `goto(url, { replaceState: true, keepFocus: true, noScroll: true })`**, so filter changes don't fill up browser history.
- **Debounce search** for about 300 ms before writing it to the URL; filter the list on every keystroke.
- **Changing any filter** resets to page 1.
- **Restore on return:** `sessionStorage` may remember the last query, so coming back through the nav (the bare path) returns to the same filters. The URL is still the source of truth.
- **Server-ready:** a single `parseFilters(searchParams)` function is used by the UI now and can be reused by a data loader that calls the API later.

A reference implementation is `src/lib/services/application-filters.ts`.

### Page-level rules
- Top-level nav pages have **no** back arrow. Pages you drill into do.
- After a destructive or hand-off action that removes the record from the viewer's queue (return, reassign), go back to the queue.
- A form's success goes to the new record's detail page, or to the list when several records were created at once.

---

## 10. Responsive rules

| Breakpoint | Behaviour |
|---|---|
| < 640 (`sm`) | single column; 13px body; 16px inputs; filters behind a button; card lists instead of tables; full-width action-bar buttons |
| ≥ 640 | two-column info grids; tabs on one row; controls follow the 13px scale |
| ≥ 768 (`md`) | tables replace card lists |
| ≥ 1024 (`lg`) | side nav replaces bottom nav; sticky bars sit at `bottom-4`; toolbars go horizontal |

Always:
- Use `min-w-0` on flex children that hold text.
- No horizontal page scroll. Wide tables scroll inside `overflow-x-auto`.
- Touch targets are at least 40px (`min-h-10`, `size-10`).
- Account for safe areas (`pt-safe`, `env(safe-area-inset-bottom)`) in fixed and sticky elements.

---

## 11. Accessibility: the four POUR principles

The app targets **WCAG 2.2 level AA**. WCAG groups every rule under four principles, known as POUR. Each one below lists what it means here and how the app meets it.

### P: Perceivable

*People must be able to see or hear everything on screen, whatever their eyesight, screen size or settings.*

- **Contrast.** Body text and secondary text reach at least 4.5:1 against both the canvas and cards. Large text (18px+, or 14px+ bold) and icons that carry meaning reach 3:1. That's why `ink-muted` is `#5c6275` and not anything lighter. Don't fade text with opacity (`text-ink-muted/70`, `opacity-60`), and that includes placeholders. Re-check contrast whenever you add a token or tint.
- **Not by colour alone.** Status pills always carry their word. Errors pair the red with an icon and a message, and the active tab or nav item also has a shape (a fill or an underline).
- **Text alternatives.** Meaningful images have `alt` (for example, the seal on print-outs: `alt="City of Bislig official seal"`). Decorative icons, dots and illustrations are `aria-hidden="true"`. Icon-only buttons have an `aria-label`.
- **Readable size.** Labels never go below 12px (`text-xs`). The viewport never blocks pinch-zoom (no `user-scalable=no` or `maximum-scale`), and layouts must survive 200% text zoom without clipping.
- **Reflow.** Everything works at 320px wide with no horizontal page scroll (see §10).

### O: Operable

*People must be able to use every control, with a mouse, touch, keyboard or switch device.*

- **Keyboard.** Everything clickable is a real `<a>` or `<button>`. Never put `onclick` on a `div` or `span`, and never put a button inside another button. Tab order follows reading order, Enter/Space activate, and Escape closes menus, pickers and dialogs.
- **Visible focus.** A 2px accent outline (global `:focus-visible`). A component that removes it must draw its own ring (`focus-within:ring-3 ring-sidebar-active/15`).
- **Skip link.** The first Tab on every page shows **Skip to content**, which jumps past the nav and top bar to `<main id="main-content">`.
- **Touch targets.** At least 40px (`min-h-10`, `size-10`) for primary controls. Small inline controls, such as the × on a chip, are at least 24px (`size-6`).
- **Motion.** Under `prefers-reduced-motion`, CSS transitions and animations finish instantly (global rule in `layout.css`). JS-driven motion (`Spring`, Svelte `transition:`) checks `prefersReducedMotion.current` from `svelte/motion` and drops to 0 ms.
- **No time limits** on filling forms, and nothing flashes.

### U: Understandable

*People must be able to understand the information and how to use the app.*

- **Page titles.** Every route has a tab title, `"<Screen> · HRMIS"`, set in one place (`titleFor()` in `src/routes/+layout.svelte`). SvelteKit announces it to screen readers after each navigation. Add new top-level routes to `SECTION_TITLES` there.
- **Language.** `<html lang="en">`.
- **Labels and instructions.** Every field has a visible label, or an `aria-label` when the design has none (search boxes). Placeholders give examples; they never replace a label. Required fields say so.
- **Errors.** Say what's wrong and how to fix it, next to the field, in words (see §8). Never clear what the user typed.
- **Predictable.** Navigation, the action bar and the back link sit in the same place on every screen. Choosing an option never submits or navigates on its own. Destructive actions confirm first.

### R: Robust

*The app must work with browsers and assistive tech (screen readers, voice control) today and later.*

- **Native first.** Use the native element (`<button>`, `<a href>`, `<dialog>`, `<input>`, `<select>`) before adding ARIA.
- **Name, role, value.** Custom widgets expose them:
  - toggles: `aria-pressed`
  - tabs: `role="tab"` + `aria-selected`
  - current nav item: `aria-current="page"`
  - menus: `aria-haspopup` / `aria-expanded` + `role="menu"` / `menuitem`
  - pickers: `aria-haspopup="listbox"` + `role="listbox"` / `option` + `aria-selected`
- **Status messages.** Error toasts and form errors use `role="alert"`; other toasts use `role="status"`, so screen readers announce them without moving focus.
- **Landmarks.** One `<header>` and one `<main>` per screen. The side nav and bottom nav are each a `<nav aria-label="Primary">` (only one shows at a time).
- **Keep the checker clean.** `npx svelte-check` must report 0 accessibility warnings. Don't silence one with `svelte-ignore a11y_*` unless there's a written reason (the QR scanner's live camera feed has no captions to offer).

---

## 12. Print

- Printable documents (official forms) are their own routes with a small toolbar: a back link and a **Print** button (accent, `window.print()`). The toolbar is `print:hidden`.
- The document uses **fixed px sizes** and is not affected by the app's type scale. The paper is always white.
- Page margin is 12mm.
- Draft records can't be printed. The Print button only appears once something is official.

---

## 13. Checklist for a new screen

- [ ] Uses the tokens (`bg-card`, `text-ink`, `text-ink-muted`, `bg-sidebar-active/…`) and no raw hex colours
- [ ] Cards are `rounded-3xl shadow-soft`; detail and form pages are `max-w-3xl` and centred
- [ ] Status shown with `StatusPill` and the shared colour mapping
- [ ] Works at 360px wide, with no horizontal scroll and actions within thumb reach
- [ ] Looks right in light and dark mode
- [ ] Empty, loading and not-found states designed
- [ ] Back link goes to where the user came from; list state lives in the URL
- [ ] Destructive actions confirm; blocked actions explain why
- [ ] POUR (§11): text contrast ≥ 4.5:1 and no faded text; icon buttons and fields labelled; real buttons and links only, focus visible, keyboard works; route has a title in `+layout.svelte`; `svelte-check` shows no a11y warnings
