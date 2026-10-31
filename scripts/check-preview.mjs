import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out=process.env.PREVIEW_OUTPUT_DIR || 'outputs/preview';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>localStorage.setItem('mouvra:v1:compare','[]'));
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:5173';const report=[];
async function check(name,fn){await fn();report.push(name);console.log('PASS',name);}
async function loaded(selector){await page.locator(selector+' [data-loaded="true"]').waitFor({timeout:45000});}
try {
await page.goto(base,{waitUntil:'networkidle'});await loaded('.hero-live-model');
await check('carousel changes actual GLB, wraps and supports pause',async()=>{
 const first=await page.locator('.hero-live-model model-viewer').evaluate(e=>e.src);
 await page.getByRole('button',{name:'Следующая 3D-модель'}).click();await loaded('.hero-live-model');
 assert.notEqual(await page.locator('.hero-live-model model-viewer').evaluate(e=>e.src),first);
 await page.locator('.hero-live-model').getByRole('button',{name:'Остановить вращение'}).click();
 assert.equal(await page.locator('.hero-live-model model-viewer').evaluate(e=>e.autoRotate),false);
 await page.getByRole('button',{name:'Следующая 3D-модель'}).click();await loaded('.hero-live-model');
 await page.getByRole('button',{name:'Следующая 3D-модель'}).click();await loaded('.hero-live-model');
 assert.equal(await page.locator('.hero-live-model model-viewer').evaluate(e=>e.src),first);
});
await check('secondary scenes load on scroll and share equal frames',async()=>{
 await page.locator('.live-profile').scrollIntoViewIfNeeded();await loaded('.live-profile');
 await page.locator('.compare-live-pair').scrollIntoViewIfNeeded();await page.locator('.compare-live-pair [data-loaded="true"]').nth(1).waitFor({timeout:45000});
 const boxes=await page.locator('.compare-live-pair .mouse-scene').evaluateAll(es=>es.map(e=>({w:e.clientWidth,h:e.clientHeight})));
 assert.deepEqual(boxes[0],boxes[1]);
 await page.screenshot({path:out+'/mouvra-home-desktop.png',fullPage:true});
});
await check('navigation animates and restores top and keyboard focus',async()=>{
 await page.evaluate(()=>{window.__routeAnimations=[];const original=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.id==='main')window.__routeAnimations.push(args[1]);return original.apply(this,args);};});
 await page.locator('.compare-feature-copy').getByRole('link',{name:'Сравнить модели'}).click();
 await page.locator('.comparison-table').waitFor();await page.waitForFunction(()=>document.activeElement?.id==='main',undefined,{timeout:5000});
 assert.equal(await page.evaluate(()=>scrollY),0);
 assert.ok(await page.evaluate(()=>window.__routeAnimations.some(x=>x.duration===130)),'exit transition did not run');
});
await check('comparison prefilled after saved empty state; search and four-model cap',async()=>{
 assert.equal(await page.locator('.comparison-table thead th').count(),3);
 await page.getByRole('textbox',{name:'Найти мышь для сравнения'}).fill('Attack Shark');
 const choices=page.locator('.compare-picker button');assert.equal(await choices.count(),6);
 await choices.nth(0).click();await choices.nth(1).click();await choices.nth(2).click();
 assert.equal(await page.locator('.comparison-table thead th').count(),5);
 assert.match(await page.getByRole('status').innerText(),/четырёх/);
 await page.getByRole('checkbox',{name:'Только различия'}).check();
 assert.ok(await page.locator('.comparison-table tbody tr').count()>4);
});
await page.locator('.desktop-nav').getByRole('link',{name:'Как выбрать'}).click();await page.locator('.grip-visual').waitFor();
await check('grip and hand size update displayed mouse and recommendations',async()=>{
 const before=await page.locator('.grip-caption strong').innerText();
 await page.getByRole('button',{name:/Ладонный/}).click();assert.notEqual(await page.locator('.grip-caption strong').innerText(),before);
 const palm=await page.locator('.grip-caption strong').innerText();
 await page.getByRole('button',{name:/Пальцевой/}).click();assert.notEqual(await page.locator('.grip-caption strong').innerText(),palm);
 await page.getByLabel('Крупная',{exact:true}).check();assert.match(await page.locator('.grip-caption strong').innerText(),/Atlantis/);
 await page.getByRole('button',{name:'Показать отправные варианты'}).click();assert.equal(await page.locator('.guide-results .product-card').count(),2);
});
await page.locator('.desktop-nav').getByRole('link',{name:'О MOUVRA'}).click();await page.locator('.about-image').scrollIntoViewIfNeeded();await loaded('.about-image');
await check('about model stays within its section',async()=>{
 const geometry=await page.locator('.about-image').evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight}));assert.equal(geometry.height,geometry.scroll);
 await page.screenshot({path:out+'/mouvra-about-desktop.png',fullPage:true});
});
await page.goto(base+'/catalog',{waitUntil:'networkidle'});
await check('catalog searches rare brands and hides unknown weight from light filter',async()=>{
 assert.equal(await page.locator('.product-card').count(),30);
 await page.getByRole('combobox',{name:'Бренд',exact:true}).selectOption('Attack Shark');assert.equal(await page.locator('.product-card').count(),6);
 await page.getByRole('combobox',{name:'Бренд',exact:true}).selectOption('Zaopin');assert.equal(await page.locator('.product-card').count(),2);
 await page.getByRole('button',{name:'Легче 60 г',exact:true}).click();assert.equal(await page.locator('.product-card').count(),0);
 await page.getByRole('button',{name:'Сбросить фильтры'}).click();
});
await page.goto(base+'/product/zaopin-z1',{waitUntil:'networkidle'});
await check('incomplete specs render explicit unknowns instead of null/NaN/zero',async()=>{
 const text=await page.locator('main').innerText();assert.ok(!/\bnull\b|NaN/.test(text));assert.match(text,/Не указан/);assert.match(text,/Наличие уточняйте/);
});
for(const width of [360,390,768]) {
 await page.setViewportSize({width,height:844});await page.goto(base+'/catalog',{waitUntil:'networkidle'});
 await check('mobile catalog fits '+width+'px',async()=>{
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  const box=await page.locator('.product-image-link img').first().boundingBox();assert.ok(box.width>=width*.4&&box.height>=260);
  await page.locator('.product-card').first().scrollIntoViewIfNeeded();
  if(width===390)await page.screenshot({path:out+'/mouvra-catalog-mobile.png'});
  await page.getByRole('button',{name:'Открыть меню',exact:true}).click();await page.getByRole('navigation',{name:'Мобильная навигация'}).getByRole('link',{name:'Как выбрать'}).click();await page.locator('.grip-visual').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
 });
}
await page.setViewportSize({width:390,height:844});await page.goto(base,{waitUntil:'networkidle'});await loaded('.hero-live-model');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.screenshot({path:out+'/mouvra-home-mobile.png',fullPage:true});
await check('reduced motion disables automatic rotation',async()=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.hero-live-model model-viewer')?.autoRotate===false);
 assert.equal(await page.locator('.hero-live-model').getByRole('button',{name:'Остановить вращение'}).count(),0);
});
assert.deepEqual(errors,[]);fs.writeFileSync(out+'/browser-checks.json',JSON.stringify({checks:report,errors},null,2));
console.log('ALL_CHECKS_PASSED',report.length);
} catch(error){await page.screenshot({path:out+'/failure.png',fullPage:true});console.error(error);process.exitCode=1;}
finally{await browser.close();}


