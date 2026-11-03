import { auth, googleLogin, emailLogin, emailRegister, logout, loadProfile, saveProfile, authMessage } from './firebase.js';
import { onAuthStateChanged, sendEmailVerification, reload } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const feedback = document.querySelector('#account-feedback');
const profileForm = document.querySelector('#profile-form');
const tabs = [...document.querySelectorAll('[data-account-tab]')];
const params = new URLSearchParams(location.search);
const returnTo = params.get('return');
const safeReturn = returnTo && !returnTo.startsWith('/') && !returnTo.includes('://') && /^[a-z0-9._?=&%-]+$/i.test(returnTo) ? returnTo : 'product.html';
let activeUser = null;
let customerProfile = null;
function say(message, error = false) { feedback.textContent = message; feedback.dataset.error = String(error); }
function selectTab(index) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(index));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    selectTab(next); tabs[next].focus();
  });
});
if (params.get('mode') === 'register') selectTab(1);
async function renderUser(user) {
  activeUser = user;
  customerProfile = null;
  const authenticated = Boolean(user);
  document.querySelector('#account-auth').hidden = authenticated;
  document.querySelector('#account-profile').hidden = !authenticated;
  if (!authenticated) return;
  profileForm.elements.email.value = user.email || '';
  profileForm.elements.name.value = user.displayName || '';
  profileForm.elements.phone.value = '';
  document.querySelector('#profile-greeting').textContent = 'Complete your profile';
  try {
    customerProfile = await loadProfile(user);
    if (auth.currentUser?.uid !== user.uid) return;
    profileForm.elements.name.value = customerProfile?.name || user.displayName || '';
    profileForm.elements.phone.value = customerProfile?.phone || '';
    document.querySelector('#profile-greeting').textContent = customerProfile?.name ? 'Hello, ' + customerProfile.name.split(' ')[0] + '.' : 'Complete your profile';
    const requiresVerify = user.providerData.some(p => p.providerId === 'password') && !user.emailVerified;
    const note = document.querySelector('#account-verification');
    note.hidden = !requiresVerify;
    note.textContent = 'Please verify your email address before checkout. Check your inbox, then refresh this page.';
    document.querySelector('#send-verification').hidden = !requiresVerify;
    if (params.has('complete') || !customerProfile?.phone) say('Please enter your full name and mobile number to finish setting up your account.');
    else if (requiresVerify) say('Your profile is saved. Please verify your email before shopping.');
    else if (returnTo) location.replace(safeReturn);
    else say('Your account is ready.');
  } catch (error) { say(authMessage(error), true); }
}
onAuthStateChanged(auth, renderUser);
async function run(task) {
  say('Please wait…');
  try { await task(); } catch (error) { say(authMessage(error), true); }
}
document.querySelector('#google-login').addEventListener('click', () => run(async () => { await googleLogin(); }));
document.querySelector('#login-form').addEventListener('submit', event => {
  event.preventDefault(); const form=event.currentTarget;
  if (!form.reportValidity()) return;
  run(async () => { await emailLogin(form.elements.email.value.trim(), form.elements.password.value); form.reset(); });
});
document.querySelector('#register-form').addEventListener('submit', event => {
  event.preventDefault(); const form=event.currentTarget;
  if (!form.reportValidity()) return;
  run(async () => { await emailRegister(form.elements.name.value.trim(), form.elements.email.value.trim(), form.elements.password.value); form.reset(); });
});
profileForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!profileForm.reportValidity() || !activeUser) return;
  run(async () => {
    await saveProfile(activeUser, profileForm.elements.name.value, profileForm.elements.phone.value);
    customerProfile = await loadProfile(activeUser);
    if (activeUser.providerData.some(p => p.providerId === 'password') && !activeUser.emailVerified) say('Profile saved. Verify your email before continuing.');
    else if (returnTo) location.assign(safeReturn);
    else say('Profile saved successfully.');
  });
});
document.querySelector('#send-verification').addEventListener('click', () => run(async () => {
  if (!auth.currentUser) return;
  await reload(auth.currentUser);
  if (auth.currentUser.emailVerified) { await renderUser(auth.currentUser); return; }
  await sendEmailVerification(auth.currentUser);
  say('Verification email sent. Please check your inbox.');
}));
document.querySelector('#sign-out').addEventListener('click', () => run(async () => { await logout(); say('Signed out.'); }));
