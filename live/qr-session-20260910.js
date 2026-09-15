(()=>{
const params=new URLSearchParams(location.search);
const employee=params.get('employee')==='1';
if(!employee)return;
const point=params.get('point')||localStorage.getItem('stolovaya:qr-point')||'';
const role=params.get('role')||localStorage.getItem('stolovaya:employee-role')||'buffet';
const name=localStorage.getItem('stolovaya:employee-name')||sessionStorage.getItem('stolovaya:employee-name')||'Сотрудник';
const greeting=sessionStorage.getItem('stolovaya:greeting')||'Хорошей смены! 🌷';
function moscowDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function resetForNewDay(){
  // The desktop/home-screen kiosk flow already authenticated the employee for a fixed point.
  // Do not force it back through QR. Daily reset applies only when this session actually came from QR.
  const qr=localStorage.getItem('stolovaya:qr-token')||'';
  if(!qr)return false;
  const authDay=localStorage.getItem('stolovaya:employee-auth-date')||'';
  if(authDay===moscowDay())return false;
  ['stolovaya:web-token','stolovaya:employee-name','stolovaya:employee-session','stolovaya:employee-role','stolovaya:employee-auth-date'].forEach(k=>localStorage.removeItem(k));
  sessionStorage.removeItem('stolovaya:greeting');
  location.replace(`./?qr=${encodeURIComponent(qr)}&fresh=${Date.now()}`);return true;
}
if(resetForNewDay())return;
setInterval(()=>{if(document.visibilityState!=='hidden')resetForNewDay()},30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')resetForNewDay()});
function enter(){
 if(typeof state==='undefined'||typeof choosePoint!=='function'||typeof rpc!=='function'){setTimeout(enter,80);return}
 const baseRpc=rpc;
 rpc=async function(proc,body){
   const b=body&&typeof body==='object'?{...body}:body;
   if(b&&/^public_/.test(proc)){
     if(Object.prototype.hasOwnProperty.call(b,'p_actor')) b.p_actor=name;
     else if(['public_save_closing_partial','public_finalize_closing','public_create_transfer','public_receive_transfer','public_report_found_after_closing','public_set_freezer_out'].includes(proc)) b.p_actor=name;
   }
   return baseRpc(proc,b);
 };
 window.rpc=rpc;
 const oldHome=homeScreen;
 window.homeScreen=function(){const html=oldHome();const hello=`<section class="success-card" id="employee-hello" style="margin-bottom:12px"><b style="font-size:22px">👋</b><h2 style="margin:4px 0">${name}</h2><p>${greeting}</p></section>`;setTimeout(()=>{const el=document.getElementById('employee-hello');if(el)setTimeout(()=>el.remove(),7000)},100);return html.replace('<section class="shift-status',hello+'<section class="shift-status')};
 const oldPoint=pointScreen;
 window.pointScreen=function(){if(role==='admin')return oldPoint();return `<section class="access-card"><div class="brand-login">Столовая</div><h1>${name}</h1><p>Рабочая точка закреплена за сотрудником.</p><button class="primary" id="qr-return">Открыть свою точку</button></section>`};
 const oldBind=bind;
 window.bind=function(){oldBind();document.getElementById('qr-return')?.addEventListener('click',()=>choosePoint(point));};
 if(role!=='admin'){
   state.points=(state.points||[]).filter(p=>p.point_code===point);
   state.point=point;
   choosePoint(point);
 } else {state.screen='point';render();}
}
enter();
})();