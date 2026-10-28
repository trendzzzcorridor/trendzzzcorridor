import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { categoryConfig, escapeHTML, imageURL, productCard, shuffle, isNewArrival } from '../js/common.js';
import { filterProducts, sortProducts } from '../js/filters.js';
import { balancedArrivals } from '../js/index.js';

// ==================== TEST FIXTURES AND BROWSER ADAPTER START ====================
// Node's built-in test runner needs no installation. A small browser adapter lets
// the real storage/cart code run without a DOM library or a live browser.
const products = JSON.parse(await readFile(new URL('../data/products.json', import.meta.url), 'utf8'));
let moduleSequence = 0;
const freshCommon = () => import(`../js/common.js?test=${moduleSequence++}`);
const sampleProduct = (overrides = {}) => ({
  id: 'sample1', name: 'Sample Tee', category: 'tshirt', subcategory: 'relaxed',
  image: 'images/tshirt1.jpeg', images: ['images/tshirt1.jpeg'],
  sizes: ['S', 'M', 'L'], colors: ['Black', 'Ecru'], price: 1000,
  originalPrice: 1500, stock: 5, tags: [], newArrival: false,
  createdAt: '2026-09-01', description: 'Sample description', ...overrides
});

function browserAdapter(context) {
  const previous = new Map(['localStorage', 'window', 'document', 'CustomEvent', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const stored = new Map();
  const toast = { textContent: '', classList: { add() {}, remove() {} } };
  const adapter = { stored, denyReads: false, denyWrites: false, events: [] };
  globalThis.localStorage = {
    getItem(key) { if (adapter.denyReads) throw new Error('Storage unavailable'); return stored.get(key) ?? null; },
    setItem(key, value) { if (adapter.denyWrites) throw new Error('Quota exceeded'); stored.set(key, String(value)); },
    removeItem(key) { stored.delete(key); },
    clear() { stored.clear(); }
  };
  globalThis.window = new EventTarget();
  window.addEventListener('cart-updated', () => adapter.events.push('cart-updated'));
  globalThis.document = { querySelector() { return toast; } };
  if (!globalThis.CustomEvent) globalThis.CustomEvent = class extends Event {};
  context.after(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return adapter;
}
// ==================== TEST FIXTURES AND BROWSER ADAPTER END ====================

// ==================== PRODUCT DATA AND VISIBILITY START ====================
test('sample catalogue has unique predictable IDs and at least 15 products in each real subcategory', () => {
  assert.ok(products.length >= 135);
  assert.equal(new Set(products.map(product => product.id)).size, products.length);
  for (const [category, config] of Object.entries(categoryConfig)) {
    for (const subcategory of config.subcategories) {
      const matching = products.filter(product => product.category === category && product.subcategory === subcategory.id);
      assert.ok(matching.length >= 15, `${category}/${subcategory.id} requires at least 15 sample products`);
    }
  }
  for (const product of products) {
    assert.match(product.id, /^(tshirt|shirt|jogger|jeans|hoodie|jacket)\d+$/);
    assert.match(product.image, /^images\/[a-z]+\d+\.jpeg$/);
    assert.ok(product.sizes.length > 0);
    assert.ok(Number.isFinite(product.price) && product.price >= 0);
    assert.ok(Number.isInteger(product.stock) && product.stock >= 0);
    assert.ok(categoryConfig[product.category].subcategories.some(subcategory => subcategory.id === product.subcategory));
    for (const image of product.images || []) assert.match(image, /^images\/[a-z]+\d+\.jpeg$/);
  }
});

test('category heading tags represent every subcategory and never cross category boundaries', () => {
  for (const [category, config] of Object.entries(categoryConfig)) {
    const eligible = products.filter(product => product.tags.includes(config.tag));
    assert.ok(eligible.length >= 6, `${config.tag} needs a useful slider pool`);
    assert.ok(eligible.every(product => product.category === category));
    for (const subcategory of config.subcategories) {
      assert.ok(eligible.filter(product => product.subcategory === subcategory.id).length >= 3, `${config.tag} must represent ${subcategory.id}`);
    }
  }
  assert.ok(products.some(product => product.tags.includes('main-index')));
  assert.ok(products.some(product => product.tags.includes('product-image')));
});

test('homepage arrivals contain 16 distinct eligible products, four from each major category', () => {
  const arrivals = balancedArrivals(products);
  assert.equal(arrivals.length, 16);
  assert.equal(new Set(arrivals.map(product => product.id)).size, 16);
  assert.ok(arrivals.every(isNewArrival));
  for (const category of Object.keys(categoryConfig)) assert.equal(arrivals.filter(product => product.category === category).length, 4);
});

test('arrival selection fills a missing category quota without duplicates or untagged products', () => {
  const reducedCatalogue = products.filter(product => product.category !== 'winter-wear');
  const arrivals = balancedArrivals(reducedCatalogue);
  assert.equal(arrivals.length, 16);
  assert.equal(new Set(arrivals.map(product => product.id)).size, 16);
  assert.ok(arrivals.every(isNewArrival));
  assert.deepEqual(balancedArrivals([]), []);
  assert.deepEqual(balancedArrivals([sampleProduct()]), []);
  assert.equal(balancedArrivals([sampleProduct({ newArrival: true })]).length, 1);
});

test('shuffle preserves the eligible set and does not mutate or duplicate records', () => {
  const eligible = products.filter(product => product.category === 'tshirt' && product.tags.includes('tshirt-heading'));
  const before = eligible.map(product => product.id);
  const shuffled = shuffle(eligible);
  assert.notEqual(shuffled, eligible);
  assert.deepEqual(eligible.map(product => product.id), before);
  assert.deepEqual(shuffled.map(product => product.id).sort(), [...before].sort());
  assert.equal(new Set(shuffled.map(product => product.id)).size, shuffled.length);
});
// ==================== PRODUCT DATA AND VISIBILITY END ====================

// ==================== FILTERING AND SORTING START ====================
test('category, subcategory, size, price, stock and new-arrival filters compose', () => {
  const matching = sampleProduct({ id: 'match', subcategory: 'oversized', tags: ['new-arrival'], price: 1400 });
  const fixtures = [
    matching,
    sampleProduct({ id: 'wrong-category', category: 'shirts', subcategory: 'oversized', newArrival: true }),
    sampleProduct({ id: 'wrong-style', newArrival: true }),
    sampleProduct({ id: 'wrong-size', subcategory: 'oversized', sizes: ['S'], newArrival: true }),
    sampleProduct({ id: 'expensive', subcategory: 'oversized', price: 1600, newArrival: true }),
    sampleProduct({ id: 'cheap', subcategory: 'oversized', price: 600, newArrival: true }),
    sampleProduct({ id: 'sold-out', subcategory: 'oversized', stock: 0, newArrival: true }),
    sampleProduct({ id: 'not-new', subcategory: 'oversized' })
  ];
  const filters = { category: 'tshirt', subcategory: 'oversized', size: 'L', minPrice: '800', maxPrice: '1500', inStock: true, newOnly: true };
  assert.deepEqual(filterProducts(fixtures, filters).map(product => product.id), ['match']);
  assert.equal(filterProducts(fixtures, {}).length, fixtures.length);
  assert.deepEqual(filterProducts(fixtures, { minPrice: '2000', maxPrice: '1000' }), []);
  assert.deepEqual(filterProducts([], filters), []);
});

test('price boundaries are inclusive, blank prices do not filter, and stock-only excludes zero stock', () => {
  const fixtures = [sampleProduct({ id: 'low', price: 1000 }), sampleProduct({ id: 'high', price: 1500, stock: 0 })];
  assert.equal(filterProducts(fixtures, { minPrice: 1000, maxPrice: 1500 }).length, 2);
  assert.equal(filterProducts(fixtures, { minPrice: '', maxPrice: '' }).length, 2);
  assert.deepEqual(filterProducts(fixtures, { inStock: true }).map(product => product.id), ['low']);
});

test('all sort modes work without mutating the input or changing featured order', () => {
  const fixtures = [
    sampleProduct({ id: 'middle', name: 'Bravo', price: 1200, createdAt: '2026-09-02' }),
    sampleProduct({ id: 'highest', name: 'Charlie', price: 1800, createdAt: '2026-09-03' }),
    sampleProduct({ id: 'lowest', name: 'Alpha', price: 900, createdAt: '2026-09-01' })
  ];
  const original = structuredClone(fixtures);
  assert.deepEqual(sortProducts(fixtures, 'price-low').map(product => product.id), ['lowest', 'middle', 'highest']);
  assert.deepEqual(sortProducts(fixtures, 'price-high').map(product => product.id), ['highest', 'middle', 'lowest']);
  assert.deepEqual(sortProducts(fixtures, 'newest').map(product => product.id), ['highest', 'middle', 'lowest']);
  assert.deepEqual(sortProducts(fixtures, 'name').map(product => product.id), ['lowest', 'middle', 'highest']);
  assert.deepEqual(sortProducts(fixtures, 'featured'), original);
  assert.notEqual(sortProducts(fixtures, 'featured'), fixtures);
  assert.deepEqual(fixtures, original);
});
// ==================== FILTERING AND SORTING END ====================

// ==================== LOADING, ESCAPING AND FALLBACKS START ====================
test('product loading rejects HTTP/JSON failures, retries, caches successful requests and skips invalid records', async context => {
  browserAdapter(context);
  const common = await freshCommon();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: false }; };
  await assert.rejects(common.getProducts(), /could not load/);
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ products: [] }) }; };
  await assert.rejects(common.getProducts(), /format is invalid/);
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => [sampleProduct(), sampleProduct(), sampleProduct({ id: 'bad-price', price: -1 }), sampleProduct({ id: 'bad-category', category: 'unknown' }), sampleProduct({ id: 'normalized', stock: -2, sizes: ['M', 3], tags: null, colors: null })] }; };
  const result = await common.getProducts();
  assert.deepEqual(result.map(product => product.id), ['sample1', 'normalized']);
  assert.equal(result[1].stock, 0);
  assert.deepEqual(result[1].sizes, ['M']);
  assert.deepEqual(result[1].tags, []);
  assert.deepEqual(result[1].colors, []);
  assert.equal(await common.getProducts(), result);
  assert.equal(calls, 3);
});

