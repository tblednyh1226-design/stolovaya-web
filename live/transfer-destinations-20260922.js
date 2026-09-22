// Final transfer destination patch. Loaded last so older live/test patches cannot overwrite it.
(function(){
  const baseLoadPoint=loadPoint;
  loadPoint=async function(){
    await baseLoadPoint();
    const rows=await rpc('public_transfer_point_options',{p_token:state.token,p_point_code:state.point});
    state.transferPoints=Array.isArray(rows)?rows:[];
    if(!state.transferPoints.length) throw new Error('Не загружены точки для перемещения');
  };
  transferScreen=function(){
    const other=(state.transferPoints||[]).filter(p=>p.point_code!==state.point);
    const dest=other.some(p=>p.point_code===state.toPoint)?state.toPoint:(other[0]?.point_code||'');
    state.toPoint=dest;
    return `${header()}${back('Новое перемещение')}<label class="select-card"><span>Куда передать</span><select id="to-point">${other.map(p=>`<option value="${esc(p.point_code)}" ${p.point_code===dest?'selected':''}>${esc(p.point_name)}</option>`).join('')}</select></label><p class="screen-lead">После отправки количество сразу уменьшится на вашей точке.</p><div class="simple-cards">${state.items.filter(x=>n(x.available_qty)>0).map(x=>`<article><div><b>${esc(clean(x.dish_name))}</b><small>Доступно: ${fmt(x.available_qty)}</small></div><input data-transfer="${x.dish_id}" inputmode="decimal" value="${esc(state.transferQty[x.dish_id]||'')}" placeholder="0"></article>`).join('')}</div><div class="sticky-action"><button id="send-transfer" class="primary" ${state.busy||!dest?'disabled':''}>${state.busy?'Отправляем…':'Отправить перемещение'}</button></div>${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  };
})();