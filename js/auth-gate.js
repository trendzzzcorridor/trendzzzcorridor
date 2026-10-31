import { waitForAuth, loadProfile } from './firebase.js';

export async function requireCustomer(next) {
  try {
    const user = await waitForAuth();
    if (!user) { showLoginGate(); return false; }
    const profile = await loadProfile(user);
    if (!profile?.name || !profile?.phone) {
      window.location.href = 'my-account.html?complete=1&return=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
      return false;
    }
    if (user.providerData.some(provider => provider.providerId === 'password') && !user.emailVerified) {
      window.location.href = 'my-account.html?verify=1&return=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
      return false;
    }
    if (next) next();
    return true;
  } catch (error) {
    console.error('Customer access check failed:', error);
    window.alert('We could not verify your account. Please try again.');
    return false;
  }
}

function showLoginGate() {
  let dialog = document.querySelector('#customer-login-gate');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'customer-login-gate';
    dialog.className = 'customer-login-gate';
    dialog.innerHTML = `<div class="customer-gate-content"><button type="button" class="customer-gate-close" aria-label="Close">×</button><p class="eyebrow">TRENDZZZ CORRIDOR</p><h2>Login to proceed</h2><p>You can browse freely. To add items to your bag or continue to checkout, please log in or create your account.</p><div class="customer-gate-actions"><a class="button" id="customer-gate-login" href="my-account.html?mode=login">Login</a><a class="button button-secondary" id="customer-gate-register" href="my-account.html?mode=register">Register</a></div></div>`;
    document.body.append(dialog);
    dialog.querySelector('.customer-gate-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }
  const returnTo = location.pathname.split('/').pop() + location.search;
  for (const mode of ['login', 'register']) {
    dialog.querySelector('#customer-gate-' + mode).href = 'my-account.html?mode=' + mode + '&return=' + encodeURIComponent(returnTo);
  }
  if (!dialog.open) dialog.showModal();
}
