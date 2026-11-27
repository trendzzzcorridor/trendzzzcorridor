import { auth } from './firebase.js';
import { getFirestore, collection, getDocsFromServer } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import { normalizeInventoryProduct, variantFor, skuQuantity, availabilityFor, displayProducts, inStockForSize, skuLineKey, overrideKey } from './inventory.js';
export { variantFor, skuQuantity, availabilityFor, displayProducts, inStockForSize, skuLineKey, overrideKey };
// TZC_SKU_INVENTORY_V1 — V5 publisher compatibility. Legacy sample stock is never sellable.

// ==================== CATALOGUE CONFIGURATION START ====================
// Product records live ONLY in data/products.json. This describes navigation.
export const categoryConfig = {
  tshirt: { label: 'T-Shirts', page: 'tshirt.html', tag: 'tshirt-heading', subcategories: [{ id: 'relaxed', label: 'Relaxed' }, { id: 'oversized', label: 'Oversized' }] },
  'bottom-wear': { label: 'Bottom Wear', page: 'bottom-wear.html', tag: 'bottom-wear-heading', subcategories: [{ id: 'joggers', label: 'Joggers' }, { id: 'jeans', label: 'Jeans' }] },
  'winter-wear': { label: 'Winter Wear', page: 'winter-wear.html', tag: 'winter-wear-heading', subcategories: [{ id: 'hoodies', label: 'Hoodies' }, { id: 'jackets', label: 'Jackets' }] },
  shirts: { label: 'Shirts', page: 'shirts.html', tag: 'shirts-heading', subcategories: [{ id: 'printed', label: 'Printed' }, { id: 'plain', label: 'Plain' }, { id: 'oversized', label: 'Oversized' }] }
};

const inventoryDb = getFirestore(auth.app);
let productRequest, settingsRequest;
export const displayDefaults = Object.freeze({HOME_HERO_TOTAL:4, HOME_HERO_PER_CATEGORY:1, TSHIRT_HEADER_TOTAL:6, SHIRTS_HEADER_TOTAL:9, BOTTOM_WEAR_HEADER_TOTAL:6, WINTER_WEAR_HEADER_TOTAL:6, NEW_ARRIVALS_TOTAL:16, CATALOGUE_TILES_TOTAL:16, HOME_DISPLAY_MODE:'COLOUR_VARIANTS', CATALOGUE_DISPLAY_MODE:'COLOUR_VARIANTS', CATEGORY_DISPLAY_MODE:'COLOUR_VARIANTS', HOME_COLLECTION_TOTAL:34, SHOW_EMPTY_CATEGORIES:'COMING_SOON', SHOW_SOLD_OUT_COLOURS:'YES'});
export async function getDisplaySettings() {
  if (!settingsRequest) settingsRequest = fetch('data/display-settings.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Settings unavailable');return r.json();}).then(data=>{
    const result={...displayDefaults};
    for(const [key,value] of Object.entries(displayDefaults)){
      const next=data[key];
      if(typeof value==='number'&&Number.isInteger(next)&&next>=1&&next<=200)result[key]=next;
      else if(key.endsWith('_DISPLAY_MODE')&&['COLOUR_VARIANTS','GROUPED_PRODUCTS'].includes(next))result[key]=next;
      else if(key==='SHOW_EMPTY_CATEGORIES'&&['COMING_SOON','HIDDEN'].includes(next))result[key]=next;
      else if(key==='SHOW_SOLD_OUT_COLOURS'&&['YES','NO'].includes(next))result[key]=next;
    }
    return result;
  }).catch(()=>({...displayDefaults}));
  return settingsRequest;
}
export async function getProducts({refresh=false}={}) {
  if(refresh)productRequest=undefined;
  if(!productRequest)productRequest=fetch('data/products.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('The collection could not load. Please try again.');return r.json();}).then(async data=>{
    if(!Array.isArray(data))throw Error('The product catalogue format is invalid.');
    const ids=new Set();
    let availability=new Map(),overrides=new Map(),remaining=new Map(),verified=true;
    try{
      const [master,sku,quantities]=await Promise.all([getDocsFromServer(collection(inventoryDb,'inventory')),getDocsFromServer(collection(inventoryDb,'skuAvailability')),getDocsFromServer(collection(inventoryDb,'skuRemaining'))]);
      availability=new Map(master.docs.map(d=>[d.id,d.data().status]));
      overrides=new Map(sku.docs.map(d=>[d.id,d.data()]));
      remaining=new Map(quantities.docs.map(d=>[d.id,d.data()]));
    }catch(error){console.warn('Inventory verification unavailable; purchasing disabled.',error);verified=false;}
    return data.filter(p=>{
      const valid=p&&p.catalogueStatus==='ACTIVE'&&p.inventorySchemaVersion===1&&typeof p.id==='string'&&!ids.has(p.id)&&typeof p.name==='string'&&categoryConfig[p.category]?.subcategories.some(sub=>sub.id===p.subcategory)&&Number.isFinite(p.price)&&p.price>=0;
      if(valid)ids.add(p.id);return valid;
    }).map(p=>normalizeInventoryProduct({...p,tags:Array.isArray(p.tags)?p.tags:[],images:Array.isArray(p.images)?p.images:[p.image],description:String(p.description||''),originalPrice:Number(p.originalPrice)>p.price?Number(p.originalPrice):null},availability.get(p.id),overrides,verified,remaining)).filter(Boolean);
  }).catch(error=>{productRequest=undefined;throw error;});
  return productRequest;
}
// ==================== CATALOGUE CONFIGURATION END ====================

