// Русские подписи и понятная история для актов реализации/утилизации.
(function(){
  const baseTypeName=typeName;
  typeName=function(t){
    return ({realization:'Реализация',utilization:'Утилизация'})[t]||baseTypeName(t);
  };
  const baseHistoryHtml=historyHtml;
  historyHtml=function(d){
    const key=historyKey(d);
    if(state.historyBusy.has(key))return `<div class="details"><p>Загружаем историю…</p></div>`;
    const info=state.histories[key];
    if(info?.error)return `<div class="details"><p class="message">${esc(info.error)}</p></div>`;
    const events=info?.events||[];
    if(!events.length)return `<div class="details"><p>Для этого документа событий пока нет.</p></div>`;
    return `<div class="details"><h3>История документа</h3><div class="items history-list">${events.map(e=>`<div><span><b>${esc(e.action||'Изменение')}</b><small>${esc(fmtAt(e.at))}${e.actor?` · ${esc(e.actor)}`:''}${e.note?`<br>${esc(e.note)}`:''}</small></span></div>`).join('')}</div></div>`;
  };
})();
