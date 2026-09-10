// Keep admin authorization and selected FIO across navigation/reloads until explicit logout.
(function(){
  const TOKEN='stolovaya:admin';
  const EMP='stolovaya:admin-employee';
  const lt=localStorage.getItem(TOKEN); if(lt&&!sessionStorage.getItem(TOKEN))sessionStorage.setItem(TOKEN,lt);
  const le=localStorage.getItem(EMP); if(le&&!sessionStorage.getItem(EMP))sessionStorage.setItem(EMP,le);

  function sync(){
    const st=sessionStorage.getItem(TOKEN); if(st)localStorage.setItem(TOKEN,st);
    const se=sessionStorage.getItem(EMP); if(se)localStorage.setItem(EMP,se);
  }
  sync();
  const timer=setInterval(sync,400);
  window.addEventListener('pagehide',sync);
  document.addEventListener('click',function(e){
    const b=e.target.closest?.('#logout,#admin-fio-back');
    if(!b)return;
    localStorage.removeItem(TOKEN);localStorage.removeItem(EMP);
    sessionStorage.removeItem(TOKEN);sessionStorage.removeItem(EMP);
    clearInterval(timer);
  },true);
})();
