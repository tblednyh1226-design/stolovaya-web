(()=>{
const STORE_KEY='stolovaya:kitchen-stock:column-order:v1';
const columns=[
  {key:'dish',label:'Блюдо / продукт',fixed:true},
  {key:'opening',label:'Начало'},
  {key:'produced',label:'Приготовлено'},
  {key:'incomingTransfer',label:'Приход перемещ.'},
  {key:'outgoingTransfer',label:'Ушло перемещ.'},
  {key:'sales',label:'Реализация'},
  {key:'writeOff',label:'Списано'},
  {key:'otherIncoming',label:'Прочий приход'},
  {key:'otherOutgoing',label:'Прочий расход'},
  {key:'closing',label:'Конец'},
  {key:'difference',label:'Δ начало/конец'},
  {key:'control',label:'Контроль'}
];
const movable=columns.filter(c=>!c.fixed).map(c=>c.key);
const labels=Object.fromEntries(columns.map(c=>[c.key,c.label]));
function readOrder(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');
    const valid=saved.filter(k=>movable.includes(k));
    for(const k of movable)if(!valid.includes(k))valid.push(k);
    return valid;
  }catch{return [...movable]}
}
let order=readOrder();
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(order))}
function annotate(table){
  const expected=columns.map(c=>c.key);
  for(const row of table.rows){
    if(row.cells.length!==expected.length)continue;
    const hasKeys=[...row.cells].every(c=>c.dataset.colKey);
    if(!hasKeys)[...row.cells].forEach((cell,i)=>cell.dataset.colKey=expected[i]);
  }
}
function apply(table){
  annotate(table);
  const desired=['dish',...order];
  for(const row of table.rows){
    if(row.cells.length!==desired.length)continue;
    const map=new Map([...row.cells].map(c=>[c.dataset.colKey,c]));
    desired.forEach(k=>{const cell=map.get(k);if(cell)row.appendChild(cell)});
  }
}
function move(key,delta){
  const i=order.indexOf(key),j=i+delta;
  if(i<0||j<0||j>=order.length)return;
  [order[i],order[j]]=[order[j],order[i]];save();refresh();
}
function dragReorder(from,to){
  if(from===to)return;
  const fi=order.indexOf(from),ti=order.indexOf(to);
  if(fi<0||ti<0)return;
  order.splice(fi,1);order.splice(ti,0,from);save();refresh();
}
function panelHtml(){return `<div class="column-order-panel" hidden><div class="column-order-head"><b>Порядок граф</b><button type="button" class="column-reset">Сбросить</button></div><p>Перетащите графу или используйте стрелки. «Блюдо / продукт» закреплено первым.</p><div class="column-order-list">${order.map((k,i)=>`<div class="column-order-item" draggable="true" data-column-key="${k}"><span class="drag-handle">☰</span><span>${labels[k]}</span><div class="column-arrows"><button type="button" data-move="left" ${i===0?'disabled':''}>←</button><button type="button" data-move="right" ${i===order.length-1?'disabled':''}>→</button></div></div>`).join('')}</div></div>`}
function bindControls(host){
  const toggle=host.querySelector('.column-order-toggle'),panel=host.querySelector('.column-order-panel');
  toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.classList.toggle('active',!panel.hidden)};
  host.querySelector('.column-reset').onclick=()=>{order=[...movable];save();refresh()};
  host.querySelectorAll('.column-order-item').forEach(item=>{
    item.querySelector('[data-move="left"]').onclick=()=>move(item.dataset.columnKey,-1);
    item.querySelector('[data-move="right"]').onclick=()=>move(item.dataset.columnKey,1);
    item.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',item.dataset.columnKey);item.classList.add('dragging')});
    item.addEventListener('dragend',()=>item.classList.remove('dragging'));
    item.addEventListener('dragover',e=>e.preventDefault());
    item.addEventListener('drop',e=>{e.preventDefault();dragReorder(e.dataTransfer.getData('text/plain'),item.dataset.columnKey)});
  });
}
function enhance(){
  const table=document.querySelector('.stock-table');if(!table)return;
  apply(table);
  const wrap=table.closest('.table-wrap');if(!wrap)return;
  const card=wrap.closest('.card');if(!card)return;
  let tools=card.querySelector('.column-order-tools');
  if(!tools){
    tools=document.createElement('div');tools.className='column-order-tools';
    tools.innerHTML=`<button type="button" class="column-order-toggle">↔ Настроить графы</button>${panelHtml()}`;
    wrap.before(tools);bindControls(tools);
  }
}
function refresh(){
  const old=document.querySelector('.column-order-tools');
  if(old){const wasOpen=!old.querySelector('.column-order-panel').hidden;old.remove();enhance();if(wasOpen){const t=document.querySelector('.column-order-toggle'),p=document.querySelector('.column-order-panel');if(t&&p){p.hidden=false;t.classList.add('active')}}}
  else enhance();
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})}).observe(document.getElementById('kitchen-stock-app')||document.body,{childList:true,subtree:true});
enhance();
})();