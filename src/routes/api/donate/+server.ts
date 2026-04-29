import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { buildCheckoutSessionParams } from '$lib/donate';

export const POST: RequestHandler = async ({ url }) => {
	const secretKey = env.STRIPE_SECRET_KEY;
	const priceId = env.STRIPE_DONATION_PRICE_ID;
	if (!secretKey || !priceId) {
		return json({ error: 'Donations not configured' }, { status: 503 });
	}
	const stripe = new Stripe(secretKey);
	try {
		const session = await stripe.checkout.sessions.create(
			buildCheckoutSessionParams({ origin: url.origin, priceId })
		);
		if (!session.url) {
			throw new Error('Stripe returned no session URL');
		}
		return json({ url: session.url }, { status: 200 });
	} catch (err) {
		console.error('[donate] Stripe error:', err instanceof Error ? err.message : err);
		return json({ error: 'Could not create Checkout Session' }, { status: 502 });
	}
};
