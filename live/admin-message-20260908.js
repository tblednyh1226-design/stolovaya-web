// Simple internal messages from buffet point to administrator.
(function(){
  let messageOpen=false;
  let sending=false;

  function styleOnce(){
    if(document.getElementById('admin-message-style'))return;
    const s=document.createElement('style');
    s.id='admin-message-style';
    s.textContent='.admin-message-btn{margin-top:12px}.msg-overlay{position:fixed;inset:0;background:#0006;z-index:12000;display:flex;align-items:flex-end;justify-content:center;padding:12px}.msg-sheet{width:min(560px,100%);background:#f8f6ef;border-radius:20px 20px 12px 12px;padding:18px;box-shadow:0 18px 60px #0005}.msg-sheet h2{margin:0 0 6px}.msg-sheet p{margin:0 0 14px;color:#667169}.msg-sheet label{display:grid;gap:6px;margin:12px 0;font-weight:700;color:#405047}.msg-sheet select,.msg-sheet textarea{width:100%;box-sizing:border-box;border:1px solid #cbc8bd;border-radius:12px;padding:12px;font:inherit;background:#fff}.msg-sheet textarea{min-height:120px;resize:vertical}.msg-actions{display:grid;grid-template-columns:1fr 1.3fr;gap:8px;margin-top:12px}';
    document.head.appendChild(s);
  }

  function closeMessage(){messageOpen=false;document.getElementById('admin-message-overlay')?.remove()}

  function openMessage(){
    if(!state.point||!state.token)return;
    messageOpen=true;styleOnce();
    const box=document.createElement('div');
    box.id='admin-message-overlay';box.className='msg-overlay';
    box.innerHTML=`<section class="msg-sheet"><h2>Сообщить администратору</h2><p>${esc(state.home?.pointName||'Текущая точка')} · ${esc(state.home?.businessDate||'')}</p><label>Тема<select id="admin-message-category"><option>Ошибка в количестве</option><option>Проблема с блюдом</option><option>Перемещение</option><option>Не работает приложение</option><option selected>Другое</option></select></label><label>Сообщение<textarea id="admin-message-body" maxlength="2000" placeholder="Напишите, что случилось"></textarea></label><div class="msg-actions"><button type="button" id="admin-message-cancel" class="secondary">Отмена</button><button type="button" id="admin-message-send" class="primary">Отправить</button></div><p id="admin-message-error" class="error-text" style="display:none;margin-top:10px"></p></section>`;
    document.body.appendChild(box);
    document.getElementById('admin-message-cancel').onclick=closeMessage;
    box.addEventListener('click',e=>{if(e.target===box&&!sending)closeMessage()});
    document.getElementById('admin-message-send').onclick=sendMessage;
    setTimeout(()=>document.getElementById('admin-message-body')?.focus(),50);
  }

  async function sendMessage(){
    if(sending)return;
    const body=document.getElementById('admin-message-body')?.value.trim()||'';
    const category=document.getElementById('admin-message-category')?.value||'Другое';
    const err=document.getElementById('admin-message-error');
    if(body.length<2){if(err){err.textContent='Напишите сообщение';err.style.display='block'}return}
    sending=true;
    const btn=document.getElementById('admin-message-send');if(btn){btn.disabled=true;btn.textContent='Отправляем…'}
    try{
      await rpc('public_send_admin_message',{p_token:state.token,p_point_code:state.point,p_body:body,p_category:category,p_sender_name:'Буфетчик',p_business_date:state.home?.businessDate||null});
      closeMessage();state.message='Сообщение отправлено администратору.';render();
    }catch(e){if(err){err.textContent=e.message||'Не удалось отправить';err.style.display='block'}}
    finally{sending=false;if(btn){btn.disabled=false;btn.textContent='Отправить'}}
  }

  function inject(){
    styleOnce();
    if(state.screen!=='home'||!state.home)return;
    if(document.getElementById('admin-message-open'))return;
    const change=document.getElementById('change-point');
    const btn=document.createElement('button');
    btn.id='admin-message-open';btn.type='button';btn.className='wide-secondary admin-message-btn';btn.textContent='✉ Сообщить администратору';btn.onclick=openMessage;
    if(change)change.parentNode.insertBefore(btn,change);else app.appendChild(btn);
  }

  const baseRenderMessages=render;
  render=function(){baseRenderMessages();setTimeout(inject,0)};
  setTimeout(inject,0);
})();
