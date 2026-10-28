# FORME clothing storefront

A complete HTML, CSS and vanilla JavaScript clothing store. No framework, build step, package installation, external fonts or runtime image service is required. Product information has one source: **`data/products.json`**.

FORME is an editable placeholder brand. Prices use Indian rupees. The catalogue contains **135 sample products: 15 in each of nine subcategories**. The 135 numbered JPEG files reuse nine original AI-generated sample photographs. They illustrate the store; they are not photographs of real inventory or every colour variation.

## Run the website

1. Install Node.js 20 or later if it is not already installed.
2. Open a terminal in this project folder.
3. Run:

   ```sh
   npm start
   ```

4. Open **http://localhost:3000** in your browser.
5. Edit a file, save it, and refresh the browser. Stop the server with **Ctrl+C**.

`npm install` is unnecessary because the project has no package dependencies. `npm run dev` is an alias for `npm start`.

If port 3000 is occupied, use PowerShell:

```powershell
$env:PORT = '3005'
npm start
```

Then visit http://localhost:3005. The development server binds to your computer only. It serves root HTML pages and the `css/`, `js/`, `data/` and `images/` folders; it does **not** expose `legacy/`, Git metadata, scripts or tests.

Do not double-click an HTML file to run it using `file://`. Browser security rules prevent reliable `fetch()` loading of the shared header and JSON that way.

## Existing repository preserved

The repository originally contained a medicine storefront with Firebase-related files. Its files, assets and server functions were preserved under **`legacy/`**. They are not imported, executed or served by the clothing store. Existing Git history and the root `.gitignore` were retained. No deployment or changes to the former live store were performed.

## File tree

```text
/
├── index.html                 Homepage
├── header.html                Single shared header and sidebar component
├── product.html               Catalogue discovery and subcategory previews
├── tshirt.html                Relaxed / oversized
├── bottom-wear.html           Joggers / jeans
├── winter-wear.html           Hoodies / jackets
├── shirts.html                Printed / plain / oversized
├── product-details.html       One reusable product page, selected by ?id=
├── cart.html                  Persistent bag and checkout preview
├── my-account.html            Local account/profile demonstration
├── tracking.html              Demo shipment lookup
├── about-us.html              Editable brand story
├── privacy-policy.html        Clearly marked policy template
├── admin-dashboard.html       Product/inventory drafts and JSON export
├── css/
│   ├── common.css             Design variables, reset, cards, footer, utilities
│   ├── header.css             Shared header and accessible sidebar
│   ├── slider.css             Reusable carousel
│   ├── filters.css            Shared filter and sorting controls
│   ├── index.css              Homepage only
│   ├── product.css            Catalogue and all four category pages
│   ├── product-details.css    Product detail page
│   ├── cart.css               Bag and checkout dialog
│   ├── account.css            Account/profile
│   ├── tracking.css           Tracking timeline
│   ├── about.css              About and privacy pages
│   └── admin.css              Administration preview
├── js/
│   ├── common.js              Product loading, cards, storage, cart utilities
│   ├── header.js              Header fetch, sidebar, badge, shared footer
│   ├── slider.js              Tag-filtered product carousels
│   ├── index.js               Homepage hero, balanced arrivals, catalogue
│   ├── filters.js             Reusable filter and sorting logic/controls
│   ├── products.js            Catalogue and category page rendering
│   ├── product-details.js     Product lookup, gallery, options, purchases
│   ├── cart.js                Bag editing, stock reconciliation, totals
│   ├── account.js             Local demo profile; never stores passwords
│   ├── tracking.js            Replaceable demo order lookup
│   └── admin.js               Local drafts, editor, inventory, export
├── data/
│   └── products.json          The live storefront's product source
├── images/
│   ├── favicon.svg
│   ├── README.md              Sample photograph provenance and reuse
│   ├── tshirt1.jpeg … tshirt30.jpeg
│   ├── jogger1.jpeg … jogger15.jpeg
│   ├── jeans1.jpeg … jeans15.jpeg
│   ├── hoodie1.jpeg … hoodie15.jpeg
│   ├── jacket1.jpeg … jacket15.jpeg
│   └── shirt1.jpeg … shirt45.jpeg
├── scripts/
│   ├── server.mjs             Dependency-free local development server
│   ├── check-project.mjs      Paths, schema, metadata and syntax checks
│   ├── format-css.mjs         Optional CSS whitespace formatter
│   └── create-sample-data.mjs  Optional initial sample-data generator
├── tests/
│   ├── store.test.mjs         Automated catalogue/cart regression tests
│   └── fixture-server.mjs     Isolated error-state tests, no data mutation
├── legacy/                   The preserved original website
├── package.json
├── README.md
└── TESTING.md                Validation details and manual checklist
```

