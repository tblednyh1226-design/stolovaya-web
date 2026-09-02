const API_URL='https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc';
const API_KEY='sb_publishable_rcvNssgN4_dPnVUpjU0bjQ_1cEWsA52';
const order=['Холодные закуски','Первые блюда','Блюда для завтраков','Вторые блюда','Гарниры','Напитки','Хлеб','Дополнительный ассортимент','Выпечка','Прочее'];
const demoItems=[
 {dish_name:'Салат витаминный',group_name:'Холодные закуски',available_qty:8,freezer_balance:0},
 {dish_name:'Салат с курицей',group_name:'Холодные закуски',available_qty:6,freezer_balance:0},
 {dish_name:'Борщ',group_name:'Первые блюда',available_qty:11,freezer_balance:0},
 {dish_name:'Суп куриный',group_name:'Первые блюда',available_qty:7,freezer_balance:0},
 {dish_name:'Блинчик с творогом',group_name:'Блюда для завтраков',available_qty:5,freezer_balance:2},
 {dish_name:'Омлет',group_name:'Блюда для завтраков',available_qty:4,freezer_balance:0},
 {dish_name:'Котлета куриная',group_name:'Вторые блюда',available_qty:9,freezer_balance:1},
 {dish_name:'Свинина запечённая',group_name:'Вторые блюда',available_qty:6,freezer_balance:0},
 {dish_name:'Картофельное пюре',group_name:'Гарниры',available_qty:10,freezer_balance:0},
 {dish_name:'Греча',group_name:'Гарниры',available_qty:8,freezer_balance:0},
 {dish_name:'Компот',group_name:'Напитки',available_qty:12,freezer_balance:0},
 {dish_name:'Хлеб порционный',group_name:'Хлеб',available_qty:20,freezer_balance:0},
 {dish_name:'Соус',group_name:'Дополнительный ассортимент',available_qty:14,freezer_balance:0},
 {dish_name:'Пирожок с капустой',group_name:'Выпечка',available_qty:7,freezer_balance:0}
];
const state={token:'',point:'',points:[],home:{pointName:'Тестовая точка',businessDate:'демо'},items:[],screen:'home',collapsed:new Set(),search:'',demo:false};
const app=document.getElementById('app');
const clean=n=>(n||'').replace(/^\[[^\]]+\]\s*/,'').trim();
const group=x=>(x.group_name||'').trim()||'Прочее';
async function rpc(name,body){const r=await fetch(`${API_URL}/${name}`,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||'Ошибка загрузки');return d}
function grouped(rows){const m=new Map();for(const x of rows){const g=group(x);if(!m.has(g))m.set(g,[]);m.get(g).push(x)}return [...m.entries()].sort(([a],[b])=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'ru')}).map(([title,items])=>({title,items:items.sort((a,b)=>clean(a.dish_name).localeCompare(clean(b.dish_name),'ru'))}))}
function header(){return `<header><div class="brand"><b>Столовая</b><small>${state.home?.pointName||''}${state.home?.businessDate?' · '+state.home.businessDate:''}</small></div>${!state.demo&&state.points.length>1?`<select id="point">${state.points.map(p=>`<option value="${p.point_code}" ${p.point_code===state.point?'selected':''}>${p.point_name}</option>`).join('')}</select>`:''}</header>`}
function groupHtml(g,closing=false){const closed=state.collapsed.has(g.title)&&!state.search;return `<section class="collapsible-group"><button class="group-toggle" data-group="${encodeURIComponent(g.title)}"><span><b>${g.title}</b><small>${g.items.length}</small></span><i>${closed?'＋':'−'}</i></button>${closed?'':`<div class="cards">${g.items.map(x=>closing?closingCard(x):inventoryCard(x)).join('')}</div>`}</section>`}
function inventoryCard(x){return `<article class="item-card"><h3>${clean(x.dish_name)}</h3><div class="meta">Доступно сегодня: <b>${Number(x.available_qty||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}</b>${Number(x.freezer_balance||0)>0?` · Морозилка: <b>${Number(x.freezer_balance).toLocaleString('ru-RU')}</b>`:''}</div></article>`}
function closingCard(x){return `<article class="item-card"><h3>${clean(x.dish_name)}</h3><div class="meta">Доступно сегодня: <b>${Number(x.available_qty||0).toLocaleString('ru-RU',{maximumFractionDigits:3})}</b></div><div class="fields"><label>Останется<input disabled placeholder="—"></label><label>Утиль<input disabled placeholder="—"></label><label>Заморозка<input disabled placeholder="—"></label></div></article>`}
function render(){if(state.screen==='home'){app.innerHTML=header()+`<div class="home-actions"><button data-screen="inventory">Посмотреть остатки</button><button data-screen="closing">Сдать остатки</button></div><div class="message">${state.demo?'Демо-режим без входа: можно проверить группы, порядок и сворачивание.':'Тестовая публикация: проверяем группировку и сворачивание разделов.'}</div>`}else{const rows=state.items.filter(x=>clean(x.dish_name).toLowerCase().includes(state.search.toLowerCase()));app.innerHTML=header()+`<div class="screen-title"><button class="back">←</button><h1>${state.screen==='inventory'?'Посмотреть остатки':'Сдать остатки'}</h1></div><input id="search" class="search" placeholder="Поиск блюда" value="${state.search.replace(/"/g,'&quot;')}"><div class="group-list">${grouped(rows).map(g=>groupHtml(g,state.screen==='closing')).join('')}</div>${state.screen==='closing'?'<div class="message">На тестовой ссылке поля отключены, чтобы ничего не изменить в рабочих остатках.</div>':''}`}
 document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>{state.screen=b.dataset.screen;state.search='';render()});
 document.querySelector('.back')?.addEventListener('click',()=>{state.screen='home';state.search='';render()});
 document.querySelectorAll('.group-toggle').forEach(b=>b.onclick=()=>{const g=decodeURIComponent(b.dataset.group);state.collapsed.has(g)?state.collapsed.delete(g):state.collapsed.add(g);render()});
 const s=document.getElementById('search');if(s)s.oninput=e=>{state.search=e.target.value;render()};
 const p=document.getElementById('point');if(p)p.onchange=async e=>{state.point=e.target.value;await load();render()};
}
async function load(){state.home=await rpc('public_home',{p_token:state.token,p_point_code:state.point});state.items=await rpc('public_daily_items_v2',{p_token:state.token,p_point_code:state.point})}
(async()=>{const q=new URLSearchParams(location.search);state.token=q.get('token')||'';if(!state.token){state.demo=true;state.items=demoItems;render();return}try{state.points=await rpc('public_point_options',{p_token:state.token});if(!state.points.length)throw new Error('Точки не найдены');state.point=q.get('point')||state.points[0].point_code;if(!state.points.some(p=>p.point_code===state.point))state.point=state.points[0].point_code;await load();render()}catch(e){state.demo=true;state.home={pointName:'Тестовая точка',businessDate:'демо'};state.items=demoItems;render()}})();
