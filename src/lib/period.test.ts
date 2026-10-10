import { describe, expect, it } from 'vitest';
import {
	MAX_PERIOD_DAYS,
	applyPreset,
	checkPeriod,
	contains,
	datesOutside,
	dayCount,
	findOverlap,
	isPayLength,
	overlaps,
	periodDates,
	periodEndingOn,
	periodFrom,
	suggestNextPeriod
} from './period.ts';

const p = (start: string, end: string) => ({ start, end });

describe('pay periods', () => {
	it('knows the usual lengths', () => {
		expect(isPayLength('fortnight')).toBe(true);
		expect(isPayLength('year')).toBe(false);
		expect(isPayLength(undefined)).toBe(false);
	});

	it('counts and lists the days, both ends included', () => {
		expect(dayCount(p('2026-10-15', '2026-10-15'))).toBe(1);
		expect(dayCount(p('2026-10-05', '2026-10-11'))).toBe(7);
		expect(periodDates(p('2026-12-30', '2027-01-02'))).toEqual([
			'2026-12-30',
			'2026-12-31',
			'2027-01-01',
			'2027-01-02'
		]);
		expect(contains(p('2026-10-05', '2026-10-11'), '2026-10-11')).toBe(true);
		expect(contains(p('2026-10-05', '2026-10-11'), '2026-10-12')).toBe(false);
	});

	it('builds a period of each length from its start', () => {
		expect(periodFrom('2026-10-15', 'day')).toEqual(p('2026-10-15', '2026-10-15'));
		expect(periodFrom('2026-10-16', 'week')).toEqual(p('2026-10-16', '2026-10-22'));
		expect(periodFrom('2026-12-25', 'fortnight')).toEqual(p('2026-12-25', '2027-01-07'));
		expect(periodFrom('2026-10-16', 'month')).toEqual(p('2026-10-16', '2026-11-15'));
	});

	it('makes a month from the 1st a whole calendar month, leap years included', () => {
		expect(periodFrom('2026-03-01', 'month')).toEqual(p('2026-03-01', '2026-03-31'));
		expect(periodFrom('2028-02-01', 'month')).toEqual(p('2028-02-01', '2028-02-29'));
		expect(periodFrom('2026-12-01', 'month')).toEqual(p('2026-12-01', '2026-12-31'));
	});

	it('keeps a month from a late start inside the next month', () => {
		// Jan 31 + 1 month is clamped to Feb 28, so the period ends Feb 27.
		expect(periodFrom('2026-01-31', 'month')).toEqual(p('2026-01-31', '2026-02-27'));
		expect(periodFrom('2028-01-31', 'month')).toEqual(p('2028-01-31', '2028-02-28'));
	});

	it('builds a period of each length that ends on a date', () => {
		expect(periodEndingOn('2026-10-10', 'day')).toEqual(p('2026-10-10', '2026-10-10'));
		expect(periodEndingOn('2026-10-10', 'week')).toEqual(p('2026-10-04', '2026-10-10'));
		expect(periodEndingOn('2026-10-10', 'fortnight')).toEqual(p('2026-09-27', '2026-10-10'));
		expect(periodEndingOn('2026-10-10', 'month')).toEqual(p('2026-09-11', '2026-10-10'));
		expect(periodEndingOn('2026-03-31', 'month')).toEqual(p('2026-03-01', '2026-03-31'));
	});

	describe('suggesting the next payslip', () => {
		const today = '2026-10-20';

		it('ends a first payslip today', () => {
			expect(suggestNextPeriod(null, 'week', today)).toEqual(p('2026-10-14', '2026-10-20'));
			expect(suggestNextPeriod(null, 'day', today)).toEqual(p('2026-10-20', '2026-10-20'));
		});

		it('starts the day after the last payslip, for the usual length', () => {
			expect(suggestNextPeriod('2026-10-11', 'week', today)).toEqual(p('2026-10-12', '2026-10-18'));
			expect(suggestNextPeriod('2026-09-30', 'month', today)).toEqual(
				p('2026-10-01', '2026-10-31')
			);
		});

		it('goes back to the usual length after a one-day payslip', () => {
			// Weeks, then paid for one day on Oct 15, then weekly again.
			expect(suggestNextPeriod('2026-10-15', 'week', today)).toEqual(p('2026-10-16', '2026-10-22'));
		});

		it('still follows on after a long gap, to fill in missed payslips', () => {
			expect(suggestNextPeriod('2026-08-02', 'week', today)).toEqual(p('2026-08-03', '2026-08-09'));
		});

		it('may end after today: a period in progress', () => {
			expect(suggestNextPeriod('2026-10-19', 'week', today)).toEqual(p('2026-10-20', '2026-10-26'));
		});

		it('suggests nothing when the next payslip would start in the future', () => {
			expect(suggestNextPeriod('2026-10-20', 'week', today)).toBeNull();
			expect(suggestNextPeriod('2026-10-25', 'day', today)).toBeNull();
		});
	});

	it('applies the quick picks', () => {
		const today = '2026-10-20';
		expect(applyPreset('today', '2026-10-16', today)).toEqual(p('2026-10-20', '2026-10-20'));
		expect(applyPreset('week', '2026-10-16', today)).toEqual(p('2026-10-16', '2026-10-22'));
		expect(applyPreset('fortnight', '2026-10-16', today)).toEqual(p('2026-10-16', '2026-10-29'));
		expect(applyPreset('month', '2026-10-16', today)).toEqual(p('2026-10-16', '2026-11-15'));
	});

	describe('checking dates', () => {
		const today = '2026-10-20';

		it('accepts 1 day up to the maximum, ending after today too', () => {
			expect(checkPeriod(p('2026-10-20', '2026-10-20'), today)).toBeNull();
			expect(checkPeriod(p('2026-10-14', '2026-10-26'), today)).toBeNull();
			expect(checkPeriod(p('2026-08-01', '2026-10-01'), today)).toBeNull(); // 62 days
			expect(dayCount(p('2026-08-01', '2026-10-01'))).toBe(MAX_PERIOD_DAYS);
		});

		it('rejects bad, backwards, too long and future dates', () => {
			expect(checkPeriod({ start: '2026-02-30', end: '2026-03-01' }, today)).toBe('invalid');
			expect(checkPeriod({ start: '2026-10-01', end: null }, today)).toBe('invalid');
			expect(checkPeriod(p('2026-10-10', '2026-10-09'), today)).toBe('end-before-start');
			expect(checkPeriod(p('2026-08-01', '2026-10-02'), today)).toBe('too-long'); // 63 days
			expect(checkPeriod(p('2026-10-21', '2026-10-21'), today)).toBe('starts-in-future');
		});
	});

	describe('overlaps', () => {
		const saved = [p('2026-10-05', '2026-10-11'), p('2026-10-15', '2026-10-15')];

		it('treats shared days as overlapping and back-to-back periods as fine', () => {
			expect(overlaps(p('2026-10-11', '2026-10-12'), saved[0])).toBe(true);
			expect(overlaps(p('2026-10-12', '2026-10-14'), saved[0])).toBe(false);
			expect(overlaps(p('2026-10-01', '2026-10-31'), saved[1])).toBe(true);
		});

		it('names the payslip in the way', () => {
			expect(findOverlap(p('2026-10-12', '2026-10-18'), saved)).toEqual(saved[1]);
			expect(findOverlap(p('2026-10-12', '2026-10-14'), saved)).toBeNull();
		});

		it('ignores the payslip being edited, but not the ones next to it', () => {
			// Moving the Oct 5 payslip one day later.
			expect(findOverlap(p('2026-10-06', '2026-10-12'), saved, '2026-10-05')).toBeNull();
			expect(findOverlap(p('2026-10-06', '2026-10-15'), saved, '2026-10-05')).toEqual(saved[1]);
		});
	});

	it('finds the days a shorter period would drop', () => {
		const withHours = ['2026-10-05', '2026-10-09', '2026-10-11'];
		expect(datesOutside(p('2026-10-05', '2026-10-09'), withHours)).toEqual(['2026-10-11']);
		expect(datesOutside(p('2026-10-05', '2026-10-11'), withHours)).toEqual([]);
	});
});
