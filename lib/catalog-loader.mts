type CatalogRecord={id:string;name:string;brand:string;price:{amount:number|null;currency:string|null}};
export async function loadCatalog(fetcher:typeof fetch=fetch):Promise<{products:CatalogRecord[];verifiedAt:string}> {
 const response=await fetcher('/api/products',{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Каталог недоступен. Проверьте подключение к серверу.');
 const data=await response.json() as {products:CatalogRecord[];verifiedAt:string}|null;
 if(!data||!Array.isArray(data.products)||!data.products.length||typeof data.verifiedAt!=='string'||!data.products.every((p:CatalogRecord)=>p&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.brand==='string'&&p.price&&(p.price.amount===null||typeof p.price.amount==='number')))throw new Error('Каталог ещё не готов или содержит некорректные данные.');
 return data;
}
