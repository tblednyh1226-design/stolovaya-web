// Closing document: show and edit "Из заморозки" as a separate operational value.
(function(){
  state.thawClosingDrafts=state.thawClosingDrafts||{};
  state.thawClosingEditing=state.thawClosingEditing||new Set();
  state.thawClosingSaving=state.thawClosingSaving||new Set();

  const num=v=>v==null||v===''?0:Number(v);
  const fmt=v=>v==null?'—':Number(v).toLocaleString('ru-RU',{maximumFractionDigits:3});
  const rank=g=>{const order=['Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры','Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'];const i=order.indexOf(g);return i<0?999:i};
  const ck=(d,r,f)=>`${historyKey(d)}|thaw|${r.dish_id}|${f}`;

  function rowsFor(d){
    const report=state.closingReports?.[historyKey(d)];
    if(!report)return [];
    return (report.rows||[]).filter(r=>r.point_code===d.point_code&&(
      num(r.opening_qty)!==0||num(r.received_qty)!==0||num(r.thawed_qty)!==0||r.leftover_qty!=null||num(r.waste_qty)!==0||num(r.frozen_qty)!==0||r.sold_qty!=null||r.is_submitted
    ));
  }
  function beginEdit(d){
    const key=historyKey(d);state.thawClosingEditing.add(key);state.message='';
    for(const r of rowsFor(d))for(const f of ['thawed','leftover','waste','frozen'])state.thawClosingDrafts[ck(d,r,f)]=String(r[f+'_qty']??0);
    render();
  }
  function cancelEdit(d){
    const key=historyKey(d);state.thawClosingEditing.delete(key);
    for(const r of rowsFor(d))for(const f of ['thawed','leftover','waste','frozen'])delete state.thawClosingDrafts[ck(d,r,f)];
    render();
  }
  function input(d,r,f){
    const key=ck(d,r,f),v=state.thawClosingDrafts[key]??String(r[f+'_qty']??0);
    return `<input class="close-edit-input" type="number" min="0" step="0.001" inputmode="decimal" data-thaw-draft="${esc(key)}" value="${esc(v)}">`;
  }
  async function saveEdit(d){
    const key=historyKey(d),changes=[];
    for(const r of rowsFor(d)){
      const vals={};
      for(const f of ['thawed','leftover','waste','frozen']){
        vals[f]=Number(String(state.thawClosingDrafts[ck(d,r,f)]??'0').replace(',','.'));
        if(!Number.isFinite(vals[f])||vals[f]<0){state.message='Проверьте количества в закрытии дня';render();return}
      }
      if(vals.thawed!==num(r.thawed_qty)||vals.leftover!==num(r.leftover_qty)||vals.waste!==num(r.waste_qty)||vals.frozen!==num(r.frozen_qty))changes.push({r,vals});
    }
    if(!changes.length){cancelEdit(d);return}
    state.thawClosingSaving.add(key);state.message='';render();
    try{
      for(const ch of changes){
        if(ch.vals.thawed!==num(ch.r.thawed_qty)){
          await rpc('admin_set_freezer_out',{
            p_token:state.token,p_business_date:d.business_date,p_point_code:d.point_code,p_dish_id:ch.r.dish_id,
            p_quantity:ch.vals.thawed,p_actor:state.actor||'Администратор',p_reason:'Корректировка из документа закрытия дня'
          });
        }
        if(ch.vals.leftover!==num(ch.r.leftover_qty)||ch.vals.waste!==num(ch.r.waste_qty)||ch.vals.frozen!==num(ch.r.frozen_qty)){
          await rpc('admin_correct_closing',{
            p_token:state.token,p_business_date:d.business_date,p_point_code:d.point_code,p_dish_id:ch.r.dish_id,
            p_leftover:ch.vals.leftover,p_waste:ch.vals.waste,p_frozen:ch.vals.frozen,
            p_reason:'Корректировка из журнала документов',p_comment:null,p_actor:state.actor||'Администратор'
          });
        }
      }
      state.thawClosingEditing.delete(key);delete state.closingReports[key];delete state.histories[key];
      state.closingReports[key]=await rpc('admin_main_operational_report',{p_token:state.token,p_business_date:d.business_date});
      await load();
      state.message=`Закрытие дня ${d.business_date} · ${d.to_point||d.point_code} пересчитано`;
    }catch(e){state.message=e.message||'Не удалось сохранить корректировку'}
    finally{state.thawClosingSaving.delete(key);render()}
  }

  const prevDetails=details;
  details=function(d){
    if(d.doc_type!=='closing')return prevDetails(d);
    const key=historyKey(d),editing=state.thawClosingEditing.has(key),saving=state.thawClosingSaving.has(key),report=state.closingReports?.[key];
    if(state.closingReportBusy?.has(key))return '<div class="details closing-details"><div class="closing-loading">Загружаем таблицу закрытия дня…</div></div>';
    if(!report)return prevDetails(d);
    const rows=rowsFor(d),groups=new Map();
    for(const r of rows){const g=(r.group_name||'Прочее').trim()||'Прочее';if(!groups.has(g))groups.set(g,[]);groups.get(g).push(r)}
    const body=[...groups.entries()].sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ru')).map(([g,rs])=>{
      rs.sort((a,b)=>String(a.dish_name).localeCompare(String(b.dish_name),'ru'));
      return `<tr class="closing-group"><td colspan="8">${esc(g)}</td></tr>${rs.map(r=>`<tr><td class="closing-dish">${esc(r.dish_name)}</td><td>${fmt(r.opening_qty)}</td><td>${fmt(r.received_qty)}</td><td>${editing?input(d,r,'thawed'):fmt(r.thawed_qty)}</td><td>${editing?input(d,r,'leftover'):fmt(r.leftover_qty)}</td><td>${editing?input(d,r,'waste'):fmt(r.waste_qty)}</td><td>${editing?input(d,r,'frozen'):fmt(r.frozen_qty)}</td><td class="sold">${fmt(r.sold_qty)}</td></tr>`).join('')}`;
    }).join('');
    const sum=f=>rows.reduce((s,r)=>s+num(r[f]),0);
    const controls=`<div class="edit-toolbar closing-toolbar"><div class="edit-buttons"><button class="primary" data-thaw-closing-edit="${esc(key)}" ${saving?'disabled':''}>${saving?'Сохраняем…':editing?'Сохранить':'Редактировать'}</button>${editing?`<button class="secondary" data-thaw-closing-cancel="${esc(key)}" ${saving?'disabled':''}>Отмена</button>`:''}</div></div>`;
    return `<div class="details closing-details"><div class="details-grid"><div><b>Тип</b><br>${esc(typeName(d.doc_type))}</div><div><b>Точка</b><br>${esc(d.to_point||'—')}</div></div>${controls}<div class="closing-wrap"><table class="closing-table"><thead><tr><th>Номенклатура</th><th>Остаток на начало</th><th>Пришло</th><th>Из заморозки</th><th>Остаток</th><th>Утиль</th><th>Заморозка</th><th>Итого продано</th></tr></thead><tbody>${body}<tr class="closing-total"><td>ИТОГО</td><td>${fmt(sum('opening_qty'))}</td><td>${fmt(sum('received_qty'))}</td><td>${fmt(sum('thawed_qty'))}</td><td>${fmt(sum('leftover_qty'))}</td><td>${fmt(sum('waste_qty'))}</td><td>${fmt(sum('frozen_qty'))}</td><td>${fmt(sum('sold_qty'))}</td></tr></tbody></table></div></div>`;
  };

  const prevBind=bind;
  bind=function(){
    prevBind();
    document.querySelectorAll('[data-thaw-closing-edit]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.thawClosingEdit);if(!d)return;state.thawClosingEditing.has(historyKey(d))?saveEdit(d):beginEdit(d)});
    document.querySelectorAll('[data-thaw-closing-cancel]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.thawClosingCancel);if(d)cancelEdit(d)});
    document.querySelectorAll('[data-thaw-draft]').forEach(inp=>inp.oninput=()=>state.thawClosingDrafts[inp.dataset.thawDraft]=inp.value);
  };
  if(state.data)render();
})();
