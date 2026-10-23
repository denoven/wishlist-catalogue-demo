import {getStore} from '@netlify/blobs';
import {processOrderEmails} from '../lib/order-mail.mjs';
export default async()=>{if(process.env.CONTEXT!=='production')return new Response('Production only');return Response.json(await processOrderEmails(getStore({name:'wishlist-production-data',consistency:'strong'})))};
export const config={schedule:'*/15 * * * *'};
