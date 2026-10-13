(()=>{
"use strict";
const API="https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc";
const KEY="sb_publishable_rcvNssgN4_dPnVUpjU0bjQ_1cEWsA52";
const root=document.getElementById("production-app");
const today=()=>new Date().toISOString().slice(0,10);
const shift=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const saved=localStorage.getItem("stolovaya:admin")||sessionStorage.getItem("stolovaya:admin")||"";
const state={token:saved,pin:"",from:shift(-35),to:today(),point:"",docs:[],loading:false,busy:"",message:"",error:false,expanded:new Set()};
const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const groupOrder=["Холодные закуски","Первые блюда","Блюда для завтраков","Вторые блюда","Гарниры","Напитки","Хлеб","Дополнительный ассортимент","Выпечка","Прочее"];
const fmt=n=>Number(n||0).toLocaleString("ru-RU",{maximumFractionDigits:3});
async function rpc(name,params){
 const r=await fetch(API+"/"+name,{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(params)});
 const txt=await r.text();let data=null;try{data=JSON.parse(txt)}catch{}
 if(!r.ok)throw Error(data?.message||"Ошибка обращения к базе ("+r.status+")");
 return data;
}
function saveToken(token){state.token=token;localStorage.setItem("stolovaya:admin",token);sessionStorage.setItem("stolovaya:admin",token)}
async function load(){
 if(!state.token){render();return}
 state.loading=true;state.error=false;state.message="";render();
 try{
   state.docs=await rpc("admin_kitchen_production_list",{p_token:state.token,p_from:state.from,p_to:state.to,p_point_code:state.point||null});
 }catch(e){
   state.error=true;state.message=e.message||"Не удалось получить акты";
   if(/недействительн/i.test(state.message)){state.token="";localStorage.removeItem("stolovaya:admin");sessionStorage.removeItem("stolovaya:admin");}
 }finally{state.loading=false;render();}
}
async function login(){
 if(state.pin.length<4)return;
 state.loading=true;render();
 try{
   const result=await rpc("public_admin_web_login",{p_pin:state.pin});
   saveToken(result.token);state.pin="";await load();
 }catch(e){state.error=true;state.message=e.message||"Ошибка входа"}
 finally{state.loading=false;render();}
}
const title=p=>p==="BUKHARA"?"Бухара":"Правда";
function status(d){
 if(d.status==="exported")return '<span class="status">Выгружен в iiko (непроведённый)</span>';
 if(d.status==="exporting")return '<span class="status pending">Выгружается</span>';
 if(d.status==="export_error")return '<span class="status error">Ошибка выгрузки</span>';
 return '<span class="status">Готов к выгрузке</span>';
}
function items(d){
 const arr=[...(d.items||[])].sort((a,b)=>{
   const ga=groupOrder.indexOf(a.group),gb=groupOrder.indexOf(b.group);
   return (ga<0?999:ga)-(gb<0?999:gb)||String(a.dishName||"").localeCompare(String(b.dishName||""),"ru");
 });
 let previous="",out="";
 for(const i of arr){
   const g=i.group||"Прочее";
   if(g!==previous){out+='<div class="group-name">'+html(g)+'</div>';previous=g;}
   out+='<div class="item"><span>'+html(i.dishName||i.dishCode||"Без названия")+'</span><b>'+html(fmt(i.quantity))+'</b></div>';
 }
 return out;
}
function card(d){
 const open=state.expanded.has(d.id),busy=!!state.busy;
 const itemTotal=(d.items||[]).reduce((a,x)=>a+Number(x.quantity||0),0);
 const canSend=!busy&&!state.loading&&["ready_to_export","formed"].includes(d.status)&&!d.iikoDocumentNumber;
 const label=d.status==="exported"?"Выгружено":d.status==="exporting"?"Выгружается…":d.status==="export_error"?"Требуется проверка":"Выгрузить в iiko";
 return '<article class="production-doc">'+
   '<div class="doc-top"><div><small>'+html(d.businessDate)+' · '+html(title(d.pointCode))+'</small><h2>'+html(d.number)+'</h2>'+
   '<p>На основании '+html(d.sourceTransfer||"перемещения кухни")+'</p>'+status(d)+'</div>'+
   '<div class="doc-controls"><button class="secondary" data-expand="'+html(d.id)+'">'+(open?"Скрыть состав":"Открыть акт")+'</button>'+
   '<button class="primary" data-send="'+html(d.id)+'" '+(canSend?"":"disabled")+'>'+label+'</button></div></div>'+
   '<div class="route"><span>'+html(d.fromWarehouse)+'</span><span>→</span><span>'+html(d.toWarehouse)+'</span></div>'+
   '<div class="doc-qty"><span>Позиций: <b>'+html(d.itemCount)+'</b></span><span>Количество: <b>'+html(fmt(itemTotal))+'</b></span></div>'+
   (d.iikoDocumentNumber?'<p class="info">Номер в iiko: '+html(d.iikoDocumentNumber)+'</p>':"")+
   (d.exportError?'<p class="info error-text">'+html(d.exportError)+'</p>':"")+
   (open?'<div class="doc-items">'+items(d)+'</div>':"")+
   '</article>';
}
function render(){
 if(!state.token){
 root.innerHTML='<section class="login-panel"><a href="../">← В админку</a><h1>Акты приготовления</h1><p>Введите код администратора</p><input type="password" inputmode="numeric" id="pin" value="'+html(state.pin)+'" placeholder="Код доступа"><button id="login" class="primary" '+(state.loading?"disabled":"")+'>Войти</button>'+(state.message?'<p class="error-text">'+html(state.message)+'</p>':"")+'</section>';
 document.getElementById("pin").oninput=e=>state.pin=e.target.value.replace(/\D/g,"").slice(0,8);
 document.getElementById("pin").onkeydown=e=>{if(e.key==="Enter")login()};
 document.getElementById("login").onclick=login;return;
 }
 root.innerHTML='<main class="production-page"><header class="production-head"><div><small>СТОЛОВАЯ • АДМИНИСТРАТОР</small><h1>Акты приготовления</h1><p class="info">Отдельные документы по перемещениям БК → БР и ПК → ПР. Отправка только по кнопке, без проведения.</p></div><a class="back" href="../">← Админка</a></header>'+
 '<section class="card"><div class="filters"><label>С даты<input id="from" type="date" value="'+html(state.from)+'"></label><label>По дату<input id="to" type="date" value="'+html(state.to)+'"></label>'+
 '<label>Кухня<select id="point"><option value="">Обе кухни</option><option value="BUKHARA" '+(state.point==="BUKHARA"?"selected":"")+'>Бухара</option><option value="PRAVDA" '+(state.point==="PRAVDA"?"selected":"")+'>Правда</option></select></label>'+
 '<button class="primary" id="apply" '+(state.loading?"disabled":"")+'>Показать</button></div></section>'+
 (state.message?'<p class="message '+(state.error?"error":"")+'">'+html(state.message)+'</p>':"")+
 (state.loading?'<section class="card">Загружаю документы…</section>':'<section class="card summary">Найдено актов: <b>'+state.docs.length+'</b></section>')+
 '<section>'+(state.docs.length?state.docs.map(card).join(""):!state.loading?'<section class="card">По выбранным датам актов нет.</section>':"")+'</section></main>';
 document.getElementById("apply").onclick=()=>{
  state.from=document.getElementById("from").value;state.to=document.getElementById("to").value;state.point=document.getElementById("point").value;
  if(!state.from||!state.to||state.from>state.to){state.message="Проверьте диапазон дат";state.error=true;render();return}
  load();
 };
 document.querySelectorAll("[data-expand]").forEach(b=>b.onclick=()=>{const id=b.dataset.expand;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);render()});
 document.querySelectorAll("[data-send]").forEach(b=>b.onclick=()=>send(b.dataset.send));
}
async function send(id){
 const d=state.docs.find(x=>x.id===id);if(!d||!["ready_to_export","formed"].includes(d.status))return;
 if(!confirm("Выгрузить акт приготовления "+d.number+" в iiko?\n\n"+d.fromWarehouse+" → "+d.toWarehouse+"\n"+d.itemCount+" позиций.\n\nДокумент будет НЕПРОВЕДЁННЫМ."))return;
 state.busy=id;state.message="Отправляю акт приготовления в iiko…";state.error=false;render();
 try{
  const r=await rpc("admin_send_kitchen_production_to_iiko",{p_token:state.token,p_document_id:id});
  if(r.alreadyExported){state.message="Акт уже выгружен в iiko.";await load();return}
  for(let attempt=0;attempt<12;attempt++){
   await new Promise(resolve=>setTimeout(resolve,1500));
   const docs=await rpc("admin_kitchen_production_list",{p_token:state.token,p_from:state.from,p_to:state.to,p_point_code:state.point||null});
   state.docs=docs;const current=docs.find(x=>x.id===id);
   if(current?.status==="exported"){state.message="Акт приготовления "+d.number+" выгружен в iiko непроведённым.";state.error=false;return}
   if(current?.status==="export_error"){state.message="iiko не приняла акт: "+(current.exportError||"неизвестная ошибка");state.error=true;return}
  }
  state.message="Запрос отправлен. iiko ещё отвечает. Проверьте статус позже, нажав «Показать».";
 }catch(e){state.message=e.message||"Не удалось отправить документ";state.error=true}
 finally{state.busy="";render()}
}
load();
})();