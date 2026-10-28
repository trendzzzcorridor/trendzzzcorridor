# Validation report

Validated on 14 September 2026 using Node.js 24.14.1 and the Codex in-app browser. These checks cover the static frontend, not a live commerce backend.

## Automated checks

Run from the project directory:

```sh
npm test
npm run check
```

**21 regression tests passed.** They cover:

- 135 unique product IDs and at least 15 products in every requested subcategory.
- Heading-slider category/tag eligibility and representation of every subcategory.
- Sixteen unique new arrivals, four per major category, plus shortfall handling.
- Shuffling without mutation, duplicates or unrelated records.
- Combined category, style, size, price, stock and new-arrival filters.
- Inclusive price boundaries and every sorting mode.
- HTTP/JSON loading failures, retry, cache and invalid record handling.
- Escaped product text and rejected unsafe image paths.
- Missing-image fallback without an error loop.
- Empty, corrupt, malformed and unavailable localStorage.
- Failed writes taking precedence over stale saved cart data.
- Cross-tab removal not resurrecting cached cart data.
- Variant merging, quantity limits and stock shared between options.
- Current JSON prices, correct totals and stale/deleted product reconciliation.
- Local page links and required metadata.

The project validator additionally passed: **14 HTML files (including the shared header fragment), 12 stylesheets, 11 JavaScript modules, and 324 local references**. All 135 expected product JPEGs exist. All JavaScript modules passed syntax checks. `git diff --check` passed after normalising line endings.

## Browser checks completed

| Area | Verified behaviour |
| --- | --- |
| Navigation | Shared header, homepage/category links, profile and bag links, sidebar subcategory navigation, and dynamically loaded hash targets |
| Sidebar | Open/close controls, outside-backdrop dismissal, Escape dismissal and keyboard focus wrapping to the last menu link |
| Homepage | 16 arrivals and 16 catalogue tiles, working product links, automatic carousel advancement, manual controls, compact combined filters and reset to 16 arrivals |
| Category pages | 30 T-shirts, 30 bottom-wear items, 30 winter-wear items, 45 shirts, appropriate section anchors and category sliders |
| Discovery | Nine subcategory previews, 72 cards on desktop and 36 visible cards on phones (8/4 per section), Show All destinations |
| Filters | Oversized + size L + maximum ₹1,500 + in-stock returned 11 matching tees; ascending prices were correct; no-result and clear/reset states worked |
| Product details | JSON product lookup, missing-size validation, colour selection, quantity buttons, Add to Bag and Buy Now |
| Gallery | A missing first photograph displayed the fallback; selecting a valid second photograph restored the real image and updated the counter |
| Stock | Sold-out products disabled buying; automated tests covered shared variant stock and quantity caps |
| Bag | Two ₹899 tees totalled ₹1,798; increasing to three gave ₹2,697; quantity survived refresh; decrease/removal and empty states worked |
| Checkout | Preview dialog opened normally and via Buy Now, showed totals, and finished without creating an order or taking a payment |
| Account | Register, local profile persistence, name update, sign-out, demo login and deleting the temporary test profile |
| Tracking | Sample lookup succeeded, an unknown order showed a clear no-match state, and the checkout sample link prefilled the ID |
| Admin | Product search, editing an existing product, adding a temporary product, inventory draft updates, draft persistence and discarding test drafts |
| Export | The generated JSON preview parsed to all 135 original products after cleanup, and a downloadable Blob link was generated |
| Errors | Invalid product ID, empty catalogue, intentional catalogue HTTP 500, and missing-image fallback all produced useful states |
| Console | No application warnings/errors observed on normal storefront routes; error fixtures intentionally produced failed network responses |

The in-app browser did not report a file-download event for the export. Export therefore also provides a persistent download link and a fully selectable JSON preview; the preview contents were checked. Use a regular browser's download controls or copy the JSON if your browser does not support Blob downloads.

Temporary account, cart and admin test data were removed. Error fixtures never changed `data/products.json`.

## Responsive checks

- All twelve non-home standalone pages plus the homepage were checked at **375 px** width without page-level horizontal overflow.
- Homepage, catalogue, shirts, detail, bag and admin were also checked at **320 px**, **768 px** and **1440 px** widths without page-level horizontal overflow.
- Homepage filters were exercised while expanded on a phone-sized viewport.
- Phone preview grids showed four products per subcategory; desktop showed eight.
- Stylesheets include reduced-motion handling, responsive grids, visible keyboard focus, labelled forms and native dialog semantics.

This is responsive browser testing, not physical-device or exhaustive cross-browser certification. A future production release should additionally be checked in its supported Safari, Firefox and mobile browsers, with assistive technology and real backend services.

## Reproduce failure states without editing product data

Run each desired fixture in its own terminal. Stop it with Ctrl+C when finished.

```sh
node tests/fixture-server.mjs empty
```

Open `http://localhost:3001/tshirt.html`: a valid empty catalogue and empty slider.

```sh
node tests/fixture-server.mjs broken-json
```

Open `http://localhost:3002/product.html`: an intentional HTTP 500 response for the catalogue, with the friendly load-error state.

```sh
node tests/fixture-server.mjs missing-image
```

Open `http://localhost:3003/product-details.html?id=tshirt1`: an intentionally missing primary photograph plus the original image as a second gallery view. Confirm the fallback and click photograph 2 to restore a valid image.

## Quick manual regression after future changes

1. Run the tests and project validator.
2. Open the homepage, operate its slideshow, and open a product.
3. Use the menu and a subcategory jump link.
4. Combine a size, style, price and stock filter; exercise each sort and clear filters.
5. Select a size/colour, add to bag, change quantity, refresh, remove and inspect totals.
6. Try Buy Now and finish the checkout preview.
7. Check the account and sample tracking flows.
8. Create an admin draft, export/review it and discard the test draft.
9. Check a narrow phone, tablet and desktop layout and the browser console.
10. Run the error fixtures if image, JSON or rendering code changed.
