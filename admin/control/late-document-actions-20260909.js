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
    if(!key)return;
    state.busy=true;state.message='';render();
    try{
      await rpc('admin_resolve_late_document',{p_token:state.token,p_external_key:key,p_action:'dismiss',p_comment:'Предупреждение о новом перемещении задним числом просмотрено администратором',p_actor:'Администратор'});
      await load();state.message=`Перемещение${number?` №${number}`:''} отмечено как учтённое.`;
    }catch(e){state.message=e.message||'Не удалось отметить перемещение';state.busy=false;render()}
  }
  const oldBind=bind;
  bind=function(){oldBind();document.querySelectorAll('.late-dismiss').forEach(b=>b.onclick=()=>dismissLate(b.dataset.key,b.dataset.doc));};
})();
