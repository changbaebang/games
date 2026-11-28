/* 계란 훔치기 — 게임 동작
 * 지역·둥지·경비·알 등급·펫·가게 값은 모두 data.json 에서 읽어요.
 * 진행 상황은 이 기기의 localStorage('eggSteal.save')에 저장돼요. */
Arcade.boot(D=>{
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2,snd=(...a)=>window.Arcade&&Arcade.play(...a);
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const WH=D.world.height,BW=D.world.baseWidth,RAR=D.rarities,RK=Object.keys(RAR),UP=D.upgrades;
let W,H,DPR,Z;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px';Z=clamp(Math.min(W,H)/560,.6,1.4)}
addEventListener('resize',resize);resize();

// ---------- 세계 만들기
let x0=BW;const BI=D.biomes.map(b=>{const o=Object.assign({},b,{x0});x0+=b.width;return o});const WORLDW=x0;
const INC=[[110,150],[110,250],[110,350],[110,450]],SHOP=[110,566],SPAWN=[300,560];
const PEN=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)PEN.push([212+c*60,110+r*96]);
let seed=7;const sr=()=>(seed=seed*16807%2147483647)/2147483647;
const deco=[];for(const b of BI)for(let i=0;i<Math.round(b.width/38);i++){const x=b.x0+40+sr()*(b.width-80),y=30+sr()*(WH-60);if(b.nests.some(([nx,ny])=>Math.hypot(b.x0+nx-x,ny-y)<70))continue;deco.push({x,y,k:b.decoKind,c:b.deco,s:.7+sr()*.6})}
const nests=[];BI.forEach((b,bi)=>b.nests.forEach(([x,y])=>nests.push({x:b.x0+x,y,bi,egg:null,t:rand(0,2)})));

// ---------- 저장 상태
const KEY='eggSteal.save';
function fresh(){return {coins:D.start.coins,up:{speed:0,incubator:0,pen:0,stealth:0,hatch:0},open:[BI[0].id],pets:[],incs:[],bank:0,stolen:0,t:Date.now(),ach:{},streak:0,best:0,sparkles:0,seen:{}}}
let S=null;try{S=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
const hasSave=!!(S&&S.up);if(!hasSave)S=fresh();S.ach=S.ach||{};S.streak=S.streak||0;S.best=S.best||0;S.sparkles=S.sparkles||0;S.seen=S.seen||{};S.open=S.open.filter(id=>BI.some(b=>b.id===id));if(!S.open.length)S.open=[BI[0].id];
function save(){S.t=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const incCount=()=>D.start.incubators+S.up.incubator*UP.incubator.per,penCount=()=>D.start.pens+S.up.pen*UP.pen.per;
const petCoins=p=>RAR[p.r].pets[p.p].coins*(p.m?D.mutations.find(m=>m.id===p.m).mult:1);
const income=()=>S.pets.reduce((s,p)=>s+petCoins(p),0);
const isOpen=bi=>S.open.includes(BI[bi].id);
const cost=k=>Math.round(UP[k].base*Math.pow(UP[k].growth,S.up[k]));
const fmt=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1)+'백만':Math.floor(n).toLocaleString();

// ---------- 플레이어·경비
const P={x:SPAWN[0],y:SPAWN[1],carry:null,stun:0,face:0,walk:0,bi:-1};
const guards=[];BI.forEach((b,bi)=>{for(let i=0;i<b.guards.count;i++)guards.push({bi,x:b.x0+rand(80,b.width-80),y:rand(80,WH-80),dir:rand(0,TAU),tx:0,ty:0,wait:rand(0,2),state:'patrol',lost:0,alert:0})});
function pickRarity(b){let tot=0;for(const k in b.eggs)tot+=b.eggs[k];let r=Math.random()*tot;for(const k in b.eggs){if((r-=b.eggs[k])<0)return k}return Object.keys(b.eggs)[0]}

// ---------- 입력
const keys={},joy={on:false,id:null,ox:0,oy:0,x:0,y:0};
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();if((e.code==='KeyE'||e.code==='Space')&&!$('actBtn').hidden)$('actBtn').click()});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
cv.addEventListener('pointerdown',e=>{if(joy.id!==null)return;Object.assign(joy,{on:true,id:e.pointerId,ox:e.clientX,oy:e.clientY,x:0,y:0});cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=55;if(l>M){joy.ox+=dx/l*(l-M);joy.oy+=dy/l*(l-M);dx=dx/l*M;dy=dy/l*M}joy.x=dx/M;joy.y=dy/M});
const jEnd=e=>{if(e.pointerId===joy.id)Object.assign(joy,{on:false,id:null,x:0,y:0})};cv.addEventListener('pointerup',jEnd);cv.addEventListener('pointercancel',jEnd);

