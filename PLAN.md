# Payslip Tracker: Project Plan

A simple, phone-first web app that turns a bare payslip (net pay + deductions) into a detailed "reverse payslip", tracks week-over-week earnings, and tracks expenses. Works in any country and currency; nothing is hardcoded.

## 1. Goals

- Enter the net pay and deductions from a payslip, plus hours worked, overtime, and extras. The app works out gross pay, the real hourly rate, and a full breakdown.
- Compare each week against the last: net, hourly rate, hours, OT, extras.
- Track expenses and see income vs expenses.
- Everything is configurable: currency, deduction names, extra-pay types, OT multipliers, expense categories.
- Usable on phone and computer, synced, free to host, safe from losing data.
- Primary user is one person; a second account (separate data) must also work.

## 2. Tech stack

| Layer            | Choice                              | Why                                                                                                                                                         |
| ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework        | SvelteKit (Svelte 5)                | Short, simple code for forms and live calculations                                                                                                          |
| Hosting          | Vercel (`@sveltejs/adapter-vercel`) | Free, deploys from GitHub                                                                                                                                   |
| Database         | **Neon (serverless Postgres)**      | Free tier does not pause or delete the project after inactivity. Compute sleeps when idle and wakes in about a second on the next request, and data stays.  |
| ORM / migrations | Drizzle ORM + drizzle-kit           | Typed queries, simple migrations                                                                                                                            |
| Auth             | Better Auth (email + password)      | Works with SvelteKit and Drizzle, no extra service                                                                                                          |
| Charts           | Chart.js                            | Plain and reliable                                                                                                                                          |
| Phone install    | `@vite-pwa/sveltekit`               | Add to home screen like an app                                                                                                                              |
| Styling          | Tailwind CSS + daisyUI              | Ready-made, mobile-friendly components (buttons, inputs, cards, tabs, modals, toasts, skeletons, stats) with built-in light/dark themes, so less custom CSS |

**Fallback option:** Supabase also works, but its free projects pause after about 7 days of inactivity. If you prefer Supabase (built-in auth, simpler setup), add a Vercel cron job that pings the database every few days to keep it awake. Free-tier terms change, so check the current limits for both before committing.

**Safety net regardless of database:** a "Download backup" button (JSON and CSV export) in Settings, and an "Import backup" button.

## 2a. Free-tier rules (stay within limits without hurting the UX)

How Neon's free plan behaves: the database compute sleeps after 5 minutes idle and wakes on the next query in a few hundred milliseconds. Data is never lost by sleeping. The free plan includes 100 compute-hours per month, which normal use (even 150 visits a week) stays well under. The only way to blow through it is keeping the database awake around the clock, so the rules below are about not doing that, while keeping the app fast and convenient.

**Rule 1: No background database activity.**

- No polling (`setInterval` fetches), no auto-refresh timers, no realtime subscriptions, no keep-alive pings, no cron jobs that touch the database.
- The database is only queried when the user opens a screen or does something.

**Rule 2: It must still feel fresh and instant.** These are all user-triggered, so they cost nothing extra:

- Refetch when the app is opened, when it returns to the foreground (`visibilitychange`), and after every save.
- A pull-to-refresh or refresh button on History and Expenses.
- Show cached data first, then update it quietly (stale-while-revalidate). Cache the last-loaded Settings lists, History, and Expenses on the device (localStorage or IndexedDB, via the PWA) so screens render immediately, even while the database is waking up.

**Rule 3: Hide the wake-up delay.**

- Render the app shell and skeleton placeholders immediately; never a blank screen or full-page spinner.
- Use Neon's serverless driver. Wrap queries in a small helper that retries a failed connection up to 2 times with a short delay (about 500 ms) before showing an error.
- If it still fails, show a friendly message with a "Try again" button, not a technical error.

**Rule 4: Never lose what he typed.**

- Autosave the in-progress This Week form and any half-entered expense to the device as he types. Restore it if the page reloads or the connection fails.
- The Save button shows a pending state, and the entry stays on screen until the save succeeds.

**Rule 5: Fewer requests per action.**

