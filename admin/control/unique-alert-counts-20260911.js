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
    let out=html
      .replace(/(<button[^>]*data-panel="errors"[^>]*><b>)[^<]*(<\/b><small>критических ошибок<\/small>)/,`$1${errors}$2`)
      .replace(/(<button[^>]*data-panel="warnings"[^>]*><b>)[^<]*(<\/b><small>предупреждений<\/small>)/,`$1${warnings}$2`);
    // baseApp may have added danger using the unfiltered server totals before we replaced the visible count.
    // Keep red styling strictly tied to the final visible value.
    if(errors===0) out=out.replace(/class="metric metric-button danger" data-panel="errors"/,'class="metric metric-button" data-panel="errors"');
    else out=out.replace(/class="metric metric-button" data-panel="errors"/,'class="metric metric-button danger" data-panel="errors"');
    if(warnings===0) out=out.replace(/class="metric metric-button danger" data-panel="warnings"/,'class="metric metric-button" data-panel="warnings"');
    else out=out.replace(/class="metric metric-button" data-panel="warnings"/,'class="metric metric-button danger" data-panel="warnings"');
    return out;
  };
})();
