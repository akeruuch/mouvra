'use client';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {Check, AlertCircle, ArrowUpRight} from 'lucide-react';
import Link from 'next/link';
import Home from './Home';
import Catalog from './Catalog';
import Compare from './Compare';
import Product from './Product';
import Account, {Cart} from './Account';
import {About, Guide, Sources, Privacy} from './Editorial';
import {Header, Footer, AuthDialog, Empty} from './ui';
import {useStore} from './store';

export default function Storefront() {
  const requestedPath = usePathname() || '/';
  const [path, setPath] = useState(requestedPath);
  const main = useRef<HTMLElement>(null);
  const previous = useRef(path);
  const s = useStore();

  useEffect(() => {
    if (requestedPath === path) return;
    let active = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = main.current?.animate(
      [{opacity: 1}, {opacity: 0, transform: reduced ? 'none' : 'translateY(-6px)'}],
      {duration: reduced ? 0 : 130, easing: 'ease-in', fill: 'forwards'},
    );
    const finish = () => { if (active) setPath(requestedPath); };
    if (animation) animation.finished.then(finish).catch(() => {});
    else queueMicrotask(finish);
    return () => { active = false; animation?.cancel(); };
  }, [requestedPath, path]);

  useEffect(() => {
    if (previous.current !== path) {
      window.scrollTo({top: 0, behavior: 'instant'});
      main.current?.focus({preventScroll: true});
      previous.current = path;
    }
    const title = path.startsWith('/product') ? 'Модель' : ({'/catalog':'Коллекция','/compare':'Сравнение','/cart':'Корзина','/account':'Личный кабинет','/guide':'Гид по выбору','/sources':'Источники','/about':'О MOUVRA','/privacy':'Конфиденциальность'} as Record<string,string>)[path];
    document.title = title ? `${title} — MOUVRA` : 'MOUVRA — искусство точности';
  }, [path]);

  const page = path==='/' ? <Home/> : path==='/catalog' ? <Catalog/> : path==='/compare' ? <Compare/> : path.startsWith('/product/') ? <Product key={path} id={path.split('/')[2]}/> : path==='/cart' ? <Cart/> : path==='/account' ? <Account/> : path==='/guide' ? <Guide/> : path==='/about' ? <About/> : path==='/sources' ? <Sources/> : path==='/privacy' ? <Privacy/> : <div className="frame page"><Empty title="Здесь пока пусто" text="Страница не найдена. Продолжите знакомство с коллекцией."/></div>;
  return <><Header/><main ref={main} id="main" className="page-transition" key={path} tabIndex={-1}>{page}</main><Footer/><AuthDialog/>{s.toast && <div className="toast" role="status"><Check size={18}/>{s.toast}</div>}{s.syncError && <div className="sync-error" role="alert"><AlertCircle size={17}/>{s.syncError}<button onClick={s.retry}>Повторить</button></div>}{s.compare.length>0 && path==='/catalog' && <Link href="/compare" className="floating-compare">Сравнить модели<span>{s.compare.length}</span><ArrowUpRight size={18}/></Link>}</>;
}
