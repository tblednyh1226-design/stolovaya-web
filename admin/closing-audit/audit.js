// Staging-only audit. No mutations, no real iiko actions, no prod fallback.
const root=document.getElementById("closing-audit");
const config=window.STOLOVAYA_CATALOGS_CONFIG||{};
const isolated=!!(config.rpcBase&&config.publishableKey&&
 /^https:\/\//.test(config.rpcBase)&&
 !config.rpcBase.includes("rgluzdxikpagugpmusbp.supabase.co"));
const token=isolated?sessionStorage.getItem("stolovaya:catalog-admin"):"";
const el=(name,txt,cls)=>{const a=document.createElement(name);
 if(txt!==undefined&&txt!==null)a.textContent=String(txt);
 if(cls)a.className=cls;return a};
const wrap=(name,cls,items)=>{const a=el(name,null,cls);for(const x of items||[])if(x)a.appendChild(x);return a};
const link=(name,url)=>{const a=el("a",name);a.href=url;return a};
const flag=(msg,err=false)=>el("div",msg,err?"notice error":"notice");
function table(headers,items,columns){
 const head=wrap("tr","",headers.map(x=>el("th",x)));
 const body=el("tbody");
 for(const item of items||[]){
   const r=el("tr");
   for(const key of columns){
     const x=item[key];
     r.appendChild(el("td",x===null||x===undefined?"—":x));
   }
   body.appendChild(r);
 }
 return wrap("div","scroll",[
   wrap("table","data-table",[wrap("thead","",[head]),body])
 ]);
}
root.replaceChildren(wrap("header","",[
 wrap("div","",[link("← Админка","../"),el("h1","Сверка закрытия дня"),
  el("p","Остатки, получение с кухни и реализация для iiko","help")]),
 el("span","Только чтение · тестовая копия","pill")
]));
if(!isolated||!token){
 root.appendChild(flag("Для проверки нужен вход администратора в изолированный тестовый сервер. Рабочая база не используется."));
 root.appendChild(link("Войти в Справочники","../catalogs/"));
}else{
 const point=el("select");
 const date=el("input");date.type="date";
 const parts=new Intl.DateTimeFormat("en-CA",{
   timeZone:"Europe/Moscow",year:"numeric",month:"2-digit",day:"2-digit"
 }).formatToParts(new Date());
 const ds=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 date.value=ds.year+"-"+ds.month+"-"+ds.day;
 const result=el("div",null,"stack");result.style.marginTop="16px";
 let inFlight=false;
 async function rpc(name,args){
   const abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),30000);
   try{
     const r=await fetch(config.rpcBase+"/"+name,{
       method:"POST",cache:"no-store",signal:abort.signal,
       headers:{"Content-Type":"application/json",apikey:config.publishableKey},
       body:JSON.stringify(args)
     });
     const x=await r.json();
     if(!r.ok||x?.ok===false)throw Error(x?.error||x?.message||"HTTP "+r.status);
     return x;
   }finally{clearTimeout(timeout)}
 }
 const button=el("button","Проверить закрытие","btn");
 button.addEventListener("click",async()=>{
   if(inFlight||!point.value||!date.value)return;
   inFlight=true;button.disabled=true;button.textContent="Проверка…";
   result.replaceChildren();
   const params={p_token:token,p_business_date:date.value,p_point_code:point.value};
   try{
     const [audit,preview]=await Promise.all([
       rpc("catalog_admin_closing_reconciliation",params),
       rpc("catalog_admin_realization_preview_v2",params)
     ]);
     const day=audit.day||{};
     result.appendChild(wrap("section","card stack",[
       el("h2","Статус дня: "+(day.dayStatus||"—")),
       el("p","Строк: "+(day.positions??0)+", не заполнено: "+
         (day.incompletePositions??0)+", ошибок: "+(day.invalidPositions??0)),
       day.dayStatus==="nonworking_carryover"?
         flag("Выходной или нерабочий день. Остаток переходит к следующему рабочему дню, обязательного закрытия нет."):null
     ]));
     const cols=[
       ["dishName","Блюдо"],["opening","Начало"],["moved","Перемещения"],
       ["fromKitchen","С кухни"],["internalIn","Внутренний приход"],
       ["internalOut","Внутренний расход"],["thawed","Разморозка"],
       ["available","Доступно"],["leftover","Конец"],["waste","Утиль"],
       ["frozen","Заморозка"],["sold","Продано"],["status","Проверка"]
     ];
     result.appendChild(wrap("section","card stack",[
       el("h2","Единый расчёт остатков"),
       table(cols.map(x=>x[1]),audit.items||[],cols.map(x=>x[0]))
     ]));
     if(audit.mismatchCount>0){
       result.appendChild(wrap("section","card stack",[
         el("h2","Расхождения с действующим отчётом: "+audit.mismatchCount),
         flag("Эти документы нужно сверить с iiko до повторной отправки.",true),
         table(["Блюдо","Правильно продано","Старый отчёт","Разница"],
           audit.legacyMismatches||[],
           ["dishName","canonicalSold","legacySold","difference"])
       ]));
     }else result.appendChild(flag("Расхождений в сравненных строках не обнаружено."));
     if(preview.readyForReview){
       result.appendChild(wrap("section","card stack",[
         el("h2","Предпросмотр реализации"),
         el("p","Продано: "+(preview.payload?.totals?.quantity??0)+
           ". Позиций: "+(preview.payload?.totals?.itemCount??0)),
         preview.alreadyInIiko?
           flag("Документ уже связан с iiko: "+(preview.existingIikoId||"ID не показан")+
             ". Повторная отправка недопустима.",true):null,
         preview.quantitiesDiffer?
           flag("Ранее сформированный документ содержит другие количества. Требуется ручная сверка.",true):null,
         el("p","Это только просмотр. Отправка и проведение в iiko здесь отключены.","help")
       ]));
     }else result.appendChild(flag("Проект реализации не готов: "+(preview.reason||"данные не проверены"),true));
   }catch(e){result.appendChild(flag("Ошибка сверки: "+e.message,true))}
   finally{inFlight=false;button.disabled=false;button.textContent="Проверить закрытие"}
 });
 const label=(text,x)=>wrap("label","",[el("span",text),x]);
 root.appendChild(wrap("section","card stack",[
   el("p","Сравнение только читает данные. Документы и остатки не меняются.","help"),
   wrap("div","toolbar",[label("Точка",point),label("Дата",date),button])
 ]));
 root.appendChild(result);
 rpc("catalog_admin_warehouse_mappings",{p_token:token}).then(x=>{
   for(const p of x.points||[]){
     if(p.purpose!=="sales"||p.isActive===false)continue;
     const opt=el("option",p.pointName+" ("+p.pointCode+")");
     opt.value=p.pointCode;point.appendChild(opt);
   }
   if(!point.options.length)result.appendChild(flag("Нет доступных торговых точек",true));
 }).catch(e=>result.appendChild(flag("Ошибка списка точек: "+e.message,true)));
}
