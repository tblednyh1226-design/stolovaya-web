// Temporary test-mode business-date selector. Remove/limit after field testing.
const moscowToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow'}).format(new Date());
state.testDate=localStorage.getItem('stolovaya:test-date')||moscowToday();
const businessDate=()=>state.home?.businessDate||state.testDate||moscowToday();

loadPoint=async function(){
  const day=state.testDate||moscowToday();
  const common={p_token:state.token,p_point_code:state.point,p_business_date:day};
  const [h,d,f,inc]=await Promise.all([
    rpc('public_home',common),
    rpc('public_daily_items_v2',common),
    rpc('public_freezer_items',common),
    rpc('public_incoming_transfers',common)
  ]);
  state.home=h;
  state.testDate=h.businessDate||day;
  localStorage.setItem('stolovaya:test-date',state.testDate);
  state.items=d||[];
  state.freezer=f||[];
  state.incoming=Array.isArray(inc)?inc:[];
  const saved=JSON.parse(localStorage.getItem(draftKey())||'null')||{};
  const next={};
  for(const x of state.items){
    next[x.dish_id]=saved[x.dish_id]||{
      leftover:x.leftover_qty==null?'':String(x.leftover_qty),
      waste:x.waste_qty==null?'':String(x.waste_qty),
      frozen:x.frozen_qty==null?'':String(x.frozen_qty),
      touched:{leftover:false,waste:false,frozen:false}
    };
  }
  state.entries=next;
  state.message='';
};

choosePoint=async function(code){
  if(!code)return;
  state.point=code;
  state.message='';
  state.screen='loading';
  render();
  try{
    await loadPoint();
    state.screen='home';
  }catch(e){
    console.error('Point load failed',e);
    state.message=e?.message||'Не удалось открыть точку';
    state.screen='point';
  }
  render();
};

const basePointScreen=pointScreen;
pointScreen=function(){
  const html=basePointScreen();
  return state.message?html.replace('</section>',`<p class="error-text">${esc(state.message)}</p></section>`):html;
};

const originalHeader=header;
header=function(){
  const base=originalHeader();
  if(!state.home)return base;
  const today=moscowToday();
  return base+`<section class="test-date-bar"><label><span>Дата рабочего дня <small>режим тестирования</small></span><input id="test-business-date" type="date" min="2026-09-01" max="${today}" value="${esc(state.testDate||state.home.businessDate)}"></label></section>`;
};

savePartial=async function(){const payload=[];for(const x of state.items){const e=state.entries[x.dish_id];if(!e)continue;const row={dishId:x.dish_id};let changed=false;for(const f of ['leftover','waste','frozen'])if(e.touched?.[f]&&e[f]!==''){row[f]=n(e[f]);changed=true}if(changed)payload.push(row)}if(!payload.length)return;state.busy=true;render();try{await rpc('public_save_closing_partial',{p_token:state.token,p_point_code:state.point,p_entries:payload,p_actor:'Буфетчик',p_business_date:businessDate()});await loadPoint();state.message='Посчитанное сохранено'}catch(e){state.message=e.message}finally{state.busy=false;render()}};

finalize=async function(){const hasFrozen=state.items.some(x=>n(state.entries[x.dish_id]?.frozen)>0);if(hasFrozen&&!confirm('Проверьте свежесть замораживаемых блюд. Повторная заморозка не допускается. Продолжить?'))return;state.busy=true;render();try{const payload=[];for(const x of state.items){const e=state.entries[x.dish_id];if(!e)continue;const row={dishId:x.dish_id,leftover:n(e.leftover)};if(e.waste!=='')row.waste=n(e.waste);if(e.frozen!=='')row.frozen=n(e.frozen);payload.push(row)}const day=businessDate();await rpc('public_save_closing_partial',{p_token:state.token,p_point_code:state.point,p_entries:payload,p_actor:'Буфетчик',p_business_date:day});await rpc('public_finalize_closing',{p_token:state.token,p_point_code:state.point,p_freshness_confirmed:hasFrozen,p_actor:'Буфетчик',p_business_date:day});localStorage.removeItem(draftKey());await loadPoint();state.screen='submitted';state.message='Остатки сданы'}catch(e){state.message=e.message}finally{state.busy=false;render()}};

