// Admin editor for "Получить с кухни" (БК→БР / ПК→ПР).
(function(){
  state.ksoDishOptions=state.ksoDishOptions||null;
  state.ksoRows=state.ksoRows||{};
  state.ksoNewSeq=state.ksoNewSeq||0;

  const isKso=d=>d?.doc_type==='movement'&&(/^KSO-/.test(String(d.title||''))||/^MOVE-(BUKHARA|PRAVDA-KITCHEN)-/.test(String(d.title||'')));
  const docKey=d=>historyKey(d);
  const GROUP_ORDER=['Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры','Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'];
  const groupRank=g=>{const i=GROUP_ORDER.indexOf(g);return i<0?999:i};
  const groupName=v=>String(v||'Прочее').trim()||'Прочее';

  function originalRows(d){
    return (d.details?.items||[]).map(i=>({
      rowKey:'item-'+String(i.itemId),
      itemId:i.itemId,
      dishId:String(i.dishId||''),
      qty:String(i.qty??''),
      group:groupName(i.group),
      isNew:false
    }));
  }

  function rowsFor(d){
    const hk=docKey(d);
    return state.ksoRows[hk]||originalRows(d);
  }

  function dishOptions(selected){
    const opts=state.ksoDishOptions||[];
    const groups=new Map();
    for(const o of opts){
      const g=groupName(o.group);
      if(!groups.has(g))groups.set(g,[]);
      groups.get(g).push(o);
    }
    const body=[...groups.entries()]
      .sort((a,b)=>groupRank(a[0])-groupRank(b[0])||a[0].localeCompare(b[0],'ru'))
      .map(([g,rows])=>{
        rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ru'));
        return '<optgroup label="'+esc(g)+'">'+rows.map(o=>
          '<option value="'+esc(o.id)+'" '+(String(o.id)===String(selected)?'selected':'')+'>'+
          esc(o.name)+' ['+esc(o.code||'')+']</option>'
        ).join('')+'</optgroup>';
      }).join('');
    return '<option value="">Выберите блюдо</option>'+body;
  }

  function rowGroup(dr){
    if(!dr.dishId)return 'Новая позиция';
    const opt=(state.ksoDishOptions||[]).find(o=>String(o.id)===String(dr.dishId));
    return groupName(opt?.group||dr.group);
  }

  function groupedRows(rows){
    const groups=new Map();
    for(const r of rows||[]){
      const g=rowGroup(r);
      if(!groups.has(g))groups.set(g,[]);
      groups.get(g).push(r);
    }
    return [...groups.entries()].sort((a,b)=>{
      if(a[0]==='Новая позиция')return 1;
      if(b[0]==='Новая позиция')return -1;
      return groupRank(a[0])-groupRank(b[0])||a[0].localeCompare(b[0],'ru');
    });
  }

  function groupItems(items){
    const groups=new Map();
    for(const i of items||[]){
      const g=groupName(i.group);
      if(!groups.has(g))groups.set(g,[]);
      groups.get(g).push(i);
    }
    return [...groups.entries()]
      .sort((a,b)=>groupRank(a[0])-groupRank(b[0])||a[0].localeCompare(b[0],'ru'));
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
      const sourceRows=rowsFor(d);
      rows=groupedRows(sourceRows).map(([group,groupRows])=>{
        const body=groupRows.map(dr=>{
          const remove=dr.isNew
            ? '<button type="button" class="kso-remove" data-kso-remove="'+esc(dr.rowKey)+'" data-kso-doc="'+esc(hk)+'">Убрать</button>'
            : '<span class="kso-existing-mark">есть</span>';
          return '<div class="kso-edit-row">'+
            '<select class="kso-dish" data-kso-row="'+esc(dr.rowKey)+'" data-kso-doc="'+esc(hk)+'">'+dishOptions(dr.dishId)+'</select>'+
            '<input class="qty-input" type="number" min="0.001" step="0.001" inputmode="decimal" data-kso-qty-row="'+esc(dr.rowKey)+'" data-kso-doc="'+esc(hk)+'" value="'+esc(dr.qty)+'" placeholder="Кол-во">'+
            remove+
          '</div>';
        }).join('');
        return '<section class="doc-dish-group kso-group"><h4>'+esc(group)+'</h4><div class="items kso-items">'+body+'</div></section>';
      }).join('');

      if(!rows)rows='<div class="empty">Добавьте хотя бы одно блюдо.</div>';
    }else{
      rows=groupItems(items).map(([group,groupItems])=>
        '<section class="doc-dish-group kso-group"><h4>'+esc(group)+'</h4><div class="items kso-items">'+
        groupItems.sort((a,b)=>String(a.dish||'').localeCompare(String(b.dish||''),'ru')).map(i=>
          '<div class="item-row"><span>'+esc(i.dish||'')+'</span><b>'+esc(i.qty??'')+'</b></div>'
        ).join('')+
        '</div></section>'
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
      '<div class="document-items-scroll">'+rows+'</div>'+
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
    rows.push({rowKey,dishId:'',qty:'',group:'Прочее',isNew:true});
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

  async function sendToIiko(d){
    if(state.editing.has(docKey(d))){
      state.message='Сначала сохраните изменения документа, затем выгружайте его в iiko';
      render();
      return;
    }

    const current=state.ksoIikoStatuses?.[String(d.doc_id)]||{};
    const isUpdate=Boolean(current.iikoDocumentId||current.iikoDocumentNumber);
    if(!confirm((isUpdate?'Обновить':'Выгрузить')+' это перемещение в iiko?\n\nДокумент в iiko останется непроведённым до ручного проведения.'))return;

    state.busy=true;
    state.message=isUpdate?'Обновляем перемещение в iiko…':'Выгружаем перемещение в iiko…';
    render();

    try{
      await rpc('admin_send_kitchen_transfer_to_iiko',{
        p_token:state.token,
        p_movement_id:d.doc_id
      });

      for(let attempt=0;attempt<6;attempt++){
        await new Promise(r=>setTimeout(r,1500));
        const s=await rpc('admin_kitchen_transfer_iiko_status',{
          p_token:state.token,
          p_movement_id:d.doc_id
        });

        if(s?.status==='exported'){
          state.ksoIikoStatuses=state.ksoIikoStatuses||{};
          state.ksoIikoStatuses[String(d.doc_id)]=s;
          state.message=(isUpdate?'Перемещение обновлено':'Перемещение выгружено')+' в iiko непроведённым'+(s.iikoDocumentNumber?' · № '+s.iikoDocumentNumber:'')+'.';
          return;
        }

        if(s?.status==='export_error'){
          throw new Error(s.exportError||'iiko не приняла перемещение');
        }
      }

      state.message='Запрос на '+(isUpdate?'обновление':'выгрузку')+' отправлен в iiko. iiko отвечает дольше обычного, статус можно проверить повторно через журнал.';
    }catch(e){
      state.message=e.message||'Не удалось выгрузить перемещение в iiko';
    }finally{
      state.busy=false;
      render();
    }
  }

  const baseBind=bind;
  bind=function(){
    baseBind();

    document.querySelectorAll('[data-kso-iiko-send]').forEach(b=>b.onclick=()=>{
      const d=(state.data?.documents||[]).find(x=>isKso(x)&&String(x.doc_id)===String(b.dataset.ksoIikoSend));
      if(d)sendToIiko(d);
    });

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
      if(r){r.dishId=x.value;const opt=(state.ksoDishOptions||[]).find(o=>String(o.id)===String(x.value));r.group=groupName(opt?.group);render();}
    });

    document.querySelectorAll('[data-kso-qty-row]').forEach(x=>x.oninput=()=>{
      const rows=state.ksoRows[x.dataset.ksoDoc]||[];
      const r=rows.find(v=>v.rowKey===x.dataset.ksoQtyRow);
      if(r)r.qty=x.value;
    });
  };
})();