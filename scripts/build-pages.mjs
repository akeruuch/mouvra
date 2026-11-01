import {build} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';

await build({configFile:'vite.pages.config.ts'});
const output='dist/pages';
const entry=await readFile(join(output,'index.html'));
const catalog=JSON.parse(await readFile('research/mice.json','utf8'));
const routes=['catalog','compare','cart','account','guide','about','sources','privacy',...catalog.products.map(({id})=>`product/${id}`)];
for(const route of routes){
  const folder=join(output,route);
  await mkdir(folder,{recursive:true});
  await writeFile(join(folder,'index.html'),entry);
}
await writeFile(join(output,'404.html'),entry);
await writeFile(join(output,'.nojekyll'),'');
const assets=join(output,'assets');
const {readdir}=await import('node:fs/promises');
for(const file of await readdir(assets)){
  if(!file.endsWith('.js'))continue;
  const path=join(assets,file);
  const source=await readFile(path,'utf8');
  await writeFile(path,source.replace(/([`"'])\/(images|fonts)\//g,'$1/mouvra/$2/'));
}
console.log(`Prepared ${routes.length+1} GitHub Pages routes.`);
