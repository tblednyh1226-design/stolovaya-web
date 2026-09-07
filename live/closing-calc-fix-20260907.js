// Stable closing calculation for mobile browsers.
// Продано = Доступно - Осталось - Утиль - Заморозка.
// The visible inputs are the source of truth. Reconcile on all relevant events
// and periodically while the closing screen is open, so missed Android input
// events cannot leave stale arithmetic on screen or in state.entries.
(function(){
  function normalizeRaw(v){
    return String(v??'').replace(/[\s\u00a0]/g,'').replace(',','.');
  }
  function num(v){
    const s=normalizeRaw(v);
    if(s==='') return 0;
    const x=Number(s);
    return Number.isFinite(x)?x:0;
  }
  function format(v){
    const x=Math.abs(Number(v))<0.0000001?0:Number(v||0);
    return x.toLocaleString('ru-RU',{maximumFractionDigits:3});
  }
  function validRaw(v){
    const s=normalizeRaw(v);
    return s==='' || /^\d*(?:\.\d{0,3})?$/.test(s);
  }
  function getCardValues(card,dishId){
    const value=field=>card.querySelector(`input[data-dish="${dishId}"][data-field="${field}"]`)?.value??'';
    return {leftover:value('leftover'),waste:value('waste'),frozen:value('frozen')};
  }
  function ensureEntry(dishId){
    if(!state.entries[dishId]) state.entries[dishId]={leftover:'',waste:'',frozen:'',touched:{}};
    if(!state.entries[dishId].touched) state.entries[dishId].touched={};
    return state.entries[dishId];
  }
  function reconcileCard(card,changedField){
    if(!card) return;
    const anyInput=card.querySelector('input[data-dish][data-field]');
    if(!anyInput) return;
    const dishId=String(anyInput.dataset.dish||'');
    const item=(state.items||[]).find(x=>String(x.dish_id)===dishId);
    if(!item) return;

    const vals=getCardValues(card,dishId);
    if(!validRaw(vals.leftover)||!validRaw(vals.waste)||!validRaw(vals.frozen)) return;

    const entry=ensureEntry(dishId);
    for(const f of ['leftover','waste','frozen']) entry[f]=normalizeRaw(vals[f]);
    if(changedField) entry.touched[changedField]=true;

    const leftover=num(vals.leftover);
    const waste=num(vals.waste);
    const frozen=num(vals.frozen);
    const used=leftover+waste+frozen;
    const available=num(item.available_qty);
    const sold=available-used;

    const balance=card.querySelector('.balance-row');
    if(balance){
      const spans=balance.querySelectorAll('span');
      if(spans[0]) spans[0].innerHTML=`Продано: <b>${format(sold)}</b>`;
      if(spans[1]) spans[1].textContent=`${format(used)} из ${format(available)}`;
    }

    const bad=used>available+0.0001 || sold < -0.0001;
    card.classList.toggle('bad',bad);
    let err=card.querySelector('.error-text');
    if(bad&&!err){
      err=document.createElement('p');
      err.className='error-text';
      err.textContent='Сумма больше доступного количества';
      card.appendChild(err);
    }else if(!bad&&err){
      err.remove();
    }
  }
  function reconcileAll(save){
    if(state.screen!=='closing') return;
    document.querySelectorAll('.item-card').forEach(card=>reconcileCard(card));
    refreshActions();
    if(save&&typeof saveDraft==='function') saveDraft();
  }
  function refreshActions(){
    if(state.screen!=='closing') return;
    const complete=(state.items||[]).length>0&&(state.items||[]).every(x=>(state.entries?.[x.dish_id]?.leftover??'')!=='');
    const invalid=(state.items||[]).some(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return num(e.leftover)+num(e.waste)+num(e.frozen)>num(x.available_qty)+0.0001;
    });
    const hasFilled=(state.items||[]).some(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return e.leftover!==''||e.waste!==''||e.frozen!=='';
    });
    const save=document.getElementById('save-partial');
    const finalize=document.getElementById('finalize');
    if(save) save.disabled=!!state.busy||!hasFilled||invalid;
    if(finalize) finalize.disabled=!!state.busy||!complete||invalid;
  }
  function handle(e){
    const input=e.target?.closest?.('input[data-dish][data-field]');
    if(!input) return;
    // The DOM already contains the value the user sees. Calculate from it immediately.
    reconcileCard(input.closest('.item-card'),input.dataset.field);
    refreshActions();
    if(typeof saveDraft==='function') saveDraft();
    // Android IME can finish updating a field after the event callback. Recheck once more.
    setTimeout(()=>{
      if(document.body.contains(input)){
        reconcileCard(input.closest('.item-card'),input.dataset.field);
        refreshActions();
        if(typeof saveDraft==='function') saveDraft();
      }
    },80);
  }

  ['input','change','keyup','blur','compositionend'].forEach(type=>{
    document.addEventListener(type,handle,true);
  });

  // Self-healing reconciliation. This is deliberately lightweight: only visible
  // closing cards are inspected, and no DOM is rebuilt while the user is typing.
  setInterval(()=>reconcileAll(false),250);

  // Also reconcile immediately after every render, because search/group toggles
  // replace card DOM nodes.
  const baseRender=render;
  render=function(){
    baseRender();
    if(state.screen==='closing') requestAnimationFrame(()=>reconcileAll(false));
  };
})();
