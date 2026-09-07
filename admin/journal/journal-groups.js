// Global document rule: every dish list is grouped by nomenclature group.
(function(){
  const GROUP_ORDER=[
    'Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры',
    'Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'
  ];
  const rank=g=>{const i=GROUP_ORDER.indexOf(g);return i<0?999:i};
  const value=i=>i.qty??i.sent??i.leftover??i.received??'';
  function actorOptions(){return `<option value="">Выберите сотрудника</option>${(state.employees||[]).map(e=>`<option value="${esc(e.fullName)}" ${state.actor===e.fullName?'selected':''}>${esc(e.fullName)}</option>`).join('')}`}
  function qtyCell(d,i){
    if(state.editing.has(historyKey(d))&&i.editable){
      const key=draftKey(d,i);
      const v=state.drafts[key]??String(value(i));
      return `<input class="qty-input" type="number" step="0.001" inputmode="decimal" data-draft-key="${esc(key)}" value="${esc(v)}" aria-label="Количество ${esc(i.dish||'')}">`;
    }
    return `<b class="qty-value">${esc(value(i))}</b>`;
  }
  function groupedItems(d,items){
    const map=new Map();
    for(const i of items||[]){
      const g=(i.group||'Прочее').trim()||'Прочее';
      if(!map.has(g))map.set(g,[]);
      map.get(g).push(i);
    }
    return [...map.entries()]
      .sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ru'))
      .map(([group,rows])=>{
        rows.sort((a,b)=>String(a.dish||'').localeCompare(String(b.dish||''),'ru'));
        return `<section class="doc-dish-group"><h4>${esc(group)}</h4><div class="items">${rows.map(i=>`<div class="item-row"><span>${esc(i.dish||'')}</span><span class="qty-cell">${qtyCell(d,i)}</span></div>`).join('')}</div></section>`;
      }).join('');
  }
  details=function(d){
    const x=d.details||{};
    const items=x.items||[];
    const singleDish=!items.length&&x.dish;
    const key=historyKey(d);
    const editing=state.editing.has(key);
    const saving=state.saving.has(key);
    const content=items.length?groupedItems(d,items):singleDish
      ?`<section class="doc-dish-group"><h4>${esc(x.group||'Прочее')}</h4><div class="items"><div><span>${esc(x.dish)}</span></div></div></section>`
      :`<pre>${esc(JSON.stringify(x,null,2))}</pre>`;
    const editable=items.some(i=>i.editable);
    const controls=editable?`<div class="edit-toolbar">${editing?`<label>Сотрудник<select data-actor-select>${actorOptions()}</select></label>`:''}<div class="edit-buttons"><button class="primary" data-edit-type="${esc(d.doc_type)}" data-edit-id="${esc(d.doc_id)}" ${saving?'disabled':''}>${saving?'Сохраняем…':editing?'Сохранить':'Редактировать'}</button>${editing?`<button class="secondary" data-cancel-type="${esc(d.doc_type)}" data-cancel-id="${esc(d.doc_id)}" ${saving?'disabled':''}>Отмена</button>`:''}</div></div>`:'';
    return `<div class="details"><div class="details-grid"><div><b>Тип</b><br>${esc(typeName(d.doc_type))}</div><div><b>Кто создал</b><br>${esc(d.actor||'—')}</div></div>${controls}${content}</div>`;
  };
})();
