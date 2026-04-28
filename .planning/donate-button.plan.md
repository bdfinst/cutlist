# Plan: Stripe Checkout "Support" Button

**Created**: 2026-04-28
**Branch**: feat/donate-button
**Status**: approved
**Spec**: [.planning/donate-button.spec.md](./donate-button.spec.md)

## Goal

Add a "Support" button to the page header that creates a Stripe Checkout Session
(open-amount donation, $1 minimum) via a SvelteKit `+server.ts` API route, then
opens Stripe's hosted Checkout page in a new tab. The button is feature-flagged
via `PUBLIC_STRIPE_DONATE_ENABLED`; when not set to `"true"`, the button does not
render and no `/api/donate` request is ever made. The Stripe Node SDK and
`STRIPE_SECRET_KEY` stay strictly server-side.

## Acceptance Criteria

- [ ] When `PUBLIC_STRIPE_DONATE_ENABLED=true`, the Support button renders in the header on desktop and mobile widths.
- [ ] When the flag is unset or any value other than the literal string `"true"`, no button renders and no `/api/donate` request is issued.
- [ ] Clicking the button POSTs to `/api/donate`; on 200 response, the returned `url` opens via `window.open(url, '_blank', 'noopener,noreferrer')`.
- [ ] The Checkout Session has `mode: 'payment'`, currency `usd`, `custom_unit_amount.minimum_amount: 100`, `success_url` ending `/?donation=thanks`, `cancel_url` ending `/?donation=cancelled`.
- [ ] On API failure, an inline error appears in an `aria-live="polite"` region, the button re-enables, and no tab opens.
- [ ] When `STRIPE_SECRET_KEY` is missing, the route returns 503 with `{ error: 'Donations not configured' }`.
- [ ] Unit tests for `isDonateEnabled`, `buildCheckoutSessionParams`, and the route handler (with mocked Stripe SDK + mocked `$env/static/private`) pass.
- [ ] Playwright e2e (with `/api/donate` mocked) verifies popup opens to the mocked URL.
- [ ] After production build, `STRIPE_SECRET_KEY` and `"stripe"` do not appear in `.svelte-kit/output/client/`.
- [ ] `stripe` is the only new dependency, added to `dependencies` (not `devDependencies`).
- [ ] README documents both env vars and the Stripe dashboard setup.

## Steps

### Step 1: Helpers — `isDonateEnabled` and `buildCheckoutSessionParams`

**Complexity**: standard
**RED**: Add `test/donate.spec.ts` (BDD `describe`/`it`):

`describe('isDonateEnabled')`
- `it('returns false for undefined')`
- `it('returns false for empty string')`
- `it('returns false for whitespace-only string')`
- `it('returns true for the literal string "true"')`
- `it('returns true for "  true  " (trims whitespace)')`
- `it('returns false for "True", "TRUE", "1", "yes", "false", any other value')`

`describe('buildCheckoutSessionParams')`
- `it('returns mode "payment"')`
- `it('returns a single line item with currency usd')`
- `it('returns custom_unit_amount enabled with minimum_amount 100')`
- `it('returns success_url at <origin>/?donation=thanks')`
- `it('returns cancel_url at <origin>/?donation=cancelled')`
- `it('uses the provided origin verbatim (no trailing slash injection)')`

**GREEN**: Create `src/lib/donate.ts`:

```ts
import type Stripe from 'stripe';

export function isDonateEnabled(flag: string | undefined): boolean {
  return typeof flag === 'string' && flag.trim() === 'true';
}

export function buildCheckoutSessionParams({ origin }: { origin: string }): Stripe.Checkout.SessionCreateParams {
  return {
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Cutlist Calculator donation' },
        custom_unit_amount: { enabled: true, minimum_amount: 100 }
      },
      quantity: 1
    }],
    success_url: `${origin}/?donation=thanks`,
    cancel_url: `${origin}/?donation=cancelled`
  };
}
```

