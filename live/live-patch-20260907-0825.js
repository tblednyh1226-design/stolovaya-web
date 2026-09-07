// Consolidated live patch: one point screen, one date selector, visible errors.
pointScreen=function(){
  const day=state.testDate||moscowToday();
  return `<section class="access-card"><div class="brand-login">Столовая</div><h1>Выберите точку</h1><p>На какой точке вы сейчас работаете?</p><label style="display:block;margin:18px 0 22px;font-size:16px;font-weight:700">Дата рабочего дня <small style="display:block;font-weight:400;color:#777;margin-top:4px">Режим тестирования — можно выбрать любую дату</small><input id="point-business-date" type="date" value="${esc(day)}" style="width:100%;box-sizing:border-box;margin-top:8px;padding:14px;border:1px solid #d6d3c8;border-radius:14px;font-size:18px;background:#fff"></label><div class="point-choice-list">${state.points.map(p=>`<button data-point="${esc(p.point_code)}">${esc(p.point_name)}</button>`).join('')}</div><button id="logout" class="link-btn">Выйти</button>${state.message?`<p class="error-text" style="margin-top:16px">${esc(state.message)}</p>`:''}<p style="margin-top:18px;color:#8a8a83;font-size:13px">Сборка 07.09 • 08:25</p></section>`;
};

const liveBaseBind=bind;
bind=function(){
  liveBaseBind();
  const dayPicker=document.getElementById('point-business-date');
  if(dayPicker){
    dayPicker.onchange=e=>{
      if(!e.target.value)return;
      state.testDate=e.target.value;
      localStorage.setItem('stolovaya:test-date',state.testDate);
    };
  }
  document.querySelectorAll('[data-point]').forEach(b=>{
    b.onclick=()=>{
      const picker=document.getElementById('point-business-date');
      if(picker?.value){state.testDate=picker.value;localStorage.setItem('stolovaya:test-date',state.testDate)}
      choosePoint(b.dataset.point);
    };
  });
};

// Re-render point screen once with the consolidated template.
if(state.screen==='point')render();
