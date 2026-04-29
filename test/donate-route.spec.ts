import { describe, it, expect, vi, beforeEach } from 'vitest';

const envMock: { STRIPE_SECRET_KEY?: string; STRIPE_DONATION_PRICE_ID?: string } = {};
const sessionsCreateMock = vi.fn();

vi.mock('$env/dynamic/private', () => ({
	env: envMock
}));

vi.mock('stripe', () => {
	class StripeStub {
		checkout = { sessions: { create: sessionsCreateMock } };
	}
	return { default: StripeStub };
});

beforeEach(() => {
	envMock.STRIPE_SECRET_KEY = undefined;
	envMock.STRIPE_DONATION_PRICE_ID = undefined;
	sessionsCreateMock.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

async function callPost(opts: { origin?: string; body?: unknown } = {}) {
	const { POST } = await import('../src/routes/api/donate/+server');
	const origin = opts.origin ?? 'https://cutlist.example.com';
	const url = new URL(`${origin}/api/donate`);
	const request = new Request(url, {
		method: 'POST',
		body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
		headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined
	});
	return POST({ url, request } as Parameters<typeof POST>[0]);
}

const VALID_KEY = 'sk_test_dummy';
const VALID_PRICE = 'price_test_donation';

describe('POST /api/donate', () => {
	it('returns 503 when STRIPE_SECRET_KEY is missing', async () => {
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		const response = await callPost();
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'Donations not configured' });
		expect(sessionsCreateMock).not.toHaveBeenCalled();
	});

	it('returns 503 when STRIPE_SECRET_KEY is an empty string', async () => {
		envMock.STRIPE_SECRET_KEY = '';
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		const response = await callPost();
		expect(response.status).toBe(503);
	});

	it('returns 503 when STRIPE_DONATION_PRICE_ID is missing', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		const response = await callPost();
		expect(response.status).toBe(503);
		expect(sessionsCreateMock).not.toHaveBeenCalled();
	});

	it('returns 503 when STRIPE_DONATION_PRICE_ID is an empty string', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = '';
		const response = await callPost();
		expect(response.status).toBe(503);
	});

	it('returns 200 with the session URL on success', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockResolvedValue({
			url: 'https://checkout.stripe.com/c/pay/test_xyz'
		});
		const response = await callPost();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			url: 'https://checkout.stripe.com/c/pay/test_xyz'
		});
	});

	it('passes the request origin into the session success and cancel URLs', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x' });
		await callPost({ origin: 'http://localhost:5173' });
		const params = sessionsCreateMock.mock.calls[0]?.[0];
		expect(params.success_url).toBe('http://localhost:5173/?donation=thanks');
		expect(params.cancel_url).toBe('http://localhost:5173/?donation=cancelled');
	});

	it('passes the configured Price ID into the session line items', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x' });
		await callPost();
		const params = sessionsCreateMock.mock.calls[0]?.[0];
		expect(params.line_items[0].price).toBe(VALID_PRICE);
		expect(params.line_items[0].price_data).toBeUndefined();
	});

	it('returns 502 when the Stripe SDK throws', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockRejectedValue(new Error('Stripe is unreachable'));
		const response = await callPost();
		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: 'Could not create Checkout Session' });
	});

	it('returns 502 when Stripe returns a session without a URL', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockResolvedValue({ url: null });
		const response = await callPost();
		expect(response.status).toBe(502);
	});

	it('ignores any client-supplied request body fields in the session params', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x' });
		await callPost({
			body: {
				price: 'price_attacker_owned',
				success_url: 'https://evil.example.com/win',
				metadata: { malicious: 'true' }
			}
		});
		const params = sessionsCreateMock.mock.calls[0]?.[0];
		expect(params.line_items[0].price).toBe(VALID_PRICE);
		expect(params.success_url).toBe('https://cutlist.example.com/?donation=thanks');
		expect(params.metadata).toBeUndefined();
	});

	it('uses Stripe checkout sessions exactly once per call', async () => {
		envMock.STRIPE_SECRET_KEY = VALID_KEY;
		envMock.STRIPE_DONATION_PRICE_ID = VALID_PRICE;
		sessionsCreateMock.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/x' });
		await callPost();
		expect(sessionsCreateMock).toHaveBeenCalledTimes(1);
	});
});
