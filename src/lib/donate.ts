import type Stripe from 'stripe';

export function isDonateEnabled(flag: string | undefined): boolean {
	return typeof flag === 'string' && flag.trim() === 'true';
}

export function buildCheckoutSessionParams({
	origin
}: {
	origin: string;
}): Stripe.Checkout.SessionCreateParams {
	return {
		mode: 'payment',
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: { name: 'Cutlist Calculator donation' },
					custom_unit_amount: { enabled: true, minimum_amount: 100 }
				},
				quantity: 1
			}
		],
		success_url: `${origin}/?donation=thanks`,
		cancel_url: `${origin}/?donation=cancelled`
	};
}
