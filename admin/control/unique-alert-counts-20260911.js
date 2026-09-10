// Do not count the same problem twice in summary tiles.
// Dedicated tiles own their categories; "critical" and "warnings" show only the remainder.
(function(){
  const ownedKinds=new Set(['missing_close','partial_close','pending_transfer','late_iiko']);
  function otherErrors(alerts){return (alerts||[]).filter(a=>a.severity==='error'&&!ownedKinds.has(a.kind));}
  function otherWarnings(alerts){return (alerts||[]).filter(a=>a.severity==='warning'&&!ownedKinds.has(a.kind));}

  const basePanelItems=panelItems;
  panelItems=function(key,alerts){
    if(key==='errors')return otherErrors(alerts);
    if(key==='warnings')return otherWarnings(alerts);
    return basePanelItems(key,alerts);
  };

  const baseApp=app;
  app=function(){
    const html=baseApp();
    const alerts=state.data?.alerts||[];
    const errors=otherErrors(alerts).length;
    const warnings=otherWarnings(alerts).length;
    return html
      .replace(/(<button[^>]*data-panel="errors"[^>]*><b>)[^<]*(<\/b><small>критических ошибок<\/small>)/,`$1${errors}$2`)
      .replace(/(<button[^>]*data-panel="warnings"[^>]*><b>)[^<]*(<\/b><small>предупреждений<\/small>)/,`$1${warnings}$2`);
  };
})();
