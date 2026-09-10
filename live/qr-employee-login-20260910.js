(()=>{
const qr=new URLSearchParams(location.search).get('qr');
if(!qr)return;
const API_URL='https://rgluzdxikpagugpmusbp.supabase.co/rest/v1/rpc';
const API_KEY='sb_publishable_rcvNssgN4_dPnVUpjU0bjQ_1cEWsA52';
const greetings=[
'Хорошей смены! Пусть всё сегодня складывается легко 🌷',
'Доброе утро! Пусть день будет спокойным и удачным ☀️',
'Рады вас видеть! Сегодня всё обязательно получится 😊',
'Вперёд за хорошей сменой — без суеты и с настроением 💚',
'Пусть сегодня гости будут довольны, а остатки сойдутся идеально ✨',
'Хорошего дня! Пусть работа спорится, а время летит быстро 🌸',
'Улыбнулись — и начинаем! Отличной смены 😊',
'Сегодня хороший день, чтобы всё получилось с первого раза 🍀',
'Пусть смена будет лёгкой, а обед — вкусным даже у вас 😄',
'Добро пожаловать! Спокойной работы и приятных людей сегодня 💛',
'Пусть сегодня будет побольше «спасибо» и поменьше «ой» 😄',
'Начинаем день красиво: спокойно, вкусно и без приключений 🌿',
'Отличной смены! Пусть цифры сходятся, а блюда не заканчиваются раньше времени 😉',
'Вы на месте — значит, всё под контролем 💪 Хорошего дня!',
'Пусть сегодня всё идёт как по маслу. Но масло тоже считаем 😄',
'Хорошей смены! Побольше довольных гостей и поменьше утиля 🌼',
'Новый день — новая смена. Пусть она будет одной из самых лёгких ✨',
'Рады встрече! Работайте спокойно — приложение поможет 💚',
'Пусть сегодня ничего не потеряется, не забудется и не закончится внезапно 😄',
'Отличного настроения! Вместе справимся со всеми остатками и перемещениями 🌷'
];
function moscowDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
async function rpc(name,body){const r=await fetch(`${API_URL}/${name}`,{method:'POST',headers:{apikey:API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||'Ошибка связи');return d}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let info=null,busy=false,msg='';
function view(){const root=document.getElementById('app'); if(!root)return; root.innerHTML=`<section class="access-card qr-login"><div class="brand-login">Столовая</div><h1>${info?esc(info.pointName):'Вход по QR'}</h1>${info?`<p>Кто сегодня работает?</p><div class="point-choice-list">${info.employees.map(e=>`<button class="qr-person" data-id="${e.id}" ${busy?'disabled':''}>${esc(e.name)}${e.isAdmin?' · администратор':''}</button>`).join('')}</div><p style="margin-top:18px;color:#777;font-size:13px">Без выбора ФИО войти в приложение нельзя.</p>`:'<p>Загружаем сотрудников точки…</p>'}${msg?`<p class="error-text">${esc(msg)}</p>`:''}</section>`; document.querySelectorAll('.qr-person').forEach(b=>b.onclick=()=>login(b.dataset.id));}
async function login(id){busy=true;msg='';view();try{const r=await rpc('public_qr_employee_login',{p_qr_token:qr,p_employee_id:id});localStorage.setItem('stolovaya:web-token',r.buffetToken);localStorage.setItem('stolovaya:employee-name',r.employeeName);localStorage.setItem('stolovaya:employee-session',r.sessionToken);localStorage.setItem('stolovaya:qr-point',r.pointCode);localStorage.setItem('stolovaya:employee-role',r.role);localStorage.setItem('stolovaya:qr-token',qr);localStorage.setItem('stolovaya:employee-auth-date',moscowDay());sessionStorage.setItem('stolovaya:greeting',greetings[Math.floor(Math.random()*greetings.length)]);location.replace(`./?point=${encodeURIComponent(r.pointCode)}&employee=1&role=${encodeURIComponent(r.role)}&fresh=${Date.now()}`)}catch(e){msg=e.message;busy=false;view()}}
(async()=>{try{info=await rpc('public_qr_employee_options',{p_qr_token:qr});view()}catch(e){msg=e.message;view()}})();
})();