import { auth, emailLogin, logout, authMessage } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDocsFromServer, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getProducts, overrideKey } from './common.js';
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
  const root=$('admin-inventory-list');
  try{
    const [products,masters,sku]=await Promise.all([getProducts({refresh:true}),getDocsFromServer(collection(db,'inventory')),getDocsFromServer(collection(db,'skuAvailability'))]);
    if(!authorized)return;
    const byId=new Map(masters.docs.map(d=>[d.id,d.data()]));
    const bySku=new Map(sku.docs.map(d=>[d.id,d.data()]));
    root.replaceChildren();
    if(!products.length){root.textContent='Publish the validated V5 catalogue to dev first. Legacy sample stock is not shown.';return;}
    function control(product,variant,size,label,parent){
      const form=document.createElement('form');
      form.className='admin-stock-form sku-control';
      const title=document.createElement('span');title.textContent=label;
      const select=document.createElement('select');select.setAttribute('aria-label',label);
      for(const value of ['AVAILABLE','COMING_SOON','SOLD_OUT']){
        const option=document.createElement('option');option.value=value;option.textContent=value==='AVAILABLE'?'Available (follow physical stock)':value.replace('_',' ');select.append(option);
      }
      const key=variant?overrideKey(product.id,variant.id,size):product.id;
      const record=variant?bySku.get(key):byId.get(key);
      select.value=record&&(!variant||record.colour===variant.name)?record.status:'AVAILABLE';
      if(!select.value)select.value='AVAILABLE';
      const save=document.createElement('button');save.className='button button-secondary';save.type='submit';save.textContent='Save';
      form.append(title,select,save);parent.append(form);
      form.addEventListener('submit',async e=>{
        e.preventDefault();
        if(!authorized||!auth.currentUser)return;
        save.disabled=true;
        try{
          const payload={productId:product.id,status:select.value,updatedAt:new Date().toISOString()};
          if(variant){
            await setDoc(doc(db,'skuAvailability',key),{...payload,variantId:variant.id,colour:variant.name,size});
          }else{
            await setDoc(doc(db,'inventory',product.id),{...payload,updatedBy:auth.currentUser.uid});
          }
          status('Saved '+label+'. The store uses the override on its next verified inventory read.');
          await renderInventory();
        }catch(error){status('Unable to save: '+authMessage(error));}
        finally{save.disabled=false;}
      });
    }
    for(const product of products){
      const panel=document.createElement('details');panel.className='sku-admin-product';
      const summary=document.createElement('summary');summary.textContent=product.name+' · '+product.physicalStock+' physical / '+product.stock+' available';panel.append(summary);
      control(product,null,'ALL','Entire product',panel);
      for(const v of product.colorVariants){
        const group=document.createElement('section');group.className='sku-admin-colour';
        const heading=document.createElement('h3');heading.textContent=v.name+' — '+v.physicalStock+' physical / '+v.stock+' available';group.append(heading);
        control(product,v,'ALL','Entire colour',group);
        for(const [size,q] of Object.entries(v.stockBySize))control(product,v,size,size+' · '+q+' physical / '+v.availableBySize[size]+' available',group);
        panel.append(group);
      }
      root.append(panel);
    }
  }catch(error){root.textContent='Inventory unavailable. Deploy the approved Firestore rules and refresh: '+authMessage(error);}
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