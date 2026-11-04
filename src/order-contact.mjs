export function instagramHandle(value){
  if(typeof value!=="string") return null;
  const handle=value.trim().replace(/^@/,"");
  return /^(?=.{1,30}$)(?![.])(?!.*\.\.)(?!.*\.$)[a-z0-9._]+$/i.test(handle)&&!/^[0-9]+$/.test(handle)?"@"+handle:null;
}
