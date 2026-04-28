import type Stripe from 'stripe';

export function isDonateEnabled(flag: string | undefined): boolean {
	return typeof flag === 'string' && flag.trim() === 'true';
}

export function buildCheckoutSessionParams({
	origin,
	priceId
}: {
	origin: string;
	priceId: string;
}): Stripe.Checkout.SessionCreateParams {
	return {
		mode: 'payment',
		line_items: [{ price: priceId, quantity: 1 }],
		success_url: `${origin}/?donation=thanks`,
		cancel_url: `${origin}/?donation=cancelled`
	};
}
