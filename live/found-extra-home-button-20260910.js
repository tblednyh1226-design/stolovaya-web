// Make «Нашла ещё» visible directly on the point home screen for an already submitted/closed day.
(function(){
  const baseHome=homeScreen;
  homeScreen=function(){
    let html=baseHome();
    const h=state.home||{};
    if(!(h.submitted||h.dayClosed))return html;
    if(/data-screen="found-extra"/.test(html))return html;
    const button='<button type="button" class="wide-secondary found-extra-home" data-screen="found-extra"><span style="font-size:20px">＋</span> Нашла ещё</button>';
    // Put it high on the screen, immediately after the main action block.
    if(html.includes('</section><button id="change-point"')){
      html=html.replace('</section><button id="change-point"','</section>'+button+'<button id="change-point"');
    }else{
      html+=button;
    }
    return html;
  };

  const baseSubmitted=submittedScreen;
  submittedScreen=function(){
    const html=baseSubmitted();
    // The old implementation disabled «Нашла ещё» when dayClosed=true,
    // although this action is specifically intended for an already submitted day.
    return html.replace(/(data-screen="found-extra"[^>]*?)\sdisabled/g,'$1');
  };

  const style=document.createElement('style');
  style.textContent='.found-extra-home{margin-top:12px!important;border-color:#b9cbbf!important;background:#f4f8f4!important;color:#315f49!important;font-weight:800!important}';
  document.head.appendChild(style);
  if(state.screen==='home'||state.screen==='submitted')render();
})();
