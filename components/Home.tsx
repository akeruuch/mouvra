'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, ArrowDown, ArrowLeft, ArrowRight, MoveUpRight} from 'lucide-react';
import {products, number, money} from '@/lib/products';
import {ModelView} from './MouseScene';

const sculptures = products.filter(product => product.model3d);

export default function Home() {
  const [index, setIndex] = useState(0);
  const hero = sculptures[index];
  const featured = [products[1], products[4], products.find(p => /attack shark/i.test(p.brand)) || products[5]];
  const comparison = [products[0], products[2]];
  return <>
    <section className="hero frame">
      <div className="hero-copy">
        <h1>Искусство<br/>точности.</h1>
        <p>Игровые мыши, в которых<br/>каждое движение — ваше.</p>
        <Link href="/catalog" className="button primary">Найти свою мышь<ArrowUpRight size={19}/></Link>
        <div className="hero-small"><span className="tiny-line"/>Форма. Ощущение. Контроль.</div>
      </div>
      <div className="hero-object hero-showroom">
        <span className="hero-background-word" aria-hidden="true">move.</span>
        <div className="hero-live-model" key={hero.id}><ModelView product={hero}/></div>
        <div className="showroom-selector">
          <div className="showroom-name" aria-live="polite"><span>{hero.brand}</span><Link href={`/product/${hero.id}`}>{hero.name}<ArrowUpRight size={15}/></Link><small>{hero.color} · {number(hero.weightG)} г</small></div>
          <div className="showroom-arrows"><button className="round-link" aria-label="Предыдущая 3D-модель" onClick={() => setIndex((index + sculptures.length - 1) % sculptures.length)}><ArrowLeft size={19}/></button><span>{index + 1} / {sculptures.length}</span><button className="round-link" aria-label="Следующая 3D-модель" onClick={() => setIndex((index + 1) % sculptures.length)}><ArrowRight size={19}/></button></div>
        </div>
      </div>
      <div className="hero-bottom"><a href="#collection" className="scroll-cue"><span className="round-outline"><ArrowDown size={17}/></span>Знакомство с коллекцией</a><p>Для тех, кто чувствует разницу.</p><span className="hero-edition">Collection / 2026</span></div>
    </section>
    <div className="brand-strip frame" aria-label="Бренды в коллекции"><span className="brand-strip-label">Разные формы.<br/>Один фокус.</span><span className="brand-logitech">logitech <b>G</b></span><span className="brand-razer">RAZER</span><span className="brand-zowie">ZOWIE</span><span className="brand-pulsar">pulsar.</span><span className="brand-lamzu">ATTACK SHARK</span></div>
    <section id="collection" className="collection-section frame">
      <div className="section-heading"><div><h2>Найдите своё<br/>продолжение.</h2><p>Лёгкие, точные и очень разные.<br/>Начните с той, которая ближе вам.</p></div><Link className="text-link" href="/catalog">Вся коллекция <span className="small-count">{products.length}</span><ArrowUpRight size={20}/></Link></div>
      <div className="editorial-collection">
        {featured.map((p, i) => <Link href={`/product/${p.id}`} className={`collection-piece piece-${i}`} key={p.id}>
          <div className="piece-heading"><span>{['Для быстрых решений', 'Ближе к кончикам пальцев', 'За пределами привычного'][i]}</span><ArrowUpRight size={24}/></div>
          <div className="piece-image"><img src={p.image} alt={`${p.brand} ${p.name}`} loading="lazy"/></div>
          <div className="piece-caption"><div><span>{p.brand}</span><h3>{p.name}</h3></div><p>{number(p.weightG)} г<small>{money(p.price.amount, p.price.currency)}</small></p></div>
        </Link>)}
      </div>
      <p className="section-footnote">Характеристики и изображения — из официальных источников. Неизвестные цены отмечены отдельно. <Link href="/sources">Проверить данные</Link></p>
    </section>
    <section className="feel-section frame">
      <div className="feel-visual live-profile"><ModelView product={products[3]} orbit="70deg 78deg 110%"/><span>Каждый изгиб имеет значение.</span></div>
      <div className="feel-copy"><h2>Не просто цифры.<br/>Ваше ощущение.</h2><p>Сенсор важен. Но именно форма, вес и положение пальцев определяют, насколько естественно мышь лежит в руке.</p><p>Рассмотрите боковины ZOWIE U2 в движении. Затем найдите форму под свой хват.</p><Link href="/guide" className="button secondary">Подобрать по хвату<ArrowUpRight size={18}/></Link></div>
    </section>
    <section className="compare-feature frame">
      <div className="compare-feature-copy"><h2>Разница<br/>в деталях.</h2><p>Симметрия или опора под ладонь? Две формы в одном ракурсе. Поверните и сравните.</p><Link className="button light" href="/compare">Сравнить модели<ArrowUpRight size={19}/></Link></div>
      <div className="compare-preview">
        <div className="compare-live-pair">{comparison.map(p => <div key={p.id}><ModelView product={p} orbit="-25deg 48deg 110%" compact/><span>{p.name}</span></div>)}</div>
        <div className="preview-spec-row"><span>{number(comparison[0].weightG)} г</span><span>Вес</span><span>{number(comparison[1].weightG)} г</span></div>
        <div className="preview-spec-row"><span>Симметричная</span><span>Форма</span><span>Эргономичная</span></div>
        <p className="comparison-scale-note">Единый ракурс. Визуальный масштаб нормализован.</p>
      </div>
    </section>
    <section className="final-note frame"><h2>Меньше случайного.<br/>Больше вашего.</h2><div><p>MOUVRA собирает модели, которые интересно рассмотреть. С настоящими изображениями, официальными характеристиками и пространством для собственного выбора.</p><Link href="/about" className="text-link">Знакомство с MOUVRA<ArrowUpRight size={20}/></Link></div><MoveUpRight className="final-arrow" strokeWidth={.6} aria-hidden="true"/></section>
  </>;
}
