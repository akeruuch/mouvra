import {useSyncExternalStore} from 'react';

const base=(import.meta.env as {VITE_PHP_BACKEND?:string}).VITE_PHP_BACKEND==='1'?'':'/mouvra';
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(listener=>listener());
if(typeof window!=='undefined')window.addEventListener('popstate',notify);
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}};
const pathname=()=>window.location.pathname.replace(new RegExp(`^${base}(?=/|$)`),'').replace(/\/$/,'')||'/';

export function usePathname(){return useSyncExternalStore(subscribe,pathname,()=>'/')}
export function useRouter(){return {push:(href:string)=>{window.history.pushState(null,'',base+href);notify()}}}
export const siteHref=(href:string)=>base+href;
export const navigate=(href:string)=>{window.history.pushState(null,'',siteHref(href));notify()};
