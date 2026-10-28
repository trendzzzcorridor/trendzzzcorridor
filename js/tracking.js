import { escapeHTML } from './common.js';

/* ==================== DEMO TRACKING SERVICE START ==================== */
// Replace this function with an authenticated API request when an order backend exists.
async function findOrder(orderId, email) {
  if (orderId.toUpperCase() !== 'FORME1001' || email.toLowerCase() !== 'demo@example.com') return null;
  return {
    id: 'FORME1001',
    status: 'In transit',
    estimate: 'Sample shipment · delivery estimate available from a future carrier API',
    currentStep: 2,
    steps: [
      { title: 'Order confirmed', detail: 'Demo day 1 · We have received the sample order.' },
      { title: 'Packed & dispatched', detail: 'Demo day 2 · The parcel has left the studio.' },
      { title: 'In transit', detail: 'Demo day 3 · Moving through the delivery network.' },
      { title: 'Out for delivery', detail: 'Next step · Your parcel reaches the local delivery team.' },
      { title: 'Delivered', detail: 'Final step · Your new pieces arrive.' }
    ]
  };
}
/* ==================== DEMO TRACKING SERVICE END ==================== */

/* ==================== TRACKING INTERACTIONS START ==================== */
const form = document.querySelector('#tracking-form');
const result = document.querySelector('#tracking-result');
const message = document.querySelector('#tracking-message');
const requestedOrder = new URLSearchParams(location.search).get('order');
if (requestedOrder) form.elements.orderId.value = requestedOrder.slice(0, 80);

document.querySelector('#fill-demo').addEventListener('click', () => {
  form.elements.orderId.value = 'FORME1001';
  form.elements.email.value = 'demo@example.com';
  message.textContent = 'Demo details filled. Select Find my order to view the timeline.';
  form.querySelector('button[type="submit"]').focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const orderId = form.elements.orderId.value.trim();
  const email = form.elements.email.value.trim();
  if (!orderId) { message.textContent = 'Please enter an order ID.'; form.elements.orderId.focus(); return; }
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  result.setAttribute('aria-busy', 'true');
  message.textContent = 'Looking up the demo order…';
  try {
    const order = await findOrder(orderId, email);
    if (!order) {
      result.innerHTML = '<div class="tracking-empty"><p class="eyebrow">NO MATCH FOUND</p><h2>Let’s check those details.</h2><p>No demo order matches that order ID and email. Try FORME1001 with demo@example.com.</p></div>';
      message.textContent = 'No matching demo order. Check both fields and try again.';
      return;
    }
    result.innerHTML = `<div class="tracking-result-heading"><div><p class="eyebrow">DEMO ORDER ${escapeHTML(order.id)}</p><h2>On its way to you.</h2></div><span class="tracking-status-badge">${escapeHTML(order.status)}</span></div><p class="tracking-estimate">${escapeHTML(order.estimate)}</p><ol class="tracking-timeline">${order.steps.map((step, index) => `<li class="${index < order.currentStep ? 'is-complete' : index === order.currentStep ? 'is-current' : 'is-pending'}" ${index === order.currentStep ? 'aria-current="step"' : ''}><h3>${escapeHTML(step.title)}${index < order.currentStep ? '<span class="sr-only"> — complete</span>' : ''}</h3><p>${escapeHTML(step.detail)}</p></li>`).join('')}</ol>`;
    message.textContent = 'Demo order found. Current status: in transit.';
  } catch {
    message.textContent = 'Tracking could not load. Please try again.';
    result.innerHTML = '<div class="empty-state"><h2>Tracking unavailable</h2><p>Please try the lookup again.</p></div>';
  } finally {
    submit.disabled = false;
    result.removeAttribute('aria-busy');
  }
});
/* ==================== TRACKING INTERACTIONS END ==================== */
