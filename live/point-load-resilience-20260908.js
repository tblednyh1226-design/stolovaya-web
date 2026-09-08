// Prevent the buffet UI from hanging forever while opening a point.
// Critical data (home + daily items) must load; optional freezer/transfers may fail without blocking entry.
const __baseRpc = rpc;
rpc = async function(name, body){
  const timeoutMs = 15000;
  return await Promise.race([
    __baseRpc(name, body),
    new Promise((_, reject)=>setTimeout(()=>reject(new Error(`Не отвечает база: ${name}`)), timeoutMs))
  ]);
};

loadPoint = async function(){
  const day = state.testDate || moscowToday();
  const common = {p_token:state.token,p_point_code:state.point,p_business_date:day};

  const [homeResult, itemsResult] = await Promise.all([
    rpc('public_home', common),
    rpc('public_daily_items_v2', common)
  ]);

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
