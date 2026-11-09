import { env } from 'cloudflare:workers';
import { accountApi, type Database } from '@/lib/account';
import { apiCatalog } from '@/lib/products';
export const dynamic='force-dynamic';
async function handler(request:Request) {
 if(!env.DB)return Response.json({error:'Сервис отзывов временно недоступен.'},{status:503});
 return accountApi(request,env.DB as unknown as Database,apiCatalog);
}
export {handler as PATCH,handler as DELETE};