// ---------- 알림
function toast(t){const d=document.createElement('div');d.textContent=t;$('toast').append(d);setTimeout(()=>d.remove(),2700);const tb=$('toast');if(tb.children.length>3)tb.children[0].remove()}
const pops=[];function pop(x,y,t,c){pops.push({x,y,t,c,life:1.2})}

// ---------- 업적
function achCheck(){for(const a of D.achievements||[]){if(S.ach[a.id])continue;let ok=false;
    if(a.stolen)ok=S.stolen>=a.stolen;else if(a.rarity)ok=!!S.seen['r_'+a.rarity];else if(a.mutation)ok=!!S.seen['m_'+a.mutation];else if(a.streak)ok=S.best>=a.streak;else if(a.open)ok=S.open.length>=a.open;else if(a.sparkle)ok=S.sparkles>=a.sparkle;
    if(ok){S.ach[a.id]=1;S.coins+=a.reward;banner('🏆 '+a.name,'보상 금화 +'+fmt(a.reward));snd('win');save()}}}
let bannerQ=[],bannerT=0;function banner(t,sub){bannerQ.push([t,sub])}
function updBanner(dt){const el=$('banner');if(bannerT>0){bannerT-=dt;if(bannerT<=0)el.classList.remove('on');return}if(bannerQ.length){const [t,sub]=bannerQ.shift();el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=t;el.querySelector('small').textContent=sub;el.classList.add('on');bannerT=2.6}}

// ---------- 부화·수입
function hatch(slot){const r=slot.r,pl=RAR[r].pets,p=Math.floor(Math.random()*pl.length);let m=null;for(const mu of D.mutations)if(Math.random()<mu.chance){m=mu.id;break}if(!m&&slot.sp){const ms=D.mutations;m=ms[Math.random()<.25?0:Math.random()<.6?1:2].id}
  if(!S.seen['r_'+r]&&r!=='common'){S.seen['r_'+r]=1;banner('✨ 처음 만난 '+RAR[r].name+' 펫!',pl[p].name+'가 태어났어요')}if(m&&!S.seen['m_'+m]){S.seen['m_'+m]=1}setTimeout(achCheck,300);
  const pet={r,p,m};if(S.pets.length<penCount()){S.pets.push(pet);const mu=m?D.mutations.find(q=>q.id===m).name+' ':'';toast(`${mu}${pl[p].name}가 태어났어요! 초당 +${fmt(petCoins(pet))}`);snd(m?'win':'level');return true}
  let wi=-1;S.pets.forEach((q,i)=>{if(wi<0||petCoins(q)<petCoins(S.pets[wi]))wi=i});
  if(wi>=0&&petCoins(pet)>petCoins(S.pets[wi])){const old=S.pets[wi],val=Math.round(petCoins(old)*30);S.coins+=val;S.pets[wi]=pet;toast(`${pl[p].name}가 태어나서 ${RAR[old.r].pets[old.p].name}를 팔았어요 (+${fmt(val)})`);snd('level');return true}
  slot.ready=pet;return false}
function tick(dt){
  S.bank+=income()*dt;
  const hk=1-UP.hatch.per*S.up.hatch;
  for(let i=0;i<S.incs.length;i++){const s=S.incs[i];if(!s)continue;if(s.ready){if(S.pets.length<penCount()){S.pets.push(s.ready);toast(`${RAR[s.ready.r].pets[s.ready.p].name}가 우리로 들어갔어요`);S.incs[i]=null}continue}
    s.left-=dt/hk;if(s.left<=0){if(hatch(s))S.incs[i]=null;else if(!s.warned){s.warned=true;toast('우리가 가득 찼어요. 가게에서 펫을 팔거나 우리를 넓혀요')}}}
}
// 자리를 비운 시간만큼 진행
if(hasSave){const away=Math.min(D.offline.maxHours*3600,Math.max(0,(Date.now()-S.t)/1000));if(away>30){const before=S.bank;S.bank+=income()*away*D.offline.rate;
  for(const s of S.incs)if(s&&!s.ready)s.left-=away;const got=S.bank-before;if(got>=1)setTimeout(()=>toast(`자리를 비운 동안 금화 ${fmt(got)}개가 쌓였어요`),600)}}

