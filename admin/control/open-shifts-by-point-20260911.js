// Drill-down for "Незакрытые смены": first points with counters, then dates for selected point.
(function(){
  state.openPoint=state.openPoint||'';
  const baseDetailsPanel=detailsPanel;

  function pointGroups(items){
    const map=new Map();
    for(const a of items){
      const code=a.pointCode||a.pointName||'UNKNOWN';
      if(!map.has(code))map.set(code,{code,name:a.pointName||a.pointCode||'Без точки',items:[]});
      map.get(code).items.push(a);
    }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  }

  detailsPanel=function(alerts){
    if(state.panel!=='open')return baseDetailsPanel(alerts);
    const items=alerts.filter(a=>a.kind==='missing_close');
    const groups=pointGroups(items);
    const selected=groups.find(g=>g.code===state.openPoint);

    if(selected){
      const sorted=selected.items.slice().sort((a,b)=>String(b.businessDate||'').localeCompare(String(a.businessDate||'')));
      return `<section id="control-details" class="card details-card"><div class="details-head"><div><button type="button" class="secondary open-points-back">← Все точки</button><h2 style="margin-top:10px">${esc(selected.name)} · ${selected.items.length}</h2></div><button type="button" id="close-details" class="secondary">Закрыть</button></div><div class="alert-list">${sorted.map(alertCard).join('')}</div></section>`;
    }

    return `<section id="control-details" class="card details-card"><div class="details-head"><div><h2>Незакрытые смены</h2><p class="open-points-hint">Сначала выберите точку.</p></div><button type="button" id="close-details" class="secondary">Закрыть</button></div>${groups.length?`<div class="open-points-list">${groups.map(g=>`<button type="button" class="open-point-row" data-open-point="${esc(g.code)}"><span>${esc(g.name)}</span><b>${g.items.length}</b></button>`).join('')}</div>`:'<p class="ok-note">✓ Незакрытых смен нет.</p>'}</section>`;
  };

  // Capture before the original metric handler so every fresh opening starts from the point list.
  root.addEventListener('click',e=>{
    const metric=e.target.closest?.('.metric-button[data-panel="open"]');
    if(metric)state.openPoint='';
  },true);

  root.addEventListener('click',e=>{
    const point=e.target.closest?.('[data-open-point]');
    if(point){state.openPoint=point.dataset.openPoint||'';render();setTimeout(()=>document.getElementById('control-details')?.scrollIntoView({behavior:'smooth',block:'start'}),30);return}
    if(e.target.closest?.('.open-points-back')){state.openPoint='';render();setTimeout(()=>document.getElementById('control-details')?.scrollIntoView({behavior:'smooth',block:'start'}),30)}
  });
})();
