import { formatMoney, formatSignedMoney, lineTotal } from './money.util';

describe('money.util', () => {
	it('formats money with currency and thousands separators', () => {
		expect(formatMoney(8500, 'USD')).toBe('USD 8,500.00');
		expect(formatMoney(-500, 'USD')).toBe('USD -500.00');
	});

	it('prefixes a plus sign for positive signed amounts only', () => {
		expect(formatSignedMoney(500, 'USD')).toBe('+USD 500.00');
		expect(formatSignedMoney(0, 'USD')).toBe('USD 0.00');
		expect(formatSignedMoney(-200, 'USD')).toBe('USD -200.00');
	});

	it('computes rounded line totals', () => {
		expect(lineTotal(11, 500)).toBe(5500);
		expect(lineTotal(30, 100)).toBe(3000);
	});
});