// ---------- 업데이트
let shake=0,flashT=0,biomeNote=-2,sparkT=8;
function update(dt){
  tick(dt);
  for(const n of nests){if(!n.egg&&isOpen(n.bi)){n.t-=dt;if(n.t<=0)n.egg={r:pickRarity(BI[n.bi])}}}
  sparkT-=dt;if(sparkT<=0){sparkT=D.sparkle.every;const cand=nests.filter(n=>isOpen(n.bi)&&n.egg&&!n.egg.sp);if(cand.length){const n=cand[Math.floor(Math.random()*cand.length)];const ord=Object.keys(RAR);n.egg={r:ord[Math.min(ord.length-1,ord.indexOf(n.egg.r)+1)],sp:true};toast('✨ '+BI[n.bi].name+'에 반짝 알이 나타났어요!');snd('alert')}}
  updBanner(dt);
  // 이동
  P.stun=Math.max(0,P.stun-dt);
  let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x,my=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+joy.y;
  const ml=Math.hypot(mx,my);
  if(ml>.12&&!P.stun){const k=Math.min(1,ml),sp=D.player.speed*(1+UP.speed.per*S.up.speed)*(P.carry?1-RAR[P.carry.r].weight:1);
    P.x+=mx/ml*sp*k*dt;P.y+=my/ml*sp*k*dt;P.face=Math.atan2(my,mx);P.walk+=dt*sp/12}
  const R=D.player.radius;P.y=clamp(P.y,R,WH-R);
  let maxX=WORLDW-R;for(let i=0;i<BI.length;i++)if(!isOpen(i)){maxX=BI[i].x0-R-6;break}P.x=clamp(P.x,R,maxX);
  // 지역
  const bi=P.x<BW?-1:BI.findIndex(b=>P.x>=b.x0&&P.x<b.x0+b.width);if(bi!==P.bi){P.bi=bi;if(bi>=0&&biomeNote!==bi){biomeNote=bi;toast(BI[bi].name)}}
  // 둥지에서 알 들기
  if(!P.carry)for(const n of nests)if(n.egg&&Math.hypot(n.x-P.x,n.y-P.y)<26){P.carry={r:n.egg.r,nest:n,sp:n.egg.sp};n.egg=null;n.t=BI[n.bi].respawn;snd('pop');
    for(const g of guards)if(g.bi===n.bi&&g.state==='patrol'&&Math.hypot(g.x-n.x,g.y-n.y)<320){g.dir=Math.atan2(n.y-g.y,n.x-g.x);g.wait=.6}break}
  // 기지: 금화 모으기, 부화기에 알 놓기
  if(P.x<BW){if(S.bank>=1){const g=Math.floor(S.bank);S.coins+=g;S.bank-=g;if(g>0&&(collectT-=dt)<=0){collectT=.35;snd('coin');pop(P.x,P.y-30,'+'+fmt(g),'#ffd23f')}}
    if(P.carry)for(let i=0;i<incCount();i++){const [ix,iy]=INC[i];if(Math.hypot(ix-P.x,iy-P.y)<40){if(!S.incs[i]){S.incs[i]={r:P.carry.r,left:RAR[P.carry.r].hatch,sp:P.carry.sp};S.stolen++;if(P.carry.sp)S.sparkles++;P.carry=null;S.streak++;S.best=Math.max(S.best,S.streak);snd('power');
            const base=Math.max(10,Math.round(income()*3)),bonus=Math.round(base*(1+D.streak.bonus*Math.min(D.streak.max,S.streak-1)));S.coins+=bonus;pop(P.x,P.y-40,'+'+fmt(bonus)+(S.streak>1?' 🔥x'+S.streak:''),'#ffd23f');
            toast(`${RAR[S.incs[i].r].name} 알을 부화기에 넣었어요${S.streak>1?' · '+S.streak+'연속 성공!':''}`);achCheck();if(window.Arcade)Arcade.record('eggStealCount',S.stolen)}break}}}
  // 경비
  const stealth=1-UP.stealth.per*S.up.stealth;
  for(const g of guards){if(!isOpen(g.bi)){continue}const b=BI[g.bi],G=b.guards,dx=P.x-g.x,dy=P.y-g.y,d=Math.hypot(dx,dy);
    const vis=G.vision*stealth*(P.carry?1.25:1);let da=Math.atan2(dy,dx)-g.dir;da=Math.atan2(Math.sin(da),Math.cos(da));
    const inB=P.x>b.x0-20&&P.x<b.x0+b.width+20;const sees=inB&&!P.stun&&d<vis&&Math.abs(da)<G.angle*Math.PI/360;
    g.alert=Math.max(0,g.alert-dt);
    if(g.state==='patrol'){if(sees&&P.carry){g.state='chase';g.lost=0;g.alert=1;snd('alert')}else if(sees){g.peek=.6;g.dir+=Math.max(-dt*3,Math.min(dt*3,Math.atan2(Math.sin(da),Math.cos(da))))}
      else if(g.wait>0){g.wait-=dt;g.dir+=Math.sin(performance.now()/600+g.x)*dt*.8}
      else{if(!g.tx||Math.hypot(g.tx-g.x,g.ty-g.y)<8){g.tx=b.x0+rand(60,b.width-60);g.ty=rand(60,WH-60);g.wait=rand(.4,1.6)}
        const a=Math.atan2(g.ty-g.y,g.tx-g.x);g.dir=a;g.x+=Math.cos(a)*G.speed*dt;g.y+=Math.sin(a)*G.speed*dt}}
    else{if(!P.carry){g.state='patrol';g.tx=0;g.wait=1}g.dir=Math.atan2(dy,dx);const mySp=D.player.speed*(1+UP.speed.per*S.up.speed)*(P.carry?1-RAR[P.carry.r].weight:1);const cs=Math.min(G.chase,mySp*.82);if(inB&&!P.stun){g.x+=Math.cos(g.dir)*cs*dt;g.y+=Math.sin(g.dir)*cs*dt}
      if(!sees&&(d>vis*1.6||!inB))g.lost+=dt;else g.lost=0;if(g.lost>1.2||P.stun){g.state='patrol';g.tx=0;g.wait=1}
      if(d<D.player.radius+15&&!P.stun)caught()}
    g.x=clamp(g.x,b.x0+20,b.x0+b.width-20);g.y=clamp(g.y,20,WH-20)}
  // 문 앞 버튼
  updateAction();
  if((saveT-=dt)<=0){saveT=5;save()}
  if(window.Arcade&&(recT-=dt)<=0){recT=3;Arcade.record('eggStealIncome',Math.round(income()))}
}
let collectT=0,saveT=5,recT=1;
function caught(){S.streak=0;if(P.carry){const n=P.carry.nest;if(!n.egg){n.egg={r:P.carry.r};n.t=0}P.carry=null;toast('잡혔어요! 알을 돌려주고 기지로 돌아가요')}else toast('잡혔어요! 기지로 돌아가요');
  snd('hurt');shake=.4;flashT=.5;P.stun=D.caughtStun;P.x=SPAWN[0];P.y=SPAWN[1];for(const g of guards){g.state='patrol';g.tx=0}}

