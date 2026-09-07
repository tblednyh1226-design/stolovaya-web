// Friendly randomized success screen shown after every confirmed closing submission.
(function(){
  const messages=[
    {title:'Остатки сданы!',text:'Поздравляю! Хорошего вечера! Спасибо за работу 💚'},
    {title:'Смена успешно сдана!',text:'Отличная работа! Хорошего вечера 🌿'},
    {title:'Готово!',text:'Остатки приняты. Спасибо за работу и приятного вечера ✨'},
    {title:'Всё сдано!',text:'Можно выдыхать 🙂 Хорошего вечера и спасибо за работу!'},
    {title:'Остатки сданы!',text:'Спасибо за аккуратную работу. Пусть вечер будет спокойным и приятным 🌙'},
    {title:'Смена закрыта!',text:'Спасибо! Всё готово. Хорошего отдыха после рабочего дня 💫'}
  ];

  function pickMessage(){
    const prev=state.lastSuccessIndex;
    let idx=Math.floor(Math.random()*messages.length);
    if(messages.length>1&&idx===prev) idx=(idx+1)%messages.length;
    state.lastSuccessIndex=idx;
    return messages[idx];
  }

  state.submissionSuccess=null;
  const originalFinalize=finalize;
  finalize=async function(){
    const beforeSubmitted=!!state.home?.submitted;
    const candidate=pickMessage();
    state.submissionSuccess=null;
    try{
      const result=await originalFinalize();
      const confirmed=(!beforeSubmitted&&!!state.home?.submitted)
        || state.screen==='submitted'
        || /(?:смена|остатки).*сдан|сдана|успешно.*сдан/i.test(String(state.message||''))
        || result?.submitted===true
        || result?.ok===true;
      if(confirmed){
        state.submissionSuccess=candidate;
        state.message='';
        state.screen='submitted';
        render();
      }
      return result;
    }catch(e){
      state.submissionSuccess=null;
      throw e;
    }
  };

  const originalSubmittedScreen=submittedScreen;
  submittedScreen=function(){
    if(!state.submissionSuccess) return originalSubmittedScreen();
    const m=state.submissionSuccess;
    return `${header()}<section class="success-card closing-success-card"><div class="big-icon">✓</div><h1>${esc(m.title)}</h1><p>${esc(m.text)}</p><button id="success-home" class="primary">На главную</button></section>`;
  };

  const previousBind=bind;
  bind=function(){
    previousBind();
    const home=document.getElementById('success-home');
    if(home) home.onclick=()=>{
      state.submissionSuccess=null;
      state.screen='home';
      state.message='';
      render();
    };
  };

  if(typeof bind==='function') bind();
})();
