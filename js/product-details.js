import { getProducts, formatPrice, escapeHTML, productCard, setupImages, renderError, addToCart, getCartQuantity, showToast, categoryConfig, imageURL } from './common.js';

// ==================== PRODUCT DETAILS SETUP START ====================
const detailContainer = document.querySelector('#product-detail');
const relatedContainer = document.querySelector('#related-products');
const sizeGuide = document.querySelector('#size-guide');
let currentProduct = null;

function availableQuantity(product) {
  return Math.max(0, Math.min(99, Math.floor(Number(product.stock) || 0) - getCartQuantity(product.id)));
}

function showUnavailable() {
  detailContainer.innerHTML = `<div class="pd-unavailable"><p class="pd-eyebrow">A LITTLE DETOUR</p><h1>Product not found.</h1><p>This piece may have moved, or the link may be incomplete. Discover something else in the collection.</p><a class="pd-primary" href="product.html">Explore the collection ↗</a></div>`;
}

function renderProduct(product) {
  const category = categoryConfig[product.category];
  const subcategory = category?.subcategories.find(item => item.id === product.subcategory);
  const images = [...new Set([product.image, ...(product.images || [])].map(imageURL).filter(Boolean))];
  const discount = product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  document.title = `${product.name} — FORME`;
  document.querySelector('meta[name="description"]').content = product.description || `Discover ${product.name} at FORME.`;

  detailContainer.innerHTML = `
    <nav class="pd-breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="${escapeHTML(category?.page || 'product.html')}">${escapeHTML(category?.label || 'Collection')}</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHTML(product.name)}</span></nav>
    <div class="pd-layout">
      <section class="pd-gallery" aria-label="Product photographs">
        <div class="pd-main-image"><img id="product-main-image" src="${escapeHTML(images[0] || '')}" alt="${escapeHTML(product.name)}" fetchpriority="high"><span class="pd-image-counter" id="image-counter">01 / ${String(Math.max(1, images.length)).padStart(2, '0')}</span></div>
        ${images.length > 1 ? `<div class="pd-thumbnails" aria-label="Choose a product photograph">${images.map((image, index) => `<button type="button" class="pd-thumbnail" data-image-index="${index}" aria-label="View photograph ${index + 1}" aria-pressed="${index === 0}"><img src="${escapeHTML(image)}" alt="${escapeHTML(product.name)} — view ${index + 1}" loading="lazy"></button>`).join('')}</div>` : ''}
      </section>
      <section class="pd-info" aria-labelledby="product-name">
        <p class="pd-eyebrow">${escapeHTML(category?.label || product.category)} / ${escapeHTML(subcategory?.label || product.subcategory)}</p>
        <h1 id="product-name">${escapeHTML(product.name)}</h1>
        <div class="pd-price-row"><span>${formatPrice(product.price)}</span>${discount ? `<del>${formatPrice(product.originalPrice)}</del><span class="pd-discount">${discount}% OFF</span>` : ''}</div>
        <p class="pd-tax-note">Sample catalogue price · INR</p>
        <p class="pd-short-description">${escapeHTML(product.description)}</p>
        <p class="pd-stock ${product.stock ? '' : 'is-out'}">${product.stock ? `In stock · ${product.stock} available across all options` : 'Currently out of stock'}</p>
        <form id="purchase-form">
          <div class="pd-size-heading"><span>SELECT SIZE</span><button type="button" id="open-size-guide" class="pd-text-button">Size guide</button></div>
          <fieldset class="pd-option-group"><legend class="sr-only">Choose a size</legend><div class="pd-option-list">${product.sizes.map(size => `<label class="pd-option"><input type="radio" name="size" value="${escapeHTML(size)}" required><span>${escapeHTML(size)}</span></label>`).join('')}</div></fieldset>
          ${product.colors?.length ? `<fieldset class="pd-option-group"><legend>COLOUR</legend><div class="pd-option-list">${product.colors.map((color, index) => `<label class="pd-option pd-color-option"><input type="radio" name="color" value="${escapeHTML(color)}" ${index === 0 ? 'checked' : ''}><span>${escapeHTML(color)}</span></label>`).join('')}</div></fieldset>` : ''}
          <div class="pd-purchase-row"><div class="pd-quantity"><button type="button" id="quantity-decrease" aria-label="Decrease quantity">−</button><label class="sr-only" for="quantity">Quantity</label><input id="quantity" name="quantity" type="number" min="1" max="${Math.max(1, availableQuantity(product))}" value="1" step="1" inputmode="numeric" required><button type="button" id="quantity-increase" aria-label="Increase quantity">+</button></div><button type="submit" class="pd-primary" id="add-to-cart" name="action" value="add">Add to bag <span aria-hidden="true">↗</span></button></div>
          <button type="submit" class="pd-secondary" id="buy-now" name="action" value="buy">Buy now</button>
          <p id="purchase-feedback" class="pd-feedback" role="status"></p>
        </form>
        <p class="pd-purchase-note">Buy now takes you to a checkout preview. This sample store does not accept payments or place real orders.</p>
        <div class="pd-information">
          <details open><summary>The details</summary><p>${escapeHTML(product.description)}</p><p>Fit: ${escapeHTML(subcategory?.label || product.subcategory)}. ${product.material ? `Fabric: ${escapeHTML(product.material)}.` : 'Fabric composition: add your final product information in products.json.'}</p></details>
          <details><summary>Care & composition</summary><p>${escapeHTML(product.care || 'Add the manufacturer’s final care instructions in products.json before selling this product.')}</p></details>
          <details><summary>Delivery & returns</summary><p>This is a sample storefront. Shipping charges, delivery estimates and return terms will appear here once the brand’s final policies are available.</p></details>
        </div>
      </section>
    </div>`;

  setupImages(detailContainer);
  detailContainer.querySelectorAll('[data-image-index]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.imageIndex);
      const mainImage = detailContainer.querySelector('#product-main-image');
      delete mainImage.dataset.fallback;
      mainImage.classList.remove('image-fallback');
      mainImage.src = images[index];
      mainImage.alt = `${product.name} — view ${index + 1}`;
      // Reattach the shared fallback for a different photograph.
      setupImages(detailContainer);
      detailContainer.querySelector('#image-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
      detailContainer.querySelectorAll('[data-image-index]').forEach(thumbnail => thumbnail.setAttribute('aria-pressed', String(thumbnail === button)));
    });
  });
  bindPurchaseForm(product);
}
// ==================== PRODUCT DETAILS SETUP END ====================

