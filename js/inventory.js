// V5 SKU inventory: physical quantity stays separate from administrator availability.
export function overrideKey(productId, variantId, size = 'ALL') { return productId + '--' + variantId + '--' + size; }

export function blocked(status) { return status === 'SOLD_OUT' || status === 'COMING_SOON'; }

export function validStock(value) { return Number.isSafeInteger(value) && value >= 0; }

export function variantFor(product, choice) { return product?.colorVariants?.find(v => v.id === choice || v.name === choice); }

export function availabilityFor(product, choice, size) { const v=variantFor(product,choice); return v?.statusBySize?.[size] || 'NOT_OFFERED'; }

export function skuQuantity(product, choice, size) { const v=variantFor(product,choice); return validStock(v?.availableBySize?.[size]) ? v.availableBySize[size] : 0; }

export function skuLineKey(item) { return JSON.stringify([item.id,item.variantId,item.color,item.size]); }

// A saved cap is independent of the status override. A republished catalogue
// can never increase a previously saved remaining quantity automatically.
export function validRemainingQuantity(value, ceiling) {
  return validStock(value) && validStock(ceiling) && value <= ceiling;
}
export function remainingRecordMatches(record, product, variant, size) {
  return !!record && record.productId===product.id && record.variantId===variant.id
    && record.colour===variant.name && record.size===size
    && validRemainingQuantity(record.remainingQuantity,record.physicalCeiling);
}
export function remainingQuantityFor(product, variant, size, physical, records) {
  const key=overrideKey(product.id,variant.id,size);
  if(!records.has(key)) return physical;
  const record=records.get(key);
  // A stale or malformed record (including a renamed/reordered colour) must
  // be explicitly reviewed, never silently restore physical stock.
  return remainingRecordMatches(record,product,variant,size)
    ? Math.min(physical,record.remainingQuantity) : 0;
}
export function normalizeInventoryProduct(product, productOverride, overrides, verified, remainingRecords=new Map()) {
  const sizes = Array.isArray(product.sizes) ? [...new Set(product.sizes.filter(s=>typeof s==='string'))] : [];
  const variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
  const ids=new Set(),names=new Set();
  const valid=product.inventorySchemaVersion===1 && variants.length>0 && variants.every(v=>{
    if (!v || !/^colour-(?:[1-9]|10)$/.test(v.id) || typeof v.name!=='string' || !v.name.trim() || ids.has(v.id) || names.has(v.name.toLowerCase()) || !v.stockBySize || typeof v.stockBySize!=='object' || !Object.keys(v.stockBySize).length || !Object.entries(v.stockBySize).every(([size,q])=>sizes.includes(size)&&validStock(q))) return false;
    ids.add(v.id); names.add(v.name.toLowerCase()); return true;
  });
  if (!valid) return null;
  const ready=verified===true;
  const resolve=(variant,size)=>{
    const r=overrides.get(overrideKey(product.id,variant.id,size));
    return r && r.productId===product.id && r.variantId===variant.id && r.colour===variant.name && r.size===size ? r.status : '';
  };
  const normalized=variants.map(v=>{
    const colourOverride=resolve(v,'ALL');
    const statusBySize={},availableBySize={},remainingBySize={};
    for(const [size,q] of Object.entries(v.stockBySize)){
      const sizeOverride=resolve(v,size);
      const remaining=remainingQuantityFor(product,v,size,q,remainingRecords);
      remainingBySize[size]=remaining;
      const status=!ready?'UNAVAILABLE':blocked(productOverride)?productOverride:blocked(colourOverride)?colourOverride:blocked(sizeOverride)?sizeOverride:remaining>0?'AVAILABLE':'SOLD_OUT';
      statusBySize[size]=status; availableBySize[size]=status==='AVAILABLE'?remaining:0;
    }
    const stock=Object.values(availableBySize).reduce((a,b)=>a+b,0);
    const physicalStock=Object.values(v.stockBySize).reduce((a,b)=>a+b,0);
    const availability=!ready?'UNAVAILABLE':blocked(productOverride)?productOverride:blocked(colourOverride)?colourOverride:stock>0?'AVAILABLE':Object.values(statusBySize).includes('COMING_SOON')?'COMING_SOON':'SOLD_OUT';
    return {...v,stock,physicalStock,remainingStock:Object.values(remainingBySize).reduce((a,b)=>a+b,0),remainingBySize,availability,availableBySize,statusBySize};
  });
  const stock=normalized.reduce((a,v)=>a+v.stock,0);
  return {...product,sizes,colors:normalized.map(v=>v.name),colorVariants:normalized,stock,remainingStock:normalized.reduce((a,v)=>a+v.remainingStock,0),physicalStock:normalized.reduce((a,v)=>a+v.physicalStock,0),inventoryVerified:ready,availability:!ready?'UNAVAILABLE':blocked(productOverride)?productOverride:stock>0?'AVAILABLE':normalized.some(v=>v.availability==='COMING_SOON')?'COMING_SOON':'SOLD_OUT'};
}

export function displayProducts(products, mode, showSoldOut='YES') {
  if(mode!=='COLOUR_VARIANTS') return products.filter(p=>showSoldOut==='YES'||p.availability!=='SOLD_OUT');
  return products.flatMap(p=>p.colorVariants.filter(v=>showSoldOut==='YES'||v.availability!=='SOLD_OUT').map(v=>({...p,name:p.name+' — '+v.name,masterName:p.name,selectedVariantId:v.id,image:v.image,campaignImage:v.image,images:v.images,stock:v.stock,availability:v.availability,sizes:Object.keys(v.stockBySize),availableBySize:v.availableBySize})));
}

export function inStockForSize(product,size) { if(!size)return product.stock>0; if(product.selectedVariantId)return skuQuantity(product,product.selectedVariantId,size)>0; return product.colorVariants?.some(v=>skuQuantity(product,v.id,size)>0)||false; }
