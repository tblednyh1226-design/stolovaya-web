// Add subtotal rows for every nomenclature group in the closing-day document.
(function(){
  function parseNum(text){
    const s=String(text??'').replace(/\s/g,'').replace(',','.').replace('—','');
    const n=Number(s);return Number.isFinite(n)?n:0;
  }
  function fmt(v){return Number(v||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}
  function cellValue(td){
    const input=td?.querySelector('input');
    return input?parseNum(input.value):parseNum(td?.textContent);
  }
  function refreshClosingGroupTotals(){
    document.querySelectorAll('.closing-table').forEach(table=>{
      table.querySelectorAll('.closing-group-total').forEach(x=>x.remove());
      const groups=[...table.querySelectorAll('tbody tr.closing-group')];
      for(const groupRow of groups){
        const sums=[0,0,0,0,0,0,0];
        let row=groupRow.nextElementSibling;
        let lastDish=null;
        while(row && !row.classList.contains('closing-group') && !row.classList.contains('closing-total')){
          if(!row.classList.contains('closing-group-total')){
            const cells=[...row.children];
            for(let i=1;i<=7;i++)sums[i-1]+=cellValue(cells[i]);
            lastDish=row;
          }
          row=row.nextElementSibling;
        }
        if(!lastDish)continue;
        const subtotal=document.createElement('tr');
        subtotal.className='closing-group-total';
        subtotal.innerHTML=`<td>Итого по группе</td>${sums.map(v=>`<td>${fmt(v)}</td>`).join('')}`;
        lastDish.parentNode.insertBefore(subtotal,lastDish.nextElementSibling);
      }
    });
  }
  const previousBind=bind;
  bind=function(){
    previousBind();
    refreshClosingGroupTotals();
    document.querySelectorAll('.closing-table input').forEach(inp=>inp.addEventListener('input',refreshClosingGroupTotals));
  };
  const style=document.createElement('style');
  style.textContent='.closing-group-total td{font-weight:800;background:#f1f4ee;color:#315f49;border-top:1px solid #ccd6cb}.closing-group-total td:first-child{background:#f1f4ee!important}';
  document.head.appendChild(style);
  if(state.data)render();
})();
