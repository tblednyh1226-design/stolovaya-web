// Consolidated live patch: one point screen, one date selector, delegated point clicks.
pointScreen=function(){
  const today=moscowToday();
  const day=state.testDate||today;
  return `<section class="access-card"><div class="brand-login">Столовая</div><h1>Выберите точку</h1><p>На какой точке вы сейчас работаете?</p><label style="display:block;margin:18px 0 22px;font-size:16px;font-weight:700">Дата рабочего дня <small style="display:block;font-weight:400;color:#777;margin-top:4px">Тестовый режим — доступны даты с 01.09.2026 по сегодня (${esc(today)})</small><input id="point-business-date" type="date" min="2026-09-01" max="${esc(today)}" value="${esc(day)}" style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border:1px solid #d6d3c8;border-radius:14px;font-size:18px;background:#fff"></label><div class="point-choice-list">${state.points.map(p=>`<button type="button" data-point="${esc(p.point_code)}">${esc(p.point_name)}</button>`).join('')}</div><a href="../instruction.html?v=20260908-1000" style="display:block;margin-top:14px;text-align:center;text-decoration:none;background:#fff;color:#315f49;border:1px solid #d6d3c8;border-radius:16px;padding:14px 16px;font-weight:700">? Как работать</a><button id="logout" class="link-btn">Выйти</button>${state.message?`<p class="error-text" style="margin-top:16px">${esc(state.message)}</p>`:''}<p style="margin-top:18px;color:#8a8a83;font-size:13px">Сборка 08.09 • дата по Москве</p></section>`;
};

const liveBaseBind=bind;
bind=function(){
  liveBaseBind();
  const dayPicker=document.getElementById('point-business-date');
  if(dayPicker){
    const today=moscowToday();
    dayPicker.max=today;
    if(dayPicker.value>today){dayPicker.value=today;state.testDate=today;localStorage.setItem('stolovaya:test-date',today)}
    dayPicker.onchange=e=>{
      if(!e.target.value)return;
      state.testDate=e.target.value;
      localStorage.setItem('stolovaya:test-date',state.testDate);
    };
  }
};

// One permanent handler on the app root. It survives every render and does not
// depend on rebinding individual point buttons after DOM replacement.
if(!window.__stolovayaLivePointDelegate){
  window.__stolovayaLivePointDelegate=true;
  app.addEventListener('click',async e=>{
    const button=e.target.closest?.('[data-point]');
    if(!button || !app.contains(button))return;
    e.preventDefault();
    e.stopPropagation();
    const code=button.dataset.point;
    if(!code)return;
    const picker=document.getElementById('point-business-date');
    if(picker?.value){
      state.testDate=picker.value;
      localStorage.setItem('stolovaya:test-date',state.testDate);
    }
    state.point=code;
    state.message='';
    state.screen='loading';
    app.innerHTML=`<section class="notice">Открываем точку ${esc(button.textContent.trim())}…<br><small>${esc(state.testDate||moscowToday())}</small></section>`;
    try{
      await loadPoint();
      state.screen='home';
    }catch(err){
      console.error('Live delegated point load failed',err);
      state.message=err?.message||'Не удалось открыть точку';
      state.screen='point';
    }
    render();
  },true);
}

if(state.screen==='point')render();
