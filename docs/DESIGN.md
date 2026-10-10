# Design system

A calm, card-based UI for a personal payslip and expense tracker, styled like a paper ledger: warm paper canvas, serif figures, and payslips that look printed. It runs the same on desktop, tablet and phone, in light and dark mode, with one fixed accent colour (banknote green `#1F6B4F`).

This guide is written so you can copy it into another project. The class names are **Tailwind CSS v4 + daisyUI v5** utilities, the components are **Svelte 5**, and the icons are **Lucide**. The ideas carry over to other stacks; the exact classes only work with these tools.

---

## 1. Principles

1. **One accent colour.** Every neutral surface takes a small share of the accent, so the whole app feels built around it. The accent itself is the only saturated colour on screen, used for "you are here" and "do this".
2. **Cards on a paper canvas.** The page background is warm paper (`#F1EDE3`). Content sits on off-white (in dark mode, raised charcoal) cards with a soft shadow. There are no hard borders between sections. Inside a card, dashed hairlines (`border-dashed border-rule`) divide it like a ledger.
3. **Money reads like money.** Figures are set in the serif display face, with lining tabular numerals. Payslip lines are monospaced, with dotted leaders, a single rule above the totals and a double rule under net pay. Money going out (deductions, expenses) is `text-negative`, with a `−` sign.
4. **Rounded and soft.** Large radii (cards `rounded-3xl`, controls `rounded-full` or `rounded-xl`), one soft shadow, and short transitions of 150–200 ms.
5. **Status is colour-coded everywhere.** A record's state (Draft, Pending, Approved, Rejected…) always has the same colour, in pills, card washes and callouts.
6. **Phone first, desktop roomier.** Layouts stack on phones and spread out from `sm` and `lg` up. A form ends with its action bar, in the page flow.
7. **Explain, don't just block.** If something can't be done, a short note says why and what to do instead.
8. **Usable by everyone.** Every screen follows the four POUR principles (Perceivable, Operable, Understandable, Robust) of WCAG 2.2 at level AA. See [§11](#11-accessibility-the-four-pour-principles) for the rules.

---

## 2. Stack and setup

| Concern       | Choice                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Styling       | Tailwind CSS v4 (`@tailwindcss/vite`), daisyUI v5 as a plugin                                                                                                                                                                               |
| Font          | Plus Jakarta Sans Variable for body text (`@fontsource-variable/plus-jakarta-sans`), Fraunces for headings and figures (`@fontsource-variable/fraunces/soft.css`), JetBrains Mono for payslip lines (`@fontsource-variable/jetbrains-mono`) |
| Icons         | `@lucide/svelte`, imported one by one: `import Plane from '@lucide/svelte/icons/plane'`                                                                                                                                                     |
| Class merging | `clsx` + `tailwind-merge`, wrapped in a `cn()` helper                                                                                                                                                                                       |

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

| Token                                                                        | Role                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `sidebar-active`                                                             | **The accent.** Primary buttons, active nav and tabs, focus rings, selection, icon chips                    |
| `sidebar-active-ink`                                                         | Text on the accent (white in light mode, near-black on the lighter dark-mode green)                         |
| `positive` / `positive-ink`                                                  | Money in and success: gross pay, "adds up" checks                                                           |
| `negative`                                                                   | Money out: deductions and expenses                                                                          |
| `surface`                                                                    | Page background (paper canvas)                                                                              |
| `card`                                                                       | Card background                                                                                             |
| `rule`                                                                       | Hairlines on the payslip: dashed dividers, dotted leaders, total rules                                      |
| `ink`                                                                        | Body text and headings: `ledger` in light mode                                                              |
| `ledger`                                                                     | `#16201B`, a near-black green. Light-mode text, the strong (`accent`) button, the dark end of the auth hero |
| `ink-muted`                                                                  | Secondary text, labels, captions (not tinted)                                                               |
| `sidebar`, `sidebar-hover`, `sidebar-border`, `sidebar-ink`, `sidebar-muted` | Side navigation panel                                                                                       |

Paste this into your global stylesheet (`layout.css` / `app.css`):

```css
@import 'tailwindcss';
@plugin 'daisyui';

@theme {
	/* The sidebar and phone dock are a dark "ledger spine" in both themes. */
	--color-sidebar: var(--color-ledger);
	--color-sidebar-hover: color-mix(in oklch, var(--color-ledger) 88%, #f1ede3 12%);
	--color-sidebar-active: #1f6b4f; /* banknote green */
	--color-sidebar-active-ink: #ffffff;
	--color-sidebar-muted: #a3a59b; /* ≥ 4.5:1 on the sidebar */
	--color-sidebar-border: color-mix(in oklch, var(--color-ledger) 82%, #f1ede3 18%);
	--color-ledger: #16201b; /* near-black green: dark panels and the strong button */
	--color-sidebar-ink: #f6f2e8;
	--color-surface: #f1ede3; /* warm paper canvas */
	--color-ink: var(--color-ledger);
	--color-ink-muted: #5f5b52; /* ≥ 4.5:1 on the canvas and on cards */
	--color-card: #fffdf8;
	/* Hairlines on the payslip (rules, dotted leaders). */
	--color-rule: color-mix(in oklch, var(--color-ink) 24%, transparent);

	--color-positive: oklch(0.52 0.11 158);
	--color-positive-ink: #ffffff;
	/* Money going out: deductions, expenses. */
	--color-negative: oklch(0.5 0.13 35);

	--font-sans:
		'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
	/* Headings and the big figures. */
	--font-display: 'Fraunces Variable', ui-serif, Georgia, 'Times New Roman', serif;
	/* Payslip lines, like a printed slip. */
	--font-mono: 'JetBrains Mono Variable', ui-monospace, 'Cascadia Mono', Consolas, monospace;

	/* Compact type scale. Use these steps everywhere; no one-off text-[…] sizes. */
	--text-2xs: 0.6875rem; /* 11px — overlines, badges, dock labels only */
	--text-xs: 0.75rem; /* 12px — never smaller for labels */
	--text-sm: 0.78125rem; /* 12.5px — body text */
	--text-base: 0.875rem; /* 14px */
	--text-lg: 0.9375rem; /* 15px */
	--text-xl: 1.0625rem; /* 17px */
	--text-2xl: 1.1875rem; /* 19px */
	--text-3xl: 1.375rem; /* 22px */
	--text-4xl: 1.6875rem; /* 27px */
	--text-5xl: 2.125rem; /* 34px — the net pay figure */

	/* Dialog entry: fade + rise (ConfirmDialog). */
	--animate-dialog-in: dialog-in 160ms ease-out;
	@keyframes dialog-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
}

/* Phones: the larger steps shrink a little more; body and labels stay the same. */
@media (max-width: 639px) {
	:root {
		--text-base: 0.84375rem; /* 13.5px */
		--text-lg: 0.90625rem; /* 14.5px */
		--text-xl: 1rem; /* 16px */
		--text-2xl: 1.125rem; /* 18px */
		--text-3xl: 1.25rem; /* 20px */
		--text-4xl: 1.5rem; /* 24px */
		--text-5xl: 1.875rem; /* 30px */
	}
}

/* Light: daisyUI's neutrals warmed to paper, so inputs, borders and hovers match the canvas. */
:root[data-theme='light'] {
	--color-base-100: #fffdf8;
	--color-base-200: #f4f0e6;
	--color-base-300: #e2dbcb;
	--color-base-content: var(--color-ledger);
}

/* Dark: warm charcoal, like a ledger under a desk lamp.
   Sidebar = darkest (base-300), page = middle (base-200), cards = lightest (base-100).
   The accent is lightened so it still reads as text on dark cards. */
:root[data-theme='dark'] {
	--color-base-100: #201f1b;
	--color-base-200: #191814;
	--color-base-300: #12110e;
	--color-base-content: #ece7db;

	--color-sidebar-active: #5fb48d;
	--color-sidebar-active-ink: #0b1d14;
	--color-surface: var(--color-base-200);
	--color-card: var(--color-base-100);
	--color-ink: var(--color-base-content);
	--color-ink-muted: color-mix(in oklch, var(--color-base-content) 66%, transparent);
	--color-sidebar: var(--color-base-300);
	--color-sidebar-hover: color-mix(
		in oklch,
		var(--color-base-100) 88%,
		var(--color-sidebar-active) 12%
	);
	--color-sidebar-muted: color-mix(in oklch, var(--color-base-content) 66%, transparent);
	--color-sidebar-border: color-mix(
		in oklch,
		var(--color-base-100) 85%,
		var(--color-sidebar-active) 15%
	);
	--color-sidebar-ink: var(--color-base-content);
	--color-positive: oklch(0.72 0.12 158);
	--color-positive-ink: #0b1d14;
	--color-negative: oklch(0.74 0.12 40);
}

/* daisyUI's own primary (checkboxes, radios, spinners) is the brand accent too. */
:root[data-theme] {
	--color-primary: var(--color-sidebar-active);
	--color-primary-content: var(--color-sidebar-active-ink);
}

@layer base {
	html,
	body {
		height: 100%;
	}
	body {
		background-color: var(--color-surface);
		color: var(--color-ink);
		font-family: var(--font-sans);
		font-size: var(--text-base);
		font-feature-settings: 'cv11', 'ss01';
		@apply antialiased;
		overscroll-behavior-y: none; /* keeps a fixed bottom nav glued on iOS */
	}
	h1,
	h2,
	h3 {
		letter-spacing: -0.015em;
	}
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
	:is(.input, .select, .textarea):not(
		.input-xs,
		.input-sm,
		.select-xs,
		.select-sm,
		.textarea-xs,
		.textarea-sm
	) {
		font-size: var(--text-sm);
	}
}
.btn:not(.btn-xs, .btn-sm, .btn-lg) {
	font-size: var(--text-sm);
}

/* Reduced motion: CSS transitions and animations finish instantly. */
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}

/* Fraunces: softened corners, lining figures that line up in columns. */
@utility font-display {
	font-family: var(--font-display);
	font-variation-settings: 'SOFT' 50;
	font-feature-settings: 'lnum', 'tnum';
	letter-spacing: -0.02em;
}

/* The one card shadow. */
@utility shadow-soft {
	box-shadow:
		0 1px 2px rgb(40 32 16 / 0.05),
		0 8px 24px -12px rgb(40 32 16 / 0.14);
}

/* Payslip: a torn, zigzag bottom edge. A mask clips box-shadow, so put drop-shadow-soft
   on a parent instead. Leave about 1rem of bottom padding for the teeth. */
@utility slip-edge {
	--tooth: 14px;
	mask:
		linear-gradient(#000 0 0) top / 100% calc(100% - var(--tooth) / 2) no-repeat,
		conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / var(--tooth)
			calc(var(--tooth) / 2) repeat-x;
}
@utility drop-shadow-soft {
	filter: drop-shadow(0 1px 1px rgb(40 32 16 / 0.06)) drop-shadow(0 10px 14px rgb(40 32 16 / 0.1));
}

/* A dotted leader between a payslip label and its amount: label · · · · amount. */
@utility leader {
	flex: 1 1 1rem;
	min-width: 1rem;
	align-self: flex-end;
	margin-bottom: 0.4em;
	border-bottom: 1.5px dotted var(--color-rule);
}

/* Safe areas for notches and home indicators. */
@utility pb-safe {
	padding-bottom: env(safe-area-inset-bottom);
}
@utility pt-safe {
	padding-top: env(safe-area-inset-top);
}
@utility min-h-safe-screen {
	min-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}

@media print {
	@page {
		margin: 12mm;
	}
	body,
	.bg-surface {
		background: #fff;
	}
}
```

### Accent colour (fixed)

The accent is **banknote green** `#1F6B4F`, with white text (6.6:1). In dark mode it lightens to `#5FB48D` with near-black text, so it still reads as text on dark cards. There is no accent picker, so the palette is the same for everyone. To change it, edit `--color-sidebar-active` in `layout.css`.

### No flash on load

Put this in `app.html` (or `index.html`) `<head>` so the saved theme applies **before first paint**:

```html
<script>
	(function () {
		try {
			var stored = localStorage.getItem('app-theme');
			var mode =
				stored === 'light' || stored === 'dark'
					? stored
					: window.matchMedia('(prefers-color-scheme: dark)').matches
						? 'dark'
						: 'light';
			document.documentElement.setAttribute('data-theme', mode);
		} catch (e) {}
	})();
</script>
```

The theme toggle sets `data-theme="light" | "dark"` on `<html>` and saves the choice. With nothing saved, it follows the OS setting.

### Status colours

Use the same mapping in every place a status appears:

| Status                            | Pill (daisyUI badge)                                   | Wash / tone colour  |
| --------------------------------- | ------------------------------------------------------ | ------------------- |
| Approved                          | `badge-success`                                        | `--color-positive`  |
| Pending                           | `badge-warning`                                        | `--color-warning`   |
| Received                          | `badge-warning`                                        | `--color-warning`   |
| Submitted                         | `badge-info`                                           | `--color-info`      |
| In review (intermediate approval) | `badge-info`                                           | `--color-info`      |
| Rejected                          | `badge-error`                                          | `--color-error`     |
| Draft                             | `badge-neutral`                                        | `--color-ink-muted` |
| Cancelled                         | `badge-ghost`                                          | `--color-ink-muted` |
| Archived                          | `bg-base-300 text-ink-muted` chip with an archive icon | `--color-ink-muted` |

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

| Use                     | Classes                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Page title              | `font-display text-2xl sm:text-3xl font-semibold leading-tight text-ink`                                            |
| Detail title (hero)     | `text-lg sm:text-xl font-bold leading-snug`                                                                         |
| Card / panel title      | `font-display text-lg font-semibold` (panel), `text-sm font-semibold` (detail section)                              |
| Form step title         | `font-display text-lg font-semibold leading-tight`, numbered `01`, `02`… in `font-mono text-xs text-sidebar-active` |
| Body                    | `text-sm text-ink`                                                                                                  |
| Secondary               | `text-xs text-ink-muted` or `text-sm text-ink-muted`                                                                |
| Field label             | `text-xs font-medium`                                                                                               |
| Eyebrow / overline      | `font-mono text-2xs font-medium uppercase tracking-wider text-ink-muted`                                            |
| Big number              | `font-display text-5xl font-semibold leading-none` (net pay), `font-display text-lg font-semibold` (stat tiles)     |
| Payslip lines           | `font-mono text-xs tabular-nums`, `label <span class="leader"> amount`                                              |
| Numbers in tables/facts | add `tabular-nums`                                                                                                  |

Rules:

- Labels never go below 12px (`text-xs`), except overlines, badges and dock labels (`text-2xs`, 11px).
- **Use only the scale** (`text-2xs` … `text-5xl`). No one-off `text-[…]` sizes, so every page matches.
- **Clickable things show the hand cursor.** A base rule in `layout.css` covers buttons, tabs, menu items, `summary`, `select`, checkbox and radio labels; disabled controls keep the arrow.
- **Form fields use the body size (`text-sm`) everywhere**, phones included, so typed text matches the page. iOS Safari would zoom in on fields under 16px, so `app.html` sets `maximum-scale=1` on iPhone and iPad only; Safari still allows pinch-zoom there, and other platforms keep normal zoom. Placeholders, currency symbols and suffixes are `text-sm`/`text-xs` too.
- **Info helpers:** `InfoTip` puts a small ⓘ button next to a control that needs explaining. It opens a dark bubble with one or two sentences on tap or click, and closes on Escape, a tap elsewhere or focus moving away.
- Long user text that keeps its line breaks uses `whitespace-pre-line`. Anything that might overflow uses `break-words` / `truncate` / `line-clamp-*` with `min-w-0` on the flex child.

---

## 5. Shape, depth, motion

|                         | Value                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Card radius             | `rounded-3xl` (big cards), `rounded-2xl` (callouts, bars, menus, dialogs)                                          |
| Control radius          | `rounded-full` (pills, search, tabs, icon buttons), `rounded-xl` (nav items, choice cards), `rounded-lg` (buttons) |
| Icon chip               | `grid place-items-center rounded-full` or `rounded-xl`/`rounded-2xl`, sizes `size-7`–`size-12`                     |
| Card shadow             | `shadow-soft` (the only card shadow)                                                                               |
| Hover lift              | `hover:shadow-[0_12px_32px_-14px_rgb(16_24_40/0.3)]`                                                               |
| Floating bars and menus | `shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)]` + `bg-card/90 backdrop-blur-md`                                        |
| Dialog                  | `shadow-[0_20px_60px_-15px_rgb(0_0_0/0.45)]`, backdrop `bg-black/40 backdrop-blur-[2px]`                           |
| Hairline                | `border-base-300/70`                                                                                               |
| Transitions             | `duration-150` (controls), `duration-200` (tabs, shadows); press feedback `active:scale-[0.98]`                    |
| Layout springs          | critically damped (`stiffness 0.25, damping 1`), and instant when `prefers-reduced-motion` is on                   |

Tinted fills use opacity steps: `/[0.06]`–`/[0.08]` for callout backgrounds, `/10`–`/12` for icon chips and active nav, `/30` for callout borders.

---

## 6. App shell

```
Phones (< md)              Tablets (md)            Desktops (lg+)
┌─────────────────────┐    ┌──┬──────────────┐    ┌────────┬───────────────┐
│ Top bar (hides on ↓)│    │▮▮│              │    │ Ledger │               │
│                     │    │▮▮│   <main>     │    │ spine  │   <main>      │
│ <main>              │    │▮▮│              │    │ (wide, │ max-w-[88rem] │
│                     │    │  │              │    │ or the │               │
│ ╭── dark dock ────╮ │    │▮▮│              │    │ rail)  │               │
│ ╰─────────────────╯ │    └──┴──────────────┘    └────────┴───────────────┘
└─────────────────────┘    icon rail + tooltips
```

- **Canvas:** `bg-surface flex min-h-dvh`. Content is capped at `max-w-[88rem]` and centred. Each new section rises in (`fly y:8`); with reduced motion there's no animation.
- **Side nav (md+), the "ledger spine":** a dark floating panel in both themes, `bg-sidebar text-sidebar-ink ring-1 ring-sidebar-border rounded-[1.75rem] sticky top-3 my-3 ml-3 h-[calc(100dvh-1.5rem)] z-40`.
  - On tablets (md) it is always an 80px icon rail. From lg up it is 256px wide and can collapse to the rail (remembered in `localStorage`).
  - In the rail, labels become `sr-only` and a tooltip (`bg-ink text-card`) shows on hover or focus.
  - From top to bottom: the brand, the nav (a "Menu" overline, then "More"), and a footer with the user card (avatar, greeting and name), the theme toggle, Log out and Collapse.
  - Focus rings inside it use `sidebar-ink`, because the green accent doesn't show on the dark panel.
- **Nav item:** `rounded-2xl min-h-11 px-3 text-sm font-medium`.
  - Active: a paper pill, `bg-sidebar-ink text-sidebar font-semibold`, with a small green dot on the right in the wide mode.
  - Inactive: `text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink`.
- **Top bar (phones only):** `sticky top-0 h-14 px-4 pt-safe md:hidden`. It holds the brand, the theme toggle and the account menu. It slides away (`-translate-y-full`) while you scroll down past 72px, and comes back when you scroll up or while it has focus. Once scrolled it frosts: `bg-surface/80 backdrop-blur-md`.
- **Dock (phones only):** a dark floating bar, `fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-w-md rounded-[1.75rem] bg-sidebar p-1.5`. It holds the 4–5 "primary" items, each an icon over a label (`text-2xs font-semibold`). A paper pill (`bg-sidebar-ink`) slides to the current tab with a slight overshoot.
- **Main:** `px-4 pt-2 pb-32 sm:px-6 md:pt-6 md:pb-10 lg:px-10 lg:pt-8`. The bottom padding on phones keeps content clear of the dock.
- **Single nav source:** one `navItems` array (label, href, icon, `visible(user)`, `primary`, `group`) drives the side nav, the bottom nav, and the rule for which pages show a back arrow.
- **Print:** the shell hides itself with `print:hidden!`, and `<main>` drops its padding with `print:p-0!`.

### Page widths

| Page type             | Container                                               |
| --------------------- | ------------------------------------------------------- |
| Lists, dashboards     | full width: `flex flex-col gap-4`                       |
| Detail and form pages | `mx-auto w-full max-w-3xl flex flex-col gap-4 sm:gap-5` |

### Login

A two-column page on `lg`.

- **Left:** a hero card, `rounded-[2rem] p-10 text-white`, with the fixed background `linear-gradient(160deg, #1f6b4f, #16201b 75%)` (green to ledger), so it looks the same in both themes. It holds a decorative sample payslip, tilted slightly with a torn edge, a serif headline, and outlined feature pills (`rounded-full border-white/20 bg-white/10`).
- **Right:** the form. On phones, only the form is shown.

---

## 7. Components

Each component lists what it is and its key classes.

### Button

Variants map to intent:

| Variant     | Use                            | Classes                                                          |
| ----------- | ------------------------------ | ---------------------------------------------------------------- |
| `primary`   | main action                    | `bg-sidebar-active text-sidebar-active-ink hover:brightness-110` |
| `accent`    | **submit / go** (Save payslip) | `bg-ink text-card hover:bg-ink/88` (ledger ink)                  |
| `secondary` | other actions (print, edit)    | `border border-base-300 text-ink hover:bg-base-200`              |
| `ghost`     | low-emphasis                   | `text-ink-muted hover:bg-base-200 hover:text-ink`                |
| `danger`    | destructive confirm            | `bg-error text-white hover:brightness-110`                       |

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
7. **DetailActions:** the action bar (below).

### Action bar (forms and details)

`rounded-3xl bg-card p-4 sm:px-6 shadow-soft`: the **last card of the form**, in the page flow. It doesn't float or stick.
- **Keep it minimal, one row on every screen:** a save state (a small coloured dot plus "Unsaved changes" / "Saved" / "Not saved yet", in `text-xs`) on the left; on the right, secondary actions as icon buttons (e.g. a trash icon with `aria-label`, red on hover, which still confirms) and the main button. No totals or summaries in the bar.
- **Next to a side panel** (the payslip page from `xl`), it sits in the form's column at the form card's width; on phones it comes last, after the panel.

- **Form version:** a short summary on the left ("3 employees · 12 hrs"). On the right, "Save as draft" (secondary) and **Submit** (accent).
- **Detail version:** the buttons stretch to fill the row on phones (`min-w-[9rem] flex-1`) and align right on desktop. The bar hides itself if it has no buttons.
- While working, button labels change to "Submitting…" / "Saving…".

### FormSection

One numbered step of a long form: `form-surface bg-card shadow-soft rounded-3xl`.

- The header is numbered like a ledger entry: `01`, `02`… in `font-mono text-xs font-semibold text-sidebar-active`, then a `font-display text-lg` title and a description, plus an optional action on the right (e.g. "Add row"). A dashed hairline (`border-b border-dashed border-rule`) separates it from the fields.
- The body stacks fields with `gap-4 sm:gap-5`.
- `.form-surface` styles the inputs inside it:

```css
@layer components {
	.form-surface :is(.input, .select, .textarea) {
		border-radius: 0.625rem;
		background-color: var(--color-base-100);
		transition:
			border-color 150ms,
			box-shadow 150ms;
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
	.form-surface .textarea {
		resize: vertical;
		line-height: 1.5;
	}
	.form-surface :is(.input, .textarea)::placeholder {
		color: var(--color-ink-muted);
		opacity: 0.7;
	}
	@media (max-width: 639px) {
		.form-surface :is(.input, .select, .textarea):not(.input-sm, .select-sm, .textarea-sm) {
			font-size: 1rem;
		}
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

| Tone                | Classes                                                               |
| ------------------- | --------------------------------------------------------------------- |
| Neutral / info note | `border-base-300 bg-base-200/60`, icon `text-ink-muted`               |
| Success             | `border-positive/30 bg-positive/[0.07] text-positive`                 |
| Warning             | `border-warning/40 bg-warning/[0.08] text-warning`                    |
| Error / remarks     | `border-error/30 bg-error/[0.06]`, icon chip `bg-error/10 text-error` |

The title is bold `text-ink`, with a muted sentence after it.

### EmptyState

A dashed card, `rounded-2xl border border-dashed border-base-300/70 bg-card px-6 py-14 text-center`. It holds an accent icon in a soft circle, one bold line and an optional short hint (`max-w-xs`), plus an optional action. Use it for "not found" and "nothing yet".

### ConfirmDialog

For actions that can't be undone. It uses the native `<dialog>` with `showModal()`, so focus stays inside it and Escape or a backdrop click cancels.

- **Layout:** centred, `max-w-sm rounded-2xl`, with an error-tinted icon circle, a title and a message. Cancel (secondary) and Confirm (danger) sit side by side.
- **While confirming:** the dialog stays open with a spinner until the action finishes.
- **Entry animation:** fade + rise in 160 ms.

### Period picker

A pill above the payslip: `rounded-full bg-card p-1 shadow-soft`, with ‹ and › links either side and the **dates as a button** in the middle (`font-display` range, a pencil icon, and a `font-mono text-2xs uppercase` line such as "7 days · includes today"). Tapping the dates opens the date sheet. › is shown but disabled when the next payslip would start after today, so the layout doesn't shift. A "Go to latest" secondary button appears beside it when you're not on the next payslip to fill in.

### Date sheet (PeriodSheet)

A native `<dialog>` like ConfirmDialog: a **bottom sheet on phones** (`max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none`, safe-area padding), a centred `max-w-md` card from `sm` up.

- **Quick picks** as pill buttons with `aria-pressed` (selected = accent fill), then **Start** and **End** date inputs side by side.
- A live line under the inputs shows the range and day count, or the problem in `text-error` (bad dates, too long, starts after today, overlaps a saved payslip by name).
- If the new dates drop days that have hours, a warning Callout lists them and the button becomes **Remove hours and apply**.
- Apply (accent) is disabled while there's a problem or nothing changed.

### Payslip form (ledger rows)
The entry side mirrors the printed slip: **one card**, `form-surface rounded-3xl bg-card shadow-soft`, headed "YOUR PAYSLIP" (`font-mono tracking-[0.2em] uppercase`) with a "How to fill this in" link to Help.
- Sections are split by dashed hairlines (`border-t border-dashed border-rule px-4 py-3.5 sm:px-6`) and titled in `font-mono text-2xs uppercase tracking-widest text-ink-muted`. No per-section descriptions.
- **Rows:** `grid grid-cols-[minmax(0,1fr)_8.5rem] sm:grid-cols-[minmax(0,1fr)_10rem]`: label on the left, a right-aligned amount on the right (`h-9`, `[&_input]:text-right`). A short note sits under a label as `block text-xs text-ink-muted` (e.g. "Take-home amount", "Per day").
- Section headings carry live totals (deductions in `text-negative` with "−", total hours) and small accent "+ Add" pills.
- Hours: a 7-cell strip (also on phones); periods over 7 days use the calendar.
- **Extras** each take two lines: the name and its total (mono, right) on top, what to fill in underneath, then a one-line note. Per day reads as a sentence, "[£35] a day × [5] days", with "up to N days in this payslip" below. Per payslip uses a toggle labelled "Paid this time". A one-off bonus has its name field and amount on one line with a remove button.
- Unused parts are one line ("Overtime · None set up · Add rates in Settings", "+ Add a note"), never hidden.
- Errors show under the row, right-aligned below the amount.

### Payslip panel (the printed slip)

The reverse payslip looks printed: `drop-shadow-soft` on the wrapper, `slip-edge` (a torn zigzag bottom, via a mask) on a `rounded-t-3xl bg-card` card.

- Header: "PAYSLIP" in `font-mono tracking-[0.2em] uppercase`, the period under it, and a soft accent "Updates as you type" pill.
- **Net pay** in `font-display text-5xl`, then a row of three StatTiles (Gross, Rate, Hours) on `bg-base-200/70`.
- Lines in `font-mono text-xs tabular-nums`: `label · · · · amount` with the `leader` utility; deductions in `text-negative` with a minus sign; a rule above Gross, and a single rule above plus a double rule under Net pay (accounting style).
- Before net pay is entered, faded placeholder lines and one hint.

### Help page

One topic at a time. From `lg`: a sticky grouped list (Guides, Reference) beside the topic card, as ARIA tabs with arrow keys. Below `lg`: a native "Topic" `<select>` with `<optgroup>`s. The open topic is the URL hash (`/help#dates`). Guides show "Guide N of 7", numbered steps (accent circles) with on-screen words in **bold**, an optional note, and Previous / Next at the bottom. Keep every step one short sentence.

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

| Breakpoint    | Behaviour                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| < 640 (`sm`)  | single column; 13px body; 16px inputs; filters behind a button; card lists instead of tables; full-width action-bar buttons |
| ≥ 640         | two-column info grids; tabs on one row; controls follow the 13px scale                                                      |
| ≥ 768 (`md`)  | tables replace card lists                                                                                                   |
| ≥ 1024 (`lg`) | side nav replaces bottom nav; sticky bars sit at `bottom-4`; toolbars go horizontal                                         |

Always:

- Use `min-w-0` on flex children that hold text.
- No horizontal page scroll. Wide tables scroll inside `overflow-x-auto`.
- Touch targets are at least 40px (`min-h-10`, `size-10`).
- Account for safe areas (`pt-safe`, `env(safe-area-inset-bottom)`) in fixed and sticky elements.

---

## 11. Accessibility: the four POUR principles

The app targets **WCAG 2.2 level AA**. WCAG groups every rule under four principles, known as POUR. Each one below lists what it means here and how the app meets it.

### P: Perceivable

_People must be able to see or hear everything on screen, whatever their eyesight, screen size or settings._

- **Contrast.** Body text and secondary text reach at least 4.5:1 against both the canvas and cards. Large text (18px+, or 14px+ bold) and icons that carry meaning reach 3:1. That's why `ink-muted` is `#5c6275` and not anything lighter. Don't fade text with opacity (`text-ink-muted/70`, `opacity-60`), and that includes placeholders. Re-check contrast whenever you add a token or tint.
- **Not by colour alone.** Status pills always carry their word. Errors pair the red with an icon and a message, and the active tab or nav item also has a shape (a fill or an underline).
- **Text alternatives.** Meaningful images have `alt` (for example, the seal on print-outs: `alt="City of Bislig official seal"`). Decorative icons, dots and illustrations are `aria-hidden="true"`. Icon-only buttons have an `aria-label`.
- **Readable size.** Labels never go below 12px (`text-xs`). The viewport never blocks pinch-zoom (no `user-scalable=no` or `maximum-scale`), and layouts must survive 200% text zoom without clipping.
- **Reflow.** Everything works at 320px wide with no horizontal page scroll (see §10).

### O: Operable

_People must be able to use every control, with a mouse, touch, keyboard or switch device._

- **Keyboard.** Everything clickable is a real `<a>` or `<button>`. Never put `onclick` on a `div` or `span`, and never put a button inside another button. Tab order follows reading order, Enter/Space activate, and Escape closes menus, pickers and dialogs.
- **Visible focus.** A 2px accent outline (global `:focus-visible`). A component that removes it must draw its own ring (`focus-within:ring-3 ring-sidebar-active/15`).
- **Skip link.** The first Tab on every page shows **Skip to content**, which jumps past the nav and top bar to `<main id="main-content">`.
- **Touch targets.** At least 40px (`min-h-10`, `size-10`) for primary controls. Small inline controls, such as the × on a chip, are at least 24px (`size-6`).
- **Motion.** Under `prefers-reduced-motion`, CSS transitions and animations finish instantly (global rule in `layout.css`). JS-driven motion (`Spring`, Svelte `transition:`) checks `prefersReducedMotion.current` from `svelte/motion` and drops to 0 ms.
- **No time limits** on filling forms, and nothing flashes.

### U: Understandable

_People must be able to understand the information and how to use the app._

- **Page titles.** Every route has a tab title, `"<Screen> · HRMIS"`, set in one place (`titleFor()` in `src/routes/+layout.svelte`). SvelteKit announces it to screen readers after each navigation. Add new top-level routes to `SECTION_TITLES` there.
- **Language.** `<html lang="en">`.
- **Labels and instructions.** Every field has a visible label, or an `aria-label` when the design has none (search boxes). Placeholders give examples; they never replace a label. Required fields say so.
- **Errors.** Say what's wrong and how to fix it, next to the field, in words (see §8). Never clear what the user typed.
- **Predictable.** Navigation, the action bar and the back link sit in the same place on every screen. Choosing an option never submits or navigates on its own. Destructive actions confirm first.

### R: Robust

_The app must work with browsers and assistive tech (screen readers, voice control) today and later._

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
