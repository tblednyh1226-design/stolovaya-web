// Добавляет в основной отчёт колонку «Доступно» сразу после «Пришло».
// Доступно = остаток на начало + пришло. Разморозка остаётся отдельным движением.
(function(){
  function n(v){return Number(v||0)}
  function sumRows(rows,key){return rows.reduce((s,r)=>s+n(r?.[key]),0)}
  function available(r){return n(r?.opening_qty)+n(r?.received_qty)}
  function sumAvailable(rows){return rows.reduce((s,r)=>s+available(r),0)}

  exportCsv=function(){
    if(!state.report)return;
    const ps=points(),gs=groups(state.report.rows);
    const head=['Группа','Номенклатура',...ps.flatMap(p=>[
      `${p.name} — Остаток на начало`,`${p.name} — Пришло`,`${p.name} — Доступно`,`${p.name} — Разморозка`,
      `${p.name} — Остаток`,`${p.name} — Утиль`,`${p.name} — Заморозка`,`${p.name} — Продано`
    ])];
    const lines=[head,...gs.flatMap(g=>g.dishes.map(d=>[g.name,d.name,...ps.flatMap(p=>{
      const r=row(d.id,p.code);
      return [r?.opening_qty??0,r?.received_qty??0,available(r),r?.thawed_qty??0,r?.leftover_qty??'',r?.waste_qty??'',r?.frozen_qty??'',r?.sold_qty??''];
    })]))];
    const csv='\ufeff'+lines.map(x=>x.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download=`stolovaya-report-${state.mode==='day'?state.date:`${state.from}-${state.to}`}.csv`;a.click();URL.revokeObjectURL(a.href);
  };

  matrix=function(){
    const ps=points();if(!ps.length)return '<section class="card empty">Выберите хотя бы одну точку.</section>';
    const gs=groups(state.report.rows);
    const heads=['Остаток на начало','Пришло','Доступно','Разморозка','Остаток','Утиль','Заморозка','Итого продано'];
    return `<section class="card section"><h2>Основной отчёт</h2><div class="wrap"><table class="matrix"><thead><tr><th class="sticky" rowspan="2">Номенклатура</th>${ps.map(p=>`<th colspan="8">${esc(p.name)}</th>`).join('')}</tr><tr>${ps.map(()=>heads.map(h=>`<th${h==='Доступно'?' class="available"':''}>${h}</th>`).join('')).join('')}</tr></thead><tbody>${gs.map(g=>`<tr class="group-row" data-group="${encodeURIComponent(g.name)}"><td class="sticky">${state.collapsed.has(g.name)?'＋':'−'} ${esc(g.name)}</td><td colspan="${ps.length*8}"></td></tr>${state.collapsed.has(g.name)?'':g.dishes.map(d=>`<tr><td class="sticky dish">${esc(d.name)}</td>${ps.map(p=>{const r=row(d.id,p.code);return `<td>${fmt(r?.opening_qty)}</td><td title="Кухня: ${fmt(r?.kitchen_in_qty)}; принято: ${fmt(r?.internal_in_qty)}; отправлено: ${fmt(r?.internal_out_qty)}">${fmt(r?.received_qty)}</td><td class="available">${fmt(available(r))}</td><td>${fmt(r?.thawed_qty)}</td><td>${fmt(r?.leftover_qty)}</td><td>${fmt(r?.waste_qty)}</td><td>${fmt(r?.frozen_qty)}</td><td class="sold">${fmt(r?.sold_qty)}</td>`}).join('')}</tr>`).join('')}`).join('')}<tr class="total"><td class="sticky">ИТОГО</td>${ps.map(p=>{const rs=state.report.rows.filter(r=>r.point_code===p.code);return `<td>${fmt(sumRows(rs,'opening_qty'))}</td><td>${fmt(sumRows(rs,'received_qty'))}</td><td class="available">${fmt(sumAvailable(rs))}</td><td>${fmt(sumRows(rs,'thawed_qty'))}</td><td>${fmt(sumRows(rs,'leftover_qty'))}</td><td>${fmt(sumRows(rs,'waste_qty'))}</td><td>${fmt(sumRows(rs,'frozen_qty'))}</td><td>${fmt(sumRows(rs,'sold_qty'))}</td>`}).join('')}</tr></tbody></table></div></section>`;
  };

  function fixGroupTotals(){
    if(!state.report)return;
    const table=document.querySelector('.section .matrix');if(!table)return;
    table.querySelectorAll('.group-total').forEach(x=>x.remove());
    const ps=points(),byName=new Map(groups(state.report.rows).map(g=>[g.name,g]));
    [...table.querySelectorAll('tbody .group-row[data-group]')].forEach(gr=>{
      const name=decodeURIComponent(gr.dataset.group||''),g=byName.get(name);if(!g)return;
      const ids=new Set(g.dishes.map(d=>d.id)),tr=document.createElement('tr');tr.className='group-total';
      tr.innerHTML=`<td class="sticky">Итого: ${esc(name)}</td>${ps.map(p=>{const rs=(state.report.rows||[]).filter(r=>r.point_code===p.code&&ids.has(r.dish_id));return `<td>${fmt(sumRows(rs,'opening_qty'))}</td><td>${fmt(sumRows(rs,'received_qty'))}</td><td class="available">${fmt(sumAvailable(rs))}</td><td>${fmt(sumRows(rs,'thawed_qty'))}</td><td>${fmt(sumRows(rs,'leftover_qty'))}</td><td>${fmt(sumRows(rs,'waste_qty'))}</td><td>${fmt(sumRows(rs,'frozen_qty'))}</td><td>${fmt(sumRows(rs,'sold_qty'))}</td>`}).join('')}`;
      let before=null;for(let el=gr.nextElementSibling;el;el=el.nextElementSibling){if(el.classList.contains('group-row')||el.classList.contains('total')){before=el;break}}
      before?before.parentNode.insertBefore(tr,before):gr.parentNode.appendChild(tr);
    });
  }
  const prevBind=bind;bind=function(){prevBind();fixGroupTotals()};
  if(state.report)render();
})();
