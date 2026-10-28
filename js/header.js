import { getCart, CART_KEY, escapeHTML } from './common.js';

// ==================== SHARED HEADER AND FOOTER LOADING START ====================
async function loadHeader() {
  const container = document.querySelector('#site-header');
  if (!container) return;
  try {
    const response = await fetch('header.html');
    if (!response.ok) throw new Error('Header unavailable');
    container.innerHTML = await response.text();
    setupSidebar();
    updateCartBadge();
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    container.querySelectorAll('.desktop-navigation a').forEach(link => {
      if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });
  } catch {
    container.innerHTML = '<nav class="header-main" aria-label="Basic navigation"><a href="product.html">Catalogue</a><a class="brand-name" href="index.html">FORME</a><a href="cart.html">Bag</a></nav><p class="notice">The full menu could not load. Please run this site through its local server and refresh.</p>';
  }
}
function loadFooter() {
  const container = document.querySelector('#site-footer');
  if (!container) return;
  container.innerHTML = `<footer class="site-footer"><div class="footer-top"><div><a class="footer-brand" href="index.html">FORME</a><p class="footer-tagline">An everyday state of mind.</p><p class="footer-demo">A sample clothing collection. Find your fit, make it yours.</p></div><div><h2 class="footer-heading">The collection</h2><nav class="footer-links" aria-label="Footer collections"><a href="tshirt.html">T-Shirts</a><a href="bottom-wear.html">Bottom Wear</a><a href="shirts.html">Shirts</a><a href="winter-wear.html">Winter Wear</a></nav></div><div><h2 class="footer-heading">Here to help</h2><nav class="footer-links" aria-label="Footer help"><a href="tracking.html">Track your order</a><a href="my-account.html">My account</a><a href="cart.html">Shopping bag</a><a href="privacy-policy.html">Privacy policy</a></nav></div><div><h2 class="footer-heading">The world of Forme</h2><nav class="footer-links" aria-label="Footer brand"><a href="about-us.html">Our story</a><a href="product.html">Explore the catalogue</a><a href="admin-dashboard.html">Demo dashboard</a></nav></div></div><div class="footer-bottom"><span>© ${escapeHTML(new Date().getFullYear())} FORME · Sample storefront</span><span>India / INR ₹ <span aria-hidden="true">&nbsp;&nbsp;↗</span></span></div></footer>`;
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
  sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
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
