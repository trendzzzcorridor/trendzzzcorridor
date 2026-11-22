// Optional, accessible storefront page navigation motion.
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let leaving = false;
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || leaving) return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a.button,a.text-link,.collection-strip a,.catalogue-tile,a.cart-primary,a.pd-primary,a.account-text-link,.collection-quick-nav a,.about-categories a');
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
  const destination = new URL(link.href, location.href);
  if (!['http:', 'https:'].includes(destination.protocol) || destination.origin !== location.origin) return;
  if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
  if (reducedMotion()) return;
  event.preventDefault();
  leaving = true;
  link.classList.add('is-driving-off');
  document.body.classList.add('is-page-leaving');
  window.setTimeout(() => location.assign(destination.href), 215);
});
window.addEventListener('pageshow', () => {
  leaving = false;
  document.body.classList.remove('is-page-leaving');
  document.querySelectorAll('.is-driving-off').forEach(element => element.classList.remove('is-driving-off'));
});
