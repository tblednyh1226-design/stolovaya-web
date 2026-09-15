// Recalculate iiko and immediately refresh Control so the resolved card disappears.
(function(){
  recalculateIiko=async function(externalKey,docNumber,businessDate,pointName){
    if(!externalKey||state.busy)return;
    const text=`Пересчитать перемещение iiko${docNumber?` №${docNumber}`:''} за ${fmtDate(businessDate)}${pointName?` • ${pointName}`:''}?\n\nАктуальная версия из iiko заменит старую в рабочих документах.`;
    if(!confirm(text))return;
    state.busy=true;state.message='';render();
    try{
      await rpc('admin_resolve_late_document',{p_token:state.token,p_external_key:externalKey,p_action:'recalculate',p_comment:'Пересчитано из блока Контроль после изменения iiko',p_actor:'Администратор'});
      // Remove the resolved card immediately, before the fresh dashboard arrives.
      if(state.data?.alerts){
        const removed=state.data.alerts.filter(a=>a.meta?.externalKey===externalKey);
        state.data.alerts=state.data.alerts.filter(a=>a.meta?.externalKey!==externalKey);
        if(state.data.summary){
          for(const a of removed){
            if(a.severity==='warning')state.data.summary.warnings=Math.max(0,Number(state.data.summary.warnings||0)-1);
            if(a.severity==='error')state.data.summary.errors=Math.max(0,Number(state.data.summary.errors||0)-1);
          }
        }
      }
      state.busy=false;
      state.message=`Перемещение${docNumber?` №${docNumber}`:''} пересчитано.`;
      render();
      // Then silently reload authoritative server state.
      await load(false);
      state.message=`Перемещение${docNumber?` №${docNumber}`:''} пересчитано.`;
      render();
    }catch(e){state.busy=false;state.message=e.message||'Не удалось пересчитать перемещение';render()}
  };
})();