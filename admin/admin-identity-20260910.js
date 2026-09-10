// Mandatory administrator identity selection after the admin access code.
// The selected identity is also bound to the server-side admin session.
(function(){
  state.adminIdentity=null;

  function adminPeople(){
    return (state.directory?.employees||[]).filter(e=>e.isActive&&Array.isArray(e.roles)&&e.roles.includes('admin'));
  }
  function identityScreen(){
    const people=adminPeople();
    return `<main class="admin"><section class="card login admin-fio-login"><h1>Кто входит в админку?</h1><p>Выберите своё ФИО. Действия в админке будут записываться от этого имени.</p><div class="point-choice-list">${people.map(e=>`<button type="button" class="admin-fio-choice" data-admin-id="${esc(e.id)}">${esc(e.fullName)}${e.roles.includes('developer')?'<small>Разработчик</small>':''}</button>`).join('')}</div><button id="admin-fio-back" class="secondary" type="button">Назад</button>${state.message?`<p class="message">${esc(state.message)}</p>`:''}</section></main>`;
  }
  async function chooseIdentity(id){
    if(state.busy)return;
    state.busy=true;state.message='';render();
    try{
      const r=await rpc('admin_select_identity',{p_token:state.token,p_employee_id:id});
      state.adminIdentity=r;
      state.actor=r.fullName||'Администратор';
      sessionStorage.setItem('stolovaya:admin-employee',JSON.stringify(r));
    }catch(e){state.message=e.message||'Не удалось выбрать сотрудника'}
    finally{state.busy=false;render()}
  }

  const baseHome=home;
  home=function(){
    const html=baseHome();
    if(!state.adminIdentity)return html;
    const name=esc(state.adminIdentity.fullName||'Администратор');
    const role=state.adminIdentity.isDeveloper?'Разработчик':'Администратор';
    return html.replace('<p class="subtitle">Выберите раздел</p>',`<p class="subtitle">${name} · ${role}</p>`);
  };

  const baseApp=app;
  app=function(){
    if(state.directory&&!state.adminIdentity)return identityScreen();
    return baseApp();
  };

  const baseBind=bind;
  bind=function(){
    baseBind();
    document.querySelectorAll('.admin-fio-choice').forEach(b=>b.onclick=()=>chooseIdentity(b.dataset.adminId));
    document.getElementById('admin-fio-back')?.addEventListener('click',()=>{
      sessionStorage.removeItem('stolovaya:admin');
      sessionStorage.removeItem('stolovaya:admin-employee');
      state.token='';state.directory=null;state.adminIdentity=null;state.message='';render();
    });
    const logout=document.getElementById('logout');
    if(logout)logout.addEventListener('click',()=>{state.adminIdentity=null;sessionStorage.removeItem('stolovaya:admin-employee')});
  };

  function addLogs(){
    if(!state.adminIdentity?.isDeveloper)return;
    const menu=document.querySelector('.admin-menu');
    if(!menu||menu.querySelector('[data-logs-link]'))return;
    const a=document.createElement('a');
    a.className='menu-card';a.href='logs/';a.dataset.logsLink='1';
    a.innerHTML='<span class="menu-icon">⌁</span><div><b>Логи</b><small>Ошибки, действия, iiko и техническая история</small></div><span class="menu-arrow">›</span>';
    menu.appendChild(a);
  }
  new MutationObserver(()=>queueMicrotask(addLogs)).observe(root,{childList:true,subtree:true});

  const oldRender=render;
  render=function(){oldRender();queueMicrotask(addLogs)};
})();
