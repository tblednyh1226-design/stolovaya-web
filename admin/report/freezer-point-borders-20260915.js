// Полные вертикальные разделители точек в таблице «Заморозка».
(function(){
  function apply(){
    const sections=[...document.querySelectorAll('.section')];
    const section=sections.find(s=>s.querySelector('h2')?.textContent.trim()==='Заморозка');
    const table=section?.querySelector('.matrix');
    if(!table)return;
    table.classList.add('freezer-matrix');
    const head1=table.tHead?.rows?.[0];
    if(head1){[...head1.cells].slice(1).forEach(th=>th.classList.add('freezer-point-head'));}
    const head2=table.tHead?.rows?.[1];
    if(head2){[...head2.cells].forEach((th,i)=>{if(i%4===0)th.classList.add('freezer-point-start');if(i%4===3)th.classList.add('freezer-point-end');});}
    [...table.tBodies].flatMap(tb=>[...tb.rows]).forEach(tr=>{
      if(tr.classList.contains('group-row'))return;
      const cells=[...tr.cells];
      if(!cells.length)return;
      const data=cells.slice(1);
      data.forEach((td,i)=>{if(i%4===0)td.classList.add('freezer-point-start');if(i%4===3)td.classList.add('freezer-point-end');});
    });
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(document.getElementById('report-app'),{childList:true,subtree:true});
  apply();
})();