import { getProducts, getDisplaySettings, displayProducts, categoryConfig, escapeHTML, shuffle, productCard, setupImages, renderError } from './common.js';
import { createSlider } from './slider.js';
import { createFilters } from './filters.js';

// ==================== CATEGORY AND DISCOVERY LISTINGS START ====================
const category = document.body.dataset.category || '';
const discovery = !category;
const collection = document.querySelector('#product-collections');
let featuredOrder = new Map();

function sectionGrid(products, preview = false) {
  if (!products.length) return '<div class="collection-empty"><p>No styles match these filters in this collection.</p></div>';
  const chosen = products;
  return `<div class="product-grid${preview ? ' preview-grid' : ''}">${chosen.map(productCard).join('')}</div>`;
}
function renderCollections(products, filters) {
  if (!products.length) {
    collection.innerHTML = '<div class="empty-state"><p class="eyebrow">Room for a different fit</p><h2>No matching styles.</h2><p>Try another size, adjust your price range, or clear your filters.</p><button type="button" class="button button-secondary" id="empty-reset">Clear filters</button></div>';
    collection.querySelector('#empty-reset').addEventListener('click', () => document.querySelector('.catalogue-filter-form').reset());
    return;
  }
  const applicable = Object.entries(categoryConfig).filter(([key]) => !category || key === category);
  collection.innerHTML = applicable.map(([key, config]) => {
    const categoryProducts = products.filter(product => product.category === key);
    if (!categoryProducts.length) return '';
    return `<section class="major-collection" aria-label="${config.label}">${discovery ? `<div class="major-collection-heading"><p class="eyebrow">The ${config.label} edit</p><h2>${config.label}</h2><a class="text-link" href="${config.page}">Show all ${config.label} </a></div>` : ''}${config.subcategories.filter(subcategory => (!filters.subcategory || filters.subcategory === subcategory.id) && categoryProducts.some(p=>p.subcategory===subcategory.id)).map(subcategory => {
      let sectionProducts = categoryProducts.filter(product => product.subcategory === subcategory.id);
      if (discovery && filters.sort === 'featured') {
        // Promotional products are randomized only after category and tag filtering.
        const promotional = sectionProducts.filter(product => product.tags.includes('product-image')).sort((a, b) => featuredOrder.get(a.id) - featuredOrder.get(b.id));
        const regular = sectionProducts.filter(product => !product.tags.includes('product-image'));
        sectionProducts = [...promotional, ...regular];
      }
      const anchor = discovery ? `${key}-${subcategory.id}` : subcategory.id;
      return `<section class="subcategory-section" id="${anchor}" aria-labelledby="heading-${anchor}"><div class="subcategory-heading"><h${discovery ? '3' : '2'} id="heading-${anchor}">${escapeHTML(subcategory.label)}<span>${sectionProducts.length} styles</span></h${discovery ? '3' : '2'}>${discovery ? `<a class="text-link" href="${config.page}#${subcategory.id}">Show all </a>` : '<a class="back-to-top" href="#collection-top" aria-label="Back to collection navigation">↑ Back to top</a>'}</div>${sectionGrid(sectionProducts, discovery)}</section>`;
    }).join('')}</section>`;
  }).join('');
  setupImages(collection);
}
function scrollToRequestedSection() {
  if (!location.hash) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' }));
}
async function initializeProducts() {
  try {
    const [allProducts,settings]=await Promise.all([getProducts(),getDisplaySettings()]);
    const masters=allProducts.filter(p=>!category||p.category===category);
    const products=displayProducts(masters,discovery?settings.CATALOGUE_DISPLAY_MODE:settings.CATEGORY_DISPLAY_MODE,settings.SHOW_SOLD_OUT_COLOURS);
    const quick=document.querySelector('.collection-quick-nav');
    quick?.querySelectorAll('a').forEach(a=>{
      const href=a.getAttribute('href');
      const entry=Object.entries(categoryConfig).find(([,c])=>c.page===href);
      if(href?.startsWith('#')&&!masters.some(p=>p.subcategory===href.slice(1)))a.remove();
      else if(entry&&!allProducts.some(p=>p.category===entry[0]))a.remove();
    });
    if(!masters.length){
      if(quick)quick.hidden=true;
      document.querySelector('#collection-filters').innerHTML='';
      createSlider(document.querySelector('#category-slider'),[]);
      collection.innerHTML='<section class="empty-state"><p class="eyebrow">The next edit</p><h2>Coming soon.</h2><p>We are preparing this collection.</p><a class="button button-secondary" href="product.html">Shop the available collection</a></section>';
      return;
    }
    if (!discovery) {
      const config = categoryConfig[category];
      const limit=settings[({'tshirt':'TSHIRT_HEADER_TOTAL','shirts':'SHIRTS_HEADER_TOTAL','bottom-wear':'BOTTOM_WEAR_HEADER_TOTAL','winter-wear':'WINTER_WEAR_HEADER_TOTAL'})[category]];
      const pool=products.filter(p=>p.tags.includes(config.tag));
      createSlider(document.querySelector('#category-slider'),shuffle(pool.length?pool:products).slice(0,limit));
    } else {
      createSlider(document.querySelector('#category-slider'), shuffle(products.filter(product => product.tags.includes('product-image'))).slice(0, settings.CATALOGUE_TILES_TOTAL));
    }
    featuredOrder = new Map(shuffle(products.filter(product => product.tags.includes('product-image'))).map((product, index) => [product.id, index]));
    createFilters(document.querySelector('#collection-filters'), products, { category, onChange: renderCollections });
    scrollToRequestedSection();
  } catch (error) {
    renderError(collection, error.message);
    renderError(document.querySelector('#category-slider'), 'The collection is taking a moment to load.');
    document.querySelector('#collection-filters').innerHTML = '';
  }
}
initializeProducts();
// ==================== CATEGORY AND DISCOVERY LISTINGS END ====================
