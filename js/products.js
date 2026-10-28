import { getProducts, categoryConfig, escapeHTML, shuffle, productCard, setupImages, renderError } from './common.js';
import { createSlider } from './slider.js';
import { createFilters } from './filters.js';

// ==================== CATEGORY AND DISCOVERY LISTINGS START ====================
const category = document.body.dataset.category || '';
const discovery = !category;
const collection = document.querySelector('#product-collections');
let featuredOrder = new Map();

function sectionGrid(products, preview = false) {
  if (!products.length) return '<div class="collection-empty"><p>No styles match these filters in this collection.</p></div>';
  const chosen = preview ? products.slice(0, 8) : products;
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
    if (discovery && !categoryProducts.length) return '';
    return `<section class="major-collection" aria-label="${config.label}">${discovery ? `<div class="major-collection-heading"><p class="eyebrow">The ${config.label} edit</p><h2>${config.label}</h2><a class="text-link" href="${config.page}">Show all ${config.label} <span aria-hidden="true">↗</span></a></div>` : ''}${config.subcategories.filter(subcategory => !filters.subcategory || filters.subcategory === subcategory.id).map(subcategory => {
      let sectionProducts = categoryProducts.filter(product => product.subcategory === subcategory.id);
      if (discovery && filters.sort === 'featured') {
        // Promotional products are randomized only after category and tag filtering.
        const promotional = sectionProducts.filter(product => product.tags.includes('product-image')).sort((a, b) => featuredOrder.get(a.id) - featuredOrder.get(b.id));
        const regular = sectionProducts.filter(product => !product.tags.includes('product-image'));
        sectionProducts = [...promotional, ...regular];
      }
      const anchor = discovery ? `${key}-${subcategory.id}` : subcategory.id;
      return `<section class="subcategory-section" id="${anchor}" aria-labelledby="heading-${anchor}"><div class="subcategory-heading"><h${discovery ? '3' : '2'} id="heading-${anchor}">${escapeHTML(subcategory.label)}<span>${sectionProducts.length} styles</span></h${discovery ? '3' : '2'}>${discovery ? `<a class="text-link" href="${config.page}#${subcategory.id}">Show all <span aria-hidden="true">↗</span></a>` : '<a class="back-to-top" href="#collection-top" aria-label="Back to collection navigation">↑ Back to top</a>'}</div>${sectionGrid(sectionProducts, discovery)}</section>`;
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
    const allProducts = await getProducts();
    const products = allProducts.filter(product => !category || product.category === category);
    if (!discovery) {
      const config = categoryConfig[category];
      createSlider(document.querySelector('#category-slider'), products.filter(product => product.tags.includes(config.tag)));
    } else {
      createSlider(document.querySelector('#category-slider'), shuffle(products.filter(product => product.tags.includes('product-image'))).slice(0, 8));
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
