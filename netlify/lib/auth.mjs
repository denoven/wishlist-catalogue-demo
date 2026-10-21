// Verify the browser's Identity cookie with Identity itself. Functions do not
// expose the framework-specific cookie context used by identity.getUser().
export async function requestUser(req,fetcher=fetch){
 const raw=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('nf_jwt='));
 if(!raw)return null;
 try{const token=decodeURIComponent(raw.slice(7));if(!token||token.length>12000)return null;
 const origin=process.env.URL||new URL(req.url).origin;
 const r=await fetcher(new URL('/.netlify/identity/user',origin),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});
 if(!r.ok)return null;const u=await r.json();return u?.id&&u?.email?u:null;
 }catch{return null}
}
