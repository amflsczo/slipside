import { describe, expect, it } from 'vitest';
import { formatMoney, formatRate, fromMinor, minorDigits, toMinor } from './money.ts';

describe('minorDigits', () => {
	it('knows how many decimals a currency uses', () => {
		expect(minorDigits('GBP')).toBe(2);
		expect(minorDigits('PHP')).toBe(2);
		expect(minorDigits('JPY')).toBe(0);
	});

	it('falls back to 2 for an unknown code', () => {
		expect(minorDigits('NOT-A-CODE')).toBe(2);
	});
});

describe('toMinor', () => {
	it('parses amounts exactly', () => {
		expect(toMinor('12.5', 2)).toBe(1250);
		expect(toMinor('0.1', 2)).toBe(10);
		expect(toMinor('.5', 2)).toBe(50);
		expect(toMinor('-3.20', 2)).toBe(-320);
		expect(toMinor(12.34, 2)).toBe(1234);
		expect(toMinor(' 7 ', 2)).toBe(700);
	});

	it('accepts trailing zeros beyond the currency decimals', () => {
		expect(toMinor('1000.00', 0)).toBe(1000);
	});

	it('rejects too many decimals and anything that is not a number', () => {
		expect(toMinor('1.005', 2)).toBeNull();
		expect(toMinor('abc', 2)).toBeNull();
		expect(toMinor('', 2)).toBeNull();
		expect(toMinor('.', 2)).toBeNull();
		expect(toMinor('1,000', 2)).toBeNull();
	});
});

describe('fromMinor', () => {
	it('turns minor units back into a decimal string', () => {
		expect(fromMinor(1250, 2)).toBe('12.50');
		expect(fromMinor(5, 2)).toBe('0.05');
		expect(fromMinor(-320, 2)).toBe('-3.20');
		expect(fromMinor(1000, 0)).toBe('1000');
	});
});

describe('formatMoney / formatRate', () => {
	it('formats with the currency symbol and decimals', () => {
		expect(formatMoney(1250, 'GBP', 'en-GB')).toBe('£12.50');
		expect(formatMoney(5000, 'JPY', 'en-US')).toBe('¥5,000');
	});

	it('rounds the rate only for display', () => {
		expect(formatRate(1282.6087, 'GBP', 'en-GB')).toBe('£12.83');
	});
});
