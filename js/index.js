import { getProducts, getDisplaySettings, displayProducts, categoryConfig, isNewArrival, shuffle, productCard, escapeHTML, imageURL, setupImages, renderError } from './common.js';
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
    const selectedIds = new Set(selected.map(product => product.id+'|'+(product.selectedVariantId||'')));
    selected.push(...shuffle(eligible.filter(product => !selectedIds.has(product.id+'|'+(product.selectedVariantId||'')))).slice(0, count - selected.length));
  }
  // Interleave categories so the first row reflects the breadth of the collection.
  const groups = categoryKeys.map(category => selected.filter(product => product.category === category));
  const result = [];
  while (groups.some(group => group.length)) groups.forEach(group => { if (group.length) result.push(group.shift()); });
  return result.slice(0, count);
}
// ==================== BALANCED NEW ARRIVALS END ====================

// ==================== DATA-DRIVEN CATALOGUE TILES START ====================
function renderCatalogue(products, settings) {
  const tiles = [];
  Object.entries(categoryConfig).forEach(([category, config]) => {
    tiles.push({ label: config.label, href: config.page, products: products.filter(product => product.category === category) });
  });
  Object.entries(categoryConfig).forEach(([category, config]) => {
    config.subcategories.forEach(subcategory => tiles.push({ label: `${subcategory.label}${category === 'tshirt' ? ' T-Shirts' : category === 'shirts' ? ' Shirts' : ''}`, href: `${config.page}#${subcategory.id}`, products: products.filter(product => product.category === category && product.subcategory === subcategory.id) }));
  });
  tiles.push({ label: 'New arrivals', href: 'product.html?new=1', products: products.filter(isNewArrival) }, { label: 'Under ₹1,500', href: 'product.html?max=1500', products: products.filter(product => product.price <= 1500) }, { label: 'The complete collection', href: 'product.html', products });
  const visibleTiles=tiles.filter(tile=>tile.products.length).slice(0,settings.CATALOGUE_TILES_TOTAL);
  const usedImages = new Set();
  document.querySelector('#catalogue-grid').innerHTML = visibleTiles.map(tile => {
    const product = tile.products.find(item => !usedImages.has(item.image)) || tile.products[0];
    if (product) usedImages.add(product.image);
    return `<a class="catalogue-tile" href="${tile.href}"><div class="catalogue-tile-image"><img src="${escapeHTML(imageURL(product?.image))}" alt="${escapeHTML(tile.label)} collection" loading="lazy" decoding="async" width="1200" height="1600"></div><h3 class="catalogue-tile-title">${escapeHTML(tile.label)}</h3></a>`;
  }).join('');
}
async function initializeHome() {
  try {
    const [products,settings]=await Promise.all([getProducts(),getDisplaySettings()]);
    const cards=displayProducts(products,settings.HOME_DISPLAY_MODE,settings.SHOW_SOLD_OUT_COLOURS);
    const featured=displayProducts(products.filter(p=>p.tags.includes('main-index')),'COLOUR_VARIANTS',settings.SHOW_SOLD_OUT_COLOURS);
    const hero=Object.keys(categoryConfig).flatMap(category=>shuffle(featured.filter(p=>p.category===category)).slice(0,settings.HOME_HERO_PER_CATEGORY)).slice(0,settings.HOME_HERO_TOTAL);
    createSlider(document.querySelector('#home-slider'),hero.length?hero:cards.slice(0,settings.HOME_HERO_TOTAL),{home:true});
    const strip=document.querySelector('.collection-strip');
    strip.querySelectorAll('a').forEach(a=>{const entry=Object.entries(categoryConfig).find(([,c])=>a.getAttribute('href')===c.page);if(entry&&!products.some(p=>p.category===entry[0]))a.remove();});
    strip.querySelectorAll('a>span:first-child').forEach((span,i)=>span.textContent=String(i+1).padStart(2,'0'));
    strip.style.setProperty('--tc-collection-count',String(Math.max(1,strip.children.length)));
    strip.style.setProperty('--tc-mobile-collection-count',String(Math.max(1,Math.min(2,strip.children.length))));
    strip.hidden=!strip.children.length;
    const arrivals=balancedArrivals(cards,settings.NEW_ARRIVALS_TOTAL);
    const shop=document.querySelector('#shop-collection');
    shop.innerHTML=cards.length?cards.slice(0,settings.HOME_COLLECTION_TOTAL).map(productCard).join(''):'<p class="empty-state">The first collection is being prepared.</p>';
    const coming=document.querySelector('#coming-collections');
    const pending=Object.entries(categoryConfig).filter(([key])=>!products.some(p=>p.category===key));
    coming.hidden=settings.SHOW_EMPTY_CATEGORIES!=='COMING_SOON'||!pending.length;
    coming.querySelector('.coming-collections-grid').innerHTML=pending.map(([,c])=>'<a class="coming-collection" href="'+c.page+'"><strong>'+escapeHTML(c.label)+'</strong><span>Coming soon</span></a>').join('');
    
    createFilters(document.querySelector('#arrival-filters'), arrivals, { expanded: false, onChange: filtered => {
      document.querySelector('#new-arrivals').innerHTML = filtered.length ? filtered.map(productCard).join('') : '<div class="empty-state"><h3>No arrivals match these filters.</h3><p>Try a different size or price, or clear the filters.</p><button class="button button-secondary" id="reset-arrivals" type="button">Clear filters</button></div>';
      document.querySelector('#reset-arrivals')?.addEventListener('click', () => document.querySelector('#arrival-filters form').reset());
      setupImages(document.querySelector('#new-arrivals'));
    } });
    renderCatalogue(products,settings); setupImages();
  } catch (error) {
    ['home-slider', 'new-arrivals', 'catalogue-grid'].forEach(id => renderError(document.getElementById(id), error.message));
  }
}
if (typeof document !== 'undefined') initializeHome();
// ==================== DATA-DRIVEN CATALOGUE TILES END ====================
