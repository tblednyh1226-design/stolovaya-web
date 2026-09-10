// Add per-group totals to the freezer table.
(function(){
  const baseFreezer=freezer;
  freezer=function(){
    const ps=points();
    if(!ps.length)return '';
    const filtered=state.report.freezer.filter(r=>state.selected.has(r.point_code));
    const gs=groups(filtered);
    const sum=(g,p,key)=>g.dishes.reduce((total,d)=>{
      const r=frow(d.id,p.code);
      return total+Number(r?.[key]||0);
    },0);
    return `<section class="card section"><h2>Заморозка</h2><div class="wrap"><table class="matrix"><thead><tr><th class="sticky" rowspan="2">Номенклатура</th>${ps.map(p=>`<th colspan="4">${esc(p.name)}</th>`).join('')}</tr><tr>${ps.map(()=>['Остаток на начало','Разморозили','Заморозили','Остаток на конец'].map(h=>`<th>${h}</th>`).join('')).join('')}</tr></thead><tbody>${gs.length?gs.map(g=>`<tr class="group-row"><td class="sticky">${esc(g.name)}</td><td colspan="${ps.length*4}"></td></tr>${g.dishes.map(d=>`<tr><td class="sticky dish">${esc(d.name)}</td>${ps.map(p=>{const r=frow(d.id,p.code);return `<td>${fmt(r?.opening_qty)}</td><td>${fmt(r?.thawed_qty)}</td><td>${fmt(r?.frozen_qty)}</td><td>${fmt(r?.closing_qty)}</td>`}).join('')}</tr>`).join('')}<tr class="group-total"><td class="sticky">ИТОГО ${esc(g.name)}</td>${ps.map(p=>`<td>${fmt(sum(g,p,'opening_qty'))}</td><td>${fmt(sum(g,p,'thawed_qty'))}</td><td>${fmt(sum(g,p,'frozen_qty'))}</td><td>${fmt(sum(g,p,'closing_qty'))}</td>`).join('')}</tr>`).join(''):`<tr><td class="sticky">Нет движения по заморозке</td><td colspan="${ps.length*4}"></td></tr>`}</tbody></table></div></section>`;
  };
})();
