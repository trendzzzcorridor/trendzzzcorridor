import { auth, emailLogin, logout, authMessage } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDocsFromServer, setDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getProducts, overrideKey } from './common.js';
import { validRemainingQuantity, remainingRecordMatches } from './inventory.js';
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
    const [products,masters,sku,quantities]=await Promise.all([getProducts({refresh:true}),getDocsFromServer(collection(db,'inventory')),getDocsFromServer(collection(db,'skuAvailability')),getDocsFromServer(collection(db,'skuRemaining'))]);
    if(!authorized)return;
    const byId=new Map(masters.docs.map(d=>[d.id,d.data()]));
    const bySku=new Map(sku.docs.map(d=>[d.id,d.data()]));
    const byRemaining=new Map(quantities.docs.map(d=>[d.id,d.data()]));
    if(products.some(p=>!p.inventoryVerified))throw Error('Inventory verification failed; no changes can be made.');
    const openPanels=new Set([...root.querySelectorAll('details[open][data-product-id]')].map(p=>p.dataset.productId));
    root.replaceChildren();
    if(!products.length){root.textContent='Publish the validated V5 catalogue to dev first. Legacy sample stock is not shown.';return;}
    function control(product,variant,size,label,parent){
      const form=document.createElement('form');
      form.className='admin-stock-form sku-control';
      const title=document.createElement('span');title.textContent=label;
      const select=document.createElement('select');select.setAttribute('aria-label',label);
      for(const value of ['AVAILABLE','COMING_SOON','SOLD_OUT']){
        const option=document.createElement('option');option.value=value;option.textContent=value==='AVAILABLE'?'Available (follow remaining stock)':value.replace('_',' ');select.append(option);
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
    // Quantities and manual availability are intentionally separate. A colour
    // total must equal the actual size allocations, never an arbitrary cap.
    function quantityEditor(product,variant,parent){
      const form=document.createElement('form');form.className='sku-quantity-editor';
      const heading=document.createElement('h4');heading.textContent='Remaining stock by size';form.append(heading);
      const instruction=document.createElement('p');instruction.className='admin-muted';instruction.textContent='Enter the remaining physical pieces after sales, not the number sold. Save quantities before editing status. You can enter a colour total, but its size quantities must add up to that total.';form.append(instruction);
      const fields=[];
      for(const [size,physical] of Object.entries(variant.stockBySize)){
        const key=overrideKey(product.id,variant.id,size);
        const saved=byRemaining.get(key);
        const needsReview=byRemaining.has(key)&&!remainingRecordMatches(saved,product,variant,size);
        const initial=needsReview?0:Math.min(physical,saved?.remainingQuantity??physical);
        const label=document.createElement('label');label.className='sku-quantity-field';
        const text=document.createElement('span');text.textContent=size+' (max '+physical+')'+(needsReview?' — review old record':'');
        const input=document.createElement('input');input.type='number';input.min='0';input.max=String(physical);input.step='1';input.inputMode='numeric';input.required=true;input.value=String(initial);
        label.append(text,input);form.append(label);fields.push({size,physical,key,saved,initial,input,needsReview});
      }
      const totalLabel=document.createElement('label');totalLabel.className='sku-quantity-field sku-quantity-total';
      const totalText=document.createElement('span');totalText.textContent='Remaining colour total (max '+variant.physicalStock+')';
      const totalInput=document.createElement('input');totalInput.type='number';totalInput.min='0';totalInput.max=String(variant.physicalStock);totalInput.step='1';totalInput.required=true;totalInput.inputMode='numeric';
      totalInput.value=String(fields.reduce((n,f)=>n+f.initial,0));totalLabel.append(totalText,totalInput);form.append(totalLabel);
      const message=document.createElement('p');message.className='sku-quantity-feedback';message.setAttribute('role','status');
      const save=document.createElement('button');save.type='submit';save.className='button';save.textContent='Save remaining quantities';
      form.append(message,save);parent.append(form);
      let targetEdited=false,saving=false;
      const validate=()=>{
        const counts=fields.map(f=>f.input.value===''?NaN:Number(f.input.value));
        const valid=fields.every((f,i)=>validRemainingQuantity(counts[i],f.physical));
        const sum=counts.reduce((a,b)=>a+b,0);
        if(!targetEdited&&valid)totalInput.value=String(sum);
        const target=totalInput.value===''?NaN:Number(totalInput.value);
        const totalValid=validRemainingQuantity(target,variant.physicalStock);
        const matching=valid&&totalValid&&sum===target;
        message.textContent=!valid?'Each size must be a whole number from zero to its physical maximum.':!totalValid?'Total must be a whole number between zero and '+variant.physicalStock+'.':!matching?'Size quantities add up to '+sum+'. Adjust them to match your target of '+target+'.':'Size quantities add up to '+sum+' remaining pieces.';
        const dirty=fields.some((f,i)=>f.needsReview||counts[i]!==f.initial);
        save.disabled=saving||!matching||!dirty;
        return matching?counts:null;
      };
      for(const f of fields)f.input.addEventListener('input',validate);
      totalInput.addEventListener('input',()=>{targetEdited=true;validate();});
      validate();
      form.addEventListener('submit',async event=>{
        event.preventDefault();
        if(saving||!authorized||!auth.currentUser)return;
        const counts=validate();if(!counts||!form.reportValidity())return;
        const edits=fields.map((f,i)=>({...f,remaining:counts[i]})).filter(f=>f.needsReview||f.remaining!==f.initial);
        if(!edits.length)return;
        saving=true;validate();
        try{
          // Re-read the latest published ceiling and identity before writing.
          const latest=(await getProducts({refresh:true})).find(p=>p.id===product.id);
          const fresh=latest?.colorVariants.find(v=>v.id===variant.id&&v.name===variant.name);
          if(!latest?.inventoryVerified||!fresh||Object.keys(fresh.stockBySize).length!==fields.length||fields.some(f=>fresh.stockBySize[f.size]!==f.physical))throw Error('The published stock or colour has changed. Refresh the dashboard before editing.');
          await runTransaction(db,async transaction=>{
            const refs=fields.map(f=>doc(db,'skuRemaining',f.key));
            const snapshots=await Promise.all(refs.map(ref=>transaction.get(ref)));
            // Check every size in this colour, not only the edited ones, so
            // a concurrent sale cannot silently invalidate the target total.
            for(let i=0;i<fields.length;i++){
              const f=fields[i],snapshot=snapshots[i],current=snapshot.exists()?snapshot.data():undefined;
              const signature=r=>r?JSON.stringify([r.productId,r.variantId,r.colour,r.size,r.remainingQuantity,r.physicalCeiling,r.updatedAt]):'';
              if(signature(current)!==signature(f.saved))throw Error('Stock changed in another session. Refresh the dashboard and try again.');
            }
            const updatedAt=new Date().toISOString();
            for(const f of edits){
              if(!validRemainingQuantity(f.remaining,f.physical))throw Error('Quantity exceeds the physical stock limit.');
              transaction.set(doc(db,'skuRemaining',f.key),{productId:product.id,variantId:variant.id,colour:variant.name,size:f.size,remainingQuantity:f.remaining,physicalCeiling:f.physical,updatedAt});
            }
          });
          status('Saved remaining stock for '+product.name+' / '+variant.name+'. Customers see it on the next verified inventory read.');
          await renderInventory();
        }catch(error){message.textContent='Unable to save: '+authMessage(error);status(message.textContent);}
        finally{saving=false;save.disabled=false;}
      });
    }
    for(const product of products){
      const panel=document.createElement('details');panel.className='sku-admin-product';panel.dataset.productId=product.id;panel.open=openPanels.has(product.id);
      const summary=document.createElement('summary');summary.textContent=product.name+' · '+product.physicalStock+' physical / '+product.remainingStock+' remaining / '+product.stock+' available';panel.append(summary);
      control(product,null,'ALL','Entire product',panel);
      for(const v of product.colorVariants){
        const group=document.createElement('section');group.className='sku-admin-colour';
        const heading=document.createElement('h3');heading.textContent=v.name+' — '+v.physicalStock+' physical / '+v.remainingStock+' remaining / '+v.stock+' available';group.append(heading);
        quantityEditor(product,v,group);
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