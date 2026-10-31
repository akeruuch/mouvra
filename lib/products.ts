import research from '../research/mice.json';
export const products = research.products;
export type Product = typeof products[number];
export const verifiedAt = research.verifiedAt;
export const byId = (id: string) => products.find(p => p.id === id);
export const money = (amount: number | null, currency: string | null = 'USD') => amount === null ? 'Цена не указана' : new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
export const number = (value: number) => new Intl.NumberFormat('ru-RU').format(value);
export const availability = (p: Product) => p.price.availability === 'in_stock' ? 'На сайте производителя' : p.price.availability === 'discontinued' ? 'Архивная модель' : 'Нет в наличии у производителя';
export const shape = (p: Product) => p.id === 'deathadder-v3-pro' ? 'Эргономичная' : 'Симметричная';
export const descriptions: Record<string,string> = {
 'superlight-2':'Знакомая форма. Почти невесомое движение. Универсальная симметричная мышь с сенсором HERO 2 и гибридными переключателями LIGHTFORCE.',
 'viper-v3-pro':'Низкая масса и точная настройка. Симметричный корпус с выраженной опорой и комплектным приёмником HyperPolling 8000 Гц.',
 'deathadder-v3-pro':'Форма, которая следует за ладонью. Эргономичный корпус для правой руки, оптические переключатели и беспроводное соединение HyperSpeed.',
 'zowie-u2':'Продуманная опора для когтевого хвата. Асимметричные изгибы боковин и настройка основных параметров прямо на корпусе.',
 'pulsar-x2v2':'Компактная форма с низкой спинкой. Широкая середина для уверенного когтевого и пальцевого хвата, оптические переключатели и сенсор PAW3395.',
 'atlantis-og-v2-pro':'Выразительная геометрия и открытое основание. Механические Huano и поддержка 4K с дополнительным приёмником.'
};
export const apiCatalog=products.map(p=>({id:p.id,name:`${p.brand} ${p.name}`,price:p.price.amount,currency:p.price.currency||'USD'}));
