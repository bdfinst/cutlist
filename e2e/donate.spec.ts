import { test, expect } from '@playwright/test';

const MOCK_CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/test_e2e_session';

test.describe('Support (donate) button', () => {
	test('is visible in the header on desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/');
		const button = page.getByRole('button', { name: /support/i });
		await expect(button).toBeVisible();
		await expect(button).toBeEnabled();
	});

	test('is visible in the header on mobile with no horizontal overflow', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		const button = page.getByRole('button', { name: /support/i });
		await expect(button).toBeVisible();
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test('clicking opens the URL returned by /api/donate in a new tab', async ({ page, context }) => {
		await page.route('**/api/donate', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ url: MOCK_CHECKOUT_URL })
			})
		);
		await page.goto('/');
		const button = page.getByRole('button', { name: /support/i });
		const popupPromise = context.waitForEvent('page');
		await button.click();
		const popup = await popupPromise;
		// Popups may start at about:blank then navigate; assert the eventual URL.
		await popup.waitForURL(MOCK_CHECKOUT_URL, { waitUntil: 'commit' }).catch(() => {});
		expect(popup.url()).toBe(MOCK_CHECKOUT_URL);
	});

	test('shows an inline error and re-enables the button when the API fails', async ({ page }) => {
		await page.route('**/api/donate', (route) =>
			route.fulfill({ status: 502, contentType: 'application/json', body: '{}' })
		);
		await page.goto('/');
		const button = page.getByRole('button', { name: /support/i });
		await button.click();
		await expect(page.getByText(/could not open donation page/i)).toBeVisible();
		await expect(button).toBeEnabled();
	});
});
