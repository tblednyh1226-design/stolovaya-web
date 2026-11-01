// STAGING ONLY. Admin confirms a physical transfer between ANY two iiko warehouses.
// Never dispatches to iiko; local stock effect is matched debit/credit.
const root=document.getElementById("warehouse-transfers");
const cfg=window.STOLOVAYA_CATALOGS_CONFIG||{};
const allowed=!!(cfg.rpcBase&&cfg.publishableKey&&/^https:\/\//.test(cfg.rpcBase)&&
 !cfg.rpcBase.includes("rgluzdxikpagugpmusbp.supabase.co"));
const token=allowed?sessionStorage.getItem("stolovaya:catalog-admin"):"";
const el=(tag,text,className)=>{const x=document.createElement(tag);
 if(text!=null)x.textContent=String(text);if(className)x.className=className;return x};
const group=(tag,cls,items)=>{const x=el(tag,null,cls);
 for(const child of items||[])if(child)x.appendChild(child);return x};
const link=(text,url)=>{const x=el("a",text);x.href=url;return x};
const field=(text,control)=>group("label","",[el("span",text),control]);
const note=(text,error=false)=>el("div",text,error?"notice error":"notice");
const button=(label,onClick,cls="btn")=>{const x=el("button",label,cls);
 x.type="button";x.addEventListener("click",onClick);return x};
