import { getProducts, formatPrice, escapeHTML, readStorage, writeStorage, categoryConfig } from './common.js';

/* ==================== LOCAL DRAFT DATA START ==================== */
const DRAFT_KEY = 'forme-admin-drafts-v1';
// These labels describe the category schema; product information comes only from JSON.
const categories = Object.fromEntries(Object.entries(categoryConfig).map(([key, category]) => [key, { label: category.label, subcategories: category.subcategories.map(subcategory => subcategory.id) }]));
const storedDrafts = readStorage(DRAFT_KEY, {});
let drafts = storedDrafts && typeof storedDrafts === 'object' && !Array.isArray(storedDrafts) ? storedDrafts : {};
// Ignore malformed persisted data so a corrupt browser store cannot break the interface.
drafts = Object.fromEntries(Object.entries(drafts).filter(([id, product]) => product && product.id === id && /^[a-z][a-z0-9-]*$/.test(id) && typeof product.name === 'string' && Number.isFinite(product.price) && product.price >= 0 && Number.isInteger(product.stock) && product.stock >= 0 && categories[product.category]?.subcategories.includes(product.subcategory) && ['sizes', 'colors', 'images', 'tags'].every(key => Array.isArray(product[key]) && product[key].every(value => typeof value === 'string')) && typeof product.createdAt === 'string'));
let sourceProducts = [];
let catalogueLoaded = false;
let exportURL;
let editingId = null;
const form = document.querySelector('#admin-product-form');
const feedback = document.querySelector('#admin-feedback');

function mergedProducts() {
  const productsById = new Map(sourceProducts.map(product => [product.id, product]));
  Object.values(drafts).forEach(product => productsById.set(product.id, product));
  return [...productsById.values()];
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.dataset.error = String(isError);
}

function persistDraft(product) {
  drafts[product.id] = product;
  const saved = writeStorage(DRAFT_KEY, drafts);
  renderOverview();
  return saved;
}

function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function csv(value) { return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]; }
/* ==================== LOCAL DRAFT DATA END ==================== */

/* ==================== ADMIN NAVIGATION START ==================== */
function showSection(section, resetEditor = true) {
  document.querySelectorAll('[data-admin-panel]').forEach(panel => { panel.hidden = panel.dataset.adminPanel !== section; });
  document.querySelectorAll('[data-admin-section]').forEach(button => {
    if (button.dataset.adminSection === section) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (section === 'editor' && resetEditor) resetProductForm();
  if (section === 'products') renderProducts();
  if (section === 'inventory') renderInventory();
}

document.querySelectorAll('[data-admin-section], [data-open-section]').forEach(button => {
  button.addEventListener('click', () => showSection(button.dataset.adminSection || button.dataset.openSection));
});
document.querySelector('#cancel-product-edit').addEventListener('click', () => showSection('products'));
/* ==================== ADMIN NAVIGATION END ==================== */

/* ==================== OVERVIEW AND PRODUCT TABLE START ==================== */
function renderOverview() {
  const products = mergedProducts();
  const metrics = [
    ['Products', products.length],
    ['Units in stock', products.reduce((total, product) => total + product.stock, 0)],
    ['Out of stock', products.filter(product => product.stock === 0).length],
    ['Local drafts', Object.keys(drafts).length]
  ];
  document.querySelector('#admin-metrics').innerHTML = metrics.map(([label, value]) => `<article class="admin-metric"><p>${label}</p><strong>${value.toLocaleString('en-IN')}</strong></article>`).join('');
  const draftCount = Object.keys(drafts).length;
  document.querySelector('#admin-draft-summary').textContent = draftCount ? `${draftCount} local ${draftCount === 1 ? 'draft' : 'drafts'} ready to review or export.` : 'No local drafts yet.';
  document.querySelector('#discard-all-drafts').disabled = !draftCount;
}

function productLabel(product) {
  return `<strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.id)}</small>${drafts[product.id] ? '<span class="admin-draft-badge">Local draft</span>' : ''}`;
}

function renderProducts() {
  const query = document.querySelector('#admin-product-search').value.trim().toLowerCase();
  const category = document.querySelector('#admin-product-category').value;
  const products = mergedProducts().filter(product => (!category || product.category === category) && `${product.id} ${product.name} ${(product.tags || []).join(' ')}`.toLowerCase().includes(query));
  document.querySelector('#admin-product-count').textContent = `${products.length} ${products.length === 1 ? 'product' : 'products'} · storefront data with local drafts applied for this preview`;
  const list = document.querySelector('#admin-product-list');
  if (!products.length) { list.innerHTML = '<p class="admin-table-empty">No products match these filters.</p>'; return; }
  list.innerHTML = `<table class="admin-table"><caption class="sr-only">Product catalogue and local drafts</caption><thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col">Price</th><th scope="col">Stock</th><th scope="col">Actions</th></tr></thead><tbody>${products.map(product => `<tr><td>${productLabel(product)}</td><td>${escapeHTML(categories[product.category]?.label || product.category)}<small>${escapeHTML(product.subcategory)}</small></td><td>${formatPrice(product.price)}</td><td>${product.stock}</td><td><div class="admin-table-actions"><button class="admin-text-button" type="button" data-edit-product="${escapeHTML(product.id)}" aria-label="Edit ${escapeHTML(product.name)}">Edit</button>${drafts[product.id] ? `<button class="admin-text-button" type="button" data-discard-product="${escapeHTML(product.id)}" aria-label="Discard draft for ${escapeHTML(product.name)}">Discard draft</button>` : ''}</div></td></tr>`).join('')}</tbody></table>`;
}

document.querySelector('#admin-product-search').addEventListener('input', renderProducts);
document.querySelector('#admin-product-category').addEventListener('change', renderProducts);
document.querySelector('#admin-product-list').addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-product]');
  if (editButton) { editProduct(editButton.dataset.editProduct); return; }
  const discardButton = event.target.closest('[data-discard-product]');
  if (discardButton) {
    delete drafts[discardButton.dataset.discardProduct];
    writeStorage(DRAFT_KEY, drafts);
    renderOverview();
    renderProducts();
    setFeedback('The local draft was discarded. The source catalogue is unchanged.');
  }
});
/* ==================== OVERVIEW AND PRODUCT TABLE END ==================== */

