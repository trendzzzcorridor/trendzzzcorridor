import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInventoryProduct,overrideKey,skuQuantity,availabilityFor,displayProducts,skuLineKey} from '../js/inventory.js';
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
