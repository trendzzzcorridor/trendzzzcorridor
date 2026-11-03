import { requireCustomer } from './auth-gate.js';
import { getProducts, formatPrice, escapeHTML, setupImages, renderError, getCart, saveCart, showToast, categoryConfig } from './common.js';

// ==================== CART DATA AND STOCK START ====================
const cartContainer = document.querySelector('#cart-content');
const cartNotice = document.querySelector('#cart-notice');
const checkoutDialog = document.querySelector('#checkout-dialog');
const checkoutContent = document.querySelector('#checkout-content');
let productsById = new Map();
let cartItems = [];
let isSavingCart = false;
let cartReady = false;

function setNotice(message) {
  cartNotice.textContent = message;
  cartNotice.hidden = !message;
}

function persistCart(items) {
  isSavingCart = true;
  let saved = false;
  try { saved = saveCart(items); } finally { isSavingCart = false; }
  if (!saved) setNotice('Your browser could not save this bag. Check that browser storage is enabled and try again.');
  return saved;
}

// Stock belongs to the entire product, so different sizes share the same stock limit.
function reconcileCart() {
  const originalItems = getCart();
  const stockUsed = new Map();
  const reconciled = [];
  for (const item of originalItems) {
    const product = productsById.get(item.id);
    if (!product || !product.sizes.includes(item.size) || (product.colors?.length ? !product.colors.includes(item.color) : Boolean(item.color))) continue;
    const availableStock = Math.max(0, Math.floor(Number(product.stock) || 0) - (stockUsed.get(item.id) || 0));
    const quantity = Math.min(99, availableStock, Math.floor(Number(item.quantity) || 0));
    if (quantity < 1) continue;
    const existing = reconciled.find(entry => entry.id === item.id && entry.size === item.size && entry.color === (item.color || ''));
    if (existing) {
      const mergedQuantity = Math.min(99, existing.quantity + quantity);
      stockUsed.set(item.id, (stockUsed.get(item.id) || 0) + mergedQuantity - existing.quantity);
      existing.quantity = mergedQuantity;
    } else {
      reconciled.push({ id: item.id, size: item.size, color: item.color || '', quantity });
      stockUsed.set(item.id, (stockUsed.get(item.id) || 0) + quantity);
    }
  }
  cartItems = reconciled;
  if (JSON.stringify(originalItems) !== JSON.stringify(reconciled)) {
    if (persistCart(reconciled)) setNotice('Your bag has been updated to match the current catalogue. Unavailable options were removed and quantities were adjusted to available stock.');
  }
}

function totalQuantity() { return cartItems.reduce((total, item) => total + item.quantity, 0); }
function subtotal() { return cartItems.reduce((total, item) => total + productsById.get(item.id).price * item.quantity, 0); }
function maximumForItem(item) {
  const otherQuantity = cartItems.filter(entry => entry !== item && entry.id === item.id).reduce((total, entry) => total + entry.quantity, 0);
  return Math.max(0, Math.min(99, Math.floor(Number(productsById.get(item.id).stock) || 0) - otherQuantity));
}
// ==================== CART DATA AND STOCK END ====================