## How the pages fit together

```text
data/products.json
        ↓ getProducts() in common.js
        ├── tags → homepage/category sliders and promotional previews
        ├── new-arrival tag or newArrival → homepage arrivals
        ├── category + subcategory → reusable listings and filters
        ├── ?id=PRODUCT_ID → product-details.html
        └── bag IDs → current product prices, options and stock
```

Every customer page loads `header.html` through `js/header.js`. The footer is generated once in that same module. The menu supports Escape, a focus trap, backdrop dismissal and a return to the opening control. There are no individually maintained copies of the header.

The same `productCard()` helper renders cards everywhere. The same `createSlider()` handles automatic looping, shuffle, previous/next, pause/play, touch swipes and reduced-motion preferences. A product is selected by its ID even if it appears in several promotional locations.

## Add or change a product

Open `data/products.json`. It is a JSON **array** containing product objects. Copy an existing object, give it a unique ID and update its details. Keep commas between objects; do not add a trailing comma after the last object. JSON does not allow comments.

Example new entry:

```json
{
  "id": "tshirt31",
  "name": "Relaxed Cotton T-Shirt",
  "category": "tshirt",
  "subcategory": "relaxed",
  "image": "images/tshirt31.jpeg",
  "images": ["images/tshirt31.jpeg", "images/tshirt131.jpeg"],
  "price": 999,
  "originalPrice": 1299,
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Black", "Ecru"],
  "stock": 20,
  "description": "Replace with an accurate description of your real product.",
  "material": "Replace with verified fabric composition.",
  "care": "Replace with the manufacturer's care instructions.",
  "tags": ["main-index", "product-image", "tshirt-heading", "new-arrival"],
  "newArrival": true,
  "createdAt": "2026-09-14"
}
```

- `id`: permanent, unique identifier used in links and saved bags. Renaming an ID makes old links/bag entries unavailable.
- `image`: primary local image. `images` supplies any additional gallery images, with the primary image included automatically.
- `price`: number in INR, without a currency symbol. `originalPrice` is optional/null; a discount appears only when it exceeds the current price.
- `sizes`: allowed options. A shopper must select a size.
- `colors`: optional string array; use `[]` if the product has no colour choices. The first colour is initially selected. Photos do not change by colour in this schema.
- `stock`: nonnegative whole number shared across all sizes/colours for that product. Zero disables buying.
- `createdAt`: ISO date (`YYYY-MM-DD`) used by Newest sorting.
- `newArrival`: optional convenience flag. A product is new if this is true **or** the `new-arrival` tag exists. Remove the tag and set this false to remove new-arrival status.
- Unknown optional fields are preserved by the admin editor when editing an existing entry.

The HTML/JavaScript does not rely on the sample names or IDs. Replace the sample catalogue with your own products when ready. The optional generator is never run by `npm start`, checks or tests. It refuses to overwrite existing data unless explicitly called with `--replace-demo-data`; do not use that flag on your real catalogue.

## Image naming and placement

Place product photographs in `images/`. Use **lowercase letters, predictable numbering, no spaces, and `.jpeg`**: `tshirt31.jpeg`, `hoodie16.jpeg`, `shirt46.jpeg`. Additional views can use another numbered file, such as `tshirt131.jpeg`, and must be listed in that product's `images` array. Avoid conflicting with another product's filename.

Portrait photographs work well for cards. Use sensible web-sized files (approximately 800–1200 px on the longer edge). Cards use `object-fit: cover` with a consistent 3:4 frame; hero positioning is in `slider.css`/`index.css`; product detail uses a larger gallery frame. Replace all sample pictures and factual sample descriptions before real selling. See `images/README.md` for original illustrative image details.

Missing photographs display a branded “Image coming soon” fallback and keep the layout usable. Broken images do not prevent filtering or adding valid products to the bag.

## Promotional tags

| Tag | Placement |
| --- | --- |
| `main-index` | Homepage hero slider |
| `product-image` | Randomized catalogue promotion and featured previews |
| `tshirt-heading` | T-shirt category slider, within category `tshirt` |
| `bottom-wear-heading` | Bottom-wear category slider |
| `winter-wear-heading` | Winter-wear category slider |
| `shirts-heading` | Shirts category slider |
| `new-arrival` | Homepage new arrivals and the new-arrival filter |

For example, add **`"main-index"`** to `tshirt7`'s `tags` to make it eligible for the homepage hero. Add **`"tshirt-heading"`** to show it in the T-shirt heading slider. You do not copy or duplicate the product.

