// Special flow for Bukhara/Pravda distribution points: receive dishes from their own kitchen.
(function(){
  const SPECIAL={
    BUKHARA:{source:'Бухара Кухня',target:'Бухара раздача'},
    PRAVDA:{source:'Правда Кухня',target:'Правда раздача'}
  };
  state.kitchenSupplyDishes=[];
  state.kitchenSupplyQty={};
  state.kitchenSupplySearch='';
  state.kitchenSupplyBusy=false;
  state.kitchenSupplyLoadedFor='';

  function cfg(){return SPECIAL[state.point]||null}
  function employeeActor(){return localStorage.getItem('stolovaya:employee-name')||sessionStorage.getItem('stolovaya:employee-name')||'Буфетчик'}

  const baseHome=homeScreen;
  homeScreen=function(){
    let html=baseHome();
    const c=cfg();
    if(!c)return html;
    // Only for these two points: replace the ordinary transfer action with kitchen receipt.
    html=html.replace(/<button data-screen="transfer"[^>]*>[\s\S]*?<\/button>/,
      `<button type="button" id="kitchen-supply-open" ${state.home?.submitted||state.home?.dayClosed?'disabled':''}><span>⇩</span><div><b>Получить с кухни</b><small>${esc(c.source)} → ${esc(c.target)}</small></div></button>`);
    return html;
  };

  async function openKitchenSupply(){
    const c=cfg();if(!c||state.home?.submitted||state.home?.dayClosed)return;
    state.screen='kitchen-supply';state.message='';render();
    if(state.kitchenSupplyLoadedFor===state.point&&state.kitchenSupplyDishes.length)return;
    state.kitchenSupplyBusy=true;render();
    try{
      state.kitchenSupplyDishes=await rpc('public_kitchen_supply_dishes',{p_token:state.token,p_point_code:state.point});
      state.kitchenSupplyLoadedFor=state.point;
    }catch(e){state.message=e.message||'Не удалось загрузить блюда'}
    finally{state.kitchenSupplyBusy=false;render()}
  }

  function supplyRows(){
    const q=state.kitchenSupplySearch.trim().toLowerCase();
    return (state.kitchenSupplyDishes||[]).filter(x=>!q||clean(x.name).toLowerCase().includes(q)||String(x.code||'').toLowerCase().includes(q));
  }

  function kitchenSupplyScreen(){
    const c=cfg();if(!c)return `${header()}${back('Получить с кухни')}<div class="notice">Эта операция доступна только на Бухаре и Правде.</div>`;
    const rows=supplyRows();
    const selected=Object.values(state.kitchenSupplyQty).filter(v=>n(v)>0).length;
    return `${header()}${back('Получить с кухни')}
      <section class="question-card kitchen-source"><h2>${esc(c.source)} → ${esc(c.target)}</h2><p>Выберите блюда и фактическое количество, которое получили с кухни. После проведения будут сформированы <b>акт приготовления</b> и <b>акт перемещения</b> для последующей выгрузки в iiko.</p></section>
      <input id="kitchen-supply-search" class="search" placeholder="Найти блюдо или код" value="${esc(state.kitchenSupplySearch)}">
      ${state.kitchenSupplyBusy?'<div class="notice">Загружаем справочник блюд…</div>':`<div class="simple-cards kitchen-supply-list">${rows.map(x=>`<article><div><b>${esc(clean(x.name))}</b><small>${esc(x.group||'Прочее')}${x.code?` · ${esc(x.code)}`:''}</small></div><input data-kitchen-supply="${esc(x.dishId)}" inputmode="decimal" value="${esc(state.kitchenSupplyQty[x.dishId]||'')}" placeholder="0"></article>`).join('')}</div>`}
      <div class="sticky-action"><button id="kitchen-supply-send" class="primary" ${state.kitchenSupplyBusy||selected===0?'disabled':''}>${state.kitchenSupplyBusy?'Проводим…':`Провести получение${selected?` · ${selected}`:''}`}</button></div>
      ${state.message?`<p class="toast">${esc(state.message)}</p>`:''}`;
  }

  async function sendKitchenSupply(){
    if(state.kitchenSupplyBusy)return;
    const items=(state.kitchenSupplyDishes||[]).filter(x=>n(state.kitchenSupplyQty[x.dishId])>0).map(x=>({dishId:x.dishId,quantity:n(state.kitchenSupplyQty[x.dishId])}));
    if(!items.length)return;
    if(!confirm(`Провести получение с кухни?\nПозиций: ${items.length}`))return;
    state.kitchenSupplyBusy=true;state.message='';render();
    try{
      const r=await rpc('public_receive_from_kitchen',{p_token:state.token,p_point_code:state.point,p_items:items,p_actor:employeeActor(),p_business_date:businessDate()});
      state.kitchenSupplyQty={};state.kitchenSupplySearch='';
      await loadPoint();
      state.screen='home';
      state.message=`Получение проведено. Сформированы акт приготовления ${r.productionDocument} и акт перемещения ${r.transferDocument}.`;
    }catch(e){state.message=e.message||'Не удалось провести получение'}
    finally{state.kitchenSupplyBusy=false;render()}
  }

  const baseRender=render;
  render=function(){
    if(state.screen==='kitchen-supply'){app.innerHTML=kitchenSupplyScreen();bind();return}
    baseRender();
  };

  const baseBind=bind;
  bind=function(){
    baseBind();
    document.getElementById('kitchen-supply-open')?.addEventListener('click',openKitchenSupply);
    const search=document.getElementById('kitchen-supply-search');
    if(search)search.oninput=e=>{state.kitchenSupplySearch=e.target.value;render()};
    document.querySelectorAll('[data-kitchen-supply]').forEach(inp=>inp.oninput=e=>{
      const v=e.target.value.replace(',','.');if(v&&!/^\d*(\.\d{0,3})?$/.test(v))return;
      state.kitchenSupplyQty[inp.dataset.kitchenSupply]=v;
      const b=document.getElementById('kitchen-supply-send');if(b)b.disabled=state.kitchenSupplyBusy||!Object.values(state.kitchenSupplyQty).some(x=>n(x)>0);
    });
    document.getElementById('kitchen-supply-send')?.addEventListener('click',sendKitchenSupply);
  };

  const style=document.createElement('style');
  style.textContent=`.kitchen-source{margin-bottom:12px}.kitchen-supply-list article input{max-width:92px}.kitchen-source h2{margin-bottom:6px}`;
  document.head.appendChild(style);
})();
