import { describe, expect, it } from 'vitest';
import { defaultTarget, neighbours, periodHref, resolveTarget } from './periodNav.ts';

const p = (start: string, end: string) => ({ start, end });
const today = '2026-10-20';
// Weekly payslips, then a one-day payslip on Oct 15.
const saved = [
	p('2026-09-28', '2026-10-04'),
	p('2026-10-05', '2026-10-11'),
	p('2026-10-15', '2026-10-15')
];
const resolve = (start: string | null, end: string | null = null, list = saved) =>
	resolveTarget({ saved: list, length: 'week', today, start, end });

describe('the payslip page period', () => {
	it('links saved payslips by start and new ones with their dates', () => {
		expect(periodHref({ period: p('2026-10-05', '2026-10-11'), saved: true })).toBe(
			'/?period=2026-10-05'
		);
		expect(periodHref({ period: p('2026-10-12', '2026-10-14'), saved: false })).toBe(
			'/?period=2026-10-12&end=2026-10-14'
		);
	});

	describe('with no period in the URL', () => {
		it('opens the next payslip to fill in: the day after the last one', () => {
			expect(resolve(null)).toEqual({ period: p('2026-10-16', '2026-10-22'), saved: false });
		});

		it('opens a first payslip ending today', () => {
			expect(resolve(null, null, [])).toEqual({
				period: p('2026-10-14', '2026-10-20'),
				saved: false
			});
		});

		it('opens the last payslip when the next would start after today', () => {
			const upToDate = [...saved, p('2026-10-16', '2026-10-22')];
			expect(defaultTarget(upToDate, 'week', today)).toEqual({
				period: p('2026-10-16', '2026-10-22'),
				saved: true
			});
		});
	});

	describe('with ?period=', () => {
		it('opens a saved payslip by its start', () => {
			expect(resolve('2026-10-05')).toEqual({ period: saved[1], saved: true });
			expect(resolve('2026-10-15')).toEqual({ period: saved[2], saved: true });
		});

		it('sends a date inside a saved payslip to that payslip', () => {
			expect(resolve('2026-10-08')).toEqual({ redirect: '/?period=2026-10-05' });
		});

		it('sends a future or unreadable start home', () => {
			expect(resolve('2026-10-21')).toEqual({ redirect: '/' });
			expect(resolve('soon')).toEqual({ redirect: '/' });
		});

		it('starts a new payslip there, stopping before the next saved one', () => {
			// Oct 12 + a week would run into the Oct 15 payslip.
			expect(resolve('2026-10-12')).toEqual({
				period: p('2026-10-12', '2026-10-14'),
				saved: false
			});
			expect(resolve('2026-08-03')).toEqual({
				period: p('2026-08-03', '2026-08-09'),
				saved: false
			});
		});

		it('uses a valid &end= for a new payslip, and ignores a bad one', () => {
			expect(resolve('2026-10-16', '2026-10-16')).toEqual({
				period: p('2026-10-16', '2026-10-16'),
				saved: false
			});
			expect(resolve('2026-10-16', '2026-10-01')).toEqual({
				period: p('2026-10-16', '2026-10-22'),
				saved: false
			});
		});
	});

	describe('previous and next', () => {
		const nav = (start: string, end: string, list = saved) =>
			neighbours(p(start, end), list, 'week', today);

		it('steps between back-to-back saved payslips', () => {
			expect(nav('2026-10-05', '2026-10-11').previous).toEqual({ period: saved[0], saved: true });
		});

		it('offers the gap between payslips, sized to fit', () => {
			// After the Oct 5 week there's a 3-day gap before the Oct 15 payslip.
			expect(nav('2026-10-05', '2026-10-11').next).toEqual({
				period: p('2026-10-12', '2026-10-14'),
				saved: false
			});
			expect(nav('2026-10-15', '2026-10-15').previous).toEqual({
				period: p('2026-10-12', '2026-10-14'),
				saved: false
			});
		});

		it('goes from the last payslip to the next one to fill in', () => {
			expect(nav('2026-10-15', '2026-10-15').next).toEqual({
				period: p('2026-10-16', '2026-10-22'),
				saved: false
			});
		});

		it('offers earlier payslips before the first saved one', () => {
			expect(nav('2026-09-28', '2026-10-04').previous).toEqual({
				period: p('2026-09-21', '2026-09-27'),
				saved: false
			});
		});

		it('has no next when it would start after today', () => {
			expect(nav('2026-10-16', '2026-10-22').next).toBeNull();
			expect(nav('2026-10-14', '2026-10-20').next).toBeNull();
		});
	});
});
