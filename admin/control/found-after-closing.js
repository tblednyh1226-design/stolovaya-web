// Admin review of buffet requests created through «Нашла ещё».
(function(){
  state.foundRequests=[];
  state.foundBusy=false;

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

  function foundSection(){
    const rows=state.foundRequests||[];
    return `<section class="card" id="found-after-closing"><div class="details-head"><div><h2>Нашли после сдачи</h2><p style="margin:5px 0;color:#59645d">Буфетчик не меняет закрытие сам. Здесь вы подтверждаете или отклоняете найденное количество.</p></div><b style="font-size:24px;color:${rows.length?'#a74637':'#315f49'}">${rows.length}</b></div>
      ${rows.length?`<div class="alert-list">${rows.map(r=>`<article class="alert"><div class="alert-head"><div><h3>${esc(r.dishName)}</h3><div class="alert-meta">${esc(r.pointName)} · ${esc(fmtDate(r.businessDate))} · найдено <b>+${esc(fmtQty(r.quantity))}</b></div></div><div class="alert-actions"><button class="approve-found" data-id="${esc(r.id)}" ${state.foundBusy?'disabled':''}>Подтвердить</button><button class="secondary reject-found" data-id="${esc(r.id)}" ${state.foundBusy?'disabled':''}>Отклонить</button></div></div><p>Сданный остаток сейчас: <b>${esc(fmtQty(r.currentLeftover))}</b>${r.comment?` · Комментарий: ${esc(r.comment)}`:''}</p><small>Отправлено: ${esc(fmtAt(r.requestedAt))}</small></article>`).join('')}</div>`:'<p class="ok-note">✓ Новых сообщений «Нашла ещё» нет.</p>'}</section>`;
  }

  const baseApp=app;
  app=function(){return baseApp().replace('</main>',foundSection()+'</main>')};

  const baseBind=bind;
  bind=function(){
    baseBind();
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

  // The original control script may have started its first load before this patch loaded.
  setTimeout(loadFound,0);
})();
