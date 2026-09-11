// Record report generation/viewing in developer logs.
(function(){
  let lastLogged='';
  async function logReport(){
    if(!state?.token||!state?.report)return;
    const period=state.mode==='day'?state.date:`${state.from} — ${state.to}`;
    const key=`${state.mode}|${period}|${[...state.selected].sort().join(',')}`;
    if(key===lastLogged)return;
    lastLogged=key;
    try{
      await rpc('admin_record_event',{
        p_token:state.token,
        p_kind:'report',
        p_action:'generated',
        p_title:'Сформирован главный операционный отчёт',
        p_detail:`Период: ${period}. Точек: ${state.selected.size}`,
        p_point_code:null,
        p_business_date:state.mode==='day'?state.date:null,
        p_metadata:{mode:state.mode,from:state.from,to:state.to,date:state.date,points:[...state.selected]}
      });
    }catch(e){}
  }
  const baseLoad=load;
  load=async function(){
    await baseLoad();
    await logReport();
  };
  setTimeout(logReport,1200);
})();