Removing promotional tags never removes a normal product from its category. Category pages display all their products; catalogue previews prioritize tagged products in Featured order, with normal products available when needed. Random selection always happens after eligibility filtering. Homepage arrivals target four distinct products from each major category and fill any shortfall from other eligible arrivals, up to sixteen.

The sixteen homepage catalogue tiles comprise four major categories, nine subcategories, and three useful collection links: new arrivals, under ₹1,500, and the whole catalogue.

## Categories and quick links

| Category value | Subcategory values | Page |
| --- | --- | --- |
| `tshirt` | `relaxed`, `oversized` | `tshirt.html` |
| `bottom-wear` | `joggers`, `jeans` | `bottom-wear.html` |
| `winter-wear` | `hoodies`, `jackets` | `winter-wear.html` |
| `shirts` | `printed`, `plain`, `oversized` | `shirts.html` |

Example: `shirts.html#printed` goes directly to the printed section after products load. For an entirely new category, update `categoryConfig` in `js/common.js`, add a category HTML page, and add its header navigation links. Adding products within these existing categories requires no HTML change.

Filters combine dynamically: category (on discovery), style, size, minimum/maximum price, availability, and new arrivals. Sort by Featured, either price direction, Newest, or Name A–Z. Clear filters removes URL-provided defaults too. Phone filters are collapsible. Discovery previews show up to eight items per subcategory on desktop and four on phones; category pages show the complete filtered set.

The homepage has a compact filter/sort disclosure for its selected sixteen arrivals. Use “View the latest” to filter the full new-arrival catalogue.

## Bag behaviour

The key **`forme-cart-v1`** in localStorage stores only `{ id, size, color, quantity }` records. Prices and names are always read from JSON. Quantities are positive whole numbers, capped at current product stock and 99 per variant. Sizes/colours share the product's stock limit.

On opening the bag, removed products and invalid options are removed, reduced stock is respected, and the user is told when their bag changes. The badge updates immediately and across browser tabs. Empty/corrupt storage is handled. If writing to storage fails, the page uses an in-memory bag and warns that it will not survive navigation. Buy Now does not navigate away from an unsaved in-memory bag.

Buy Now adds the selected item and opens `cart.html?checkout=1`. The checkout dialog reviews the bag and ends with a clear preview-complete state. It collects no payment data and does not place an order. Delivery, taxes and payment processing require a backend.

## Account, tracking and admin demonstrations

- **Account:** register/login forms open a local profile using sample details. Passwords are cleared and are never checked, saved or transmitted. Profile keys are `forme-demo-profile-v1` and `forme-demo-session-v1`. Update, sign out and delete the local profile from the page. This is not secure authentication.
- **Tracking:** use order **`FORME1001`** with email **`demo@example.com`**, or click “Fill demo details”. The `findOrder()` function in `js/tracking.js` is the future API integration point. This sample order is independent of the bag/checkout preview.
- **Admin:** overview, products, add/edit product, inventory, orders and customers are present. Edits save under **`forme-admin-drafts-v1`**, separate from the storefront data. Export produces a merged JSON array and a selectable text preview. Review and back up your catalogue, then manually place the exported file at `data/products.json` to apply it. Drafts remain until discarded. Editing stock or names in admin does not secretly alter the storefront. No protected admin backend exists yet.

For a production store, connect secure authentication, authorised administration, a product/inventory database with variant stock and concurrent order handling, an order service, a payment provider, shipping/tracking APIs and customer records. Add final shipping/return/tax rules and replace the About/Privacy placeholders with verified business information and a final policy. No live integrations from `legacy/` are used.

## Change the design

Start with the variables at the top of `css/common.css`: colours, spacing, content width, fonts and header height. The rest of the styles are separated by page as shown in the tree. Look for `START` and `END` section comments in HTML, CSS and JavaScript.

To rename the brand, edit `header.html`, the footer template in `js/header.js`, homepage copy, page metadata, About/Privacy text and the small favicon. Product names are edited only in JSON.

## Test and validate

```sh
npm test
npm run check
```

Tests run with Node's built-in test runner. Checks inspect local links, imports, metadata, image files, JSON schema and JavaScript syntax. The minimum sample-count checks assume this initial demonstration dataset; update those assertions deliberately when replacing it with a smaller real catalogue.

See **`TESTING.md`** for browser checks and the isolated empty-catalogue, failed-fetch and missing-image servers. Test fixture servers never modify the real product JSON.

## Hosting later

The storefront is static. Upload only the root storefront HTML files plus `css/`, `js/`, `data/` and `images/` to a static host. Do not publish the preserved `legacy/`, `.git`, scripts or test folders. Nothing has been deployed by this build. A static host alone does not turn the demo features into real commerce services.
