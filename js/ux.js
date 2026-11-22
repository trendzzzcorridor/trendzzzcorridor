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


// Scroll-reactive product photographs: gently swell at viewport centre and
// return to their original size when moving out of view. Only visible cards
// are measured; dynamic catalogue/filter updates are observed automatically.
function startProductCardScrollEffects() {
  if (!('IntersectionObserver' in window)) return;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observed = new Set();
  const visible = new Set();
  let updateFrame = 0;
  let scanFrame = 0;

  const resetCard = card => {
    card.style.removeProperty('--tc-card-zoom');
    card.style.removeProperty('--tc-badge-height');
  };
  const updateVisible = () => {
    updateFrame = 0;
    if (motionPreference.matches) {
      visible.forEach(resetCard);
      return;
    }
    const viewportCentre = window.innerHeight / 2;
    const mobile = window.innerWidth <= 700;
    for (const card of visible) {
      if (!card.isConnected) {
        visible.delete(card);
        continue;
      }
      const rect = card.getBoundingClientRect();
      const cardCentre = rect.top + rect.height / 2;
      const effectRange = Math.max(window.innerHeight * .54, rect.height * .85);
      const closeness = Math.max(0, 1 - Math.abs(cardCentre - viewportCentre) / effectRange);
      const smooth = closeness * closeness * (3 - 2 * closeness);
      card.style.setProperty('--tc-card-zoom', (1 + .055 * smooth).toFixed(4));
      const largeHeight = mobile ? 50 : 62;
      const compactHeight = mobile ? 37 : 44;
      card.style.setProperty('--tc-badge-height', Math.round(largeHeight - (largeHeight - compactHeight) * smooth) + 'px');
    }
  };
  const queueUpdate = () => {
    if (!updateFrame) updateFrame = requestAnimationFrame(updateVisible);
  };
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else {
        visible.delete(entry.target);
        resetCard(entry.target);
      }
    }
    queueUpdate();
  }, { rootMargin: '120px 0px 120px 0px' });
  const scanCards = () => {
    scanFrame = 0;
    for (const card of observed) {
      if (!card.isConnected) {
        visibility.unobserve(card);
        observed.delete(card);
        visible.delete(card);
      }
    }
    document.querySelectorAll('.product-card').forEach(card => {
      if (!observed.has(card)) {
        observed.add(card);
        visibility.observe(card);
      }
    });
    queueUpdate();
  };
  const queueScan = () => {
    if (!scanFrame) scanFrame = requestAnimationFrame(scanCards);
  };
  const root = document.querySelector('#main-content') || document.body;
  const catalogueObserver = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) queueScan();
  });
  catalogueObserver.observe(root, { childList: true, subtree: true });
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate, { passive: true });
  motionPreference.addEventListener?.('change', () => {
    if (motionPreference.matches) observed.forEach(resetCard);
    queueUpdate();
  });
  scanCards();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startProductCardScrollEffects, { once: true });
} else {
  startProductCardScrollEffects();
}
