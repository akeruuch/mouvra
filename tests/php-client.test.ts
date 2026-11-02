import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../lib/catalog-loader.mts';

test('PHP catalogue loader uses server data and rejects empty or failed responses', async()=>{
 const product={id:'db-only',name:'Database mouse',brand:'Test',price:{amount:null,currency:'USD'}};
 const result=await loadCatalog(async()=>Response.json({products:[product],verifiedAt:'2026-11-02'}));
 assert.equal(result.products[0].id,'db-only');
 await assert.rejects(()=>loadCatalog(async()=>Response.json({error:'offline'},{status:503})),/Каталог/);
 await assert.rejects(()=>loadCatalog(async()=>Response.json({products:[],verifiedAt:'2026-11-02'})),/Каталог/);
 await assert.rejects(()=>loadCatalog(async()=>Response.json({products:[null]})),/Каталог/);
});
