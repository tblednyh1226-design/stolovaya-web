(()=>{
  const SUPABASE_RPC='https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc/';
  const YANDEX_BRIDGE='https://functions.yandexcloud.net/d4e3fd70tje1bpctpfbs';
  const nativeFetch=window.fetch.bind(window);

  function getUrl(input){
    if(typeof input==='string')return input;
    if(input&&typeof input.url==='string')return input.url;
    return '';
  }

  window.fetch=async function(input,init={}){
    const url=getUrl(input);
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
    const isSafeRead=safeRetryRpc.has(rpcName);
    const maxAttempts=isSafeRead?2:1;
    // Пакетное редактирование ПК→ПР / БК→БР пересчитывает несколько документов.
    // Не обрываем ожидание подтверждения в середине записи.
    const timeoutMs=isSafeRead?3500:(rpcName==='admin_save_kitchen_supply_document'?60000:20000);
    let lastError=null;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      let timer=null;
      try{
        const controller=new AbortController();
        timer=setTimeout(()=>controller.abort(),timeoutMs);
        const response=await nativeFetch(YANDEX_BRIDGE,{...bridgeInit,signal:controller.signal});
        if(!retryable.has(response.status)||attempt===maxAttempts-1)return response;
      }catch(error){
        const aborted=error?.name==='AbortError'||/aborted/i.test(String(error?.message||error||''));
        lastError=aborted
          ? new Error(isSafeRead?'Шлюз отвечает медленно. Повторите действие.':'Сохранение не получило ответ от шлюза. Проверьте результат перед повторной отправкой.')
          : error;
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
