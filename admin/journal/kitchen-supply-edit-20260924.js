// Admin editor for "Получить с кухни" (БК→БР / ПК→ПР).
(function(){
  state.ksoDishOptions=state.ksoDishOptions||null;
  state.ksoRows=state.ksoRows||{};
  state.ksoNewSeq=state.ksoNewSeq||0;

  const isKso=d=>d?.doc_type==='movement'&&(/^KSO-/.test(String(d.title||''))||/^MOVE-(BUKHARA|PRAVDA-KITCHEN)-/.test(String(d.title||'')));
  const docKey=d=>historyKey(d);

  function originalRows(d){
    return (d.details?.items||[]).map(i=>({
      rowKey:'item-'+String(i.itemId),
      itemId:i.itemId,
      dishId:String(i.dishId||''),
      qty:String(i.qty??''),
      isNew:false
    }));
  }

  function rowsFor(d){
    const hk=docKey(d);
    return state.ksoRows[hk]||originalRows(d);
  }

  function dishOptions(selected){
    const opts=state.ksoDishOptions||[];
    return '<option value="">Выберите блюдо</option>'+opts.map(o=>
      '<option value="'+esc(o.id)+'" '+(String(o.id)===String(selected)?'selected':'')+'>'+
      esc(o.name)+' ['+esc(o.code||'')+']</option>'
    ).join('');
  }

  const baseDetails=details;
  details=function(d){
    if(!isKso(d))return baseDetails(d);

    const hk=docKey(d);
    const items=d.details?.items||[];
    const editing=state.editing.has(hk);
    const saving=state.saving.has(hk);

    let rows='';
    if(editing){
      rows=rowsFor(d).map(dr=>{
        const remove=dr.isNew
          ? '<button type="button" class="kso-remove" data-kso-remove="'+esc(dr.rowKey)+'" data-kso-doc="'+esc(hk)+'">Убрать</button>'
          : '<span class="kso-existing-mark">есть</span>';
        return '<div class="kso-edit-row">'+
          '<select class="kso-dish" data-kso-row="'+esc(dr.rowKey)+'" data-kso-doc="'+esc(hk)+'">'+dishOptions(dr.dishId)+'</select>'+
          '<input class="qty-input" type="number" min="0.001" step="0.001" inputmode="decimal" data-kso-qty-row="'+esc(dr.rowKey)+'" data-kso-doc="'+esc(hk)+'" value="'+esc(dr.qty)+'" placeholder="Кол-во">'+
          remove+
        '</div>';
      }).join('');

      if(!rows)rows='<div class="empty">Добавьте хотя бы одно блюдо.</div>';
    }else{
      rows=items.map(i=>
        '<div class="item-row"><span>'+esc(i.dish||'')+'</span><b>'+esc(i.qty??'')+'</b></div>'
      ).join('');
    }

    const controls='<div class="edit-toolbar"><div class="edit-buttons kso-buttons">'+
      (editing?'<button class="secondary" type="button" data-kso-add="'+esc(hk)+'" '+(saving?'disabled':'')+'>+ Добавить блюдо</button>':'')+
      '<button class="primary" type="button" data-kso-edit="'+esc(hk)+'" '+(saving?'disabled':'')+'>'+
        (saving?'Сохраняем…':editing?'Сохранить':'Редактировать')+
      '</button>'+
      (editing?'<button class="secondary" type="button" data-kso-cancel="'+esc(hk)+'" '+(saving?'disabled':'')+'>Отмена</button>':'')+
    '</div></div>';

    return '<div class="details">'+
      '<div class="details-grid">'+
        '<div><b>Тип</b><br>Получить с кухни</div>'+
        '<div><b>Маршрут</b><br>'+esc(d.from_point||'Кухня')+' → '+esc(d.to_point||'Раздача')+'</div>'+
      '</div>'+
      controls+
      '<div class="document-items-scroll"><section class="doc-dish-group"><h4>Номенклатура</h4><div class="items kso-items">'+rows+'</div></section></div>'+
    '</div>';
  };

  async function start(d){
    try{
      if(!state.ksoDishOptions){
        state.ksoDishOptions=await rpc('admin_dish_options',{p_token:state.token});
      }
      const hk=docKey(d);
      state.ksoRows[hk]=originalRows(d);
      state.editing.add(hk);
      state.message='';
      render();
    }catch(e){
      state.message=e.message;
      render();
    }
  }

  function addRow(d){
    const hk=docKey(d);
    const rows=state.ksoRows[hk]||(state.ksoRows[hk]=originalRows(d));
    const rowKey='new-'+(++state.ksoNewSeq);
    rows.push({rowKey,dishId:'',qty:'',isNew:true});
    render();
  }

  function removeRow(hk,rowKey){
    const rows=state.ksoRows[hk]||[];
    state.ksoRows[hk]=rows.filter(r=>r.rowKey!==rowKey || !r.isNew);
    render();
  }

  async function save(d){
    const hk=docKey(d);
    const rows=state.ksoRows[hk]||[];
    state.saving.add(hk);
    state.message='';
    render();

    try{
      if(!rows.length)throw new Error('Добавьте хотя бы одно блюдо');

      const seen=new Set();
      const items=rows.map(r=>{
        if(!r.dishId)throw new Error('В новой строке выберите блюдо');
        const qty=Number(String(r.qty).replace(',','.'));
        if(!Number.isFinite(qty)||qty<=0)throw new Error('Количество должно быть больше нуля');
        if(seen.has(String(r.dishId)))throw new Error('Одно и то же блюдо нельзя добавлять двумя строками');
        seen.add(String(r.dishId));
        return {dishId:r.dishId,quantity:qty};
      });

      await rpc('admin_save_kitchen_supply_document',{
        p_token:state.token,
        p_movement_id:d.doc_id,
        p_items:items,
        p_actor:state.actor||'Администратор'
      });

      state.editing.delete(hk);
      delete state.ksoRows[hk];
      await load();
      state.message='Документ «Получить с кухни» обновлён. Связанные документы пересчитаны';
    }catch(e){
      state.message=e.message;
    }finally{
      state.saving.delete(hk);
      render();
    }
  }

  const baseBind=bind;
  bind=function(){
    baseBind();

    document.querySelectorAll('[data-kso-edit]').forEach(b=>b.onclick=()=>{
      const d=(state.data?.documents||[]).find(x=>docKey(x)===b.dataset.ksoEdit);
      if(d)(state.editing.has(docKey(d))?save(d):start(d));
    });

    document.querySelectorAll('[data-kso-add]').forEach(b=>b.onclick=()=>{
      const d=(state.data?.documents||[]).find(x=>docKey(x)===b.dataset.ksoAdd);
      if(d)addRow(d);
    });

    document.querySelectorAll('[data-kso-cancel]').forEach(b=>b.onclick=()=>{
      const d=(state.data?.documents||[]).find(x=>docKey(x)===b.dataset.ksoCancel);
      if(!d)return;
      const hk=docKey(d);
      state.editing.delete(hk);
      delete state.ksoRows[hk];
      state.message='';
      render();
    });

    document.querySelectorAll('[data-kso-remove]').forEach(b=>b.onclick=()=>{
      removeRow(b.dataset.ksoDoc,b.dataset.ksoRemove);
    });

    document.querySelectorAll('[data-kso-row]').forEach(x=>x.onchange=()=>{
      const rows=state.ksoRows[x.dataset.ksoDoc]||[];
      const r=rows.find(v=>v.rowKey===x.dataset.ksoRow);
      if(r)r.dishId=x.value;
    });

    document.querySelectorAll('[data-kso-qty-row]').forEach(x=>x.oninput=()=>{
      const rows=state.ksoRows[x.dataset.ksoDoc]||[];
      const r=rows.find(v=>v.rowKey===x.dataset.ksoQtyRow);
      if(r)r.qty=x.value;
    });
  };
})();