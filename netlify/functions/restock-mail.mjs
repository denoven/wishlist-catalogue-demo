import {getStore} from '@netlify/blobs';
import seed from '../../src/catalog.json' with {type:'json'};
import {processRestock} from '../lib/mail.mjs';
export default async()=>{if(process.env.CONTEXT!=='production')return new Response('Production only');const s=getStore({name:'wishlist-production-data',consistency:'strong'});return Response.json(await processRestock(s,seed))};
export const config={schedule:'*/15 * * * *'};
