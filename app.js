const order=['Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры','Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'];
const points=[
  {code:'BESTUZHEVSKAYA',name:'Бестужевская'},
  {code:'BUKHARA',name:'Бухара'},
  {code:'ETM',name:'ЕТМ'},
  {code:'MODUL',name:'Модуль'},
  {code:'PRAVDA',name:'Правда'},
  {code:'REDMOND',name:'Редмонд'}
];
const demoItems=[
  {dish_name:'Салат овощной',group_name:'Холодные закуски',available_qty:12},
  {dish_name:'Оливье с курицей',group_name:'Холодные закуски',available_qty:8},
  {dish_name:'Борщ',group_name:'Первые блюда',available_qty:10},
  {dish_name:'Суп куриный',group_name:'Первые блюда',available_qty:9},
  {dish_name:'Омлет',group_name:'Блюда для завтраков',available_qty:7},
  {dish_name:'Блинчик с творогом',group_name:'Блюда для завтраков',available_qty:6},
  {dish_name:'Котлета домашняя',group_name:'Вторые блюда',available_qty:14},
  {dish_name:'Курица запечённая',group_name:'Вторые блюда',available_qty:11},
  {dish_name:'Картофельное пюре',group_name:'Гарниры',available_qty:15},
  {dish_name:'Рис',group_name:'Гарниры',available_qty:13},
  {dish_name:'Компот',group_name:'Напитки',available_qty:20},
  {dish_name:'Хлеб',group_name:'Хлеб',available_qty:30},
  {dish_name:'Пирожок с капустой',group_name:'Выпечка',available_qty:9}
];
const state={point:'',screen:'point',collapsed:new Set(),search:''};
const app=document.getElementById('app');
const clean=n=>(n||'').replace(/^\[[^\]]+\]\s*/,'').trim();
function grouped(rows){const m=new Map();for(const x of rows){const g=(x.group_name||'Прочее').trim()||'Прочее';if(!m.has(g))m.set(g,[]);m.get(g).push(x)}return [...m.entries()].sort(([a],[b])=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'ru')}).map(([title,items])=>({title,items:items.sort((a,b)=>clean(a.dish_name).localeCompare(clean(b.dish_name),'ru'))}))}
function header(){const p=points.find(x=>x.code===state.point);return `<header><div class="brand"><b>Столовая</b><small>${p?.name||'Выберите точку'} · демо</small></div></header>`}
function pointScreen(){return `${header()}<section class="loading-card point-card"><h2>Выберите точку</h2><div class="point-list">${points.map(p=>`<button class="point-btn" data-point="${p.code}">${p.name}</button>`).join('')}</div></section>`}
function homeScreen(){return `${header()}<button class="secondary change-point">Сменить точку</button><div class="home-actions"><button data-screen="inventory">Посмотреть остатки</button><button data-screen="closing">Сдать остатки</button></div><div class="message">Демо-режим без входа: можно проверить группы, порядок и сворачивание.</div>`}
function groupHtml(g,closing=false){const closed=state.collapsed.has(g.title)&&!state.search;return `<section class="collapsible-group"><button class="group-toggle" data-group="${encodeURIComponent(g.title)}"><span><b>${g.title}</b><small>${g.items.length}</small></span><i>${closed?'＋':'−'}</i></button>${closed?'':`<div class="cards">${g.items.map(x=>closing?closingCard(x):inventoryCard(x)).join('')}</div>`}</section>`}
function inventoryCard(x){return `<article class="item-card"><h3>${clean(x.dish_name)}</h3><div class="meta">Доступно сегодня: <b>${Number(x.available_qty||0).toLocaleString('ru-RU')}</b></div></article>`}
function closingCard(x){return `<article class="item-card"><h3>${clean(x.dish_name)}</h3><div class="meta">Доступно сегодня: <b>${Number(x.available_qty||0).toLocaleString('ru-RU')}</b></div><div class="fields"><label>Останется<input disabled placeholder="—"></label><label>Утиль<input disabled placeholder="—"></label><label>Заморозка<input disabled placeholder="—"></label></div></article>`}
function listScreen(){const rows=demoItems.filter(x=>clean(x.dish_name).toLowerCase().includes(state.search.toLowerCase()));return `${header()}<div class="screen-title"><button class="back">←</button><h1>${state.screen==='inventory'?'Посмотреть остатки':'Сдать остатки'}</h1></div><input id="search" class="search" placeholder="Поиск блюда" value="${state.search.replace(/"/g,'&quot;')}"><div class="group-list">${grouped(rows).map(g=>groupHtml(g,state.screen==='closing')).join('')}</div>${state.screen==='closing'?'<div class="message">В демо поля отключены, чтобы проверка интерфейса ничего не записывала.</div>':''}`}
function render(){if(state.screen==='point')app.innerHTML=pointScreen();else if(state.screen==='home')app.innerHTML=homeScreen();else app.innerHTML=listScreen();
  document.querySelectorAll('[data-point]').forEach(b=>b.onclick=()=>{state.point=b.dataset.point;state.screen='home';render()});
  document.querySelector('.change-point')?.addEventListener('click',()=>{state.screen='point';render()});
  document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>{state.screen=b.dataset.screen;state.search='';render()});
  document.querySelector('.back')?.addEventListener('click',()=>{state.screen='home';state.search='';render()});
  document.querySelectorAll('.group-toggle').forEach(b=>b.onclick=()=>{const g=decodeURIComponent(b.dataset.group);state.collapsed.has(g)?state.collapsed.delete(g):state.collapsed.add(g);render()});
  const s=document.getElementById('search');if(s)s.oninput=e=>{state.search=e.target.value;render()};
}
render();
