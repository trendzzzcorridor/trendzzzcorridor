import { escapeHTML, formatPrice, productURL, imageURL, setupImages, shuffle } from './common.js';

// ==================== REUSABLE PRODUCT SLIDER START ====================
// The caller filters by tag/category BEFORE passing products into this slider.
export function createSlider(container, products, { home = false } = {}) {
  if (!products.length) {
    container.innerHTML = '<div class="slider-empty"><p class="eyebrow">The next edit is on its way</p><h2>Good things take shape.</h2><a class="text-link" href="product.html">Explore the collection <span>↗</span></a></div>';
    return;
  }
  const slides = shuffle(products);
  let index = 0;
  let timer;
  let manuallyPaused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hoverPaused = false;
  let focusPaused = false;
  container.setAttribute('aria-roledescription', 'carousel');
  container.setAttribute('aria-label', home ? 'The everyday edit' : 'Featured collection');
  container.innerHTML = `<div class="slider-images">${slides.map((product, slideIndex) => `<a class="slider-image-link ${slideIndex === 0 ? 'active' : ''}" data-slide="${slideIndex}" href="${productURL(product)}" aria-label="Discover ${escapeHTML(product.name)}" tabindex="${slideIndex === 0 ? '0' : '-1'}" aria-hidden="${slideIndex !== 0}"><img src="${escapeHTML(imageURL(product.campaignImage || product.image))}" alt="${escapeHTML(product.name)}" ${slideIndex === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="1100" height="1000"></a>`).join('')}</div><div class="slider-product-caption"><span id="${container.id}-product-name"></span><span id="${container.id}-product-price"></span></div><div class="slider-controls"><span class="slider-number" aria-hidden="true">01 / ${String(slides.length).padStart(2, '0')}</span><div class="slider-dots">${slides.map((product, slideIndex) => `<button type="button" class="slider-dot ${slideIndex === 0 ? 'active' : ''}" aria-label="Show slide ${slideIndex + 1}: ${escapeHTML(product.name)}" aria-pressed="${slideIndex === 0}" data-go="${slideIndex}"></button>`).join('')}</div><div class="slider-arrows"><button type="button" data-previous aria-label="Previous slide">←</button><button type="button" data-pause aria-label="${manuallyPaused ? 'Play' : 'Pause'} slideshow">${manuallyPaused ? '▷' : 'Ⅱ'}</button><button type="button" data-next aria-label="Next slide">→</button></div></div><span class="sr-only slider-announcement" aria-live="polite"></span>`;
  const pauseButton = container.querySelector('[data-pause]');
  function showSlide(nextIndex, announce = false) {
    index = (nextIndex + slides.length) % slides.length;
    container.querySelectorAll('[data-slide]').forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.classList.toggle('active', active); slide.setAttribute('aria-hidden', String(!active)); slide.tabIndex = active ? 0 : -1;
      if (active) slide.querySelector('img').loading = 'eager';
    });
    container.querySelectorAll('[data-go]').forEach((dot, slideIndex) => { dot.classList.toggle('active', slideIndex === index); dot.setAttribute('aria-pressed', String(slideIndex === index)); });
    container.querySelector('.slider-number').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    container.querySelector(`#${container.id}-product-name`).textContent = slides[index].name;
    container.querySelector(`#${container.id}-product-price`).textContent = formatPrice(slides[index].price);
    const heroLink = document.querySelector('[data-hero-product-link]');
    if (home && heroLink) heroLink.href = productURL(slides[index]);
    if (announce) container.querySelector('.slider-announcement').textContent = `Slide ${index + 1} of ${slides.length}: ${slides[index].name}`;
  }
  function schedule() {
    clearInterval(timer);
    if (!manuallyPaused && !hoverPaused && !focusPaused && !document.hidden && slides.length > 1) timer = setInterval(() => showSlide(index + 1), 6000);
  }
  container.querySelector('[data-next]').addEventListener('click', () => { showSlide(index + 1, true); schedule(); });
  container.querySelector('[data-previous]').addEventListener('click', () => { showSlide(index - 1, true); schedule(); });
  container.querySelectorAll('[data-go]').forEach(dot => dot.addEventListener('click', () => { showSlide(Number(dot.dataset.go), true); schedule(); }));
  pauseButton.addEventListener('click', () => { manuallyPaused = !manuallyPaused; pauseButton.textContent = manuallyPaused ? '▷' : 'Ⅱ'; pauseButton.setAttribute('aria-label', `${manuallyPaused ? 'Play' : 'Pause'} slideshow`); schedule(); });
  container.addEventListener('mouseenter', () => { hoverPaused = true; schedule(); });
  container.addEventListener('mouseleave', () => { hoverPaused = false; schedule(); });
  container.addEventListener('focusin', () => { focusPaused = true; schedule(); });
  container.addEventListener('focusout', event => { if (!container.contains(event.relatedTarget)) { focusPaused = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);
  let touchStart;
  container.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].screenX; }, { passive: true });
  container.addEventListener('touchend', event => { const distance = event.changedTouches[0].screenX - touchStart; if (Math.abs(distance) > 60) { showSlide(index + (distance < 0 ? 1 : -1), true); schedule(); } }, { passive: true });
  setupImages(container); showSlide(0); schedule();
}
// ==================== REUSABLE PRODUCT SLIDER END ====================
