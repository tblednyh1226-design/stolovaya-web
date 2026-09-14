// Notification preferences in employee editor.
(function(){
  let notify=null,loading=false;
  const baseEdit=editEmployee;
  editEmployee=async function(x){baseEdit(x);loading=true;render();try{notify=await rpc('admin_employee_notifications',{p_token:state.token,p_employee_id:x.id})}catch(e){state.message=e.message;notify=null}finally{loading=false;render()}};
  const baseForm=form;
  form=function(){let html=baseForm();const d=state.edit;if(!d?.id)return html;let block='<div class="notification-settings"><b>Уведомления</b><small>Выберите события и точки, по которым сотрудник будет получать уведомления.</small>';
    if(loading)block+='<p>Загрузка настроек…</p>';else if(notify){block+='<div class="roles">'+(notify.events||[]).map(x=>`<label><input type="checkbox" data-notify-event="${esc(x.code)}" ${x.enabled?'checked':''}>${esc(x.name)}</label>`).join('')+'</div><b>Точки для уведомлений</b><div class="points">'+(notify.points||[]).map(x=>`<label><input type="checkbox" data-notify-point="${esc(x.pointCode)}" ${x.enabled?'checked':''}>${esc(x.pointName)}</label>`).join('')+`</div><small>Telegram: ${notify.telegram?.linked?'привязан':'ещё не привязан'}</small><button type="button" id="save-notifications" class="secondary">Сохранить уведомления</button>`}block+='</div>';
    return html.replace('</section>',block+'</section>')};
  const baseBind=bind;
  bind=function(){baseBind();document.getElementById('save-notifications')?.addEventListener('click',async()=>{if(!state.edit?.id)return;const events=[...document.querySelectorAll('[data-notify-event]:checked')].map(x=>x.dataset.notifyEvent);const points=[...document.querySelectorAll('[data-notify-point]:checked')].map(x=>x.dataset.notifyPoint);state.busy=true;render();try{notify=await rpc('admin_save_employee_notifications',{p_token:state.token,p_employee_id:state.edit.id,p_event_codes:events,p_point_codes:points});state.message='Настройки уведомлений сохранены'}catch(e){state.message=e.message}finally{state.busy=false;render()}})};
})();