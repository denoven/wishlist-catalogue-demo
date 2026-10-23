import {test} from 'node:test';
import assert from 'node:assert/strict';
import {processRestock,sendMail} from '../netlify/lib/mail.mjs';
const env={RESEND_API_KEY:'test',RESTOCK_FROM_EMAIL:'Wishlist <notifications@example.com>'};
const product={id:'p',visible:true,brand:'Brand',name:'Item',variants:[{id:'v',name:'Pink',enabled:true,quantity:2}]};
function storage(item){let version=1;let data=structuredClone(item);return {async list(){return {blobs:[{key:'restock/r'}]}},async get(){return product},async getWithMetadata(){return {data:structuredClone(data),etag:String(version)}},async setJSON(key,next,opts){if(opts.onlyIfMatch!==String(version))return {modified:false};data=structuredClone(next);version++;return {modified:true}},read(){return data}}}
const item={id:'r',productId:'p',variantId:'v',name:'Test',contact:'test@example.com',status:'waiting'};
test('send once and persist provider confirmation',async()=>{const s=storage(item);let calls=0;const fake=async(url,opt)=>{calls++;assert.equal(JSON.parse(opt.body).reply_to,'wishlistcw@gmail.com');assert.equal(opt.headers['Idempotency-Key'],'restock-r');return Response.json({id:'email-1'})};assert.equal((await processRestock(s,[],env,fake)).sent,1);assert.equal(s.read().status,'contacted');assert.ok(s.read().emailSentAt);await processRestock(s,[],env,fake);assert.equal(calls,1)});
test('failure retries safely and does not mark sent',async()=>{const s=storage(item);await processRestock(s,[],env,async()=>new Response('',{status:429}));assert.equal(s.read().status,'waiting');assert.ok(s.read().emailLeaseUntil>Date.now());assert.equal(s.read().emailSentAt,undefined)});
test('ignore non-email contacts and cancelled requests',async()=>{for(const change of [{contact:'@customer'},{status:'cancelled'}]){let calls=0;await processRestock(storage({...item,...change}),[],env,async()=>{calls++;});assert.equal(calls,0)}});
test('uncertain old delivery is held for review',async()=>{const s=storage({...item,emailFirstAttemptAt:Date.now()-24*3600000});let calls=0;await processRestock(s,[],env,async()=>{calls++});assert.equal(calls,0);assert.equal(s.read().emailNeedsReview,true)});
test('no service credentials means no sending',async()=>{assert.deepEqual(await processRestock(storage(item),[],{},async()=>{throw Error()}),{configured:false,sent:0})});
