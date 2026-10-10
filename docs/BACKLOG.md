# Backlog: decisions and ideas

A running list of what still needs deciding, what must happen before a release, and ideas for later. It sits alongside [PLAN.md](../PLAN.md) (the original roadmap) and [DESIGN.md](DESIGN.md) (the design system).

**How to use it:** add an item whenever something comes up. When a question is answered, move it to [Decided](#decided) with the date and the answer. Tick off release items as they're done.

_Last updated: 2026-10-10_

---

## Where things stand

Current work: **flexible pay periods.** A payslip covers 1 to 62 days, rather than always a week.

| Phase | What | Status |
|---|---|---|
| 0 | Prep: week fix pushed, local `.env` on the Neon `dev` branch | ✅ Done |
| 1 | Date rules and tests (`src/lib/period.ts`) | ✅ Committed |
| 2 | Migration 0003: `weeks` → `pay_periods` (dev branch only) | ✅ Committed |
| 3 | Form and validation for any period length | ✅ Committed |
| 4 | Queries, server, `?period=` URLs, overlap checks | ✅ Committed |
| 5 | Payslip page UI: date sheet, calendar hours grid, "Payslip" wording | ✅ Committed |
| 6 | Settings: "How often are you usually paid?" replaces the week start day; migration 0004 drops `week_start_day` (dev branch only) | ✅ Committed |
| 7 | Docs and naming cleanup: payslip names in the code, PLAN.md and DESIGN.md updated | ✅ Committed |
| 8 | Release: back up, migrate production, push | ⏳ Next (needs decision 5) |

> ⚠️ **Don't push `main` until Phase 8.** Local `main` has unpushed commits (check with `git log origin/main..main`), and from Phase 2 on it expects the `pay_periods` tables. Production still has `weeks`, so pushing first would break the live site.

---

## Needs a decision

### 1. "Enter total hours instead" for long periods
Periods over 7 days show one hours box per day (a calendar). The plan offered a single "total hours" box as an alternative for long periods, but it isn't built yet.
- **Why it matters:** each day's hours are saved as a row, and History will later rely on those rows.
- **Options:**
  - **(a)** Skip it. The calendar already handles 31 days.
  - **(b)** Add a `total_hours` mode: the payslip stores a total and no day rows, and History treats those payslips as having no daily detail.
  - **(c)** Spread the total evenly across the days. This is simple, but it invents numbers.
- **Suggestion:** (a) for now. Revisit if typing each day becomes a pain.

### 2. "1 month" periods that start late in the month
"1 month" runs to the day before the same date next month: Mar 1 → Mar 31, Oct 16 → Nov 15. From the 29th to the 31st it can come up short (Jan 31 → Feb 27).
- **Options:**
  - **(a)** Keep it. You can always change the dates.
  - **(b)** Add an end-of-month rule: a start on the last day of a month runs to the second-to-last day of the next month.
  - **(c)** Make "1 month" a calendar month (1st to the last day) only.
- **Suggestion:** (a), unless you're paid monthly from a late-month start.

### 3. Pay date on the payslip
The database has an optional `pay_date` column (Phase 2), but nothing sets it yet. When it's empty, the end date stands in for it.
- **Question:** add a "Paid on" field to the payslip now, or when History is built (where it decides which month a payslip counts in)?
- **Suggestion:** add it with History.

### 4. Template item called "Weekly bonus"
The UK and US templates include an extra named **Weekly bonus**, of kind "per payslip". With flexible periods the name can read oddly.
- **Options:**
  - **(a)** Rename it to "Bonus" in the templates. This only affects new setups; existing items keep their names.
  - **(b)** Leave it.
- **Suggestion:** (a).

### 5. Which database does Vercel use?
I've assumed Vercel's `DATABASE_URL` points at the Neon **production** branch (`ep-damp-cake-…`). This is unconfirmed.
- **Why it matters:** Phase 8 migrates that database.
- **To do:** check in Vercel → Settings → Environment Variables before Phase 8.

---

## Before going live (Phase 8 checklist)

- [ ] Confirm Vercel's `DATABASE_URL` is the production branch (decision 5).
- [ ] In Neon, create a backup branch from production, e.g. `backup-before-pay-periods`.
- [ ] Run migrations 0003 (pay periods) and 0004 (drop `week_start_day`) on production.
- [ ] Check production: old weeks show as 7-day periods, and an overlapping save is refused.
- [ ] Push `main` to GitHub so Vercel deploys.
- [ ] On the live site: open an old payslip, save a 1-day payslip, check an old `?week=` link redirects.
- [ ] Point local `.env` back at the dev branch, if it was switched for the migration.

---

## Ideas for later

- **History page** (planned): list and chart of past payslips, comparisons, the rate-check flag. It should read the **stored totals**, so a future change to the maths never changes old payslips. Group by pay date (decision 3).
- **Expenses page** (planned): quick add, monthly totals by category, income vs expenses.
- **Backup:** JSON export and import, CSV export (PLAN.md phase 7).
- **Named pay patterns:** saved setups like "Regular week" or "Day gig", each with its own length and optionally its own deductions, chosen per payslip. This was deferred in favour of a single usual length.
- **"Twice a month" pay length** (e.g. the 15th and the last day), common in the Philippines. It doesn't fit day / week / 2 weeks / month. Would need a fifth usual length with a calendar rule. For now, change the dates per payslip.
- **Per-template default pay length:** all templates suggest "Every week" for now. Could suggest per country once "twice a month" exists.
- **Two jobs at once:** would need overlapping payslips and a "job" field. Out of scope for now (PLAN.md §11).
- **PWA install, offline queue, pull-to-refresh** (PLAN.md phase 8).
- **Help links in context:** a small "?" next to tricky fields (e.g. "How often are you usually paid?") that opens the matching Help section, and a "Need help?" link on the login page.
- **Automated UI checks:** the Phase 5 check (Playwright driving the local Edge, against the dev branch) worked well. It could become a `npm run test:ui` script with a seeded test account.

---

## Tidy-ups (technical)

- **Keep the Help page in step** ([src/routes/help/+page.svelte](../src/routes/help/+page.svelte)): update its guides, rules and quick answers whenever a feature changes. History and Expenses will each need a guide, and the "coming in a later update" answer will need removing.

- **Line endings:** Git warns "LF will be replaced by CRLF" on every commit. A `.gitattributes` with `* text=auto eol=lf` would make it consistent.
- **Local `npm run build` fails on Windows** at the final Vercel step (`EPERM` creating a symlink). Turning on Windows Developer Mode fixes it. Vercel's own builds aren't affected.
- **Migration 0003 is hand-written.** drizzle-kit can't generate renames without its interactive prompt. Future migrations generate normally (the snapshot was checked).

---

## Decided

| Date | Decision |
|---|---|
| 2026-10-09 | Look: ledger / paper payslip style (warm paper, banknote green, serif figures, mono payslip lines). |
| 2026-10-09 | App shell: dark "ledger spine" sidebar, icon rail on tablets, floating dock on phones. |
| 2026-10-10 | Local development uses a Neon `dev` branch (auto-delete: never); production stays on the `production` branch. |
| 2026-10-10 | Pay periods: 1 to 62 days, never overlapping, no future start (the end may be after today). |
| 2026-10-10 | A new payslip suggests the day after the last saved payslip, for the usual length; the first payslip ends today. |
| 2026-10-10 | Any payslip's start and end can be changed; gaps and earlier missed payslips are allowed. |
| 2026-10-10 | Settings asks only "How often are you usually paid?" (day / week / 2 weeks / month), with no anchor dates. |
| 2026-10-10 | Saved payslips are snapshots: never recalculated, never moved by the app; shortening one asks before dropping hours. |
| 2026-10-10 | "Per week" extras are labelled "per payslip" (paid once per period); the stored value stays `per_week`. |
| 2026-10-10 | Templates stay as starter packs only; named per-payslip "pay patterns" are deferred. |
| 2026-10-10 | URLs: `/` is the next payslip to fill in, `/?period=<start>` is a payslip, and old `?week=` links redirect. |
| 2026-10-10 | `settings.week_start_day` removed (migration 0004); existing users default to "Every week". |
| 2026-10-10 | An in-app Help page at `/help` (guides, rules, your data, quick answers), readable without logging in; linked from the sidebar and the phone account menu. One topic shows at a time (a topic list beside it on desktop, a "Topic" dropdown on phones and tablets), guides have Previous / Next, and `/help#<topic>` opens a topic directly. |
| 2026-10-10 | Smaller type scale used everywhere (body 12.5px; new `text-2xs` for overlines); Help is the 5th item in the phone dock; every clickable control shows the pointer cursor. |
| 2026-10-10 | The action bar (status + Save) is the last card of the form, in the page flow, not a sticky floating bar. |
| 2026-10-10 | Code uses payslip names (PayslipEditor, PeriodPicker, PayslipForm, parsePayslip, `src/lib/payslip/`); drafts move to a `slipside:payslip-draft:` key and old-key drafts are still read. The stored `per_week` value and the legacy `?week=` link stay. |
| 2026-10-10 | Payslip form redesigned as one "ledger rows" card that mirrors the printed slip (label left, amount right, dashed section rules, live totals); unused parts are one compact line. Desktop page height went from about 2,030px to 1,154px. |
| 2026-10-10 | Extras: name and total on top, inputs underneath; per day reads "£35 a day × 5 days" with "up to N days in this payslip" (no more "5 of 7"); per payslip uses a "Paid this time" toggle. |