// ==================== REUSABLE UI HELPERS START ====================
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export const formatPrice = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value) || 0);
export const isNewArrival = product => product.tags.includes('new-arrival') || product.newArrival === true;
export const productURL = product => 'product-details.html?id='+encodeURIComponent(product.id)+(product.selectedVariantId?'&colour='+encodeURIComponent(product.selectedVariantId):'');
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
      <div class="product-card-image"><img src="${escapeHTML(imageURL(product.image))}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" width="1200" height="1600">
        ${product.availability === 'COMING_SOON' ? '<span class="product-badge">Coming soon</span>' : product.availability === 'UNAVAILABLE' ? '<span class="product-badge">Availability unavailable</span>' : (product.availability === 'SOLD_OUT' || product.stock === 0) ? '<span class="product-badge">Sold out</span>' : isNewArrival(product) ? '<span class="product-badge">New</span>' : ''}
      </div>
      <div class="product-card-meta"><span>${escapeHTML(subcategory)} / ${escapeHTML(categoryConfig[product.category]?.label)}</span><span class="product-color-count">${product.colors.length ? `${product.colors.length} colour${product.colors.length > 1 ? 's' : ''}` : ''}</span></div>
      <h3>${escapeHTML(product.name)}</h3>
      <div class="product-price"><span>${formatPrice(product.price)}</span>${product.originalPrice ? `<del>${formatPrice(product.originalPrice)}</del><span class="product-discount">${discount}% off</span>` : ''}</div>
    </a>
  </article>`;
}
const imagePlaceholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#e9e8e2"/><text x="600" y="775" text-anchor="middle" font-family="Arial" font-size="32" fill="#697064" letter-spacing="1">Trendzzz Corridor</text><text x="600" y="840" text-anchor="middle" font-family="Arial" font-size="17" fill="#697064">Image coming soon</text></svg>');
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
// Start a new bag namespace: old sample colour names/IDs cannot safely migrate.
export const CART_KEY = 'tzc-cart-v2';
export function getCart() {
  const stored = readStorage(CART_KEY, []);
  if (!Array.isArray(stored)) return [];
  const valid = [];
  stored.forEach(item => {
    if (!item || typeof item.id !== 'string' || typeof item.size !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1) return;
    const color = typeof item.color === 'string' ? item.color : '';
    const variantId = typeof item.variantId === 'string' ? item.variantId : '';
    if (!color || !/^colour-(?:[1-9]|10)$/.test(variantId)) return;
    const previous = valid.find(line => line.id === item.id && line.variantId === variantId && line.size === item.size && line.color === color);
    if (previous) previous.quantity = Math.min(99, previous.quantity + item.quantity);
    else valid.push({ id: item.id, variantId, size: item.size, color, quantity: Math.min(99, item.quantity) });
  });
  return valid;
}
export function saveCart(items) {
  const saved = writeStorage(CART_KEY, items);
  window.dispatchEvent(new CustomEvent('cart-updated'));
  if (!saved) showToast('Browser storage is unavailable. Your bag is saved for this page only.');
  return saved;
}
export const getCartQuantity = (id, variantId, size) => getCart().filter(item=>item.id===id&&(!variantId||item.variantId===variantId)&&(!size||item.size===size)).reduce((sum,item)=>sum+item.quantity,0);
export function addToCart(product,size,color,quantity) {
  const variant=variantFor(product,color);
  if(!variant||!Object.hasOwn(variant.stockBySize,size))throw Error('Please choose an offered colour and size.');
  if(!product.inventoryVerified)throw Error('Availability cannot be verified. Refresh and try again.');
  if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw Error('Choose a quantity between 1 and 99.');
  const items=getCart();
  const key={id:product.id,variantId:variant.id,color:variant.name,size};
  const line=items.find(item=>skuLineKey(item)===skuLineKey(key));
  if((line?.quantity||0)+quantity>Math.min(99,skuQuantity(product,variant.id,size)))throw Error('There is not enough stock for this colour and size.');
  if(line)line.quantity+=quantity;else items.push({...key,quantity});
  return saveCart(items);
}
// ==================== SAFE LOCAL STORAGE AND CART END ====================
