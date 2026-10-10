import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, readDraft, writeDraft } from './draft.ts';
import { buildForm } from './form.ts';

const types = { deductions: [{ name: 'Tax' }], extras: [], otRates: [] };
const owner = 'sam@example.com';
const key = (start: string) => `slipside:week-draft:${owner}:${start}`;

describe('drafts on this device', () => {
	beforeEach(() => {
		const store = new Map<string, string>();
		globalThis.localStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => void store.set(k, v),
			removeItem: (k: string) => void store.delete(k)
		} as Storage;
	});
	afterEach(() => {
		// @ts-expect-error: tests only
		delete globalThis.localStorage;
	});

	it('keeps a draft for a period of any length', () => {
		const form = buildForm({ start: '2026-10-05', end: '2026-10-18' }, 'GBP', types, null);
		form.net = '900';
		writeDraft(owner, '2026-10-05', form);
		expect(readDraft(owner, '2026-10-05')?.form).toEqual(form);
		clearDraft(owner, '2026-10-05');
		expect(readDraft(owner, '2026-10-05')).toBeNull();
	});

	it('still reads a draft typed before pay periods (weekStart, seven days)', () => {
		const form = buildForm({ start: '2026-10-05', end: '2026-10-11' }, 'GBP', types, null);
		const { start, end, ...rest } = form;
		const legacy = { ...rest, weekStart: start, net: '500' };
		localStorage.setItem(key('2026-10-05'), JSON.stringify({ savedAt: 'then', form: legacy }));

		const draft = readDraft(owner, '2026-10-05');
		expect(draft?.form.start).toBe('2026-10-05');
		expect(draft?.form.end).toBe(end);
		expect(draft?.form.net).toBe('500');
		expect(draft?.savedAt).toBe('then');
	});

	it('keeps new dates typed on a saved payslip, under its saved start', () => {
		const form = buildForm({ start: '2026-10-06', end: '2026-10-08' }, 'GBP', types, null);
		writeDraft(owner, '2026-10-05', form);
		expect(readDraft(owner, '2026-10-05')?.form).toEqual(form);
	});

	it('ignores a draft with the wrong number of days', () => {
		const form = buildForm({ start: '2026-10-05', end: '2026-10-11' }, 'GBP', types, null);

		localStorage.setItem(
			key('2026-10-05'),
			JSON.stringify({ savedAt: 'x', form: { ...form, days: form.days.slice(0, 3) } })
		);
		expect(readDraft(owner, '2026-10-05')).toBeNull();
	});
});