root.replaceChildren(group("header","",[
 group("div","",[link("← Админка","../"),el("h1","Складские перемещения"),
 el("p","Любой склад iiko может быть отправителем и получателем: БК, ПК, раздачи и новые склады.","help")]),
 el("span","Тестовая копия","pill")
]));
if(!allowed||!token){
 root.appendChild(note("Нужен вход в отдельную тестовую базу. Рабочая «Столовая» не используется."));
 root.appendChild(link("Перейти к входу администратора","../catalogs/"));
}else{
 const state={warehouses:[],dishes:[],itemRows:[],requestKey:crypto.randomUUID(),busy:false};
 let from,to,date,items,status,submit;
 async function rpc(method,body){
   const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),30000);
   try{
     const response=await fetch(cfg.rpcBase+"/"+method,{
      method:"POST",cache:"no-store",signal:abort.signal,
      headers:{"Content-Type":"application/json",apikey:cfg.publishableKey},
      body:JSON.stringify(body)});
     const parsed=await response.json();
     if(!response.ok||parsed?.ok===false)throw Error(parsed?.error||parsed?.message||"HTTP "+response.status);
     return parsed;
   }finally{clearTimeout(timer)}
 }
 function newDraft(){state.requestKey=crypto.randomUUID()}
 const select=()=>el("select");
 const showStatus=(message,err=false)=>status.replaceChildren(note(message,err));
 function options(control,arr,placeholder,label,value){
   control.replaceChildren();
   const none=el("option",placeholder);none.value="";control.appendChild(none);
   for(const v of arr){const x=el("option",label(v));x.value=value(v);control.appendChild(x);}
 }
 function addRow(){
   const row={id:crypto.randomUUID(),dishId:"",quantity:""};
   state.itemRows.push(row);newDraft();renderRows();
 }
 function removeRow(id){
   state.itemRows=state.itemRows.filter(x=>x.id!==id);
   newDraft();renderRows();
 }
 function renderRows(){
   items.replaceChildren();
   for(const row of state.itemRows){
     const dish=select();
     options(dish,state.dishes,"Выберите блюдо",d=>d.name+(d.code?" · "+d.code:""),d=>d.id);
     dish.value=row.dishId;
     dish.addEventListener("change",()=>{row.dishId=dish.value;newDraft()});
     const qty=el("input");qty.type="number";qty.min="0.001";qty.step="any";
     qty.placeholder="Количество";qty.value=row.quantity;
     qty.addEventListener("input",()=>{row.quantity=qty.value;newDraft()});
     items.appendChild(group("div","toolbar",[
       field("Номенклатура",dish),field("Количество",qty),
       button("Удалить",()=>removeRow(row.id),"btn light small")
     ]));
   }
 }
 function today(){
   const p=new Intl.DateTimeFormat("en-CA",{
     timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"
   }).formatToParts(new Date());
   const x=Object.fromEntries(p.filter(v=>v.type!=="literal").map(v=>[v.type,v.value]));
   return x.year+"-"+x.month+"-"+x.day;
 }
 from=select();to=select();date=el("input");date.type="date";date.value=today();
 items=el("div",null,"stack");status=el("div",null,"stack");
 submit=button("Подтвердить фактическое перемещение",async()=>{
   if(state.busy)return;
   if(!from.value||!to.value||from.value===to.value){
     showStatus("Выберите разные склады отправления и получения",true);return;
   }
   if(!state.itemRows.length||state.itemRows.some(x=>!x.dishId||!x.quantity||
     !Number.isFinite(Number(x.quantity))||Number(x.quantity)<=0)||
     new Set(state.itemRows.map(x=>x.dishId)).size!==state.itemRows.length){
     showStatus("Заполните блюда и положительные количества; блюда не должны повторяться",true);return;
   }
   const fromName=state.warehouses.find(x=>x.iikoId===from.value)?.iikoName||from.value;
   const toName=state.warehouses.find(x=>x.iikoId===to.value)?.iikoName||to.value;
   if(!window.confirm("Подтверждаете, что товар уже передан и принят?\n"+
     "Со склада: "+fromName+"\nНа склад: "+toName+"\nДата: "+date.value+
     "\nКоличество позиций: "+state.itemRows.length+
     "\n\nОстатки изменятся в тестовой базе. В iiko ничего не отправляется."))return;
   state.busy=true;submit.disabled=true;
   try{
     const r=await rpc("catalog_admin_record_stock_transfer",{
       p_token:token,p_request_key:state.requestKey,
       p_from_iiko_id:from.value,p_to_iiko_id:to.value,
       p_business_date:date.value,
       p_items:state.itemRows.map(x=>({dishId:x.dishId,quantity:Number(x.quantity)}))
     });
     showStatus((r.alreadyRecorded?"Уже зарегистрировано: ":"Перемещение зарегистрировано: ")+
       r.transferId+". Приход и расход учтены вместе. Выгрузка в iiko не выполнялась.");
     state.itemRows=[];newDraft();renderRows();
   }catch(error){showStatus("Не удалось записать перемещение: "+error.message,true)}
   finally{state.busy=false;submit.disabled=false}
 });
 from.addEventListener("change",newDraft);
 to.addEventListener("change",newDraft);
 date.addEventListener("change",newDraft);
 root.appendChild(group("section","card stack",[
   el("p","Документ фиксирует уже подтверждённую передачу: расход со склада отправителя и приход на склад получателя. Кухни могут и принимать, и отправлять товары.","help"),
   group("div","form-grid",[
     field("Со склада iiko",from),field("На склад iiko",to),field("Дата движения",date)]),
   el("h2","Позиции"),items,
   group("div","actions",[button("Добавить позицию",addRow,"btn light"),submit]),
   status,
   note("Это отдельная проверяемая функция разработки, не замена рабочему процессу «отправил → принял» у буфетчиков. В iiko документы не создаются.")
 ]));
 rpc("catalog_admin_warehouse_mappings",{p_token:token}).then(async result=>{
   state.warehouses=(result.warehouses||[]).filter(w=>
       w.mappedPointCode&&w.pointIsActive!==false);
   options(from,state.warehouses,"Выберите отправителя",x=>x.iikoName+" ("+x.mappedPointCode+")",x=>x.iikoId);
   options(to,state.warehouses,"Выберите получателя",x=>x.iikoName+" ("+x.mappedPointCode+")",x=>x.iikoId);
   const all=[];
   for(let offset=0;offset<5000;offset+=200){
     const part=await rpc("catalog_admin_directory",{
       p_token:token,p_kind:"dishes",p_search:"",p_limit:200,p_offset:offset});
     const rows=part.rows||[];
     all.push(...rows);
     if(!rows.length||all.length>=Number(part.total||0))break;
   }
   state.dishes=all.filter(x=>x.isActive);
   renderRows();
   if(!state.dishes.length)showStatus("Нет активной номенклатуры для перемещения",true);
 }).catch(e=>showStatus("Не удалось открыть справочники: "+e.message,true));
 addRow();
}
