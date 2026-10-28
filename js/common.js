// ==================== CATALOGUE CONFIGURATION START ====================
// Product records live ONLY in data/products.json. This describes navigation.
export const categoryConfig = {
  tshirt: { label: 'T-Shirts', page: 'tshirt.html', tag: 'tshirt-heading', subcategories: [{ id: 'relaxed', label: 'Relaxed' }, { id: 'oversized', label: 'Oversized' }] },
  'bottom-wear': { label: 'Bottom Wear', page: 'bottom-wear.html', tag: 'bottom-wear-heading', subcategories: [{ id: 'joggers', label: 'Joggers' }, { id: 'jeans', label: 'Jeans' }] },
  'winter-wear': { label: 'Winter Wear', page: 'winter-wear.html', tag: 'winter-wear-heading', subcategories: [{ id: 'hoodies', label: 'Hoodies' }, { id: 'jackets', label: 'Jackets' }] },
  shirts: { label: 'Shirts', page: 'shirts.html', tag: 'shirts-heading', subcategories: [{ id: 'printed', label: 'Printed' }, { id: 'plain', label: 'Plain' }, { id: 'oversized', label: 'Oversized' }] }
};

let productRequest;
export async function getProducts() {
  if (!productRequest) {
    productRequest = fetch('data/products.json').then(response => {
      if (!response.ok) throw new Error('The collection could not load. Please try again.');
      return response.json();
    }).then(data => {
      if (!Array.isArray(data)) throw new Error('The product catalogue format is invalid.');
      const ids = new Set();
      return data.filter(product => {
        const valid = product && typeof product.id === 'string' && !ids.has(product.id) && typeof product.name === 'string' && categoryConfig[product.category] && categoryConfig[product.category].subcategories.some(sub => sub.id === product.subcategory) && Number.isFinite(product.price) && product.price >= 0;
        if (valid) ids.add(product.id);
        return valid;
      }).map(product => ({
        ...product,
        sizes: Array.isArray(product.sizes) ? product.sizes.filter(size => typeof size === 'string') : [],
        colors: Array.isArray(product.colors) ? product.colors.filter(color => typeof color === 'string') : [],
        tags: Array.isArray(product.tags) ? product.tags.filter(tag => typeof tag === 'string') : [],
        images: Array.isArray(product.images) ? product.images : [product.image],
        stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
        description: String(product.description || ''),
        originalPrice: Number(product.originalPrice) > product.price ? Number(product.originalPrice) : null
      }));
    }).catch(error => { productRequest = undefined; throw error; });
  }
  return productRequest;
}
// ==================== CATALOGUE CONFIGURATION END ====================

