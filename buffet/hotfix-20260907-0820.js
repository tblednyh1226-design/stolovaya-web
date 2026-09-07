// Stable test-mode point/date loader. Unique filename avoids stale mobile cache.
(function(){
  const todayMoscow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow'}).format(new Date());
  state.testDate=localStorage.getItem('stolovaya:test-date')||state.testDate||todayMoscow();

  loadPoint=async function(){
    const day=state.testDate||todayMoscow();
    const common={p_token:state.token,p_point_code:state.point,p_business_date:day};
    const [h,d,f,inc]=await Promise.all([
      rpc('public_home',common),
      rpc('public_daily_items_v2',common),
      rpc('public_freezer_items',common),
      rpc('public_incoming_transfers',common)
    ]);
    state.home=h;
    state.testDate=h?.businessDate||day;
    localStorage.setItem('stolovaya:test-date',state.testDate);
    state.items=Array.isArray(d)?d:[];
    state.freezer=Array.isArray(f)?f:[];
    state.incoming=Array.isArray(inc)?inc:[];
    const saved=JSON.parse(localStorage.getItem(draftKey())||'null')||{};
    const next={};
    for(const x of state.items){
      next[x.dish_id]=saved[x.dish_id]||{
        leftover:x.leftover_qty==null?'':String(x.leftover_qty),
        waste:x.waste_qty==null?'':String(x.waste_qty),
        frozen:x.frozen_qty==null?'':String(x.frozen_qty),
        touched:{leftover:false,waste:false,frozen:false}
      };
    }
    state.entries=next;
    state.message='';
  };

  choosePoint=async function(code){
    if(!code)return;
    state.point=code;
    state.message='';
    state.screen='loading';
    render();
    try{
      await loadPoint();
      state.screen='home';
    }catch(e){
      state.message=e?.message||'Не удалось открыть точку';
      state.screen='point';
    }
    render();
  };

  const priorBind=bind;
  bind=function(){
    priorBind();
    document.querySelectorAll('[data-point]').forEach(b=>{b.onclick=()=>choosePoint(b.dataset.point)});
  };

  const priorPointScreen=pointScreen;
  pointScreen=function(){
    const html=priorPointScreen();
    if(!state.message)return html;
    return html.replace('</section>',`<p class="error-text">${esc(state.message)}</p></section>`);
  };

  bind();
})();
