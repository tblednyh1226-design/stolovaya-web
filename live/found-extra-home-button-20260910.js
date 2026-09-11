// Keep «Нашла ещё» reliably visible on a submitted/closed day.
(function(){
  const CLOSED_TEXT='Смена за выбранную дату уже сдана.';

  function stateSaysClosed(){
    const h=state.home||{};
    return !!(h.submitted||h.dayClosed);
  }

  function domSaysClosed(){
    return (app?.textContent||'').includes(CLOSED_TEXT);
  }

  function shouldShow(){
    return stateSaysClosed()||domSaysClosed();
  }

  function buttonHtml(){
    return '<button type="button" id="found-extra-home-btn" class="wide-secondary found-extra-home"><span style="font-size:20px">＋</span><b>Нашла ещё</b><small>Добавить найденное после сдачи</small></button>';
  }

  function openFound(){
    state.foundDish='';
    state.foundQty='';
    state.foundComment='';
    state.message='';
    state.screen='found-extra';
    render();
  }

  const baseHome=homeScreen;
  homeScreen=function(){
    let html=baseHome();
    if(!stateSaysClosed())return html;
    if(/id="found-extra-home-btn"/.test(html))return html;
    const button=buttonHtml();
    if(html.includes('<button id="change-point"')){
      html=html.replace('<button id="change-point"',button+'<button id="change-point"');
    }else{
      html+=button;
    }
    return html;
  };

  const baseSubmitted=submittedScreen;
  submittedScreen=function(){
    let html=baseSubmitted();
    html=html.replace(/(data-screen="found-extra"[^>]*?)\sdisabled/g,'$1');
    if(stateSaysClosed()&&!/id="found-extra-home-btn"/.test(html))html+=buttonHtml();
    return html;
  };

  function ensureButton(){
    if(!(state.screen==='home'||state.screen==='submitted')||!shouldShow())return;
    let btn=document.getElementById('found-extra-home-btn');
    if(!btn){
      const wrap=document.createElement('div');
      wrap.innerHTML=buttonHtml();
      btn=wrap.firstElementChild;
      const adminMsg=document.getElementById('admin-message-open');
      const change=document.getElementById('change-point');
      if(adminMsg){
        adminMsg.insertAdjacentElement('afterend',btn);
      }else if(change){
        change.parentNode.insertBefore(btn,change);
      }else{
        app.appendChild(btn);
      }
    }
    btn.onclick=openFound;
  }

  const baseBind=bind;
  bind=function(){
    baseBind();
    document.getElementById('found-extra-home-btn')?.addEventListener('click',openFound);
    document.querySelectorAll('[data-screen="found-extra"]').forEach(btn=>{
      btn.disabled=false;
      btn.addEventListener('click',e=>{e.preventDefault();openFound()});
    });
    requestAnimationFrame(ensureButton);
  };

  const style=document.createElement('style');
  style.textContent=`
    .found-extra-home{
      margin:12px 0!important;
      border:2px solid #315f49!important;
      background:#eef5ef!important;
      color:#315f49!important;
      font-weight:800!important;
      display:flex!important;
      align-items:center!important;
      gap:10px!important;
      justify-content:center!important;
      min-height:64px!important;
    }
    .found-extra-home b{font-size:18px}.found-extra-home small{font-weight:600;opacity:.8}
  `;
  document.head.appendChild(style);

  const baseRender=render;
  render=function(){
    baseRender();
    requestAnimationFrame(()=>requestAnimationFrame(ensureButton));
  };
  const observer=new MutationObserver(()=>requestAnimationFrame(ensureButton));
  observer.observe(app,{childList:true,subtree:true});
  requestAnimationFrame(()=>requestAnimationFrame(ensureButton));
})();
