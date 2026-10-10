# Backlog: decisions and ideas

A running list of what still needs deciding, what must happen before a release, and ideas for later. It sits alongside [PLAN.md](../PLAN.md) (the original roadmap) and [DESIGN.md](DESIGN.md) (the design system).

**How to use it:** add an item whenever something comes up. When a question is answered, move it to [Decided](#decided) with the date and the answer. Tick off release items as they're done.

_Last updated: 2026-10-10_

---

## Where things stand

Done: **flexible pay periods.** A payslip covers 1 to 62 days, rather than always a week.

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
| 8 | Release: back up, migrate production, push | ✅ Released 2026-10-10 |

> ✅ **Released 2026-10-10** at **https://slipside-tracker.vercel.app**. Production has migrations 0003 and 0004 and `main` is deployed. Backup branch in Neon: `backup-before-pay-periods`.

### Next: History (planned 2026-10-10)

| Phase | What | Status |
|---|---|---|
| H1 | **"Paid on" date** on each payslip (optional, defaults to the end date); History counts a payslip in the month it was paid | ✅ Committed |
| H2 | Data and rules, with tests: yearly query, month and year totals, change vs the previous payslip (net, plus the rate change when lengths differ), rate-check flag, totals per deduction and per extra | ✅ Committed |
| H3 | History list: year picker (+ currency if more than one), payslips grouped by month with totals; rows show dates and length, net, rate, change, ⚠ flag; tap opens the payslip; empty state | ✅ Committed |
| H4 | Year summary tiles; a hand-drawn SVG line chart (net pay per payslip by default, switch to Rate / Hours, table for screen readers); a **year breakdown** in the printed-slip style (earnings by item, gross, each deduction, net, hours) | ✅ Committed |
| H5 | Help guide and quick answer for History, DESIGN.md, backlog, browser check, release | ⏳ Next |

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

### 4. Template item called "Weekly bonus"
The UK and US templates include an extra named **Weekly bonus**, of kind "per payslip". With flexible periods the name can read oddly.
- **Options:**
  - **(a)** Rename it to "Bonus" in the templates. This only affects new setups; existing items keep their names.
  - **(b)** Leave it.
- **Suggestion:** (a).

---

## Before going live (Phase 8 checklist)

- [x] Confirm Vercel's `DATABASE_URL` is the production branch (confirmed 2026-10-10: production woke when the live site was opened).
- [x] In Neon, create a backup branch from production, e.g. `backup-before-pay-periods`.
- [x] Run migrations 0003 (pay periods) and 0004 (drop `week_start_day`) on production.
- [x] Check production: old weeks show as 7-day periods, and an overlapping save is refused.
- [x] Push `main` to GitHub so Vercel deploys (54a5fbf; Vercel: "Deployment has completed").
- [ ] On the live site: open an old payslip, save a 1-day payslip, check an old `?week=` link redirects.
- [x] Point local `.env` back at the dev branch, if it was switched for the migration (it never was; the production address was passed only to the migrate command).

---

## Ideas for later

- **Expenses page** (planned): quick add, monthly totals by category, income vs expenses.
- **Backup:** JSON export and import, CSV export (PLAN.md phase 7).
- **Named pay patterns:** saved setups like "Regular week" or "Day gig", each with its own length and optionally its own deductions, chosen per payslip. This was deferred in favour of a single usual length.
- **"Twice a month" pay length** (e.g. the 15th and the last day), common in the Philippines. It doesn't fit day / week / 2 weeks / month. Would need a fifth usual length with a calendar rule. For now, change the dates per payslip.
- **Per-template default pay length:** all templates suggest "Every week" for now. Could suggest per country once "twice a month" exists.
- **Preview deployments use production data.** Vercel's `DATABASE_URL` is set for "Production and Preview", so preview builds read and write the live database. Consider giving Preview the Neon `dev` branch (or a separate preview branch).
- **Delete the Neon backup branch** `backup-before-pay-periods` once the live site has been fine for a week or so.
- **Custom domain** (optional): the live app is at **https://slipside-tracker.vercel.app**. Note `slipside.vercel.app` is a different site owned by someone else.
- **Two jobs at once:** would need overlapping payslips and a "job" field. Out of scope for now (PLAN.md §11).
- **PWA install, offline queue, pull-to-refresh** (PLAN.md phase 8).
- **"Also add to my list"** on one-off deduction and bonus rows, to add the item to Settings in the same step (today a one-off row stays on that payslip only).
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
| 2026-10-10 | An ⓘ helper (InfoTip) explains "Paid this time". Placeholders and currency symbols use the body text size. Fixed: the phone 16px input rule was being overridden by daisyUI (typed text was 14px, so iOS zoomed); it now applies. |
| 2026-10-10 | Typed text in fields is the body size (12.5px) on phones too, per the user's preference. To stop iOS zooming in on focus, `maximum-scale=1` is set on iPhone/iPad only (pinch-zoom still works there); Android and desktop keep normal zoom. |
| 2026-10-10 | Payslip action bar: same width as the "Your payslip" card on wide screens, and minimal: a status dot + label, an icon-only Delete (still confirms) and the Update / Save button, in one row on every screen. Gross and rate removed (the slip shows them). |
| 2026-10-10 | The "Updates as you type" pill is removed. The slip has **Save image** (PNG, 2×, slip shape on paper; share sheet on phones, download elsewhere). One-off deductions and bonuses added on a payslip stay on that payslip only; they are not added to Settings. |
| 2026-10-10 | Vercel's `DATABASE_URL` (a Sensitive variable, so its value can't be viewed) points at the Neon **production** branch: confirmed by production waking when the live site was opened. |
| 2026-10-10 | History plan: comparisons show the change in net **and** the rate change when payslip lengths differ; payslips count in the **month they were paid** (new "Paid on" field, built first); the chart shows **net pay** first; **one year at a time**; the chart is hand-drawn SVG (no library); a year breakdown totals each deduction and extra. History reads stored totals and never recalculates. |
| 2026-10-10 | The History chart is a **line chart** (not bars, no area fill): points placed by pay date, a crosshair tooltip. History also has an **All time** view: all-time tiles, chart and breakdown, with one card per year linking to that year. |
