// Better actions for late/changed iiko alerts. Kitchen-to-kitchen transit is informational only.
(function(){
  function lateDocumentUrl(a){
    const q=new URLSearchParams({id:String(a.meta?.documentId||''),date:a.businessDate||'',point:a.pointCode||''});
    return `../document/?${q.toString()}`;
  }
  function isKitchenTransit(a){
    const from=String(a.meta?.fromStore||a.meta?.fromStoreName||'').toLowerCase();
    const to=String(a.meta?.toStore||a.meta?.toStoreName||'').toLowerCase();
    const status=String(a.meta?.status||'').toLowerCase();
    return status==='warehouse_transit'||(from.includes('кухн')&&to.includes('кухн'));
  }
  const oldAlertCard=alertCard;
  alertCard=function(a){
    if(a.kind!=='late_iiko'&&a.kind!=='changed_iiko')return oldAlertCard(a);
    const url=lateDocumentUrl(a);
    const key=a.meta?.externalKey||'';
    const doc=esc(a.meta?.documentNumber||'');
    const date=esc(a.businessDate||'');
    const point=esc(a.pointName||'');
    if(isKitchenTransit(a)){
      const title='Изменено перемещение между кухнями';
      return `<article class="alert"><div class="alert-head"><div><h3>ℹ ${title}</h3><div class="alert-meta">${esc(a.pointName||'')} · ${esc(fmtDate(a.businessDate))}</div></div><div class="alert-actions"><a class="secondary admin-link" href="${url}">Открыть документ</a></div></div><p>${esc(a.description||'')} Изменение учтено как движение между кухнями; пересчёт точки продаж не требуется.</p></article>`;
    }
    if(a.kind==='changed_iiko')return oldAlertCard(a);
    const recalc=key?`<button class="recalc-iiko" data-key="${esc(key)}" data-doc="${doc}" data-date="${date}" data-point="${point}" ${state.busy?'disabled':''}>Пересчитать</button>`:'';
    const dismiss=key?`<button class="late-dismiss secondary" data-key="${esc(key)}" data-doc="${doc}" ${state.busy?'disabled':''}>Учтено без пересчёта</button>`:'';
    return `<article class="alert ${a.severity==='error'?'error':''}"><div class="alert-head"><div><h3>${a.severity==='error'?'⛔':'⚠'} ${esc(a.title)}</h3><div class="alert-meta">${esc(a.pointName||'')} · ${esc(fmtDate(a.businessDate))}</div></div><div class="alert-actions">${recalc}<a class="secondary admin-link" href="${url}">Открыть документ</a>${dismiss}</div></div><p>${esc(a.description||'')}</p></article>`;
  };
  async function dismissLate(key,number){
    if(!key||state.busy)return;
    if(!confirm(`Отметить перемещение${number?` №${number}`:''} как учтённое БЕЗ пересчёта?\n\nИспользуйте это только если изменение не должно влиять на остатки и продажи.`))return;
    const snapshot=state.data?JSON.parse(JSON.stringify(state.data)):null;
    if(state.data?.alerts){
      const removed=state.data.alerts.find(a=>a.kind==='late_iiko'&&a.meta?.externalKey===key);
      state.data.alerts=state.data.alerts.filter(a=>!(a.kind==='late_iiko'&&a.meta?.externalKey===key));
      if(removed&&state.data.summary){if(removed.severity==='warning')state.data.summary.warnings=Math.max(0,Number(state.data.summary.warnings||0)-1);if(removed.severity==='error')state.data.summary.errors=Math.max(0,Number(state.data.summary.errors||0)-1)}
      if(state.data.iiko)state.data.iiko.lateDocuments=state.data.alerts.filter(a=>a.kind==='late_iiko').length;
    }
    state.message=`Перемещение${number?` №${number}`:''} отмечаем как учтённое без пересчёта…`;render();
    try{await rpc('admin_resolve_late_document',{p_token:state.token,p_external_key:key,p_action:'dismiss',p_comment:'Предупреждение просмотрено администратором; принято решение не пересчитывать документ',p_actor:'Администратор'});state.message=`Перемещение${number?` №${number}`:''} отмечено как учтённое без пересчёта.`;render();state.busy=false;await load();state.message=`Перемещение${number?` №${number}`:''} отмечено как учтённое без пересчёта.`;render()}catch(e){if(snapshot)state.data=snapshot;state.busy=false;state.message=e.message||'Не удалось отметить перемещение';render()}
  }
  const oldBind=bind;bind=function(){oldBind();document.querySelectorAll('.late-dismiss').forEach(b=>b.onclick=()=>dismissLate(b.dataset.key,b.dataset.doc))};
})();
