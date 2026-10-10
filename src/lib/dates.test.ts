import { describe, expect, it } from 'vitest';
import {
	addDays,
	addMonths,
	datesBetween,
	daysBetween,
	dayLabel,
	formatRange,
	isIsoDate,
	shortDate,
	todayIn,
	weekDates,
	weekStartFor,
	weekdayOf
} from './dates.ts';

describe('dates', () => {
	it('validates ISO dates, including impossible ones', () => {
		expect(isIsoDate('2026-10-08')).toBe(true);
		expect(isIsoDate('2026-02-30')).toBe(false);
		expect(isIsoDate('08/10/2026')).toBe(false);
		expect(isIsoDate(20261008)).toBe(false);
	});

	it('adds days across months and years', () => {
		expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
		expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
	});

	it('adds months, clamping to the end of shorter months', () => {
		expect(addMonths('2026-10-16', 1)).toBe('2026-11-16');
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
		expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
		expect(addMonths('2026-05-31', 1)).toBe('2026-06-30');
	});

	it('counts and lists the days between two dates', () => {
		expect(daysBetween('2026-10-05', '2026-10-11')).toBe(6);
		expect(daysBetween('2026-10-11', '2026-10-05')).toBe(-6);
		expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // across a DST change elsewhere
		expect(datesBetween('2026-10-05', '2026-10-07')).toEqual([
			'2026-10-05',
			'2026-10-06',
			'2026-10-07'
		]);
		expect(datesBetween('2026-10-07', '2026-10-05')).toEqual([]);
	});

	it("gives today's date in the user's time zone", () => {
		const instant = new Date('2026-10-04T23:30:00Z'); // Sunday night in UTC
		expect(todayIn('UTC', instant)).toBe('2026-10-04');
		expect(todayIn('Asia/Manila', instant)).toBe('2026-10-05'); // already Monday
		expect(todayIn('Not/AZone', instant)).toBe('2026-10-04');
	});

	it('finds the start of the pay week for any start day', () => {
		// 2026-10-08 is a Thursday.
		expect(weekdayOf('2026-10-08')).toBe(4);
		expect(weekStartFor('2026-10-08', 1)).toBe('2026-10-05'); // Monday
		expect(weekStartFor('2026-10-08', 0)).toBe('2026-10-04'); // Sunday
		expect(weekStartFor('2026-10-08', 4)).toBe('2026-10-08'); // Thursday itself
		expect(weekStartFor('2026-10-08', 5)).toBe('2026-10-02'); // Friday before
	});

	it('lists the seven dates of a week', () => {
		expect(weekDates('2026-12-28')).toEqual([
			'2026-12-28',
			'2026-12-29',
			'2026-12-30',
			'2026-12-31',
			'2027-01-01',
			'2027-01-02',
			'2027-01-03'
		]);
	});

	it('formats week ranges', () => {
		// Intl puts thin spaces around the dash; compare with plain spaces.
		const range = (start: string, end: string) => formatRange(start, end).replace(/\s/g, ' ');
		expect(range('2026-10-05', '2026-10-11')).toBe('Oct 5 – 11, 2026');
		expect(range('2026-09-28', '2026-10-04')).toBe('Sep 28 – Oct 4, 2026');
		expect(range('2026-12-28', '2027-01-03')).toBe('Dec 28, 2026 – Jan 3, 2027');
	});

	it('labels days for the hours grid', () => {
		expect(dayLabel('2026-10-05')).toEqual({ weekday: 'Mon', day: 5, month: 'Oct' });
		expect(shortDate('2026-10-05')).toBe('Oct 5');
	});
});
