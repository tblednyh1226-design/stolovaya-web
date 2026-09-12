// Refreeze guard: thawed portions must not be frozen again; fresh arrivals of the same dish may be frozen.
(function(){
  const num=v=>v==null||v===''?0:Number(String(v).replace(',','.'));
  const confirmed=new Set();
  function freshQty(x){return Math.max(0,num(x?.moved_qty)+num(x?.internal_in_qty)-num(x?.internal_out_qty));}
  function dishForInput(inp){return (state.items||[]).find(x=>String(x.dish_id)===String(inp.dataset.dish));}

  // Editing convenience: tapping a numeric field containing 0 selects the 0, so the next digit replaces it.
  document.addEventListener('focusin',e=>{
    const inp=e.target.closest?.('input[type="number"],input[inputmode="decimal"]');
    if(!inp)return;
    if(String(inp.value).trim()==='0'){
      requestAnimationFrame(()=>{try{inp.select()}catch{}});
    }
  });
  document.addEventListener('pointerdown',e=>{
    const inp=e.target.closest?.('input[type="number"],input[inputmode="decimal"]');
    if(inp && String(inp.value).trim()==='0') requestAnimationFrame(()=>{try{inp.select()}catch{}});
  });

  // Warn only when this exact nomenclature was thawed today and the user tries to freeze it.
  document.addEventListener('change',e=>{
    const inp=e.target.closest?.('input[data-field="frozen"]');
    if(!inp)return;
    const x=dishForInput(inp); if(!x)return;
    const freeze=num(inp.value),thawed=num(x.freezer_out_qty),fresh=freshQty(x);
    if(!(freeze>0 && thawed>0))return;
    const key=`${state.point}|${state.home?.businessDate||''}|${x.dish_id}|${freeze}`;
    if(fresh<=0){
      alert('Это блюдо сегодня доставали из заморозки. Повторно замораживать эти порции нельзя — свежего прихода сегодня не было.');
      inp.value='0'; inp.dispatchEvent(new Event('input',{bubbles:true})); return;
    }
    if(freeze>fresh+0.0001){
      alert(`Это блюдо сегодня доставали из заморозки. Повторно замораживать размороженные порции нельзя. Из сегодняшнего прихода можно заморозить не более ${fresh.toLocaleString('ru-RU',{maximumFractionDigits:3})}.`);
      inp.value=String(fresh); inp.dispatchEvent(new Event('input',{bubbles:true})); return;
    }
    if(!confirmed.has(key)){
      const ok=confirm(`Это блюдо сегодня уже доставали из заморозки. Повторно замораживать размороженные порции нельзя.\n\nСегодня был свежий приход: ${fresh.toLocaleString('ru-RU',{maximumFractionDigits:3})}. Подтвердите, что в заморозку отправляются именно порции из сегодняшнего прихода.`);
      if(!ok){inp.value='0';inp.dispatchEvent(new Event('input',{bubbles:true}));return}
      confirmed.add(key);
    }
  },true);
})();
