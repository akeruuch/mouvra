'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {api,useStore,type Review,type ReviewList} from './store';
import {staticPages} from '@/lib/runtime';
import './reviews.css';

export default function Reviews({productId}:{productId:string}) {
 const s=useStore();
 const [data,setData]=useState<ReviewList|null>(null);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [editing,setEditing]=useState<Review|null>(null);
 const [rating,setRating]=useState(5);
 const [comment,setComment]=useState('');
 const [busy,setBusy]=useState(false);
 const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  if(staticPages)return;
  let active=true;
  api(`reviews?productId=${encodeURIComponent(productId)}`).then(result=>{
   if(active)setData(result);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Не удалось загрузить отзывы.');});
  return()=>{active=false};
 },[productId,revision,s.user?.id]);
 const own=data?.reviews.find(r=>r.userId===s.user?.id);
 const canWrite=!!s.user&&!s.user.demo;
 function refresh(){setError('');setRevision(n=>n+1);}
 function cancel(){setEditing(null);setComment('');setRating(5);}
 async function submit(event:FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const result=editing?await s.updateReview(editing.id,rating,comment.trim()):await s.createReview(productId,rating,comment.trim());
   setData(old=>{
    const reviews=[result.review,...(old?.reviews||[]).filter(r=>r.id!==result.review.id)];
    return {reviews,count:reviews.length,average:Math.round(reviews.reduce((total,r)=>total+r.rating,0)/reviews.length*10)/10};
   });
   setNotice(editing?'Отзыв обновлён.':'Отзыв опубликован.');cancel();refresh();
  }catch(e){setError(e instanceof Error?e.message:'Не удалось сохранить отзыв.');}
  finally{setBusy(false);}
 }
 async function remove(id:string){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{await s.deleteReview(id);setData(old=>{
   const reviews=(old?.reviews||[]).filter(r=>r.id!==id);
   return {reviews,count:reviews.length,average:reviews.length?Math.round(reviews.reduce((total,r)=>total+r.rating,0)/reviews.length*10)/10:0};
  });setConfirmDelete(null);cancel();setNotice('Отзыв удалён.');refresh();}
  catch(e){setError(e instanceof Error?e.message:'Не удалось удалить отзыв.');}
  finally{setBusy(false);}
 }
 if(staticPages)return <div className="reviews-panel"><h2>Отзывы</h2><p>Отзывы доступны в полной версии магазина. В этой демонстрации публикация отзывов отключена.</p></div>;
 return <div className="reviews-panel">
  <header className="reviews-heading"><h2>Отзывы покупателей</h2>{data&&<p>{data.count?`${data.average.toFixed(1)} из 5 · Отзывов: ${data.count}`:'Пока нет отзывов'}</p>}</header>
  {error&&<div role="alert" className="review-error">{error} <button type="button" className="text-link" onClick={refresh} disabled={busy}>Повторить загрузку</button></div>}
  <p role="status" aria-live="polite">{notice}</p>
  {!data&&!error&&<p role="status">Загружаем отзывы…</p>}
  {!canWrite?<p>Чтобы поделиться впечатлениями, <button className="text-link" onClick={()=>s.setAuth('login')}>войдите</button> или <button className="text-link" onClick={()=>s.setAuth('register')}>зарегистрируйтесь</button>.</p>:data&&(!own||editing?.userId===s.user?.id)&&<form className="review-form" onSubmit={submit}>
   <h3>{editing?'Редактировать отзыв':'Ваш отзыв'}</h3>
   <fieldset className="review-rating" disabled={busy}><legend>Оценка: {rating} из 5</legend>{[1,2,3,4,5].map(n=><label key={n}><input type="radio" name="review-rating" value={n} checked={rating===n} onChange={()=>setRating(n)} aria-label={`${n} из 5`}/><span aria-hidden="true">{n<=rating?'★':'☆'}</span></label>)}</fieldset>
   <label htmlFor="review-comment">Впечатления о товаре</label>
   <textarea id="review-comment" value={comment} onChange={e=>setComment(e.target.value)} minLength={2} maxLength={2000} required rows={5} disabled={busy} placeholder="Расскажите об удобстве, сенсоре и качестве сборки"/>
   <small>{comment.length} / 2000</small>
   <div className="review-actions"><button className="button primary small" disabled={busy||comment.trim().length<2}>{busy?'Сохраняем…':editing?'Сохранить изменения':'Опубликовать отзыв'}</button>{editing&&<button type="button" className="button secondary small" onClick={cancel} disabled={busy}>Отмена</button>}</div>
  </form>}
  <div className="review-list">{data?.reviews.map(review=><article className="review-card" key={review.id}>
   <header><strong>{review.userName}</strong><span aria-label={`Оценка ${review.rating} из 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></header>
   <time dateTime={review.created}>{new Date(review.created).toLocaleDateString('ru-RU')}</time>
   <p>{review.comment}</p>
   {canWrite&&review.userId===s.user?.id&&<div className="review-actions">{confirmDelete===review.id?<><span>Удалить ваш отзыв?</span><button className="text-link" disabled={busy} onClick={()=>remove(review.id)}>Да, удалить</button><button className="text-link" disabled={busy} onClick={()=>setConfirmDelete(null)}>Отмена</button></>:<><button className="text-link" disabled={busy} onClick={()=>{setEditing(review);setRating(review.rating);setComment(review.comment);setNotice('');}}>Редактировать</button><button className="text-link" disabled={busy} onClick={()=>setConfirmDelete(review.id)}>Удалить</button></>}</div>}
  </article>)}</div>
 </div>;
}
