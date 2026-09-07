// Global UI rule: every dish list is grouped by authoritative nomenclature group.
(function(){
  function rank(g){const i=order.indexOf(g);return i<0?999:i}
  function groupRows(rows,getGroup,getName){
    const m=new Map();
    for(const x of rows||[]){const g=(getGroup(x)||'Прочее').trim()||'Прочее';if(!m.has(g))m.set(g,[]);m.get(g).push(x)}
    return [...m.entries()].sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ru')).map(([title,items])=>({title,items:items.sort((a,b)=>String(getName(a)||'').localeCompare(String(getName(b)||''),'ru'))}));
  }
  function section(title,html,count){return `<section class="collapsible-group"><div class="group-toggle static-group"><span><b>${esc(title)}</b><small>${count}</small></span></div><div class="cards">${html}</div></section>`}

  const originalInventoryScreen=inventoryScreen;
  inventoryScreen=function(){
    const groups=grouped(state.items);
    const freezerGroups=groupRows(state.freezer,x=>x.group_name,x=>clean(x.dish_name));
    const freezerHtml=freezerGroups.map(g=>section(g.title,g.items.map(x=>`<article class="item-card"><h3>${esc(clean(x.dish_name))}</h3><div class="meta">В заморозке: <b>${fmt(x.quantity)}</b></div></article>`).join(''),g.items.length)).join('');
    return `${header()}${back('Доступно сегодня')}<p class="screen-lead">Поступления, переходящий остаток, принятые перемещения и блюда из заморозки.</p><div class="group-list">${groups.map(g=>groupHtml(g,'inventory')).join('')}</div>${state.freezer.length?`<section class="freezer-block"><h2>В заморозке</h2><div class="group-list">${freezerHtml}</div></section>`:''}`;
  };

  freezerOutScreen=function(){
    const gs=groupRows(state.freezer,x=>x.group_name,x=>clean(x.dish_name));
    const body=gs.map(g=>section(g.title,g.items.map(x=>`<article><div><b>${esc(clean(x.dish_name))}</b><small>В заморозке: ${fmt(x.quantity)}</small></div><input data-freezer="${x.dish_id}" inputmode="decimal" value="${esc(state.freezerTake[x.dish_id]||'')}" placeholder="0"></article>`).join(''),g.items.length)).join('');
    return `${header()}${back('Из заморозки')}<p class="screen-lead">Укажите, сколько достали сегодня.</p>${state.freezer.length?`<div class="group-list">${body}</div>`:'<div class="notice">В заморозке пока ничего нет.</div>'}<div class="sticky-action"><button id="take-freezer" class="primary" ${state.busy?'disabled':''}>${state.busy?'Сохраняем…':'Продолжить'}</button></div>${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  };

  transferScreen=function(){
    const other=state.points.filter(p=>p.point_code!==state.point);const dest=state.toPoint||other[0]?.point_code||'';state.toPoint=dest;
    const rows=state.items.filter(x=>n(x.available_qty)>0);
    const body=grouped(rows).map(g=>section(g.title,g.items.map(x=>`<article><div><b>${esc(clean(x.dish_name))}</b><small>Доступно: ${fmt(x.available_qty)}</small></div><input data-transfer="${x.dish_id}" inputmode="decimal" value="${esc(state.transferQty[x.dish_id]||'')}" placeholder="0"></article>`).join(''),g.items.length)).join('');
    return `${header()}${back('Новое перемещение')}<label class="select-card"><span>Куда передать</span><select id="to-point">${other.map(p=>`<option value="${esc(p.point_code)}" ${p.point_code===dest?'selected':''}>${esc(p.point_name)}</option>`).join('')}</select></label><p class="screen-lead">После отправки количество сразу уменьшится на вашей точке.</p><div class="group-list">${body}</div><div class="sticky-action"><button id="send-transfer" class="primary" ${state.busy?'disabled':''}>${state.busy?'Отправляем…':'Отправить перемещение'}</button></div>${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  };

  incomingScreen=function(){
    const cards=(state.incoming||[]).map(t=>{
      const gs=groupRows(t.items,x=>x.groupName,x=>clean(x.dishName));
      const body=gs.map(g=>section(g.title,g.items.map(x=>`<label><span><b>${esc(clean(x.dishName))}</b><small>Отправлено: ${fmt(x.sent)}</small></span><input data-receipt="${t.id}:${x.dishId}" inputmode="decimal" value="${esc(state.receipt[`${t.id}:${x.dishId}`]??String(x.sent))}"></label>`).join(''),g.items.length)).join('');
      return `<section class="receipt-card"><h2>От: ${esc(t.fromPoint)}</h2><div class="group-list">${body}</div><button class="primary receive-transfer" data-id="${t.id}">Принять по факту</button></section>`;
    }).join('');
    return `${header()}${back('Приёмка перемещений')}${state.incoming.length?cards:'<div class="notice">Новых перемещений нет.</div>'}${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  };

  const baseSubmitted=submittedScreen;
  submittedScreen=function(){
    // Preserve friendly success screen patch when it is armed.
    if(state.submissionSuccess) return baseSubmitted();
    const body=grouped(state.items).map(g=>section(g.title,g.items.map(x=>`<article><div><b>${esc(clean(x.dish_name))}</b><small>Осталось ${fmt(x.leftover_qty)}${n(x.waste_qty)?` · утиль ${fmt(x.waste_qty)}`:''}${n(x.frozen_qty)?` · заморозка ${fmt(x.frozen_qty)}`:''}</small></div><button class="secondary correction" data-id="${x.dish_id}">Исправить</button></article>`).join(''),g.items.length)).join('');
    return `${header()}${back('Сданные остатки')}<section class="success-card"><b>✓</b><h2>Остатки сданы</h2><p>Если нашли ошибку, можно внести корректировку.</p></section><div class="group-list">${body}</div>`;
  };
})();
