(()=>{
  const SUPABASE_RPC='https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc/';
  const YANDEX_BRIDGE='https://functions.yandexcloud.net/d4e3fd70tje1bpctpfbs';
  const nativeFetch=window.fetch.bind(window);
  // Set false to restore the original gateway-only behavior.
  const adminFallbackEnabled=true;
  // Rollback switch: set to false to restore the previous admin gateway route.
  const adminDirectEnabled=true;
  const adminPage=/\/admin(?:\/|$)/i.test(location.pathname);
  const adminFallbackReads=new Set(['public_admin_web_login','public_admin_session_from_buffet_token','admin_employee_directory','public_global_chat_unread','public_daily_items_v2','public_employee_meal_summary','public_freezer_items','public_home','public_incoming_transfers','public_kitchen_supply_dishes','public_point_bootstrap','public_point_options','public_transfer_point_options','admin_main_operational_report','admin_main_operational_report_range','admin_document_journal','admin_document_history','admin_kitchen_transfer_iiko_statuses']);

  function getUrl(input){
    if(typeof input==='string')return input;
    if(input&&typeof input.url==='string')return input.url;
    return '';
  }

  window.fetch=async function(input,init={}){
    const url=getUrl(input);
    // Live and admin use direct Supabase RPC; gateway logic below remains for rollback.
    if((/\/live(?:\/|$)/i.test(location.pathname) || (adminDirectEnabled && adminPage)) && url.startsWith(SUPABASE_RPC)){
      return nativeFetch(input,init);
    }
    if(!url.startsWith(SUPABASE_RPC)){
      return nativeFetch(input,init);
    }

    const rpcName=decodeURIComponent(url.slice(SUPABASE_RPC.length).split(/[?#]/)[0]);
    let rpcBody={};
    try{
      if(typeof init.body==='string'&&init.body){
        rpcBody=JSON.parse(init.body);
      }else if(init.body&&typeof init.body==='object'){
        rpcBody=init.body;
      }
    }catch(e){
      rpcBody={};
    }

    const bridgeInit={
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({rpc:rpcName,body:rpcBody}),
      cache:init.cache||'no-store'
    };

    const retryable=new Set([429,500,502,503,504]);
    const safeRetryRpc=new Set([
      'public_admin_session_from_buffet_token','public_admin_web_login','public_daily_items_v2',
      'public_employee_meal_summary','public_freezer_items','public_global_chat_unread','public_home',
      'public_incoming_transfers','public_kitchen_supply_dishes','public_point_bootstrap',
      'public_point_options','public_transfer_point_options','public_web_login','admin_employee_directory'
    ]);
    const isSafeRead=safeRetryRpc.has(rpcName)||adminFallbackReads.has(rpcName);
    const allowDirect=adminFallbackEnabled&&adminPage&&adminFallbackReads.has(rpcName);
    const direct=()=>nativeFetch(input,{...init,cache:'no-store'});
    const maxAttempts=isSafeRead?2:1;
    const timeoutMs=isSafeRead?3500:20000;
    let lastError=null;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      let timer=null;
      try{
        const controller=new AbortController();
        timer=setTimeout(()=>controller.abort(),timeoutMs);
        const response=await nativeFetch(YANDEX_BRIDGE,{...bridgeInit,signal:controller.signal});
        if(allowDirect&&[502,503,504].includes(response.status))return direct();
        if(!retryable.has(response.status)||attempt===maxAttempts-1)return response;
      }catch(error){
        const aborted=error?.name==='AbortError'||/aborted/i.test(String(error?.message||error||''));
        lastError=aborted
          ? new Error(isSafeRead?'Шлюз отвечает медленно. Повторите действие.':'Сохранение не получило ответ от шлюза. Проверьте результат перед повторной отправкой.')
          : error;
        if(allowDirect){try{return await direct();}catch(directError){throw directError;}}
        if(attempt===maxAttempts-1)throw lastError;
      }finally{
        if(timer)clearTimeout(timer);
      }
      await new Promise(resolve=>setTimeout(resolve,300));
    }
    throw lastError||new Error('Yandex gateway unavailable');
  };

  window.__stolovayaYandexBridge={enabled:true,url:YANDEX_BRIDGE};
})();
