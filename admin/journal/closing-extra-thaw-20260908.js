// Admin-only helper in closing-day edit mode: add a thawed dish that was not in today's menu.
(function(){
  state.extraThawDrafts=state.extraThawDrafts||{};
  state.extraThawBusy=state.extraThawBusy||new Set();
  const num=v=>v==null||v===''?0:Number(v);
  const dk=d=>historyKey(d);

  function visibleDishIds(d,report){
    return new Set((report?.rows||[]).filter(r=>r.point_code===d.point_code&&(
      num(r.opening_qty)!==0||num(r.received_qty)!==0||num(r.thawed_qty)!==0||r.leftover_qty!=null||num(r.waste_qty)!==0||num(r.frozen_qty)!==0||r.sold_qty!=null||r.is_submitted
    )).map(r=>r.dish_id));
  }
  function choices(d,report){
    const visible=visibleDishIds(d,report);
    return (report?.freezer||[])
      .filter(r=>r.point_code===d.point_code&&num(r.opening_qty)>0&&!visible.has(r.dish_id))
      .sort((a,b)=>String(a.dish_name||'').localeCompare(String(b.dish_name||''),'ru'));
  }
  function panel(d,report){
    const key=dk(d),draft=state.extraThawDrafts[key]||{dishId:'',qty:''},list=choices(d,report),busy=state.extraThawBusy.has(key);
    if(!list.length)return `<div class="details extra-thaw-admin"><b>Добавить блюдо из заморозки</b><p>Других блюд с остатком в заморозке на начало этого дня нет.</p></div>`;
    const selected=list.find(x=>String(x.dish_id)===String(draft.dishId));
    return `<div class="details extra-thaw-admin"><b>Добавить блюдо из заморозки, которого нет в меню</b><p>Только для администратора. После добавления блюдо появится в таблице закрытия дня, а продажа пересчитается автоматически.</p><div class="extra-thaw-row"><label>Блюдо<select data-extra-thaw-dish="${esc(key)}"><option value="">Выберите блюдо</option>${list.map(x=>`<option value="${esc(x.dish_id)}" ${String(x.dish_id)===String(draft.dishId)?'selected':''}>${esc(x.dish_name)} — в заморозке ${Number(x.opening_qty||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}</option>`).join('')}</select></label><label>Количество<input type="number" min="0.001" step="0.001" inputmode="decimal" data-extra-thaw-qty="${esc(key)}" value="${esc(draft.qty)}" ${selected?`max="${esc(selected.opening_qty)}"`:''}></label><button class="primary" data-extra-thaw-add="${esc(key)}" ${busy||!draft.dishId||!(num(String(draft.qty).replace(',','.'))>0)?'disabled':''}>${busy?'Добавляем…':'Добавить'}</button></div></div>`;
  }

  const prevDetails=details;
  details=function(d){
    const html=prevDetails(d);
    if(d.doc_type!=='closing')return html;
    const key=dk(d),editing=state.thawClosingEditing?.has(key),report=state.closingReports?.[key];
    if(!editing||!report)return html;
    return html+panel(d,report);
  };

  async function addDish(d){
    const key=dk(d),report=state.closingReports?.[key],list=choices(d,report),draft=state.extraThawDrafts[key]||{};
    const selected=list.find(x=>String(x.dish_id)===String(draft.dishId));
    const qty=Number(String(draft.qty??'').replace(',','.'));
    if(!selected){state.message='Выберите блюдо из заморозки';render();return}
    if(!Number.isFinite(qty)||qty<=0){state.message='Укажите количество больше нуля';render();return}
    if(qty>num(selected.opening_qty)+0.0001){state.message=`В заморозке на начало дня было только ${Number(selected.opening_qty).toLocaleString('ru-RU',{maximumFractionDigits:3})}`;render();return}
    state.extraThawBusy.add(key);state.message='';render();
    try{
      await rpc('admin_add_thawed_dish_to_closing',{
        p_token:state.token,p_business_date:d.business_date,p_point_code:d.point_code,
        p_dish_id:selected.dish_id,p_quantity:qty,p_actor:state.actor||'Администратор'
      });
      state.closingReports[key]=await rpc('admin_main_operational_report',{p_token:state.token,p_business_date:d.business_date});
      state.extraThawDrafts[key]={dishId:'',qty:''};
      state.message=`${selected.dish_name}: из заморозки добавлено ${qty.toLocaleString('ru-RU',{maximumFractionDigits:3})}`;
    }catch(e){state.message=e.message||'Не удалось добавить блюдо из заморозки'}
    finally{state.extraThawBusy.delete(key);render()}
  }

  const prevBind=bind;
  bind=function(){
    prevBind();
    document.querySelectorAll('[data-extra-thaw-dish]').forEach(sel=>sel.onchange=()=>{
      const key=sel.dataset.extraThawDish;state.extraThawDrafts[key]=state.extraThawDrafts[key]||{dishId:'',qty:''};state.extraThawDrafts[key].dishId=sel.value;render();
    });
    document.querySelectorAll('[data-extra-thaw-qty]').forEach(inp=>inp.oninput=()=>{
      const key=inp.dataset.extraThawQty;state.extraThawDrafts[key]=state.extraThawDrafts[key]||{dishId:'',qty:''};state.extraThawDrafts[key].qty=inp.value;
      const b=document.querySelector(`[data-extra-thaw-add="${CSS.escape(key)}"]`);if(b)b.disabled=!state.extraThawDrafts[key].dishId||!(num(String(inp.value).replace(',','.'))>0);
    });
    document.querySelectorAll('[data-extra-thaw-add]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.extraThawAdd);if(d)addDish(d)});
  };

  const style=document.createElement('style');
  style.textContent='.extra-thaw-admin{margin-top:12px;border:1px dashed #aab9ad;background:#f8faf7}.extra-thaw-admin p{margin:6px 0 10px;color:#667168}.extra-thaw-row{display:grid;grid-template-columns:minmax(220px,1fr) 150px auto;gap:10px;align-items:end}.extra-thaw-row label{display:grid;gap:5px;font-size:12px;font-weight:700}.extra-thaw-row select,.extra-thaw-row input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #c5cec6;border-radius:9px;background:#fff;font:inherit}@media(max-width:700px){.extra-thaw-admin{margin-left:12px;margin-right:12px}.extra-thaw-row{grid-template-columns:1fr}.extra-thaw-row button{width:100%}}';
  document.head.appendChild(style);
  if(state.data)render();
})();
