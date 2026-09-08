// Point opening resilience for the Yandex -> Supabase bridge.
// Critical requests are executed sequentially and retried once to avoid a cold-start/concurrency stall.
const __baseRpc = rpc;

async function __rpcWithTimeout(name, body, timeoutMs){
  return await Promise.race([
    __baseRpc(name, body),
    new Promise((_, reject)=>setTimeout(()=>reject(new Error(`Не отвечает база: ${name}`)), timeoutMs))
  ]);
}

rpc = async function(name, body){
  const critical = name === 'public_home' || name === 'public_daily_items_v2';
  const timeoutMs = critical ? 30000 : 15000;
  try{
    return await __rpcWithTimeout(name, body, timeoutMs);
  }catch(firstError){
    if(!critical) throw firstError;
    // One retry is useful for a freshly started Cloud Function instance.
    await new Promise(resolve=>setTimeout(resolve, 600));
    return await __rpcWithTimeout(name, body, timeoutMs);
  }
};

loadPoint = async function(){
  const day = state.testDate || moscowToday();
  const common = {p_token:state.token,p_point_code:state.point,p_business_date:day};

  // Do not fire the two heaviest point-opening calls at exactly the same time.
  const homeResult = await rpc('public_home', common);
  const itemsResult = await rpc('public_daily_items_v2', common);

  const [freezerResult, incomingResult] = await Promise.allSettled([
    rpc('public_freezer_items', common),
    rpc('public_incoming_transfers', common)
  ]);

  state.home = homeResult;
  state.testDate = homeResult.businessDate || day;
  localStorage.setItem('stolovaya:test-date', state.testDate);
  state.items = Array.isArray(itemsResult) ? itemsResult : [];
  state.freezer = freezerResult.status === 'fulfilled' && Array.isArray(freezerResult.value) ? freezerResult.value : [];
  state.incoming = incomingResult.status === 'fulfilled' && Array.isArray(incomingResult.value) ? incomingResult.value : [];

  const saved = JSON.parse(localStorage.getItem(draftKey()) || 'null') || {};
  const next = {};
  for (const x of state.items){
    next[x.dish_id] = saved[x.dish_id] || {
      leftover:x.leftover_qty==null?'':String(x.leftover_qty),
      waste:x.waste_qty==null?'':String(x.waste_qty),
      frozen:x.frozen_qty==null?'':String(x.frozen_qty),
      touched:{leftover:false,waste:false,frozen:false}
    };
  }
  state.entries = next;
  state.message = '';
};
