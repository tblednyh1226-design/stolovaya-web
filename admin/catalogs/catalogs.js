import { validateEmployee,employeeRole,employeePointCodes,summarizeIikoPreview } from "./domain.mjs";
const root=document.getElementById("catalogs-app");
const cfg=window.STOLOVAYA_CATALOGS_CONFIG||{};
const ready=Boolean(cfg.rpcBase&&cfg.catalogSyncUrl&&cfg.publishableKey&&
  /^https:\/\//.test(cfg.rpcBase)&&/^https:\/\//.test(cfg.catalogSyncUrl)&&
  !cfg.rpcBase.includes("rgluzdxikpagugpmusbp.supabase.co")&&
  !cfg.catalogSyncUrl.includes("rgluzdxikpagugpmusbp.supabase.co"));
const titles={dishes:"Номенклатура",warehouses:"Склады",employees:"Сотрудники"};
const state={token:ready?(sessionStorage.getItem("stolovaya:catalog-admin")||""):"",
 name:sessionStorage.getItem("stolovaya:catalog-name")||"",owner:false,kind:"dishes",
 search:"",offset:0,total:0,limit:50,rows:[],points:[],edit:null,preview:null,
 message:"",error:false,busy:false};
const node=(tag,attrs={},children=[])=>{
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==="class")n.className=v;
    else if(k==="text")n.textContent=String(v??"");
    else if(k==="onClick")n.addEventListener("click",v);
    else if(k==="onChange")n.addEventListener("change",v);
    else if(k==="onSubmit")n.addEventListener("submit",v);
    else if(k==="disabled"||k==="checked"||k==="hidden"||k==="required")n[k]=Boolean(v);
    else if(k==="value")n.value=v;
    else if(k==="placeholder")n.placeholder=v;
    else if(k==="type")n.type=v;
    else n.setAttribute(k,String(v));
  }
  for(const c of (Array.isArray(children)?children:[children])){
    if(c===null||c===undefined)continue;
    n.appendChild(typeof c==="string"?document.createTextNode(c):c);
  }
  return n;
};
const btn=(label,fn,cls="btn",disabled=false)=>node("button",{type:"button",class:cls,text:label,disabled,onClick:fn});
const text=(tag,value,cls)=>node(tag,{text:value,class:cls||""});
const input=(placeholder,value="",type="text")=>node("input",{placeholder,value,type});
const field=(label,control)=>node("label",{},[text("span",label),control]);
const badge=(label,muted=false)=>text("span",label,muted?"tag off":"tag");
function showError(err){
 state.message=err instanceof Error?err.message:String(err);state.error=true;render();
}
function notice(message,error=false){state.message=message;state.error=error;render()}
async function post(url,data){
 if(!ready)throw new Error("Тестовый backend пока не подключён");
 const timer=new AbortController();const timeout=setTimeout(()=>timer.abort(),30000);
 try{
  const response=await fetch(url,{method:"POST",signal:timer.signal,cache:"no-store",
    headers:{"Content-Type":"application/json",apikey:cfg.publishableKey},
    body:JSON.stringify(data)});
  const body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok===false)throw new Error(body?.error||body?.message||"HTTP "+response.status);
  return body;
 }catch(err){
  if(err?.name==="AbortError")throw new Error("Превышено время ожидания");
  throw err;
 }finally{clearTimeout(timeout)}
}
const rpc=(name,payload)=>post(cfg.rpcBase+"/"+name,payload);
async function operation(fn){
 if(state.busy)return;state.busy=true;state.message="";render();
 try{await fn()}catch(err){state.message=err.message||String(err);state.error=true}
 finally{state.busy=false;render()}
}
async function load(){
 if(!ready||!state.token){state.rows=[];state.total=0;return}
 const r=await rpc("catalog_admin_directory",{p_token:state.token,
   p_kind:state.kind,p_search:state.search,p_limit:state.limit,p_offset:state.offset});
 state.rows=Array.isArray(r.rows)?r.rows:[];
 state.total=Number(r.total||0);state.owner=Boolean(r.isOwner);
}
async function loadPoints(){
 if(!ready||!state.token)return;
 const r=await rpc("catalog_admin_directory",{p_token:state.token,
  p_kind:"warehouses",p_search:"",p_limit:200,p_offset:0});
 state.points=(r.rows||[]).filter(x=>x.isActive&&
   !["BUKHARA_KITCHEN","PRAVDA_KITCHEN"].includes(x.code));
}
async function signIn(event){
 event.preventDefault();
 const form=event.currentTarget;
 const fullName=form.elements.namedItem("name").value.trim();
 const password=form.elements.namedItem("password").value;
 await operation(async()=>{
   const r=await rpc("public_catalog_password_login",{p_full_name:fullName,p_password:password});
   state.token=r.token;state.name=r.fullName;state.owner=Boolean(r.isOwner);
   sessionStorage.setItem("stolovaya:catalog-admin",state.token);
   sessionStorage.setItem("stolovaya:catalog-name",state.name);
   await load();await loadPoints();
 });
}
function logout(){
 state.token="";state.name="";state.owner=false;state.edit=null;state.preview=null;
 sessionStorage.removeItem("stolovaya:catalog-admin");
 sessionStorage.removeItem("stolovaya:catalog-name");render();
}
function drawLogin(){
 root.replaceChildren(node("div",{class:"wrap"},[
  node("section",{class:"card login stack"},[
   text("div","Столовая · Разработка","logo"),text("h1","Вход администратора"),
   text("p","Вход по ФИО из справочника и личному паролю, назначенному владельцем.","help"),
   messageNode(),
   node("form",{class:"stack",onSubmit:signIn},[
     field("ФИО",node("input",{name:"name",placeholder:"Фамилия Имя Отчество",required:true,autocomplete:"username"})),
     field("Пароль",node("input",{name:"password",type:"password",required:true,autocomplete:"current-password"})),
     node("button",{class:"btn",text:"Войти",type:"submit",disabled:state.busy})
   ])
  ])
 ]));
}
function messageNode(){
 return state.message?node("div",{class:"notice "+(state.error?"error":"success"),role:state.error?"alert":"status",text:state.message}):null;
}
function drawTable(){
 const columns=state.kind==="dishes"?
  ["Название","Артикул","Группа","Ед. изм.","Цена","Статус"]:
  state.kind==="warehouses"?
  ["Склад","Код Столовой","Найдены в iiko","Статус"]:
  ["ФИО","Роль","Разрешённые точки","Статус","Управление"];
 const rows=state.rows.map(r=>{
  if(state.kind==="dishes")return [text("b",r.name),text("span",r.code||"—","mono"),
    r.groupName||"—",r.unit||"—",r.price==null?"—":String(r.price),
    badge(r.isActive?"Активно":"Отключено",!r.isActive)];
  if(state.kind==="warehouses")return [text("b",r.name),text("span",r.code||"—","mono"),
    String(r.iikoMatches||0)+" (не означает привязку)",badge(r.isActive?"Активно":"Отключено",!r.isActive)];
  const actions=node("div",{class:"label-list"});
  if(state.owner&&!r.roles?.includes("developer"))actions.appendChild(btn("Изменить",()=>{
    state.edit={...r,role:employeeRole(r),points:employeePointCodes(r)};render();
  },"btn light small"));
  if(r.hasPassword)actions.appendChild(badge("Пароль задан"));
  if(r.markedForDeletionAt)actions.appendChild(badge("Помечен на удаление",true));
  return [text("b",r.fullName),r.roles?.includes("developer")?"Разработчик":employeeRole(r)==="admin"?"Администратор":"Буфетчик",
    (r.points||[]).map(p=>p.pointName).join(", ")||"—",
    badge(r.isActive?"Работает":"Неактивен",!r.isActive),actions];
 });
 const table=node("table",{class:"data-table"},[
   node("thead",{},[node("tr",{},columns.map(x=>text("th",x)))]),
   node("tbody",{},rows.length?rows.map(cells=>node("tr",{},cells.map(c=>node("td",{},[c])))):
     [node("tr",{},[node("td",{colspan:columns.length,class:"empty",
       text:ready?"Нет записей по выбранному фильтру":"Здесь появятся данные после подключения тестовой базы"})])])
 ]);
 return node("div",{class:"scroll"},[table]);
}
function pointsEditor(){
 const box=node("div",{class:"point-checks"});
 const boxes=[];
 for(const p of state.points){
  const check=node("input",{type:"checkbox",value:p.code,checked:state.edit.points?.includes(p.code)});
  check.name="point";boxes.push(check);
  box.appendChild(node("label",{},[check,p.name]));
 }
 return {box,boxes};
}
function drawEmployeeEditor(){
 if(!state.edit||!state.owner)return null;
 const e=state.edit;
 const name=input("Фамилия Имя Отчество",e.fullName||"");
 name.maxLength=180;name.required=true;
 const role=node("select",{},[
   node("option",{value:"buffet",text:"Буфетчик"}),
   node("option",{value:"admin",text:"Администратор"})
 ]);
 role.value=e.role||"buffet";
 const active=node("input",{type:"checkbox",checked:e.isActive!==false});
 const points=pointsEditor();
 const pointArea=node("section",{hidden:role.value==="admin"},[
   text("b","Рабочие точки буфетчика"),
   text("p","Можно назначить одну или несколько точек; кухни исключены.","help"),points.box
 ]);
 role.addEventListener("change",()=>{
   pointArea.hidden=role.value==="admin";
   if(role.value==="admin")points.boxes.forEach(x=>x.checked=false);
 });
 const form=node("form",{class:"stack",onSubmit:async ev=>{
   ev.preventDefault();
   const model={fullName:name.value,role:role.value,isActive:active.checked,
     points:points.boxes.filter(x=>x.checked).map(x=>x.value)};
   const error=validateEmployee(model);
   if(error){notice(error,true);return}
   await operation(async()=>{
     await rpc("catalog_admin_save_employee",{p_token:state.token,p_employee_id:e.id||null,
       p_full_name:model.fullName,p_is_active:model.isActive,p_role:model.role,
       p_point_codes:model.points});
     state.edit=null;await load();state.message="Сотрудник сохранён";
   });
 }},[
   node("div",{class:"form-grid"},[
     node("div",{class:"wide"},[field("ФИО",name)]),
     field("Должность",role),
     field("Действует",node("div",{class:"label-list"},[active,text("span","Работает")]))
   ]),pointArea,
   node("div",{class:"actions"},[node("button",{type:"submit",class:"btn",text:"Сохранить сотрудника",disabled:state.busy})])
 ]);
 const section=node("section",{class:"card stack"},[
   node("div",{class:"heading"},[text("h2",e.id?"Редактирование сотрудника":"Новый сотрудник"),
     btn("Отмена",()=>{state.edit=null;render()},"btn light")]),form
 ]);
 if(e.id&&e.role==="admin"){
  const password=input("Личный пароль от 12 символов","","password");
  password.minLength=12;password.maxLength=128;password.autocomplete="new-password";
  section.appendChild(node("div",{class:"preview stack"},[
   text("b","Личный пароль администратора"),
   text("p","Пароль назначает владелец. Он хранится только как хеш.","help"),
   node("div",{class:"toolbar"},[password,btn("Назначить пароль",()=>operation(async()=>{
     if(password.value.length<12||password.value.length>128)throw new Error("Пароль должен содержать 12–128 символов");
     await rpc("catalog_admin_set_password",{p_token:state.token,p_employee_id:e.id,p_password:password.value});
     state.message="Личный пароль назначен";state.edit=null;await load();
   }),"btn light",state.busy)])
  ]));
 }
 if(e.id&&!e.markedForDeletionAt)section.appendChild(node("div",{class:"actions"},[
   btn("Пометить на удаление",async()=>{
     if(!window.confirm("Пометить сотрудника на удаление? История останется, доступ будет отключён."))return;
     await operation(async()=>{
       await rpc("catalog_admin_mark_employee_deleted",{p_token:state.token,p_employee_id:e.id});
       state.edit=null;await load();state.message="Сотрудник отключён, история сохранена";
     });
   },"btn danger",state.busy)
 ]));
 return section;
}
function drawPreview(){
 if(!state.preview||state.preview.kind!==state.kind)return null;
 const p=state.preview;
 const valid=summarizeIikoPreview(p.kind,p.items).valid;
 const list=node("table",{class:"data-table"},[
  node("thead",{},[node("tr",{},["ID iiko","Код","Наименование"].map(x=>text("th",x)))]),
  node("tbody",{},p.items.map(x=>node("tr",{},[
    node("td",{},[text("span",x.id,"mono")]),text("td",x.code),text("td",x.name)])))
 ]);
 return node("section",{class:"preview stack"},[
  node("div",{class:"heading"},[
    text("b","Предварительное обновление из iiko"),badge(String(p.total)+" позиций")
  ]),
  text("p",p.kind==="warehouses"?
    "Реальные точки, складские маршруты, БК/БР/ПК/ПР не переназначаются автоматически.":
    "Существующие идентификаторы блюд сохраняются. Закрытые документы не пересчитываются.","help"),
  text("p","Показаны первые "+valid+" проверенных записей.","help"),
  node("div",{class:"scroll"},[list]),
  node("div",{class:"actions"},[
   btn("Не применять",()=>{state.preview=null;render()},"btn light"),
   btn("Применить изменения",()=>applyPreview(),"btn",!state.owner||state.busy)
  ])
 ]);
}
async function syncIiko(){
 await operation(async()=>{
  const d=await post(cfg.catalogSyncUrl,{token:state.token,kind:state.kind});
  state.preview={id:d.batchId,kind:d.kind,items:d.sample||[],total:d.count};
  state.message="Получено "+d.count+" записей. Изменения ещё не применены.";
 });
}
async function applyPreview(){
 if(!state.owner||!state.preview)return;
 if(!window.confirm("Применить проверенные изменения из iiko?"))return;
 const id=state.preview.id;
 await operation(async()=>{
  const r=await rpc("catalog_admin_apply_iiko",{p_token:state.token,p_batch_id:id});
  state.preview=null;await load();
  state.message="Добавлено "+r.added+", обновлено "+r.updated+", пропущено "+r.skipped;
 });
}
function drawView(){
 const wrapper=node("div",{class:"wrap"});
 const header=node("header",{},[
  node("div",{},[
   node("a",{href:"../",class:"logo",text:"← Админка"}),
   text("h1","Справочники"),
   text("p","Номенклатура, склады и сотрудники · единый источник данных")
  ]),
  node("div",{class:"label-list"},[
   badge(ready?"Тестовое подключение":"Макет · backend не подключён"),
   ...(state.token?[text("span",state.name+(state.owner?" · Владелец":"")),
     btn("Выйти",logout,"btn light")]:[])
  ])
 ]);
 wrapper.appendChild(header);
 if(!ready)wrapper.appendChild(node("div",{class:"notice",text:
   "Интерфейс создан в ветке разработки. Запись, iiko и рабочая база отключены до запуска изолированного стенда."}));
 if(state.message)wrapper.appendChild(messageNode());
 wrapper.appendChild(node("nav",{class:"tabs"},Object.entries(titles).map(([key,label])=>
  btn(label,()=>{state.kind=key;state.search="";state.offset=0;
     state.edit=null;state.preview=null;void operation(load)},
    key===state.kind?"active":""))));
 const heading=node("div",{class:"heading"},[
  node("div",{},[text("h2",titles[state.kind]),
    text("p",state.kind==="warehouses"?
      "Список складов iiko обновляется отдельно от привязки к точкам.":
      state.kind==="dishes"?"Сопоставление товаров по внешним идентификаторам iiko.":
      "Уволенных помечаем на удаление, документы не стираем.","help")]),
  node("div",{class:"label-list"},[
   ...(state.kind!=="employees"?[btn("Обновить из iiko",syncIiko,"btn",!ready||state.busy)]:[]),
   ...(state.kind==="employees"&&state.owner?[btn("Добавить сотрудника",()=>{
     state.edit={id:null,fullName:"",role:"buffet",points:[],isActive:true};render();
   },"btn")]:[])
  ])
 ]);
 const search=input("Поиск: название, код или ФИО",state.search,"search");
 search.addEventListener("change",()=>{state.search=search.value;state.offset=0;void operation(load)});
 const toolbar=node("div",{class:"toolbar"},[search,
   text("span","Всего "+state.total,"counts")]);
 const prev=btn("Назад",()=>{state.offset=Math.max(0,state.offset-state.limit);void operation(load)},
   "btn light small",state.offset===0||state.busy);
 const next=btn("Далее",()=>{state.offset+=state.limit;void operation(load)},
   "btn light small",state.offset+state.limit>=state.total||state.busy);
 wrapper.appendChild(node("section",{class:"card"},[
  heading,toolbar,drawTable(),
  node("div",{class:"pager"},[
   text("span","Записи "+(state.total?state.offset+1:0)+"–"+Math.min(state.total,state.offset+state.rows.length)+" из "+state.total,"counts"),
   node("div",{class:"label-list"},[prev,next])
  ])
 ]));
 if(state.edit)wrapper.appendChild(drawEmployeeEditor());
 if(state.preview)wrapper.appendChild(drawPreview());
 wrapper.appendChild(text("p","Пометка на удаление сохраняет историю. Обновления iiko применяются только после подтверждения владельца.","foot"));
 root.replaceChildren(wrapper);
}
function render(){if(ready&&!state.token)drawLogin();else drawView()}
render();
if(state.token)void operation(async()=>{await load();await loadPoints()});
