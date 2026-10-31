export type Query = { bind(...args: unknown[]): Query; first<T>(): Promise<T | null>; run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }> };
export type Database = { prepare(sql: string): Query };
export type CatalogueItem = { id: string; price: number | null; currency: string; name: string };
export type BasketLine = { id: string; quantity: number };
export type SavedState = { cart: BasketLine[]; favorites: string[] };
type User = { id: string; name: string; email: string; password_hash: string; salt: string; state: string };
const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (s:string) => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
async function passwordHash(password:string,salt:string) {
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:100000},key,256));
}
function equal(a:string,b:string) { let diff=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0; }
function validState(value:unknown,catalog:CatalogueItem[]): value is SavedState {
 if(!value||typeof value!=='object')return false;
 const {cart,favorites}=value as SavedState;const ids=new Set(catalog.map(p=>p.id));
 return Array.isArray(cart)&&cart.length<=catalog.length&&new Set(cart.map(x=>x?.id)).size===cart.length&&cart.every(x=>x&&ids.has(x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10)&&Array.isArray(favorites)&&favorites.length<=catalog.length&&favorites.every(x=>ids.has(x))&&new Set(favorites).size===favorites.length;
}
export async function accountApi(request: Request, db: Database, catalog: CatalogueItem[]): Promise<Response> {
 const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
 const fail=(error:string,status=400)=>json({error},status);
 const url=new URL(request.url);const route=url.pathname.replace('/api/','');
 const secure=url.protocol==='https:'?'; Secure':'';
 const sessionCookie=(token:string,maxAge=604800)=>`mouvra_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return fail('Запрос отклонён. Обновите страницу.',403);
 try {
  let body:Record<string,unknown>={};
  if(request.method!=='GET'){
   const raw=await request.text(); if(raw.length>16000)return fail('Слишком большой запрос.',413);
   try {body=raw?JSON.parse(raw):{};}catch{return fail('Некорректные данные.');}
   if(!body||typeof body!=='object'||Array.isArray(body))return fail('Некорректные данные.');
  }
  if((route==='register'||route==='login')&&request.method==='POST'){
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   const password=typeof body.password==='string'?body.password:'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail('Укажите корректный email.');
   if(password.length<10||password.length>128)return fail('Пароль должен содержать от 10 до 128 символов.');
   const attemptKey=await digest(`${email}:${request.headers.get('cf-connecting-ip')||'local'}`);const now=Date.now();
   const attempts=await db.prepare('SELECT count,reset FROM attempts WHERE key=?').bind(attemptKey).first<{count:number;reset:number}>();
   if(attempts&&attempts.reset>now&&attempts.count>=10)return fail('Слишком много попыток. Повторите через 15 минут.',429);
   await db.prepare('INSERT INTO attempts(key,count,reset) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=?,reset=?').bind(attemptKey,now+900000,attempts&&attempts.reset>now?attempts.count+1:1,attempts&&attempts.reset>now?attempts.reset:now+900000).run();
   let user=await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first<User>();
   if(route==='register'){
    const name=typeof body.name==='string'?body.name.trim():'';if(name.length<2||name.length>60)return fail('Имя должно содержать от 2 до 60 символов.');
    if(user)return fail('Не удалось создать аккаунт. Попробуйте войти с этим email.',409);
    const salt=random();user={id:crypto.randomUUID(),email,name,salt,password_hash:await passwordHash(password,salt),state:JSON.stringify({cart:[],favorites:[]})};
    try{await db.prepare('INSERT INTO users(id,email,name,password_hash,salt,state) VALUES(?,?,?,?,?,?)').bind(user.id,email,name,user.password_hash,salt,user.state).run();}catch{return fail('Не удалось создать аккаунт. Попробуйте войти.',409);}
   }else{
    const hash=await passwordHash(password,user?.salt||'mouvra-invalid-account-salt');
    if(!user||!equal(hash,user.password_hash))return fail('Email или пароль не совпадают.',401);
   }
   await db.prepare('DELETE FROM attempts WHERE key=?').bind(attemptKey).run();
   const token=random();await db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(await digest(token),user.id,Date.now()+604800000).run();
   return json({user:{id:user.id,name:user.name,email:user.email},state:JSON.parse(user.state)},route==='register'?201:200,{'Set-Cookie':sessionCookie(token)});
  }
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)mouvra_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const tokenHash=token?await digest(token):'';
  const user=token?await db.prepare('SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.token=? AND sessions.expires>?').bind(tokenHash,Date.now()).first<User>():null;
  if(!user)return fail('Войдите в аккаунт, чтобы продолжить.',401);
  if(route==='logout'&&request.method==='POST'){
   await db.prepare('DELETE FROM sessions WHERE token=?').bind(tokenHash).run();return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)});
  }
  if(route==='account'&&request.method==='GET'){
   const {results}=await db.prepare('SELECT id,created,items,totals FROM orders WHERE user_id=? ORDER BY created DESC LIMIT 50').bind(user.id).all<{id:string;created:string;items:string;totals:string}>();
   return json({user:{id:user.id,name:user.name,email:user.email},state:JSON.parse(user.state),orders:results.map(o=>({...o,items:JSON.parse(o.items),totals:JSON.parse(o.totals)}))});
  }
  if(route==='state'&&request.method==='PUT'){
   if(!validState(body,catalog))return fail('Проверьте товары и количество: от 1 до 10 для каждой модели.');
   const state={cart:body.cart.map(x=>({id:x.id,quantity:x.quantity})),favorites:body.favorites};
   await db.prepare('UPDATE users SET state=? WHERE id=?').bind(JSON.stringify(state),user.id).run();return json({state});
  }
  if(route==='profile'&&request.method==='PATCH'){
   const name=typeof body.name==='string'?body.name.trim():'';if(name.length<2||name.length>60)return fail('Имя должно содержать от 2 до 60 символов.');
   await db.prepare('UPDATE users SET name=? WHERE id=?').bind(name,user.id).run();return json({user:{id:user.id,name,email:user.email}});
  }
  if(route==='orders'&&request.method==='POST'){
   const state:SavedState=JSON.parse(user.state);if(!validState(state,catalog)||!state.cart.length)return fail('Добавьте мышь в корзину.');
   const items=state.cart.map(line=>({...line,...catalog.find(p=>p.id===line.id)!}));
   const totals:Record<string,number>={};for(const item of items)if(item.price!==null)totals[item.currency]=Math.round(((totals[item.currency]||0)+item.price*item.quantity)*100)/100;
   const order={id:crypto.randomUUID(),created:new Date().toISOString(),items,totals};
   await db.prepare('INSERT INTO orders(id,user_id,created,items,totals) VALUES(?,?,?,?,?)').bind(order.id,user.id,order.created,JSON.stringify(items),JSON.stringify(totals)).run();
   return json({order},201);
  }
  return fail('Этот адрес не найден.',404);
 }catch(error){console.error('Account request failed',error instanceof Error?error.name:'UnknownError');return fail('Сервис временно недоступен. Попробуйте ещё раз.',503);}
}
