// Validate required closing fields before final submit and highlight missing cards.
(function(){
  const originalFinalize=finalize;

  function syncVisibleLeftovers(){
    document.querySelectorAll('input[data-dish][data-field="leftover"]').forEach(input=>{
      const dishId=String(input.dataset.dish||'');
      if(!dishId)return;
      if(!state.entries[dishId]) state.entries[dishId]={leftover:'',waste:'',frozen:'',touched:{}};
      state.entries[dishId].leftover=String(input.value??'').trim();
    });
  }

  function missingRows(){
    syncVisibleLeftovers();
    return (state.items||[]).filter(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return String(e.leftover??'').trim()==='';
    });
  }

  function clearMissingMarks(){
    document.querySelectorAll('.item-card.required-missing').forEach(card=>card.classList.remove('required-missing'));
    document.querySelectorAll('.required-missing-note').forEach(n=>n.remove());
  }

  function markMissing(rows){
    clearMissingMarks();
    const ids=new Set(rows.map(x=>String(x.dish_id)));
    document.querySelectorAll('input[data-dish][data-field="leftover"]').forEach(input=>{
      if(!ids.has(String(input.dataset.dish)))return;
      const card=input.closest('.item-card');
      if(!card)return;
      card.classList.add('required-missing');
      if(!card.querySelector('.required-missing-note')){
        const p=document.createElement('p');
        p.className='error-text required-missing-note';
        p.textContent='Заполните обязательное поле «Осталось» (можно 0)';
        card.appendChild(p);
      }
    });
  }

  function showMissing(missing){
    markMissing(missing);
    state.message=`Не заполнено обязательное поле «Осталось» у ${missing.length} ${missing.length===1?'позиции':'позиций'}. Введите 0, если остатка нет.`;
    render();
    requestAnimationFrame(()=>{
      markMissing(missingRows());
      const first=document.querySelector('.item-card.required-missing');
      first?.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  finalize=async function(){
    const missing=missingRows();
    if(missing.length){
      showMissing(missing);
      return;
    }
    clearMissingMarks();
    return originalFinalize();
  };

  // Capture the submit click before any older handlers bound by the base app.
  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('#finalize');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(state.busy)return;
    finalize();
  },true);

  document.addEventListener('input',e=>{
    const input=e.target.closest?.('input[data-dish][data-field="leftover"]');
    if(!input)return;
    const card=input.closest('.item-card');
    if(String(input.value??'').trim()!==''){
      card?.classList.remove('required-missing');
      card?.querySelector('.required-missing-note')?.remove();
    }
  },true);
})();
