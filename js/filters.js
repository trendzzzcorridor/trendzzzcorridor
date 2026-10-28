import { categoryConfig, escapeHTML, isNewArrival } from './common.js';

// ==================== PURE FILTERING AND SORTING START ====================
export function filterProducts(products, filters = {}) {
  return products.filter(product =>
    (!filters.category || product.category === filters.category) &&
    (!filters.subcategory || product.subcategory === filters.subcategory) &&
    (!filters.size || product.sizes.includes(filters.size)) &&
    (filters.minPrice === '' || filters.minPrice == null || product.price >= Number(filters.minPrice)) &&
    (filters.maxPrice === '' || filters.maxPrice == null || product.price <= Number(filters.maxPrice)) &&
    (!filters.inStock || product.stock > 0) &&
    (!filters.newOnly || isNewArrival(product))
  );
}
export function sortProducts(products, sort = 'featured') {
  const result = [...products];
  const comparators = {
    'price-low': (a, b) => a.price - b.price,
    'price-high': (a, b) => b.price - a.price,
    newest: (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
    name: (a, b) => a.name.localeCompare(b.name)
  };
  if (comparators[sort]) result.sort(comparators[sort]);
  return result;
}
// ==================== PURE FILTERING AND SORTING END ====================

// ==================== RESPONSIVE FILTER CONTROLS START ====================
export function createFilters(container, products, { category = '', expanded, onChange }) {
  const params = new URLSearchParams(location.search);
  const initialMaximum = Number(params.get('max'));
  const initialNew = params.get('new') === '1';
  const sizes = [...new Set(products.flatMap(product => product.sizes))];
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'];
  sizes.sort((a, b) => (sizeOrder.indexOf(a) === -1 ? 999 : sizeOrder.indexOf(a)) - (sizeOrder.indexOf(b) === -1 ? 999 : sizeOrder.indexOf(b)));
  container.innerHTML = `<form class="catalogue-filter-form" aria-label="Filter and sort products"><div class="filter-toolbar"><div class="filter-result-count" aria-live="polite"></div><div class="sort-field"><label for="sort-by">Sort by</label><select id="sort-by" name="sort"><option value="featured">Featured</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="newest">Newest</option><option value="name">Name A–Z</option></select></div></div><details class="filter-details"><summary><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor"><path d="M2 5h16M2 10h16M2 15h16"/><path stroke-width="3" d="M6 3v4m7 1v4m-6 1v4"/></svg> Filter the collection <span class="filter-active-count"></span><span class="filter-expand" aria-hidden="true">+</span></summary><div class="filter-fields">${category ? '' : `<div class="field"><label for="filter-category">Category</label><select id="filter-category" name="category"><option value="">All categories</option>${Object.entries(categoryConfig).map(([key, config]) => `<option value="${key}">${config.label}</option>`).join('')}</select></div>`}<div class="field"><label for="filter-subcategory">Style</label><select id="filter-subcategory" name="subcategory"></select></div><div class="field"><label for="filter-size">Size</label><select id="filter-size" name="size"><option value="">All sizes</option>${sizes.map(size => `<option value="${escapeHTML(size)}">${escapeHTML(size)}</option>`).join('')}</select></div><div class="field"><label for="filter-min">Min price (₹)</label><input id="filter-min" name="minPrice" type="number" min="0" step="1" placeholder="0" inputmode="numeric"></div><div class="field"><label for="filter-max">Max price (₹)</label><input id="filter-max" name="maxPrice" type="number" min="0" step="1" placeholder="Any price" inputmode="numeric" value="${params.has('max') && Number.isFinite(initialMaximum) && initialMaximum >= 0 ? initialMaximum : ''}"></div><div class="filter-checkboxes"><label><input type="checkbox" name="inStock"> In stock only</label><label><input type="checkbox" name="newOnly" ${initialNew ? 'checked' : ''}> New arrivals</label></div><button type="reset" class="clear-filters">Clear filters <span aria-hidden="true">×</span></button></div></details><p class="filter-validation" role="status" hidden></p></form>`;
  const form = container.querySelector('form');
  const categorySelect = form.elements.namedItem('category');
  const subcategorySelect = form.elements.namedItem('subcategory');
  const filterDetails = form.querySelector('details');
  // Open initially on desktop; mobile uses a compact disclosure.
  filterDetails.open = expanded ?? window.matchMedia('(min-width: 901px)').matches;
  function refreshSubcategories() {
    const selected = subcategorySelect.value;
    const activeCategory = category || categorySelect?.value || '';
    const choices = new Map();
    Object.entries(categoryConfig).filter(([key]) => !activeCategory || key === activeCategory).forEach(([, config]) => config.subcategories.forEach(subcategory => choices.set(subcategory.id, subcategory.label)));
    subcategorySelect.innerHTML = '<option value="">All styles</option>' + [...choices].map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
    subcategorySelect.value = choices.has(selected) ? selected : '';
  }
  function update() {
    const values = new FormData(form);
    const filters = { category: category || values.get('category') || '', subcategory: values.get('subcategory') || '', size: values.get('size') || '', minPrice: values.get('minPrice'), maxPrice: values.get('maxPrice'), inStock: values.has('inStock'), newOnly: values.has('newOnly') };
    const invalidRange = (filters.minPrice !== '' && Number(filters.minPrice) < 0) || (filters.maxPrice !== '' && Number(filters.maxPrice) < 0) || (filters.minPrice !== '' && filters.maxPrice !== '' && Number(filters.minPrice) > Number(filters.maxPrice));
    const warning = form.querySelector('.filter-validation');
    warning.hidden = !invalidRange; warning.textContent = invalidRange ? 'Use positive prices and a maximum price that is at least the minimum.' : '';
    const filtered = invalidRange ? [] : sortProducts(filterProducts(products, filters), values.get('sort'));
    form.querySelector('.filter-result-count').textContent = `${filtered.length} style${filtered.length === 1 ? '' : 's'}${filters.newOnly ? ' · New arrivals' : ''}`;
    const activeCount = Object.entries(filters).filter(([key, value]) => !(key === 'category' && category) && value !== '' && value != null && value !== false).length;
    form.querySelector('.filter-active-count').textContent = activeCount ? `(${activeCount})` : '';
    onChange(filtered, { ...filters, sort: values.get('sort') });
  }
  refreshSubcategories();
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => { if (event.target === categorySelect) refreshSubcategories(); update(); });
  form.addEventListener('reset', () => {
    // Explicitly clear URL-provided defaults as well as user selections.
    setTimeout(() => { form.querySelectorAll('input').forEach(input => { if (input.type === 'checkbox') input.checked = false; else input.value = ''; }); if (categorySelect) categorySelect.value = ''; subcategorySelect.value = ''; form.elements.namedItem('size').value = ''; form.elements.namedItem('sort').value = 'featured'; refreshSubcategories(); update(); }, 0);
  });
  update();
  return { reset: () => form.reset() };
}
// ==================== RESPONSIVE FILTER CONTROLS END ====================
