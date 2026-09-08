// After a closing is submitted the buffet worker cannot edit it.
// If something is found later, create a request for administrator approval.
(function(){
  state.foundDish='';
  state.foundQty='';
  state.foundComment='';
  state.foundBusy=false;

  const baseHomeScreen=homeScreen;
  homeScreen=function(){
    return baseHomeScreen().replace('Просмотр и корректировка','Только просмотр');
  };

  const baseSubmittedScreen=submittedScreen;
  submittedScreen=function(){
    if(state.submissionSuccess) return baseSubmittedScreen();
    return `${header()}${back('Сданные остатки')}
      <section class="success-card"><b>✓</b><h2>Остатки сданы</h2><p>Сданные данные больше нельзя редактировать.</p></section>
      <div class="submitted-list">${state.items.map(x=>`<article><div><b>${esc(clean(x.dish_name))}</b><small>Осталось ${fmt(x.leftover_qty)} · утиль ${x.waste_qty==null?'—':fmt(x.waste_qty)}${x.can_freeze?` · заморозка ${x.frozen_qty==null?'—':fmt(x.frozen_qty)}`:''}</small></div><strong>${fmt(n(x.available_qty)-n(x.leftover_qty)-n(x.waste_qty)-n(x.frozen_qty))}<small>продано</small></strong></article>`).join('')}</div>
      <section class="question-card" style="margin-top:16px"><h2>Что-то нашли после сдачи?</h2><p>Не меняйте старые цифры. Передайте найденное администратору — после подтверждения остаток и продажи пересчитаются автоматически.</p><button type="button" class="primary" data-screen="found-extra" ${state.home?.dayClosed?'disabled':''}>Нашла ещё</button></section>
      ${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  };

  function foundExtraScreen(){
    const x=state.items.find(i=>i.dish_id===state.foundDish);
    return `${header()}${back('Нашла ещё')}
      <p class="screen-lead">Выберите блюдо и укажите только то количество, которое нашли дополнительно после сдачи.</p>
      <label class="select-card"><span>Блюдо</span><select id="found-dish"><option value="">Выберите блюдо</option>${state.items.map(i=>`<option value="${i.dish_id}" ${i.dish_id===state.foundDish?'selected':''}>${esc(clean(i.dish_name))}</option>`).join('')}</select></label>
      <label class="select-card"><span>Нашли дополнительно</span><input id="found-qty" inputmode="decimal" value="${esc(state.foundQty)}" placeholder="Количество"></label>
      ${x?`<p class="screen-lead">Сейчас сданный остаток: <b>${fmt(x.leftover_qty)}</b></p>`:''}
      <textarea id="found-comment" class="comment" placeholder="Комментарий (необязательно)">${esc(state.foundComment)}</textarea>
      <p class="warning">Эта запись не изменит закрытие сама. Она уйдёт администратору на подтверждение.</p>
      <button id="send-found" class="primary" ${state.foundBusy||!state.foundDish||!(n(state.foundQty)>0)?'disabled':''}>${state.foundBusy?'Отправляем…':'Передать администратору'}</button>
      ${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  }

  async function sendFound(){
    if(!state.foundDish||!(n(state.foundQty)>0))return;
    state.foundBusy=true;state.message='';render();
    try{
      await rpc('public_report_found_after_closing',{
        p_token:state.token,
        p_point_code:state.point,
        p_dish_id:state.foundDish,
        p_quantity:n(state.foundQty),
        p_comment:state.foundComment||null,
        p_actor:'Буфетчик',
        p_business_date:businessDate()
      });
      state.foundDish='';state.foundQty='';state.foundComment='';
      state.screen='submitted';
      state.message='Передано администратору. До подтверждения сданные остатки не изменятся.';
    }catch(e){state.message=e.message||'Не удалось отправить'}
    finally{state.foundBusy=false;render()}
  }

  const baseRender=render;
  render=function(){
    if(state.screen==='found-extra'){
      app.innerHTML=foundExtraScreen();
      bind();
      return;
    }
    if(state.screen==='correction') state.screen='submitted';
    baseRender();
  };

  const baseBind=bind;
  bind=function(){
    baseBind();
    const dish=document.getElementById('found-dish');
    if(dish)dish.onchange=e=>{state.foundDish=e.target.value;render()};
    const qty=document.getElementById('found-qty');
    if(qty)qty.oninput=e=>{const v=e.target.value.replace(',','.');if(v&&!/^\d*(\.\d{0,3})?$/.test(v))return;state.foundQty=v;const b=document.getElementById('send-found');if(b)b.disabled=state.foundBusy||!state.foundDish||!(n(v)>0)};
    const comment=document.getElementById('found-comment');
    if(comment)comment.oninput=e=>state.foundComment=e.target.value;
    document.getElementById('send-found')?.addEventListener('click',sendFound);
  };

  // Extra guard in the browser; the server also blocks direct buffet corrections.
  saveCorrection=async function(){throw new Error('Сданные остатки меняет только администратор')};
})();
