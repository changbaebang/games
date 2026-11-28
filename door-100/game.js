/* 100개의 문 — 장난꾸러기 호텔의 문을 하나씩 열어 100번 문까지 탈출해요. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2,T=D.tile;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const SAVE='door100.save';
let Wd=0,Ht=0,DPR=1;const dark=document.createElement('canvas'),dctx=dark.getContext('2d');
function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;dark.width=Math.ceil(Wd/2);dark.height=Math.ceil(Ht/2)}addEventListener('resize',fit);fit();
const save=Object.assign({best:0,check:1,gold:0,items:{},hp:D.hp,runs:0,wins:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

// ---------- 방 만들기
let runSeed=1;function rng(i,k){let s=(runSeed*9301+i*49297+k*233280)%2147483647;s=s*16807%2147483647;return s/2147483647}
const rooms=[];
function roomType(n){for(const S of D.seek)if(n>=S.start&&n<S.start+S.len)return n===S.start?'seek0':'seek';for(const S of D.seek)if(n>=S.start-3&&n<S.start)return 'seekeyes';
  if(D.figure.includes(n))return n===100?'final':'library';if(n===52)return 'shop';return 'normal'}
function makeRoom(n){const prev=rooms[n-1];const r=(k)=>rng(n,k);const type=roomType(n);let w,h;
  if(type==='library'||type==='final'){w=15;h=12}else if(type==='seek'||type==='seek0'){w=7;h=12}else if(type==='shop'){w=9;h=7}else{w=7+Math.floor(r(1)*6);h=6+Math.floor(r(2)*5)}
  const ev=D.events,on=(k)=>n>=ev[k].from&&r(10+Object.keys(ev).indexOf(k))<ev[k].chance;
  let halt=type==='normal'&&on('halt');if(halt){w=5;h=14}
  const ex=prev?prev.dx:4;const x=clamp(ex-1-Math.floor(r(3)*(w-2)),ex-w+2,ex-1);const y=prev?prev.y-1-h:0;
  const dx=x+1+Math.floor(r(4)*(w-2));
  const R={n,x,y,w,h,ex,dx,type,furn:[],dark:type==='normal'&&!halt&&on('dark'),key:type==='normal'&&!halt&&on('key'),open:false,halt,visited:false,books:[],levers:[]};
  if(R.key)R.locked=true;if(type==='library'||type==='final')R.locked=true;
  if(type==='normal'&&!halt){R.rush=on('rush');R.ambush=!R.rush&&on('ambush');R.eyes=on('eyes');R.screech=R.dark&&on('screech')}
  // 가구
  const occupied=(fx,fy,fw,fh)=>{if(fx<x||fy<y||fx+fw>x+w||fy+fh>y+h)return true;if(fx<=ex&&ex<fx+fw&&fy+fh>=y+h-1)return true;if(fx<=dx&&dx<fx+fw&&fy<=y)return true;return R.furn.some(f=>fx<f.x+f.w+1&&fx+fw+1>f.x&&fy<f.y+f.h+1&&fy+fh+1>f.y)};
  const put=(k,fw,fh,tries=20)=>{for(let t=0;t<tries;t++){const fx=x+Math.floor(r(20+R.furn.length*3+t*7)*(w-fw+1)),fy=y+Math.floor(r(21+R.furn.length*3+t*7)*(h-fh+1));if(!occupied(fx,fy,fw,fh)){const f={k,x:fx,y:fy,w:fw,h:fh};R.furn.push(f);return f}}return null};
  if(type==='normal'&&!halt){const nC=1+Math.floor(r(30)*2),nD=1+Math.floor(r(31)*3);for(let i=0;i<nC;i++)put(r(32+i)<.6?'closet':'bed',r(32+i)<.6?2:2,r(32+i)<.6?1:3);for(let i=0;i<nD;i++)put('drawer',2,1);put('lamp',1,1);if(r(33)<.6)put('plant',1,1);if(r(34)<.5)put('table',2,2)}
  if(type==='seek'||type==='seek0'){for(let i=0;i<3;i++)put('junk',1+Math.floor(r(40+i)*2),1);R.fake=x+1+((dx-x+2+Math.floor(r(45)*(w-4)))%(w-2));if(R.fake===dx)R.fake=dx>x+2?dx-2:dx+2}
  if(type==='library'||type==='final'){for(let i=0;i<7;i++){const f=put('shelf',3,1,40);if(f&&type==='library'&&R.books.length<4&&r(60+i)<.7){f.book=R.books.length;R.books.push(f)}}if(type==='library')while(R.books.length<4){const f=put('shelf',3,1,60);if(!f)break;f.book=R.books.length;R.books.push(f)}
    for(let i=0;i<4;i++)put('closet',2,1);if(type==='final')for(let i=0;i<3;i++){const f=put('lever',1,1,40);if(f)R.levers.push(f)}
    const shapes=['⭐','❤️','🔷','🌙'],digits=[];for(let i=0;i<4;i++)digits.push(1+Math.floor(r(70+i)*9));const order=[0,1,2,3].sort((a,b)=>r(80+a)-r(80+b));R.code={shapes,digits,order}}
  if(type==='shop'){put('counter',3,1)}
  if(R.key){const ds=R.furn.filter(f=>f.k==='drawer');if(ds.length)ds[Math.floor(r(90)*ds.length)].hasKey=true;else R.key=R.locked=false}
  rooms[n]=R;return R}
function room(n){if(n<1||n>100)return null;if(!rooms[n]){for(let i=1;i<=n;i++)if(!rooms[i])makeRoom(i)}return rooms[n]}
// 칸 판정
function roomAt(tx,ty){for(let n=Math.max(1,cur-2);n<=Math.min(100,cur+2);n++){const R=room(n);if(tx>=R.x&&tx<R.x+R.w&&ty>=R.y&&ty<R.y+R.h)return R}return null}
function solidCell(tx,ty){const R=roomAt(tx,ty);if(R){for(const f of R.furn)if(f.k!=='rug'&&tx>=f.x&&tx<f.x+f.w&&ty>=f.y&&ty<f.y+f.h)return true;return false}
  // 문 칸
  for(let n=Math.max(1,cur-2);n<=Math.min(100,cur+1);n++){const R=room(n);if(ty===R.y-1&&tx===R.dx)return !R.open;if(ty===R.y-1&&R.fake&&tx===R.fake)return true;if(n===1&&ty===R.y+R.h&&tx===R.ex)return true}return true}
function blockedAt(px,py){const r=12;for(const [ox,oy] of [[-r,-r],[r,-r],[-r,r],[r,r]])if(solidCell(Math.floor((px+ox)/T),Math.floor((py+oy)/T)))return true;return false}

// ---------- 상태
const P={x:0,y:0,face:-Math.PI/2,walk:0,inv:0,hidden:null,hideT:0,sneak:false,light:true,fast:0,knock:0};
let cur=1,hp=D.hp,gold=0,items={},state='title',paused=false,time=0,ents=[],warnT=0,warnTxt='',flick=0,dim=0,parts=[],pops=[],shake=0,seekE=null,figE=null,screechE=null,codeIn='';
const bag=()=>Object.entries(items).filter(([k,n])=>n>0);
function toast(t){const el=$('toast');const d=document.createElement('div');d.textContent=t;el.appendChild(d);for(let g=0;g<5&&el.children.length>3;g++)el.children[0].remove();later(2.4,()=>d.remove())}
let bq=[],bt=0;function banner(t,s,dur){bq.push([t,s,dur||2.6])}
function updBanner(dt){const el=$('banner');if(bt>0){bt-=dt;if(bt<=0)el.classList.remove('on');return}if(bq.length){const [t,s,d]=bq.shift();el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=t;el.querySelector('small').textContent=s;el.classList.add('on');bt=d}}
const timers=[];function later(t,fn){timers.push({t,fn})}
function warn(t,s){warnTxt=t;warnT=s||2}
function pop(x,y,t,c){pops.push({x,y,t,c:c||'#fff',life:1.1})}

// ---------- 시작과 다시 시작
function startRun(from){timers.length=0;runSeed=Math.floor(Math.random()*1e9);rooms.length=0;cur=from||1;const R=room(cur);for(let i=1;i<cur;i++){rooms[i].open=true;rooms[i].visited=true}
  P.x=(R.ex+.5)*T;P.y=(R.y+R.h-.6)*T;P.face=-Math.PI/2;P.hidden=null;P.inv=1.5;hp=save.hp>0?save.hp:D.hp;gold=save.gold||0;items=Object.assign({lighter:1},save.items||{});
  ents=[];seekE=null;figE=null;screechE=null;flick=0;dim=0;state='play';paused=false;$('titleOv').hidden=true;$('panel').hidden=true;enterRoom(R,true);ui();snd('go');banner('🚪 '+cur+'번 문','100번 문까지 탈출해요!')}
function enterRoom(R,first){if(R.visited&&!first)return;R.visited=true;cur=R.n;
  if(D.checkpoints.includes(R.n)&&R.n>save.check){save.check=R.n;save.gold=gold;save.items=items;save.hp=hp;store();toast('✨ '+R.n+'번 방 저장! 여기서 다시 할 수 있어요')}
  if(R.n>save.best){save.best=R.n;store();Arcade.record&&Arcade.record('door100Best',R.n)}
  const nx=room(R.n+1);
  if(R.type==='seekeyes')toast('👀 벽에 눈이 잔뜩… 곧 찾아라 술래가 와요!');
  if(R.type==='seek0'){banner('👁️ 찾아라 술래!','앞으로 쭉 달려요! 파란 빛을 따라가요');seekE={x:(R.ex+.5)*T,y:(R.y+R.h+1.5)*T,room:R.n,start:R.n,speed:165};later(.1,()=>snd('alert'))}
  if(R.type==='library'){banner('📚 50번 도서관','커다란 술래는 못 봐요. 소리를 들어요! 살금살금 책 4권을 찾아 비밀번호를 풀어요',4);figE={x:(R.x+R.w/2)*T,y:(R.y+2)*T,tx:0,ty:0,t:0,room:R.n,hear:0};$('sneakBtn').hidden=false}
  if(R.type==='final'){banner('🏁 100번 방!','살금살금 스위치 3개를 켜고 탈출해요!',3.5);figE={x:(R.x+R.w/2)*T,y:(R.y+2)*T,tx:0,ty:0,t:0,room:R.n,hear:0};$('sneakBtn').hidden=false}
  if(R.type==='shop'){banner('🛎️ 깜짝 상점!','금화로 좋은 물건을 사요')}
  if(R.dark)toast('🌑 어두운 방이에요. 불을 켜요!');
  if(R.halt){banner('💙 멈춰 젤리 복도','"뒤로!"가 나오면 뒤로 걸어요!');ents.push({k:'halt',room:R.n,y:(R.y+1)*T,x:(R.x+R.w/2)*T,phase:'wait',t:2})}
  if(R.eyes){ents.push({k:'eyes',room:R.n,x:(R.x+R.w/2)*T,y:(R.y+R.h/2)*T,t:0});toast('👁️ 눈알이! 쳐다보지 말아요')}
  if(R.rush||R.ambush){later(rand(1.5,4),()=>{if(cur<R.n||state!=='play')return;flick=3.2;warn(R.ambush?'⚡ 불이 깜빡깜빡! 숨어요! (여러 번 와요)':'⚡ 불이 깜빡깜빡! 숨어요!',3.2);snd('alert');later(3.2,()=>spawnRush(R.ambush?rand(2,4)|0:1))})}
  if(R.screech)later(rand(4,9),()=>{if(cur===R.n&&state==='play'&&!P.hidden&&!screechE)spawnScreech()})}
function spawnRush(times){const n=cur;const bottom=room(Math.max(1,n-2));ents.push({k:'rush',x:0,y:(bottom.y+bottom.h+1)*T,top:(room(Math.min(100,n+1)).y-3)*T,dir:-1,times,left:times,speed:780,wait:0,hit:false});snd('boom')}
function spawnScreech(){const a=Math.random()*TAU;screechE={x:P.x+Math.cos(a)*110,y:P.y+Math.sin(a)*110,t:2.6};snd('tick');warn('🤫 "쉿!" 깍꿍이를 눌러서 쳐다봐요!',2.6)}

// ---------- 입력
const keys={};let actQ=false;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k]){if(k===' '||k==='e')actQ=true;if(k==='l')toggleLight();if(k==='escape'||k==='p')openMenu();if(k==='shift')P.sneak=true}keys[k]=true;if(k===' ')e.preventDefault()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='shift')P.sneak=$('sneakBtn').classList.contains('on')});
let joy=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;
  if(screechE){const v=view();const sx=screechE.x-v.x,sy=screechE.y-v.y;if(Math.hypot(e.clientX-sx,e.clientY-sy)<80){shooScreech();return}}
  joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,x:0,y:0}});
addEventListener('pointermove',e=>{if(!joy||e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=50;if(l>M){joy.ox+=dx/l*(l-M);joy.oy+=dy/l*(l-M);dx=dx/l*M;dy=dy/l*M}joy.x=dx/M;joy.y=dy/M});
const jEnd=e=>{if(joy&&e.pointerId===joy.id)joy=null};addEventListener('pointerup',jEnd);addEventListener('pointercancel',jEnd);
$('actBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();actQ=true});
$('sneakBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const b=$('sneakBtn');b.classList.toggle('on');P.sneak=b.classList.contains('on')});
$('lightBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();toggleLight()});
function toggleLight(){if(!items.lighter&&!items.flashlight){toast('불이 없어요');return}P.light=!P.light;snd('tick')}
function shooScreech(){if(!screechE)return;pop(screechE.x,screechE.y-30,'히잉~ 들켰다!','#c8a0ff');screechE=null;warnT=0;snd('pop')}

// ---------- 무엇을 할 수 있나
function target(){const R=room(cur);if(P.hidden)return {k:'unhide',label:'나오기'};
  const ptx=P.x/T,pty=P.y/T;let best=null,bd=1.6;
  for(const f of R.furn){const cx=f.x+f.w/2,cy=f.y+f.h/2;const d=Math.max(0,Math.abs(ptx-cx)-f.w/2)+Math.max(0,Math.abs(pty-cy)-f.h/2);if(d>1.1)continue;
    let k=null,label='';if(f.k==='closet'){k='hide';label='옷장에\n숨기'}else if(f.k==='bed'){k='hide';label='침대 밑\n숨기'}else if(f.k==='drawer'&&!f.open){k='search';label='서랍\n열기'}else if(f.k==='shelf'&&f.book!==undefined&&!f.got){k='book';label='책\n보기'}else if(f.k==='lever'&&!f.on){k='lever';label='스위치\n켜기'}else if(f.k==='counter'){k='shop';label='상점'}
    if(k&&d<bd){bd=d;best={k,f,label}}}
  const dd=Math.hypot(ptx-(R.dx+.5),pty-R.y);if(!R.open&&dd<1.8){if(R.type==='library'||R.type==='final')return {k:'code',label:R.type==='final'?'탈출\n문':'비밀\n번호'};if(R.locked)return {k:'unlock',label:items.key?'열쇠로\n열기':items.lockpick?'따개로\n열기':'잠겼어요'}}
  return best}
function act(){const t=target();if(!t)return;const R=room(cur);
  if(t.k==='unhide'){unhide();return}
  if(t.k==='hide'){const f=t.f;if(f.jack){toast('앗! 잭이 먼저 들어가 있어요 😝');return}if(f.k==='closet'&&Math.random()<.04&&cur>8){f.jack=true;pop((f.x+1)*T,f.y*T,'잭: 메롱~','#ff8ad8');snd('pop');return}
    P.hidden=f;P.hideT=0;P.sx=P.x;P.sy=P.y;P.x=(f.x+f.w/2)*T;P.y=(f.y+f.h/2)*T;snd('thud');return}
  if(t.k==='search'){const f=t.f;f.open=true;snd('pop');let got=null;
    if(f.hasKey){items.key=(items.key||0)+1;got='🔑 열쇠!';banner('🔑 열쇠를 찾았어요!','잠긴 문으로 가요')}else{const r=Math.random();if(r<.55){const g=1+Math.floor(Math.random()*(cur>50?8:5));gold+=g;got='🪙 +'+g}else if(r<.63){items.vitamin=(items.vitamin||0)+1;got='💊 비타민'}else if(r<.7){items.lockpick=(items.lockpick||0)+1;got='🗝️ 따개'}else if(r<.76){items.bandage=(items.bandage||0)+1;got='🩹 반창고'}else if(r<.79&&!items.flashlight){items.flashlight=1;got='🔦 손전등!'}}
    pop((f.x+f.w/2)*T,f.y*T,got||'텅~',got?'#ffd23f':'#ccc');ui();return}
  if(t.k==='book'){const f=t.f;f.got=true;const c=R.code;const i=f.book;pop((f.x+1.5)*T,f.y*T,c.shapes[i]+' = '+c.digits[i],'#ffd23f');snd('level');toast('📖 책 속 그림: '+c.shapes[i]+' 는 '+c.digits[i]);noise(.4);return}
  if(t.k==='lever'){t.f.on=true;snd('power');const left=R.levers.filter(l=>!l.on).length;toast(left?'⚡ 스위치 켜짐! '+left+'개 남았어요':'⚡ 모든 스위치 켜짐! 탈출 문으로!');noise(.6);return}
  if(t.k==='shop'){openShop();return}
  if(t.k==='unlock'){if(items.key){items.key--;openDoor(R);toast('🔑 철컥! 문이 열렸어요')}else if(items.lockpick){items.lockpick--;openDoor(R);toast('🗝️ 딸깍! 문이 열렸어요')}else{toast('🔒 잠겼어요. 서랍에서 열쇠를 찾아요');snd('bad')}ui();return}
  if(t.k==='code'){if(R.type==='final'){if(R.levers.some(l=>!l.on)){toast('⚡ 스위치 '+R.levers.filter(l=>!l.on).length+'개를 더 켜요');return}openDoor(R);win();return}openCode(R)}}
function openDoor(R){R.open=true;R.locked=false;snd('jump')}
function unhide(){const f=P.hidden;P.hidden=null;$('hideBar').hidden=true;const R=room(cur);let best=null,bd=1e9;for(const [ox,oy] of [[0,-1],[0,f.h],[-1,0],[f.w,0],[1,-1],[1,f.h]]){const tx=f.x+ox+(ox===0||ox===1?Math.floor(f.w/2):0),ty=f.y+oy;if(!solidCell(tx,ty)){const d=Math.hypot(tx-P.sx/T,ty-P.sy/T);if(d<bd){bd=d;best=[tx,ty]}}}if(best){P.x=(best[0]+.5)*T;P.y=(best[1]+.5)*T}else{P.x=P.sx;P.y=P.sy}snd('thud')}

// ---------- 패널: 비밀번호, 상점, 메뉴
function panel(title,build,btns){$('pTitle').textContent=title;const b=$('pBody');b.innerHTML='';build(b);const bb=$('pBtns');bb.innerHTML='';for(const [l,fn,soft] of btns){const e=document.createElement('button');e.className='btn'+(soft?' soft':'');e.textContent=l;e.onclick=()=>{snd('click');fn()};bb.appendChild(e)}$('panel').hidden=false;paused=true;joy=null}
const closePanel=()=>{$('panel').hidden=true;paused=false};
function openCode(R){codeIn='';const c=R.code;const got=R.books.filter(f=>f.got).length;
  panel('🔒 비밀번호 자물쇠',b=>{const p=document.createElement('p');p.textContent='자물쇠 그림 순서대로 숫자를 눌러요';b.appendChild(p);const h=document.createElement('div');h.className='hint';for(const i of c.order){const s=document.createElement('span');s.textContent=c.shapes[i];h.appendChild(s)}b.appendChild(h);
    const k=document.createElement('p');k.className='small';k.textContent='찾은 책: '+R.books.filter(f=>f.got).map(f=>c.shapes[f.book]+'='+c.digits[f.book]).join('  ')+(got<4?'  (책 '+(4-got)+'권 더 찾아요)':'');b.appendChild(k);
    const cd=document.createElement('div');cd.className='code';cd.textContent='____';b.appendChild(cd);const pad=document.createElement('div');pad.className='pad';
    for(const n of [1,2,3,4,5,6,7,8,9,'←',0,'✔']){const bt=document.createElement('button');bt.textContent=n;bt.onclick=()=>{snd('tick');if(n==='←')codeIn=codeIn.slice(0,-1);else if(n==='✔'){const want=c.order.map(i=>c.digits[i]).join('');if(codeIn===want){closePanel();openDoor(R);banner('🔓 철컥! 열렸어요','도서관 탈출!');figE=null;$('sneakBtn').hidden=true;snd('win')}else{codeIn='';toast('틀렸어요! 책을 다시 봐요');snd('bad');noise(1)}}else if(codeIn.length<4)codeIn+=n;cd.textContent=(codeIn+'____').slice(0,4)};pad.appendChild(bt)}b.appendChild(pad)},[['닫기',closePanel,1]])}
function openShop(){panel('🛎️ 깜짝 상점',b=>{const p=document.createElement('p');p.textContent='가진 금화 🪙 '+gold;b.appendChild(p);for(const it of D.shop){const r=document.createElement('div');r.className='shop';r.innerHTML='<span style="font-size:26px"></span><div class="nm"><b></b><small></small></div>';r.querySelector('span').textContent=it.icon;r.querySelector('b').textContent=it.name+' · 🪙'+it.price;r.querySelector('small').textContent=it.desc;const bt=document.createElement('button');bt.textContent='사기';bt.disabled=gold<it.price;bt.onclick=()=>{gold-=it.price;items[it.id]=(items[it.id]||0)+1;snd('coin');ui();openShop()};r.appendChild(bt);b.appendChild(r)}},[['나가기',closePanel]])}
function openMenu(){if(state!=='play')return;panel('잠깐 쉬기',b=>{const p=document.createElement('p');p.textContent='지금 '+cur+'번 방 · 최고 '+save.best+'번 · 다시 시작 지점 '+save.check+'번';b.appendChild(p)},[['계속하기',closePanel],['쓰기: 💊 비타민',()=>{useItem('vitamin');closePanel()},1],['쓰기: 🩹 반창고',()=>{useItem('bandage');closePanel()},1],['처음 화면',()=>{closePanel();toTitle()},1]])}
function useItem(k){if(!items[k]){toast('없어요');return}if(k==='vitamin'){items.vitamin--;P.fast=6;toast('💊 쌩쌩!')}if(k==='bandage'){if(hp>=D.hp){toast('하트가 가득해요');return}items.bandage--;hp++;toast('🩹 하트 +1')}ui()}

// ---------- 다치기
function hurt(why,tip){if(P.inv>0||state!=='play')return;hp--;P.inv=1.6;shake=.3;snd('hurt');pop(P.x,P.y-30,'아야!','#ff6a6a');ui();if(hp<=0)die(why,tip);else if(tip)toast(tip)}
let lastWhy='';function die(why,tip){lastWhy=why;state='dead';save.hp=D.hp;store();snd('lose');later(.6,()=>panel('💙 파란 빛이 말해요',b=>{const p=document.createElement('p');p.innerHTML='<b></b><br><span></span>';p.querySelector('b').textContent=why;p.querySelector('span').textContent=tip||'';b.appendChild(p);const q=document.createElement('p');q.className='small';q.textContent='괜찮아요! '+save.check+'번 방부터 다시 할 수 있어요.';b.appendChild(q)},[[save.check+'번 방부터 다시',()=>{closePanel();startRun(save.check)}],['처음 화면',()=>{closePanel();toTitle()},1]]))}
function noise(k){if(figE)figE.hear=Math.max(figE.hear,k)}
function win(){state='won';save.wins++;save.check=1;save.hp=D.hp;save.gold=0;save.items={};store();Arcade.record&&Arcade.record('door100Best',100);snd('win');
  for(let i=0;i<40;i++)parts.push({x:P.x,y:P.y,vx:rand(-200,200),vy:rand(-300,-50),life:1.4,c:['#ffd23f','#ff8ad8','#7ad8ff'][i%3]});
  later(1,()=>panel('🎉 100번 문 탈출!',b=>{const p=document.createElement('p');p.textContent='장난꾸러기 호텔을 모두 빠져나왔어요! 탈출 '+save.wins+'번째!';b.appendChild(p)},[['다시 1번 문부터',()=>{closePanel();startRun(1)}],['처음 화면',()=>{closePanel();toTitle()},1]]))}

// ---------- 갱신
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}updBanner(dt);
  if(paused||state!=='play'){for(const p of pops)p.life-=dt;return}
  const R=room(cur);P.inv=Math.max(0,P.inv-dt);P.fast=Math.max(0,P.fast-dt);warnT=Math.max(0,warnT-dt);flick=Math.max(0,flick-dt);
  if(actQ){actQ=false;act()}
  // 숨기
  if(P.hidden){P.hideT+=dt;$('hideBar').hidden=false;$('hideBar').querySelector('i').style.width=Math.max(0,100-P.hideT/D.hide*100)+'%';if(P.hideT>D.hide){unhide();toast('😮‍💨 숨이 차서 나왔어요!')}}
  else{let mx=0,my=0;if(keys.arrowleft||keys.a)mx--;if(keys.arrowright||keys.d)mx++;if(keys.arrowup||keys.w)my--;if(keys.arrowdown||keys.s)my++;if(joy){mx=joy.x;my=joy.y}const ml=Math.hypot(mx,my);
    if(ml>.15){const sp=D.speed*(P.fast>0?1.6:1)*(P.sneak?.45:1)*Math.min(1,ml);const vx=mx/Math.max(1,ml)*sp*dt,vy=my/Math.max(1,ml)*sp*dt;
      if(!blockedAt(P.x+vx,P.y))P.x+=vx;if(!blockedAt(P.x,P.y+vy))P.y+=vy;P.face=Math.atan2(my,mx);P.walk+=dt*(P.sneak?5:11);if(!P.sneak)noise(.25);
      if(screechE){const a=Math.atan2(screechE.y-P.y,screechE.x-P.x);let d=a-P.face;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)<.5)shooScreech()}}}
  // 문 열기 / 방 넘어가기
  if(!R.open&&!R.locked&&R.type!=='library'&&R.type!=='final'&&Math.hypot(P.x/T-(R.dx+.5),P.y/T-R.y)<1.6&&!(seekE&&false)){openDoor(R)}
  const nr=room(cur+1);if(nr&&P.y/T<nr.y+nr.h&&P.y/T>=nr.y){enterRoom(nr);ui()}
  const pr=room(cur-1);if(pr&&P.y/T>=R.y+R.h+1){cur=pr.n;ui()}
  if(seekE&&P.y/T<room(seekE.start).y-1-0&&cur>=D.seek.find(s=>s.start===seekE.start).start+D.seek.find(s=>s.start===seekE.start).len){seekE=null;banner('😮‍💨 휴~ 따돌렸어요!','찾아라 술래가 사라졌어요');snd('win')}
  // 들어오기
  for(const e of ents)updEnt(e,dt);ents=ents.filter(e=>!e.dead);
  if(seekE){const s=seekE;const dx=P.x-s.x,dy=P.y-s.y,d=Math.hypot(dx,dy);s.x+=dx/d*s.speed*dt;s.y+=dy/d*s.speed*dt;s.speed=Math.min(185,s.speed+dt*2);
    if(d<30){hurt('찾아라 술래에게 잡혔어요','멈추지 말고 쭉 달려요! 파란 빛이 있는 문이 맞는 문이에요.');const S=room(s.start);s.x=(S.ex+.5)*T;s.y=(S.y+S.h+1.5)*T;P.x=(S.ex+.5)*T;P.y=(S.y+S.h-1)*T;s.speed=150;P.hidden=null}
    if(d>900){s.x=P.x;s.y=P.y+500}}
  if(figE)updFigure(dt);
  if(screechE){screechE.t-=dt;if(screechE.t<=0){screechE=null;hurt('깍꿍이가 콩!','어두운 방에서 "쉿!" 소리가 나면 깍꿍이를 눌러서 쳐다봐요.')}}
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt}parts=parts.filter(p=>p.life>0);for(const p of pops){p.life-=dt;p.y-=30*dt}pops=pops.filter(p=>p.life>0);shake=Math.max(0,shake-dt);
  setT($('warn'),warnT>0?warnTxt:'');const t=target();const ab=$('actBtn');ab.textContent=t?t.label:'행동';ab.classList.toggle('off',!t);$('lightBtn').hidden=!(items.lighter||items.flashlight)||!(R.dark||R.type==='library'||R.type==='final');$('lightBtn').classList.toggle('on',P.light)}
function updEnt(e,dt){const R=room(e.room);
  if(e.k==='rush'){if(e.wait>0){e.wait-=dt;return}e.y+=e.dir*e.speed*dt;const R0=room(cur);e.x=P.hidden?(R0.x+R0.w/2)*T:clamp(e.x||(R0.x+R0.w/2)*T,0,1e9);e.x+=((R0.x+R0.w/2)*T-e.x)*.2;
    if(Math.abs(e.y-P.y)<70&&!P.hidden&&!e.hitNow){e.hitNow=true;hurt(e.times>1?'왔다갔다 구름에 부딪혔어요':'후다닥 구름에 부딪혔어요',e.times>1?'왔다갔다 구름은 여러 번 와요. 소리가 완전히 멈출 때까지 숨어 있어요.':'불이 깜빡이면 후다닥 구름이 와요. 옷장이나 침대 밑에 숨어요!');P.inv=Math.max(P.inv,.8)}
    if(Math.abs(e.y-P.y)>200)e.hitNow=false;
    const done=e.dir<0?e.y<e.top:e.y>e.bottomY;if(done){e.left--;if(e.left<=0){e.dead=true;const r=room(cur);r.dark=true;r.screech=r.screech||Math.random()<.3;warn('',0);toast('휴~ 지나갔어요! 이제 나와도 돼요');return}e.dir*=-1;e.wait=rand(1.5,3);e.bottomY=e.bottomY||e.y+1400;if(e.dir>0){e.bottomY=e.y+1400}else{e.top=e.y-1400}warn('⚡ 또 와요! 숨어 있어요!',2)}return}
  if(e.k==='eyes'){if(cur!==e.room){return}const a=Math.atan2(e.y-P.y,e.x-P.x);let d=a-P.face;d=Math.atan2(Math.sin(d),Math.cos(d));const look=Math.abs(d)<.9&&!P.hidden;if(look){e.t+=dt;warn('👁️ 눈알이를 보고 있어요! 다른 쪽을 봐요',.3);if(e.t>1.6){e.t=0;hurt('눈알이를 오래 봤어요','눈알이가 있는 방에서는 다른 쪽을 보며 걸어요.')}}else e.t=Math.max(0,e.t-dt);return}
  if(e.k==='halt'){if(cur!==e.room){if(cur>e.room)e.dead=true;return}e.t-=dt;const top=(R.y+1)*T;
    if(e.phase==='wait'){e.y+=(top-e.y)*dt*2;if(e.t<=0){e.phase='turn';e.t=2.2;e.y=Math.max(top,P.y-260);warn('🔙 뒤로! 뒤로 걸어요!',2.2);snd('alert')}}
    else{e.y+=150*dt;if(e.y>P.y-26&&!P.hidden){hurt('멈춰 젤리에 부딪혔어요','"뒤로!"가 나오면 아래쪽으로 걸어서 피해요.');e.phase='wait';e.t=rand(2.5,4);warn('',0)}if(e.t<=0){e.phase='wait';e.t=rand(2.5,4);warn('⬆️ 이제 앞으로!',1.2)}}e.x=(R.x+R.w/2)*T}}
function updFigure(dt){const f=figE,R=room(f.room);if(cur!==f.room)return;f.hear=Math.max(0,f.hear-dt*.8);const d=Math.hypot(P.x-f.x,P.y-f.y);
  const hears=!P.hidden&&((f.hear>.2&&d<330)||(d<70));
  if(hears){f.tx=P.x;f.ty=P.y;f.alert=1}else if(f.alert>0)f.alert-=dt*.4;
  if(!f.tx||Math.hypot(f.tx-f.x,f.ty-f.y)<10){f.t-=dt;if(f.t<=0){f.t=rand(1,2.5);f.tx=(R.x+1+Math.random()*(R.w-2))*T;f.ty=(R.y+1+Math.random()*(R.h-2))*T}}
  else{const sp=f.alert>.5?120:55;const dx=f.tx-f.x,dy=f.ty-f.y,l=Math.hypot(dx,dy);const nx=f.x+dx/l*sp*dt,ny=f.y+dy/l*sp*dt;if(!blockedAt(nx,f.y))f.x=nx;else f.tx=0;if(!blockedAt(f.x,ny))f.y=ny;else f.tx=0}
  if(d<38&&!P.hidden){hurt('커다란 술래에게 잡혔어요','커다란 술래는 소리를 들어요. 살금살금 버튼을 켜고 천천히 걸어요. 옷장에 숨어도 돼요!');P.x=(R.ex+.5)*T;P.y=(R.y+R.h-.6)*T;f.alert=0;f.tx=0}}

// ---------- 그리기
function view(){const R=room(cur);return {x:P.x-Wd/2,y:P.y-Ht*.55}}
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#2a1a24';ctx.fillRect(0,0,W,H);if(state==='title'&&!rooms.length)return;
  const v=view(),sx=shake>0?rand(-5,5):0;const X=x=>x-v.x+sx,Y=y=>y-v.y;
  const lit=1-(flick>0?(Math.sin(time*40)>0?.5:0):0);
  for(let n=Math.max(1,cur-2);n<=Math.min(100,cur+2);n++){const R=room(n);
    // 벽
    ctx.fillStyle=R.type==='library'||R.type==='final'?'#3a2a4a':'#7a3a4a';ctx.fillRect(X((R.x-1)*T),Y((R.y-1)*T),(R.w+2)*T,(R.h+2)*T);ctx.fillStyle='#5a2a3a';ctx.fillRect(X((R.x-1)*T),Y((R.y-1)*T)+T*.7,(R.w+2)*T,T*.3);
    // 바닥
    for(let ty=R.y;ty<R.y+R.h;ty++)for(let tx=R.x;tx<R.x+R.w;tx++){ctx.fillStyle=(tx+ty)%2?'#c8925a':'#d4a066';if(R.type==='seek'||R.type==='seek0')ctx.fillStyle=(tx+ty)%2?'#9a8aa0':'#a898ae';if(R.type==='library'||R.type==='final')ctx.fillStyle=(tx+ty)%2?'#6a8a6a':'#729272';ctx.fillRect(X(tx*T),Y(ty*T),T+1,T+1)}
    if(R.halt){ctx.fillStyle='rgba(80,200,255,.12)';ctx.fillRect(X(R.x*T),Y(R.y*T),R.w*T,R.h*T)}
    if(R.type==='normal'&&!R.halt){ctx.fillStyle='rgba(160,40,70,.35)';ctx.beginPath();ctx.roundRect(X((R.x+R.w/2-1.5)*T),Y((R.y+R.h/2-1)*T),3*T,2*T,12);ctx.fill()}
    // 문 (위쪽)
    const dxp=X(R.dx*T),dyp=Y((R.y-1)*T);ctx.fillStyle=R.open?'#3a2a1a':R.locked?'#8a6a3a':'#b8864a';ctx.fillRect(dxp+4,dyp+2,T-8,T-2);if(!R.open){ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(dxp+T-14,dyp+T*.55,4,0,TAU);ctx.fill()}
    ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.roundRect(dxp+6,dyp-18,T-12,18,5);ctx.fill();ctx.fillStyle='#5a3a00';ctx.font='14px Jua';ctx.textAlign='center';ctx.fillText(R.n+1>100?'출구':String(R.n+1).padStart(3,'0'),dxp+T/2,dyp-4);
    if(R.locked){ctx.font='18px Jua';ctx.fillText(R.type==='library'?'🔢':'🔒',dxp+T/2,dyp+T*.62)}
    if(R.fake){const fx=X(R.fake*T);ctx.fillStyle='#4a3a4a';ctx.fillRect(fx+4,dyp+2,T-8,T-2);ctx.fillStyle='#ff8ad8';ctx.font='18px Jua';ctx.fillText('✋',fx+T/2,dyp+T*.62)}
    if((R.type==='seek'||R.type==='seek0')&&!R.open||(R.type==='seek'||R.type==='seek0')){for(let i=0;i<5;i++){ctx.fillStyle=`rgba(120,200,255,${.5+.5*Math.sin(time*5+i)})`;ctx.beginPath();ctx.arc(dxp+T/2+Math.sin(time*3+i*1.3)*14,dyp+T+10+i*14,4,0,TAU);ctx.fill()}}
    // 벽의 눈
    if(R.type==='seekeyes'||R.type==='seek'||R.type==='seek0'){for(let i=0;i<R.h;i+=2){for(const side of [-1,R.w]){const ex=X((R.x+side+.5)*T),ey=Y((R.y+i+.5)*T);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,ey,10,7,0,0,TAU);ctx.fill();ctx.fillStyle='#2a2a3a';const a=Math.atan2(P.y-ey-v.y,P.x-ex-v.x);ctx.beginPath();ctx.arc(ex+Math.cos(a)*3,ey+Math.sin(a)*2,3.5,0,TAU);ctx.fill()}}}
    // 가구
    for(const f of R.furn)drawFurn(f,X,Y)}
  // 들어오는 것들
  for(const e of ents){if(e.k==='rush'){drawCloud(X(e.x),Y(e.y),e.times>1?'#7ad8a0':'#8a8aa0')}else if(e.k==='eyes'&&cur===e.room){drawEyes(X(e.x),Y(e.y))}else if(e.k==='halt'&&cur===e.room){drawJelly(X(e.x),Y(e.y),'#5ab8ff')}}
  if(seekE)drawSeek(X(seekE.x),Y(seekE.y));if(figE&&cur===figE.room)drawFigure(X(figE.x),Y(figE.y),figE.alert>.5);
  // 나
  if(!P.hidden&&!(P.inv>0&&Math.floor(time*12)%2))drawMe(X(P.x),Y(P.y));
  if(screechE)drawScreech(X(screechE.x),Y(screechE.y));
  for(const p of parts){ctx.fillStyle=p.c;ctx.fillRect(X(p.x)-3,Y(p.y)-3,6,6)}
  // 어둠
  const R=room(cur);const darkK=(R.dark?.88:R.type==='library'||R.type==='final'?.6:0)+(flick>0?.25:0);
  if(darkK>0&&state!=='title'){const k=.5;dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,dark.width,dark.height);dctx.fillStyle=`rgba(10,6,20,${Math.min(.92,darkK)})`;dctx.fillRect(0,0,dark.width,dark.height);dctx.globalCompositeOperation='destination-out';
    const r=P.light&&(items.flashlight||items.lighter)?(items.flashlight?210:130):55;const g=dctx.createRadialGradient(X(P.x)*k,Y(P.y)*k,0,X(P.x)*k,Y(P.y)*k,r*k);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.75,'rgba(0,0,0,.8)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.beginPath();dctx.arc(X(P.x)*k,Y(P.y)*k,r*k,0,TAU);dctx.fill();
    for(const f of R.furn)if(f.k==='lamp'&&!R.dark){dctx.beginPath();dctx.arc(X((f.x+.5)*T)*k,Y((f.y+.5)*T)*k,90*k,0,TAU);dctx.fill()}
    ctx.drawImage(dark,0,0,W,H);if(screechE)drawScreech(X(screechE.x),Y(screechE.y))}
  for(const p of pops){ctx.globalAlpha=Math.min(1,p.life*2);ctx.font='18px Jua';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(30,10,20,.85)';ctx.strokeText(p.t,X(p.x),Y(p.y));ctx.fillStyle=p.c;ctx.fillText(p.t,X(p.x),Y(p.y))}ctx.globalAlpha=1;
  if(screechE){const a=Math.atan2(screechE.y-P.y,screechE.x-P.x);const ax=W/2+Math.cos(a)*90,ay=Y(P.y)+Math.sin(a)*90;ctx.fillStyle='#c8a0ff';ctx.font='22px Jua';ctx.textAlign='center';ctx.fillText('👆',X(screechE.x),Y(screechE.y)-34)}}
function drawFurn(f,X,Y){const x=X(f.x*T),y=Y(f.y*T),w=f.w*T,h=f.h*T;ctx.save();
  if(f.k==='closet'){ctx.fillStyle='#8a5a3a';ctx.fillRect(x+3,y+2,w-6,h-4);ctx.fillStyle='#a06a42';ctx.fillRect(x+6,y+5,w/2-8,h-10);ctx.fillRect(x+w/2+2,y+5,w/2-8,h-10);ctx.fillStyle='#ffd23f';ctx.fillRect(x+w/2-6,y+h/2-3,3,6);ctx.fillRect(x+w/2+3,y+h/2-3,3,6);if(P.hidden===f){ctx.fillStyle='#fff';ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('👀',x+w/2,y+h/2+5)}if(f.jack){ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('😝',x+w/2,y+h/2+5)}}
  else if(f.k==='bed'){ctx.fillStyle='#7a4a3a';ctx.fillRect(x+3,y+3,w-6,h-6);ctx.fillStyle='#ffe0ec';ctx.fillRect(x+7,y+7,w-14,h-14);ctx.fillStyle='#fff';ctx.fillRect(x+10,y+10,w-20,T*.5);ctx.fillStyle='#ff9ac8';ctx.fillRect(x+7,y+T*1.1,w-14,h-T*1.1-7);if(P.hidden===f){ctx.fillStyle='#fff';ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('👀',x+w/2,y+h-8)}}
  else if(f.k==='drawer'){ctx.fillStyle='#a8784a';ctx.fillRect(x+3,y+6,w-6,h-10);ctx.fillStyle=f.open?'#5a3a1a':'#c8945a';ctx.fillRect(x+8,y+10,w-16,h-20);ctx.fillStyle='#ffd23f';ctx.fillRect(x+w/2-6,y+h/2-2,12,4);if(!f.open&&Math.sin(time*3+f.x)>.7){ctx.fillStyle='#fff6a0';ctx.fillRect(x+w-12,y+6,4,4)}}
  else if(f.k==='lamp'){ctx.fillStyle='rgba(255,220,120,.25)';ctx.beginPath();ctx.arc(x+w/2,y+h/2,40,0,TAU);ctx.fill();ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(x+w/2,y+h/2,12,0,TAU);ctx.fill();ctx.fillStyle='#c89a4a';ctx.fillRect(x+w/2-3,y+h/2+8,6,10)}
  else if(f.k==='plant'){ctx.fillStyle='#c86a3a';ctx.fillRect(x+12,y+24,w-24,h-28);ctx.fillStyle='#4ab05a';ctx.beginPath();ctx.arc(x+w/2,y+18,14,0,TAU);ctx.fill()}
  else if(f.k==='table'){ctx.fillStyle='#9a6a3a';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2-6,h/2-6,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+w/2,y+h/2,8,0,TAU);ctx.fill()}
  else if(f.k==='junk'){ctx.fillStyle='#6a5a6a';ctx.fillRect(x+4,y+6,w-8,h-12);ctx.fillStyle='#8a7a8a';ctx.fillRect(x+8,y+10,w-16,6)}
  else if(f.k==='shelf'){ctx.fillStyle='#6a4a2a';ctx.fillRect(x+2,y+4,w-4,h-8);const cols=['#ff6a6a','#6aa8ff','#ffd23f','#7ad86a','#c88aff'];for(let i=0;i<9;i++){ctx.fillStyle=cols[(i+f.x)%5];ctx.fillRect(x+6+i*15,y+8,11,h-16)}if(f.book!==undefined&&!f.got){ctx.fillStyle=`rgba(255,240,150,${.5+.5*Math.sin(time*4)})`;ctx.fillRect(x+w/2-8,y+4,16,h-8)}}
  else if(f.k==='lever'){ctx.fillStyle='#5a5a6a';ctx.fillRect(x+8,y+8,w-16,h-16);ctx.fillStyle=f.on?'#7ad86a':'#ff6a6a';ctx.beginPath();ctx.arc(x+w/2,y+h/2,8,0,TAU);ctx.fill()}
  else if(f.k==='counter'){ctx.fillStyle='#c8945a';ctx.fillRect(x,y+6,w,h-8);ctx.font='26px Jua';ctx.textAlign='center';ctx.fillText('🐱',x+w/2,y-4);ctx.font='13px Jua';ctx.fillStyle='#fff';ctx.fillText('상점 고양이',x+w/2,y+h+12)}
  ctx.restore()}
function drawMe(x,y){const w=Math.sin(P.walk)*3;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+14,13,5,0,0,TAU);ctx.fill();ctx.fillStyle='#3a5aa0';ctx.fillRect(x-8,y+2+w*.4,6,12);ctx.fillRect(x+2,y+2-w*.4,6,12);ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.roundRect(x-11,y-10,22,18,6);ctx.fill();ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(x,y-20,12,0,TAU);ctx.fill();ctx.fillStyle='#6a3a2a';ctx.beginPath();ctx.arc(x,y-24,12,Math.PI,0);ctx.fill();
  const ex=Math.cos(P.face)*3,ey=Math.sin(P.face)*2;ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(x-4+ex,y-19+ey,2,0,TAU);ctx.arc(x+4+ex,y-19+ey,2,0,TAU);ctx.fill();
  if(P.light&&(items.flashlight||items.lighter)&&room(cur).dark){ctx.fillStyle='#ffb020';ctx.beginPath();ctx.arc(x+Math.cos(P.face)*14,y-6+Math.sin(P.face)*8,4,0,TAU);ctx.fill()}
  if(P.sneak){ctx.fillStyle='#c8a0ff';ctx.font='12px Jua';ctx.textAlign='center';ctx.fillText('살금',x,y-38)}}
function drawCloud(x,y,c){ctx.save();ctx.translate(x,y);ctx.fillStyle=c;for(const [a,b,r] of [[-40,0,30],[0,-12,38],[40,0,30],[-20,18,26],[22,18,26]]){ctx.beginPath();ctx.arc(a,b,r,0,TAU);ctx.fill()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-14,-6,9,0,TAU);ctx.arc(14,-6,9,0,TAU);ctx.fill();ctx.fillStyle='#2a2a3a';ctx.beginPath();ctx.arc(-14,-4,4,0,TAU);ctx.arc(14,-4,4,0,TAU);ctx.fill();ctx.strokeStyle='#2a2a3a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-22,-18);ctx.lineTo(-8,-14);ctx.moveTo(22,-18);ctx.lineTo(8,-14);ctx.stroke();ctx.fillStyle='#ff8ab0';ctx.beginPath();ctx.ellipse(0,14,12,8,0,0,TAU);ctx.fill();ctx.fillStyle='#ffd23f';ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('⚡',-48,-30);ctx.fillText('⚡',48,-30);ctx.restore()}
function drawEyes(x,y){for(let i=0;i<5;i++){const a=i/5*TAU+time*.6,ex=x+Math.cos(a)*22,ey=y+Math.sin(a)*14;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex,ey,11,0,TAU);ctx.fill();ctx.fillStyle='#8a4ad8';ctx.beginPath();ctx.arc(ex+Math.cos(Math.atan2(P.y-ey,P.x-ex))*0+(P.x>x?3:-3),ey,5,0,TAU);ctx.fill()}ctx.fillStyle='rgba(180,120,255,.25)';ctx.beginPath();ctx.arc(x,y,48+Math.sin(time*4)*4,0,TAU);ctx.fill()}
function drawJelly(x,y,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,24,20+Math.sin(time*6)*2,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-8,y-4,6,0,TAU);ctx.arc(x+8,y-4,6,0,TAU);ctx.fill();ctx.fillStyle='#1a3a6a';ctx.beginPath();ctx.arc(x-8,y-3,3,0,TAU);ctx.arc(x+8,y-3,3,0,TAU);ctx.fill()}
function drawSeek(x,y){ctx.fillStyle='#2a2a3a';ctx.beginPath();ctx.ellipse(x,y,26,30+Math.sin(time*8)*3,0,0,TAU);ctx.fill();for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x-18+i*12,y+26,7,0,TAU);ctx.fill()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y-6,13,0,TAU);ctx.fill();ctx.fillStyle='#4a2a8a';ctx.beginPath();ctx.arc(x+(P.x-x)/40,y-6+(P.y-y)/60,6,0,TAU);ctx.fill();ctx.fillStyle='#ffb0c8';ctx.beginPath();ctx.arc(x-14,y+8,4,0,TAU);ctx.arc(x+14,y+8,4,0,TAU);ctx.fill()}
function drawFigure(x,y,alert){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+26,34,10,0,0,TAU);ctx.fill();ctx.fillStyle='#d86a5a';ctx.beginPath();ctx.ellipse(x,y,30,34,0,0,TAU);ctx.fill();ctx.fillStyle='#ffd8a0';ctx.beginPath();ctx.ellipse(x-30,y-14,12,16,0,0,TAU);ctx.ellipse(x+30,y-14,12,16,0,0,TAU);ctx.fill();ctx.fillStyle='#ffb0a0';ctx.beginPath();ctx.ellipse(x-30,y-14,6,9,0,0,TAU);ctx.ellipse(x+30,y-14,6,9,0,0,TAU);ctx.fill();
  ctx.strokeStyle='#5a2a2a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-14,y-8);ctx.lineTo(x-4,y-8);ctx.moveTo(x+4,y-8);ctx.lineTo(x+14,y-8);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y+10,12,6,0,0,Math.PI);ctx.fill();if(alert){ctx.fillStyle='#ff4a4a';ctx.font='22px Jua';ctx.textAlign='center';ctx.fillText('?!',x,y-42)}}
function drawScreech(x,y){const b=Math.sin(time*10)*2;ctx.fillStyle='#b07aff';ctx.beginPath();ctx.arc(x,y+b,16,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-6,y-3+b,5,0,TAU);ctx.arc(x+6,y-3+b,5,0,TAU);ctx.fill();ctx.fillStyle='#2a1a4a';ctx.beginPath();ctx.arc(x-6,y-2+b,2.5,0,TAU);ctx.arc(x+6,y-2+b,2.5,0,TAU);ctx.fill();ctx.fillStyle='#ff6aa0';ctx.beginPath();ctx.ellipse(x,y+7+b,5,3,0,0,TAU);ctx.fill()}

// ---------- 화면
function ui(){setT($('roomTxt'),cur+'번 방');setT($('hearts'),'♥'.repeat(Math.max(0,hp))+'♡'.repeat(Math.max(0,D.hp-hp)));setT($('goldTxt'),gold);const ic={key:'🔑',lighter:'🔥',flashlight:'🔦',vitamin:'💊',lockpick:'🗝️',bandage:'🩹'};setT($('itemsBox'),bag().map(([k,n])=>ic[k]+(n>1?n:'')).join(' '))}
function toTitle(){state='title';paused=false;$('titleOv').hidden=false;$('sneakBtn').hidden=true;$('hideBar').hidden=true;const has=save.check>1;$('contBtn').hidden=!has;if(has)$('contBtn').textContent=save.check+'번 방부터 이어 하기';setT($('tRec'),save.best?'가장 멀리 간 방 '+save.best+'번'+(save.wins?' · 탈출 '+save.wins+'번':''):'')}
$('newBtn').onclick=()=>{snd('click');save.check=1;save.gold=0;save.items={};save.hp=D.hp;store();startRun(1)};$('contBtn').onclick=()=>{snd('click');startRun(save.check)};$('menuBtn').onclick=()=>{snd('click');openMenu()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'&&!paused)openMenu()});
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw()}
toTitle();requestAnimationFrame(frame);
window.__d1={startRun,P,get cur(){return cur},room,target,act:()=>{actQ=true},keys,get hp(){return hp},get state(){return state},get ents(){return ents},get seekE(){return seekE},get figE(){return figE},shooScreech,get screechE(){return screechE},get items(){return items},closePanel,get gold(){return gold},solidCell,get timers(){return timers},openDoor,get warnT(){return warnT},get flick(){return flick},get paused(){return paused},save,get why(){return lastWhy}};
});