`stripe` is needed at this step only for the type import — install it now: `npm install stripe`.

**REFACTOR**: None expected.

**Files**: `package.json`, `package-lock.json`, `src/lib/donate.ts`, `test/donate.spec.ts`

**Commit**: `feat(donate): add helpers for Stripe Checkout session params and flag gate`

---

### Step 2: API route `src/routes/api/donate/+server.ts`

**Complexity**: standard
**RED**: Add `test/donate-route.spec.ts`:

```
describe('POST /api/donate handler')
  it('returns 503 when STRIPE_SECRET_KEY is missing')
  it('returns 200 with the session URL on success')
  it('passes the request origin into the session params')
  it('returns 502 when the Stripe SDK throws')
  it('does not include any client-supplied body fields in the session params')
```

Use `vi.mock('$env/static/private', () => ({ STRIPE_SECRET_KEY: '...' }))` per test. Mock the `stripe` constructor so `checkout.sessions.create` returns `{ url: 'https://checkout.stripe.com/c/pay/test_xyz' }` or throws.

**GREEN**: Create `src/routes/api/donate/+server.ts`:

```ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { buildCheckoutSessionParams } from '$lib/donate';

export const POST: RequestHandler = async ({ url }) => {
  if (!STRIPE_SECRET_KEY) {
    return json({ error: 'Donations not configured' }, { status: 503 });
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionParams({ origin: url.origin })
    );
    if (!session.url) throw new Error('Stripe returned no session URL');
    return json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error('[donate] Stripe error:', err instanceof Error ? err.message : err);
    return json({ error: 'Could not create Checkout Session' }, { status: 502 });
  }
};
```

Note: `STRIPE_SECRET_KEY` may need to come from `$env/dynamic/private` if `$env/static/private` errors at build time when the var is unset locally. Decide here based on actual build behavior; document the choice in Step 5.

**REFACTOR**: Extract Stripe client construction into a memoized helper if the route grows; not needed for v1.

**Files**: `src/routes/api/donate/+server.ts`, `test/donate-route.spec.ts`

**Commit**: `feat(donate): add /api/donate route that creates a Stripe Checkout Session`

---

### Step 3: `DonateButton.svelte` component

**Complexity**: standard
**RED**: No automated test in this step (no Svelte component test harness in the project). The Playwright e2e in Step 4 is the integration RED. `npm run check` provides type safety.

**GREEN**: Create `src/lib/components/DonateButton.svelte`:

- Imports `PUBLIC_STRIPE_DONATE_ENABLED` from `$env/static/public`.
- Computes `enabled = isDonateEnabled(PUBLIC_STRIPE_DONATE_ENABLED)` once at module/script time.
- Local reactive state via Svelte 5 runes: `$state` for `loading` and `errorMsg`.
- If `!enabled`, renders nothing.
- Otherwise renders:
  - `<button>` with text "Support", `aria-label="Support, opens donation page in new tab"`, `aria-busy={loading}`, `disabled={loading}`.
  - Tailwind classes matching the existing header palette (`text-shop-muted hover:text-plywood`, small font, padding consistent with neighbors).
  - An adjacent `<span role="status" aria-live="polite">{errorMsg}</span>` (visually small, inline).
- Click handler:
  ```
  loading = true; errorMsg = '';
  try {
    const res = await fetch('/api/donate', { method: 'POST' });
    if (!res.ok) throw new Error();
    const { url } = await res.json();
    if (!url) throw new Error();
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    errorMsg = 'Could not open donation page. Try again.';
  } finally {
    loading = false;
  }
  ```

**REFACTOR**: None expected.

**Files**: `src/lib/components/DonateButton.svelte`

**Commit**: `feat(donate): add DonateButton component gated by PUBLIC_STRIPE_DONATE_ENABLED`

---

### Step 4: Header wiring + Playwright e2e

