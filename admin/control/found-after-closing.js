// Admin review of buffet requests created through «Нашла ещё».
(function(){
  state.foundRequests=[];
  state.foundBusy=false;
  state.foundOpen=false;

  function fmtQty(v){return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}

  async function loadFound(){
    if(!state.token)return;
    try{state.foundRequests=await rpc('admin_found_after_closing_requests',{p_token:state.token,p_status:'pending'})||[]}
    catch(e){state.message=e.message||'Не удалось загрузить найденные остатки'}
    render();
  }

  async function reviewFound(id,action){
    const r=state.foundRequests.find(x=>x.id===id);if(!r)return;
    const approve=action==='approve';
    const text=approve
      ?`Подтвердить: ${r.dishName}, +${fmtQty(r.quantity)} к остатку за ${fmtDate(r.businessDate)} • ${r.pointName}?\n\nПродажи будут пересчитаны автоматически.`
      :`Отклонить сообщение «Нашла ещё»: ${r.dishName}, ${fmtQty(r.quantity)} • ${r.pointName}?`;
    if(!confirm(text))return;
    state.foundBusy=true;state.message='';render();
    try{
      await rpc('admin_review_found_after_closing',{p_token:state.token,p_request_id:id,p_action:action,p_comment:null,p_actor:'Администратор'});
      state.message=approve?'Найденный остаток подтверждён. Остаток увеличен, продажи пересчитаны.':'Сообщение отклонено. Закрытие не изменено.';
      state.foundRequests=await rpc('admin_found_after_closing_requests',{p_token:state.token,p_status:'pending'})||[];
      await load(false);
    }catch(e){state.message=e.message||'Не удалось обработать запись';render()}
    finally{state.foundBusy=false;render()}
  }

  function foundMetric(){
    const count=(state.foundRequests||[]).length;
    return `<button type="button" class="metric metric-button found-metric ${count>0?'danger':''}"><b>${count}</b><small>нашли ещё</small></button>`;
  }

  function foundDetails(){
    if(!state.foundOpen)return '';
    const rows=state.foundRequests||[];
    return `<section id="found-after-closing" class="card details-card"><div class="details-head"><div><h2>Нашли ещё</h2><p style="margin:5px 0;color:#59645d">Буфетчик не меняет закрытие сам. Здесь подтверждаем или отклоняем найденное количество.</p></div><button type="button" id="close-found" class="secondary">Закрыть</button></div>
      ${rows.length?`<div class="alert-list">${rows.map(r=>`<article class="alert"><div class="alert-head"><div><h3>${esc(r.dishName)}</h3><div class="alert-meta">${esc(r.pointName)} · ${esc(fmtDate(r.businessDate))} · найдено <b>+${esc(fmtQty(r.quantity))}</b></div></div><div class="alert-actions"><button class="approve-found" data-id="${esc(r.id)}" ${state.foundBusy?'disabled':''}>Подтвердить</button><button class="secondary reject-found" data-id="${esc(r.id)}" ${state.foundBusy?'disabled':''}>Отклонить</button></div></div><p>Сданный остаток сейчас: <b>${esc(fmtQty(r.currentLeftover))}</b>${r.comment?` · Комментарий: ${esc(r.comment)}`:''}</p><small>Отправлено: ${esc(fmtAt(r.requestedAt))}</small></article>`).join('')}</div>`:'<p class="ok-note">✓ Новых сообщений «Нашла ещё» нет.</p>'}</section>`;
  }

  const baseApp=app;
  app=function(){
    let html=baseApp();
    html=html.replace(/(<section class="control-grid">[\s\S]*?)(<\/section>)/,`$1${foundMetric()}$2${foundDetails()}`);
    return html;
  };

  const baseBind=bind;
  bind=function(){
    baseBind();
    document.querySelector('.found-metric')?.addEventListener('click',()=>{
      state.foundOpen=!state.foundOpen;
      if(state.foundOpen)state.panel='';
      render();
      if(state.foundOpen)setTimeout(()=>document.getElementById('found-after-closing')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    });
    document.getElementById('close-found')?.addEventListener('click',()=>{state.foundOpen=false;render()});
    document.querySelectorAll('.metric-button:not(.found-metric)').forEach(b=>b.addEventListener('click',()=>{if(state.foundOpen){state.foundOpen=false;render()}}));
    document.querySelectorAll('.approve-found').forEach(b=>b.addEventListener('click',()=>reviewFound(b.dataset.id,'approve')));
    document.querySelectorAll('.reject-found').forEach(b=>b.addEventListener('click',()=>reviewFound(b.dataset.id,'reject')));
  };

  const baseLoad=load;
  load=async function(showConfirmation=false){
    await baseLoad(showConfirmation);
    if(state.token){
      try{state.foundRequests=await rpc('admin_found_after_closing_requests',{p_token:state.token,p_status:'pending'})||[]}
      catch(e){state.message=e.message||state.message}
      render();
    }
  };

  setTimeout(loadFound,0);
})();
