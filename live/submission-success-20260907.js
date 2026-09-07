// Friendly randomized success screen shown immediately after a successful closing submission.
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
    // Choose before submit so the successful render can use it immediately.
    state.submissionSuccess=pickMessage();
    const beforeSubmitted=state.home?.submitted;
    await originalFinalize();
    // If submission failed, do not keep a success message armed for later screens.
    if(state.screen!=='submitted' || (beforeSubmitted&&state.home?.submitted)){
      if(state.screen!=='submitted') state.submissionSuccess=null;
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

  // Rebind current screen after loading this patch.
  if(typeof bind==='function') bind();
})();
