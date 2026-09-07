// Live closing calculation fix: Продано = Доступно - Осталось - Утиль - Заморозка
(function(){
  function num(v){
    if(v==null||v==='') return 0;
    const x=Number(String(v).replace(',','.'));
    return Number.isFinite(x)?x:0;
  }
  function format(v){
    return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:3});
  }
  function refreshCard(input){
    const card=input.closest('.item-card');
    if(!card) return;
    const dishId=input.dataset.dish;
    const item=(state.items||[]).find(x=>String(x.dish_id)===String(dishId));
    if(!item) return;
    const e=state.entries?.[dishId]||{};
    const leftover=num(e.leftover);
    const waste=num(e.waste);
    const frozen=num(e.frozen);
    const used=leftover+waste+frozen;
    const available=num(item.available_qty);
    const sold=available-used;
    const row=card.querySelector('.balance-row');
    if(row){
      const parts=row.querySelectorAll('span');
      if(parts[0]) parts[0].innerHTML=`Продано: <b>${format(sold)}</b>`;
      if(parts[1]) parts[1].textContent=`${format(used)} из ${format(available)}`;
    }
    const bad=used>available+0.0001;
    card.classList.toggle('bad',bad);
    let err=card.querySelector('.error-text');
    if(bad&&!err){
      err=document.createElement('p');
      err.className='error-text';
      err.textContent='Сумма больше доступного количества';
      card.appendChild(err);
    } else if(!bad&&err){
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
    const dirty=(state.items||[]).some(x=>Object.values(state.entries?.[x.dish_id]?.touched||{}).some(Boolean));
    const save=document.getElementById('save-partial');
    const finalize=document.getElementById('finalize');
    if(save) save.disabled=!!state.busy||!dirty||invalid;
    if(finalize) finalize.disabled=!!state.busy||!complete||invalid;
  }
  document.addEventListener('input',function(e){
    const input=e.target.closest?.('input[data-dish][data-field]');
    if(!input) return;
    // Run after the app's own input handler has updated state.entries.
    queueMicrotask(()=>refreshCard(input));
  },true);
})();
