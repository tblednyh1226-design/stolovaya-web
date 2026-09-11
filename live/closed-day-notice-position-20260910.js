// Keep the closed-day informational notice near the top instead of below the screen content.
(function(){
  const NOTICE='Смена за выбранную дату уже сдана.';
  let moving=false;
  function findNotice(){
    const nodes=[...app.querySelectorAll('p,div,section')].filter(el=>{
      const text=(el.textContent||'').trim();
      return text.startsWith(NOTICE)&&text.includes('администраторскую корректировку');
    });
    // Pick the smallest matching node, not a large parent container.
    return nodes.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]||null;
  }
  function moveNotice(){
    if(moving)return;
    const notice=findNotice();
    if(!notice)return;
    const shift=app.querySelector('.shift-status');
    const header=app.querySelector('header');
    const anchor=shift||header;
    if(!anchor)return;
    if(anchor.nextElementSibling===notice)return;
    moving=true;
    notice.classList.add('closed-day-top-notice');
    anchor.insertAdjacentElement('afterend',notice);
    moving=false;
  }
  const style=document.createElement('style');
  style.textContent='.closed-day-top-notice{margin:10px 0 16px!important;padding:12px 14px!important;background:#fff7df!important;border:1px solid #ead79a!important;border-radius:14px!important;color:#445048!important}';
  document.head.appendChild(style);

  const baseRender=render;
  render=function(){baseRender();requestAnimationFrame(moveNotice)};
  const observer=new MutationObserver(()=>requestAnimationFrame(moveNotice));
  observer.observe(app,{childList:true,subtree:true});
  requestAnimationFrame(moveNotice);
})();
