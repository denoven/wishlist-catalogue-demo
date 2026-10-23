import {randomUUID} from 'node:crypto';
export const emailAddress=s=>typeof s==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=160;
export const mailReady=env=>Boolean(env.RESEND_API_KEY&&env.RESTOCK_FROM_EMAIL);
export async function sendMail({to,subject,text,key},env=process.env,fetcher=fetch){
 if(!mailReady(env))throw Error('Email service is not configured.');
 const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:env.RESTOCK_FROM_EMAIL,to:[to],reply_to:'wishlistcw@gmail.com',subject,text}),signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('Email provider rejected the request ('+r.status+').');
 const data=await r.json();if(!data.id)throw Error('Email provider did not confirm the message.');return data.id;
}
export async function processRestock(s,seed,env=process.env,fetcher=fetch){
 if(!mailReady(env))return {configured:false,sent:0};
 let sent=0,processed=0;const now=Date.now(),{blobs}=await s.list({prefix:'restock/'});
 for(const b of blobs){if(processed>=3)break;const saved=await s.getWithMetadata(b.key,{type:'json'}),item=saved?.data;
 if(!item||!['waiting','sending'].includes(item.status)||!emailAddress(item.contact)||item.emailSentAt||item.emailLeaseUntil>now)continue;
 const p=await s.get('products/'+item.productId,{type:'json'})||seed.find(p=>p.id===item.productId),v=p?.variants.find(v=>v.id===item.variantId);
 if(!p?.visible||!v?.enabled||!(v.quantity>0))continue;
 // Stop uncertain retries before the provider's 24-hour idempotency window ends.
 if(item.emailFirstAttemptAt&&now-item.emailFirstAttemptAt>23*3600000){await s.setJSON(b.key,{...item,status:'waiting',emailNeedsReview:true,emailLastError:'Delivery needs manual review before retrying.'},{onlyIfMatch:saved.etag});continue}
 processed++;const claim=randomUUID(),next={...item,status:'sending',emailClaim:claim,emailLeaseUntil:now+5*60000,emailFirstAttemptAt:item.emailFirstAttemptAt||now};
 const lock=await s.setJSON(b.key,next,{onlyIfMatch:saved.etag});if(!lock.modified)continue;
 try{const id=await sendMail({to:item.contact,subject:'Back in stock: '+p.brand+' '+p.name,text:'Hi '+item.name+',\n\nThe Wishlist item you requested is available again:\n'+p.brand+' '+p.name+' — '+v.name+'\n\nBrowse the catalogue: https://wishlistonline.shop/\nContact @wishlist.cw on Instagram to confirm availability and order. Stock is limited; this email does not reserve an item.\n\nYou received this one-time email because you requested a stock notification.',key:'restock-'+item.id},env,fetcher);
 const latest=await s.getWithMetadata(b.key,{type:'json'});if(latest?.data.emailClaim===claim)await s.setJSON(b.key,{...latest.data,status:'contacted',emailSentAt:new Date().toISOString(),emailMessageId:id,emailLeaseUntil:0,emailLastError:null},{onlyIfMatch:latest.etag});sent++;
 }catch{const latest=await s.getWithMetadata(b.key,{type:'json'});if(latest?.data.emailClaim===claim)await s.setJSON(b.key,{...latest.data,status:'waiting',emailLeaseUntil:Date.now()+15*60000,emailLastError:'Email could not be sent. Automatic retry is pending.'},{onlyIfMatch:latest.etag})}
 }
 return {configured:true,sent};
}