// ---------- 상황 버튼 (문 열기 / 가게)
let actFn=null;
function updateAction(){const b=$('actBtn');let label=null,fn=null,dis=false;
  for(let i=0;i<BI.length;i++)if(!isOpen(i)){if(Math.abs(P.x-(BI[i].x0-D.player.radius-6))<40){const c=BI[i].cost;label=`${BI[i].name} 문 열기 · 금화 ${fmt(c)}`;dis=S.coins<c;fn=()=>{if(S.coins<c)return;S.coins-=c;S.open.push(BI[i].id);setTimeout(achCheck,400);snd('win');toast(`${BI[i].name}이(가) 열렸어요!`);save()}}break}
  if(!label&&Math.hypot(P.x-SHOP[0],P.y-SHOP[1])<50){label='가게 열기';fn=openShop}
  if(label){if(b.textContent!==label)b.textContent=label;b.disabled=dis;b.hidden=false;actFn=fn}else{b.hidden=true;actFn=null}}
$('actBtn').onclick=()=>{if(actFn&&!$('actBtn').disabled)actFn()};

// ---------- 가게
function openShop(){renderShop();$('shopOv').hidden=false;running=false;snd('click')}
$('shopClose').onclick=()=>{$('shopOv').hidden=true;running=true;save()};$('shopBtn').onclick=openShop;
function renderShop(){$('sCoins').textContent=fmt(S.coins);const ups=$('ups');ups.innerHTML='';
  for(const k in UP){const u=UP[k],lv=S.up[k],max=lv>=u.max,c=cost(k);const d=document.createElement('div');d.className='up';
    const b=document.createElement('b');b.textContent=`${u.name} ${lv}/${u.max}`;const i=document.createElement('i');i.textContent=u.desc;
    const btn=document.createElement('button');btn.className='buy';btn.textContent=max?'최대':`금화 ${fmt(c)}`;btn.disabled=max||S.coins<c;
    btn.onclick=()=>{if(S.coins<c||max)return;S.coins-=c;S.up[k]++;snd('power');save();renderShop()};d.append(b,i,btn);ups.append(d)}
  $('penInfo').textContent=`(${S.pets.length}/${penCount()}자리 · 초당 금화 ${fmt(income())})`;const pl=$('petList');pl.innerHTML='';
  if(!S.pets.length){const e=document.createElement('p');e.className='empty';e.textContent='아직 펫이 없어요. 알을 훔쳐 부화시켜 보세요!';pl.append(e)}
  [...S.pets].map((p,i)=>[p,i]).sort((a,b)=>petCoins(b[0])-petCoins(a[0])).forEach(([p,i])=>{const def=RAR[p.r].pets[p.p],mu=p.m?D.mutations.find(m=>m.id===p.m):null;
    const d=document.createElement('div');d.className='pet';d.style.setProperty('--c',RAR[p.r].color);
    const b=document.createElement('b');b.textContent=(mu?mu.name+' ':'')+def.name;const t=document.createElement('span');t.textContent=`${RAR[p.r].name} · 초당 ${fmt(petCoins(p))}`;
    const sell=document.createElement('button');sell.className='sell';const val=Math.round(petCoins(p)*30);sell.textContent=`팔기 +${fmt(val)}`;
    sell.onclick=()=>{S.pets.splice(i,1);S.coins+=val;snd('coin');save();renderShop()};d.append(b,t,sell);pl.append(d)})}

