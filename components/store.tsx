'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {products,apiCatalog} from '@/lib/products';
import type {BasketLine,SavedState} from '@/lib/account';

export type User={id:string;name:string;email:string;demo?:boolean};
export type Order={id:string;created:string;items:(BasketLine&{name:string;price:number|null;currency:string})[];totals:Record<string,number>};
const empty:SavedState={cart:[],favorites:[]};
const ids=new Set(products.map(p=>p.id));
function readLocal():SavedState {try{const v=JSON.parse(localStorage.getItem('mouvra:v1:selection')||'null');return {cart:Array.isArray(v?.cart)?v.cart.filter((x:BasketLine)=>ids.has(x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10):[],favorites:Array.isArray(v?.favorites)?v.favorites.filter((id:string)=>ids.has(id)):[]};}catch{return empty;}}
type ApiResult={user:User;state:SavedState;orders:Order[];order:Order;error?:string};
export async function api(path:string,method='GET',data?:unknown){const r=await fetch(`/api/${path}`,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const result=await r.json() as ApiResult;if(!r.ok)throw new Error(result.error||'Не удалось выполнить запрос. Попробуйте ещё раз.');return result;}
function useStoreState(){
 const [state,setState]=useState<SavedState>(empty);const [user,setUser]=useState<User|null>(null);const [orders,setOrders]=useState<Order[]>([]);
 const [compare,setCompare]=useState<string[]>([]);const [auth,setAuth]=useState<'login'|'register'|null>(null);const [toast,setToast]=useState('');const [ready,setReady]=useState(false);const [syncError,setSyncError]=useState('');
 const stateRef=useRef(state);const userRef=useRef(user);const queue=useRef(Promise.resolve());const generation=useRef(0);const toastTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const notify=(message:string)=>{setToast(message);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3500);};
 useEffect(()=>{let alive=true;const local=readLocal();setState(local);stateRef.current=local;
  try{setCompare(JSON.parse(localStorage.getItem('mouvra:v1:compare')||'["superlight-2","viper-v3-pro"]').filter((id:string)=>ids.has(id)).slice(0,4));}catch{}
  api('account').then(result=>{if(!alive)return;setUser(result.user);userRef.current=result.user;setState(result.state);stateRef.current=result.state;setOrders(result.orders);}).catch(()=>{if(!alive)return;try{const demo=JSON.parse(sessionStorage.getItem('mouvra:demo')||'null');if(demo?.demo){setUser(demo);userRef.current=demo;setOrders(JSON.parse(localStorage.getItem('mouvra:v1:demo-orders')||'[]'));}}catch{}}).finally(()=>{if(alive)setReady(true)});
  return()=>{alive=false;clearTimeout(toastTimer.current)};
 },[]);
 function save(next:SavedState){stateRef.current=next;setState(next);try{localStorage.setItem('mouvra:v1:selection',JSON.stringify(next))}catch{setSyncError('Браузер не разрешил сохранить подборку.');}
  const active=userRef.current;if(active&&!active.demo){const gen=generation.current;queue.current=queue.current.catch(()=>{}).then(async()=>{if(gen!==generation.current)return;try{await api('state','PUT',next);setSyncError('');}catch(e){setSyncError(e instanceof Error?e.message:'Не удалось сохранить изменения.');throw e;}}).catch(()=>{});}
 }
 const add=(id:string)=>{const old=stateRef.current;const existing=old.cart.find(x=>x.id===id);if(existing?.quantity===10){notify('В корзине уже 10 экземпляров этой модели.');return;}save({...old,cart:existing?old.cart.map(x=>x.id===id?{...x,quantity:x.quantity+1}:x):[...old.cart,{id,quantity:1}]});notify('Мышь добавлена в корзину');};
 const quantity=(id:string,n:number)=>save({...stateRef.current,cart:n<=0?stateRef.current.cart.filter(x=>x.id!==id):stateRef.current.cart.map(x=>x.id===id?{...x,quantity:Math.min(10,n)}:x)});
 const favorite=(id:string)=>{const old=stateRef.current;const exists=old.favorites.includes(id);save({...old,favorites:exists?old.favorites.filter(x=>x!==id):[...old.favorites,id]});notify(exists?'Удалено из избранного':'Сохранено в избранном');};
 const toggleCompare=(id:string)=>{setCompare(old=>{if(!old.includes(id)&&old.length>=4){notify('Можно сравнить до четырёх моделей одновременно.');return old;}const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];try{localStorage.setItem('mouvra:v1:compare',JSON.stringify(next))}catch{}return next;});};
 async function authenticate(mode:'login'|'register',data:Record<string,string>){
  const result=await api(mode,'POST',data);generation.current++;
  const local=stateRef.current;const merged:SavedState={cart:result.state.cart,favorites:Array.from(new Set([...result.state.favorites,...local.favorites]))};
  for(const item of local.cart){const existing=merged.cart.find(x=>x.id===item.id);if(existing)existing.quantity=Math.max(existing.quantity,item.quantity);else merged.cart.push(item);}
  userRef.current=result.user;setUser(result.user);setAuth(null);save(merged);const full=await api('account');setOrders(full.orders);sessionStorage.removeItem('mouvra:demo');notify(mode==='register'?'Аккаунт создан. Добро пожаловать!':'Вы вошли в аккаунт');
 }
 function demo(){const demoUser:User={id:'demo',name:'Алекс',email:'Демонстрационный аккаунт',demo:true};userRef.current=demoUser;setUser(demoUser);setAuth(null);sessionStorage.setItem('mouvra:demo',JSON.stringify(demoUser));try{setOrders(JSON.parse(localStorage.getItem('mouvra:v1:demo-orders')||'[]'))}catch{}notify('Открыт демонстрационный кабинет');}
 async function logout(){await queue.current;if(userRef.current&&!userRef.current.demo)await api('logout','POST',{});generation.current++;userRef.current=null;setUser(null);setOrders([]);sessionStorage.removeItem('mouvra:demo');save(empty);notify('Вы вышли из аккаунта');}
 async function profile(name:string){if(user?.demo){const next={...user,name};setUser(next);userRef.current=next;sessionStorage.setItem('mouvra:demo',JSON.stringify(next));}else{const r=await api('profile','PATCH',{name});setUser(r.user);userRef.current=r.user;}notify('Имя обновлено');}
 async function order(){if(!user){setAuth('login');return;}if(!stateRef.current.cart.length)return;
  let created:Order;if(user.demo){const items=stateRef.current.cart.map(x=>({...x,...apiCatalog.find(p=>p.id===x.id)!}));const totals:Record<string,number>={};for(const item of items)if(item.price!==null)totals[item.currency]=Math.round(((totals[item.currency]||0)+item.price*item.quantity)*100)/100;created={id:crypto.randomUUID(),created:new Date().toISOString(),items,totals};const next=[created,...orders];setOrders(next);localStorage.setItem('mouvra:v1:demo-orders',JSON.stringify(next));}else{await queue.current;await api('state','PUT',stateRef.current);const r=await api('orders','POST',{});created=r.order;setOrders(old=>[created,...old]);}notify('Подборка сохранена в кабинете. Оплата не списывалась.');return created;
 }
 return {state,user,orders,compare,auth,setAuth,toast,ready,syncError,add,quantity,favorite,toggleCompare,authenticate,demo,logout,profile,order,notify,retry:()=>save(stateRef.current)};
}
const Context=createContext<ReturnType<typeof useStoreState>|null>(null);
export function StoreProvider({children}:{children:ReactNode}){const value=useStoreState();return <Context.Provider value={value}>{children}</Context.Provider>}
export function useStore(){const context=useContext(Context);if(!context)throw new Error('StoreProvider missing');return context;}
