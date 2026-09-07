// Mobile/report usability fix 2026-09-07. Keeps the existing report calculation intact.
(function(){
  const originalGroups=groups;
  const activityKeys=['opening_qty','received_qty','leftover_qty','waste_qty','frozen_qty','sold_qty','kitchen_in_qty','internal_in_qty','internal_out_qty','thawed_qty'];
  function hasActivity(r){return activityKeys.some(k=>Math.abs(Number(r?.[k]||0))>0)}
  // In the main matrix/export show only dishes that have a balance or any movement
  // on at least one currently selected point. Freezer grouping is left unchanged.
  groups=function(rows){
    if(state.report && rows===state.report.rows){
      const visibleDishIds=new Set(
        rows.filter(r=>state.selected.has(r.point_code)&&hasActivity(r)).map(r=>r.dish_id)
      );
      rows=rows.filter(r=>visibleDishIds.has(r.dish_id));
    }
    return originalGroups(rows);
  };
  function periodLabel(){
    if(!state.report)return '';
    if(state.mode==='day')return state.report.businessDate||state.date;
    return `${state.report.fromDate||state.from} — ${state.report.toDate||state.to}`;
  }
  function sumPoint(code,key){
    return (state.report?.rows||[]).filter(r=>r.point_code===code).reduce((s,r)=>s+Number(r[key]||0),0);
  }
  function addReportControls(){
    if(!state.report)return;
    const period=document.querySelector('.period');
    if(period&&!document.getElementById('generate-report')){
      const b=document.createElement('button');
      b.id='generate-report';
      b.className='generate-report';
      b.textContent=state.busy?'Формируем…':'Сформировать отчёт';
      b.disabled=state.busy;
      b.onclick=()=>load();
      period.appendChild(b);
    }
    const firstSection=document.querySelector('.section');
    if(firstSection&&!document.querySelector('.report-summary')){
      const ps=points();
      const box=document.createElement('section');
      box.className='card report-summary';
      box.innerHTML=`<div class="summary-head"><b>Отчёт сформирован</b><span>${esc(periodLabel())}</span></div><div class="summary-grid">${ps.map(p=>`<article><b>${esc(p.name)}</b><span>Начало: <strong>${fmt(sumPoint(p.code,'opening_qty'))}</strong></span><span>Пришло: <strong>${fmt(sumPoint(p.code,'received_qty'))}</strong></span><span>Остаток: <strong>${fmt(sumPoint(p.code,'leftover_qty'))}</strong></span><span>Продано: <strong>${fmt(sumPoint(p.code,'sold_qty'))}</strong></span></article>`).join('')}</div><p class="scroll-hint">Таблицу ниже можно двигать вправо и влево. Название блюда остаётся закреплённым.</p>`;
      firstSection.parentNode.insertBefore(box,firstSection);
    }
  }
  const originalBind=bind;
  bind=function(){
    originalBind();
    addReportControls();
  };
  async function bootstrapFromBuffet(){
    if(state.token)return;
    const buffetToken=localStorage.getItem('stolovaya:web-token');
    if(!buffetToken)return;
    state.busy=true;state.message='';render();
    try{
      const r=await rpc('public_admin_session_from_buffet_token',{p_token:buffetToken});
      state.token=r.token;
      sessionStorage.setItem('stolovaya:admin',state.token);
      await load();
    }catch(e){
      state.token='';
      sessionStorage.removeItem('stolovaya:admin');
      state.message=e?.message||'Не удалось открыть отчёт';
    }finally{state.busy=false;render()}
  }
  if(state.report)render();
  else if(!state.token)bootstrapFromBuffet();
})();