- One data load per screen (not one per component).
- Saving a week is a single request that writes the week, days, OT, deductions, and extras in one transaction.
- This means one wake-up serves a whole session.

**Optional later:** if he adds expenses somewhere with no signal, queue them on the device and sync when he is back online.

**Acceptance checks:**

- After the database has been idle 10+ minutes, the screen layout appears instantly and the data appears within about 2 seconds.
- With the app open in a background tab, there are no network requests to the database.
- A save that fails once because of a cold start succeeds on automatic retry without losing input.
- Check the Neon dashboard's usage page now and then; it should stay at a few compute-hours per month.

## 3. How the reverse payslip works

Inputs for a week:

- Net pay (from payslip)
- Each deduction amount (from payslip)
- Hours per day (regular hours; OT is entered separately)
- OT hours, per OT rate (for example "OT" at 1.25, "Double time" at 2.0)
- Extras: per-day extras with a number of days (for example "Other shift" at 35 x 3 days), per-week extras, and one-off bonuses

Calculation:

```
total_deductions = sum(deductions)
gross            = net + total_deductions
extras_total     = sum(extra.unit_amount * extra.quantity)  (bonuses: quantity = 1)
pay_from_hours   = gross - extras_total
weighted_hours   = regular_hours + sum(ot_hours * ot_multiplier)
hourly_rate      = pay_from_hours / weighted_hours
regular_pay      = hourly_rate * regular_hours
ot_pay[i]        = hourly_rate * ot_hours[i] * multiplier[i]
check            = regular_pay + sum(ot_pay) + extras_total - total_deductions == net
```

Edge cases to handle:

- `weighted_hours` is 0 means no rate; show a message, not a crash.
- `pay_from_hours` is 0 or negative means warn that the extras are larger than the gross; probably a typo.
- Rounding: calculate in minor units (cents/pence) and round only the displayed rate. Make sure the line items add back to net, and put any 1-cent rounding difference on regular pay.
- Currencies with no decimals (such as JPY): use `Intl.NumberFormat` to get the right number of decimal places.

Rate check: if the user saves a "usual rate" in Settings, flag any week whose computed rate differs by more than a tolerance (default 2%, configurable). This catches payslip errors or missing OT.

Put all of this in one pure, tested file: `src/lib/calc/reversePayslip.ts`. No database or UI code in it.

## 4. Screens

1. **This Week** (home): week picker (pay week starts on the configured day, default Monday), net pay, deductions list (built from his saved deduction types), daily hours grid, OT hours rows, extras section, then the generated reverse payslip below, with a Save button.
2. **History**: list and chart of weekly net, gross, hourly rate, hours, OT, extras, with "vs last week" differences (amount and %). Tap a week to open it. Filter by currency.
3. **Expenses**: quick add (amount, category, date, note), list, monthly totals by category, income vs expenses for the month.
4. **Settings**: currency, week start day, date format, usual rate and tolerance, plus managers for deduction types, extra types, OT rates, and expense categories (add, rename, reorder, hide). Setup templates and backup/restore live here too.
5. **Login / Register**.

## 5. Configurability rules

- No country-specific names in the code. Deductions, extras, and categories are all user data.
- **Starter templates** on first setup: Blank (default), UK, Philippines, US. A template only pre-fills the lists.
- **Weeks are snapshots.** Each saved week stores its own currency, deduction names and amounts, extra names and amounts, and OT names and multipliers. Renaming or deleting a setting never changes history.
- **No automatic currency conversion.** Totals and charts are grouped by currency. A combined view can use a manually entered exchange rate later.

## 6. Data model

All amounts: `numeric(12,2)`. Every user-owned table has `user_id`, and **every query must filter by the signed-in user's id** (there is no row-level security here, so do this in one shared helper).

Auth tables are created by Better Auth. App tables:

