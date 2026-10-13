export function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Format an amount for display, e.g. formatMoney(8500, 'USD') -> 'USD 8,500.00'. */
export function formatMoney(amount: number, currency: string): string {
	const fixed = round2(amount).toFixed(2);
	const [whole, frac] = fixed.split('.');
	const withSep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${currency} ${withSep}.${frac}`;
}

/** Like formatMoney, but prefixes '+' for positive amounts (zero and negatives unchanged). */
export function formatSignedMoney(amount: number, currency: string): string {
	const formatted = formatMoney(amount, currency);
	return amount > 0 ? `+${formatted}` : formatted;
}

/** Line total from quantity × unit price, rounded to cents. */
export function lineTotal(quantity: number, unitPrice: number): number {
	return round2(quantity * unitPrice);
}
