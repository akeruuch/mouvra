'use client';
import {useState} from 'react';
import Link from 'next/link';
import {X,Plus,ArrowUpRight,Check} from 'lucide-react';
import {products,money,number,availability,type Product} from '@/lib/products';
import {useStore} from './store';
import {Empty} from './ui';
export default function Compare(){const s=useStore();const [only,setOnly]=useState(false);const selected=s.compare.map(id=>products.find(p=>p.id===id)).filter((p):p is Product=>!!p);
 const rows:{label:string;get:(p:Product)=>string}[]=[
 {label:'Официальная цена',get:p=>money(p.price.amount,p.price.currency)},
 {label:'Доступность',get:p=>availability(p)},
 {label:'Вес',get:p=>`${number(p.weightG)} г`},
 {label:'Сенсор',get:p=>p.sensor},
 {label:'Максимум DPI',get:p=>number(p.dpiMax)},
 {label:'Опрос в комплекте',get:p=>`${number(p.pollingHzIncluded)} Гц`},
 {label:'Максимум опроса',get:p=>`${number(p.pollingHzMax)} Гц`},
 {label:'Длина',get:p=>`${p.dimensionsMm.length} мм`},{label:'Ширина',get:p=>`${p.dimensionsMm.width} мм`},{label:'Высота',get:p=>`${p.dimensionsMm.height} мм`},
 {label:'Автономность¹',get:p=>p.batteryHours?`До ${p.batteryHours} ч`:'Не указана'},
 {label:'Скорость',get:p=>p.speedIps?`${p.speedIps} IPS`:'Не указана'},
 {label:'Ускорение',get:p=>p.accelerationG?`${p.accelerationG} G`:'Не указано'},
 {label:'Переключатели',get:p=>p.switches||'Не указаны'},
 {label:'Форма',get:p=>p.shape},
 {label:'Подключение',get:p=>p.connectivity.join(', ')},
 {label:'Цвет',get:p=>p.color},
 ];
 const visible=only&&selected.length>1?rows.filter(row=>new Set(selected.map(row.get)).size>1):rows;
 return <div className="compare-page frame page"><div className="page-intro"><h1>Сравните.<br/>Почувствуйте разницу.</h1><p>Меньше предположений.<br/>Больше фактов о вашей будущей мыши.</p></div><div className="compare-picker"><p>Добавьте до четырёх моделей</p><div>{products.map(p=><button key={p.id} className={s.compare.includes(p.id)?'selected':''} onClick={()=>s.toggleCompare(p.id)} aria-pressed={s.compare.includes(p.id)}>{s.compare.includes(p.id)?<Check size={15}/>:<Plus size={15}/>} {p.name}</button>)}</div></div>{selected.length?<><div className="compare-toolbar"><span>{selected.length} из 4 моделей</span><label className="switch-label"><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/><span className="switch-track"/>Только различия</label></div><div className="comparison-scroll" tabIndex={0} aria-label="Таблица сравнения, прокрутите по горизонтали для просмотра всех моделей"><table className="comparison-table"><caption className="sr-only">Сравнение характеристик игровых мышей</caption><thead><tr><th scope="col">В деталях</th>{selected.map(p=><th key={p.id} scope="col"><button className="icon-button remove-compare" onClick={()=>s.toggleCompare(p.id)} aria-label={`Убрать ${p.name} из сравнения`}><X size={16}/></button><img src={p.image} alt={p.name}/><span className="muted">{p.brand}</span><Link href={`/product/${p.id}`}>{p.name}<ArrowUpRight size={15}/></Link><small>{p.variant}</small></th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.label}><th scope="row">{row.label}</th>{selected.map(p=><td key={p.id}>{row.get(p)}</td>)}</tr>)}<tr><th scope="row">Официальный источник</th>{selected.map(p=><td key={p.id}><a href={p.sources[0]} target="_blank" rel="noreferrer" className="text-link">Производитель<ArrowUpRight size={15}/></a></td>)}</tr></tbody></table></div><div className="comparison-notes"><h2>Цифры с контекстом.</h2><p>¹ Время работы зависит от частоты опроса и условий теста. Максимальная частота может требовать отдельного приёмника. Цены указаны в валюте производителя на 31.10.2026.</p>{selected.map(p=><details key={p.id}><summary>{p.brand} {p.name}: комплектация и условия</summary><p>{p.pollingNote}</p><p>{p.batteryNote}</p><p>{p.weightNote}</p><p>{p.price.note}</p></details>)}</div></>:<Empty title="С чего начнём сравнение?" text="Выберите модели выше или добавьте их из коллекции."/>}</div>
}
