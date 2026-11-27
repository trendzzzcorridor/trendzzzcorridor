import './ux.js';
import { requireCustomer } from './auth-gate.js';
import { getCart, CART_KEY, escapeHTML, getProducts, getDisplaySettings, categoryConfig } from './common.js';

// ==================== SHARED HEADER AND FOOTER LOADING START ====================
async function loadHeader() {
  const container = document.querySelector('#site-header');
  if (!container) return;
  try {
    const response = await fetch('header.html');
    if (!response.ok) throw new Error('Header unavailable');
    container.innerHTML = await response.text();
    // Keep navigation usable while inventory is loading; only show categories with published V5 products.
    applyCategoryNavigation(container,[],{SHOW_EMPTY_CATEGORIES:'HIDDEN'});
    setupSidebar();
    try { const [products,settings]=await Promise.all([getProducts(),getDisplaySettings()]); applyCategoryNavigation(container,products,settings); } catch(error) { console.warn('Category navigation unavailable',error); }
    updateCartBadge();
    container.querySelector('.cart-icon')?.addEventListener('click', async event => { event.preventDefault(); await requireCustomer(() => { location.href = 'cart.html'; }); });
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    container.querySelectorAll('.desktop-navigation a').forEach(link => {
      if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });
  } catch {
    container.innerHTML = '<nav class="header-main" aria-label="Basic navigation"><a href="product.html">Catalogue</a><a class="brand-name" href="index.html">Trendzzz Corridor</a><a href="cart.html">Bag</a></nav><p class="notice">The full menu could not load. Please run this site through its local server and refresh.</p>';
  }
}
function applyCategoryNavigation(container,products,settings) {
  const active=Object.entries(categoryConfig).filter(([key])=>products.some(p=>p.category===key));
  const pending=Object.entries(categoryConfig).filter(([key])=>!products.some(p=>p.category===key));
  const nav=container.querySelector('.desktop-navigation');
  if(nav)nav.innerHTML='<a href="product.html?new=1">New arrivals <span class="new-dot" aria-hidden="true"></span></a>'+active.map(([,c])=>'<a href="'+c.page+'">'+escapeHTML(c.label)+'</a>').join('')+'<a href="product.html">The catalogue</a>';
  const sidebar=container.querySelector('#sidebar-collections');
  if(sidebar)sidebar.innerHTML=active.map(([key,c])=>'<div class="sidebar-category"><a href="'+c.page+'">'+escapeHTML(c.label)+'</a><div>'+c.subcategories.filter(sub=>products.some(p=>p.category===key&&p.subcategory===sub.id)).map(sub=>'<a href="'+c.page+'#'+sub.id+'">'+escapeHTML(sub.label)+'</a>').join('')+'</div></div>').join('')+(settings.SHOW_EMPTY_CATEGORIES==='COMING_SOON'?pending.map(([,c])=>'<div class="sidebar-category"><a href="'+c.page+'">'+escapeHTML(c.label)+' — Coming soon</a></div>').join(''):'');
  const footer=document.querySelector('[aria-label="Footer collections"]');
  if(footer)footer.innerHTML=active.map(([,c])=>'<a href="'+c.page+'">'+escapeHTML(c.label)+'</a>').join('')+(settings.SHOW_EMPTY_CATEGORIES==='COMING_SOON'?pending.map(([,c])=>'<a href="'+c.page+'">'+escapeHTML(c.label)+' — Coming soon</a>').join(''):'');
}
function loadFooter() {
  const container = document.querySelector('#site-footer');
  if (!container) return;
  container.innerHTML = `<footer class="site-footer"><div class="footer-top"><div><a class="footer-brand" href="index.html">Trendzzz Corridor</a><p class="footer-tagline">An everyday state of mind.</p><p class="footer-demo">Everyday clothing with your own point of view.</p></div><div><h2 class="footer-heading">The collection</h2><nav class="footer-links" aria-label="Footer collections"><a href="tshirt.html">T-Shirts</a><a href="bottom-wear.html">Bottom Wear</a><a href="shirts.html">Shirts</a><a href="winter-wear.html">Winter Wear</a></nav></div><div><h2 class="footer-heading">Here to help</h2><nav class="footer-links" aria-label="Footer help"><a href="tracking.html">Track your order</a><a href="my-account.html">My account</a><a href="cart.html">Shopping bag</a><a href="privacy-policy.html">Privacy policy</a></nav></div><div><h2 class="footer-heading">The world of Trendzzz Corridor</h2><nav class="footer-links" aria-label="Footer brand"><a href="about-us.html">Our story</a><a href="product.html">Explore the catalogue</a><a href="admin-dashboard.html">Admin dashboard</a></nav></div></div><div class="footer-bottom"><span>© ${escapeHTML(new Date().getFullYear())} Trendzzz Corridor · Clothing collection</span><span>India / INR ₹ </span></div></footer>`;
}
// ==================== SHARED HEADER AND FOOTER LOADING END ====================

// ==================== ACCESSIBLE SIDEBAR START ====================
function setupSidebar() {
  const toggle = document.querySelector('#menu-toggle');
  const close = document.querySelector('#menu-close');
  const sidebar = document.querySelector('#catalogue-sidebar');
  const backdrop = document.querySelector('#sidebar-backdrop');
  let closeTimeout;
  let previousFocus;
  const pageSiblings = [...document.body.children].filter(element => element.id !== 'site-header' && !['SCRIPT', 'STYLE'].includes(element.tagName));
  const headerSurfaces = [...document.querySelector('#site-header').children].filter(element => element !== sidebar && element !== backdrop);
  const inertStates = new Map();

  function setOpen(open) {
    clearTimeout(closeTimeout);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('scroll-locked', open);
    if (open) {
      previousFocus = document.activeElement;
      sidebar.hidden = false; sidebar.inert = false; backdrop.hidden = false;
      [...pageSiblings, ...headerSurfaces].forEach(element => { inertStates.set(element, element.inert); element.inert = true; });
      requestAnimationFrame(() => { sidebar.classList.add('is-open'); backdrop.classList.add('is-open'); close.focus(); });
    } else {
      sidebar.classList.remove('is-open'); backdrop.classList.remove('is-open'); sidebar.inert = true;
      inertStates.forEach((value, element) => { element.inert = value; }); inertStates.clear();
      (previousFocus || toggle).focus();
      closeTimeout = setTimeout(() => { sidebar.hidden = true; backdrop.hidden = true; }, 300);
    }
  }
  toggle.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key !== 'Tab') return;
    const focusable = [...sidebar.querySelectorAll('a[href],button:not(:disabled)')];
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}
function updateCartBadge() {
  const badge = document.querySelector('#cart-count');
  if (!badge) return;
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  badge.textContent = count > 99 ? '99+' : String(count);
  badge.hidden = count === 0;
  badge.closest('a').setAttribute('aria-label', `Shopping bag, ${count} item${count === 1 ? '' : 's'}`);
}
window.addEventListener('cart-updated', updateCartBadge);
window.addEventListener('storage', event => { if (event.key === CART_KEY || event.key === null) updateCartBadge(); });
loadFooter();
loadHeader();
// ==================== ACCESSIBLE SIDEBAR END ====================
