// Deep-link from Control directly into one exact journal document.
(function(){
  const params=new URLSearchParams(location.search);
  const wantedId=params.get('doc')||'';
  const wantedNumber=params.get('number')||'';
  const wantedType=params.get('type')||'';
  const wantedFrom=params.get('from')||'';
  const wantedTo=params.get('to')||'';
  const wantedPoint=params.get('point')||'';
  if(wantedFrom)state.from=wantedFrom;
  if(wantedTo)state.to=wantedTo;
  if(wantedType)state.type=wantedType;
  if(wantedPoint)state.point=wantedPoint;
  function targetDoc(){return (state.data?.documents||[]).find(d=>(!wantedType||d.doc_type===wantedType)&&((wantedId&&String(d.doc_id)===wantedId)||(wantedNumber&&String(d.details?.documentNumber||d.details?.iikoDocumentNumber||'')===wantedNumber)));}
  const oldLoad=load;
  load=async function(){await oldLoad();const d=targetDoc();if(d){const k=historyKey(d);state.open.add(k);render();setTimeout(()=>{const btn=document.querySelector(`[data-open="${CSS.escape(k)}"]`);btn?.closest('.doc')?.scrollIntoView({behavior:'smooth',block:'start'});},80);}};
})();
