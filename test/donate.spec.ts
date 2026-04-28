import { describe, it, expect } from 'vitest';
import { isDonateEnabled, buildCheckoutSessionParams } from '$lib/donate';

describe('isDonateEnabled', () => {
	it('returns false for undefined', () => {
		expect(isDonateEnabled(undefined)).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isDonateEnabled('')).toBe(false);
	});

	it('returns false for whitespace-only string', () => {
		expect(isDonateEnabled('   ')).toBe(false);
	});

	it('returns true for the literal string "true"', () => {
		expect(isDonateEnabled('true')).toBe(true);
	});

	it('returns true for "  true  " (trims whitespace)', () => {
		expect(isDonateEnabled('  true  ')).toBe(true);
	});

	it('returns false for "True" (case-sensitive)', () => {
		expect(isDonateEnabled('True')).toBe(false);
	});

	it('returns false for "TRUE" (case-sensitive)', () => {
		expect(isDonateEnabled('TRUE')).toBe(false);
	});

	it('returns false for "1"', () => {
		expect(isDonateEnabled('1')).toBe(false);
	});

	it('returns false for "yes"', () => {
		expect(isDonateEnabled('yes')).toBe(false);
	});

	it('returns false for "false"', () => {
		expect(isDonateEnabled('false')).toBe(false);
	});

	it('returns false for an arbitrary URL-like value', () => {
		expect(isDonateEnabled('https://donate.stripe.com/abc')).toBe(false);
	});
});

describe('buildCheckoutSessionParams', () => {
	const origin = 'https://cutlist.example.com';

	it('returns mode "payment" for one-time donations', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.mode).toBe('payment');
	});

	it('returns exactly one line item', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.line_items).toHaveLength(1);
	});

	it('uses currency "usd" on the line item', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.line_items?.[0]?.price_data?.currency).toBe('usd');
	});

	it('enables custom_unit_amount with $1.00 minimum (100 cents)', () => {
		const params = buildCheckoutSessionParams({ origin });
		const customAmount = params.line_items?.[0]?.price_data?.custom_unit_amount;
		expect(customAmount?.enabled).toBe(true);
		expect(customAmount?.minimum_amount).toBe(100);
	});

	it('names the product "Cutlist Calculator donation"', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.line_items?.[0]?.price_data?.product_data?.name).toBe(
			'Cutlist Calculator donation'
		);
	});

	it('returns success_url at <origin>/?donation=thanks', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.success_url).toBe('https://cutlist.example.com/?donation=thanks');
	});

	it('returns cancel_url at <origin>/?donation=cancelled', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.cancel_url).toBe('https://cutlist.example.com/?donation=cancelled');
	});

	it('uses the provided origin verbatim with no trailing-slash injection', () => {
		const params = buildCheckoutSessionParams({ origin: 'http://localhost:5173' });
		expect(params.success_url).toBe('http://localhost:5173/?donation=thanks');
		expect(params.cancel_url).toBe('http://localhost:5173/?donation=cancelled');
	});

	it('sets quantity to 1', () => {
		const params = buildCheckoutSessionParams({ origin });
		expect(params.line_items?.[0]?.quantity).toBe(1);
	});
});
