const API='https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc';
const KEY='sb_publishable_rcvNssgN4_dPnVUpjU0bjQ_1cEWsA52';
const root=document.getElementById('document-app');
const q=new URLSearchParams(location.search);const id=q.get('id')||'';const date=q.get('date')||'';const point=q.get('point')||'';
const token=sessionStorage.getItem('stolovaya:admin')||localStorage.getItem('stolovaya:admin')||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function rpc(name,body){const r=await fetch(`${API}/${name}`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||'Не удалось загрузить документ');return d}
function fmt(v){return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}
const GROUP_ORDER=['Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры','Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'];
const rank=g=>{const i=GROUP_ORDER.indexOf(g);return i<0?999:i};
function groupedItems(items){
  const groups=new Map();
  for(const i of items||[]){
    const g=String(i.group||'Прочее').trim()||'Прочее';
    if(!groups.has(g))groups.set(g,[]);
    groups.get(g).push(i);
  }
  return [...groups.entries()]
    .sort((a,b)=>rank(a[0])-rank(b[0])||a[0].localeCompare(b[0],'ru'))
    .map(([g,rows])=>{
      rows.sort((a,b)=>String(a.dish||'').localeCompare(String(b.dish||''),'ru'));
      return `<section class="item-group"><h2>${esc(g)}</h2><div class="items">${rows.map(i=>`<div class="item"><span>${esc(i.dish||'')}</span><b>${fmt(i.qty)}</b></div>`).join('')}</div></section>`;
    }).join('');
}
(async()=>{try{if(!token)throw new Error('Нет доступа администратора');if(!id||!date)throw new Error('Не указан документ');const d=await rpc('admin_document_journal',{p_token:token,p_from:date,p_to:date,p_type:'movement',p_point_code:point||null});const doc=(d.documents||[]).find(x=>String(x.doc_id)===String(id));if(!doc)throw new Error('Документ не найден');const x=doc.details||{},items=x.items||[];root.innerHTML=`<section class="doc-card"><div class="doc-head"><div><small>ПЕРЕМЕЩЕНИЕ</small><h1>Документ ${esc(doc.title||'')}</h1></div></div><div class="meta"><div><b>Дата</b><br>${esc(doc.business_date)}</div><div><b>Откуда</b><br>${esc(doc.from_point||'—')}</div><div><b>Куда</b><br>${esc(doc.to_point||'—')}</div><div><b>Позиций</b><br>${items.length}</div></div>${groupedItems(items)}</section>`}catch(e){root.innerHTML=`<div class="error">${esc(e.message)}</div>`}})();