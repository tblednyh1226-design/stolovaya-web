// Stable partial closing save. One capture-phase handler owns the button.
(function(){
  function raw(v){return String(v??'').replace(/[\s\u00a0]/g,'').replace(',','.');}
  function has(v){return raw(v)!=='';}
  function num(v){const s=raw(v);if(s==='')return 0;const x=Number(s);return Number.isFinite(x)?x:0;}

  function syncVisible(){
    document.querySelectorAll('input[data-dish][data-field]').forEach(input=>{
      const id=String(input.dataset.dish||'');
      const field=input.dataset.field;
      if(!id||!field)return;
      if(!state.entries[id])state.entries[id]={leftover:'',waste:'',frozen:'',touched:{}};
      state.entries[id][field]=raw(input.value);
      state.entries[id].touched={...(state.entries[id].touched||{}),[field]:true};
    });
    if(typeof saveDraft==='function')saveDraft();
  }

  function invalid(){
    return (state.items||[]).some(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return num(e.leftover)+num(e.waste)+num(e.frozen)>num(x.available_qty)+0.0001;
    });
  }

  function anyFilled(){
    return (state.items||[]).some(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return has(e.leftover)||has(e.waste)||has(e.frozen);
    });
  }

  function refreshButton(){
    if(state.screen!=='closing')return;
    const b=document.getElementById('save-partial');
    if(b)b.disabled=!!state.busy||!anyFilled()||invalid();
  }

  async function robustSavePartial(){
    syncVisible();
    if(invalid()){
      state.message='Проверьте позиции: сумма остатка, утиля и заморозки больше доступного количества';
      render();
      return;
    }
    const payload=[];
    for(const x of state.items||[]){
      const e=state.entries?.[x.dish_id];
      if(!e)continue;
      const row={dishId:x.dish_id};
      let filled=false;
      if(has(e.leftover)){row.leftover=num(e.leftover);filled=true;}
      if(has(e.waste)){row.waste=num(e.waste);filled=true;}
      if(has(e.frozen)){row.frozen=num(e.frozen);filled=true;}
      if(filled)payload.push(row);
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
      state.message=`Посчитанное сохранено: ${payload.length} поз.`;
    }catch(e){
      state.message=e?.message||'Не удалось сохранить посчитанное';
    }finally{
      state.busy=false;
      render();
    }
  }

  // Keep the global name aligned for any code that calls savePartial directly.
  savePartial=robustSavePartial;

  // Capture phase prevents all older click listeners from also running.
  document.addEventListener('click',function(e){
    const b=e.target.closest?.('#save-partial');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(!b.disabled)robustSavePartial();
  },true);

  for(const ev of ['input','change','keyup','blur']){
    document.addEventListener(ev,function(e){
      if(!e.target.closest?.('input[data-dish][data-field]'))return;
      queueMicrotask(()=>{syncVisible();refreshButton();});
    },true);
  }

  // Re-rendering replaces the button node, so refresh its state whenever the app DOM changes.
  const root=document.getElementById('app');
  if(root)new MutationObserver(()=>queueMicrotask(refreshButton)).observe(root,{childList:true,subtree:true});
  queueMicrotask(refreshButton);
})();
