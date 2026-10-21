import photos from './photo-map.json';
export function variantPhoto(brand:string,name:string,option:string,_category?:string){return (photos as Record<string,string|null>)[`${brand}|${name}|${option}`]||null}
export function firstPhotographedOption(brand:string,name:string,variants:any[],category?:string){return variants.find(v=>v.enabled&&(v.imageUrl||variantPhoto(brand,name,v.name,category)))||variants[0]}
