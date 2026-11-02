import React from 'react';
import {createRoot} from 'react-dom/client';
import '../app/mouvra.css';
import '../app/responsive.css';
import '../app/experience.css';
import {phpBackend} from '../lib/runtime';
import {replaceCatalog,type Product} from '../lib/products';
import {loadCatalog} from '../lib/catalog-loader.mts';

const root=createRoot(document.getElementById('root')!);
async function boot() {
 root.render(<main className="frame page" aria-live="polite"><h1>MOUVRA</h1><p>Загружаем коллекцию…</p></main>);
 try {
  if(phpBackend){const catalog=await loadCatalog();replaceCatalog({products:catalog.products as Product[],verifiedAt:catalog.verifiedAt});}
  // Import after catalogue loading: derived collections and validation IDs use database data.
  const [{StoreProvider},{default:Storefront}]=await Promise.all([import('../components/store'),import('../components/Storefront')]);
  root.render(<StoreProvider><Storefront/></StoreProvider>);
 }catch{
  root.render(<main className="frame page"><h1>Коллекция временно недоступна</h1><p role="alert">Не удалось загрузить данные. Проверьте подключение и попробуйте ещё раз.</p><button className="button primary" onClick={()=>void boot()}>Повторить</button>{phpBackend&&<p><a href="/api/health" target="_blank" rel="noreferrer">Проверить состояние сервера</a></p>}</main>);
 }
}
void boot();
