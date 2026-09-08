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

    return nativeFetch(YANDEX_BRIDGE,bridgeInit);
  };

  window.__stolovayaYandexBridge={enabled:true,url:YANDEX_BRIDGE};
})();