// ==================== PURCHASE INTERACTIONS START ====================
function refreshPurchaseLimits() {
  if (!currentProduct) return;
  const quantityInput = detailContainer.querySelector('#quantity');
  if (!quantityInput) return;
  const available = availableQuantity(currentProduct);
  const quantity = Math.max(1, Math.min(available || 1, Math.floor(Number(quantityInput.value) || 1)));
  quantityInput.max = String(Math.max(1, available));
  quantityInput.value = String(quantity);
  quantityInput.disabled = available === 0;
  detailContainer.querySelector('#quantity-decrease').disabled = available === 0 || quantity <= 1;
  detailContainer.querySelector('#quantity-increase').disabled = available === 0 || quantity >= available;
  detailContainer.querySelector('#add-to-cart').disabled = available === 0;
  detailContainer.querySelector('#buy-now').disabled = available === 0;
  const feedback = detailContainer.querySelector('#purchase-feedback');
  if (available === 0) {
    feedback.textContent = currentProduct.stock > 0 ? 'All available stock is already in your bag. Update your bag to change the quantity.' : 'This piece is currently unavailable. Explore the related styles below.';
    feedback.dataset.stockMessage = 'true';
  } else if (feedback.dataset.stockMessage) {
    feedback.textContent = '';
    delete feedback.dataset.stockMessage;
  }
}

function bindPurchaseForm(product) {
  const form = detailContainer.querySelector('#purchase-form');
  const quantityInput = form.querySelector('#quantity');
  const feedback = form.querySelector('#purchase-feedback');
  form.querySelector('#quantity-decrease').addEventListener('click', () => {
    quantityInput.value = String(Number(quantityInput.value) - 1);
    refreshPurchaseLimits();
  });
  form.querySelector('#quantity-increase').addEventListener('click', () => {
    quantityInput.value = String(Number(quantityInput.value) + 1);
    refreshPurchaseLimits();
  });
  quantityInput.addEventListener('change', refreshPurchaseLimits);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const quantity = Number(values.get('quantity'));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > availableQuantity(product)) {
      feedback.textContent = 'Choose a valid quantity within the available stock.';
      refreshPurchaseLimits();
      return;
    }
    try {
      const saved = addToCart(product, String(values.get('size') || ''), String(values.get('color') || ''), quantity);
      if (!saved) {
        refreshPurchaseLimits();
        delete feedback.dataset.stockMessage;
        feedback.textContent = 'Added for this page only. Enable browser storage to keep your bag when you leave this page or continue to checkout.';
        return;
      }
      delete feedback.dataset.stockMessage;
      feedback.textContent = `${quantity} ${quantity === 1 ? 'piece' : 'pieces'} added to your bag.`;
      showToast('Added to your bag');
      refreshPurchaseLimits();
      if (event.submitter?.value === 'buy') window.location.href = 'cart.html?checkout=1';
    } catch (error) {
      feedback.textContent = error.message || 'Your bag could not be updated. Please try again.';
    }
  });
  form.querySelector('#open-size-guide').addEventListener('click', () => sizeGuide.showModal());
  refreshPurchaseLimits();
}

sizeGuide.querySelectorAll('[data-close-size]').forEach(button => button.addEventListener('click', () => sizeGuide.close()));
sizeGuide.addEventListener('click', event => {
  if (event.target !== sizeGuide) return;
  const bounds = sizeGuide.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) sizeGuide.close();
});
window.addEventListener('cart-updated', refreshPurchaseLimits);
window.addEventListener('storage', refreshPurchaseLimits);
// ==================== PURCHASE INTERACTIONS END ====================

// ==================== PRODUCT LOADING START ====================
async function initializeProduct() {
  try {
    const productId = new URLSearchParams(window.location.search).get('id');
    const products = await getProducts();
    currentProduct = products.find(product => product.id === productId);
    if (!currentProduct) {
      showUnavailable();
      return;
    }
    renderProduct(currentProduct);
    const related = products.filter(product => product.id !== currentProduct.id && product.category === currentProduct.category)
      .sort((first, second) => Number(second.subcategory === currentProduct.subcategory) - Number(first.subcategory === currentProduct.subcategory))
      .slice(0, 4);
    if (related.length) {
      relatedContainer.hidden = false;
      relatedContainer.innerHTML = `<div class="pd-section-heading"><h2 id="related-heading">A little more your style.</h2><a href="${escapeHTML(categoryConfig[currentProduct.category]?.page || 'product.html')}">Explore all ↗</a></div><div class="pd-related-grid">${related.map(product => productCard(product)).join('')}</div>`;
      setupImages(relatedContainer);
    }
  } catch (error) {
    renderError(detailContainer, 'We could not load this product. Please try again, and make sure the site is running through its local development server.');
  }
}

initializeProduct();
// ==================== PRODUCT LOADING END ====================

