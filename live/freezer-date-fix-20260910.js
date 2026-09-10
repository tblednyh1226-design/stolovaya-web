// Fix historical freezer withdrawals: always use the business date currently opened in the UI.
// Loaded after app.js in the same eval scope, so this replaces the base handler.
async function takeFreezer(){
  const rows=state.freezer.filter(x=>n(state.freezerTake[x.dish_id])>0);
  if(!rows.length){
    state.screen='closing';
    state.message='';
    render();
    return;
  }

  // Validate against exactly the balances displayed on this screen.
  for(const x of rows){
    const q=n(state.freezerTake[x.dish_id]);
    const available=n(x.quantity);
    if(q>available+.0001){
      return setMessage(`${clean(x.dish_name)}: пытаетесь достать ${fmt(q)}, доступно ${fmt(available)}`);
    }
  }

  const businessDate=state.home?.businessDate||null;
  const actor=localStorage.getItem('stolovaya:employee-name')||'Буфетчик';
  state.busy=true;
  state.message='';
  render();
  try{
    for(const x of rows){
      const q=n(state.freezerTake[x.dish_id]);
      await rpc('public_take_from_freezer',{
        p_token:state.token,
        p_point_code:state.point,
        p_dish_id:x.dish_id,
        p_quantity:q,
        p_actor:actor,
        p_business_date:businessDate
      });
    }
    state.freezerTake={};
    await loadPoint();
    state.screen='closing';
    state.message='Блюда из заморозки добавлены в доступное количество';
  }catch(e){
    state.message=e.message||'Не удалось сохранить разморозку';
  }finally{
    state.busy=false;
    render();
  }
}
