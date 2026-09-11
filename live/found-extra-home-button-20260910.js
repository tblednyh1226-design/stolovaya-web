// Keep «Нашла ещё» reliably visible on a submitted/closed day.
(function(){
  function shouldShow(){
    const h=state.home||{};
    return !!(h.submitted||h.dayClosed);
  }

  function buttonHtml(){
    return '<button type="button" id="found-extra-home-btn" class="wide-secondary found-extra-home"><span style="font-size:20px">＋</span><b>Нашла ещё</b><small>Добавить найденное после сдачи</small></button>';
  }

  function openFound(){
    if(!shouldShow())return;
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
    if(!shouldShow())return html;
    if(/id="found-extra-home-btn"/.test(html))return html;
    const button=buttonHtml();
    // Put the action immediately after the main home actions, before point switching.
    if(html.includes('</section><button id="change-point"')){
      html=html.replace('</section><button id="change-point"','</section>'+button+'<button id="change-point"');
    }else if(html.includes('</section>')){
      const pos=html.indexOf('</section>')+10;
      html=html.slice(0,pos)+button+html.slice(pos);
    }else{
      html+=button;
    }
    return html;
  };

  const baseSubmitted=submittedScreen;
  submittedScreen=function(){
    let html=baseSubmitted();
    // Never disable «Нашла ещё» just because the day is closed.
    html=html.replace(/(data-screen="found-extra"[^>]*?)\sdisabled/g,'$1');
    if(shouldShow()&&!/id="found-extra-home-btn"/.test(html)){
      html+=buttonHtml();
    }
    return html;
  };

  function ensureButton(){
    if(!(state.screen==='home'||state.screen==='submitted')||!shouldShow())return;
    if(document.getElementById('found-extra-home-btn'))return;
    const host=app.querySelector('.home-actions')||app.querySelector('.success-card')||app;
    const wrap=document.createElement('div');
    wrap.innerHTML=buttonHtml();
    const btn=wrap.firstElementChild;
    if(host===app)app.appendChild(btn);else host.insertAdjacentElement('afterend',btn);
    btn.addEventListener('click',openFound);
  }

  const baseBind=bind;
  bind=function(){
    baseBind();
    document.getElementById('found-extra-home-btn')?.addEventListener('click',openFound);
    document.querySelectorAll('[data-screen="found-extra"]').forEach(btn=>{
      btn.disabled=false;
      btn.addEventListener('click',e=>{e.preventDefault();openFound()});
    });
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
    requestAnimationFrame(ensureButton);
  };
  const observer=new MutationObserver(()=>requestAnimationFrame(ensureButton));
  observer.observe(app,{childList:true,subtree:true});
  requestAnimationFrame(ensureButton);
})();
