// Shawarma must not remain for sale on the next day.
(function(){
  const isBlocked=x=>/шаверм/i.test(String(x?.dish_name||''));
  function normalize(){
    for(const x of state.items||[]){
      if(!isBlocked(x))continue;
      if(!state.entries[x.dish_id])state.entries[x.dish_id]={leftover:'0',waste:'',frozen:'',touched:{}};
      state.entries[x.dish_id].leftover='0';
      state.entries[x.dish_id].touched={...(state.entries[x.dish_id].touched||{}),leftover:true};
    }
  }
  const prevClosingCard=closingCard;
  closingCard=function(x){
    if(!isBlocked(x))return prevClosingCard(x);
    normalize();
    const e=state.entries[x.dish_id]||{leftover:'0',waste:'',frozen:''};
    const total=n(e.waste)+n(e.frozen);
    const bad=total>n(x.available_qty)+.0001;
    return `<article class="item-card ${bad?'bad':''}"><h3>${esc(clean(x.dish_name))}</h3><div class="meta">Доступно сегодня: <b>${fmt(x.available_qty)}</b></div><div class="fields"><label>Осталось<input data-dish="${x.dish_id}" data-field="leftover" inputmode="decimal" value="0" disabled aria-disabled="true"></label><label>Утиль<input data-dish="${x.dish_id}" data-field="waste" inputmode="decimal" value="${esc(e.waste)}" placeholder="—"></label>${x.can_freeze?`<label>Заморозка<input data-dish="${x.dish_id}" data-field="frozen" inputmode="decimal" value="${esc(e.frozen)}" placeholder="—"></label>`:''}</div><p class="shawarma-rule-note">К продаже завтра не допускается. Остаток на следующий день — 0.</p><div class="balance-row"><span>Продано: <b>${fmt(n(x.available_qty)-total)}</b></span><span>${fmt(total)} из ${fmt(x.available_qty)}</span></div>${bad?'<p class="error-text">Сумма больше доступного количества</p>':''}</article>`;
  };
  const prevRender=render;
  render=function(){normalize();prevRender()};
  const style=document.createElement('style');
  style.textContent='.item-card input[data-field="leftover"]:disabled{background:#ecebe6;color:#7d817d;border-color:#d8d5cc}.shawarma-rule-note{margin:10px 0 0;padding:9px 10px;border-radius:10px;background:#fff4df;color:#8a5a16;font-size:12px;font-weight:700;line-height:1.35}';
  document.head.appendChild(style);
})();