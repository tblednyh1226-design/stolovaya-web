// Allow admin closing documents to be reopened for editing any number of times.
// Each new edit session reloads the latest values and clears stale draft/saving state.
(function(){
  const num=v=>v==null||v===''?0:Number(String(v).replace(',','.'));
  const confirmed=new Set();
  const draftKey=(d,r,f)=>`${historyKey(d)}|thaw|${r.dish_id}|${f}`;
  const rowsFor=(d,report)=>((report?.rows)||[]).filter(r=>r.point_code===d.point_code&&(
    num(r.opening_qty)!==0||num(r.received_qty)!==0||num(r.thawed_qty)!==0||r.leftover_qty!=null||num(r.waste_qty)!==0||num(r.frozen_qty)!==0||r.sold_qty!=null||r.is_submitted
  ));

  async function reopenEdit(d){
    const key=historyKey(d);
    if(state.thawClosingSaving?.has(key))return;
    state.message='';
    state.thawClosingSaving?.delete(key);
    state.thawClosingEditing?.delete(key);
    try{
      const report=await rpc('admin_main_operational_report',{p_token:state.token,p_business_date:d.business_date});
      state.closingReports=state.closingReports||{};
      state.closingReports[key]=report;
      state.thawClosingDrafts=state.thawClosingDrafts||{};
      for(const k of Object.keys(state.thawClosingDrafts))if(k.startsWith(key+'|thaw|'))delete state.thawClosingDrafts[k];
      for(const r of rowsFor(d,report))for(const f of ['thawed','leftover','waste','frozen']){
        state.thawClosingDrafts[draftKey(d,r,f)]=String(r[f+'_qty']??0);
      }
      state.thawClosingEditing=state.thawClosingEditing||new Set();
      state.thawClosingEditing.add(key);
      render();
    }catch(e){
      state.thawClosingEditing?.delete(key);
      state.message=e?.message||'Не удалось заново открыть документ для редактирования';
      render();
    }
  }

  // Start editing is always intercepted here, so the same closing can be edited again and again.
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-thaw-closing-edit]');
    if(!b)return;
    const key=b.dataset.thawClosingEdit;
    if(state.thawClosingEditing?.has(key))return; // save click is handled by the main editor
    const d=(state.data?.documents||[]).find(x=>historyKey(x)===key);
    if(!d||d.doc_type!=='closing')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    reopenEdit(d);
  },true);

  // If a field contains 0, the first typed digit replaces the zero instead of appending to it.
  document.addEventListener('focusin',e=>{
    const inp=e.target.closest?.('.close-edit-input');
    if(inp&&String(inp.value).trim()==='0')requestAnimationFrame(()=>{try{inp.select()}catch{}});
  });
  document.addEventListener('pointerdown',e=>{
    const inp=e.target.closest?.('.close-edit-input');
    if(inp&&String(inp.value).trim()==='0')requestAnimationFrame(()=>{try{inp.select()}catch{}});
  });

  // In admin editing, warn only for the nomenclature that was actually taken from the freezer today.
  document.addEventListener('change',e=>{
    const inp=e.target.closest?.('[data-thaw-draft]');
    if(!inp)return;
    const parts=String(inp.dataset.thawDraft||'').split('|thaw|');
    if(parts.length!==2)return;
    const docKey=parts[0],tail=parts[1].split('|');
    if(tail.length<2||tail[tail.length-1]!=='frozen')return;
    const dishId=tail.slice(0,-1).join('|');
    const report=state.closingReports?.[docKey];
    const d=(state.data?.documents||[]).find(x=>historyKey(x)===docKey);
    const row=(report?.rows||[]).find(r=>d&&r.point_code===d.point_code&&String(r.dish_id)===String(dishId));
    if(!row)return;
    const freeze=num(inp.value),thawed=num(row.thawed_qty),fresh=Math.max(0,num(row.received_qty));
    if(!(freeze>0&&thawed>0))return;
    const confKey=`${docKey}|${dishId}|${freeze}`;
    if(fresh<=0){
      alert('Это блюдо сегодня доставали из заморозки. Повторно замораживать эти порции нельзя — свежего прихода сегодня не было.');
      inp.value='0';inp.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(freeze>fresh+0.0001){
      alert(`Это блюдо сегодня доставали из заморозки. Заморозить можно только порции из сегодняшнего прихода, не более ${fresh.toLocaleString('ru-RU',{maximumFractionDigits:3})}.`);
      inp.value=String(fresh);inp.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(!confirmed.has(confKey)){
      const ok=confirm(`Это блюдо сегодня уже доставали из заморозки. Повторно замораживать размороженные порции нельзя.\n\nСегодня был свежий приход: ${fresh.toLocaleString('ru-RU',{maximumFractionDigits:3})}. Подтвердите, что в заморозку отправляются именно порции из сегодняшнего прихода.`);
      if(!ok){inp.value='0';inp.dispatchEvent(new Event('input',{bubbles:true}));return}
      confirmed.add(confKey);
    }
  },true);
})();