/* ==================== PRODUCT EDITOR START ==================== */
function updateSubcategories(selected = '') {
  const category = categories[form.elements.category.value];
  form.elements.subcategory.innerHTML = category.subcategories.map(value => `<option value="${value}">${capitalize(value)}</option>`).join('');
  if (category.subcategories.includes(selected)) form.elements.subcategory.value = selected;
}

function resetProductForm() {
  editingId = null;
  form.reset();
  form.elements.id.readOnly = false;
  form.elements.createdAt.value = new Date().toISOString().slice(0, 10);
  updateSubcategories();
  document.querySelector('#editor-heading').textContent = 'Add product';
  document.querySelector('#admin-form-error').textContent = '';
}

function editProduct(id) {
  const product = mergedProducts().find(item => item.id === id);
  if (!product) { setFeedback('That product could not be found.', true); return; }
  resetProductForm();
  editingId = id;
  ['id', 'name', 'category', 'price', 'originalPrice', 'stock', 'image', 'description', 'material', 'care'].forEach(field => {
    form.elements[field].value = product[field] ?? '';
  });
  updateSubcategories(product.subcategory);
  ['sizes', 'colors', 'images', 'tags'].forEach(field => { form.elements[field].value = (product[field] || []).join(', '); });
  form.elements.createdAt.value = (product.createdAt || new Date().toISOString()).slice(0, 10);
  form.elements.newArrival.checked = Boolean(product.newArrival);
  form.elements.id.readOnly = true;
  document.querySelector('#editor-heading').textContent = `Edit ${product.name}`;
  showSection('editor', false);
  form.elements.name.focus();
}

form.elements.category.addEventListener('change', () => updateSubcategories());

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = new FormData(form);
  const error = document.querySelector('#admin-form-error');
  error.textContent = '';
  const id = values.get('id').trim();
  const name = values.get('name').trim();
  const description = values.get('description').trim();
  const price = Number(values.get('price'));
  const originalPrice = values.get('originalPrice') ? Number(values.get('originalPrice')) : null;
  const stock = Number(values.get('stock'));
  const sizes = csv(values.get('sizes'));
  const image = values.get('image').trim();
  const images = [...new Set([image, ...csv(values.get('images'))])];
  const category = values.get('category');
  const subcategory = values.get('subcategory');
  if (!name || !description || !sizes.length) { error.textContent = 'Name, description and at least one size cannot be blank.'; return; }
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) { error.textContent = 'Enter a positive price and a whole-number stock quantity of zero or more.'; return; }
  if (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) { error.textContent = 'Original price must be at least the current price, or left blank.'; return; }
  if (!categories[category]?.subcategories.includes(subcategory)) { error.textContent = 'Choose a valid category and subcategory.'; return; }
  if (images.some(path => !/^images\/[a-z]+[0-9]+\.jpeg$/.test(path))) { error.textContent = 'Each image path must look like images/tshirt31.jpeg: lowercase letters, a number, no spaces, and .jpeg.'; return; }
  if (!editingId && mergedProducts().some(product => product.id === id)) { error.textContent = 'That product ID already exists. Choose another ID or edit the existing product.'; return; }
  const previous = editingId ? mergedProducts().find(product => product.id === editingId) : {};
  // Keep any optional custom fields from the source entry when editing it.
  const product = {
    ...previous, id, name, category, subcategory, image, images, price,
    originalPrice, sizes, colors: csv(values.get('colors')), stock, description,
    tags: csv(values.get('tags')), newArrival: values.get('newArrival') === 'on',
    createdAt: values.get('createdAt'), material: values.get('material').trim(), care: values.get('care').trim()
  };
  const saved = persistDraft(product);
  setFeedback(saved ? `Local draft saved for ${name}. Export the catalogue to download your changes. The storefront has not changed.` : `Browser storage is unavailable. ${name} is a draft for this page only: export now to keep your changes.`, !saved);
  showSection('products');
});
/* ==================== PRODUCT EDITOR END ==================== */

