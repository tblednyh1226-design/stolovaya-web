// Allow admin closing documents to be reopened for editing any number of times.
// Each new edit session reloads the current report and clears stale draft/saving state.
(function(){
  const num=v=>v==null||v===''?0:Number(v);
  const draftKey=(d,r,f)=>`${historyKey(d)}|thaw|${r.dish_id}|${f}`;
  const rowsFor=(d,report)=>((report?.rows)||[]).filter(r=>r.point_code===d.point_code&&(
    num(r.opening_qty)!==0||num(r.received_qty)!==0||num(r.thawed_qty)!==0||r.leftover_qty!=null||num(r.waste_qty)!==0||num(r.frozen_qty)!==0||r.sold_qty!=null||r.is_submitted
  ));

  async function reopenEdit(d){
    const key=historyKey(d);
    if(state.thawClosingSaving?.has(key))return;
    state.message='';
    try{
      // Always start from the latest values, including previous admin corrections.
      const report=await rpc('admin_main_operational_report',{p_token:state.token,p_business_date:d.business_date});
      state.closingReports=state.closingReports||{};
      state.closingReports[key]=report;
      state.thawClosingDrafts=state.thawClosingDrafts||{};
      for(const k of Object.keys(state.thawClosingDrafts))if(k.startsWith(key+'|thaw|'))delete state.thawClosingDrafts[k];
      for(const r of rowsFor(d,report))for(const f of ['thawed','leftover','waste','frozen']){
        state.thawClosingDrafts[draftKey(d,r,f)]=String(r[f+'_qty']??0);
      }
      state.thawClosingSaving?.delete(key);
      state.thawClosingEditing=state.thawClosingEditing||new Set();
      state.thawClosingEditing.add(key);
      render();
    }catch(e){
      state.message=e?.message||'Не удалось заново открыть документ для редактирования';
      render();
    }
  }

  // Capture only the "start editing" click. Save clicks remain handled by the existing editor.
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-thaw-closing-edit]');
    if(!b)return;
    const key=b.dataset.thawClosingEdit;
    if(state.thawClosingEditing?.has(key))return;
    const d=(state.data?.documents||[]).find(x=>historyKey(x)===key);
    if(!d||d.doc_type!=='closing')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    reopenEdit(d);
  },true);
})();
