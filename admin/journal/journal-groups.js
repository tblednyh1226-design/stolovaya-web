// Global document rule: every dish list is grouped by nomenclature group.
(function(){
  const GROUP_ORDER=[
    'Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры',
    'Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'
  ];
  const rank=g=>{const i=GROUP_ORDER.indexOf(g);return i<0?999:i};
  const value=i=>i.qty??i.sent??i.leftover??i.received??'';
  function groupedItems(items){
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
        return `<section class="doc-dish-group"><h4>${esc(group)}</h4><div class="items">${rows.map(i=>`<div><span>${esc(i.dish||'')}</span><b>${esc(value(i))}</b></div>`).join('')}</div></section>`;
      }).join('');
  }
  details=function(d){
    const x=d.details||{};
    const items=x.items||[];
    const singleDish=!items.length&&x.dish;
    const content=items.length?groupedItems(items):singleDish
      ?`<section class="doc-dish-group"><h4>${esc(x.group||'Прочее')}</h4><div class="items"><div><span>${esc(x.dish)}</span></div></div></section>`
      :`<pre>${esc(JSON.stringify(x,null,2))}</pre>`;
    return `<div class="details"><div class="details-grid"><div><b>Тип</b><br>${esc(typeName(d.doc_type))}</div><div><b>Кто</b><br>${esc(d.actor||'—')}</div></div>${content}</div>`;
  };
})();