takeFreezer=async function(){const rows=state.freezer.filter(x=>n(state.freezerTake[x.dish_id])>0);state.busy=true;render();try{const day=businessDate();for(const x of rows){const q=n(state.freezerTake[x.dish_id]);if(q>n(x.quantity))throw new Error(`Слишком много: ${clean(x.dish_name)}`);await rpc('public_take_from_freezer',{p_token:state.token,p_point_code:state.point,p_dish_id:x.dish_id,p_quantity:q,p_actor:'Буфетчик',p_business_date:day})}state.freezerTake={};await loadPoint();state.screen='closing'}catch(e){state.message=e.message}finally{state.busy=false;render()}};

sendTransfer=async function(){const rows=state.items.filter(x=>n(state.transferQty[x.dish_id])>0);if(!rows.length)return setMessage('Укажите количество хотя бы у одного блюда');for(const x of rows)if(n(state.transferQty[x.dish_id])>n(x.available_qty))return setMessage(`Недостаточно: ${clean(x.dish_name)}`);state.busy=true;render();try{await rpc('public_create_transfer',{p_token:state.token,p_point_code:state.point,p_to_point_code:state.toPoint,p_items:rows.map(x=>({dishId:x.dish_id,quantity:n(state.transferQty[x.dish_id])})),p_actor:'Буфетчик',p_business_date:businessDate()});state.transferQty={};await loadPoint();state.screen='home';state.message='Перемещение отправлено'}catch(e){state.message=e.message}finally{state.busy=false;render()}};

receiveTransfer=async function(id){const t=state.incoming.find(x=>x.id===id);if(!t)return;state.busy=true;render();try{await rpc('public_receive_transfer',{p_token:state.token,p_point_code:state.point,p_transfer_id:id,p_items:t.items.map(x=>({dishId:x.dishId,quantity:n(state.receipt[`${id}:${x.dishId}`]??x.sent)})),p_actor:'Буфетчик',p_business_date:businessDate()});state.receipt={};await loadPoint();state.screen='incoming';state.message='Перемещение принято'}catch(e){state.message=e.message}finally{state.busy=false;render()}};

saveCorrection=async function(){const x=state.items.find(i=>i.dish_id===state.correctionDish);if(!x)return;const e=state.entries[x.dish_id];state.busy=true;render();try{await rpc('public_correct_closing',{p_token:state.token,p_point_code:state.point,p_dish_id:x.dish_id,p_leftover:n(e.leftover),p_waste:n(e.waste),p_frozen:n(e.frozen),p_reason:state.reason,p_comment:state.comment||null,p_freshness_confirmed:n(e.frozen)>0,p_actor:'Буфетчик',p_business_date:businessDate()});await loadPoint();state.screen='submitted';state.message='Корректировка сохранена'}catch(err){state.message=err.message}finally{state.busy=false;render()}};

const originalBind=bind;
bind=function(){
  originalBind();
  // Calendar must always allow the current Moscow business day, including today.
  const today=moscowToday();
  document.querySelectorAll('input[type="date"]').forEach(input=>{
    input.min='2026-09-01';
    input.max=today;
  });
  document.querySelectorAll('[data-point]').forEach(b=>{b.onclick=()=>choosePoint(b.dataset.point)});
  const picker=document.getElementById('test-business-date');
  if(picker)picker.onchange=async e=>{
    const value=e.target.value;
    if(!value)return;
    state.testDate=value;
    localStorage.setItem('stolovaya:test-date',value);
    state.screen='loading';
    render();
    try{await loadPoint();state.screen='home'}catch(err){state.message=err?.message||'Не удалось открыть выбранную дату';state.screen='home'}
    render();
  };
};

// Rebind currently rendered screen after this patch loads.
bind();