// ==================== CART RENDERING START ====================
function renderCart() {
  document.querySelector('#bag-item-count').textContent = `(${totalQuantity()})`;
  if (!cartItems.length) {
    cartContainer.innerHTML = `<section class="cart-empty"><div class="cart-empty-mark" aria-hidden="true">f.</div><h2>A little room for something good.</h2><p>Your bag is empty. Find the pieces you’ll keep coming back to.</p><a href="product.html" class="cart-primary">Explore the collection <span aria-hidden="true">↗</span></a></section>`;
    return;
  }
  cartContainer.innerHTML = `<div class="cart-layout"><section class="cart-items" aria-label="Items in your bag"><div class="cart-table-labels"><span>YOUR SELECTION</span><span>TOTAL</span></div>${cartItems.map((item, index) => {
    const product = productsById.get(item.id);
    const productUrl = `product-details.html?id=${encodeURIComponent(item.id)}`;
    return `<article class="cart-item" data-cart-index="${index}"><a href="${productUrl}" class="cart-item-image" tabindex="-1" aria-hidden="true"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy"></a><div class="cart-item-detail"><p class="cart-item-category">${escapeHTML(categoryConfig[product.category]?.label || product.category)}</p><h2><a href="${productUrl}">${escapeHTML(product.name)}</a></h2><p class="cart-item-options">Size: ${escapeHTML(item.size)}${item.color ? ` <span aria-hidden="true">/</span> Colour: ${escapeHTML(item.color)}` : ''}</p><p class="cart-unit-price">${formatPrice(product.price)} each</p><div class="cart-item-bottom"><div class="cart-quantity"><button type="button" data-cart-action="decrease" aria-label="Decrease quantity of ${escapeHTML(product.name)}, size ${escapeHTML(item.size)}" ${item.quantity <= 1 ? 'disabled' : ''}>−</button><label class="sr-only" for="cart-quantity-${index}">Quantity for ${escapeHTML(product.name)}, size ${escapeHTML(item.size)}${item.color ? `, ${escapeHTML(item.color)}` : ''}</label><input id="cart-quantity-${index}" type="number" value="${item.quantity}" min="1" max="${maximumForItem(item)}" step="1" inputmode="numeric" data-cart-quantity><button type="button" data-cart-action="increase" aria-label="Increase quantity of ${escapeHTML(product.name)}, size ${escapeHTML(item.size)}" ${item.quantity >= maximumForItem(item) ? 'disabled' : ''}>+</button></div><button type="button" class="cart-remove" data-cart-action="remove" aria-label="Remove ${escapeHTML(product.name)}, size ${escapeHTML(item.size)} from bag">Remove</button></div></div><p class="cart-line-total">${formatPrice(product.price * item.quantity)}</p></article>`;
  }).join('')}</section><aside class="cart-summary" aria-labelledby="summary-heading"><h2 id="summary-heading">Order summary</h2><dl class="cart-totals"><div><dt>Subtotal (${totalQuantity()} ${totalQuantity() === 1 ? 'item' : 'items'})</dt><dd>${formatPrice(subtotal())}</dd></div><div><dt>Delivery</dt><dd>Set at live checkout</dd></div><div class="cart-total"><dt>Bag total</dt><dd>${formatPrice(subtotal())}</dd></div></dl><p class="cart-summary-note">Sample prices in INR. Delivery, taxes and any final charges must be confirmed when a real checkout is connected.</p><button type="button" class="cart-primary" id="open-checkout">Preview checkout <span aria-hidden="true">↗</span></button><p class="cart-checkout-caption">DEMO STORE · NO PAYMENT TAKEN</p><div class="cart-summary-info"><span aria-hidden="true">⌑</span><p>A considered selection.<small>Your bag stays saved in this browser.</small></p></div></aside></div>`;
  setupImages(cartContainer);
}
// ==================== CART RENDERING END ====================

// ==================== CART INTERACTIONS START ====================
function updateQuantity(index, requestedQuantity, focusSelector) {
  const item = cartItems[index];
  if (!item) return;
  const maximum = maximumForItem(item);
  const validQuantity = Number.isInteger(requestedQuantity) && requestedQuantity >= 1 && requestedQuantity <= maximum;
  const quantity = Math.max(1, Math.min(maximum, Math.floor(Number(requestedQuantity) || 1)));
  if (!validQuantity) setNotice(`Choose a whole quantity from 1 to ${maximum} for this item. Your quantity has been adjusted.`);
  else setNotice('');
  const nextItems = cartItems.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity } : { ...entry });
  persistCart(nextItems);
  cartItems = nextItems;
  renderCart();
  if (focusSelector) cartContainer.querySelector(focusSelector)?.focus();
}

cartContainer.addEventListener('click', event => {
  const checkoutButton = event.target.closest('#open-checkout');
  if (checkoutButton) { openCheckout(); return; }
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const index = Number(button.closest('[data-cart-index]').dataset.cartIndex);
  const item = cartItems[index];
  if (!item) return;
  const action = button.dataset.cartAction;
  if (action === 'remove') {
    const nextItems = cartItems.filter((entry, entryIndex) => entryIndex !== index);
    const saved = persistCart(nextItems);
    cartItems = nextItems;
    if (saved) { setNotice('Item removed from your bag.'); showToast('Item removed'); }
    renderCart();
    (cartContainer.querySelector(`[data-cart-index="${Math.min(index, cartItems.length - 1)}"] .cart-remove`) || cartContainer.querySelector('.cart-primary'))?.focus();
    return;
  }
  updateQuantity(index, item.quantity + (action === 'increase' ? 1 : -1), `[data-cart-index="${index}"] [data-cart-action="${action}"]`);
});

cartContainer.addEventListener('change', event => {
  if (!event.target.matches('[data-cart-quantity]')) return;
  const index = Number(event.target.closest('[data-cart-index]').dataset.cartIndex);
  updateQuantity(index, Number(event.target.value), `#cart-quantity-${index}`);
});