**Complexity**: standard
**RED**: Add `e2e/donate.spec.ts`. Configure `playwright.config.ts` so `webServer.env` sets `PUBLIC_STRIPE_DONATE_ENABLED=true`. Tests:

- "Support button is visible in the header on desktop (1280×720)": loads `/`, asserts a button with accessible name matching `/support/i` is visible inside the `<header>`.
- "Support button is visible in the header on mobile (375×667)": same plus `document.documentElement.scrollWidth <= clientWidth`.
- "Clicking Support opens a new tab to the URL returned by /api/donate":
  - `await page.route('**/api/donate', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://checkout.stripe.com/test/abc' }) }))`
  - `const popupPromise = page.waitForEvent('popup')`
  - click the button
  - `const popup = await popupPromise`
  - `expect(popup.url()).toBe('https://checkout.stripe.com/test/abc')` (or `toMatch(/checkout\.stripe\.com/)` if Playwright opens with `about:blank` first)
- "On API failure the button re-enables and shows an error":
  - `page.route('**/api/donate', route => route.fulfill({ status: 502, body: '{}' }))`
  - click, assert visible text "Could not open donation page. Try again."
  - assert button is enabled again (no `[disabled]`)

These tests fail because the button is not in the header yet.

**GREEN**: Edit `src/routes/+page.svelte`:

- Import `DonateButton` from `$lib/components/DonateButton.svelte`.
- Render `<DonateButton />` inside the `<header>`'s right-hand cluster, alongside (or to the right of) the conditional stats bar.
- Adjust flex/gap classes so the button stays visible at 360 px width without overflowing.

The "hidden when flag unset" scenario from the spec is not e2e-tested in this slice (would require a second Playwright project or webServer config). It is covered by:
- Step 1 unit test for `isDonateEnabled('')`, `isDonateEnabled(undefined)`, etc.
- Pre-PR manual gate: build with `PUBLIC_STRIPE_DONATE_ENABLED` unset, confirm absence in HTML.

**REFACTOR**: If the right-hand header cluster gets cluttered, extract it into a small inline subcomponent — only if the layout tests fail.

**Files**: `src/routes/+page.svelte`, `playwright.config.ts`, `e2e/donate.spec.ts`

**Commit**: `feat(donate): show Support button in header and verify via Playwright`

---

### Step 5: Documentation

**Complexity**: trivial
**RED**: N/A.
**GREEN**: Add a "Donations / Stripe configuration" section to `README.md` covering:

1. Stripe dashboard setup:
   - Get a secret key (test-mode for dev, live-mode for prod): Dashboard → Developers → API keys → Secret key.
   - (Optional) Enable Adaptive Pricing for buyer-localized currency display: Settings → Adaptive Pricing.
2. Netlify env vars:
   - `STRIPE_SECRET_KEY` (sensitive, scope: Functions or All).
   - `PUBLIC_STRIPE_DONATE_ENABLED=true` (scope: All; build-time).
3. Local development:
   - Create `.env.local` with both vars (note: `.env*` is gitignored by SvelteKit by default — verify before committing).
   - Run `npm run dev` — SvelteKit dev server runs the `+server.ts` route natively; no Netlify CLI needed.
   - Use Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC) on the Checkout page.
4. Operational notes:
   - Without `PUBLIC_STRIPE_DONATE_ENABLED=true`, the button is hidden — local dev and forks build cleanly with no Stripe account.
   - The `stripe` SDK is server-only and not bundled to the client.
   - The app never sees, stores, or processes payment data.
   - There is no webhook handler in v1; Stripe handles receipts and confirmation directly.

**REFACTOR**: None.

**Files**: `README.md`

**Commit**: `docs(donate): document Stripe Checkout configuration for Netlify and local dev`

---

## Complexity Classification

| Step | Rating | Reason |
|------|--------|--------|
| 1 | standard | New module + tests; pure logic; new runtime dep |
| 2 | standard | New server route, new SDK integration, security-sensitive (handles secret) |
| 3 | standard | New Svelte component touching `$env/static/public` and `window.open` |
| 4 | standard | Layout edit + Playwright config wiring + popup interception |
| 5 | trivial | Docs only |

