import {sendMail,mailReady} from './mail.mjs';
import {randomUUID} from 'node:crypto';
export async function processOrderEmails(s,env=process.env,fetcher=fetch,onlyKey=null){
 if(!mailReady(env))return {sent:0};const keys=onlyKey?[{key:onlyKey}]:(await s.list({prefix:'orders/'})).blobs;
 let sent=0,attempted=0;for(const b of keys){if(attempted>=3)break;const saved=await s.getWithMetadata(b.key,{type:'json'}),o=saved?.data,now=Date.now();
 if(!o||!o.emailNotificationQueued||o.emailSentAt||o.emailLeaseUntil>now)continue;
 if(o.emailFirstAttemptAt&&now-o.emailFirstAttemptAt>23*3600000)continue;
 attempted++;const claim=randomUUID(),next={...o,emailClaim:claim,emailLeaseUntil:now+5*60000,emailFirstAttemptAt:o.emailFirstAttemptAt||now};
 if(!(await s.setJSON(b.key,next,{onlyIfMatch:saved.etag})).modified)continue;
 try{const messageId=await sendMail({to:'wishlistcw@gmail.com',subject:'New Wishlist order request '+o.id,text:'New order request: '+o.id+'\n\nCustomer: '+o.customerName+'\nContact: '+o.customerContact+'\n\n'+o.items.map(i=>i.qty+' × '+i.product+' — '+i.option+' · XCG '+(i.qty*i.priceCents/100).toFixed(2)).join('\n')+'\n\nEstimated total: XCG '+(o.totalCents/100).toFixed(2)+'\nNotes: '+(o.notes||'None')+'\n\nReview in your private admin panel: https://wonderful-alpaca-f1bcd7.netlify.app/admin\nThis is a request, not a paid or reserved order. Confirm stock and payment with the customer.',key:'order-'+o.id},env,fetcher);
 const current=await s.getWithMetadata(b.key,{type:'json'});if(current?.data.emailClaim===claim)await s.setJSON(b.key,{...current.data,emailSentAt:new Date().toISOString(),emailMessageId:messageId,emailLeaseUntil:0,emailLastError:null},{onlyIfMatch:current.etag});sent++;
 }catch{const current=await s.getWithMetadata(b.key,{type:'json'});if(current?.data.emailClaim===claim)await s.setJSON(b.key,{...current.data,emailLeaseUntil:Date.now()+15*60000,emailLastError:'Notification email pending retry.'},{onlyIfMatch:current.etag})}
 }return {sent};
}
