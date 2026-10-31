import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const initial = JSON.parse(readFileSync(new URL('./assets-initial.json', import.meta.url), 'utf8'));
initial.push({name:'pulsar-x2v2-white.png',url:'https://www.pulsar.gg/cdn/shop/products/X2V2gamingmouse_medium_White_Top_b60ca055-6bc8-440a-84bb-65f8779774dc-109345.png?v=1758619152'});
const assets = initial.map(asset => {
 const bytes=readFileSync(new URL('../public/images/'+asset.name,import.meta.url));
 const item={...asset,path:'/images/'+asset.name,verifiedAt:'2026-10-31',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 if(asset.name.endsWith('.png')) {
   if(bytes.toString('hex',0,8)!=='89504e470d0a1a0a') throw new Error('Not PNG: '+asset.name);
   item.width=bytes.readUInt32BE(16);item.height=bytes.readUInt32BE(20);item.colorType=bytes[25];
 } else if(asset.name.endsWith('.glb')) {
   if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(8)!==bytes.length) throw new Error('Invalid GLB: '+asset.name);
   const scene=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
   item.gltfVersion=bytes.readUInt32LE(4);item.meshCount=scene.meshes.length;
   item.externalUris=[...(scene.images||[]),...(scene.buffers||[])].filter(x=>x.uri).map(x=>x.uri);
 }
 return item;
});
writeFileSync(new URL('./assets.json',import.meta.url),JSON.stringify(assets,null,2)+'\n');
console.table(assets.map(({name,bytes,width,height,meshCount})=>({name,bytes,width,height,meshCount})));
