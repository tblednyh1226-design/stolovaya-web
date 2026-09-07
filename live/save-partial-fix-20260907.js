// Reliable partial closing save: save all currently filled fields, not only touched flags.
(function(){
  function hasValue(v){ return v!=='' && v!=null; }
  function num(v){
    if(v==null||v==='') return 0;
    const x=Number(String(v).replace(',','.'));
    return Number.isFinite(x)?x:0;
  }
  function hasFilledEntry(){
    return (state.items||[]).some(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return hasValue(e.leftover)||hasValue(e.waste)||hasValue(e.frozen);
    });
  }
  function hasInvalid(){
    return (state.items||[]).some(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return num(e.leftover)+num(e.waste)+num(e.frozen)>num(x.available_qty)+0.0001;
    });
  }
  function refreshSaveButton(){
    if(state.screen!=='closing') return;
    const b=document.getElementById('save-partial');
    if(b) b.disabled=!!state.busy || !hasFilledEntry() || hasInvalid();
  }

  savePartial=async function(){
    const payload=[];
    for(const x of state.items||[]){
      const e=state.entries?.[x.dish_id];
      if(!e) continue;
      const row={dishId:x.dish_id};
      let filled=false;
      if(hasValue(e.leftover)){ row.leftover=num(e.leftover); filled=true; }
      if(hasValue(e.waste)){ row.waste=num(e.waste); filled=true; }
      if(hasValue(e.frozen)){ row.frozen=num(e.frozen); filled=true; }
      if(filled) payload.push(row);
    }
    if(!payload.length){
      state.message='Нет заполненных позиций для сохранения';
      render();
      return;
    }
    state.busy=true;
    state.message='';
    render();
    try{
      await rpc('public_save_closing_partial',{
        p_token:state.token,
        p_point_code:state.point,
        p_entries:payload,
        p_actor:'Буфетчик',
        p_business_date:businessDate()
      });
      localStorage.removeItem(draftKey());
      await loadPoint();
      state.screen='closing';
      state.message='Посчитанное сохранено';
    }catch(e){
      state.message=e?.message||'Не удалось сохранить посчитанное';
    }finally{
      state.busy=false;
      render();
    }
  };

  document.addEventListener('input',function(e){
    if(!e.target.closest?.('input[data-dish][data-field]')) return;
    queueMicrotask(refreshSaveButton);
  },true);

  // Rebind current screen so the button uses the new savePartial function.
  if(typeof bind==='function') bind();
  queueMicrotask(refreshSaveButton);
})();
