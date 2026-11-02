import test from 'node:test';
import assert from 'node:assert/strict';
import {cartTotals} from '../lib/cart-totals.mts';
test('cart totals keep currencies separate and omit unknown prices',()=>{
 assert.deepEqual(cartTotals([{quantity:2,price:{amount:19.99,currency:'USD'}},{quantity:1,price:{amount:10,currency:'EUR'}},{quantity:1,price:{amount:null,currency:'USD'}}]),{USD:39.98,EUR:10});
 assert.deepEqual(cartTotals([{quantity:1,price:{amount:null,currency:null}}]),{});
});
