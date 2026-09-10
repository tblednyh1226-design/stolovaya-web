// Move the closed-day informational notice near the shift status instead of below all actions.
(function(){
  const NOTICE='Смена за выбранную дату уже сдана.';
  function moveNotice(){
    if(state.screen!=='home')return;
    const shift=app.querySelector('.shift-status');
    if(!shift)return;
    const candidates=[...app.querySelectorAll('p,div,section')].filter(el=>{
      if(el===shift||shift.contains(el))return false;
      const text=(el.textContent||'').trim();
      return text.startsWith(NOTICE)&&text.includes('администраторскую корректировку');
    });
    // Prefer the smallest matching element so we do not move a parent that contains buttons.
    const notice=candidates.sort((a,b)=>a.children.length-b.children.length)[0];
    if(!notice||shift.nextElementSibling===notice)return;
    notice.classList.add('closed-day-top-notice');
    shift.insertAdjacentElement('afterend',notice);
  }
  const style=document.createElement('style');
  style.textContent='.closed-day-top-notice{margin:12px 0 18px!important}';
  document.head.appendChild(style);
  const baseRender=render;
  render=function(){baseRender();queueMicrotask(moveNotice)};
  queueMicrotask(moveNotice);
})();