// ---------- 그리기
const mutOf=p=>p.m?D.mutations.find(m=>m.id===p.m):null;
function eggDraw(x,y,s,r,t){const R=RAR[r];ctx.save();ctx.translate(x,y);
  if(r==='legend'||r==='mythic'){ctx.fillStyle=r==='mythic'?'rgba(255,90,138,.25)':'rgba(255,210,63,.3)';ctx.beginPath();ctx.arc(0,0,s*1.7+Math.sin(t*5)*2,0,TAU);ctx.fill()}
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(2,s*.9,s*.8,s*.25,0,0,TAU);ctx.fill();
  ctx.fillStyle=R.color;ctx.beginPath();ctx.moveTo(0,-s*1.15);ctx.bezierCurveTo(s*.95,-s*1.15,s,s*.85,0,s*.85);ctx.bezierCurveTo(-s,s*.85,-s*.95,-s*1.15,0,-s*1.15);ctx.fill();
  ctx.fillStyle=R.spot;for(const [a,b,c] of [[-.35,-.2,.18],[.3,.15,.15],[-.05,.45,.12]]){ctx.beginPath();ctx.arc(a*s,b*s,c*s,0,TAU);ctx.fill()}
  ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.ellipse(-s*.35,-s*.55,s*.13,s*.24,-.4,0,TAU);ctx.fill();ctx.restore()}
function petDraw(x,y,s,p,t){const def=RAR[p.r].pets[p.p],mu=mutOf(p),k=mu&&mu.scale?mu.scale:1;s*=k;ctx.save();ctx.translate(x,y+Math.sin(t*4+x)*1.5);
  let c=def.c;if(mu&&mu.c==='rainbow'){const g=ctx.createLinearGradient(-s,-s,s,s);['#ff5a5a','#ffd23f','#5fd35a','#4a9dff','#b06bff'].forEach((q,i)=>g.addColorStop(i/4,q));c=g}else if(mu&&mu.id==='gold')c='#ffd23f';
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,s*.85,s*.85,s*.25,0,0,TAU);ctx.fill();
  ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(-s*.8,-s*.6,s*1.6,s*1.4,s*.45);ctx.fill();ctx.beginPath();ctx.roundRect(-s*.7,-s*1.1,s*.42,s*.6,s*.2);ctx.roundRect(s*.28,-s*1.1,s*.42,s*.6,s*.2);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-s*.8,-s*.6,s*1.6,s*1.4,s*.45);ctx.stroke();
  ctx.fillStyle='#2c2418';ctx.fillRect(-s*.38,-s*.15,s*.18,s*.24);ctx.fillRect(s*.2,-s*.15,s*.18,s*.24);ctx.fillStyle='rgba(255,120,140,.5)';ctx.fillRect(-s*.6,s*.15,s*.22,s*.12);ctx.fillRect(s*.38,s*.15,s*.22,s*.12);
  if(p.r==='legend'||p.r==='mythic'){ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.moveTo(-s*.4,-s*.6);ctx.lineTo(-s*.25,-s*.95);ctx.lineTo(0,-s*.7);ctx.lineTo(s*.25,-s*.95);ctx.lineTo(s*.4,-s*.6);ctx.fill()}
  ctx.restore()}
