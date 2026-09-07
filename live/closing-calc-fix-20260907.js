// Reliable live closing calculation.
// Продано = Доступно - Осталось - Утиль - Заморозка.
// Always calculate from the actual values visible in the card inputs, then sync state.entries.
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
  function valuesFromCard(card,dishId){
    const get=field=>card.querySelector(`input[data-dish="${dishId}"][data-field="${field}"]`)?.value??'';
    return {
      leftover:get('leftover'),
      waste:get('waste'),
      frozen:get('frozen')
    };
  }
  function syncEntry(dishId,vals,changedField){
    if(!state.entries[dishId]) state.entries[dishId]={leftover:'',waste:'',frozen:'',touched:{}};
    for(const f of ['leftover','waste','frozen']){
      if(vals[f]!==undefined) state.entries[dishId][f]=normalizeRaw(vals[f]);
    }
    if(changedField){
      state.entries[dishId].touched={...(state.entries[dishId].touched||{}),[changedField]:true};
    }
    if(typeof saveDraft==='function') saveDraft();
  }
  function refreshCard(input){
    const card=input.closest('.item-card');
    if(!card) return;
    const dishId=String(input.dataset.dish||'');
    const item=(state.items||[]).find(x=>String(x.dish_id)===dishId);
    if(!item) return;

    const vals=valuesFromCard(card,dishId);
    syncEntry(dishId,vals,input.dataset.field);

    const leftover=num(vals.leftover);
    const waste=num(vals.waste);
    const frozen=num(vals.frozen);
    const used=leftover+waste+frozen;
    const available=num(item.available_qty);
    const sold=available-used;

    const row=card.querySelector('.balance-row');
    if(row){
      const parts=row.querySelectorAll('span');
      if(parts[0]) parts[0].innerHTML=`Продано: <b>${format(sold)}</b>`;
      if(parts[1]) parts[1].textContent=`${format(used)} из ${format(available)}`;
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
    refreshActions();
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

  // Bubble phase: the original app handler has already run. We then overwrite state
  // from the complete value that is actually visible in the input.
  document.addEventListener('input',function(e){
    const input=e.target.closest?.('input[data-dish][data-field]');
    if(!input) return;
    const raw=normalizeRaw(input.value);
    // Allow blank, integers, and up to 3 decimal places. Do not calculate from a partial invalid string.
    if(raw!==''&&!/^\d*(?:\.\d{0,3})?$/.test(raw)) return;
    refreshCard(input);
  },false);
})();
