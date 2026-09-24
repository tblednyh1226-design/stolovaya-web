// Admin editor for "Получить с кухни" (БК→БР / ПК→ПР).
(function(){
  state.ksoDishOptions=state.ksoDishOptions||null;
  state.ksoDrafts=state.ksoDrafts||{};
  const isKso=d=>d?.doc_type==='movement'&&String(d.title||'').startsWith('KSO-');
  const key=(d,i)=>historyKey(d)+'|kso|'+i.itemId;
  const baseDetails=details;
  details=function(d){
    if(!isKso(d))return baseDetails(d);
    const items=d.details?.items||[], editing=state.editing.has(historyKey(d)), saving=state.saving.has(historyKey(d));
    const opts=state.ksoDishOptions||[];
    const rows=items.map(i=>{
      const k=key(d,i),dr=state.ksoDrafts[k]||{dishId:i.dishId,qty:String(i.qty??'')};
      const dish=editing?'<select class="kso-dish" data-kso-dish="'+esc(k)+'">'+opts.map(o=>'<option value="'+esc(o.id)+'" '+(String(o.id)===String(dr.dishId)?'selected':'')+'>'+esc(o.name)+' ['+esc(o.code||'')+']</option>').join('')+'</select>':'<span>'+esc(i.dish||'')+'</span>';
      const qty=editing?'<input class="qty-input" type="number" min="0.001" step="0.001" inputmode="decimal" data-kso-qty="'+esc(k)+'" value="'+esc(dr.qty)+'">':'<b>'+esc(i.qty??'')+'</b>';
      return '<div class="item-row kso-row"><span>'+dish+'</span><span class="qty-cell">'+qty+'</span></div>';
    }).join('');
    const controls='<div class="edit-toolbar"><div class="edit-buttons"><button class="primary" data-kso-edit="'+esc(historyKey(d))+'" '+(saving?'disabled':'')+'>'+(saving?'Сохраняем…':editing?'Сохранить':'Редактировать')+'</button>'+(editing?'<button class="secondary" data-kso-cancel="'+esc(historyKey(d))+'" '+(saving?'disabled':'')+'>Отмена</button>':'')+'</div></div>';
    return '<div class="details"><div class="details-grid"><div><b>Тип</b><br>Получить с кухни</div><div><b>Маршрут</b><br>'+esc(d.from_point||'Кухня')+' → '+esc(d.to_point||'Раздача')+'</div></div>'+controls+'<div class="document-items-scroll"><section class="doc-dish-group"><h4>Номенклатура</h4><div class="items">'+rows+'</div></section></div></div>';
  };
  async function start(d){
    try{
      if(!state.ksoDishOptions)state.ksoDishOptions=await rpc('admin_dish_options',{p_token:state.token});
      for(const i of d.details?.items||[])state.ksoDrafts[key(d,i)]={dishId:i.dishId,qty:String(i.qty??'')};
      state.editing.add(historyKey(d));state.message='';render();
    }catch(e){state.message=e.message;render()}
  }
  async function save(d){
    const hk=historyKey(d);state.saving.add(hk);state.message='';render();
    try{
      for(const i of d.details?.items||[]){
        const dr=state.ksoDrafts[key(d,i)]; if(!dr)continue;
        const qty=Number(String(dr.qty).replace(',','.'));
        if(!Number.isFinite(qty)||qty<=0)throw new Error('Количество должно быть больше нуля');
        if(String(dr.dishId)!==String(i.dishId)||qty!==Number(i.qty)){
          await rpc('admin_edit_kitchen_supply_item',{p_token:state.token,p_movement_id:d.doc_id,p_item_id:i.itemId,p_new_dish_id:dr.dishId,p_new_qty:qty,p_actor:state.actor||'Администратор'});
        }
      }
      state.editing.delete(hk);await load();state.message='Документ «Получить с кухни» обновлён';
    }catch(e){state.message=e.message}
    finally{state.saving.delete(hk);render()}
  }
  const baseBind=bind;
  bind=function(){
    baseBind();
    document.querySelectorAll('[data-kso-edit]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.ksoEdit);if(d)(state.editing.has(historyKey(d))?save(d):start(d))});
    document.querySelectorAll('[data-kso-cancel]').forEach(b=>b.onclick=()=>{const d=(state.data?.documents||[]).find(x=>historyKey(x)===b.dataset.ksoCancel);if(d){state.editing.delete(historyKey(d));render()}});
    document.querySelectorAll('[data-kso-dish]').forEach(x=>x.onchange=()=>{if(state.ksoDrafts[x.dataset.ksoDish])state.ksoDrafts[x.dataset.ksoDish].dishId=x.value});
    document.querySelectorAll('[data-kso-qty]').forEach(x=>x.oninput=()=>{if(state.ksoDrafts[x.dataset.ksoQty])state.ksoDrafts[x.dataset.ksoQty].qty=x.value});
  };
})();