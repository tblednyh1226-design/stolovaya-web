/* Admin performance diagnostics: no tokens, request bodies, or personal data are recorded. */
(function(){
  if(window.__stolovayaDiagnostics)return;
  const KEY='stolovaya:admin-performance-v1',QUEUE_KEY='stolovaya:admin-pending-v2',MAX=250;
  const section=location.pathname.includes('/journal')?'journal':location.pathname.includes('/report')?'report':'admin';
  const started=performance.now();
  let pending=[];
  try{pending=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');if(!Array.isArray(pending))pending=[]}catch(e){pending=[]}
  let apiHeaders=null;
  let sending=false;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  function log(event,detail={}){
    const entry={at:new Date().toISOString(),section,event,elapsedMs:Math.round(performance.now()-started),...detail};
    try{const a=read();a.push(entry);localStorage.setItem(KEY,JSON.stringify(a.slice(-MAX)))}catch(e){}
    if(['request_end','request_error','page_start','script_error','long_task'].includes(event)){
      pending.push(entry);pending=pending.slice(-100);
      try{localStorage.setItem(QUEUE_KEY,JSON.stringify(pending))}catch(e){}
    }
    if(event==='request_end'&&detail.durationMs>3000)console.warn('[Столовая: медленный запрос]',entry);
  }
  window.__stolovayaDiagnostics={log,read};
  log('page_start',{path:location.pathname});
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    if(!apiHeaders && init?.headers?.apikey)apiHeaders={apikey:init.headers.apikey,'Content-Type':'application/json'};
    const url=typeof input==='string'?input:input?.url||'';
    let endpoint='other';
    try{const u=new URL(url,location.href);endpoint=u.pathname.includes('/rpc/')?'rpc/'+u.pathname.split('/rpc/')[1].split('/')[0]:u.pathname.includes('/functions/v1/')?'edge/'+u.pathname.split('/functions/v1/')[1].split('/')[0]:'other'}catch(e){}
    const id=Math.random().toString(36).slice(2,9),t=performance.now();
    log('request_start',{id,endpoint});
    try{const response=await originalFetch(input,init);log('request_end',{id,endpoint,status:response.status,durationMs:Math.round(performance.now()-t),bytes:Number(response.headers.get('content-length'))||null});return response}
    catch(e){log('request_error',{id,endpoint,durationMs:Math.round(performance.now()-t),error:e?.name||'NetworkError'});throw e}
  };
  setInterval(async()=>{
    if(sending||!pending.length||!apiHeaders)return;
    const token=sessionStorage.getItem('stolovaya:admin');
    if(!token)return;
    sending=true;
    const batch=pending.splice(0,20);
    try{
      const r=await originalFetch('https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc/admin_performance_record',{method:'POST',headers:apiHeaders,body:JSON.stringify({p_token:token,p_events:batch}),signal:AbortSignal.timeout(7000)});
      if(!r.ok)throw new Error('HTTP '+r.status);
      try{localStorage.setItem(QUEUE_KEY,JSON.stringify(pending))}catch(e){}
      button.textContent='Диагностика ✓';
    }catch(e){pending=batch.concat(pending).slice(-100);
      try{localStorage.setItem(QUEUE_KEY,JSON.stringify(pending))}catch(err){}
      button.textContent='Диагностика !';
      console.warn('[Столовая] Не удалось отправить логи:',String(e.message||e));}
    finally{sending=false}
  },10000);
  window.addEventListener('error',e=>log('script_error',{message:String(e.message||'error').slice(0,160)}));
  window.addEventListener('unhandledrejection',e=>log('unhandled_rejection',{message:String(e.reason?.message||e.reason||'error').slice(0,160)}));
  window.addEventListener('load',()=>log('window_load'));
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.duration>=100)log('long_task',{durationMs:Math.round(e.duration)})}).observe({entryTypes:['longtask']})}catch(e){}
  const button=document.createElement('button');button.textContent='Диагностика';button.type='button';
  button.style.cssText='position:fixed;bottom:12px;right:12px;z-index:99999;background:#234d3a;color:white;border:0;border-radius:10px;padding:9px 12px;font:600 12px sans-serif;box-shadow:0 2px 10px #0003';
  button.onclick=()=>{log('logs_export');const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),entries:read()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='stolovaya-admin-performance-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.body.appendChild(button);log('dom_ready')},{once:true});else document.body.appendChild(button);
})();