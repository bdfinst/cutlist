# Spec: Stripe Checkout "Support" Button (open-amount donation)

Status: **Consistency gate PASSED** — supersedes the prior Payment Link version at this path (see git history).

Slice: single vertical slice. One client component, one SvelteKit `+server.ts` route, one new server-side dependency (`stripe`).

---

## 1. Intent Description

The Cutlist Calculator is a free tool. We want to give grateful users a frictionless
way to support continued maintenance via an open-amount Stripe donation. A "Support"
button in the page header POSTs to a SvelteKit API route, which uses the Stripe Node
SDK to create a Stripe Checkout Session with `custom_unit_amount` enabled. The
session URL is returned to the client, which opens it in a new browser tab. The
donor enters the amount and pays on Stripe's hosted Checkout page; this app never
sees, stores, or processes payment data.

The button is feature-flagged via the build-time public flag
`PUBLIC_STRIPE_DONATE_ENABLED`. When the flag is not exactly the string `"true"`,
the button does not render — even if `STRIPE_SECRET_KEY` is present on the server.
This guarantees a consistent rule: a missing public flag means no donation UI,
ever, with no fallback URL.

`STRIPE_SECRET_KEY` lives **only** on the server, read via SvelteKit's
`$env/static/private`. It is never bundled to the client and never carries the
`PUBLIC_` prefix.

---

## 2. User-Facing Behavior (Gherkin)

```gherkin
Feature: Support the Cutlist Calculator via Stripe Checkout

  Background:
    Given the build was configured with PUBLIC_STRIPE_DONATE_ENABLED=true
    And the server has a valid STRIPE_SECRET_KEY

  Scenario: Support button is visible in the header on desktop
    Given I am on the Cutlist Calculator page on a desktop-width viewport
    Then I see a "Support" button in the page header

  Scenario: Support button is visible in the header on mobile
    Given I am on the Cutlist Calculator page on a mobile-width viewport
    Then I see a "Support" button in the page header
    And there is no horizontal scrollbar

  Scenario: Donor opens Stripe Checkout in a new tab
    Given I am on the Cutlist Calculator page
    When I click the "Support" button
    Then a POST request is made to /api/donate
    And on success, a new browser tab opens to the returned Stripe Checkout URL
    And my current cutlist work in the original tab is unaffected

  Scenario: Donor chooses the amount on Stripe's hosted page
    Given a new Checkout tab has opened
    Then Stripe presents an open-amount donation form with a $1.00 minimum
    And payment, receipt email, and confirmation are handled entirely by Stripe

  Scenario: Donor returns after a successful donation
    Given the donor completed payment on Stripe Checkout
    When Stripe redirects them back to the app
    Then they land on the Cutlist Calculator at "/?donation=thanks"
    And the page renders normally with no broken state

  Scenario: Donor cancels on Stripe Checkout
    Given the donor cancelled on the Stripe Checkout page
    When Stripe redirects them back to the app
    Then they land on the Cutlist Calculator at "/?donation=cancelled"
    And the page renders normally with no broken state

  Scenario: Server cannot reach Stripe
    Given the server failed to create a Checkout Session
    When I click the "Support" button
    Then I see an inline error message "Could not open donation page. Try again."
    And the button is re-enabled so I can retry
    And no new tab opens

  Scenario: Server has no STRIPE_SECRET_KEY configured
    Given the build flag PUBLIC_STRIPE_DONATE_ENABLED=true
    But STRIPE_SECRET_KEY is not configured on the server
    When I click the "Support" button
    Then the API responds 503
    And I see the inline error message
    And no new tab opens

  Scenario: Keyboard user activates the button
    Given I have focused the "Support" button using the Tab key
    When I press Enter
    Then the same flow runs as a click

  Scenario: Screen reader announces the button
    Given I am navigating with a screen reader
    When focus reaches the support button
    Then it is announced with an accessible name including "opens donation page in new tab"
    And while the request is in flight the button reports aria-busy="true"

  Scenario: Build with PUBLIC_STRIPE_DONATE_ENABLED unset hides the button
    Given the build was configured without PUBLIC_STRIPE_DONATE_ENABLED=true
    When I visit the Cutlist Calculator page
    Then no "Support" button is rendered in the header
    And no /api/donate request is issued during page load or any interaction
```

---

## 3. Architecture Specification

### Components

