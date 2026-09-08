// Admin messages from buffet points.
(function(){
  state.adminMessages=[];
  state.messagesOpen=false;
  state.messagesBusy=false;

  async function loadMessages(){
    if(!state.token)return;
    try{state.adminMessages=await rpc('admin_message_list',{p_token:state.token,p_status:null,p_limit:100})||[]}
    catch(e){state.message=e.message||'Не удалось загрузить сообщения от точек'}
    render();
  }

  async function updateMessage(id,action){
    state.messagesBusy=true;render();
    try{
      await rpc('admin_message_update',{p_token:state.token,p_message_id:id,p_action:action,p_reply:null,p_actor:'Администратор'});
      state.adminMessages=await rpc('admin_message_list',{p_token:state.token,p_status:null,p_limit:100})||[];
      state.message=action==='resolve'?'Сообщение отмечено как решённое.':'Сообщение отмечено как прочитанное.';
    }catch(e){state.message=e.message||'Не удалось обновить сообщение'}
    finally{state.messagesBusy=false;render()}
  }

  function activeMessages(){return (state.adminMessages||[]).filter(x=>x.status!=='resolved')}
  function unreadCount(){return activeMessages().filter(x=>x.status==='unread').length}

  function messagesMetric(){
    const count=unreadCount();
    return `<button type="button" class="metric metric-button admin-messages-metric ${count>0?'danger':''}"><b>${count}</b><small>сообщений от точек</small></button>`;
  }

  function messagesDetails(){
    if(!state.messagesOpen)return '';
    const rows=activeMessages();
    return `<section id="admin-messages" class="card details-card"><div class="details-head"><div><h2>Сообщения от точек</h2><p style="margin:5px 0;color:#59645d">Новые сообщения буфетчиков. Точка, дата и время сохраняются автоматически.</p></div><button type="button" id="close-admin-messages" class="secondary">Закрыть</button></div>${rows.length?`<div class="alert-list">${rows.map(m=>`<article class="alert ${m.status==='unread'?'error':''}"><div class="alert-head"><div><h3>${esc(m.category||'Сообщение')}</h3><div class="alert-meta">${esc(m.pointName||'')} · ${esc(fmtDate(m.businessDate))} · ${esc(fmtAt(m.createdAt))}</div></div><div class="alert-actions">${m.status==='unread'?`<button class="read-admin-message" data-id="${esc(m.id)}" ${state.messagesBusy?'disabled':''}>Прочитано</button>`:''}<button class="secondary resolve-admin-message" data-id="${esc(m.id)}" ${state.messagesBusy?'disabled':''}>Решено</button></div></div><p><b>${esc(m.senderName||'Буфетчик')}:</b> ${esc(m.body||'')}</p>${m.adminReply?`<p><b>Ответ:</b> ${esc(m.adminReply)}</p>`:''}</article>`).join('')}</div>`:'<p class="ok-note">✓ Новых сообщений от точек нет.</p>'}</section>`;
  }

  const baseAppMessages=app;
  app=function(){
    let html=baseAppMessages();
    html=html.replace(/(<section class="control-grid">[\s\S]*?)(<\/section>)/,`$1${messagesMetric()}$2${messagesDetails()}`);
    return html;
  };

  const baseBindMessages=bind;
  bind=function(){
    baseBindMessages();
    document.querySelector('.admin-messages-metric')?.addEventListener('click',()=>{
      state.messagesOpen=!state.messagesOpen;
      if(state.messagesOpen){state.panel='';state.foundOpen=false}
      render();
      if(state.messagesOpen)setTimeout(()=>document.getElementById('admin-messages')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    });
    document.getElementById('close-admin-messages')?.addEventListener('click',()=>{state.messagesOpen=false;render()});
    document.querySelectorAll('.read-admin-message').forEach(b=>b.addEventListener('click',()=>updateMessage(b.dataset.id,'read')));
    document.querySelectorAll('.resolve-admin-message').forEach(b=>b.addEventListener('click',()=>updateMessage(b.dataset.id,'resolve')));
  };

  const baseLoadMessages=load;
  load=async function(showConfirmation=false){
    await baseLoadMessages(showConfirmation);
    if(state.token){
      try{state.adminMessages=await rpc('admin_message_list',{p_token:state.token,p_status:null,p_limit:100})||[]}
      catch(e){state.message=e.message||state.message}
      render();
    }
  };

  setTimeout(loadMessages,0);
})();
