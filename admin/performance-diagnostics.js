/* Admin performance diagnostics: no tokens, request bodies, or personal data are recorded. */
(function(){
  if(window.__stolovayaDiagnostics)return;
  const KEY='stolovaya:admin-performance-v1',MAX=250;
  const section=location.pathname.includes('/journal')?'journal':location.pathname.includes('/report')?'report':'admin';
  const started=performance.now();
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  function log(event,detail={}){
    const entry={at:new Date().toISOString(),section,event,elapsedMs:Math.round(performance.now()-started),...detail};
    try{const a=read();a.push(entry);localStorage.setItem(KEY,JSON.stringify(a.slice(-MAX)))}catch(e){}
    if(event==='request_end'&&detail.durationMs>3000)console.warn('[Столовая: медленный запрос]',entry);
  }
  window.__stolovayaDiagnostics={log,read};
  log('page_start',{path:location.pathname});
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url||'';
    let endpoint='other';
    try{const u=new URL(url,location.href);endpoint=u.pathname.includes('/rpc/')?'rpc/'+u.pathname.split('/rpc/')[1].split('/')[0]:u.pathname.includes('/functions/v1/')?'edge/'+u.pathname.split('/functions/v1/')[1].split('/')[0]:'other'}catch(e){}
    const id=Math.random().toString(36).slice(2,9),t=performance.now();
    log('request_start',{id,endpoint});
    try{const response=await originalFetch(input,init);log('request_end',{id,endpoint,status:response.status,durationMs:Math.round(performance.now()-t),bytes:Number(response.headers.get('content-length'))||null});return response}
    catch(e){log('request_error',{id,endpoint,durationMs:Math.round(performance.now()-t),error:e?.name||'NetworkError'});throw e}
  };
  window.addEventListener('error',e=>log('script_error',{message:String(e.message||'error').slice(0,160)}));
  window.addEventListener('unhandledrejection',e=>log('unhandled_rejection',{message:String(e.reason?.message||e.reason||'error').slice(0,160)}));
  window.addEventListener('load',()=>log('window_load'));
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.duration>=100)log('long_task',{durationMs:Math.round(e.duration)})}).observe({entryTypes:['longtask']})}catch(e){}
  const button=document.createElement('button');button.textContent='Логи загрузки';button.type='button';
  button.style.cssText='position:fixed;bottom:12px;right:12px;z-index:99999;background:#234d3a;color:white;border:0;border-radius:10px;padding:9px 12px;font:600 12px sans-serif;box-shadow:0 2px 10px #0003';
  button.onclick=()=>{log('logs_export');const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),entries:read()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='stolovaya-admin-performance-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.body.appendChild(button);log('dom_ready')},{once:true});else document.body.appendChild(button);
})();