test('product cards escape editable text and reject script/external/traversal image paths', () => {
  const hostileName = '<img src=x onerror="alert(1)">';
  const card = productCard(sampleProduct({ name: hostileName, image: 'javascript:alert(1)' }));
  assert.ok(!card.includes(hostileName));
  assert.ok(card.includes('&lt;img'));
  assert.ok(!card.includes('src="javascript:'));
  assert.equal(escapeHTML('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(imageURL('images/tshirt1.jpeg'), 'images/tshirt1.jpeg');
  for (const path of ['javascript:alert(1)', 'https://example.com/photo.jpeg', '../images/tshirt1.jpeg', 'images/../../private.jpeg']) assert.equal(imageURL(path), '');
});

test('missing image receives a stable local placeholder without a repeated error loop', async () => {
  const { setupImages } = await freshCommon();
  const image = { src: 'images/missing.jpeg', complete: true, naturalWidth: 0, dataset: {}, classList: { add() {} }, getAttribute() { return this.src; } };
  setupImages({ querySelectorAll() { return [image]; } });
  assert.match(image.src, /^data:image\/svg\+xml,/);
  assert.equal(image.onerror, null);
  assert.equal(image.dataset.fallback, 'true');
  const placeholder = image.src;
  setupImages({ querySelectorAll() { return [image]; } });
  assert.equal(image.src, placeholder);
});
// ==================== LOADING, ESCAPING AND FALLBACKS END ====================

// ==================== CART STORAGE AND VALIDATION START ====================
test('empty, corrupt and incorrectly shaped storage produce a usable empty bag', async context => {
  const adapter = browserAdapter(context);
  const common = await freshCommon();
  assert.deepEqual(common.getCart(), []);
  for (const raw of ['{ broken json', 'null', '42', '{"items":[]}']) {
    adapter.stored.set(common.CART_KEY, raw);
    assert.deepEqual(common.getCart(), []);
  }
});

test('cart storage sanitizes invalid quantities and merges duplicate selections without exceeding 99', async context => {
  const adapter = browserAdapter(context);
  const common = await freshCommon();
  adapter.stored.set(common.CART_KEY, JSON.stringify([
    { id: 'sample1', size: 'M', color: 'Black', quantity: 70 },
    { id: 'sample1', size: 'M', color: 'Black', quantity: 50 },
    { id: 'sample1', size: 'S', quantity: 2 },
    { id: 'negative', size: 'M', quantity: -2 },
    { id: 'fraction', size: 'M', quantity: 1.5 },
    { id: 'string', size: 'M', quantity: '2' },
    { id: 'missing-size', quantity: 1 }, null
  ]));
  assert.deepEqual(common.getCart(), [{ id: 'sample1', size: 'M', color: 'Black', quantity: 99 }, { id: 'sample1', size: 'S', color: '', quantity: 2 }]);
});

test('adding to bag validates options and stock across different variants, persists and emits badge updates', async context => {
  const adapter = browserAdapter(context);
  const common = await freshCommon();
  const product = sampleProduct();
  assert.throws(() => common.addToCart(product, '', 'Black', 1), /size/);
  assert.throws(() => common.addToCart(product, 'M', 'Blue', 1), /colour/);
  for (const quantity of [0, -1, 1.5, 100]) assert.throws(() => common.addToCart(product, 'M', 'Black', quantity), /quantity/);
  assert.equal(common.addToCart(product, 'M', 'Black', 3), true);
  assert.equal(common.addToCart(product, 'S', 'Ecru', 2), true);
  assert.equal(common.getCartQuantity(product.id), 5);
  assert.throws(() => common.addToCart(product, 'L', 'Black', 1), /stock/);
  assert.equal(adapter.events.length, 2);
  assert.equal(JSON.parse(adapter.stored.get(common.CART_KEY)).length, 2);
  assert.ok(common.getCart().every(item => !Object.hasOwn(item, 'price')));
  const reloadedCommon = await freshCommon();
  assert.deepEqual(reloadedCommon.getCart(), common.getCart());
});

test('an existing variant cannot exceed 99 even when product stock is larger', async context => {
  browserAdapter(context);
  const common = await freshCommon();
  const product = sampleProduct({ stock: 500 });
  common.addToCart(product, 'M', 'Black', 99);
  assert.throws(() => common.addToCart(product, 'M', 'Black', 1), /maximum quantity/);
  assert.equal(common.getCartQuantity(product.id), 99);
});

test('failed writes use the current in-memory bag instead of a stale previously saved bag', async context => {
  const adapter = browserAdapter(context);
  const common = await freshCommon();
  context.after(() => clearTimeout(common.showToast.timeout));
  const original = [{ id: 'sample1', size: 'M', color: 'Black', quantity: 1 }];
  const changed = [{ id: 'sample1', size: 'M', color: 'Black', quantity: 2 }];
  common.saveCart(original);
  adapter.denyWrites = true;
  assert.equal(common.saveCart(changed), false);
  assert.deepEqual(JSON.parse(adapter.stored.get(common.CART_KEY)), original);
  assert.deepEqual(common.getCart(), changed);
  assert.equal(common.getCartQuantity('sample1'), 2);
  adapter.denyWrites = false;
  assert.equal(common.saveCart(changed), true);
  assert.deepEqual(JSON.parse(adapter.stored.get(common.CART_KEY)), changed);
});

test('completely unavailable browser storage still supports a safe page-local bag', async context => {
  const adapter = browserAdapter(context);
  const common = await freshCommon();
  context.after(() => clearTimeout(common.showToast.timeout));
  adapter.denyReads = true; adapter.denyWrites = true;
  assert.deepEqual(common.getCart(), []);
  assert.equal(common.addToCart(sampleProduct(), 'L', 'Black', 1), false);
  assert.equal(common.getCartQuantity('sample1'), 1);
});
// ==================== CART STORAGE AND VALIDATION END ====================

// ==================== CART CATALOGUE RECONCILIATION START ====================
// The cart module keeps its implementation private. This adapter executes that
// same source with inert DOM controls and exposes only its data helpers to tests.
async function cartDataAdapter() {
  const source = (await readFile(new URL('../js/cart.js', import.meta.url), 'utf8')).trimStart()
    .replace(/^import[^\n]*\n/, '').replace(/^initializeCart\(\);$/m, '');
  const element = { addEventListener() {}, querySelector() { return this; }, querySelectorAll() { return []; }, innerHTML: '', hidden: false, textContent: '' };
  let stored = [];
  let writes = 0;
  const factory = new Function('document', 'window', 'getProducts', 'formatPrice', 'escapeHTML', 'setupImages', 'renderError', 'getCart', 'saveCart', 'showToast', 'categoryConfig', source + '\nreturn { reconcileCart, totalQuantity, subtotal, maximumForItem, setProducts: rows => { productsById = new Map(rows.map(product => [product.id, product])); }, getItems: () => cartItems };');
  const api = factory({ querySelector() { return element; } }, { addEventListener() {} }, async () => [], String, escapeHTML, () => {}, () => {}, () => structuredClone(stored), rows => { stored = structuredClone(rows); writes++; return true; }, () => {}, categoryConfig);
  return { ...api, setCart: items => { stored = structuredClone(items); }, getWrites: () => writes };
}

test('cart reconciliation removes deleted/invalid variants, clamps shared stock, and calculates current JSON prices', async () => {
  const cart = await cartDataAdapter();
  cart.setProducts([sampleProduct()]);
  cart.setCart([
    { id: 'sample1', size: 'M', color: 'Black', quantity: 4 },
    { id: 'sample1', size: 'S', color: 'Ecru', quantity: 4 },
    { id: 'deleted', size: 'M', color: 'Black', quantity: 1 },
    { id: 'sample1', size: 'XXXL', color: 'Black', quantity: 1 },
    { id: 'sample1', size: 'M', color: 'Blue', quantity: 1 }
  ]);
  cart.reconcileCart();
  assert.equal(cart.totalQuantity(), 5);
  assert.deepEqual(cart.getItems().map(item => item.quantity), [4, 1]);
  assert.equal(cart.maximumForItem(cart.getItems()[0]), 4);
  assert.equal(cart.maximumForItem(cart.getItems()[1]), 1);
  assert.equal(cart.subtotal(), 5000);
  assert.equal(cart.getWrites(), 1);
  cart.setProducts([sampleProduct({ price: 1200 })]);
  assert.equal(cart.subtotal(), 6000);
  cart.reconcileCart();
  assert.equal(cart.getWrites(), 1, 'unchanged valid bags should not be written again');
});

test('cart reconciliation handles duplicate variants, sold-out products and an empty catalogue', async () => {
  const cart = await cartDataAdapter();
  cart.setProducts([sampleProduct()]);
  cart.setCart([{ id: 'sample1', size: 'M', color: 'Black', quantity: 2 }, { id: 'sample1', size: 'M', color: 'Black', quantity: 2 }]);
  cart.reconcileCart();
  assert.equal(cart.getItems().length, 1);
  assert.equal(cart.totalQuantity(), 4);
  cart.setProducts([sampleProduct({ stock: 0 })]);
  cart.reconcileCart();
  assert.deepEqual(cart.getItems(), []);
  assert.equal(cart.subtotal(), 0);
  cart.setCart([{ id: 'sample1', size: 'M', color: 'Black', quantity: 2 }]);
  cart.setProducts([]);
  cart.reconcileCart();
  assert.deepEqual(cart.getItems(), []);
});
// ==================== CART CATALOGUE RECONCILIATION END ====================

// ==================== PAGE AND LOCAL LINK INTEGRITY START ====================
test('removing a saved key in another tab does not resurrect an old cached bag', async context => {
  const adapter = browserAdapter(context);
  const common = await freshCommon();
  common.writeStorage(common.CART_KEY, [{ id: 'sample1', size: 'M', color: 'Black', quantity: 2 }]);
  adapter.stored.delete(common.CART_KEY);
  assert.deepEqual(common.getCart(), []);
  adapter.stored.set(common.CART_KEY, '{broken');
  assert.deepEqual(common.getCart(), []);
});

test('all page asset references and local file links resolve within the project', async () => {
  const root = new URL('../', import.meta.url);
  const files = (await readdir(root)).filter(filename => filename.endsWith('.html'));
  assert.ok(files.includes('privacy-policy.html'));
  for (const filename of files) {
    const html = await readFile(new URL(filename, root), 'utf8');
    if (filename !== 'header.html') {
      assert.match(html, /<title>.+<\/title>/i, `${filename}: page title`);
      assert.match(html, /name=["']description["']/i, `${filename}: description`);
      assert.match(html, /name=["']viewport["']/i, `${filename}: viewport`);
      assert.match(html, /id=["']main-content["']/i, `${filename}: main landmark`);
    }
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const destination = match[1];
      if (/^(?:#|https?:|mailto:|tel:|data:)/i.test(destination)) continue;
      const relative = destination.split(/[?#]/)[0];
      if (!relative) continue;
      await assert.doesNotReject(access(new URL(relative, root)), `${filename}: ${relative} should exist`);
    }
  }
});
// ==================== PAGE AND LOCAL LINK INTEGRITY END ====================
