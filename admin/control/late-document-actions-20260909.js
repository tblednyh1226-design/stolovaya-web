// Better actions for "late iiko" alerts: open the exact movement and allow dismissing the warning.
(function(){
  function lateDocumentUrl(a){
    const q=new URLSearchParams({id:String(a.meta?.documentId||''),date:a.businessDate||'',point:a.pointCode||''});
    return `../document/?${q.toString()}`;
  }
  const oldAlertCard=alertCard;
  alertCard=function(a){
    if(a.kind!=='late_iiko')return oldAlertCard(a);
    const url=lateDocumentUrl(a);
    const key=a.meta?.externalKey||'';
    return `<article class="alert ${a.severity==='error'?'error':''}"><div class="alert-head"><div><h3>${a.severity==='error'?'⛔':'⚠'} ${esc(a.title)}</h3><div class="alert-meta">${esc(a.pointName||'')} · ${esc(fmtDate(a.businessDate))}</div></div><div class="alert-actions"><a class="secondary admin-link" href="${url}">Открыть документ</a>${key?`<button class="late-dismiss" data-key="${esc(key)}" data-doc="${esc(a.meta?.documentNumber||'')}" ${state.busy?'disabled':''}>Учтено</button>`:''}</div></div><p>${esc(a.description||'')}</p></article>`;
  };
  async function dismissLate(key,number){
    if(!key||state.busy)return;

    // Optimistic UI: remove the card immediately after the click.
    // If the server rejects the action, restore the previous dashboard snapshot.
    const snapshot=state.data?JSON.parse(JSON.stringify(state.data)):null;
    if(state.data?.alerts){
      const removed=state.data.alerts.find(a=>a.kind==='late_iiko'&&a.meta?.externalKey===key);
      state.data.alerts=state.data.alerts.filter(a=>!(a.kind==='late_iiko'&&a.meta?.externalKey===key));
      if(removed&&state.data.summary){
        if(removed.severity==='warning')state.data.summary.warnings=Math.max(0,Number(state.data.summary.warnings||0)-1);
        if(removed.severity==='error')state.data.summary.errors=Math.max(0,Number(state.data.summary.errors||0)-1);
      }
      if(state.data.iiko)state.data.iiko.lateDocuments=state.data.alerts.filter(a=>a.kind==='late_iiko').length;
    }
    state.message=`Перемещение${number?` №${number}`:''} отмечаем как учтённое…`;
    render();

    try{
      await rpc('admin_resolve_late_document',{
        p_token:state.token,
        p_external_key:key,
        p_action:'dismiss',
        p_comment:'Предупреждение о новом перемещении задним числом просмотрено администратором',
        p_actor:'Администратор'
      });
      state.message=`Перемещение${number?` №${number}`:''} отмечено как учтённое.`;
      render();
      // Quietly reconcile the dashboard with the database; the card is already gone.
      state.busy=false;
      await load();
      state.message=`Перемещение${number?` №${number}`:''} отмечено как учтённое.`;
      render();
    }catch(e){
      if(snapshot)state.data=snapshot;
      state.busy=false;
      state.message=e.message||'Не удалось отметить перемещение';
      render();
    }
  }
  const oldBind=bind;
  bind=function(){
    oldBind();
    document.querySelectorAll('.late-dismiss').forEach(b=>b.onclick=()=>dismissLate(b.dataset.key,b.dataset.doc));
  };
})();