(Consider step 2 borderline-complex: it introduces a server-side secret and a third-party SDK. Treat with `standard` review depth + the pre-PR security check for client-bundle leakage.)

## Pre-PR Quality Gate

- [ ] `npm test` passes (Vitest, including new `donate.spec.ts` and `donate-route.spec.ts`)
- [ ] `npm run check` passes (svelte-check / TypeScript)
- [ ] `npx playwright test` passes locally with `PUBLIC_STRIPE_DONATE_ENABLED=true` and `/api/donate` mocked
- [ ] **Security check**: after `npm run build`, run `grep -r STRIPE_SECRET_KEY .svelte-kit/output/client/` and `grep -rE '"stripe"|from "stripe"|require\("stripe"\)' .svelte-kit/output/client/` — both must return zero matches
- [ ] Manual end-to-end with a real Stripe **test-mode** secret key: button → Stripe Checkout → test card `4242…` → returns to `/?donation=thanks`
- [ ] Manual cancel: button → Stripe Checkout → cancel → returns to `/?donation=cancelled`
- [ ] Manual build with `PUBLIC_STRIPE_DONATE_ENABLED` unset — button absent, no `/api/donate` calls in DevTools Network
- [ ] Manual browser checks at 360 / 768 / 1280 px viewport widths
- [ ] `dependencies` in `package.json` adds only `stripe`; no other new packages
- [ ] `/code-review --changed` passes
- [ ] README updated and accurate

## Risks & Open Questions

- **`$env/static/private` build behavior** — If SvelteKit errors when `STRIPE_SECRET_KEY` is referenced but unset at build time, switch the import in `+server.ts` to `$env/dynamic/private` (read at runtime, returns `undefined`). The route handler already guards on falsy. Document the resolution in Step 5.
- **`$env/static/public` build behavior** — Same risk for `PUBLIC_STRIPE_DONATE_ENABLED`. If unset triggers a build error, switch to `$env/dynamic/public` or document that the variable must be defined (even as empty string) in Netlify and `.env.local`. Hard rule preserved either way: only the literal `"true"` shows the button.
- **Hard rule: no fallback URL, ever** — The component MUST NOT render when `isDonateEnabled` returns false. There is no environment configuration that should bypass this check. The unit tests in Step 1 are the canonical guard.
- **Client-bundle leakage** — Importing `stripe` or referencing `$env/static/private` from any module reachable by the client bundle would leak the SDK and/or the secret key. Mitigation: confine those imports to `+server.ts`. Verified by the post-build grep in the pre-PR gate.
- **Adapter compatibility** — adapter-auto picks adapter-netlify; verify in Step 4 that `+server.ts` deploys correctly as a Netlify Function on the existing setup. Cold start latency on the Function is acceptable for a low-frequency donation endpoint.
- **Stripe SDK ESM/CJS** — `stripe` ships dual ESM/CJS in recent versions; should work with the project's `"type": "module"`. If `import Stripe from 'stripe'` fails, use the namespace import per Stripe docs. Resolve in Step 2.
- **CSRF on POST** — same-origin POST without auth is acceptable here: the endpoint creates Stripe Sessions (not money movement) and accepts no client-supplied data. Worst-case abuse is filling our Stripe dashboard with unused Sessions, which Stripe rate-limits internally.
- **Playwright popup interception** — `window.open(url, '_blank')` may produce an `about:blank` first, then navigate. Use `page.waitForEvent('popup')` and assert URL via `popup.waitForURL()` if the initial URL is blank.
- **Stripe Payment Link / Account configuration** — The maintainer must obtain a `STRIPE_SECRET_KEY` (test for dev, live for prod) and set `PUBLIC_STRIPE_DONATE_ENABLED=true` in Netlify before merge enables donations in production.
