/* 숲속 99밤 — 모닥불을 지키며 99번의 밤을 버티는 귀여운 생존 게임. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const SAVE='forest99.save',WS=D.world.size,C0={x:WS/2,y:WS/2},IT=D.items,FL=D.fire.levels;
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;dark.width=Math.ceil(Wd/2);dark.height=Math.ceil(Ht/2)}
const dark=document.createElement('canvas'),dctx=dark.getContext('2d');addEventListener('resize',fit);fit();

// ---------- 숲 만들기 (늘 같은 숲)
let seed=D.world.seed;const sr=()=>(seed=seed*16807%2147483647)/2147483647;
const trees=[],bushes=[],scraps=[],rocks=[],chests=[],caves=[];
const far=(x,y,r)=>Math.hypot(x-C0.x,y-C0.y)>r;
const free=(x,y,r)=>!trees.some(t=>Math.abs(t.x-x)<r&&Math.abs(t.y-y)<r);
for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2+(sr()-.5)*.5,d=i<2?1150:1550;caves.push({x:C0.x+Math.cos(a)*d,y:C0.y+Math.sin(a)*d,i})}
for(let i=0;i<D.world.trees;i++){const x=80+sr()*(WS-160),y=80+sr()*(WS-160);if(!far(x,y,330)||caves.some(c=>Math.hypot(c.x-x,c.y-y)<150))continue;if(!free(x,y,46))continue;trees.push({x,y,hp:4,s:.85+sr()*.4,down:0,id:trees.length})}
for(let i=0;i<D.world.bushes;i++){const x=80+sr()*(WS-160),y=80+sr()*(WS-160);if(!far(x,y,280))continue;bushes.push({x,y,berry:3,t:0,carrot:sr()<.35})}
for(let i=0;i<D.world.scrap;i++){const x=80+sr()*(WS-160),y=80+sr()*(WS-160);if(!far(x,y,350))continue;scraps.push({x,y,n:2,k:sr()<.25?'coal':'scrap',t:0})}
for(let i=0;i<D.world.chests;i++){const a=sr()*TAU,d=380+sr()*1700;const x=clamp(C0.x+Math.cos(a)*d,80,WS-80),y=clamp(C0.y+Math.sin(a)*d,80,WS-80);chests.push({x,y,open:false,id:i,tier:d>1300?2:d>800?1:0})}
const CAMP={fire:{x:C0.x,y:C0.y},bench:{x:C0.x+120,y:C0.y-40},store:{x:C0.x+120,y:C0.y+50},bed:{x:C0.x-110,y:C0.y+70},trader:{x:C0.x-150,y:C0.y-80},farm:{x:C0.x-40,y:C0.y+150}};

// ---------- 저장 상태
function fresh(){return {night:1,day:true,t:0,fuel:90,fuelPts:0,bench:0,crafted:{},tools:{},store:{},bag:[],hp:D.player.hp,hunger:100,px:C0.x+60,py:C0.y+60,chests:{},kids:[],found:{},ms:{},cubFollow:null,seenOwl:false,tut:0,farmT:0}}
let S=fresh();const load=()=>{try{const o=JSON.parse(localStorage.getItem(SAVE));return o&&o.night?o:null}catch(_){return null}};
const store=()=>{if(!started)return;S.px=P.x;S.py=P.y;try{localStorage.setItem(SAVE,JSON.stringify(S))}catch(_){}};
addEventListener('pagehide',()=>store());document.addEventListener('visibilitychange',()=>{if(document.hidden){store();if(started&&!paused)openMenu()}});

// ---------- 상태
const P={x:0,y:0,face:0,walk:0,inv:0,act:0,stun:0,flash:false,bat:100,cook:0,hungerT:0};
let started=false,paused=false,time=0,animals=[],drops=[],parts=[],pops=[],shake=0,toasts=[];
const fireLv=()=>{let l=0;for(let i=0;i<FL.length;i++)if(S.fuelPts>=FL[i].need)l=i;return l};
const lightR=()=>{const L=FL[fireLv()];const k=S.fuel>0?.55+.45*clamp(S.fuel/40,0,1):0;return L.light*k};
const exploreR=()=>FL[fireLv()].explore;
const bagMax=()=>S.tools.bigsack?12:S.tools.goodsack?8:D.player.bag;
const maxHp=()=>D.player.hp+(S.tools.armor?2:0);
const nightK=()=>{if(S.day){const left=D.day-S.t;return left<8?(8-left)/8*.6:0}const left=D.night-S.t;return left<6?Math.max(.15,left/6):1};

// ---------- 알림
function toast(t){const el=$('toast');const d=document.createElement('div');d.textContent=t;el.appendChild(d);for(let g=0;g<5&&el.children.length>3;g++)el.children[0].remove();setTimeout0(()=>d.remove(),2.4)}
let bq=[],bt=0;function banner(t,s){bq.push([t,s])}
function updBanner(dt){const el=$('banner');if(bt>0){bt-=dt;if(bt<=0)el.classList.remove('on');return}if(bq.length){const [t,s]=bq.shift();el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=t;el.querySelector('small').textContent=s;el.classList.add('on');bt=2.6}}
const timers=[];function setTimeout0(fn,t){timers.push({fn,t})}
function pop(x,y,t,c){pops.push({x,y,t,c:c||'#fff',life:1.1})}

// ---------- 가방
function bagAdd(k,n=1){let added=0;for(let i=0;i<n;i++){if(S.bag.length>=bagMax())break;S.bag.push(k);added++}bagUI();return added}
function bagCount(k){return S.bag.filter(x=>x===k).length}
function bagTake(k,n){for(let i=0;i<n;i++){const j=S.bag.indexOf(k);if(j<0)return false;S.bag.splice(j,1)}bagUI();return true}
const have=k=>bagCount(k)+(S.store[k]||0);
function spend(cost){for(const k in cost)if(have(k)<cost[k])return false;for(const k in cost){let n=cost[k];const fromBag=Math.min(n,bagCount(k));bagTake(k,fromBag);n-=fromBag;if(n)S.store[k]-=n}return true}
function bagUI(){const el=$('bag');el.innerHTML='';const m=bagMax();for(let i=0;i<m;i++){const b=document.createElement('button');const k=S.bag[i];if(k){b.textContent=IT[k].icon;const s=document.createElement('small');s.textContent=i+1;b.appendChild(s);b.onclick=()=>useItem(i)}else b.className='empty';el.appendChild(b)}}
function useItem(i){const k=S.bag[i];if(!k)return;const it=IT[k];
  if(it.food){S.hunger=Math.min(100,S.hunger+it.food);S.bag.splice(i,1);snd('coin');pop(P.x,P.y-40,'냠냠 +'+it.food,'#ffb020');bagUI();return}
  if(it.heal){if(S.hp>=maxHp()){toast('하트가 가득해요');return}S.hp=Math.min(maxHp(),S.hp+it.heal);S.bag.splice(i,1);snd('power');pop(P.x,P.y-40,'❤️ +'+it.heal,'#ff6a8a');bagUI();return}
  // 내려놓기
  S.bag.splice(i,1);drops.push({k,x:P.x+Math.cos(P.face)*30,y:P.y+Math.sin(P.face)*30,t:1});bagUI();toast(it.name+'을(를) 내려놓았어요')}

// ---------- 입력
const keys={};let actHeld=false;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k]){if(k===' '||k==='e')actHeld=true;if(k==='f')toggleFlash();if(k==='escape'||k==='p')started&&openMenu();const n=parseInt(k);if(n>=1&&n<=9)useItem(n-1)}keys[k]=true;if(k===' ')e.preventDefault()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k===' '||k==='e')actHeld=false});
let joy=null;cv.addEventListener('pointerdown',e=>{if(!started||paused)return;joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,x:0,y:0}});
addEventListener('pointermove',e=>{if(!joy||e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=50;if(l>M){joy.ox+=dx/l*(l-M);joy.oy+=dy/l*(l-M);dx=dx/l*M;dy=dy/l*M}joy.x=dx/M;joy.y=dy/M});
const jEnd=e=>{if(joy&&e.pointerId===joy.id)joy=null};addEventListener('pointerup',jEnd);addEventListener('pointercancel',jEnd);
const ab=$('actBtn');ab.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();actHeld=true;P.act=0});for(const ev of ['pointerup','pointercancel','pointerleave'])ab.addEventListener(ev,()=>actHeld=false);
$('flashBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();toggleFlash()});
function toggleFlash(){if(!S.tools.flash&&!S.tools.strongflash){toast('손전등이 없어요. 털 상인에게 토끼 발로 바꿔요');return}if(P.bat<=0&&!P.flash){toast('배터리가 없어요. 모닥불 곁에서 충전돼요');return}P.flash=!P.flash;snd('tick')}

// ---------- 무엇을 할 수 있나 (가까운 것 찾기)
function target(){const near=(o,r)=>Math.hypot(o.x-P.x,o.y-P.y)<r;
  const fuelIn=S.bag.some(k=>D.fuel[k]);
  if(near(CAMP.fire,95)){if(fuelIn)return {k:'fuel',label:'모닥불에\n넣기',o:CAMP.fire};if(bagCount('meat'))return {k:'cook',label:'고기\n굽기',o:CAMP.fire}}
  if(near(CAMP.bench,70))return {k:'bench',label:'작업대',o:CAMP.bench};
  if(near(CAMP.store,65))return {k:'store',label:S.bag.some(k=>!D.fuel[k]&&!IT[k].food&&!IT[k].heal)?'창고에\n넣기':'창고\n보기',o:CAMP.store};
  if(S.crafted.bed&&near(CAMP.bed,60)&&!S.day)return {k:'sleep',label:'자기\n(아침까지)',o:CAMP.bed};
  if(S.day&&near(CAMP.trader,70))return {k:'trade',label:'털 상인',o:CAMP.trader};
  let best=null,bd=1e9;const cand=(o,r,k,label)=>{const d=Math.hypot(o.x-P.x,o.y-P.y);if(d<r&&d<bd){bd=d;best={k,label,o}}};
  for(const a of animals)if(!a.dead&&a.kind!=='deer'&&a.kind!=='owl')cand(a,62,'hit','때리기');
  for(const t of trees)if(!t.down)cand(t,62,'chop','나무\n베기');
  for(const b of bushes)if(b.berry>0)cand(b,52,'berry',b.carrot?'당근\n뽑기':'산딸기\n따기');
  for(const s of scraps)if(s.n>0)cand(s,52,'scrap',s.k==='coal'?'석탄\n줍기':'고물\n줍기');
  for(const c of chests)if(!S.chests[c.id])cand(c,58,'chest','상자\n열기');
  if(S.crafted.farm&&S.farm>0)cand(CAMP.farm,60,'farm','딸기\n따기');
  return best}

// ---------- 행동
function act(){const T=target();if(!T){P.act=.25;return}
  const k=T.k,o=T.o;P.face=Math.atan2(o.y-P.y,o.x-P.x);
  if(k==='fuel'){let pts=0;for(let i=S.bag.length-1;i>=0;i--){const f=D.fuel[S.bag[i]];if(f){S.fuel=Math.min(D.fire.max,S.fuel+f.time);pts+=f.points;S.bag.splice(i,1)}}const before=fireLv();S.fuelPts+=pts;bagUI();snd('power');pop(o.x,o.y-50,'🔥 +'+pts,'#ffb020');for(let i=0;i<12;i++)parts.push({x:o.x,y:o.y,vx:rand(-60,60),vy:rand(-160,-60),life:.8,c:'#ffb020'});
    if(fireLv()>before){banner('🔥 모닥불 '+(fireLv()+1)+'단계!','숲이 더 넓게 열렸어요');snd('level');shake=.2}if(S.tut===1)S.tut=2;P.act=.3;return}
  if(k==='cook'){P.cook+=.34*(S.crafted.cooker?2:1);pop(o.x,o.y-50,'지글지글…','#fff');if(P.cook>=1){P.cook=0;const n=bagCount('meat');bagTake('meat',n);bagAdd('steak',n);snd('coin');toast('🍖 고기가 맛있게 익었어요!')}P.act=.35;return}
  if(k==='bench'){openBench();return}
  if(k==='store'){let n=0;for(let i=S.bag.length-1;i>=0;i--){const x=S.bag[i];if(!D.fuel[x]&&!IT[x].food&&!IT[x].heal){S.store[x]=(S.store[x]||0)+1;S.bag.splice(i,1);n++}}bagUI();if(n){snd('coin');toast('창고에 '+n+'개 넣었어요')}else openStore();P.act=.3;return}
  if(k==='sleep'){sleep();return}
  if(k==='trade'){openTrader();return}
  if(k==='hit'){hitAnimal(o);P.act=.35;return}
  if(k==='chop'){o.hp-=S.tools.goodaxe?2:1;o.shake=.2;snd('thud');for(let i=0;i<5;i++)parts.push({x:o.x,y:o.y-20,vx:rand(-80,80),vy:rand(-120,-30),life:.5,c:'#8a5a2a'});
    if(o.hp<=0){o.down=1;o.regrow=240;const n=2;for(let i=0;i<n;i++)drops.push({k:'log',x:o.x+rand(-25,25),y:o.y+rand(-15,25),t:.4});snd('crack');pop(o.x,o.y-40,'🪵 x'+n,'#fff');if(S.tut===0)S.tut=1}P.act=.32;return}
  if(k==='berry'){o.berry--;o.t=40;const it=o.carrot?'carrot':'berry';if(!bagAdd(it))drops.push({k:it,x:P.x,y:P.y,t:1});snd('pop');P.act=.25;return}
  if(k==='farm'){S.farm--;if(!bagAdd('berry'))drops.push({k:'berry',x:P.x,y:P.y,t:1});snd('pop');P.act=.25;return}
  if(k==='scrap'){o.n--;o.t=150;if(!bagAdd(o.k))drops.push({k:o.k,x:P.x,y:P.y,t:1});snd('pop');P.act=.25;return}
  if(k==='chest'){openChest(o);P.act=.4;return}}
function hitAnimal(a){a.hp-=S.tools.goodaxe?2:1;a.hit=.25;const d=Math.hypot(a.x-P.x,a.y-P.y)||1;a.vx=(a.x-P.x)/d*260;a.vy=(a.y-P.y)/d*260;snd('hit');
  if(a.hp<=0){a.dead=true;const loot=a.kind==='bunny'?['meat','foot']:a.kind==='raccoon'?['scrap','scrap']:a.kind==='alpha'?['meat','fur','fur','fur']:['meat','fur'];for(const k of loot)drops.push({k,x:a.x+rand(-20,20),y:a.y+rand(-20,20),t:.3});
    pop(a.x,a.y-30,a.kind==='raccoon'?'도망갔다!':'잡았다!','#fff');if(a.kind==='alpha'){banner('대장 늑대를 이겼어요!','동굴 안 아기가 기다려요')}}}
function openChest(c){S.chests[c.id]=1;snd('win');const T=c.tier;const pool=T===0?[['log',3],['scrap',2],['berry',2],['bandage',1]]:T===1?[['coal',2],['scrap',3],['bandage',1],['can',1]]:[['can',2],['coal',3],['scrap',4],['bandage',2]];
  const [k,n]=pool[Math.floor(Math.random()*pool.length)];for(let i=0;i<n;i++)drops.push({k,x:c.x+rand(-30,30),y:c.y+rand(10,40),t:.5});
  // 특별한 선물
  if(!S.tools.flash&&!S.tools.strongflash&&Math.random()<.35){S.tools.flash=1;banner('🔦 손전등을 찾았어요!','밤 손님을 비추면 꼼짝 못 해요');$('flashBtn').hidden=false}
  else if(T>=1&&!S.tools.goodsack&&Math.random()<.3){S.tools.goodsack=1;banner('🎒 좋은 자루!','가방이 8칸이 됐어요');bagUI()}
  else if(T>=1&&!S.tools.goodaxe&&Math.random()<.3){S.tools.goodaxe=1;banner('🪓 좋은 도끼!','나무를 두 번에 베요')}
  pop(c.x,c.y-30,'짠!','#ffd23f')}
function sleep(){if(S.day)return;const left=D.night-S.t;S.fuel=Math.max(0,S.fuel-left*D.fire.burnNight*.5);S.t=D.night-.01;toast('쿨쿨… 아침이에요!');snd('level')}

// ---------- 작업대 / 창고 / 털 상인
function costTxt(c){return Object.entries(c).map(([k,n])=>IT[k].icon+n).join(' ')}
function canPay(c){for(const k in c)if(have(k)<c[k])return false;return true}
function openPanel(title,build){$('pTitle').textContent=title;const b=$('pBody');b.innerHTML='';build(b);$('panel').hidden=false;paused=true;joy=null;actHeld=false}
function stockLine(b){const d=document.createElement('div');d.className='stock';const all={};for(const k of S.bag)all[k]=(all[k]||0)+1;for(const k in S.store)all[k]=(all[k]||0)+S.store[k];d.textContent='가진 것: '+(Object.entries(all).filter(([k,n])=>n>0).map(([k,n])=>IT[k].icon+n).join(' ')||'없음');b.appendChild(d)}
function row(b,name,desc,cost,btn,fn,done){const r=document.createElement('div');r.className='rec'+(done?' done':'');const nm=document.createElement('div');nm.className='nm';nm.innerHTML='<b></b><small></small>';nm.querySelector('b').textContent=name;nm.querySelector('small').textContent=desc;
  const c=document.createElement('div');c.className='cost';c.textContent=done?'✅':costTxt(cost);const bt=document.createElement('button');bt.textContent=btn;bt.disabled=done||!canPay(cost);bt.onclick=()=>{if(spend(cost)){fn();snd('level')}};r.appendChild(nm);r.appendChild(c);if(!done)r.appendChild(bt);b.appendChild(r)}
function openBench(){openPanel('작업대 '+(S.bench+1)+'단계',b=>{stockLine(b);
  const nx=D.bench.levels[S.bench+1];if(nx)row(b,'⬆️ '+nx.name,'더 좋은 물건을 만들 수 있어요',nx.cost,'올리기',()=>{S.bench++;banner('🔨 작업대 '+(S.bench+1)+'단계!','새 물건이 열렸어요');openBench()});
  for(const R of D.bench.recipes){if(R.lv>S.bench+1){const r=document.createElement('div');r.className='rec done';r.textContent='🔒 '+R.name+' (작업대 '+R.lv+'단계)';b.appendChild(r);continue}
    row(b,R.name,R.desc,R.cost,'만들기',()=>{if(R.item){if(!bagAdd(R.id))S.store[R.id]=(S.store[R.id]||0)+1;toast(R.name+' 완성!')}else{S.crafted[R.id]=1;if(R.id==='bigsack')S.tools.bigsack=1;if(R.id==='lamp')S.tools.lamp=1;if(R.id==='farm')S.farm=3;banner('🔨 '+R.name+' 완성!',R.desc);if(R.id==='map'&&S.tut===2)S.tut=3}bagUI();openBench()},!R.item&&S.crafted[R.id])}})}
function openStore(){openPanel('캠프 창고',b=>{stockLine(b);const p=document.createElement('p');p.className='small';p.textContent='고물·털·토끼 발 같은 재료는 창고에 두면 작업대와 상인이 바로 써요. 연료와 음식은 가방에서 꺼내 써요.';b.appendChild(p)})}
function openTrader(){openPanel('🐰 털 상인',b=>{stockLine(b);const p=document.createElement('p');p.className='small';p.textContent='토끼 발과 늑대 털을 좋은 물건으로 바꿔 줄게!';b.appendChild(p);
  for(const T of D.trader)row(b,T.name,T.desc,T.give,'바꾸기',()=>{S.tools[T.get]=1;if(T.get==='flash'||T.get==='strongflash')$('flashBtn').hidden=false;if(T.get==='armor')S.hp=Math.min(maxHp(),S.hp+2);banner('🐰 '+T.name+'!',T.desc);bagUI();openTrader()},!!S.tools[T.get])})}
$('pClose').onclick=()=>{$('panel').hidden=true;paused=false;snd('click')};

// ---------- 동물과 밤 손님
function spawn(kind,x,y,extra){const c=D.creatures[kind];animals.push(Object.assign({kind,x,y,vx:0,vy:0,hp:c.hp||1,max:c.hp||1,dead:false,t:Math.random()*3,hit:0,stun:0,face:0,dir:Math.random()*TAU,cd:0},extra||{}))}
function populate(){animals=[];for(let i=0;i<26;i++){const a=Math.random()*TAU,d=rand(450,1900);spawn('bunny',C0.x+Math.cos(a)*d,C0.y+Math.sin(a)*d)}
  caves.forEach((c,i)=>{if(S.kids.includes(i)||S.cubFollow===i)return;spawn('alpha',c.x+60,c.y+60,{home:c,cave:i});spawn('wolf',c.x-60,c.y+40,{home:c});spawn('wolf',c.x+20,c.y-70,{home:c})})}
function nightSpawn(){const n=S.night,lr=lightR();const want=Math.min(10,1+Math.floor(n*.7));const wolves=animals.filter(a=>a.kind==='wolf'&&!a.home&&!a.dead).length;
  for(let i=wolves;i<want;i++){const a=Math.random()*TAU,d=rand(500,800);spawn('wolf',P.x+Math.cos(a)*d,P.y+Math.sin(a)*d,{night:true})}
  if(n>=D.creatures.deer.from&&!animals.some(a=>a.kind==='deer')){const a=Math.random()*TAU;spawn('deer',C0.x+Math.cos(a)*(lr+500),C0.y+Math.sin(a)*(lr+500),{night:true})}
  if(n>=D.creatures.owl.from&&!animals.some(a=>a.kind==='owl')){spawn('owl',P.x+300,P.y-300,{night:true,sw:0});if(!S.seenOwl){S.seenOwl=true;banner('🦉 부엉 대장이 나타났어요!','휙 날아오면 손전등으로 비춰요')}}
  if(n>=D.creatures.raccoon.from){const r=animals.filter(a=>a.kind==='raccoon'&&!a.dead).length;const w=S.crafted.fence?1:2+Math.floor(n/15);for(let i=r;i<w;i++){const a=Math.random()*TAU;spawn('raccoon',C0.x+Math.cos(a)*(lr+380),C0.y+Math.sin(a)*(lr+380),{night:true})}}}
function inBeam(a){if(!P.flash)return false;const range=S.tools.strongflash?340:S.tools.lamp?320:260,half=S.tools.strongflash?.45:.35;const d=Math.hypot(a.x-P.x,a.y-P.y);if(d>range)return false;let da=Math.atan2(a.y-P.y,a.x-P.x)-P.face;da=Math.atan2(Math.sin(da),Math.cos(da));return Math.abs(da)<half}
function updAnimals(dt){const lr=lightR(),inFire=o=>Math.hypot(o.x-C0.x,o.y-C0.y)<lr;
  for(const a of animals){if(a.dead)continue;a.t+=dt;a.hit=Math.max(0,a.hit-dt);a.cd=Math.max(0,a.cd-dt);const C=D.creatures[a.kind];const dx=P.x-a.x,dy=P.y-a.y,d=Math.hypot(dx,dy)||1;let mx=0,my=0,sp=C.speed;
    if(a.night&&S.day){a.flee=true}
    if(a.flee){mx=a.x-C0.x;my=a.y-C0.y;sp*=1.3;if(Math.hypot(a.x-P.x,a.y-P.y)>900){a.dead=true;a.gone=true;continue}}
    else if(a.stun>0){a.stun-=dt;sp=0}
    else if(a.kind==='bunny'){if(d<140){mx=-dx;my=-dy}else{if(a.t>2){a.t=0;a.dir=Math.random()*TAU}mx=Math.cos(a.dir);my=Math.sin(a.dir);sp*=.35}}
    else if(a.kind==='wolf'||a.kind==='alpha'){const home=a.home;const chase=d<(a.kind==='alpha'?300:380)&&!inFire(P)&&P.stunT===undefined;
      if(home&&Math.hypot(P.x-home.x,P.y-home.y)>420){mx=home.x-a.x;my=home.y-a.y;sp*=.6;if(Math.hypot(mx,my)<40)sp=0}
      else if(chase&&S.hp>0){mx=dx;my=dy}else{if(a.t>2){a.t=0;a.dir=Math.random()*TAU}mx=Math.cos(a.dir);my=Math.sin(a.dir);sp*=.4}
      if(inBeam(a)&&a.kind==='wolf'){mx=-dx;my=-dy}}
    else if(a.kind==='deer'){if(inBeam(a)){a.stun=2.5;a.frozen=1;snd('tick');continue}a.frozen=0;mx=dx;my=dy;if(d>700)sp*=1.8}
    else if(a.kind==='owl'){a.sw-=dt;if(inBeam(a)){a.stun=2;continue}if(a.sw<=0&&d<420){a.swoop=1;a.sw=rand(4,7)}
      if(a.swoop>0){a.swoop-=dt;mx=dx;my=dy;sp=C.speed*1.6}else{const ang=a.t*.8;mx=P.x+Math.cos(ang)*260-a.x;my=P.y+Math.sin(ang)*260-a.y;sp=C.speed*.6}}
    else if(a.kind==='raccoon'){const fd=Math.hypot(C0.x-a.x,C0.y-a.y);if(fd>60){mx=C0.x-a.x;my=C0.y-a.y;sp*=.6}else if(a.cd<=0){a.cd=3;S.fuel=Math.max(0,S.fuel-8);pop(a.x,a.y-30,'연료 슬쩍!','#ffb020');toast('🦝 망토 너구리가 연료를 훔쳐요! 혼내 줘요')}}
    const ml=Math.hypot(mx,my);let vx=ml?mx/ml*sp:0,vy=ml?my/ml*sp:0;
    // 모닥불 빛 안으로는 못 들어와요 (너구리, 토끼 빼고)
    if(['wolf','deer','owl','alpha'].includes(a.kind)&&!a.flee){const nx=a.x+vx*dt,ny=a.y+vy*dt;if(Math.hypot(nx-C0.x,ny-C0.y)<lr+20){const ox=a.x-C0.x,oy=a.y-C0.y,ol=Math.hypot(ox,oy)||1;vx=ox/ol*sp*.5;vy=oy/ol*sp*.5}}
    a.x+=(vx+a.vx)*dt;a.y+=(vy+a.vy)*dt;a.vx*=.85;a.vy*=.85;if(ml)a.face=Math.atan2(vy,vx);a.x=clamp(a.x,20,WS-20);a.y=clamp(a.y,20,WS-20);
    // 부딪힘
    const hitR=a.kind==='deer'?40:a.kind==='owl'?30:28;
    if(d<hitR&&P.inv<=0&&a.stun<=0&&!a.flee&&['wolf','alpha','deer','owl'].includes(a.kind)){hurt(a.kind==='deer'?2:1);if(a.kind==='owl'){P.stun=.8;a.swoop=0}const k=260;P.kx=dx/d*k;P.ky=dy/d*k;if(a.kind==='deer'){a.stun=1.5}}}
  animals=animals.filter(a=>!a.gone)}
function hurt(n){if(P.inv>0)return;S.hp-=n;P.inv=1.3;shake=.25;snd('hurt');pop(P.x,P.y-40,'아야!','#ff6a6a');if(S.hp<=0)faint()}
function faint(){banner('😵 기절했어요','모닥불 곁에서 깨어났어요 (가방은 비었어요)');S.bag=[];bagUI();S.hp=maxHp();S.hunger=Math.max(S.hunger,60);P.x=C0.x+50;P.y=C0.y+50;P.inv=3;P.flash=false;if(S.cubFollow!==null){toast('아기가 다시 동굴로 돌아갔어요');S.cubFollow=null;populate()}snd('lose')}

// ---------- 하루 흐름
function updDay(dt){S.t+=dt;const len=S.day?D.day:D.night;
  if(!S.day){if(Math.random()<dt*.5)nightSpawn()}
  if(S.t>=len){S.t=0;if(S.day){S.day=false;banner('🌙 '+S.night+'번째 밤','모닥불 빛 안은 안전해요!');snd('alert');nightSpawn();if(S.tut===3)S.tut=4}
    else{S.day=true;const done=S.night;S.night++;banner('🌞 '+done+'번째 밤을 버텼어요!','아침이에요');snd('win');milestone(done);for(const a of animals)if(a.night)a.flee=true;store();Arcade.record&&Arcade.record('forest99Nights',done)}}
  S.fuel=Math.max(0,S.fuel-dt*(S.day?D.fire.burnDay:D.fire.burnNight));
  if(S.fuel<=0&&!S.warnOut){S.warnOut=true;toast('🔥 모닥불이 꺼졌어요! 통나무를 넣어요')}if(S.fuel>0)S.warnOut=false}
function milestone(n){if(D.milestones.includes(n)&&!S.ms[n]){S.ms[n]=1;setTimeout0(()=>banner('🏆 '+n+'번째 밤 달성!',n>=99?'숲의 전설이 되었어요!':'대단해요!'),2.8)}if(n>=99){setTimeout0(()=>{banner('🎉 99밤을 모두 버텼어요!','숲 탈출 성공! 계속 놀 수도 있어요')},5.5)}}

// ---------- 갱신
function questText(){if(S.cubFollow!==null)return '🧸 '+D.kids[S.cubFollow].name+'를 모닥불까지 데려가요!';
  const t=S.tut;if(t===0)return '🪓 나무 곁에서 행동 버튼을 눌러 나무를 베어요';if(t===1)return '🔥 통나무를 모닥불에 넣어요';if(t===2)return '🔨 작업대에서 지도를 만들어요 (통나무 3개)';if(t===3)return '🌙 밤이 오면 모닥불 빛 안에 있어요';
  if(!S.tools.flash&&!S.tools.strongflash)return '🐰 토끼를 잡아 토끼 발로 털 상인에게 손전등을 받아요';
  if(fireLv()<2)return '🔥 모닥불을 '+(fireLv()+2)+'단계로 키워요 (숲이 넓어져요)';
  if(S.kids.length<4){const c=caves.find((c,i)=>!S.kids.includes(i)&&Math.hypot(c.x-C0.x,c.y-C0.y)<exploreR());return c?'🧸 동굴 속 길 잃은 아기를 구해요 ('+S.kids.length+'/4)':'🔥 모닥불을 더 키우면 새 동굴이 보여요'}
  return '🌙 99번째 밤까지 버텨요! ('+S.night+'/99)'}
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}updBanner(dt);
  if(paused)return;updDay(dt);
  // 움직이기
  let mx=0,my=0;if(keys.arrowleft||keys.a)mx--;if(keys.arrowright||keys.d)mx++;if(keys.arrowup||keys.w)my--;if(keys.arrowdown||keys.s)my++;if(joy){mx=joy.x;my=joy.y}
  const ml=Math.hypot(mx,my);P.stun=Math.max(0,P.stun-dt);
  if(ml>.15&&P.stun<=0){const sp=D.player.speed*(S.hunger<=0?.7:1)*Math.min(1,ml);let nx=P.x+mx/Math.max(1,ml)*sp*dt,ny=P.y+my/Math.max(1,ml)*sp*dt;
    // 안개 벽
    const er=exploreR();if(Math.hypot(nx-C0.x,ny-C0.y)>er){const a=Math.atan2(ny-C0.y,nx-C0.x);nx=C0.x+Math.cos(a)*er;ny=C0.y+Math.sin(a)*er;if(!S.fogMsg||time-S.fogMsg>4){S.fogMsg=time;toast('🌫️ 안개가 짙어요. 모닥불을 키우면 더 갈 수 있어요')}}
    // 나무에 막히기
    for(const t of trees){if(t.down)continue;const dd=Math.hypot(nx-t.x,ny-t.y);if(dd<26*t.s){const k=26*t.s/dd;nx=t.x+(nx-t.x)*k;ny=t.y+(ny-t.y)*k}}
    P.x=nx;P.y=ny;P.face=Math.atan2(my,mx);P.walk+=dt*10}
  P.x+=(P.kx||0)*dt;P.y+=(P.ky||0)*dt;P.kx=(P.kx||0)*.85;P.ky=(P.ky||0)*.85;P.x=clamp(P.x,20,WS-20);P.y=clamp(P.y,20,WS-20);P.inv=Math.max(0,P.inv-dt);
  P.act-=dt;if(actHeld&&P.act<=0)act();
  // 줍기
  for(let i=drops.length-1;i>=0;i--){const d=drops[i];d.t-=dt;if(d.t>0)continue;const dd=Math.hypot(d.x-P.x,d.y-P.y);if(dd<110&&dd>1&&S.bag.length<bagMax()){d.x+=(P.x-d.x)/dd*Math.min(dd,320*dt);d.y+=(P.y-d.y)/dd*Math.min(dd,320*dt)}if(dd<36){if(bagAdd(d.k)){drops.splice(i,1);snd('tick');pop(P.x,P.y-40,IT[d.k].icon,'#fff')}else if(!S.fullMsg||time-S.fullMsg>3){S.fullMsg=time;toast('가방이 가득 찼어요! 캠프에 내려놓아요')}}}
  // 배고픔
  P.hungerT+=dt;if(P.hungerT>1){P.hungerT=0;S.hunger=Math.max(0,S.hunger-D.player.hungerRate*(S.day?1:1.2));if(S.hunger<=0&&Math.random()<.15)hurt(1);if(S.hunger<25&&!S.hungryMsg){S.hungryMsg=true;toast('배고파요! 🍓 산딸기나 🍖 고기를 먹어요 (가방 물건 누르기)')}if(S.hunger>40)S.hungryMsg=false}
  // 손전등
  const nearFire=Math.hypot(P.x-C0.x,P.y-C0.y)<lightR();if(P.flash){P.bat-=dt*(S.tools.strongflash?4:S.tools.lamp?4.5:7);if(P.bat<=0){P.bat=0;P.flash=false;toast('🔦 배터리가 다 됐어요')}}else if(nearFire)P.bat=Math.min(100,P.bat+dt*20);
  if(nearFire&&S.hp<maxHp()&&S.day){P.healT=(P.healT||0)+dt;if(P.healT>10){P.healT=0;S.hp++;pop(P.x,P.y-40,'❤️','#ff6a8a')}}
  updAnimals(dt);
  // 자원 다시 자라기
  for(const t of trees)if(t.down){t.regrow-=dt;if(t.regrow<=0&&Math.hypot(t.x-P.x,t.y-P.y)>400){t.down=0;t.hp=4}}
  for(const b of bushes)if(b.berry<3){b.t-=dt;if(b.t<=0){b.berry++;b.t=40}}
  for(const s of scraps)if(s.n<2){s.t-=dt;if(s.t<=0){s.n=2;s.t=150}}
  if(S.crafted.farm){S.farmT=(S.farmT||0)+dt;if(S.farmT>30){S.farmT=0;S.farm=Math.min(6,(S.farm||0)+1)}}
  if(S.day&&animals.filter(a=>a.kind==='bunny'&&!a.dead).length<18){const a=Math.random()*TAU,d=rand(600,1800);spawn('bunny',C0.x+Math.cos(a)*d,C0.y+Math.sin(a)*d)}
  // 아기 구하기
  caves.forEach((c,i)=>{if(S.kids.includes(i)||S.cubFollow!==null)return;if(Math.hypot(P.x-c.x,P.y-c.y)<50){const guard=animals.some(a=>a.kind==='alpha'&&a.cave===i&&!a.dead);if(guard){if(!S.guardMsg||time-S.guardMsg>4){S.guardMsg=time;toast('🐺 대장 늑대가 지키고 있어요! 먼저 혼내 줘요')}}else{S.cubFollow=i;banner('🧸 '+D.kids[i].name+'를 찾았어요!','모닥불까지 데려가요');snd('level')}}});
  if(S.cubFollow!==null){const k=S.cubFollow;if(!S.cub)S.cub={x:caves[k].x,y:caves[k].y};const c=S.cub;const d=Math.hypot(P.x-c.x,P.y-c.y);if(d>50){c.x+=(P.x-c.x)/d*Math.min(d-40,D.player.speed*1.05*dt);c.y+=(P.y-c.y)/d*Math.min(d-40,D.player.speed*1.05*dt)}
    if(Math.hypot(c.x-C0.x,c.y-C0.y)<lightR()*.8){S.kids.push(k);S.cubFollow=null;S.cub=null;banner('💖 '+D.kids[k].name+' 구출!','아기 동물 '+S.kids.length+'/4');snd('win');for(let i=0;i<30;i++)parts.push({x:C0.x,y:C0.y,vx:rand(-200,200),vy:rand(-260,-40),life:1.2,c:['#ffd23f','#ff6a8a','#7ad8ff'][i%3]});S.fuelPts+=10;store();Arcade.record&&Arcade.record('forest99Kids',S.kids.length)}}
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt}parts=parts.filter(p=>p.life>0);
  for(const p of pops){p.life-=dt;p.y-=30*dt}pops=pops.filter(p=>p.life>0);shake=Math.max(0,shake-dt);
  autoSave-=dt;if(autoSave<=0){autoSave=10;store()}
  hud()}
let autoSave=10;
let hudT=0;function hud(){hudT-=1/60;if(hudT>0)return;hudT=.1;
  setT($('dayTxt'),(S.day?'🌞 ':'🌙 ')+S.night+(S.day?'일째 낮':'번째 밤'));$('dayBar').style.width=(S.t/(S.day?D.day:D.night)*100)+'%';$('dayBar').style.background=S.day?'#ffb020':'#6a7aff';
  setT($('hearts'),'♥'.repeat(Math.max(0,S.hp))+'♡'.repeat(Math.max(0,maxHp()-S.hp)));$('hungerBar').style.width=S.hunger+'%';setT($('kidsTxt'),S.kids.length+'/4');setT($('quest'),questText());
  const T=target();const ab=$('actBtn');ab.textContent=T?T.label:'행동';ab.classList.toggle('off',!T);
  const fb=$('flashBtn');fb.classList.toggle('on',P.flash);fb.querySelector('i').style.width=P.bat+'%';$('mini').hidden=!S.crafted.map}

// ---------- 그리기
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);const sx=shake>0?rand(-5,5):0;
  const cx=clamp(P.x-W/2,0,WS-W)+sx,cy=clamp(P.y-H/2,0,WS-H);const X=x=>x-cx,Y=y=>y-cy;
  ctx.fillStyle='#78c058';ctx.fillRect(0,0,W,H);
  // 풀 무늬
  ctx.fillStyle='#6cb44e';const g0x=Math.floor(cx/80),g0y=Math.floor(cy/80);for(let gy=g0y;gy<g0y+H/80+2;gy++)for(let gx=g0x;gx<g0x+W/80+2;gx++){const h=Math.sin(gx*12.9898+gy*78.233)*43758.5453%1;if(Math.abs(h)<.35){ctx.beginPath();ctx.ellipse(X(gx*80+40),Y(gy*80+40),18,8,0,0,TAU);ctx.fill()}}
  // 캠프 바닥
  const lr=lightR();ctx.fillStyle='#d8b878';ctx.beginPath();ctx.arc(X(C0.x),Y(C0.y),150,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,210,120,.35)';ctx.lineWidth=4;ctx.setLineDash([10,10]);ctx.beginPath();ctx.arc(X(C0.x),Y(C0.y),lr,0,TAU);ctx.stroke();ctx.setLineDash([]);
  if(S.crafted.fence){ctx.strokeStyle='#8a5a2a';ctx.lineWidth=6;ctx.beginPath();ctx.arc(X(C0.x),Y(C0.y),210,0,TAU);ctx.stroke();for(let i=0;i<36;i++){const a=i/36*TAU;ctx.fillStyle='#a06a3a';ctx.fillRect(X(C0.x+Math.cos(a)*210)-4,Y(C0.y+Math.sin(a)*210)-14,8,18)}}
  const vis=o=>o.x>cx-80&&o.x<cx+W+80&&o.y>cy-100&&o.y<cy+H+80;
  // 동굴
  for(const c of caves){if(!vis(c))continue;ctx.fillStyle='#6a6a7a';ctx.beginPath();ctx.ellipse(X(c.x),Y(c.y),80,60,0,Math.PI,0);ctx.lineTo(X(c.x)+80,Y(c.y)+20);ctx.lineTo(X(c.x)-80,Y(c.y)+20);ctx.fill();ctx.fillStyle='#2a2a3a';ctx.beginPath();ctx.ellipse(X(c.x),Y(c.y)+10,40,34,0,Math.PI,0);ctx.lineTo(X(c.x)+40,Y(c.y)+20);ctx.lineTo(X(c.x)-40,Y(c.y)+20);ctx.fill();
    if(!S.kids.includes(c.i)&&S.cubFollow!==c.i){drawKid(X(c.x),Y(c.y)+4,D.kids[c.i].c,.8);ctx.fillStyle='#fff';ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('살려 줘요~',X(c.x),Y(c.y)-70)}}
  // 덤불, 고물, 상자
  for(const b of bushes){if(!vis(b))continue;ctx.fillStyle='#3a8a3a';ctx.beginPath();ctx.arc(X(b.x)-10,Y(b.y),16,0,TAU);ctx.arc(X(b.x)+10,Y(b.y)-4,18,0,TAU);ctx.arc(X(b.x),Y(b.y)+8,15,0,TAU);ctx.fill();
    for(let i=0;i<b.berry;i++){if(b.carrot){ctx.fillStyle='#ff8a2a';ctx.beginPath();ctx.moveTo(X(b.x)-12+i*12,Y(b.y)+18);ctx.lineTo(X(b.x)-16+i*12,Y(b.y)+8);ctx.lineTo(X(b.x)-8+i*12,Y(b.y)+8);ctx.fill();ctx.fillStyle='#5ad83a';ctx.fillRect(X(b.x)-14+i*12,Y(b.y)+3,4,6)}else{ctx.fillStyle='#ff3a5a';ctx.beginPath();ctx.arc(X(b.x)-10+i*10,Y(b.y)-6+(i%2)*10,5,0,TAU);ctx.fill()}}}
  for(const s of scraps){if(!vis(s)||s.n<=0)continue;if(s.k==='coal'){ctx.fillStyle='#4a4a54';ctx.beginPath();ctx.arc(X(s.x),Y(s.y),14,0,TAU);ctx.arc(X(s.x)+12,Y(s.y)+4,10,0,TAU);ctx.fill()}else{ctx.fillStyle='#9aa0a8';ctx.fillRect(X(s.x)-14,Y(s.y)-6,16,10);ctx.fillStyle='#c87a3a';ctx.beginPath();ctx.arc(X(s.x)+8,Y(s.y)+2,7,0,TAU);ctx.fill();ctx.fillStyle='#7a8088';ctx.fillRect(X(s.x)-6,Y(s.y)+4,18,5)}}
  for(const c of chests){if(!vis(c))continue;const o=S.chests[c.id];ctx.fillStyle=c.tier===2?'#c8a0ff':c.tier===1?'#7ad0ff':'#c88a4a';ctx.fillRect(X(c.x)-18,Y(c.y)-10,36,24);ctx.fillStyle=o?'#5a3a1a':'#a06a2a';ctx.fillRect(X(c.x)-20,Y(c.y)-(o?22:16),40,10);ctx.fillStyle='#ffd23f';ctx.fillRect(X(c.x)-3,Y(c.y)-6,6,8);if(!o&&Math.sin(time*4+c.id)>.6){ctx.fillStyle='#fff6a0';ctx.fillRect(X(c.x)+14,Y(c.y)-24,4,4)}}
  // 캠프 물건
  const F=CAMP;ctx.fillStyle='#a06a3a';ctx.fillRect(X(F.bench.x)-30,Y(F.bench.y)-16,60,30);ctx.fillStyle='#7a4a2a';ctx.fillRect(X(F.bench.x)-30,Y(F.bench.y)+12,8,12);ctx.fillRect(X(F.bench.x)+22,Y(F.bench.y)+12,8,12);ctx.fillStyle='#8a8a9a';ctx.fillRect(X(F.bench.x)-10,Y(F.bench.y)-24,24,8);label('작업대',F.bench);
  ctx.fillStyle='#c88a4a';ctx.fillRect(X(F.store.x)-24,Y(F.store.y)-14,48,30);ctx.fillStyle='#8a5a2a';ctx.fillRect(X(F.store.x)-26,Y(F.store.y)-20,52,10);label('창고',F.store);
  if(S.crafted.bed){ctx.fillStyle='#7a5a3a';ctx.fillRect(X(F.bed.x)-30,Y(F.bed.y)-16,60,34);ctx.fillStyle='#ff9ac8';ctx.fillRect(X(F.bed.x)-26,Y(F.bed.y)-12,52,26);ctx.fillStyle='#fff';ctx.fillRect(X(F.bed.x)-24,Y(F.bed.y)-10,16,10)}
  if(S.crafted.farm){ctx.fillStyle='#8a5a2a';ctx.fillRect(X(F.farm.x)-36,Y(F.farm.y)-14,72,28);for(let i=0;i<(S.farm||0);i++){ctx.fillStyle='#ff3a5a';ctx.beginPath();ctx.arc(X(F.farm.x)-28+i*11,Y(F.farm.y),5,0,TAU);ctx.fill()}}
  if(S.day){drawTrader(X(F.trader.x),Y(F.trader.y));label('털 상인',F.trader)}
  // 모닥불
  const fx=X(C0.x),fy=Y(C0.y);ctx.fillStyle='#7a5a3a';for(let i=0;i<8;i++){const a=i/8*TAU;ctx.beginPath();ctx.arc(fx+Math.cos(a)*34,fy+Math.sin(a)*24,9,0,TAU);ctx.fill()}
  ctx.fillStyle='#5a3a1a';ctx.fillRect(fx-22,fy-4,44,10);ctx.fillRect(fx-6,fy-18,12,30);
  if(S.fuel>0){const fs=1+fireLv()*.18;for(let i=0;i<3;i++){const h=(26+Math.sin(time*9+i*2)*6)*fs;ctx.fillStyle=['#ff6a2a','#ffb020','#fff2a0'][i];ctx.beginPath();ctx.moveTo(fx-(16-i*5)*fs,fy+4);ctx.quadraticCurveTo(fx-(10-i*3)*fs,fy-h*.6,fx,fy-h);ctx.quadraticCurveTo(fx+(10-i*3)*fs,fy-h*.6,fx+(16-i*5)*fs,fy+4);ctx.fill()}}
  // 바닥 물건
  ctx.font='22px Jua';ctx.textAlign='center';ctx.textBaseline='middle';for(const d of drops){if(!vis(d))continue;ctx.fillText(IT[d.k].icon,X(d.x),Y(d.y)+Math.sin(time*4+d.x)*2)}ctx.textBaseline='alphabetic';
  // 나무와 동물, 나 (아래쪽이 앞)
  const list=[];for(const t of trees)if(vis(t))list.push({y:t.y,f:()=>drawTree(t,X,Y)});for(const a of animals)if(!a.dead&&vis(a))list.push({y:a.y,f:()=>drawAnimal(a,X(a.x),Y(a.y))});
  list.push({y:P.y,f:()=>drawMe(X(P.x),Y(P.y))});if(S.cub)list.push({y:S.cub.y,f:()=>drawKid(X(S.cub.x),Y(S.cub.y),D.kids[S.cubFollow].c,.7)});
  list.sort((a,b)=>a.y-b.y);for(const o of list)o.f();
  for(const p of parts){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.c;ctx.fillRect(X(p.x)-3,Y(p.y)-3,6,6)}ctx.globalAlpha=1;
  // 안개 (아직 못 가는 곳)
  const er=exploreR();ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(X(C0.x),Y(C0.y),er,0,TAU,true);ctx.fillStyle='rgba(235,240,245,.78)';ctx.fill('evenodd');ctx.restore();
  const eg=ctx.createRadialGradient(X(C0.x),Y(C0.y),er-120,X(C0.x),Y(C0.y),er);eg.addColorStop(0,'rgba(235,240,245,0)');eg.addColorStop(1,'rgba(235,240,245,.7)');ctx.fillStyle=eg;ctx.beginPath();ctx.arc(X(C0.x),Y(C0.y),er,0,TAU);ctx.fill();
  // 밤
  const nk=nightK();if(nk>0){const k=.5;dctx.setTransform(1,0,0,1,0,0);dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,dark.width,dark.height);dctx.fillStyle=`rgba(20,26,70,${.72*nk})`;dctx.fillRect(0,0,dark.width,dark.height);dctx.globalCompositeOperation='destination-out';
    const hole=(x,y,r)=>{const g=dctx.createRadialGradient(x*k,y*k,0,x*k,y*k,r*k);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.7,'rgba(0,0,0,.85)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.beginPath();dctx.arc(x*k,y*k,r*k,0,TAU);dctx.fill()};
    if(S.fuel>0)hole(fx,fy,lr*(1+Math.sin(time*7)*.02));hole(X(P.x),Y(P.y),90);
    if(P.flash){const range=S.tools.strongflash?340:S.tools.lamp?320:260,half=S.tools.strongflash?.45:.35;dctx.fillStyle='rgba(0,0,0,.92)';dctx.beginPath();dctx.moveTo(X(P.x)*k,Y(P.y)*k);dctx.arc(X(P.x)*k,Y(P.y)*k,range*k,P.face-half,P.face+half);dctx.closePath();dctx.fill()}
    for(let i=0;i<14;i++){const x=(i*397+Math.sin(time*.5+i)*60)%W,y=(i*211+Math.cos(time*.6+i)*50)%H;hole(x,y,18)}
    ctx.drawImage(dark,0,0,W,H);
    // 반딧불
    for(let i=0;i<14;i++){const x=(i*397+Math.sin(time*.5+i)*60)%W,y=(i*211+Math.cos(time*.6+i)*50)%H;ctx.fillStyle=`rgba(255,250,150,${.5+.5*Math.sin(time*3+i)})`;ctx.beginPath();ctx.arc(x,y,2.5,0,TAU);ctx.fill()}
    for(const a of animals)if(!a.dead&&(a.kind==='deer'||a.kind==='owl'||a.kind==='wolf')&&vis(a)){ctx.fillStyle=a.frozen||a.stun>0?'#7ad8ff':'#fff6a0';const ex=X(a.x),ey=Y(a.y)-(a.kind==='deer'?34:a.kind==='owl'?22:14);ctx.beginPath();ctx.arc(ex-5,ey,3,0,TAU);ctx.arc(ex+5,ey,3,0,TAU);ctx.fill()}}
  // 머리 위 글자
  for(const a of animals)if(!a.dead&&vis(a)&&(a.frozen||a.stun>0)&&(a.kind==='deer'||a.kind==='owl')){ctx.fillStyle='#7ad8ff';ctx.font='18px Jua';ctx.textAlign='center';ctx.fillText('꼼짝!',X(a.x),Y(a.y)-60)}
  for(const p of pops){ctx.globalAlpha=Math.min(1,p.life*2);ctx.font='18px Jua';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(40,30,20,.8)';ctx.strokeText(p.t,X(p.x),Y(p.y));ctx.fillStyle=p.c;ctx.fillText(p.t,X(p.x),Y(p.y))}ctx.globalAlpha=1;
  // 아기 방향 / 캠프 방향
  if(S.cubFollow!==null||(!S.day&&Math.hypot(P.x-C0.x,P.y-C0.y)>lr+150))arrowTo(C0,'#ffb020');else if(S.tools.radar||S.crafted.radar){const c=caves.find((c,i)=>!S.kids.includes(i));if(c)arrowTo(c,'#ff8ad8')}
  if(S.crafted.map)drawMini();
  function arrowTo(o,col){const a=Math.atan2(o.y-P.y,o.x-P.x),r=Math.min(W,H)*.32;const x=W/2+Math.cos(a)*r,y=H/2+Math.sin(a)*r;if(Math.hypot(o.x-P.x,o.y-P.y)<r)return;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=col;ctx.strokeStyle='#5a3a00';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-10,-14);ctx.lineTo(-4,0);ctx.lineTo(-10,14);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  function label(t,o){ctx.fillStyle='rgba(60,40,20,.7)';ctx.font='13px Jua';ctx.textAlign='center';ctx.fillText(t,X(o.x),Y(o.y)+34)}}
function drawTree(t,X,Y){const x=X(t.x),y=Y(t.y),s=t.s;if(t.down){ctx.fillStyle='#8a5a2a';ctx.beginPath();ctx.ellipse(x,y+8,12*s,7*s,0,0,TAU);ctx.fill();ctx.fillStyle='#d8a870';ctx.beginPath();ctx.ellipse(x,y+6,9*s,5*s,0,0,TAU);ctx.fill();return}
  const sh=t.shake>0?(t.shake-=1/60,Math.sin(time*60)*3):0;ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x+6,y+14,30*s,10*s,0,0,TAU);ctx.fill();ctx.fillStyle='#8a5a2a';ctx.fillRect(x-7*s,y-8*s,14*s,24*s);
  ctx.fillStyle='#3a9a4a';ctx.beginPath();ctx.arc(x+sh,y-30*s,32*s,0,TAU);ctx.fill();ctx.fillStyle='#4ab05a';ctx.beginPath();ctx.arc(x-10*s+sh,y-40*s,16*s,0,TAU);ctx.fill();if(t.hp<4){ctx.fillStyle='#fff';ctx.font='12px Jua';ctx.textAlign='center';ctx.fillText('🪓'.repeat(4-t.hp),x,y+30)}}
function drawMe(x,y){const blink=P.inv>0&&Math.floor(time*12)%2;if(blink)return;const w=Math.sin(P.walk)*3;ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y+16,14,5,0,0,TAU);ctx.fill();
  ctx.fillStyle='#5a4a8a';ctx.fillRect(x-8,y+4+w*.4,6,12);ctx.fillRect(x+2,y+4-w*.4,6,12);ctx.fillStyle='#ff6a4a';ctx.beginPath();ctx.roundRect(x-12,y-10,24,20,6);ctx.fill();
  ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(x,y-20,13,0,TAU);ctx.fill();ctx.fillStyle='#3a7a3a';ctx.beginPath();ctx.arc(x,y-24,13,Math.PI,0);ctx.fill();ctx.fillRect(x-3,y-40,6,6);
  const ex=Math.cos(P.face)*3,ey=Math.sin(P.face)*2;ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(x-4+ex,y-19+ey,2,0,TAU);ctx.arc(x+4+ex,y-19+ey,2,0,TAU);ctx.fill();
  // 도끼
  const a=P.face,swing=P.act>0?Math.sin(P.act*20)*.8:0;ctx.save();ctx.translate(x+Math.cos(a)*14,y+Math.sin(a)*8-4);ctx.rotate(a+swing);ctx.fillStyle='#8a5a2a';ctx.fillRect(0,-2,18,4);ctx.fillStyle=S.tools.goodaxe?'#7ad8ff':'#b8b8c0';ctx.fillRect(14,-8,8,10);ctx.restore();
  if(S.bag.length){ctx.fillStyle='#c8964a';ctx.beginPath();ctx.arc(x-12,y-4,7+S.bag.length*.6,0,TAU);ctx.fill()}}
function drawKid(x,y,c,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);const b=Math.abs(Math.sin(time*5))*3;ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-b,16,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(-11,-14-b,6,0,TAU);ctx.arc(11,-14-b,6,0,TAU);ctx.fill();ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(-5,-2-b,2.5,0,TAU);ctx.arc(5,-2-b,2.5,0,TAU);ctx.fill();ctx.fillStyle='#ff8aa0';ctx.beginPath();ctx.arc(-9,4-b,3,0,TAU);ctx.arc(9,4-b,3,0,TAU);ctx.fill();ctx.restore()}
function drawTrader(x,y){ctx.fillStyle='#e8d8c8';ctx.beginPath();ctx.ellipse(x,y,16,18,0,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(x-7,y-24,5,13,-.2,0,TAU);ctx.ellipse(x+7,y-24,5,13,.2,0,TAU);ctx.fill();ctx.fillStyle='#7a4a9a';ctx.beginPath();ctx.moveTo(x-18,y+2);ctx.lineTo(x+18,y+2);ctx.lineTo(x+14,y+20);ctx.lineTo(x-14,y+20);ctx.fill();ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(x-5,y-4,2,0,TAU);ctx.arc(x+5,y-4,2,0,TAU);ctx.fill();ctx.fillStyle='#c8964a';ctx.fillRect(x+16,y-6,18,14)}
function drawAnimal(a,x,y){ctx.save();ctx.translate(x,y);if(a.hit>0)ctx.globalAlpha=.6;const f=Math.cos(a.face)>=0?1:-1;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,14,a.kind==='deer'?30:16,5,0,0,TAU);ctx.fill();
  if(a.kind==='bunny'){ctx.fillStyle='#f4ecec';ctx.beginPath();ctx.ellipse(0,0,13,11,0,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(f*8,-8,8,7,0,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(f*6,-20,3,9,-.2*f,0,TAU);ctx.ellipse(f*11,-20,3,9,.2*f,0,TAU);ctx.fill();ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(f*11,-9,1.8,0,TAU);ctx.fill()}
  else if(a.kind==='wolf'||a.kind==='alpha'){const s=a.kind==='alpha'?1.35:1;ctx.scale(s,s);ctx.fillStyle=a.kind==='alpha'?'#7a7a9a':'#9aa0b8';ctx.beginPath();ctx.ellipse(0,0,18,11,0,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(f*14,-8,10,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(f*8,-14);ctx.lineTo(f*10,-24);ctx.lineTo(f*14,-15);ctx.moveTo(f*16,-15);ctx.lineTo(f*20,-24);ctx.lineTo(f*21,-12);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(f*20,-5,5,4,0,0,TAU);ctx.fill();ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(f*16,-10,2,0,TAU);ctx.arc(f*24,-6,2,0,TAU);ctx.fill();ctx.fillStyle='#9aa0b8';ctx.beginPath();ctx.ellipse(-f*20,-4,8,4,-.6*f,0,TAU);ctx.fill();if(a.kind==='alpha'){ctx.fillStyle='#ffd23f';ctx.fillRect(f*8,-28,12,5)}}
  else if(a.kind==='deer'){ctx.fillStyle='#6a4a8a';ctx.beginPath();ctx.ellipse(0,-4,26,18,0,0,TAU);ctx.fill();ctx.fillRect(-18,8,8,14);ctx.fillRect(10,8,8,14);ctx.beginPath();ctx.arc(f*18,-26,14,0,TAU);ctx.fill();
    ctx.strokeStyle='#c8a0ff';ctx.lineWidth=4;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(f*18+s*6,-38);ctx.lineTo(f*18+s*14,-58);ctx.moveTo(f*18+s*10,-48);ctx.lineTo(f*18+s*20,-50);ctx.stroke()}
    ctx.fillStyle='#fff6a0';for(const s of [-1,1]){ctx.beginPath();ctx.arc(f*18+s*14,-58,4,0,TAU);ctx.fill()}ctx.fillStyle='#ff9ad8';ctx.beginPath();ctx.arc(f*26,-20,3,0,TAU);ctx.fill()}
  else if(a.kind==='owl'){const fl=Math.sin(time*14)*6;ctx.fillStyle='#8a6a4a';ctx.beginPath();ctx.ellipse(0,-6,16,20,0,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(-18,-6+fl,12,6,-.5,0,TAU);ctx.ellipse(18,-6+fl,12,6,.5,0,TAU);ctx.fill();ctx.fillStyle='#f4e8c8';ctx.beginPath();ctx.arc(-6,-14,7,0,TAU);ctx.arc(6,-14,7,0,TAU);ctx.fill();ctx.fillStyle='#ffb020';ctx.beginPath();ctx.moveTo(-3,-8);ctx.lineTo(3,-8);ctx.lineTo(0,-3);ctx.fill()}
  else if(a.kind==='raccoon'){ctx.fillStyle='#8a8a9a';ctx.beginPath();ctx.ellipse(0,0,15,12,0,0,TAU);ctx.fill();ctx.fillStyle='#5a3a8a';ctx.beginPath();ctx.moveTo(-14,-6);ctx.lineTo(14,-6);ctx.lineTo(10,14);ctx.lineTo(-10,14);ctx.fill();ctx.fillStyle='#8a8a9a';ctx.beginPath();ctx.arc(0,-14,11,0,TAU);ctx.fill();ctx.fillStyle='#3a3a44';ctx.fillRect(-10,-17,20,6);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-4,-14,2,0,TAU);ctx.arc(4,-14,2,0,TAU);ctx.fill()}
  if(a.max>1&&a.hp<a.max){ctx.fillStyle='#fff';ctx.fillRect(-15,-36,30,4);ctx.fillStyle='#ff5a5a';ctx.fillRect(-15,-36,30*a.hp/a.max,4)}
  ctx.restore()}
function drawMini(){const m=$('mini'),g=m.getContext('2d');const R=70,sc=R/2200;g.clearRect(0,0,140,140);g.fillStyle='#78c058';g.beginPath();g.arc(70,70,70,0,TAU);g.fill();
  g.fillStyle='rgba(235,240,245,.85)';g.beginPath();g.rect(0,0,140,140);g.arc(70,70,exploreR()*sc,0,TAU,true);g.fill('evenodd');
  const pt=(o,c,r)=>{const x=70+(o.x-C0.x)*sc,y=70+(o.y-C0.y)*sc;g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,TAU);g.fill()};
  pt(C0,'#ff6a2a',5);for(const c of caves)if(Math.hypot(c.x-C0.x,c.y-C0.y)<exploreR())pt(c,S.kids.includes(c.i)?'#7ad86a':'#ff8ad8',4);for(const c of chests)if(!S.chests[c.id]&&Math.hypot(c.x-C0.x,c.y-C0.y)<exploreR())pt(c,'#c8964a',2);pt(P,'#3a6aff',4)}

// ---------- 화면
function openMenu(){paused=true;$('menuOv').hidden=false;setT($('mStat'),'버틴 밤 '+(S.night-1)+' · 모닥불 '+(fireLv()+1)+'단계 · 구한 아기 '+S.kids.length+'/4 · 작업대 '+(S.bench+1)+'단계')}
$('menuBtn').onclick=()=>{if(started)openMenu()};$('resumeBtn').onclick=()=>{$('menuOv').hidden=true;paused=false};
$('quitBtn').onclick=()=>{store();$('menuOv').hidden=true;started=false;paused=false;title()};
$('helpBtn').onclick=()=>{$('menuOv').hidden=true;openPanel('도움말',b=>{const p=document.createElement('div');p.style.textAlign='left';p.innerHTML='<p>🔥 <b>모닥불</b>에 통나무·석탄·연료통을 넣으면 오래 타고 단계가 올라가요. 단계가 오르면 빛이 넓어지고 안개가 걷혀 숲이 넓어져요.</p><p>🌙 <b>밤</b>에는 모닥불 빛 안이 안전해요. 늑대는 빛을 무서워해요. 사슴 대장과 부엉 대장은 손전등으로 비추면 꼼짝 못 해요.</p><p>🎒 <b>가방</b>이 차면 캠프 창고에 재료를 넣어요. 작업대와 털 상인은 창고 재료도 써요.</p><p>🍖 배고프면 가방의 음식을 눌러 먹어요. 생고기는 모닥불에서 구워요.</p><p>🧸 동굴의 대장 늑대를 혼내면 아기를 데려올 수 있어요.</p>';b.appendChild(p)})};
function title(){$('titleOv').hidden=false;const sv=load();$('contBtn').hidden=!sv;if(sv)$('contBtn').textContent='이어 하기 · '+sv.night+(sv.day?'일째 낮':'번째 밤')}
function begin(sv){S=sv||fresh();if(!S.ms)S.ms={};P.x=S.px;P.y=S.py;P.inv=1;P.bat=100;P.flash=false;drops=[];populate();started=true;paused=false;$('titleOv').hidden=true;$('flashBtn').hidden=!(S.tools.flash||S.tools.strongflash);bagUI();hud();snd('go');
  if(!sv)setTimeout0(()=>banner('🔥 숲속 99밤 시작!','모닥불을 지켜요'),.3);else toast('다시 왔어요! '+S.night+(S.day?'일째 낮':'번째 밤'))}
$('newBtn').onclick=()=>{if(load()&&!confirm('지금 숲을 버리고 새로 시작할까요?'))return;snd('click');begin(null);store()};
$('contBtn').onclick=()=>{snd('click');begin(load())};

let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(started)update(dt);else time+=dt;draw()}
P.x=C0.x+60;P.y=C0.y+60;title();bagUI();requestAnimationFrame(frame);
window.__f9={get S(){return S},P,act,begin,get animals(){return animals},trees,caves,chests,get drops(){return drops},keys,target,lightR,exploreR,fireLv,setAct:v=>actHeld=v,useItem};
});