/* ==================== INVENTORY START ==================== */
function renderInventory() {
  const query = document.querySelector('#admin-inventory-search').value.trim().toLowerCase();
  const stockFilter = document.querySelector('#admin-stock-filter').value;
  const products = mergedProducts().filter(product => `${product.id} ${product.name}`.toLowerCase().includes(query) && (stockFilter === 'low' ? product.stock > 0 && product.stock <= 5 : stockFilter === 'out' ? product.stock === 0 : stockFilter === 'available' ? product.stock > 0 : true));
  const list = document.querySelector('#admin-inventory-list');
  if (!products.length) { list.innerHTML = '<p class="admin-table-empty">No inventory matches these filters.</p>'; return; }
  list.innerHTML = `<table class="admin-table"><caption class="sr-only">Inventory with editable local stock drafts</caption><thead><tr><th scope="col">Product</th><th scope="col">Status</th><th scope="col">Available units</th></tr></thead><tbody>${products.map(product => `<tr><td>${productLabel(product)}</td><td class="${product.stock === 0 ? 'admin-no-stock' : product.stock <= 5 ? 'admin-low-stock' : ''}">${product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</td><td><form class="admin-stock-form" data-stock-product="${escapeHTML(product.id)}"><label class="sr-only" for="stock-${escapeHTML(product.id)}">Stock for ${escapeHTML(product.name)}</label><input id="stock-${escapeHTML(product.id)}" type="number" name="stock" min="0" step="1" value="${product.stock}" required><button type="submit" class="admin-text-button">Save draft</button></form></td></tr>`).join('')}</tbody></table>`;
}

document.querySelector('#admin-inventory-search').addEventListener('input', renderInventory);
document.querySelector('#admin-stock-filter').addEventListener('change', renderInventory);
document.querySelector('#admin-inventory-list').addEventListener('submit', event => {
  const stockForm = event.target.closest('[data-stock-product]');
  if (!stockForm) return;
  event.preventDefault();
  const stock = Number(stockForm.elements.stock.value);
  if (!stockForm.reportValidity() || !Number.isInteger(stock) || stock < 0) { setFeedback('Stock must be a whole number of zero or more.', true); return; }
  const product = mergedProducts().find(item => item.id === stockForm.dataset.stockProduct);
  if (!product) return;
  const saved = persistDraft({ ...product, stock });
  renderInventory();
  setFeedback(saved ? `Local stock draft saved for ${product.name}: ${stock} units.` : 'Stock changed for this page only. Browser storage is unavailable; export to keep this draft.', !saved);
});
/* ==================== INVENTORY END ==================== */

/* ==================== EXPORT AND INITIALIZATION START ==================== */
function exportCatalogue() {
  if (!catalogueLoaded) { setFeedback('The source catalogue must load before a complete export can be created. Reload this page through the local server.', true); return; }
  const json = `${JSON.stringify(mergedProducts(), null, 2)}\n`;
  const blob = new Blob([json], { type: 'application/json' });
  if (exportURL) URL.revokeObjectURL(exportURL);
  exportURL = URL.createObjectURL(blob);
  const preview = document.querySelector('#admin-export-preview');
  const link = document.querySelector('#admin-download-link');
  link.href = exportURL;
  document.querySelector('#admin-export-json').value = json;
  preview.hidden = false;
  preview.open = true;
  link.click();
  setFeedback('Catalogue export prepared below. Download products.json or copy the JSON, then review it before replacing data/products.json.');
}

document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', exportCatalogue));
document.querySelector('#discard-all-drafts').addEventListener('click', () => {
  drafts = {};
  writeStorage(DRAFT_KEY, drafts);
  renderOverview();
  renderProducts();
  renderInventory();
  setFeedback('All local product drafts were discarded. The source catalogue is unchanged.');
});

const categoryOptions = Object.entries(categories).map(([value, category]) => `<option value="${value}">${category.label}</option>`).join('');
document.querySelector('#admin-product-category').insertAdjacentHTML('beforeend', categoryOptions);
form.elements.category.innerHTML = categoryOptions;
resetProductForm();

try {
  sourceProducts = await getProducts();
  catalogueLoaded = true;
  renderOverview();
  renderProducts();
  renderInventory();
} catch {
  setFeedback('The source catalogue could not load. Run the site through the local development server and check data/products.json. Local drafts are still available; export is disabled until the catalogue loads.', true);
  renderOverview();
  renderProducts();
  renderInventory();
}
/* ==================== EXPORT AND INITIALIZATION END ==================== */