function decoDraw(o){const s=o.s*20;ctx.save();ctx.translate(o.x,o.y);ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(4,s*.6,s*.9,s*.35,0,0,TAU);ctx.fill();ctx.fillStyle=o.c;
  if(o.k==='tree'){ctx.beginPath();ctx.arc(0,0,s,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.15)';ctx.beginPath();ctx.arc(-s*.3,-s*.3,s*.45,0,TAU);ctx.fill()}
  else if(o.k==='cactus'){ctx.fillRect(-s*.2,-s,s*.4,s*1.6);ctx.fillRect(-s*.7,-s*.4,s*.5,s*.25);ctx.fillRect(-s*.7,-s*.8,s*.22,s*.6);ctx.fillRect(s*.2,-s*.2,s*.5,s*.25);ctx.fillRect(s*.48,-s*.6,s*.22,s*.6)}
  else if(o.k==='pine'){ctx.beginPath();ctx.moveTo(0,-s*1.3);ctx.lineTo(s*.9,s*.6);ctx.lineTo(-s*.9,s*.6);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-s*1.3);ctx.lineTo(s*.35,-s*.55);ctx.lineTo(-s*.35,-s*.55);ctx.fill()}
  else if(o.k==='rock'){ctx.fillStyle='#3a2622';ctx.beginPath();ctx.roundRect(-s*.8,-s*.6,s*1.6,s*1.2,s*.3);ctx.fill();ctx.fillStyle=o.c;ctx.fillRect(-s*.3,-s*.2,s*.6,s*.12);ctx.fillRect(-s*.1,-s*.5,s*.12,s*.5)}
  else if(o.k==='mushroom'){ctx.fillStyle='#f4ead8';ctx.fillRect(-s*.18,-s*.2,s*.36,s*.8);ctx.fillStyle=o.c;ctx.beginPath();ctx.ellipse(0,-s*.2,s*.8,s*.55,0,Math.PI,0);ctx.fill();ctx.fillStyle='#fff';for(const [a,b] of [[-.4,-.45],[.2,-.6],[.45,-.3]]){ctx.beginPath();ctx.arc(a*s,b*s,s*.12,0,TAU);ctx.fill()}}
  else if(o.k==='candy'){ctx.fillStyle='#fff';ctx.fillRect(-s*.07,-s*.2,s*.14,s*.9);ctx.fillStyle=o.c;ctx.beginPath();ctx.arc(0,-s*.45,s*.5,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=s*.12;ctx.beginPath();ctx.arc(0,-s*.45,s*.28,0,Math.PI*1.5);ctx.stroke()}
  else if(o.k==='star'){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s*.3:s*.7;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill()}
  else{ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(-s*.5,0,s*.6,0,TAU);ctx.arc(s*.3,-s*.2,s*.75,0,TAU);ctx.arc(s*.8,s*.15,s*.5,0,TAU);ctx.fill()}
  ctx.restore()}
function person(x,y,body,head,face,walk,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);const w=Math.sin(walk)*4;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,15,13,5,0,0,TAU);ctx.fill();
  ctx.fillStyle='#3a4a6a';ctx.fillRect(-8,6+w*.3,6,10);ctx.fillRect(2,6-w*.3,6,10);
  ctx.fillStyle=body;ctx.fillRect(-11,-8,22,16);ctx.fillStyle=head;ctx.fillRect(-9,-24,18,17);
  ctx.fillStyle='#2c2418';const fx=Math.cos(face)*3;ctx.fillRect(-5+fx,-18,3,4);ctx.fillRect(2+fx,-18,3,4);ctx.restore()}
