// Validate required closing fields before final submit and highlight missing cards.
(function(){
  const originalFinalize=finalize;

  function missingRows(){
    return (state.items||[]).filter(x=>{
      const e=state.entries?.[x.dish_id]||{};
      return (e.leftover??'')==='';
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

  finalize=async function(){
    const missing=missingRows();
    if(missing.length){
      markMissing(missing);
      state.message=`Не заполнено обязательное поле «Осталось» у ${missing.length} ${missing.length===1?'позиции':'позиций'}. Заполните его, даже если остаток 0.`;
      render();
      queueMicrotask(()=>{
        markMissing(missingRows());
        const first=document.querySelector('.item-card.required-missing');
        first?.scrollIntoView({behavior:'smooth',block:'center'});
      });
      return;
    }
    clearMissingMarks();
    return originalFinalize();
  };

  document.addEventListener('input',e=>{
    const input=e.target.closest?.('input[data-dish][data-field="leftover"]');
    if(!input)return;
    const card=input.closest('.item-card');
    if((input.value??'')!==''){
      card?.classList.remove('required-missing');
      card?.querySelector('.required-missing-note')?.remove();
    }
  },true);
})();
