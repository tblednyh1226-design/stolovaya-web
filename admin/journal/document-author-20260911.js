// Show an author on every journal card and use the selected admin FIO for edits.
(function(){
  function currentAdminName(){
    for(const storage of [localStorage,sessionStorage]){
      try{const x=JSON.parse(storage.getItem('stolovaya:admin-employee')||'null');if(x?.fullName)return x.fullName}catch{}
    }
    return '';
  }
  function docAuthor(d){
    const a=String(d?.actor||'').trim();
    if(a)return a;
    if(d?.doc_type==='movement')return 'iiko';
    if(d?.doc_type==='realization'||d?.doc_type==='utilization')return 'Система';
    return 'Система';
  }
  function applyAuthors(){
    const admin=currentAdminName();
    if(admin)state.actor=admin;
    const docs=state.data?.documents||[];
    document.querySelectorAll('.docs article.doc').forEach((el,i)=>{
      const d=docs[i];if(!d)return;
      const title=el.querySelector('.doc-title');if(!title||title.querySelector('.doc-author'))return;
      const row=document.createElement('small');row.className='doc-author';row.textContent='Автор: '+docAuthor(d);title.appendChild(row);
    });
  }
  const baseRender=render;
  render=function(){baseRender();queueMicrotask(applyAuthors)};
  queueMicrotask(applyAuthors);
})();