let T=0;
function draw(dt){T+=dt;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#3a2e22';ctx.fillRect(0,0,W,H);
  const cx=clamp(P.x,W/2/Z,WORLDW-W/2/Z),cy=clamp(P.y,H/2/Z-60,WH-H/2/Z+60);shake=Math.max(0,shake-dt);
  ctx.setTransform(DPR*Z,0,0,DPR*Z,DPR*(W/2-cx*Z+(Math.random()-.5)*shake*20),DPR*(H/2-cy*Z));
  const vx0=cx-W/2/Z-40,vx1=cx+W/2/Z+40;
  // 기지
  ctx.fillStyle='#e8d2a6';ctx.fillRect(0,0,BW,WH);ctx.fillStyle='rgba(160,110,60,.15)';for(let y=0;y<WH;y+=32)ctx.fillRect(0,y,BW,3);
  ctx.fillStyle='#c98a4a';ctx.fillRect(BW-10,0,10,WH);
  // 지역 바닥
  for(const [bi,b] of BI.entries()){if(b.x0>vx1||b.x0+b.width<vx0)continue;for(let x=0;x<b.width;x+=48)for(let y=0;y<WH;y+=48){ctx.fillStyle=((x+y)/48)&1?b.ground:b.ground2;ctx.fillRect(b.x0+x,y,48,48)}
    if(!isOpen(bi)){ctx.fillStyle='rgba(30,20,10,.35)';ctx.fillRect(b.x0,0,b.width,WH)}}
  for(const o of deco)if(o.x>vx0&&o.x<vx1)decoDraw(o);
  // 문
  for(const [bi,b] of BI.entries()){if(bi===0)continue;const x=b.x0;if(x<vx0||x>vx1)continue;
    if(isOpen(bi)){ctx.fillStyle='#8a5a34';ctx.fillRect(x-6,0,12,WH*.38);ctx.fillRect(x-6,WH*.62,12,WH*.38)}
    else{ctx.fillStyle='#6a4a2a';for(let y=8;y<WH;y+=28)ctx.fillRect(x-7,y,14,20);ctx.fillStyle='#8a5a34';ctx.fillRect(x-10,WH*.25,20,10);ctx.fillRect(x-10,WH*.75,20,10);
      ctx.fillStyle='#ffcf3f';ctx.beginPath();ctx.roundRect(x-60,WH/2-34,120,68,12);ctx.fill();ctx.fillStyle='#3b2a00';ctx.font='15px Jua,sans-serif';ctx.textAlign='center';ctx.fillText(b.name,x,WH/2-8);ctx.font='18px Jua,sans-serif';ctx.fillText('금화 '+fmt(b.cost),x,WH/2+18)}}
  // 둥지
  for(const n of nests){if(n.x<vx0||n.x>vx1)continue;ctx.fillStyle='#9a6a34';ctx.beginPath();ctx.ellipse(n.x,n.y+6,28,13,0,0,TAU);ctx.fill();ctx.strokeStyle='#c8964e';ctx.lineWidth=3;for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(n.x,n.y+6,26-i,11,i*.5,0,Math.PI);ctx.stroke()}
    if(n.egg){if(n.egg.sp){ctx.fillStyle='rgba(255,246,160,.45)';ctx.beginPath();ctx.arc(n.x,n.y-6,24+Math.sin(T*6)*4,0,TAU);ctx.fill();ctx.fillStyle='#fff6a0';for(let k=0;k<4;k++){const a=T*2+k*1.57;ctx.fillRect(n.x+Math.cos(a)*22-2,n.y-6+Math.sin(a)*22-2,4,4)}}eggDraw(n.x,n.y-6,n.egg.sp?14:12,n.egg.r,T)}else if(isOpen(n.bi)){ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y-4,10,-Math.PI/2,-Math.PI/2+TAU*(1-n.t/BI[n.bi].respawn));ctx.stroke()}}
  // 부화기·우리·가게
  for(let i=0;i<INC.length;i++){const [x,y]=INC[i],on=i<incCount();ctx.globalAlpha=on?1:.3;ctx.fillStyle='#7a8a9a';ctx.beginPath();ctx.arc(x,y,32,0,TAU);ctx.fill();ctx.fillStyle='#c8d8e8';ctx.beginPath();ctx.arc(x,y,25,0,TAU);ctx.fill();
    const s=S.incs[i];if(on&&s){eggDraw(x,y,14,s.r,T);const hk=1-UP.hatch.per*S.up.hatch,tot=RAR[s.r].hatch*hk,pr=s.ready?1:1-Math.max(0,s.left)*hk/tot;ctx.strokeStyle=s.ready?'#ff6b4a':'#5fd35a';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,30,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,pr));ctx.stroke()}
    else if(on){ctx.fillStyle='#7a8a9a';ctx.font='13px Jua,sans-serif';ctx.textAlign='center';ctx.fillText('부화기',x,y+5)}ctx.globalAlpha=1}
  for(let i=0;i<PEN.length;i++){const [x,y]=PEN[i],on=i<penCount();if(!on){ctx.fillStyle='rgba(120,80,40,.12)';ctx.fillRect(x-26,y-36,52,72);continue}
    ctx.fillStyle='#d9bb84';ctx.fillRect(x-26,y-36,52,72);ctx.strokeStyle='#8a5a34';ctx.lineWidth=3;ctx.strokeRect(x-26,y-36,52,72);
    const p=S.pets[i];if(p){petDraw(x,y-4,14,p,T);ctx.fillStyle='#3b2a00';ctx.font='12px Jua,sans-serif';ctx.textAlign='center';ctx.fillText('+'+fmt(petCoins(p)),x,y+30)}}
  ctx.fillStyle='#ff8a5a';ctx.beginPath();ctx.roundRect(SHOP[0]-44,SHOP[1]-30,88,60,10);ctx.fill();ctx.fillStyle='#fff';for(let i=0;i<4;i++)ctx.fillRect(SHOP[0]-44+i*22,SHOP[1]-30,11,14);
  ctx.fillStyle='#3b2a00';ctx.font='18px Jua,sans-serif';ctx.textAlign='center';ctx.fillText('가게',SHOP[0],SHOP[1]+16);
  // 경비 시야와 몸
  for(const g of guards){if(!isOpen(g.bi)||g.x<vx0-200||g.x>vx1+200)continue;const G=BI[g.bi].guards,vis=G.vision*(1-UP.stealth.per*S.up.stealth)*(P.carry?1.25:1),a=G.angle*Math.PI/360;
    ctx.fillStyle=g.state==='chase'?'rgba(255,70,50,.22)':'rgba(255,230,80,.22)';ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.arc(g.x,g.y,vis,g.dir-a,g.dir+a);ctx.closePath();ctx.fill()}
  for(const g of guards){if(!isOpen(g.bi)||g.x<vx0||g.x>vx1)continue;person(g.x,g.y,'#d9483a','#f2c9a0',g.dir,T*8,1.05);ctx.fillStyle='#2c2418';ctx.fillRect(g.x-10,g.y-27,20,5);
    if(g.state==='chase'){ctx.fillStyle='#ff4a3a';ctx.font='26px Jua,sans-serif';ctx.textAlign='center';ctx.fillText('!',g.x,g.y-34)}else if(g.peek>0){g.peek-=dt;ctx.fillStyle='#ffd23f';ctx.font='22px Jua,sans-serif';ctx.textAlign='center';ctx.fillText('?',g.x,g.y-34)}}
  // 플레이어
  const blink=P.stun>0&&Math.floor(T*12)%2;if(!blink){person(P.x,P.y,'#2f7de1','#ffd23f',P.face,P.walk);if(P.carry){if(P.carry.sp){ctx.fillStyle='rgba(255,246,160,.5)';ctx.beginPath();ctx.arc(P.x,P.y-38,18,0,TAU);ctx.fill()}eggDraw(P.x,P.y-38,11,P.carry.r,T)}}
  ctx.font='20px Jua,sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#2c2418';
  for(const p of pops){p.life-=dt;p.y-=28*dt;ctx.globalAlpha=Math.min(1,p.life*2);ctx.strokeText(p.t,p.x,p.y);ctx.fillStyle=p.c;ctx.fillText(p.t,p.x,p.y)}ctx.globalAlpha=1;
  for(let i=pops.length-1;i>=0;i--)if(pops[i].life<=0)pops.splice(i,1);
  // 화면 위: 미니맵과 조이스틱
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const mw=Math.min(W-220,420),mx=(W-mw)/2,my=14+(W<600?44:0),k=mw/WORLDW;ctx.fillStyle='rgba(40,30,20,.6)';ctx.beginPath();ctx.roundRect(mx-4,my-4,mw+8,18,8);ctx.fill();
  ctx.fillStyle='#e8d2a6';ctx.fillRect(mx,my,BW*k,10);BI.forEach((b,i)=>{ctx.fillStyle=isOpen(i)?b.ground:'#5a4a3a';ctx.fillRect(mx+b.x0*k,my,b.width*k-1,10)});
  ctx.fillStyle='#2f7de1';ctx.beginPath();ctx.arc(mx+P.x*k,my+5,5,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  if(flashT>0){flashT-=dt;ctx.fillStyle=`rgba(255,60,40,${flashT*.5})`;ctx.fillRect(0,0,W,H)}
  if(joy.on){ctx.fillStyle='rgba(255,255,255,.15)';ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.ox,joy.oy,55,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.75)';ctx.beginPath();ctx.arc(joy.ox+joy.x*55,joy.oy+joy.y*55,24,0,TAU);ctx.fill()}
  // HUD
  $('hCoins').textContent=fmt(S.coins);$('hRate').textContent=`+${fmt(income())}/초`+(S.bank>=1&&P.x>=BW?` · 기지에 ${fmt(S.bank)}`:'');
  const hc=$('hCarry');if(P.carry){hc.hidden=false;hc.textContent=`${RAR[P.carry.r].name} 알을 들고 있어요 · 기지로!`}else hc.hidden=true}
if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h)};

// ---------- 시작
let running=false;
if(hasSave){$('contBtn').hidden=false;$('contBtn').textContent=`이어 하기 · 금화 ${fmt(S.coins)} · 펫 ${S.pets.length}마리`}
$('contBtn').onclick=()=>{$('titleOv').hidden=true;running=true;snd('click')};
$('newBtn').onclick=()=>{if(hasSave&&!newConfirm){newConfirm=true;$('newBtn').textContent='정말 처음부터? 한 번 더 누르세요';return}S=fresh();save();$('titleOv').hidden=true;running=true;snd('click')};
let newConfirm=false;
addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(running)update(dt);else tick(dt*0);draw(running?dt:0);requestAnimationFrame(frame)}
requestAnimationFrame(frame);
window.__es={get S(){return S},P,guards,nests,BI,keys,achCheck,get state(){return typeof state!=="undefined"?state:null}};
});
