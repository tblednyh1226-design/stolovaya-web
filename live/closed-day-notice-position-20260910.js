// Put the closed-day notice directly under the date selector and make it unmistakable.
(function(){
  const NOTICE='Смена за выбранную дату уже сдана.';
  let moving=false;

  function findNotice(){
    const nodes=[...app.querySelectorAll('p,div,section')].filter(el=>{
      const text=(el.textContent||'').trim();
      return text.startsWith(NOTICE)&&text.includes('администраторскую корректировку');
    });
    return nodes.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]||null;
  }

  function findDateAnchor(){
    // The date control is a select/input on the home screen. Use its closest visual block.
    const controls=[...app.querySelectorAll('select,input')];
    const dateControl=controls.find(el=>{
      const v=String(el.value||'');
      return el.type==='date'||/^\d{4}-\d{2}-\d{2}$/.test(v)||/^\d{2}\.\d{2}\.\d{4}$/.test(v);
    });
    if(dateControl){
      return dateControl.closest('.field,.date-field,.date-picker,.control,.card')||dateControl.parentElement||dateControl;
    }
    // Fallback: find the visible block containing a DD.MM.YYYY date.
    const dated=[...app.querySelectorAll('div,section,label')].filter(el=>/^\s*\d{2}\.\d{2}\.\d{4}\s*$/.test((el.textContent||'').trim()));
    return dated.sort((a,b)=>a.children.length-b.children.length)[0]||null;
  }

  function moveNotice(){
    if(moving)return;
    const notice=findNotice();
    if(!notice)return;
    const anchor=findDateAnchor();
    if(!anchor)return;
    notice.classList.add('closed-day-top-notice');
    if(anchor.nextElementSibling===notice)return;
    moving=true;
    anchor.insertAdjacentElement('afterend',notice);
    moving=false;
  }

  const style=document.createElement('style');
  style.textContent=`
    .closed-day-top-notice{
      display:block!important;
      margin:12px 0 18px!important;
      padding:14px 16px!important;
      background:#fff0ed!important;
      border:2px solid #c65445!important;
      border-radius:16px!important;
      color:#a63f32!important;
      font-weight:700!important;
      line-height:1.4!important;
      box-shadow:0 2px 8px rgba(166,63,50,.08)!important;
    }
  `;
  document.head.appendChild(style);

  const baseRender=render;
  render=function(){baseRender();requestAnimationFrame(()=>requestAnimationFrame(moveNotice))};
  const observer=new MutationObserver(()=>requestAnimationFrame(moveNotice));
  observer.observe(app,{childList:true,subtree:true});
  requestAnimationFrame(()=>requestAnimationFrame(moveNotice));
})();
