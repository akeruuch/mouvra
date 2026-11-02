import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';
const password = 'Long-Test-Password-42!';
function client() {
  let cookie = '';
  return async (path, method = 'GET', data, headers = {}) => {
    const r = await fetch(`${base}/api/${path}`, {method, headers: {
      Origin: base, 'Content-Type': 'application/json', Cookie: cookie, ...headers,
    }, body: data === undefined ? undefined : JSON.stringify(data)});
    if (r.headers.has('set-cookie')) cookie = r.headers.get('set-cookie').split(';')[0];
    return {status: r.status, headers:r.headers, body:await r.json()};
  };
}
const register = (call) => call('register', 'POST', {name:'Тестовый игрок',email:`${randomUUID()}@example.test`,password});

test('PHP health and MySQL catalogue are available', async () => {
  const call=client();
  let health;
  try {health=await call('health');} catch {assert.fail('PHP API must be reachable and backed by MySQL');}
  assert.equal(health.status,200);
  assert.equal(health.body.database,'mysql');
  const catalog=await call('products');
  assert.equal(catalog.status,200);
  assert.ok(catalog.body.products.length>=20);
  assert.equal(health.body.products,catalog.body.products.length);
  assert.ok(catalog.body.products.some(p=>p.price.amount===null));
});

test('registration, validation, login, profile and revoked session', async () => {
  const call=client(), email=`${randomUUID()}@example.test`;
  assert.equal((await call('account')).status,401);
  assert.equal((await call('register','POST',{name:'A',email,password})).status,400);
  assert.equal((await call('register','POST',{name:'Player',email,password:'short'})).status,400);
  const registered=await call('register','POST',{name:'Игрок',email,password});
  assert.equal(registered.status,201);
  assert.match(registered.headers.get('set-cookie'),/HttpOnly/i);
  assert.match(registered.headers.get('set-cookie'),/SameSite=Lax/i);
  assert.equal(registered.body.user.email,email);
  assert.equal(registered.body.user.password_hash,undefined);
  assert.equal((await call('register','POST',{name:'Player',email,password})).status,409);
  assert.equal((await call('profile','PATCH',{name:'Новое имя'})).body.user.name,'Новое имя');
  assert.equal((await call('logout','POST',{})).status,200);
  assert.equal((await call('account')).status,401);
  assert.equal((await call('login','POST',{email,password:'wrong-password'})).status,401);
  assert.equal((await call('login','POST',{email,password})).status,200);
  assert.equal((await call('account')).body.user.name,'Новое имя');
});

test('state is transactional, validated and isolated between users', async () => {
  const one=client(),two=client(); await register(one); await register(two);
  const state={cart:[{id:'superlight-2',quantity:2}],favorites:['viper-v3-pro']};
  assert.equal((await one('state','PUT',state)).status,200);
  assert.deepEqual((await one('account')).body.state,state);
  assert.deepEqual((await two('account')).body.state,{cart:[],favorites:[]});
  for (const cart of [[{id:'fake',quantity:1}],[{id:'superlight-2',quantity:11}],[{id:'superlight-2',quantity:1.5}],[{id:'superlight-2',quantity:'2'}],[{id:'superlight-2',quantity:1},{id:'superlight-2',quantity:1}]]) {
    assert.equal((await one('state','PUT',{cart,favorites:[]})).status,400);
  }
  assert.equal((await one('state','PUT',{cart:[],favorites:['fake']})).status,400);
  assert.deepEqual((await one('account')).body.state,state);
  assert.equal((await one('state','PUT',state,{Origin:'https://attacker.test'})).status,403);
  assert.equal((await one('profile','PATCH',{name:'x'.repeat(17000)})).status,413);
  assert.equal((await one('profile','PATCH',[])).status,400);
});

test('orders use server prices, preserve unknowns, isolate users and deduplicate concurrent retries', async () => {
  const one=client(),two=client(); await register(one);await register(two);
  const products=(await one('products')).body.products;
  const priced=products.find(p=>p.price.amount!==null),unknown=products.find(p=>p.price.amount===null);
  assert.equal((await one('orders','POST',{}, {'Idempotency-Key':randomUUID()})).status,400);
  await one('state','PUT',{cart:[{id:priced.id,quantity:2},{id:unknown.id,quantity:1}],favorites:[]});
  const key=randomUUID();
  const results=await Promise.all(Array.from({length:3},()=>one('orders','POST',{price:0,totals:{USD:0}},{'Idempotency-Key':key})));
  for(const result of results) assert.ok([200,201].includes(result.status), JSON.stringify(result));
  assert.equal(new Set(results.map(x=>x.body.order.id)).size,1);
  const order=results[0].body.order;
  assert.equal(order.totals[priced.price.currency],Math.round(priced.price.amount*200)/100);
  assert.equal(order.items.find(x=>x.id===unknown.id).price,null);
  assert.equal((await one('account')).body.orders.length,1);
  assert.equal((await two('account')).body.orders.length,0);
  assert.equal((await one('orders','POST',{})).status,400);
});

test('unknown routes and methods return JSON, login attempts are limited', async () => {
  const call=client();
  assert.equal((await call('missing')).status,404);
  assert.equal((await call('products','POST',{})).status,405);
  const email=`${randomUUID()}@example.test`;
  for(let i=0;i<10;i++) assert.equal((await call('login','POST',{email,password})).status,401);
  assert.equal((await call('login','POST',{email,password})).status,429);
});