// ==================== REUSABLE UI HELPERS START ====================
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export const formatPrice = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value) || 0);
export const isNewArrival = product => product.tags.includes('new-arrival') || product.newArrival === true;
export const productURL = product => `product-details.html?id=${encodeURIComponent(product.id)}`;
export function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}
export function imageURL(value) {
  return typeof value === 'string' && /^images\/[a-z0-9/_-]+\.(jpeg|jpg|png|webp|svg)$/i.test(value) ? value : '';
}
export function productCard(product) {
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const subcategory = categoryConfig[product.category]?.subcategories.find(sub => sub.id === product.subcategory)?.label || '';
  return `<article class="product-card" data-product-id="${escapeHTML(product.id)}">
    <a class="product-card-link" href="${productURL(product)}">
      <div class="product-card-image"><img src="${escapeHTML(imageURL(product.image))}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" width="600" height="760">
        ${product.stock === 0 ? '<span class="product-badge">Sold out</span>' : isNewArrival(product) ? '<span class="product-badge">New</span>' : ''}
        <span class="product-card-discover" aria-hidden="true">Discover <span>↗</span></span>
      </div>
      <div class="product-card-meta"><span>${escapeHTML(subcategory)} / ${escapeHTML(categoryConfig[product.category]?.label)}</span><span class="product-color-count">${product.colors.length ? `${product.colors.length} colour${product.colors.length > 1 ? 's' : ''}` : ''}</span></div>
      <h3>${escapeHTML(product.name)}</h3>
      <div class="product-price"><span>${formatPrice(product.price)}</span>${product.originalPrice ? `<del>${formatPrice(product.originalPrice)}</del><span class="product-discount">${discount}% off</span>` : ''}</div>
    </a>
  </article>`;
}
const imagePlaceholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760"><rect width="600" height="760" fill="#e9e8e2"/><text x="300" y="350" text-anchor="middle" font-family="Arial" font-size="32" fill="#697064" letter-spacing="6">FORME</text><text x="300" y="400" text-anchor="middle" font-family="Arial" font-size="17" fill="#697064">Image coming soon</text></svg>');
export function setupImages(container = document) {
  container.querySelectorAll('img').forEach(image => {
    const fallback = () => {
      image.onerror = null;
      image.src = imagePlaceholder;
      image.classList.add('image-fallback');
      image.dataset.fallback = 'true';
    };
    if (image.dataset.fallback) return;
    image.onerror = fallback;
    if (!image.getAttribute('src') || (image.complete && image.naturalWidth === 0)) fallback();
  });
}
export function renderError(container, message) {
  if (container) container.innerHTML = `<div class="empty-state" role="status"><p class="eyebrow">A little pause</p><h2>${escapeHTML(message)}</h2><p>Please refresh to try again. This site needs a local web server to load its collection.</p><a class="button button-secondary" href="index.html">Back to home</a></div>`;
}
export function showToast(message) {
  let toast = document.querySelector('#site-toast');
  if (!toast) {
    toast = document.createElement('div'); toast.id = 'site-toast'; toast.className = 'site-toast'; toast.setAttribute('role', 'status'); document.body.append(toast);
  }
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.remove('visible'), 4200);
}
// ==================== REUSABLE UI HELPERS END ====================

// ==================== SAFE LOCAL STORAGE AND CART START ====================
const memoryStorage = new Map();
const unsavedStorageKeys = new Set();
export function readStorage(key, fallback) {
  if (unsavedStorageKeys.has(key)) return memoryStorage.get(key);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  } catch { return memoryStorage.has(key) ? memoryStorage.get(key) : fallback; }
}
export function writeStorage(key, value) {
  memoryStorage.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); unsavedStorageKeys.delete(key); return true; }
  catch { unsavedStorageKeys.add(key); return false; }
}
export const CART_KEY = 'forme-cart-v1';
export function getCart() {
  const stored = readStorage(CART_KEY, []);
  if (!Array.isArray(stored)) return [];
  const valid = [];
  stored.forEach(item => {
    if (!item || typeof item.id !== 'string' || typeof item.size !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1) return;
    const color = typeof item.color === 'string' ? item.color : '';
    const previous = valid.find(line => line.id === item.id && line.size === item.size && line.color === color);
    if (previous) previous.quantity = Math.min(99, previous.quantity + item.quantity);
    else valid.push({ id: item.id, size: item.size, color, quantity: Math.min(99, item.quantity) });
  });
  return valid;
}
export function saveCart(items) {
  const saved = writeStorage(CART_KEY, items);
  window.dispatchEvent(new CustomEvent('cart-updated'));
  if (!saved) showToast('Browser storage is unavailable. Your bag is saved for this page only.');
  return saved;
}
export const getCartQuantity = id => getCart().filter(item => item.id === id).reduce((sum, item) => sum + item.quantity, 0);
export function addToCart(product, size, color, quantity) {
  if (!product.sizes.includes(size)) throw new Error('Please choose an available size.');
  if (product.colors.length && !product.colors.includes(color)) throw new Error('Please choose an available colour.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Choose a quantity between 1 and 99.');
  if (getCartQuantity(product.id) + quantity > product.stock) throw new Error('There is not enough stock for that quantity. Check the items already in your bag.');
  const items = getCart();
  const line = items.find(item => item.id === product.id && item.size === size && item.color === (color || ''));
  if (line && line.quantity + quantity > 99) throw new Error('The maximum quantity for one selection is 99.');
  if (line) line.quantity += quantity;
  else items.push({ id: product.id, size, color: color || '', quantity });
  return saveCart(items);
}
// ==================== SAFE LOCAL STORAGE AND CART END ====================
