// Staging only: personal catalog session and isolated database are mandatory.
const root=document.getElementById("document-register"),cfg=window.STOLOVAYA_CATALOGS_CONFIG||{};
const ready=!!(cfg.rpcBase&&cfg.publishableKey&&/^https:\/\//.test(cfg.rpcBase)&&!cfg.rpcBase.includes("rgluzdxikpagugpmusbp.supabase.co"));
const token=ready?sessionStorage.getItem("stolovaya:catalog-admin"):"";
const E=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==null&&txt!==undefined)x.textContent=String(txt);if(cls)x.className=cls;return x};
const W=(tag,cls,...kids)=>{const x=E(tag,null,cls);for(const y of kids.flat())if(y)x.appendChild(y);return x};
const B=(name,fn,cls="btn")=>{const b=E("button",name,cls);b.type="button";b.onclick=fn;return b};
const A=(name,href)=>{const a=E("a",name);a.href=href;return a};
const opt=(name,value)=>{const o=E("option",name);o.value=value;return o};
const field=(name,control)=>W("label","field",E("span",name),control);
const notice=(name,error=false)=>E("div",name,error?"notice error":"notice");
const types={internal_transfer:"Внутреннее перемещение",movement:"Перемещение",kitchen_supply:"Получение с кухни",generated:"Реализация / утиль",kitchen_generated:"Приготовление / iiko",freezer:"Заморозка / разморозка",freezer_inventory:"Инвентаризация",closing:"Закрытие дня"};
const status={received:"Получено",sent:"Отправлено",discrepancy:"Расхождение",cancelled:"Отменено",marked_for_deletion:"Помечен на удаление",exported:"Отправлено в iiko",ready_to_export:"К отправке",draft:"Черновик",formed:"Сформирован",complete:"Сдано"};
const moscow=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).filter(v=>v.type!=="literal").map(v=>[v.type,v.value]));return p.year+"-"+p.month+"-"+p.day};
const state={to:moscow(),from:moscow().slice(0,8)+"01",type:"",point:"",showMarked:true,limit:100,offset:0,rows:[],points:[],total:0,selected:null,detail:null,reason:"",error:"",busy:false};
async function rpc(name,body){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),25000);try{
 const response=await fetch(cfg.rpcBase+"/"+name,{method:"POST",cache:"no-store",signal:ac.signal,headers:{"Content-Type":"application/json",apikey:cfg.publishableKey},body:JSON.stringify(body)});
 const x=await response.json();if(!response.ok||x?.ok===false)throw Error(x?.error||x?.message||"Ошибка запроса");return x;
}finally{clearTimeout(timer)}}
function render(){
 root.replaceChildren(W("div","head",W("div","",E("h1","Журнал документов"),E("div","Компактный список · действия внутри документа","small")),A("← Администратор","../")));
 if(!ready||!token){root.appendChild(W("div","panel placeholder",E("p","Для журнала нужен отдельный тестовый сервер и персональный вход."),A("Войти в Справочники","../catalogs/")));return}
 const from=E("input");from.type="date";from.value=state.from;
 const to=E("input");to.type="date";to.value=state.to;
 const type=E("select");type.appendChild(opt("Все документы",""));for(const[k,v]of Object.entries(types))type.appendChild(opt(v,k));type.value=state.type;
 const point=E("select");point.appendChild(opt("Все склады",""));for(const p of state.points)point.appendChild(opt(p.name,p.code));point.value=state.point;
 const check=E("input");check.type="checkbox";check.checked=state.showMarked;check.onchange=()=>{state.showMarked=check.checked;state.offset=0;void loadList()};
 const apply=B("Найти",()=>{state.from=from.value;state.to=to.value;state.type=type.value;state.point=point.value;state.offset=0;void loadList()});apply.disabled=state.busy;
 root.appendChild(W("div","filters",field("С",from),field("По",to),field("Тип",type),field("Склад",point),W("label","check",check,E("span","С пометками")),apply));
 if(state.error)root.appendChild(notice(state.error,true));
 const panel=W("div","panel",W("div","panel-head",E("strong","Документы"),E("span",state.total+" записей","small")));
 const table=E("table",null,"register"),thead=W("thead","",W("tr","",...["Дата","Документ","Со склада","На склад","Статус"].map(x=>E("th",x)))),body=E("tbody");
 for(const d of state.rows){
  const key=d.type+"|"+d.id,row=E("tr",null,(state.selected===key?"selected ":"")+(d.marked?"deleted":""));
  row.tabIndex=0;row.onclick=()=>void openDoc(d);row.onkeydown=e=>{if(e.key==="Enter")void openDoc(d)};
  for(const txt of [d.date,d.title,d.from||"—",d.to||"—",status[d.status]||d.status]){
    const td=E("td"),t=E("span",txt);if(txt===d.title)t.className="open";if(txt===(status[d.status]||d.status))t.className="status"+(d.marked?" deleted":"");
    td.appendChild(t);row.appendChild(td);
  }
  body.appendChild(row);
 }
 if(!state.rows.length)body.appendChild(W("tr","",W("td","",E("span","Документов не найдено","placeholder"))));
 table.append(thead,body);panel.appendChild(W("div","scroll",table));
 const prev=B("←",()=>{state.offset-=state.limit;void loadList()},"btn light"),next=B("→",()=>{state.offset+=state.limit;void loadList()},"btn light");
 prev.disabled=state.offset===0;next.disabled=state.offset+state.limit>=state.total;
 panel.appendChild(W("div","pager",prev,E("span",(Math.floor(state.offset/state.limit)+1)+" / "+Math.max(1,Math.ceil(state.total/state.limit)),"small"),next));
 const detail=W("div","panel",W("div","panel-head",E("strong","Документ"),state.selected?B("Закрыть",()=>{state.selected=null;state.detail=null;render()},"btn light"):null));
 detail.appendChild(state.detail?detailView():E("div",state.selected?"Загрузка документа…":"Выберите строку журнала","placeholder"));
 root.appendChild(W("div","content",panel,detail));
}
function detailView(){
 const d=state.rows.find(x=>x.type+"|"+x.id===state.selected);if(!d)return E("div","Документ не найден");
 const content=state.detail.document||{},check=state.detail.deletion||{},section=E("div",null,"doc");
 section.append(E("div",types[d.type]||d.type,"small"),E("h2",d.title));
 const metadata=W("div","meta");
 for(const [k,v] of [["Дата",d.date],["Статус",status[d.status]||d.status],["Отправитель",d.from],["Получатель",d.to],["Номер/ID",d.id]]){
  metadata.appendChild(W("div","",E("strong",k),E("span",v||"—")));
 }
 section.appendChild(metadata);
 if(Array.isArray(content.items)&&content.items.length){
   section.appendChild(E("h3","Номенклатура"));
   const tbl=E("table",null,"items"),thead=W("thead","",W("tr","",E("th","Блюдо"),E("th","Отпущено"),E("th","Получено"))),tb=E("tbody");
   for(const item of content.items)tb.appendChild(W("tr","",E("td",item.dish||item.name||"—"),
      E("td",item.sent??item.quantity??item.qty??"—"),E("td",item.received??"—")));
   tbl.append(thead,tb);section.appendChild(tbl);
 }
 if(content.comment)section.appendChild(E("p","Комментарий: "+content.comment,"small"));
 if(Array.isArray(state.detail.history)&&state.detail.history.length){
   const history=W("details","",E("summary","История изменений · "+state.detail.history.length));
   for(const event of state.detail.history){
      history.appendChild(E("p",String(event.at||"")+" · "+String(event.action||""),"small"));
   }
   section.appendChild(history);
 }
 const actions=W("div","actions");
 const edit=B("Редактировать",()=>{},"btn light"),send=B("Отправить в iiko",()=>{},"btn light");
 edit.disabled=true;send.disabled=true;
 edit.title="Редактирование подключим после проверки обновлённых обработчиков";
 send.title="Отправка отключена до тестирования новой схемы с iiko";
 actions.append(edit,send);
 if(d.marked)actions.appendChild(B("Снять пометку",()=>void restore(d),"btn light"));
 else if(d.canMarkType){
   const reason=E("textarea");reason.className="reason";reason.placeholder="Причина удаления";reason.value=state.reason;reason.oninput=()=>state.reason=reason.value;
   section.appendChild(field("Причина пометки",reason));
   const mark=B("Пометить на удаление",()=>void mark(d),"btn danger");mark.disabled=!check.canMark||state.busy;actions.appendChild(mark);
 }
 section.appendChild(actions);
 if(d.marked)section.appendChild(notice("Документ сохранён в истории, но исключён из расчёта складских движений."));
 if(check.links?.length)section.appendChild(W("div","notice error",E("strong","Удаление запрещено. Связанные документы:"),...check.links.map(x=>E("div",x.label||x.type))));
 if(!check.supported)section.appendChild(notice(check.reason||"Для этого вида пока нет безопасного отключения движений."));
 section.appendChild(E("p","Физическое удаление не выполняется. Изменение и отправка iiko подключаются после интеграционных тестов.","details-hint"));
 return section;
}
async function loadList(){
 state.busy=true;state.error="";render();
 try{
  const r=await rpc("catalog_admin_document_register_v2",{p_token:token,p_from:state.from,p_to:state.to,p_type:state.type||null,p_point_code:state.point||null,p_show_marked:state.showMarked,p_limit:state.limit,p_offset:state.offset});
  state.rows=r.documents||[];state.total=Number(r.total||0);state.points=r.points||[];
  if(state.selected&&!state.rows.some(x=>x.type+"|"+x.id===state.selected)){state.selected=null;state.detail=null}
 }catch(e){state.error=e.message}finally{state.busy=false;render()}
}
async function openDoc(d){
 state.selected=d.type+"|"+d.id;state.detail=null;state.reason="";render();
 try{state.detail=await rpc("catalog_admin_document_detail_v2",{p_token:token,p_doc_type:d.type,p_doc_id:d.id})}
 catch(e){state.error=e.message}render();
}
async function mark(d){
 if(state.reason.trim().length<3){state.error="Укажите причину (не менее 3 символов)";render();return}
 if(!confirm("Пометить на удаление?\nДокумент останется в журнале, но будет исключён из остатков."))return;
 state.busy=true;try{await rpc("catalog_admin_mark_document_deleted_v2",{p_token:token,p_doc_type:d.type,p_doc_id:d.id,p_reason:state.reason});
  await loadList();const fresh=state.rows.find(x=>x.type===d.type&&x.id===d.id);if(fresh)await openDoc(fresh);
 }catch(e){state.error="Пометка не выполнена: "+e.message;render()}finally{state.busy=false}
}
async function restore(d){
 if(!confirm("Снять пометку и вернуть движения в остатки?"))return;
 state.busy=true;try{await rpc("catalog_admin_restore_document_v2",{p_token:token,p_doc_type:d.type,p_doc_id:d.id});
  await loadList();const fresh=state.rows.find(x=>x.type===d.type&&x.id===d.id);if(fresh)await openDoc(fresh);
 }catch(e){state.error="Восстановление не выполнено: "+e.message;render()}finally{state.busy=false}
}
void loadList();
