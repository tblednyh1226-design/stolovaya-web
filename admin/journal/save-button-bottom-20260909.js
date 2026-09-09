// In closing edit mode keep Save/Cancel below the editable table, where they are reached naturally after edits.
(function(){
  const prevBind=bind;
  bind=function(){
    prevBind();
    document.querySelectorAll('.closing-details').forEach(details=>{
      const wrap=details.querySelector('.closing-wrap');
      const toolbar=details.querySelector('.closing-toolbar');
      if(!wrap||!toolbar)return;
      const save=toolbar.querySelector('[data-thaw-closing-edit]');
      if(!save)return;
      const key=save.dataset.thawClosingEdit;
      const editing=state.thawClosingEditing?.has(key);
      if(editing){
        wrap.insertAdjacentElement('afterend',toolbar);
        toolbar.classList.add('closing-toolbar-bottom');
      }else{
        toolbar.classList.remove('closing-toolbar-bottom');
      }
    });
  };
  const style=document.createElement('style');
  style.textContent='.closing-toolbar-bottom{margin:14px 12px 4px!important;padding-top:12px;border-top:1px solid #ded9cc}.closing-toolbar-bottom .edit-buttons{display:flex;gap:10px;justify-content:flex-end}.closing-toolbar-bottom button{min-height:42px}@media(max-width:700px){.closing-toolbar-bottom .edit-buttons{display:grid;grid-template-columns:1fr 1fr}.closing-toolbar-bottom button{width:100%;min-height:46px}}';
  document.head.appendChild(style);
  if(state.data)render();
})();
