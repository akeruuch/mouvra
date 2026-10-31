'use client';

import {useEffect, useRef, useState, type DetailedHTMLProps, type HTMLAttributes} from 'react';
import {Pause, Play, RotateCcw} from 'lucide-react';
import type {Product} from '@/lib/products';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- React custom-element typing uses JSX augmentation.
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string; alt: string; exposure?: string; loading?: string;
      };
    }
  }
}

type Props = {product: Product; orbit?: string; autoRotate?: boolean; compact?: boolean};

// Remount when the model changes so pending load events cannot leak between slides.
export function ModelView(props: Props) {
  return <MouseScene key={props.product.id} {...props}/>;
}

function MouseScene({product, orbit = '35deg 60deg 105%', autoRotate = true, compact = false}: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(true);

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(motion.matches);
    const updateVisibility = () => setForeground(!document.hidden);
    updateMotion(); updateVisibility();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); preload.disconnect(); }
    }, {rootMargin: '160px'});
    const visibility = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (stage.current) { preload.observe(stage.current); visibility.observe(stage.current); }
    return () => {
      preload.disconnect(); visibility.disconnect();
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!near || !product.model3d) return;
    let alive = true;
    import('@google/model-viewer').then(() => { if (alive) setReady(true); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [near, product.model3d]);

  useEffect(() => {
    const element = viewer.current;
    if (!ready || !element) return;
    const timeout = setTimeout(() => setFailed(true), 30000);
    const onLoad = () => { clearTimeout(timeout); setFailed(false); setLoaded(true); };
    const onError = () => { clearTimeout(timeout); setFailed(true); };
    element.addEventListener('load', onLoad);
    element.addEventListener('error', onError);
    if ((element as HTMLElement & {loaded?: boolean}).loaded) onLoad();
    return () => {
      clearTimeout(timeout);
      element.removeEventListener('load', onLoad);
      element.removeEventListener('error', onError);
    };
  }, [ready]);

  const spinning = autoRotate && !paused && !reduced && visible && foreground;
  return <div ref={stage} className={`model-stage mouse-scene ${compact ? 'scene-compact' : ''}`} data-model={product.id} data-loaded={loaded}>
    {ready && product.model3d && <model-viewer
      ref={viewer} src={product.model3d.path}
      alt={`3D-модель ${product.brand} ${product.name}. Поворачивайте мышью, касанием или стрелками.`}
      camera-controls touch-action="pan-y" disable-zoom
      interaction-prompt="none" auto-rotate={spinning || undefined}
      auto-rotate-delay="1800" rotation-per-second="8deg"
      camera-orbit={orbit} field-of-view="30deg"
      shadow-intensity="0.65" shadow-softness="1"
      environment-image="neutral" exposure="1" loading="eager"
      style={{width: '100%', height: '100%', opacity: loaded && !failed ? 1 : 0}}
    />}
    {(!loaded || failed) && <div className="scene-poster">
      <img src={product.image} alt={`${product.brand} ${product.name}`} loading={near ? 'eager' : 'lazy'}/>
      {product.model3d && <span role="status">{failed ? '3D недоступно — показана фотография' : near ? 'Готовим 3D…' : 'Официальная 3D-модель'}</span>}
    </div>}
    {loaded && !failed && <div className="scene-controls">
      {!compact && <span><RotateCcw size={14}/> Вращайте касанием</span>}
      {autoRotate && !reduced && <button className="scene-pause" onClick={() => setPaused(!paused)} aria-label={paused ? 'Продолжить вращение' : 'Остановить вращение'} aria-pressed={paused}>
        {paused ? <Play size={14}/> : <Pause size={14}/>}
      </button>}
    </div>}
  </div>;
}
