import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		env: {
			PUBLIC_STRIPE_DONATE_ENABLED: 'true'
		}
	},
	testDir: 'e2e',
	use: {
		baseURL: 'http://localhost:5173'
	}
});
