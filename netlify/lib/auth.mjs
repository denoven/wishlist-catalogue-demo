// Verify tokens with this site's stable Identity endpoint, independently of
// custom-domain DNS propagation. Never trust a request-supplied host for tokens.
export async function requestUser(req,fetcher=fetch){
 const raw=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nf_jwt='));
 const bearer=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!raw&&!bearer)return null;
 try{const token=bearer||decodeURIComponent(raw.slice(7));if(!token||token.length>12000)return null;
 const origin='https://wonderful-alpaca-f1bcd7.netlify.app';
 const r=await fetcher(new URL('/.netlify/identity/user',origin),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!r.ok)return null;const u=await r.json();return u?.id&&u?.email?u:null;
 }catch{return null}
}
