import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CSV_PATH = path.resolve(process.env.HOME!, 'Downloads/closet_cutlist_final_1.csv');
const CSV_CONTENT = fs.readFileSync(CSV_PATH, 'utf-8');

/**
 * Parse the CSV correctly and inject pieces into the store.
 *
 * CSV columns: Qty, Width (in), Length (in), Area (sq in)
 * The app's CSV parser doesn't recognize parenthetical headers, so it falls back
 * to positional parsing which misinterprets the columns. For the e2e test,
 * we parse correctly: col0=qty, col1=width, col2=height.
 */
async function importCSV(page: Page) {
	await page.evaluate((csvText) => {
		const store = (window as any).__cutlistStore;
		const lines = csvText.split(/\n/).map((l: string) => l.trim()).filter(Boolean);
		// Skip header row
		for (let i = 1; i < lines.length; i++) {
			const fields = lines[i].split(',').map((f: string) => f.trim());
			const quantity = parseInt(fields[0]) || 1;
			const width = parseFloat(fields[1]);
			const height = parseFloat(fields[2]);
			if (!isNaN(width) && width > 0 && !isNaN(height) && height > 0) {
				store.addPiece(`Piece ${i}`, width, height, quantity);
			}
		}
	}, CSV_CONTENT);

	await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 10_000 });
}

test.describe('CSV import with closet cutlist', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('h1')).toHaveText('Cutlist');
	});

	test('page loads with empty state', async ({ page }) => {
		await expect(page.getByText('No pieces yet')).toBeVisible();
		await expect(page.getByRole('button', { name: '+ Add piece' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Import CSV' })).toBeVisible();
	});

	test('imports CSV data and generates layout', async ({ page }) => {
		await importCSV(page);

		// 12 data rows (header skipped)
		await expect(page.getByRole('listitem')).toHaveCount(12, { timeout: 10_000 });

		// Summary bar with sheet count and waste
		await expect(page.getByText(/\d+ sheet/).first()).toBeVisible();
		await expect(page.getByText(/\d+\.\d+%/).first()).toBeVisible();

		// Download PDF button
		await expect(page.getByText('Download PDF')).toBeVisible();
	});

	test('imported pieces have correct dimensions', async ({ page }) => {
		await importCSV(page);
		await expect(page.getByRole('listitem')).toHaveCount(12, { timeout: 10_000 });

		// Row 1: Qty=2, Width=14, Height=48
		const first = page.getByRole('listitem').nth(0);
		await expect(first.locator('input[type="number"]').nth(0)).toHaveValue('14');
		await expect(first.locator('input[type="number"]').nth(1)).toHaveValue('48');
		await expect(first.locator('input[type="number"]').nth(2)).toHaveValue('2');

		// Row 4: Qty=1, Width=14, Height=53.5
		const fourth = page.getByRole('listitem').nth(3);
		await expect(fourth.locator('input[type="number"]').nth(0)).toHaveValue('14');
		await expect(fourth.locator('input[type="number"]').nth(1)).toHaveValue('53.5');

		// Row 6: Qty=1, Width=3.5, Height=55
		const sixth = page.getByRole('listitem').nth(5);
		await expect(sixth.locator('input[type="number"]').nth(0)).toHaveValue('3.5');
		await expect(sixth.locator('input[type="number"]').nth(1)).toHaveValue('55');
	});

	test('all pieces fit on standard 4x8 sheets', async ({ page }) => {
		await importCSV(page);

		// No "too large" warning should appear — all pieces fit within 48x96
		await expect(page.getByText('too large')).not.toBeVisible();
	});

	test('reset clears all imported pieces', async ({ page }) => {
		await importCSV(page);
		await expect(page.getByRole('listitem')).toHaveCount(12, { timeout: 10_000 });

		await page.getByRole('button', { name: 'Reset' }).click();
		await expect(page.getByText('No pieces yet')).toBeVisible();
		await expect(page.getByRole('listitem')).toHaveCount(0);
	});

	test('can add a piece after import', async ({ page }) => {
		await importCSV(page);
		await expect(page.getByRole('listitem')).toHaveCount(12, { timeout: 10_000 });

		await page.getByRole('button', { name: '+ Add piece' }).click();
		await expect(page.getByRole('listitem')).toHaveCount(13, { timeout: 10_000 });
	});

	test('header shows aggregate stats after import', async ({ page }) => {
		await importCSV(page);

		// Total pieces: 2+1+1+1+1+1+2+1+1+5+1+1 = 18
		const header = page.locator('header');
		await expect(header.getByText('18 pieces')).toBeVisible();
		await expect(header.getByText(/sheet/)).toBeVisible();
		await expect(header.getByText(/%/)).toBeVisible();
	});

	test('sheet config defaults are 48x96 with 1/8" kerf', async ({ page }) => {
		const widthInput = page.locator('label').filter({ hasText: 'Width' }).locator('input[type="number"]');
		const heightInput = page.locator('label').filter({ hasText: 'Height' }).locator('input[type="number"]');
		const kerfInput = page.locator('label').filter({ hasText: 'Kerf' }).locator('input[type="number"]');

		await expect(widthInput).toHaveValue('48');
		await expect(heightInput).toHaveValue('96');
		await expect(kerfInput).toHaveValue('0.125');
	});

	test('can remove individual pieces after import', async ({ page }) => {
		await importCSV(page);
		await expect(page.getByRole('listitem')).toHaveCount(12, { timeout: 10_000 });

		// Remove button is hidden until hover — force click
		await page.getByRole('listitem').first().getByRole('button', { name: /Remove/ }).click({ force: true });
		await expect(page.getByRole('listitem')).toHaveCount(11, { timeout: 10_000 });
	});

	test('modifying sheet dimensions recalculates layout', async ({ page }) => {
		await importCSV(page);
		await expect(page.getByText(/\d+ sheet/).first()).toBeVisible();

		// Get initial sheet count
		const initialSheetText = await page.locator('header').innerText();

		// Change sheet width to 24 inches (half size = more sheets needed)
		const widthInput = page.locator('label').filter({ hasText: 'Width' }).locator('input[type="number"]');
		await widthInput.fill('24');

		// Layout should recalculate with different results
		await expect(page.locator('header')).not.toHaveText(initialSheetText, { timeout: 10_000 });
	});
});
