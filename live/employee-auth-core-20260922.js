(()=>{
const qs=new URLSearchParams(location.search);
const point=qs.get('point')||localStorage.getItem('stolovaya:qr-point')||'';
const employee=qs.get('employee')==='1';
if(!employee||!point)return;
const name=localStorage.getItem('stolovaya:employee-name')||'Сотрудник';
const role=localStorage.getItem('stolovaya:employee-role')||'buffet';
const greeting=sessionStorage.getItem('stolovaya:greeting')||'Хорошей смены! 🌷';
state.point=point;
state.points=[{point_code:point,point_name:point}];
const baseHome=homeScreen;
homeScreen=function(){
 let html=baseHome();
 const hello=`<section class="success-card" id="employee-hello" style="margin-bottom:12px"><b style="font-size:22px">👋</b><h2 style="margin:4px 0">${esc(name)}</h2><p>${esc(greeting)}</p></section>`;
 html=html.replace('<section class="shift-status',hello+'<section class="shift-status');
 html=html.replace(/<button id="change-point"[\s\S]*?<\/button>/,'');
 return html;
};
async function start(){
 state.screen='loading';render();
 if(!state.token){state.message='Сессия сотрудника не найдена';state.screen='login';render();return}
 try{await loadPoint();state.screen='home';render()}
 catch(e){state.message=e.message||'Ошибка загрузки рабочей точки';state.screen='loading';app.innerHTML=`<section class="access-card"><div class="brand-login">Столовая</div><h1>Не удалось открыть точку</h1><p class="error-text">${esc(state.message)}</p><button class="primary" id="employee-retry">Повторить</button></section>`;document.getElementById('employee-retry').onclick=start}
}
start();
})();