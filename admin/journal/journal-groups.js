// Global document rule: every dish list is grouped by nomenclature group.
(function(){
  const GROUP_ORDER=[
    'Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры',
    'Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'
  ];
  state.closingReports=state.closingReports||{};
  state.closingReportBusy=state.closingReportBusy||new Set();
  state.closingDrafts=state.closingDrafts||{};
  const rank=g=>{const i=GROUP_ORDER.indexOf(g);return i<0?999:i};
  const value=i=>i.qty??i.sent??i.leftover??i.received??'';
  const num=v=>v==null||v===''?0:Number(v);
  const fmt=v=>v==null?'—':Number(v).toLocaleString('ru-RU',{maximumFractionDigits:3});
  function actorOptions(){return `<option value="">Выберите сотрудника</option>${(state.employees||[]).map(e=>`<option value="${esc(e.fullName)}" ${state.actor===e.fullName?'selected':''}>${esc(e.fullName)}</option>`).join('')}`}
  function qtyCell(d,i){
    if(state.editing.has(historyKey(d))&&i.editable){
      const key=draftKey(d,i);
      const v=state.drafts[key]??String(value(i));
      return `<input class="qty-input" type="number" step="0.001" inputmode="decimal" data-draft-key="${esc(key)}" value="${esc(v)}" aria-label="Количество ${esc(i.dish||'')}">`;
    }
    return `<b class="qty-value">${esc(value(i))}</b>`;
  }
  function groupedItems(d,items){
    const map=new Map();
    for(const i of items||[]){
      const g=(i.group||'Прочее').trim()||'Прочее';
      if(!map.has(g))map.set(g,[]);
      map.get(g).push(i);
    }
    return [...map.entries()]
      .sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ru'))
      .map(([group,rows])=>{
        rows.sort((a,b)=>String(a.dish||'').localeCompare(String(b.dish||''),'ru'));
        return `<section class="doc-dish-group"><h4>${esc(group)}</h4><div class="items">${rows.map(i=>`<div class="item-row"><span>${esc(i.dish||'')}</span><span class="qty-cell">${qtyCell(d,i)}</span></div>`).join('')}</div></section>`;
      }).join('');
  }
  function closeDraftKey(d,r,field){return `${historyKey(d)}|${r.dish_id}|${field}`}
  function closingRows(d){
    const report=state.closingReports[historyKey(d)];
    if(!report)return [];
    return (report.rows||[]).filter(r=>r.point_code===d.point_code && (
      num(r.opening_qty)!==0||num(r.received_qty)!==0||r.leftover_qty!=null||num(r.waste_qty)!==0||num(r.frozen_qty)!==0||r.sold_qty!=null||r.is_submitted
    ));
  }
  function startClosingEdit(d){
    const key=historyKey(d);state.editing.add(key);state.message='';
    for(const r of closingRows(d)){
      state.closingDrafts[closeDraftKey(d,r,'leftover')]=String(r.leftover_qty??0);
      state.closingDrafts[closeDraftKey(d,r,'waste')]=String(r.waste_qty??0);
      state.closingDrafts[closeDraftKey(d,r,'frozen')]=String(r.frozen_qty??0);
    }
    render();
  }
  function cancelClosingEdit(d){
    const key=historyKey(d);state.editing.delete(key);
    for(const r of closingRows(d))for(const f of ['leftover','waste','frozen'])delete state.closingDrafts[closeDraftKey(d,r,f)];
    render();
  }
  async function saveClosingEdit(d){
    const key=historyKey(d);
    if(!state.actor){state.message='Выберите сотрудника, который вносит изменение';render();return}
    const changes=[];
    for(const r of closingRows(d)){
      const vals={};
      for(const f of ['leftover','waste','frozen']){
        const raw=state.closingDrafts[closeDraftKey(d,r,f)];
        vals[f]=Number(String(raw??'0').replace(',','.'));
        if(!Number.isFinite(vals[f])||vals[f]<0){state.message='Проверьте остаток, утиль и заморозку';render();return}
      }
      if(vals.leftover!==num(r.leftover_qty)||vals.waste!==num(r.waste_qty)||vals.frozen!==num(r.frozen_qty))changes.push({r,vals});
    }
    if(!changes.length){cancelClosingEdit(d);return}
    state.saving.add(key);state.message='';render();
    try{
      for(const ch of changes){
        await rpc('admin_correct_closing',{
          p_token:state.token,p_business_date:d.business_date,p_point_code:d.point_code,p_dish_id:ch.r.dish_id,
          p_leftover:ch.vals.leftover,p_waste:ch.vals.waste,p_frozen:ch.vals.frozen,
          p_reason:'Корректировка из журнала документов',p_comment:null,p_actor:state.actor
        });
      }
      localStorage.setItem('stolovaya:journal-actor',state.actor);
      state.editing.delete(key);delete state.closingReports[key];delete state.histories[key];
      await loadClosingReport(d,true);await load();
      const fresh=findDoc(d.doc_type,d.doc_id);if(fresh&&state.historyOpen.has(key))await refreshHistory(fresh);
      state.message=`Закрытие дня ${d.business_date} · ${d.to_point||d.point_code} пересчитано`;
    }catch(e){state.message=e.message}
    finally{state.saving.delete(key);render()}
  }
  async function loadClosingReport(d,force=false){
    const key=historyKey(d);if(!force&&state.closingReports[key])return;
    state.closingReportBusy.add(key);render();
    try{state.closingReports[key]=await rpc('admin_main_operational_report',{p_token:state.token,p_business_date:d.business_date})}
    catch(e){state.message=e.message}
    finally{state.closingReportBusy.delete(key);render()}
  }
  function closeInput(d,r,f){
    const key=closeDraftKey(d,r,f),v=state.closingDrafts[key]??String(r[f+'_qty']??0);
    return `<input class="close-edit-input" type="number" min="0" step="0.001" inputmode="decimal" data-close-draft="${esc(key)}" value="${esc(v)}">`;
  }
  function closingTable(d){
    const key=historyKey(d),editing=state.editing.has(key),saving=state.saving.has(key);
    if(state.closingReportBusy.has(key))return '<div class="closing-loading">Загружаем таблицу закрытия дня…</div>';
    if(!state.closingReports[key])return '<div class="closing-loading">Таблица закрытия дня ещё не загружена.</div>';
    const rows=closingRows(d), groups=new Map();
    for(const r of rows){const g=(r.group_name||'Прочее').trim()||'Прочее';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(r)}
    const body=[...groups.entries()].sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ru')).map(([g,rs])=>{
      rs.sort((a,b)=>String(a.dish_name).localeCompare(String(b.dish_name),'ru'));
      return `<tr class="closing-group"><td colspan="7">${esc(g)}</td></tr>${rs.map(r=>`<tr><td class="closing-dish">${esc(r.dish_name)}</td><td>${fmt(r.opening_qty)}</td><td>${fmt(r.received_qty)}</td><td>${editing?closeInput(d,r,'leftover'):fmt(r.leftover_qty)}</td><td>${editing?closeInput(d,r,'waste'):fmt(r.waste_qty)}</td><td>${editing?closeInput(d,r,'frozen'):fmt(r.frozen_qty)}</td><td class="sold">${fmt(r.sold_qty)}</td></tr>`).join('')}`;
    }).join('');
    const sum=f=>rows.reduce((s,r)=>s+num(r[f]),0);
    const controls=`<div class="edit-toolbar closing-toolbar">${editing?`<label>Сотрудник<select data-actor-select>${actorOptions()}</select></label>`:''}<div class="edit-buttons"><button class="primary" data-closing-edit="${esc(key)}" ${saving?'disabled':''}>${saving?'Сохраняем…':editing?'Сохранить':'Редактировать'}</button>${editing?`<button class="secondary" data-closing-cancel="${esc(key)}" ${saving?'disabled':''}>Отмена</button>`:''}</div></div>`;
    return `${controls}<div class="closing-wrap"><table class="closing-table"><thead><tr><th>Номенклатура</th><th>Остаток на начало</th><th>Пришло</th><th>Остаток</th><th>Утиль</th><th>Заморозка</th><th>Итого продано</th></tr></thead><tbody>${body}<tr class="closing-total"><td>ИТОГО</td><td>${fmt(sum('opening_qty'))}</td><td>${fmt(sum('received_qty'))}</td><td>${fmt(sum('leftover_qty'))}</td><td>${fmt(sum('waste_qty'))}</td><td>${fmt(sum('frozen_qty'))}</td><td>${fmt(sum('sold_qty'))}</td></tr></tbody></table></div>`;
  }
  details=function(d){
    if(d.doc_type==='closing'){
      return `<div class="details closing-details"><div class="details-grid"><div><b>Тип</b><br>${esc(typeName(d.doc_type))}</div><div><b>Точка</b><br>${esc(d.to_point||'—')}</div></div>${closingTable(d)}</div>`;
    }
    const x=d.details||{};
    const items=x.items||[];
    const singleDish=!items.length&&x.dish;
    const key=historyKey(d);
    const editing=state.editing.has(key);
    const saving=state.saving.has(key);
    const content=items.length?groupedItems(d,items):singleDish
      ?`<section class="doc-dish-group"><h4>${esc(x.group||'Прочее')}</h4><div class="items"><div><span>${esc(x.dish)}</span></div></div></section>`
      :`<pre>${esc(JSON.stringify(x,null,2))}</pre>`;
    const editable=items.some(i=>i.editable);
    const controls=editable?`<div class="edit-toolbar">${editing?`<label>Сотрудник<select data-actor-select>${actorOptions()}</select></label>`:''}<div class="edit-buttons"><button class="primary" data-edit-type="${esc(d.doc_type)}" data-edit-id="${esc(d.doc_id)}" ${saving?'disabled':''}>${saving?'Сохраняем…':editing?'Сохранить':'Редактировать'}</button>${editing?`<button class="secondary" data-cancel-type="${esc(d.doc_type)}" data-cancel-id="${esc(d.doc_id)}" ${saving?'disabled':''}>Отмена</button>`:''}</div></div>`:'';
    return `<div class="details"><div class="details-grid"><div><b>Тип</b><br>${esc(typeName(d.doc_type))}</div><div><b>Кто создал</b><br>${esc(d.actor||'—')}</div></div>${controls}${content}</div>`;
  };
  const baseBind=bind;
  bind=function(){
    baseBind();
    document.querySelectorAll('[data-open]').forEach(b=>{
      const key=b.dataset.open,d=(state.data?.documents||[]).find(x=>historyKey(x)===key);
      if(d?.doc_type==='closing')b.onclick=async()=>{
        if(state.open.has(key)){state.open.delete(key);render();return}
        state.open.add(key);render();await loadClosingReport(d);
      };
    });
    document.querySelectorAll('[data-closing-edit]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.closingEdit);if(!d)return;state.editing.has(historyKey(d))?saveClosingEdit(d):startClosingEdit(d)});
    document.querySelectorAll('[data-closing-cancel]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.closingCancel);if(d)cancelClosingEdit(d)});
    document.querySelectorAll('[data-close-draft]').forEach(inp=>inp.oninput=()=>state.closingDrafts[inp.dataset.closeDraft]=inp.value);
  };
})();
