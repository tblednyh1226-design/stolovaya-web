(()=>{
const employee=new URLSearchParams(location.search).get('employee')==='1';
if(!employee)return;
const point=new URLSearchParams(location.search).get('point')||localStorage.getItem('stolovaya:qr-point')||'';
const role=new URLSearchParams(location.search).get('role')||localStorage.getItem('stolovaya:employee-role')||'buffet';
const name=localStorage.getItem('stolovaya:employee-name')||'Сотрудник';
const greeting=sessionStorage.getItem('stolovaya:greeting')||'Хорошей смены! 🌷';
function enter(){
 if(typeof state==='undefined'||typeof choosePoint!=='function'){setTimeout(enter,80);return}
 const oldHome=homeScreen;
 window.homeScreen=function(){const html=oldHome();const hello=`<section class="success-card" id="employee-hello" style="margin-bottom:12px"><b style="font-size:22px">👋</b><h2 style="margin:4px 0">${name}</h2><p>${greeting}</p></section>`;setTimeout(()=>{const el=document.getElementById('employee-hello');if(el)setTimeout(()=>el.remove(),7000)},100);return html.replace('<section class="shift-status',hello+'<section class="shift-status')};
 const oldPoint=pointScreen;
 window.pointScreen=function(){if(role==='admin')return oldPoint();return `<section class="access-card"><div class="brand-login">Столовая</div><h1>${name}</h1><p>Рабочая точка закреплена QR-кодом.</p><button class="primary" id="qr-return">Открыть свою точку</button></section>`};
 const oldBind=bind;
 window.bind=function(){oldBind();document.getElementById('qr-return')?.addEventListener('click',()=>choosePoint(point));};
 if(role!=='admin'){
   state.points=(state.points||[]).filter(p=>p.point_code===point);
   state.point=point;
   choosePoint(point);
 } else {
   state.screen='point';render();
 }
}
enter();
})();