import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInventoryProduct,overrideKey,skuQuantity,availabilityFor,displayProducts,skuLineKey,validRemainingQuantity} from '../js/inventory.js';
const sample={"id":"tshirt1","inventorySchemaVersion":1,"sizes":["M","L","XL"],"colorVariants":[{"id":"colour-1","name":"RED","stockBySize":{"M":2,"L":0,"XL":3}},{"id":"colour-2","name":"BLACK","stockBySize":{"M":4,"L":1}}]};
const record=(variantId,colour,size,status)=>({productId:'tshirt1',variantId,colour,size,status});
test('size-level override does not affect sibling sizes or colours',()=>{
 const m=new Map([[overrideKey('tshirt1','colour-1','M'),record('colour-1','RED','M','SOLD_OUT')]]);
 const p=normalizeInventoryProduct(sample,'AVAILABLE',m,true);
 assert.equal(p.stock,8);assert.equal(skuQuantity(p,'colour-1','M'),0);assert.equal(skuQuantity(p,'colour-1','XL'),3);assert.equal(skuQuantity(p,'colour-2','M'),4);
});
test('parent overrides win and zero stock cannot be restored by AVAILABLE',()=>{
 const m=new Map([[overrideKey('tshirt1','colour-1','ALL'),record('colour-1','RED','ALL','COMING_SOON')],[overrideKey('tshirt1','colour-1','M'),record('colour-1','RED','M','AVAILABLE')]]);
 const p=normalizeInventoryProduct(sample,'AVAILABLE',m,true);
 assert.equal(p.colorVariants[0].availability,'COMING_SOON');assert.equal(p.stock,5);
 assert.equal(normalizeInventoryProduct(sample,'SOLD_OUT',m,true).stock,0);
 assert.equal(availabilityFor(normalizeInventoryProduct(sample,'AVAILABLE',new Map(),true),'colour-1','L'),'SOLD_OUT');
});
test('missing server inventory fails closed and legacy products are rejected',()=>{
 assert.equal(normalizeInventoryProduct(sample,'AVAILABLE',new Map(),false).stock,0);
 assert.equal(normalizeInventoryProduct({...sample,inventorySchemaVersion:0},'AVAILABLE',new Map(),true),null);
});
test('colour card identity and bag line keys remain separate',()=>{
 const p=normalizeInventoryProduct(sample,'AVAILABLE',new Map(),true);
 const cards=displayProducts([p],'COLOUR_VARIANTS');
 assert.equal(cards.length,2);assert.equal(cards[0].selectedVariantId,'colour-1');assert.equal(cards[1].id,cards[0].id);
 assert.notEqual(skuLineKey({id:p.id,variantId:'colour-1',color:'RED',size:'M'}),skuLineKey({id:p.id,variantId:'colour-2',color:'BLACK',size:'M'}));
});

const remainingRecord=(variantId,colour,size,remainingQuantity,physicalCeiling)=>({productId:'tshirt1',variantId,colour,size,remainingQuantity,physicalCeiling});
test('remaining quantities reduce exactly the intended colour and size',()=>{
 const r=new Map([[overrideKey('tshirt1','colour-1','M'),remainingRecord('colour-1','RED','M',1,2)],[overrideKey('tshirt1','colour-1','XL'),remainingRecord('colour-1','RED','XL',0,3)]]);
 const p=normalizeInventoryProduct(sample,'AVAILABLE',new Map(),true,r);
 assert.equal(p.stock,6);assert.equal(p.physicalStock,10);assert.equal(p.remainingStock,6);
 assert.equal(skuQuantity(p,'colour-1','M'),1);assert.equal(skuQuantity(p,'colour-1','XL'),0);assert.equal(skuQuantity(p,'colour-2','M'),4);
 assert.equal(availabilityFor(p,'colour-1','XL'),'SOLD_OUT');
});
test('quantity validation rejects negative, decimal, above ceiling and string inputs',()=>{
 for(const q of [-1,1.5,13,'10',NaN,Infinity])assert.equal(validRemainingQuantity(q,12),false);
 for(const q of [0,10,12])assert.equal(validRemainingQuantity(q,12),true);
});
test('lower published ceiling always wins; later higher ceiling does not reset saved remaining',()=>{
 const r=new Map([[overrideKey('tshirt1','colour-1','M'),remainingRecord('colour-1','RED','M',1,2)]]);
 const lower={...sample,colorVariants:[{...sample.colorVariants[0],stockBySize:{M:0,L:0,XL:3}},sample.colorVariants[1]]};
 const higher={...sample,colorVariants:[{...sample.colorVariants[0],stockBySize:{M:12,L:0,XL:3}},sample.colorVariants[1]]};
 assert.equal(skuQuantity(normalizeInventoryProduct(lower,'AVAILABLE',new Map(),true,r),'colour-1','M'),0);
 assert.equal(skuQuantity(normalizeInventoryProduct(higher,'AVAILABLE',new Map(),true,r),'colour-1','M'),1);
});
test('status restrictions do not erase quantity; restoring follows remaining stock',()=>{
 const key=overrideKey('tshirt1','colour-1','M');
 const r=new Map([[key,remainingRecord('colour-1','RED','M',1,2)]]);
 const status=new Map([[key,record('colour-1','RED','M','SOLD_OUT')]]);
 const p=normalizeInventoryProduct(sample,'AVAILABLE',status,true,r);
 assert.equal(p.colorVariants[0].remainingBySize.M,1);assert.equal(skuQuantity(p,'colour-1','M'),0);
 assert.equal(skuQuantity(normalizeInventoryProduct(sample,'AVAILABLE',new Map(),true,r),'colour-1','M'),1);
});
test('invalid and stale quantity records fail closed and cannot increase published stock',()=>{
 const key=overrideKey('tshirt1','colour-1','M');
 for(const invalid of [remainingRecord('colour-1','BLACK','M',2,2),remainingRecord('colour-1','RED','M',3,2),remainingRecord('colour-1','RED','M',-1,2)]){
  assert.equal(skuQuantity(normalizeInventoryProduct(sample,'AVAILABLE',new Map(),true,new Map([[key,invalid]])),'colour-1','M'),0);
 }
 assert.equal(skuQuantity(normalizeInventoryProduct(sample,'AVAILABLE',new Map(),true,new Map([[key,remainingRecord('colour-1','RED','M',13,13)]])),'colour-1','M'),2);
});
test('unverified inventory still blocks purchase even when remaining is positive',()=>{
 assert.equal(normalizeInventoryProduct(sample,'AVAILABLE',new Map(),false,new Map()).stock,0);
});
