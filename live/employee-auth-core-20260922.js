(()=>{
const qs=new URLSearchParams(location.search);
const point=qs.get('point')||localStorage.getItem('stolovaya:qr-point')||'';
const employee=qs.get('employee')==='1';
if(!employee||!point)return;document.querySelector('.admin-entry')?.remove();
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
 try{const h=await rpc('public_home',{p_token:state.token,p_point_code:state.point});state.home=h;state.testDate=h.businessDate;const d=await rpc('public_daily_items_v2',{p_token:state.token,p_point_code:state.point,p_business_date:h.businessDate});state.items=Array.isArray(d)?d:[];const saved=JSON.parse(localStorage.getItem(draftKey())||'null')||{};state.entries={};for(const x of state.items)state.entries[x.dish_id]=saved[x.dish_id]||{leftover:x.leftover_qty==null?'':String(x.leftover_qty),waste:x.waste_qty==null?'':String(x.waste_qty),frozen:x.frozen_qty==null?'':String(x.frozen_qty),touched:{leftover:false,waste:false,frozen:false}};state.screen='home';state.message='';render();Promise.allSettled([rpc('public_freezer_items',{p_token:state.token,p_point_code:state.point,p_business_date:h.businessDate}),rpc('public_incoming_transfers',{p_token:state.token,p_point_code:state.point,p_business_date:h.businessDate}),rpc('public_transfer_point_options',{p_token:state.token,p_point_code:state.point})]).then(r=>{state.freezer=r[0].status==='fulfilled'?r[0].value:[];state.incoming=r[1].status==='fulfilled'?r[1].value:[];state.transferPoints=r[2].status==='fulfilled'?r[2].value:[];if(state.home)state.home.pendingTransfers=state.incoming.length;render()})}
 catch(e){state.message=e.message||'Ошибка загрузки рабочей точки';state.screen='loading';app.innerHTML=`<section class="access-card"><div class="brand-login">Столовая</div><h1>Не удалось открыть точку</h1><p class="error-text">${esc(state.message)}</p><button class="primary" id="employee-retry">Повторить</button></section>`;document.getElementById('employee-retry').onclick=start}
}
start();
})();