import { readStorage, writeStorage } from './common.js';

/* ==================== LOCAL PROFILE STORAGE START ==================== */
const PROFILE_KEY = 'forme-demo-profile-v1';
const SESSION_KEY = 'forme-demo-session-v1';
const feedback = document.querySelector('#account-feedback');
const profileForm = document.querySelector('#profile-form');
let profile = readStorage(PROFILE_KEY, null);
if (!profile || typeof profile.name !== 'string' || typeof profile.email !== 'string') profile = null;

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.dataset.error = String(isError);
}

function displayProfile() {
  const isOpen = Boolean(profile && readStorage(SESSION_KEY, false) === true);
  document.querySelector('#account-auth').hidden = isOpen;
  document.querySelector('#account-profile').hidden = !isOpen;
  if (!isOpen) return;
  document.querySelector('#profile-greeting').textContent = `Hello, ${profile.name.split(' ')[0]}.`;
  profileForm.elements.name.value = profile.name;
  profileForm.elements.email.value = profile.email;
  profileForm.elements.phone.value = profile.phone || '';
}

function openProfile(nextProfile, form) {
  profile = nextProfile;
  const profileSaved = writeStorage(PROFILE_KEY, profile);
  const sessionSaved = writeStorage(SESSION_KEY, true);
  // Passwords never leave the form and are cleared immediately.
  form.reset();
  displayProfile();
  setFeedback(profileSaved && sessionSaved ? 'Your local demo profile is open. This is not an authenticated session.' : 'Your demo profile is open for this page only. Browser storage is unavailable, so it cannot be kept after navigation.', !(profileSaved && sessionSaved));
}
/* ==================== LOCAL PROFILE STORAGE END ==================== */

/* ==================== ACCOUNT TABS AND FORMS START ==================== */
const tabs = [...document.querySelectorAll('[data-account-tab]')];
function selectTab(tab) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  setFeedback('');
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next]);
    tabs[next].focus();
  });
});

document.querySelector('#login-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const email = form.elements.email.value.trim().toLowerCase();
  const existing = profile?.email.toLowerCase() === email ? profile : { name: 'Demo visitor', email, phone: '' };
  openProfile(existing, form);
});

document.querySelector('#register-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  if (!form.reportValidity()) return;
  if (name.length < 2) { setFeedback('Please enter a name with at least two non-space characters.', true); return; }
  openProfile({ name, email: form.elements.email.value.trim().toLowerCase(), phone: '' }, form);
});

profileForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!profileForm.reportValidity()) return;
  const name = profileForm.elements.name.value.trim();
  if (name.length < 2) { setFeedback('Please enter a name with at least two non-space characters.', true); return; }
  profile = { name, email: profileForm.elements.email.value.trim().toLowerCase(), phone: profileForm.elements.phone.value.trim() };
  const saved = writeStorage(PROFILE_KEY, profile);
  displayProfile();
  setFeedback(saved ? 'Local profile updated on this browser.' : 'Profile updated for this page only. Browser storage is unavailable.', !saved);
});

document.querySelector('#sign-out').addEventListener('click', () => {
  writeStorage(SESSION_KEY, false);
  displayProfile();
  setFeedback('Signed out of the demo profile.');
  document.querySelector('#login-tab').focus();
});

document.querySelector('#clear-profile').addEventListener('click', () => {
  profile = null;
  writeStorage(PROFILE_KEY, null);
  writeStorage(SESSION_KEY, false);
  displayProfile();
  setFeedback('Your local demo profile has been deleted.');
  document.querySelector('#login-tab').focus();
});
displayProfile();
/* ==================== ACCOUNT TABS AND FORMS END ==================== */
