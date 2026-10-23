import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {getUser,login,logout,handleAuthCallback,acceptInvite,updateUser,requestPasswordRecovery} from '@netlify/identity';
import Catalog from './Catalog';
import AdminPanel from './AdminPanel';
import './admin-base.css';
import './migration.css';

function App(){
 const [data,setData]=useState(null),[categories,setCategories]=useState([]),[ordersEnabled,setOrdersEnabled]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[session,setSession]=useState(null),[ready,setReady]=useState(false),[token,setToken]=useState(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[busy,setBusy]=useState(false),[forgot,setForgot]=useState(false);
 const admin=location.pathname.startsWith('/admin');
 useEffect(()=>{
  (async()=>{
   try{
    const r=await handleAuthCallback();
    if(r&&['invite','recovery'].includes(r.type)){setToken(r);setPassword('');setConfirmPassword('');}
    else setSession(await getUser());
   }catch{if(admin)setError('This sign-in link is invalid or expired. Please request a new password reset email or invitation.');}
   finally{setReady(true);}
  })();
  if(!admin)fetch('/api/catalog',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(x=>{setData(x.products);setCategories(x.categories||[]);setOrdersEnabled(x.ordersEnabled===true);}).catch(()=>setError('The catalogue is temporarily unavailable. Please refresh or contact @wishlist.cw.'));
 },[]);
 function switchForgot(value){setForgot(value);setError('');setNotice('');setPassword('');}
 async function submit(e){
  e.preventDefault();setError('');setNotice('');
  if(token&&password!==confirmPassword){setError('The passwords do not match. Please enter the same password in both fields.');return;}
  setBusy(true);
  try{
   if(forgot&&!token){
    await requestPasswordRecovery(email.trim());
    setNotice('If an account exists for this email address, a password reset link has been sent. Check your inbox and spam folder. Open the latest link to choose a new password.');
    return;
   }
   const u=token?(token.type==='invite'?await acceptInvite(token.token,password):await updateUser({password})):await login(email.trim(),password);
   setSession(u);setToken(null);location.assign('/admin');
  }catch(e){setError(forgot?'Could not send the reset email. Please try again in a few minutes.':token?'Could not save your password. The link may have expired. Please request a new reset email.':e.message||'Sign-in failed.');}
  finally{setBusy(false);}
 }
 if(admin||token){
  if(!ready)return <main className="admin-gate">Loading sign-in…</main>;
  if(session&&!token)return <><button className="logout-button" onClick={async()=>{await logout();setSession(null);}}>Sign out</button><AdminPanel/></>;
  return <main className="admin-gate">
   <img src="/brand-wordmark-transparent.png" alt="Wishlist"/>
   <h1>{token?'Set your password':forgot?'Reset your password':'Catalogue management'}</h1>
   <p>{token?'Choose a password with at least 12 characters.':forgot?'Enter your admin email address and we will send you a password reset link.':'Sign in to manage photos, prices and inventory.'}</p>
   <form onSubmit={submit}>
    {!token&&<label>Email address<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
    {(!forgot||token)&&<label>{token?'New password':'Password'}<input type="password" required minLength={token?12:1} autoComplete={token?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
    {token&&<label>Confirm new password<input type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>}
    <button className="admin-primary" disabled={busy}>{busy?'Please wait…':token?'Save password & sign in':forgot?'Send reset link':'Sign in'}</button>
   </form>
   {error&&<p role="alert">{error}</p>}
   {notice&&<p role="status">{notice}</p>}
   {!token&&<button type="button" className="text-button" disabled={busy} onClick={()=>switchForgot(!forgot)}>{forgot?'Back to sign in':'Forgot password?'}</button>}
   {token?.type==='recovery'&&error&&<button type="button" className="text-button" onClick={()=>{setToken(null);switchForgot(true);}}>Request a new reset link</button>}
   <a href="/">Back to catalogue</a>
  </main>;
 }
 return data?<Catalog initial={data} categories={categories} ordersEnabled={ordersEnabled}/>:<main className="admin-gate"><img src="/brand-wordmark-transparent.png" alt="Wishlist"/><p role={error?'alert':'status'}>{error||'Loading the catalogue…'}</p>{error&&<a href="https://www.instagram.com/wishlist.cw/">Contact @wishlist.cw</a>}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);
