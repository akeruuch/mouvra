export function cartTotals(lines:{quantity:number;price:{amount:number|null;currency:string|null}}[]):Record<string,number> {
 const minor:Record<string,number>={};
 for(const {price,quantity} of lines)if(price.amount!==null){const currency=price.currency||'USD';minor[currency]=(minor[currency]||0)+Math.round(price.amount*100)*quantity;}
 return Object.fromEntries(Object.entries(minor).map(([currency,value])=>[currency,value/100]));
}