function refreshFromStorage() {
  if (!cartReady || isSavingCart) return;
  reconcileCart();
  renderCart();
  if (checkoutDialog.open) renderCheckout();
}
window.addEventListener('storage', refreshFromStorage);
window.addEventListener('cart-updated', refreshFromStorage);
// ==================== CART INTERACTIONS END ====================

// ==================== DEMO CHECKOUT START ====================
function renderCheckout() {
  if (!cartItems.length) {
    checkoutContent.innerHTML = `<h2 id="checkout-title">Your bag is empty.</h2><p>Add a piece from the collection to explore the checkout preview.</p><a class="cart-primary" href="product.html">Explore the collection ↗</a>`;
    return;
  }
  checkoutContent.innerHTML = `<h2 id="checkout-title">One last look.</h2><p>This is a frontend checkout demonstration. No payment information is collected, and no real order will be placed.</p><ul class="cart-dialog-list">${cartItems.map(item => {
    const product = productsById.get(item.id);
    return `<li><span>${escapeHTML(product.name)}<small>${escapeHTML(item.size)}${item.color ? ` / ${escapeHTML(item.color)}` : ''} · Quantity ${item.quantity}</small></span><span>${formatPrice(product.price * item.quantity)}</span></li>`;
  }).join('')}</ul><div class="cart-dialog-total"><span>Bag total</span><span>${formatPrice(subtotal())}</span></div><p>Delivery and final charges are not calculated in this preview. Your bag will remain saved.</p><button type="button" class="cart-primary" id="finish-checkout-preview">Finish preview <span aria-hidden="true">↗</span></button>`;
}

async function openCheckout() {
  if (!await requireCustomer()) return;
  reconcileCart();
  renderCart();
  renderCheckout();
  if (!checkoutDialog.open) checkoutDialog.showModal();
}

checkoutDialog.querySelector('[data-close-checkout]').addEventListener('click', () => checkoutDialog.close());
checkoutDialog.addEventListener('click', event => {
  if (event.target.closest('#finish-checkout-preview')) {
    checkoutContent.innerHTML = `<div class="cart-dialog-success" aria-hidden="true">✓</div><h2 id="checkout-title" tabindex="-1">Preview complete.</h2><p>No order was placed and no payment was taken. Your bag is still here when you’re ready to explore further.</p><p>A live store will connect this step to a secure payment provider, order records and delivery updates.</p><a class="cart-primary" href="product.html">Continue exploring ↗</a><p><a href="tracking.html?order=FORME1001">View separate sample order tracking</a></p>`;
    checkoutContent.querySelector('#checkout-title').focus();
    return;
  }
  if (event.target !== checkoutDialog) return;
  const bounds = checkoutDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) checkoutDialog.close();
});
checkoutDialog.addEventListener('close', () => cartContainer.querySelector('#open-checkout')?.focus());
// ==================== DEMO CHECKOUT END ====================

// ==================== CART LOADING START ====================
async function initializeCart() {
  if (!await requireCustomer()) return;
  try {
    const products = await getProducts();
    productsById = new Map(products.map(product => [product.id, product]));
    reconcileCart();
    renderCart();
    cartReady = true;
    if (new URLSearchParams(window.location.search).get('checkout') === '1' && cartItems.length) openCheckout();
  } catch (error) {
    renderError(cartContainer, 'We could not load the catalogue to calculate your bag. Your saved bag has not been changed. Please refresh the page and try again.');
  }
}

initializeCart();
// ==================== CART LOADING END ====================

