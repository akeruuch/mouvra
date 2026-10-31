import {readFileSync,writeFileSync} from 'node:fs';
for (const id of ['logitech','viper','deathadder','zowie','pulsar','lamzu']) {
 const s=readFileSync(new URL(`./raw/${id}.html`,import.meta.url),'utf8');
 const all=[...s.matchAll(/(?:https?:)?(?:\\?\/){2}[^\s"<>]+/g)].map(x=>x[0].replaceAll('\\/','/').replaceAll('&amp;','&'));
 const urls=[...new Set(all.filter(x=>/\.(?:png|jpg|webp|glb|usdz)/i.test(x)))];
 writeFileSync(new URL(`./raw/${id}-assets.txt`,import.meta.url),urls.join('\n'));
 console.log('\n'+id+' price/model snippets:');
 console.log([...s.matchAll(/.{0,70}(?:priceCurrency|"price"\s*:|\.glb|productDimensions|batteryLife|battery life|Huano|26000|128mm|55g).{0,180}/gi)].map(x=>x[0]).slice(0,25).join('\n'));
}