- **New** `src/lib/donate.ts` — pure helpers, server-and-client safe (no Stripe SDK import here):
  - `isDonateEnabled(flag: string | undefined): boolean` — returns `true` only when the trimmed value equals the string `"true"` exactly. All other values (including `"True"`, `"1"`, `"yes"`) return `false`.
  - `buildCheckoutSessionParams({ origin }: { origin: string }): Stripe.Checkout.SessionCreateParams` — builds the session payload (mode, line items with `custom_unit_amount`, success/cancel URLs). Pure function for unit testability.

- **New** `src/routes/api/donate/+server.ts` — SvelteKit POST endpoint:
  - Reads `STRIPE_SECRET_KEY` via `$env/static/private`. Returns `503 { error: 'Donations not configured' }` if missing.
  - Imports `Stripe` from `stripe` (Node SDK, server-only).
  - Calls `stripe.checkout.sessions.create(buildCheckoutSessionParams({ origin: url.origin }))`.
  - Returns `200 { url: session.url }` on success, `502 { error: '...' }` on Stripe API failure.
  - Logs failures to stderr without including request bodies or PII.

- **New** `src/lib/components/DonateButton.svelte` — client component:
  - Reads `PUBLIC_STRIPE_DONATE_ENABLED` via `$env/static/public`.
  - Renders nothing when `isDonateEnabled(flag)` is `false`.
  - Otherwise renders a `<button>` (not an anchor — we POST first, then open).
  - On click: sets local `loading=true`, calls `fetch('/api/donate', { method: 'POST' })`, on success calls `window.open(url, '_blank', 'noopener,noreferrer')`, on failure sets a local error message.
  - The error message is rendered inside an `aria-live="polite"` region.
  - The button has `aria-busy={loading}` while the request is in flight.

- **Modified** `src/routes/+page.svelte` — imports and renders `<DonateButton />` in the header, alongside the existing right-hand stats cluster.

### Configuration

- `STRIPE_SECRET_KEY` — server-only secret. Set in Netlify Environment variables (Functions or All scopes). Local dev: `.env.local` (gitignored). MUST NOT have a `PUBLIC_` prefix.
- `PUBLIC_STRIPE_DONATE_ENABLED` — build-time public flag. Set to the literal string `"true"` to render the button. Anything else (or unset) hides it.

### Dependencies

- New runtime dep: **`stripe`** (Node SDK, server-only). Imported exclusively in `+server.ts`. Must not appear in any module that is bundled to the client.
- Stripe Checkout Session config:
  - `mode: 'payment'`
  - `line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Cutlist Calculator donation' }, custom_unit_amount: { enabled: true, minimum_amount: 100 } }, quantity: 1 }]`
  - `success_url: ${origin}/?donation=thanks`
  - `cancel_url: ${origin}/?donation=cancelled`
- Currency on the Session is `usd`. Buyer-side localization relies on Stripe's account-level **Adaptive Pricing** setting (Dashboard → Settings → Adaptive Pricing). No code-level currency detection.

### Constraints

- `STRIPE_SECRET_KEY` MUST NOT appear in any client-bundled file. Verified by grepping `.svelte-kit/output/client/` after build.
- The `stripe` package MUST NOT be imported from any module that ends up in the client bundle.
- The button MUST NOT render unless `isDonateEnabled(PUBLIC_STRIPE_DONATE_ENABLED)` returns `true`.
- The API endpoint MUST NOT trust any client-supplied amount, currency, or metadata in v1.
- No analytics, no tracking, no third-party SDK beyond Stripe.
- No payment data, card data, or PII is collected, logged, or stored by this app.
- Bundle delta on the client < 2 KB gzipped.

### Out of scope

- Webhook handler (verifying donations server-side, donor email, idempotency)
- In-app toast / banner on `?donation=thanks` (the query param is left in place for a future slice)
- Donor wall, donation totals, recurring donations
- Multiple currencies in the API call (Adaptive Pricing in the Stripe dashboard handles buyer display)
- Rate limiting / abuse mitigation
- Embedded Stripe Elements

---

## 4. Acceptance Criteria

