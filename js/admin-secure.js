import { auth, emailLogin, logout, authMessage } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getProducts } from './common.js';
const db = getFirestore(auth.app);
const $ = id => document.getElementById(id);
const status = message => { $('admin-access-message').textContent = message; };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let authorized = false;
onAuthStateChanged(auth, async user => {
  authorized = false;
  $('admin-private').hidden = true;
  $('admin-signin').hidden = true;
  if (!user) { status('Please sign in with an approved administrator account.'); $('admin-signin').hidden = false; return; }
  try {
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true) {
      status('Access denied. This account has no administrator role. Contact the store owner.');
      $('admin-signin').hidden = false;
      return;
    }
    authorized = true;
    $('admin-private').hidden = false;
    status('Administrator verified: ' + (user.email || 'approved account'));
    await Promise.all([renderInventory(), renderCustomers()]);
  } catch (error) { status('Administrator verification failed: ' + authMessage(error)); }
});
$('admin-signin-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  status('Signing in…');
  try { await emailLogin(form.elements.email.value.trim(), form.elements.password.value); form.elements.password.value = ''; }
  catch (error) { status(authMessage(error)); }
});
$('admin-signout').addEventListener('click', () => logout());
async function renderInventory() {
  const root = $('admin-inventory-list');
  try {
    const [products, records] = await Promise.all([getProducts(), getDocs(collection(db, 'inventory'))]);
    if (!authorized) return;
    const byId = new Map(records.docs.map(d => [d.id, d.data()]));
    root.replaceChildren();
    for (const product of products) {
      const row = document.createElement('form');
      row.className = 'admin-stock-form';
      row.style.padding = '12px';
      row.style.borderBottom = '1px solid #ddd';
      const title = document.createElement('span');
      title.textContent = product.name + ' (' + product.id + ')';
      title.style.flex = '1';
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Availability for ' + product.name);
      for (const value of ['AVAILABLE','COMING_SOON','SOLD_OUT']) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value.replace('_', ' ');
        select.append(option);
      }
      select.value = byId.get(product.id)?.status || 'AVAILABLE';
      const save = document.createElement('button');
      save.className = 'button button-secondary'; save.type = 'submit'; save.textContent = 'Save';
      row.append(title, select, save);
      row.addEventListener('submit', async e => {
        e.preventDefault();
        if (!authorized || !auth.currentUser) return;
        save.disabled = true;
        try {
          await setDoc(doc(db,'inventory',product.id), { productId:product.id, status:select.value, updatedAt:new Date().toISOString(), updatedBy:auth.currentUser.uid });
          status('Saved availability for ' + product.id + '. Refresh the public catalogue to see the updated status.');
        } catch (error) { status('Unable to save: ' + authMessage(error)); }
        finally { save.disabled = false; }
      });
      root.append(row);
    }
  } catch (error) { root.textContent = 'Inventory unavailable: ' + authMessage(error); }
}
async function renderCustomers() {
  const root = $('admin-customers-list');
  try {
    const snapshot = await getDocs(collection(db,'customers'));
    if (!authorized) return;
    root.replaceChildren();
    if (snapshot.empty) { root.textContent = 'No customer profiles yet.'; return; }
    const table = document.createElement('table');
    table.className = 'admin-table';
    table.innerHTML = '<thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>';
    const tbody = document.createElement('tbody');
    snapshot.forEach(record => {
      const data = record.data();
      const tr = document.createElement('tr');
      for (const key of ['name','email','phone']) {
        const td = document.createElement('td');
        td.textContent = data[key] || '—';
        tr.append(td);
      }
      tbody.append(tr);
    });
    table.append(tbody);
    root.append(table);
  } catch (error) { root.textContent = 'Customer directory unavailable: ' + authMessage(error); }
}