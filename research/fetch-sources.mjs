import {writeFile} from 'node:fs/promises';
const sources={
 logitech:'https://www.logitechg.com/en-us/shop/p/pro-x2-superlight-wireless-mouse',
 viper:'https://www.razer.com/gaming-mice/razer-viper-v3-pro',
 deathadder:'https://www.razer.com/gaming-mice/razer-deathadder-v3-pro',
 zowie:'https://zowie.benq.com/en-sg/mouse/u2.html',
 pulsar:'https://www.pulsar.gg/products/x2v2-gaming-mouse',
 lamzu:'https://lamzu.com/products/lamzu-atlantis-og-v2-pro-gaming-mouse'
};
await Promise.all(Object.entries(sources).map(async ([id,url])=>{let r=await fetch(url);let s=await r.text();await writeFile(new URL(`./raw/${id}.html`,import.meta.url),s);console.log(id,r.status,s.length);}));
