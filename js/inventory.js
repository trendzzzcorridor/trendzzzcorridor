// V5 SKU inventory: physical quantity stays separate from administrator availability.
export function overrideKey(productId, variantId, size = 'ALL') { return productId + '--' + variantId + '--' + size; }

export function blocked(status) { return status === 'SOLD_OUT' || status === 'COMING_SOON'; }

export function validStock(value) { return Number.isSafeInteger(value) && value >= 0; }

export function variantFor(product, choice) { return product?.colorVariants?.find(v => v.id === choice || v.name === choice); }

export function availabilityFor(product, choice, size) { const v=variantFor(product,choice); return v?.statusBySize?.[size] || 'NOT_OFFERED'; }

export function skuQuantity(product, choice, size) { const v=variantFor(product,choice); return validStock(v?.availableBySize?.[size]) ? v.availableBySize[size] : 0; }

export function skuLineKey(item) { return JSON.stringify([item.id,item.variantId,item.color,item.size]); }

export function normalizeInventoryProduct(product, productOverride, overrides, verified) {
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
    const statusBySize={},availableBySize={};
    for(const [size,q] of Object.entries(v.stockBySize)){
      const sizeOverride=resolve(v,size);
      const status=!ready?'UNAVAILABLE':blocked(productOverride)?productOverride:blocked(colourOverride)?colourOverride:blocked(sizeOverride)?sizeOverride:q>0?'AVAILABLE':'SOLD_OUT';
      statusBySize[size]=status; availableBySize[size]=status==='AVAILABLE'?q:0;
    }
    const stock=Object.values(availableBySize).reduce((a,b)=>a+b,0);
    const physicalStock=Object.values(v.stockBySize).reduce((a,b)=>a+b,0);
    const availability=!ready?'UNAVAILABLE':blocked(productOverride)?productOverride:blocked(colourOverride)?colourOverride:stock>0?'AVAILABLE':Object.values(statusBySize).includes('COMING_SOON')?'COMING_SOON':'SOLD_OUT';
    return {...v,stock,physicalStock,availability,availableBySize,statusBySize};
  });
  const stock=normalized.reduce((a,v)=>a+v.stock,0);
  return {...product,sizes,colors:normalized.map(v=>v.name),colorVariants:normalized,stock,physicalStock:normalized.reduce((a,v)=>a+v.physicalStock,0),inventoryVerified:ready,availability:!ready?'UNAVAILABLE':blocked(productOverride)?productOverride:stock>0?'AVAILABLE':normalized.some(v=>v.availability==='COMING_SOON')?'COMING_SOON':'SOLD_OUT'};
}

export function displayProducts(products, mode, showSoldOut='YES') {
  if(mode!=='COLOUR_VARIANTS') return products.filter(p=>showSoldOut==='YES'||p.availability!=='SOLD_OUT');
  return products.flatMap(p=>p.colorVariants.filter(v=>showSoldOut==='YES'||v.availability!=='SOLD_OUT').map(v=>({...p,name:p.name+' — '+v.name,masterName:p.name,selectedVariantId:v.id,image:v.image,campaignImage:v.image,images:v.images,stock:v.stock,availability:v.availability,sizes:Object.keys(v.stockBySize),availableBySize:v.availableBySize})));
}

export function inStockForSize(product,size) { if(!size)return product.stock>0; if(product.selectedVariantId)return skuQuantity(product,product.selectedVariantId,size)>0; return product.colorVariants?.some(v=>skuQuantity(product,v.id,size)>0)||false; }
