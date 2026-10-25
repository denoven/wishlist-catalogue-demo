import {HttpError,variant,text,imageMime} from './domain.mjs';
import {createHash,randomUUID} from 'node:crypto';

export function preservePhotos(product,original){
 const defaults=new Map((original?.variants||[]).map(v=>[v.id,v]));
 return {...product,imageUrl:product.imageUrl||original?.imageUrl||null,variants:product.variants.map(v=>({...v,imageUrl:v.imageUrl||defaults.get(v.id)?.imageUrl||null}))};
}
export function validatePhoto(url){if(url==null||url==='')return null;if(typeof url!=='string'||!/^\/(?:products\/|api\/images\/)/.test(url)||url.includes('..')||url.length>600)throw new HttpError(400,'Invalid photo reference.');return url;}
export function validateProductBundle(x,categories){
 if(!x||!text(x.name)||!categories.includes(x.category)||!Array.isArray(x.variants)||!x.variants.length||x.variants.length>300)throw new HttpError(400,'A product name, category and options are required.');
 const ids=new Set();const variants=x.variants.map(v=>{if(typeof v.id!=='string'||!v.id||ids.has(v.id))throw new HttpError(400,'Invalid or duplicate option ID.');ids.add(v.id);return {...v,...variant({...v,price:v.price==null?null:v.price/100,salePrice:v.salePrice==null?null:v.salePrice/100}),imageUrl:validatePhoto(v.imageUrl),archived:!!v.archived};});
 return {name:text(x.name),brand:text(x.brand,80),category:x.category,description:text(x.description,1000),visible:x.visible!==false,imageUrl:validatePhoto(x.imageUrl),variants};
}
export function planConfirmation(order,products){
 const items=order.items||JSON.parse(order.itemsJson||'[]');if(!items.length)throw new HttpError(409,'This order has no items.');const groups=new Map();
 for(const item of items){let candidates=products.flatMap(p=>p.variants.map(v=>({p,v}))).filter(({p,v})=>item.variantId?v.id===item.variantId:((p.brand+' '+p.name).trim()===item.product&&v.name===item.option));
  if(candidates.length!==1)throw new HttpError(409,'An order item cannot be matched safely. Update stock manually and review this request.');
  const {p,v}=candidates[0];if(!Number.isInteger(item.qty)||item.qty<1)throw new HttpError(409,'Invalid order quantity.');
  if(!groups.has(p.id))groups.set(p.id,{product:p,quantities:new Map()});const g=groups.get(p.id);g.quantities.set(v.id,(g.quantities.get(v.id)||0)+item.qty);
 }
 for(const {product:p,quantities} of groups.values()){if(p.stockOrders?.[order.id])continue;for(const [id,qty] of quantities){const v=p.variants.find(v=>v.id===id);if(p.archived||!p.visible||v.archived||!v.enabled||v.quantity===0||(v.quantity!==null&&v.quantity<qty))throw new HttpError(409,'Insufficient stock for '+p.name+' — '+v.name+'. Review inventory before confirming.');}}
 return [...groups.values()];
}
export function deductOnce(product,orderId,quantities){if(product.stockOrders?.[orderId])return product;return {...product,variants:product.variants.map(v=>({...v,quantity:v.quantity===null?null:v.quantity-(quantities.get(v.id)||0)})),stockOrders:{...product.stockOrders,[orderId]:{at:new Date().toISOString(),quantities:Object.fromEntries(quantities)}}};}
export function digestCatalog(products,categories){return createHash('sha256').update(JSON.stringify({products:[...products].sort((a,b)=>a.id.localeCompare(b.id)),categories:[...categories].sort()})).digest('hex');}
export function validateBackup(raw){
 if(raw?.format!=='wishlist-catalogue-backup'||raw.version!==1||!Array.isArray(raw.products)||!Array.isArray(raw.categories)||!raw.categories.length||raw.products.length>1500||raw.categories.length>100)throw new HttpError(400,'Choose a valid Wishlist catalogue backup.');
 const categories=raw.categories.map(c=>text(c,60));if(categories.some(c=>!c||c.toLowerCase()==='all')||new Set(categories.map(c=>c.toLowerCase())).size!==categories.length)throw new HttpError(400,'Invalid categories in backup.');
 const ids=new Set(),optionIds=new Set();const products=raw.products.map(p=>{if(typeof p.id!=='string'||!p.id||p.id.includes('/')||p.id.length>100||ids.has(p.id))throw new HttpError(400,'Invalid product IDs in backup.');ids.add(p.id);const details=validateProductBundle(p,categories);for(const v of details.variants){if(optionIds.has(v.id))throw new HttpError(400,'Duplicate option IDs in backup.');optionIds.add(v.id);}return {...p,...details,archived:!!p.archived,sortOrder:Number.isFinite(p.sortOrder)?p.sortOrder:0};});
 const images=raw.images||[];if(!Array.isArray(images)||images.length>2000)throw new HttpError(400,'Invalid backup images.');let total=0;for(const i of images){if(!/^[a-f0-9-]{36}$/.test(i.key)||typeof i.data!=='string')throw new HttpError(400,'Invalid backup image.');const bytes=Buffer.from(i.data,'base64');total+=bytes.length;if(bytes.length>3000000||imageMime(bytes)!==i.contentType||total>3000000)throw new HttpError(400,'Backup images are invalid or too large.');}
 return {format:raw.format,version:1,products,categories,images};
}
export async function acquireAdminLock(s){const key='system/admin-write-lock',saved=await s.getWithMetadata(key,{type:'json'});if(saved?.data.until>Date.now())throw new HttpError(409,'Another administrator is saving. Please try again shortly.');const id=randomUUID();if(!(await s.setJSON(key,{id,until:Date.now()+120000},saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true})).modified)throw new HttpError(409,'Another administrator is saving. Try again.');return async()=>{const current=await s.getWithMetadata(key,{type:'json'});if(current?.data.id===id)await s.setJSON(key,{id,until:0},{onlyIfMatch:current.etag});};}