Functional:
- [ ] When `PUBLIC_STRIPE_DONATE_ENABLED=true`, a "Support" button renders in the header on desktop (≥ 768 px) and mobile (≥ 360 px) widths with no horizontal overflow.
- [ ] When the flag is unset or any value other than the literal string `"true"`, no Support button renders, and no `/api/donate` request is issued at any time.
- [ ] Clicking the button POSTs to `/api/donate` and, on a 200 response, calls `window.open(url, '_blank', 'noopener,noreferrer')`.
- [ ] The Checkout Session created by the server has: `mode: 'payment'`, currency `usd`, `custom_unit_amount.enabled: true`, `custom_unit_amount.minimum_amount: 100`, `success_url` ending in `/?donation=thanks`, `cancel_url` ending in `/?donation=cancelled`.
- [ ] On API error or fetch failure, an inline error message appears in an `aria-live="polite"` region, the button re-enables, and no new tab opens.
- [ ] When `STRIPE_SECRET_KEY` is missing, the route returns 503; the client surfaces the inline error.

Security:
- [ ] `grep -r STRIPE_SECRET_KEY .svelte-kit/output/client` finds zero matches after a production build.
- [ ] `grep -r '"stripe"' .svelte-kit/output/client` finds zero matches after a production build (confirms the SDK isn't bundled to the client).
- [ ] No env var with prefix `STRIPE_` (other than `PUBLIC_STRIPE_DONATE_ENABLED`) is exposed via `$env/static/public` or `$env/dynamic/public`.
- [ ] The server route ignores all client-supplied request body fields in v1.

Accessibility:
- [ ] Button is in the natural Tab order and activatable with Enter.
- [ ] Accessible name includes the phrase "opens donation page in new tab".
- [ ] Loading state communicated via `aria-busy="true"` on the button.
- [ ] Error message is in an `aria-live="polite"` region.
- [ ] Lighthouse accessibility score for `/` does not regress versus `main`.

Quality:
- [ ] All existing Vitest suites still pass.
- [ ] New Vitest tests pass:
  - `isDonateEnabled` covers `undefined`, `""`, `"true"`, `"True"`, `"TRUE"`, `"false"`, `"1"`, `"yes"`, `"  true  "`.
  - `buildCheckoutSessionParams` covers shape, currency, minimum, mode, success/cancel URLs given an origin.
  - Server route handler (with mocked Stripe SDK and mocked `$env/static/private`) covers: 200 success path, 503 missing key, 502 Stripe error.
- [ ] Playwright e2e (with `/api/donate` mocked via `page.route()`) verifies the popup opens to the mocked URL on click, on both desktop and mobile viewports.
- [ ] `npm run check` passes.
- [ ] `stripe` appears under `dependencies` in `package.json`. No other new packages.
- [ ] Manual browser smoke at 360 / 768 / 1280 px widths against a real Stripe **test-mode** secret key.
- [ ] Manual build with `PUBLIC_STRIPE_DONATE_ENABLED` unset: confirm Support button absent and no `/api/donate` calls in DevTools Network.
- [ ] README documents `STRIPE_SECRET_KEY` and `PUBLIC_STRIPE_DONATE_ENABLED` setup in Netlify and locally.

---

## Consistency Gate

- [x] Intent unambiguous — two developers would interpret it the same way.
- [x] Every behavior in intent has at least one Gherkin scenario.
- [x] Architecture constrains implementation to what intent requires; no over-engineering (no webhooks, no toasts, no rate limiting in v1).
- [x] Naming consistent across artifacts: "Support" button, `STRIPE_SECRET_KEY`, `PUBLIC_STRIPE_DONATE_ENABLED`, `/api/donate`, `?donation=thanks`, `?donation=cancelled`, `custom_unit_amount`, `minimum_amount: 100`.
- [x] No artifact contradicts another.

**Verdict: PASS.** Ready to plan implementation.

---

## Decisions log

- Path: **Stripe Checkout via SvelteKit `+server.ts`** (supersedes prior Payment Link decision after maintainer confirmed customer-chosen amount was unavailable for their account).
- Function host: **SvelteKit API route** at `/api/donate` — auto-deployed as a Netlify Function via adapter-netlify.
- Donor enters amount: **on Stripe's hosted Checkout page** (`custom_unit_amount`), not on our page.
- Tab behavior: **new tab** via `window.open` with `noopener,noreferrer`.
- Hide-button toggle: **build-time public flag** `PUBLIC_STRIPE_DONATE_ENABLED`. The secret key alone never reveals the button.
- Currency: **USD** at the API layer; rely on **Stripe Adaptive Pricing** (dashboard setting) for buyer-localized display.
- Minimum donation: **$1.00** (`minimum_amount: 100` cents).
- Success URL: **`/?donation=thanks`**; Cancel URL: **`/?donation=cancelled`**. **No** in-app toast in v1.
- Rate limiting: **deferred**.
- Webhook handler: **deferred**.
