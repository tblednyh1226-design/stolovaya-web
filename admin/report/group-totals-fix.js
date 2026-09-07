(function(){
  function addGroupTotalsFixed(){
    if(!state.report)return;
    const table=document.querySelector('.section .matrix');
    if(!table)return;
    table.querySelectorAll('.group-total').forEach(x=>x.remove());
    const ps=points();
    const gs=groups(state.report.rows);
    const byName=new Map(gs.map(g=>[g.name,g]));
    [...table.querySelectorAll('tbody .group-row[data-group]')].forEach(gr=>{
      const groupName=decodeURIComponent(gr.dataset.group||'');
      const g=byName.get(groupName);
      if(!g)return;
      const ids=new Set(g.dishes.map(d=>d.id));
      const tr=document.createElement('tr');
      tr.className='group-total';
      const cells=ps.map(p=>{
        const rs=(state.report.rows||[]).filter(r=>r.point_code===p.code&&ids.has(r.dish_id));
        const sum=k=>rs.reduce((s,r)=>s+Number(r[k]||0),0);
        return `<td>${fmt(sum('opening_qty'))}</td><td>${fmt(sum('received_qty'))}</td><td>${fmt(sum('leftover_qty'))}</td><td>${fmt(sum('waste_qty'))}</td><td>${fmt(sum('frozen_qty'))}</td><td>${fmt(sum('sold_qty'))}</td>`;
      }).join('');
      tr.innerHTML=`<td class="sticky">Итого: ${esc(groupName)}</td>${cells}`;
      let before=null;
      for(let n=gr.nextElementSibling;n;n=n.nextElementSibling){if(n.classList.contains('group-row')||n.classList.contains('total')){before=n;break}}
      if(before)before.parentNode.insertBefore(tr,before);else gr.parentNode.appendChild(tr);
    });
  }
  const prevBind=bind;
  bind=function(){prevBind();addGroupTotalsFixed()};
  if(state.report)render();
})();