- `settings`: user_id (unique), currency, week_start_day, date_format, usual_rate (nullable), rate_tolerance_pct
- `deduction_types`: id, user_id, name, sort_order, active
- `extra_types`: id, user_id, name, kind (`per_day` | `per_week`), default_amount, active
- `ot_rates`: id, user_id, name, multiplier, active
- `expense_categories`: id, user_id, name, sort_order, active
- `weeks`: id, user_id, week_start (date), currency, net_pay, total_deductions, gross_pay, extras_total, pay_from_hours, regular_hours, hourly_rate, notes. Unique on (user_id, week_start).
- `week_days`: id, week_id, date, hours
- `week_ot`: id, week_id, name, multiplier, hours
- `week_deductions`: id, week_id, name, amount
- `week_extras`: id, week_id, name, kind, unit_amount, quantity, amount
- `expenses`: id, user_id, date, amount, currency, category_name, note

## 7. Project structure

```
src/
  lib/
    calc/reversePayslip.ts        # pure math + tests
    server/db.ts                  # Neon + Drizzle client
    server/schema.ts              # Drizzle tables
    server/auth.ts                # Better Auth setup
    server/queries.ts             # user-scoped query helpers
    format/money.ts               # Intl currency formatting
    templates.ts                  # UK / PH / US / Blank presets
  routes/
    +layout.svelte                # bottom nav, theme
    +page.svelte                  # This Week
    history/+page.svelte
    expenses/+page.svelte
    settings/+page.svelte
    login/+page.svelte
drizzle/                          # migrations
```

## 8. Build phases

Build and test one phase at a time; commit after each.

1. **Setup**: SvelteKit project, Drizzle + Neon connection, Better Auth with register/login/logout, protected routes, deploy a "hello" page to Vercel early to confirm the pipeline works. Use Neon's serverless driver and add the retry-on-connect helper from section 2a. No polling anywhere. Add Tailwind CSS (current version, via SvelteKit's `sv add tailwindcss`) and install daisyUI as a Tailwind plugin; set up the light and dark themes in `app.css`.
2. **Settings**: currency, week start, and the four configurable lists with templates.
3. **Calculation**: `reversePayslip.ts` with unit tests (normal week, no OT, extras only, zero hours, negative case, rounding).
4. **This Week**: the form built from settings, live reverse payslip, save and edit a week (single-request save, form draft autosaved on the device, per section 2a).
5. **History**: list, chart, week-over-week comparison, rate-check flag.
6. **Expenses**: add, list, monthly totals, income vs expenses.
7. **Backup**: export and import JSON, CSV export.
8. **Polish**: mobile layout, PWA install, empty states, friendly error messages, skeleton loading states, cached data shown first with quiet refresh, refetch on app foreground, pull-to-refresh. Run the section 2a acceptance checks.

UI guidance (daisyUI): use its components rather than custom CSS where possible, namely `navbar`/`dock` for the bottom nav, `card` for weeks and the payslip, `stats` for the key numbers (gross, hourly rate, net), `tabs` for screen sections, `modal` for confirmations, `toast` for save and error messages, and `skeleton` for loading states. Keep tap targets large (at least 44px), inputs using numeric keypads on phones (`inputmode="decimal"`), and support light/dark theme following the phone's setting with a manual toggle in Settings.

## 9. Environment variables

```
DATABASE_URL=            # Neon connection string
BETTER_AUTH_SECRET=      # long random string
BETTER_AUTH_URL=         # http://localhost:5173 locally, the Vercel URL in production
```

Set these in a local `.env` (never commit it) and in the Vercel project settings.

## 10. Setup steps (one-time)

1. Create a free Neon project and copy the connection string.
2. Create the SvelteKit project, install dependencies, add `.env`.
3. Run Drizzle migrations against Neon.
4. Push the repo to GitHub, import it in Vercel, add the environment variables, deploy.
5. Register the first account on the live site.

## 11. Out of scope for now

Automatic tax calculation, currency conversion, payslip photo/OCR, multiple employers per user, notifications. These can be added later.

## 12. Starter prompt for Claude Code

> Read PLAN.md. Start with Phase 1 only: set up the SvelteKit project with Drizzle + Neon and Better Auth, with register/login/logout and protected routes. Stop when it runs locally and tell me what to test before moving on.
