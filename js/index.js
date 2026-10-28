import { getProducts, categoryConfig, isNewArrival, shuffle, productCard, escapeHTML, imageURL, setupImages, renderError } from './common.js';
import { createSlider } from './slider.js';
import { createFilters } from './filters.js';

// ==================== BALANCED NEW ARRIVALS START ====================
export function balancedArrivals(products, count = 16) {
  const eligible = products.filter(isNewArrival);
  const selected = [];
  const categoryKeys = Object.keys(categoryConfig);
  const quota = Math.floor(count / categoryKeys.length);
  categoryKeys.forEach(category => selected.push(...shuffle(eligible.filter(product => product.category === category)).slice(0, quota)));
  if (selected.length < count) {
    const selectedIds = new Set(selected.map(product => product.id));
    selected.push(...shuffle(eligible.filter(product => !selectedIds.has(product.id))).slice(0, count - selected.length));
  }
  // Interleave categories so the first row reflects the breadth of the collection.
  const groups = categoryKeys.map(category => selected.filter(product => product.category === category));
  const result = [];
  while (groups.some(group => group.length)) groups.forEach(group => { if (group.length) result.push(group.shift()); });
  return result.slice(0, count);
}
// ==================== BALANCED NEW ARRIVALS END ====================

// ==================== DATA-DRIVEN CATALOGUE TILES START ====================
function renderCatalogue(products) {
  const tiles = [];
  Object.entries(categoryConfig).forEach(([category, config]) => {
    tiles.push({ label: config.label, href: config.page, products: products.filter(product => product.category === category) });
  });
  Object.entries(categoryConfig).forEach(([category, config]) => {
    config.subcategories.forEach(subcategory => tiles.push({ label: `${subcategory.label}${category === 'tshirt' ? ' T-Shirts' : category === 'shirts' ? ' Shirts' : ''}`, href: `${config.page}#${subcategory.id}`, products: products.filter(product => product.category === category && product.subcategory === subcategory.id) }));
  });
  tiles.push({ label: 'New arrivals', href: 'product.html?new=1', products: products.filter(isNewArrival) }, { label: 'Under ₹1,500', href: 'product.html?max=1500', products: products.filter(product => product.price <= 1500) }, { label: 'The complete collection', href: 'product.html', products });
  const usedImages = new Set();
  document.querySelector('#catalogue-grid').innerHTML = tiles.map(tile => {
    const product = tile.products.find(item => !usedImages.has(item.image)) || tile.products[0];
    if (product) usedImages.add(product.image);
    return `<a class="catalogue-tile" href="${tile.href}"><div class="catalogue-tile-image"><img src="${escapeHTML(imageURL(product?.image))}" alt="${escapeHTML(tile.label)} collection" loading="lazy" decoding="async" width="600" height="480"></div><h3 class="catalogue-tile-title">${escapeHTML(tile.label)}<span aria-hidden="true">↗</span></h3></a>`;
  }).join('');
}
async function initializeHome() {
  try {
    const products = await getProducts();
    createSlider(document.querySelector('#home-slider'), products.filter(product => product.tags.includes('main-index')), { home: true });
    const arrivals = balancedArrivals(products);
    createFilters(document.querySelector('#arrival-filters'), arrivals, { expanded: false, onChange: filtered => {
      document.querySelector('#new-arrivals').innerHTML = filtered.length ? filtered.map(productCard).join('') : '<div class="empty-state"><h3>No arrivals match these filters.</h3><p>Try a different size or price, or clear the filters.</p><button class="button button-secondary" id="reset-arrivals" type="button">Clear filters</button></div>';
      document.querySelector('#reset-arrivals')?.addEventListener('click', () => document.querySelector('#arrival-filters form').reset());
      setupImages(document.querySelector('#new-arrivals'));
    } });
    renderCatalogue(products); setupImages();
  } catch (error) {
    ['home-slider', 'new-arrivals', 'catalogue-grid'].forEach(id => renderError(document.getElementById(id), error.message));
  }
}
if (typeof document !== 'undefined') initializeHome();
// ==================== DATA-DRIVEN CATALOGUE TILES END ====================
