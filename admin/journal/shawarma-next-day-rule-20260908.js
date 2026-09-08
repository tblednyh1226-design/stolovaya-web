// Admin closing editor: shawarma cannot be left for next-day sale.
(function(){
  function isShawarmaName(v){return /шаверм/i.test(String(v||''));}
  function applyRule(){
    document.querySelectorAll('.closing-table tbody tr').forEach(tr=>{
      if(tr.classList.contains('closing-group')||tr.classList.contains('closing-total')||tr.classList.contains('closing-group-total'))return;
      const cells=[...tr.children];
      if(cells.length<8)return;
      const dishCell=cells[0];
      if(!isShawarmaName(dishCell.textContent))return;
      tr.classList.add('shawarma-no-carry');
      if(!dishCell.querySelector('.shawarma-admin-note')){
        const note=document.createElement('small');
        note.className='shawarma-admin-note';
        note.textContent='К продаже завтра не допускается';
        dishCell.appendChild(note);
      }
      const leftoverCell=cells[4];
      const input=leftoverCell?.querySelector('input');
      if(input){
        input.value='0';
        input.disabled=true;
        input.setAttribute('aria-disabled','true');
        const key=input.dataset.thawDraft;
        if(key&&state.thawClosingDrafts)state.thawClosingDrafts[key]='0';
      }
    });
  }
  const prevBind=bind;
  bind=function(){prevBind();applyRule()};
  const root=document.getElementById('journal-app');
  if(root)new MutationObserver(()=>queueMicrotask(applyRule)).observe(root,{childList:true,subtree:true});
  const style=document.createElement('style');
  style.textContent='.shawarma-no-carry td:nth-child(5){background:#f0efeb}.shawarma-no-carry td:nth-child(5) input:disabled{background:#e7e5df;color:#7d817d;border-color:#d1cec5}.shawarma-admin-note{display:block;margin-top:4px;color:#9a651b;font-weight:700;white-space:normal;line-height:1.25}';
  document.head.appendChild(style);
  if(state.data)render();
})();