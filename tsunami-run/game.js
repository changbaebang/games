/* 쓰나미 탈출 말랑이 — 길 끝에서 말랑이를 데려와 기지에서 금화를 벌어요. 파도가 오면 벽 구멍에 숨어요. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
const SAVE='tsunami.save',W=D.width,L=D.length,BASE=D.base+60;
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();
const fmt=n=>{n=Math.floor(n);if(n<1e4)return String(n);const u=[['조',1e12],['억',1e8],['만',1e4]];for(const [s,v] of u)if(n>=v){const q=n/v;return(q<10?q.toFixed(1).replace(/\.0$/,''):Math.floor(q))+s}return String(n)};
const RAR={},CR={},MUT={};D.rar.forEach((r,i)=>{r.i=i;RAR[r.id]=r});D.crit.forEach(c=>{CR[c.id]=c;const r=RAR[c.rar];const k=+c.id.replace(/\D/g,'');c.inc=Math.round(lerp(r.inc[0],r.inc[1],k/4))});for(const m of D.mut)MUT[m.id]=m;

// ---------- 저장
const S=Object.assign({coins:0,spd:0,carry:0,slots:0,rb:0,pads:[],dex:{},best:0,t:Date.now(),tut:0,total:0,firstR:{},hits:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||JSON.parse(localStorage.getItem(SAVE+'.bak'))||{}}catch(_){return {}}})());
function store(){S.t=Date.now();try{const s=JSON.stringify(S);localStorage.setItem(SAVE,s);localStorage.setItem(SAVE+'.bak',s)}catch(_){}}
const mult=()=>1+S.rb*D.rebirth.bonus;
const incOf=p=>CR[p.cid].inc*(p.mut?MUT[p.mut].x:1)*mult();
const totalInc=()=>S.pads.reduce((a,p)=>a+(p?incOf(p):0),0);
const speed=()=>(D.speed.base+S.spd*D.speed.step)*(1+S.rb*.05);
const carryMax=()=>D.carry.vals[S.carry];
const slotMax=()=>D.slots.vals[S.slots];

// ---------- 지도
const alcoves=[];{let y=-D.alcoveEvery,k=1;while(-y<L-100){alcoves.push({y,side:k%2?-1:1});if(-y<2800&&k%3===0)alcoves.push({y:y-20,side:k%2?1:-1});y-=D.alcoveEvery*(-y<2800?1:-y<4300?1.3:1.55);k++}}
function zoneOf(dist){let z=0;for(const r of D.rar)if(dist>=r.from)z=r.i;return z}
const regions=[[0,-L,W,L+BASE]];for(const a of alcoves)regions.push(a.side<0?[-74,a.y-46,74,92]:[W,a.y-46,74,92]);
const inReg=(x,y)=>regions.some(([rx,ry,rw,rh])=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh);
const free=(x,y,r=13)=>inReg(x-r,y-r)&&inReg(x+r,y-r)&&inReg(x-r,y+r)&&inReg(x+r,y+r);
// 기지 자리
const PADS=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)PADS.push({x:18+c*94,y:44+r*80,w:82,h:66});
const PLATE={x:130,y:372,w:140,h:44};

// ---------- 상태
const P={x:W/2,y:BASE-40,face:-Math.PI/2,walk:0,inv:0,carried:[]};
let state='title',paused=false,time=0,crits=[],waves=[],nextWave=D.firstWave,warned=false,pops=[],parts=[],shake=0,sparkleT=0,nextSparkle=D.sparkle.every,fullMsg=0,autoT=5;
function spawnCrit(zone){const r=D.rar[zone],top=zone+1<D.rar.length?D.rar[zone+1].from:L-40,lo=Math.max(r.from,120);
  let rz=zone;if(Math.random()<.05&&zone+1<D.rar.length)rz=zone+1;const pool=D.crit.filter(c=>c.rar===D.rar[rz].id);const c=pool[Math.floor(Math.random()*pool.length)];
  let mut=null;const k=sparkleT>0?3:1;for(const m of [...D.mut].reverse())if(Math.random()<m.p*k){mut=m.id;break}
  crits.push({cid:c.id,mut,x:rand(34,W-34),y:-rand(lo+30,top-30),zone,bob:Math.random()*6})}
function fillCrits(){for(let z=0;z<D.rar.length;z++){const n=crits.filter(c=>c.zone===z).length;for(let i=n;i<D.perZone;i++)spawnCrit(z)}}
const timers=[];function later(t,fn){timers.push({t,fn})}
function toast(t){const el=$('toast');const d=document.createElement('div');d.textContent=t;el.appendChild(d);for(let g=0;g<5&&el.children.length>3;g++)el.children[0].remove();later(2.6,()=>d.remove())}
let bq=[],bt=0;function banner(t,s,dur){bq.push([t,s,dur||2.6])}
function updBanner(dt){const el=$('banner');if(bt>0){bt-=dt;if(bt<=0)el.classList.remove('on');return}if(bq.length){const [t,s,d]=bq.shift();el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=t;el.querySelector('small').textContent=s;el.classList.add('on');bt=d}}
function pop(x,y,t,c,big){pops.push({x,y,t,c:c||'#fff',life:1.3,big})}

// ---------- 입력
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Escape')openMenu()});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
let joy=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,sx:e.clientX,sy:e.clientY,x:0,y:0,t:time}});
addEventListener('pointermove',e=>{if(!joy||e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=50;if(l>M){joy.ox+=dx/l*(l-M);joy.oy+=dy/l*(l-M);dx=dx/l*M;dy=dy/l*M}joy.x=dx/M;joy.y=dy/M});
addEventListener('pointerup',e=>{if(!joy||e.pointerId!==joy.id)return;const tap=time-joy.t<.3&&Math.hypot(e.clientX-joy.sx,e.clientY-joy.sy)<10;joy=null;if(tap)tapAt(e.clientX,e.clientY)});
addEventListener('pointercancel',()=>{joy=null});
function tapAt(sx,sy){const v=view();const wx=sx/v.s+v.x,wy=sy/v.s+v.y;PADS.forEach((p,i)=>{if(i<slotMax()&&S.pads[i]&&wx>=p.x&&wx<=p.x+p.w&&wy>=p.y&&wy<=p.y+p.h)openPad(i)})}

// ---------- 패널
function panel(title,build,btns){$('pTitle').textContent=title;const b=$('pBody');b.innerHTML='';build(b);const bb=$('pBtns');bb.innerHTML='';for(const [l,fn,soft] of btns){const e=document.createElement('button');e.className='btn'+(soft?' soft':'');e.textContent=l;e.onclick=()=>{snd('click');fn()};bb.appendChild(e)}$('panel').hidden=false;paused=true;joy=null}
const closePanel=()=>{$('panel').hidden=true;paused=false;store()};
function row(b,ic,name,desc,btn,ok,fn){const r=document.createElement('div');r.className='row';r.innerHTML='<div class="ic"></div><div class="nm"><b></b><small></small></div>';r.querySelector('.ic').textContent=ic;r.querySelector('b').textContent=name;r.querySelector('small').textContent=desc;if(btn){const e=document.createElement('button');e.textContent=btn;e.disabled=!ok;e.onclick=()=>{fn();snd('coin')};r.appendChild(e)}b.appendChild(r);return r}
function openShop(){$('shopBtn').classList.remove('glow');panel('🛒 기지 상점',b=>{const p=document.createElement('p');p.textContent='가진 금화 🪙 '+fmt(S.coins);b.appendChild(p);
  const sc=Math.round(D.speed.cost*Math.pow(D.speed.grow,S.spd));
  if(S.spd<D.speed.max)row(b,'👟','빠르기 '+(S.spd+1)+'단계','더 빨리 달려요 ('+Math.round(speed())+' → '+Math.round((D.speed.base+(S.spd+1)*D.speed.step)*(1+S.rb*.05))+')','🪙'+fmt(sc),S.coins>=sc,()=>{S.coins-=sc;S.spd++;if(S.tut===3)S.tut=4;openShop()});else row(b,'👟','빠르기 최고!','','',false);
  const cn=D.carry.cost[S.carry+1];if(cn!=null)row(b,'🎒','가방 '+D.carry.vals[S.carry+1]+'칸','말랑이를 한 번에 더 많이 들어요','🪙'+fmt(cn),S.coins>=cn,()=>{S.coins-=cn;S.carry++;openShop()});else row(b,'🎒','가방 최고!','','',false);
  const sl=D.slots.cost[S.slots+1];if(sl!=null)row(b,'🏠','기지 '+D.slots.vals[S.slots+1]+'자리','말랑이를 더 많이 놓아요','🪙'+fmt(sl),S.coins>=sl,()=>{S.coins-=sl;S.slots++;openShop()});else row(b,'🏠','기지 최고!','','',false);
  const rc=D.rebirth.cost*Math.pow(D.rebirth.grow,S.rb);row(b,'🌈','다시 태어나기 ('+S.rb+'번)','금화·빠르기·가방이 처음으로 돌아가요. 대신 금화 +'+Math.round(D.rebirth.bonus*100)+'%와 빠르기 +5%가 영원히! 기지 말랑이는 그대로예요','🪙'+fmt(rc),S.coins>=rc,()=>{S.coins=0;S.spd=0;S.carry=0;S.rb++;P.carried=[];banner('🌈 다시 태어났어요!','이제 금화를 '+Math.round(mult()*100)+'% 벌어요',3);snd('win');openShop()})},[['닫기',closePanel]])}
function openPad(i){const p=S.pads[i];const c=CR[p.cid],r=RAR[c.rar];const val=Math.round(incOf(p)*30);
  panel(c.name,b=>{b.appendChild(critCanvas(c,p.mut,90));const q=document.createElement('p');q.innerHTML='<b></b><br><span></span>';q.querySelector('b').textContent=r.name+(p.mut?' · '+MUT[p.mut].name:'');q.querySelector('b').style.color=r.c;q.querySelector('span').textContent='매초 🪙'+fmt(incOf(p))+' · 모인 금화 🪙'+fmt(p.bank);b.appendChild(q)},
  [['🪙 모으기',()=>{collect(i);closePanel()}],['팔기 (🪙'+fmt(val)+')',()=>{collect(i);S.coins+=val;S.pads[i]=null;snd('coin');toast(c.name+' 팔았어요 +'+fmt(val));closePanel()},1],['닫기',closePanel,1]])}
function openDex(){panel('📖 말랑이 도감',b=>{const n=Object.keys(S.dex).length;const p=document.createElement('p');p.textContent=n+' / '+D.crit.length+' 만났어요';b.appendChild(p);
  for(const r of D.rar){const h=document.createElement('div');h.className='rar';h.textContent=r.name+' · '+Math.round(r.from/10)+'m부터';h.style.color=r.c;b.appendChild(h);const g=document.createElement('div');g.className='dex';
    for(const c of D.crit.filter(c=>c.rar===r.id)){const d=document.createElement('div');const got=S.dex[c.id];if(!got)d.className='no';d.appendChild(critCanvas(c,got&&got.best||null,44,!got));const t=document.createElement('span');t.textContent=got?c.name:'???';d.appendChild(t);g.appendChild(d)}b.appendChild(g)}},[['닫기',closePanel]])}
function openMenu(){if(state!=='play')return;panel('잠깐 쉬기',b=>{const p=document.createElement('p');p.textContent='가장 멀리 '+Math.round(S.best/10)+'m · 다시 태어남 '+S.rb+'번 · 지금까지 번 금화 🪙'+fmt(S.total);b.appendChild(p);const q=document.createElement('p');q.className='small';q.textContent='💡 파도 표시가 빨개지면 가까운 🛟 구멍으로! 번개 파도는 아주 빨라요.';b.appendChild(q)},[['계속하기',closePanel],['처음 화면',()=>{closePanel();toTitle()},1]])}
$('shopBtn').onclick=()=>{if(state==='play'&&!paused){snd('click');openShop()}};$('dexBtn').onclick=()=>{if(state==='play'&&!paused){snd('click');openDex()}};$('menuBtn').onclick=()=>{snd('click');openMenu()};

// ---------- 놀이
function collect(i){const p=S.pads[i];if(!p||p.bank<1)return 0;const n=Math.floor(p.bank);p.bank-=n;S.coins+=n;S.total+=n;return n}
function hit(){if(P.inv>0)return;const lost=P.carried.length;P.carried=[];P.inv=1.5;shake=.4;snd('hurt');S.hits++;for(let i=0;i<20;i++)parts.push({x:P.x,y:P.y,vx:rand(-200,200),vy:rand(-260,60),life:.9,c:'#7ad8ff'});
  P.x=W/2;P.y=BASE-40;banner('💦 파도에 휩쓸렸어요!',lost?'들고 있던 말랑이 '+lost+'마리를 놓쳤어요. 파도가 오면 🛟 구멍에 숨어요!':'기지로 돌아왔어요. 🛟 구멍에 숨으면 안전해요',3)}
function pickWave(){const pool=D.waves.filter(w=>S.best>=w.from);let t=pool.reduce((a,w)=>a+w.w,0)*Math.random();for(const w of pool){t-=w.w;if(t<=0)return w}return pool[0]}
let pending=null;
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}updBanner(dt);
  if(paused||state!=='play'){for(const p of pops)p.life-=dt;return}
  P.inv=Math.max(0,P.inv-dt);shake=Math.max(0,shake-dt);
  // 움직이기
  let mx=0,my=0;if(keys.arrowleft||keys.a)mx--;if(keys.arrowright||keys.d)mx++;if(keys.arrowup||keys.w)my--;if(keys.arrowdown||keys.s)my++;if(joy){mx=joy.x;my=joy.y}const ml=Math.hypot(mx,my);
  if(ml>.12){const sp=speed()*Math.min(1,ml),vx=mx/Math.max(1,ml)*sp*dt,vy=my/Math.max(1,ml)*sp*dt;if(free(P.x+vx,P.y))P.x+=vx;if(free(P.x,P.y+vy))P.y+=vy;P.face=Math.atan2(my,mx);P.walk+=dt*14}
  const dist=-P.y;if(dist>S.best){const oz=zoneOf(S.best);S.best=dist;const nz=zoneOf(dist);if(nz>oz){const r=D.rar[nz];banner('✨ '+r.name+' 구역!','더 귀한 말랑이가 있어요',2.2);snd('level')}}
  // 말랑이 줍기
  for(let i=crits.length-1;i>=0;i--){const c=crits[i];if(Math.hypot(c.x-P.x,c.y-P.y)<34){if(P.carried.length<carryMax()){crits.splice(i,1);P.carried.push({cid:c.cid,mut:c.mut});const cr=CR[c.cid],r=RAR[cr.rar];pop(P.x,P.y-50,(c.mut?MUT[c.mut].name+' ':'')+cr.name+'!',c.mut?MUT[c.mut].c:r.c,r.i>=3||c.mut);snd(r.i>=3?'win':'pop');
      if(!S.dex[c.cid]){S.dex[c.cid]={n:0};if(!S.firstR[cr.rar]&&r.i>=1){S.firstR[cr.rar]=1;banner('📖 처음 만난 '+r.name+' 말랑이!',cr.name)}}S.dex[c.cid].n++;if(c.mut)S.dex[c.cid].best=c.mut;if(S.tut===0)S.tut=1;later(rand(3,8),()=>spawnCrit(c.zone))}
    else if(time-fullMsg>3){fullMsg=time;toast('🎒 가방이 꽉 찼어요! 기지로 가요')}}}
  // 기지
  if(P.y>8){if(P.carried.length){const left=[];for(const c of P.carried){let i=-1;for(let k=0;k<slotMax();k++)if(!S.pads[k]){i=k;break}if(i<0){left.push(c);continue}S.pads[i]={cid:c.cid,mut:c.mut,bank:0};pop(PADS[i].x+41,PADS[i].y,'⬇ '+CR[c.cid].name,'#fff');snd('place');if(S.tut===1)S.tut=2}
      if(left.length&&time-fullMsg>4){fullMsg=time;toast('🏠 기지가 꽉 찼어요! 말랑이를 눌러 팔거나 상점에서 자리를 늘려요')}P.carried=left;store()}
    let got=0;PADS.forEach((p,i)=>{if(i<slotMax()&&P.x>p.x&&P.x<p.x+p.w&&P.y>p.y&&P.y<p.y+p.h)got+=collect(i)});
    if(P.x>PLATE.x&&P.x<PLATE.x+PLATE.w&&P.y>PLATE.y&&P.y<PLATE.y+PLATE.h)for(let i=0;i<S.pads.length;i++)got+=collect(i);
    if(got){pop(P.x,P.y-40,'🪙 +'+fmt(got),'#ffd23f');snd('coin');if(S.tut===2)S.tut=3}}
  if(S.tut===3&&S.coins>=Math.round(D.speed.cost*Math.pow(D.speed.grow,S.spd)))$('shopBtn').classList.add('glow');
  // 금화 벌기
  for(let i=0;i<S.pads.length;i++){const p=S.pads[i];if(p)p.bank+=incOf(p)*dt}
  // 반짝 시간
  nextSparkle-=dt;if(nextSparkle<=0){nextSparkle=D.sparkle.every;sparkleT=D.sparkle.len;banner('🌟 반짝 시간!','특별 무늬 말랑이가 3배 잘 나와요',2.6);snd('power');for(const c of crits)if(!c.mut&&Math.random()<.15)c.mut=D.mut[Math.random()<.75?0:1].id}sparkleT=Math.max(0,sparkleT-dt);
  // 파도
  nextWave-=dt;if(nextWave<=D.warnTime&&!pending){pending=S.hits===0&&!S.best?D.waves[0]:pickWave();snd('alert')}
  if(nextWave<=0&&pending){waves.push({y:-L-260,type:pending,sp:pending.speed});pending=null;nextWave=rand(...D.waveEvery);snd('whoosh')}
  const safe=P.y>0||P.x<-12||P.x>W+12;
  for(const w of waves){w.y+=w.sp*dt;if(!safe&&P.y-12<w.y&&P.y+12>w.y-240)hit();if(w.y>0&&!w.done){w.done=true;for(let i=0;i<30;i++)parts.push({x:rand(0,W),y:0,vx:rand(-60,60),vy:rand(-300,-80),life:1,c:'#bfefff'})}}
  waves=waves.filter(w=>w.y<260);
  // 표시
  let wTxt,wFill,danger=false;const near=waves.filter(w=>w.y<P.y+20).sort((a,b)=>b.y-a.y)[0];
  if(near){const d=Math.max(0,P.y-near.y);wTxt='🌊 '+near.type.name+' · '+Math.round(d/10)+'m';wFill=clamp(1-d/2500,0,1);danger=!safe&&d<900}
  else if(pending){wTxt='🌊 '+pending.name+'가 와요!';wFill=1;danger=!safe}
  else{wTxt='다음 파도 '+Math.ceil(nextWave)+'초';wFill=1-nextWave/D.waveEvery[1]}
  setT($('waveTxt'),wTxt);$('waveFill').style.width=Math.round(wFill*100)+'%';$('waveBar').classList.toggle('danger',danger);
  setT($('warn'),danger&&(near?P.y-near.y<500:true)?'🛟 벽 구멍에 숨어요!':'');P.danger=danger;
  if(danger&&S.tut>=1&&!S.waveTip){S.waveTip=1;toast('💡 양쪽 벽의 🛟 구멍에 들어가면 파도가 지나가요')}
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt}parts=parts.filter(p=>p.life>0);for(const p of pops){p.life-=dt;p.y-=30*dt}pops=pops.filter(p=>p.life>0);
  autoT-=dt;if(autoT<=0){autoT=5;store();const inc=Math.round(totalInc());Arcade.record&&Arcade.record('tsunamiInc',inc)}
  hud()}
function quest(){if(S.tut===0)return '⬆️ 위로 달려가 말랑이를 주워요';if(S.tut===1)return P.carried.length?'⬇️ 기지로 데려가요 (맨 아래)':'⬆️ 말랑이를 주워요';if(S.tut===2)return '💰 말랑이 발판이나 모으기 발판을 밟아 금화를 모아요';if(S.tut===3)return '🛒 오른쪽 위 상점에서 빠르기를 올려요';
  const nz=zoneOf(S.best)+1;if(nz<D.rar.length)return '🏁 다음: '+D.rar[nz].name+' 구역 ('+Math.round(D.rar[nz].from/10)+'m) · 지금 최고 '+Math.round(S.best/10)+'m';return ''}
function hud(){setT($('coinTxt'),fmt(S.coins));setT($('incTxt'),fmt(totalInc()));setT($('carryTxt'),P.carried.length+'/'+carryMax());setT($('quest'),quest())}

// ---------- 그리기
function view(){const s=Math.min(1.25,Wd/(W+170));const vw=Wd/s,vh=Ht/s;return {s,x:W/2-vw/2,y:clamp(P.y-vh*.62,-L-300,BASE+40-vh),vw,vh}}
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=clamp(Math.round(r+(255-r)*k),0,255);g=clamp(Math.round(g+(255-g)*k),0,255);b=clamp(Math.round(b+(255-b)*k),0,255);return `rgb(${r},${g},${b})`}
function draw(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#3a8ac8';ctx.fillRect(0,0,Wd,Ht);if(state==='title')return;
  const v=view();ctx.setTransform(DPR*v.s,0,0,DPR*v.s,-v.x*DPR*v.s+(shake>0?rand(-4,4):0),-v.y*DPR*v.s);
  const y0=v.y-20,y1=v.y+v.vh+20;
  // 바다 (양옆)
  ctx.fillStyle='#4a9ad8';ctx.fillRect(v.x,y0,v.vw,y1-y0);ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=3;for(let y=Math.floor(y0/60)*60;y<y1;y+=60){ctx.beginPath();for(let x=v.x;x<v.x+v.vw;x+=30)ctx.lineTo(x,y+Math.sin(x/30+time*2+y)*5);ctx.stroke()}
  // 벽
  ctx.fillStyle='#e8c890';ctx.fillRect(-90,Math.max(y0,-L-40),W+180,Math.min(y1,BASE+30)-Math.max(y0,-L-40));
  // 구역 바닥
  for(let z=0;z<D.rar.length;z++){const r=D.rar[z],top=z+1<D.rar.length?-D.rar[z+1].from:-L,bot=z===0?0:-r.from;if(bot<y0||top>y1)continue;ctx.fillStyle=z?shade(r.c,.72):'#f4e2b4';ctx.fillRect(0,top,W,bot-top);ctx.fillStyle=z?shade(r.c,.62):'#ecd6a2';for(let y=Math.floor(Math.max(top,y0)/80)*80;y<Math.min(bot,y1);y+=80)ctx.fillRect(0,y,W,40);
    if(z>0&&-r.from>y0&&-r.from<y1){ctx.fillStyle=r.c;ctx.fillRect(0,-r.from-4,W,8);ctx.font='22px Jua';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#fff';ctx.strokeText('✨ '+r.name+' 구역 · '+Math.round(r.from/10)+'m',W/2,-r.from-14);ctx.fillStyle=r.c;ctx.fillText('✨ '+r.name+' 구역 · '+Math.round(r.from/10)+'m',W/2,-r.from-14)}}
  ctx.fillStyle='#fff';ctx.font='15px Jua';ctx.textAlign='left';for(let m=500;m<L;m+=500)if(-m>y0&&-m<y1){ctx.globalAlpha=.6;ctx.fillText(m/10+'m',8,-m);ctx.globalAlpha=1}
  if(-L>y0){ctx.fillStyle='#7a5a3a';ctx.fillRect(0,-L-30,W,30);ctx.fillStyle='#fff';ctx.font='18px Jua';ctx.textAlign='center';ctx.fillText('🏁 길의 끝',W/2,-L-8)}
  // 숨는 구멍
  for(const a of alcoves){if(a.y<y0-60||a.y>y1+60)continue;const x=a.side<0?-74:W;ctx.fillStyle=P.danger?`rgba(255,240,120,${.6+.3*Math.sin(time*10)})`:'#f8e8c0';ctx.beginPath();ctx.roundRect(x,a.y-46,74,92,a.side<0?[16,0,0,16]:[0,16,16,0]);ctx.fill();ctx.strokeStyle='#ff6a5a';ctx.lineWidth=7;ctx.beginPath();ctx.arc(x+37,a.y,15,0,TAU);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=7;ctx.setLineDash([8,8]);ctx.beginPath();ctx.arc(x+37,a.y,15,0,TAU);ctx.stroke();ctx.setLineDash([])}
  // 기지
  if(y1>0){ctx.fillStyle='#c89a6a';ctx.fillRect(0,0,W,BASE);ctx.fillStyle='#b88a5a';for(let y=0;y<BASE;y+=24)ctx.fillRect(0,y,W,2);ctx.fillStyle='#fff';ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('🏠 내 기지 · 파도가 못 들어와요',W/2,24);
    PADS.forEach((p,i)=>{const open=i<slotMax();ctx.fillStyle=open?'#f4e4c8':'rgba(0,0,0,.18)';ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,12);ctx.fill();if(!open){ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='18px Jua';ctx.fillText('🔒',p.x+p.w/2,p.y+p.h/2+6);return}
      const c=S.pads[i];if(c){const cr=CR[c.cid];drawCrit(p.x+p.w/2,p.y+p.h/2+4,cr,c.mut,.8,i);ctx.fillStyle='#5a3a00';ctx.font='12px Jua';ctx.fillText('🪙'+fmt(c.bank),p.x+p.w/2,p.y+p.h-2)}else{ctx.fillStyle='#c8b090';ctx.font='12px Jua';ctx.fillText('빈자리',p.x+p.w/2,p.y+p.h/2+4)}});
    ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.roundRect(PLATE.x,PLATE.y,PLATE.w,PLATE.h,14);ctx.fill();ctx.fillStyle='#5a3a00';ctx.font='18px Jua';ctx.fillText('💰 모두 모으기',W/2,PLATE.y+28)}
  // 말랑이
  for(const c of crits)if(c.y>y0-40&&c.y<y1+40)drawCrit(c.x,c.y+Math.sin(time*3+c.bob)*3,CR[c.cid],c.mut,1,c.bob);
  // 나
  if(!(P.inv>0&&Math.floor(time*12)%2))drawMe(P.x,P.y);
  // 파도
  for(const w of waves){const top=w.y-240;if(w.y<y0||top>y1)continue;const g=ctx.createLinearGradient(0,top,0,w.y);g.addColorStop(0,'#1a5aa8');g.addColorStop(1,'#4ac0f0');ctx.fillStyle=g;ctx.fillRect(-90,top,W+180,240);
    ctx.fillStyle='#e8f8ff';ctx.beginPath();ctx.moveTo(-90,w.y);for(let x=-90;x<=W+90;x+=30)ctx.arc(x+15,w.y-2,15,Math.PI,0,false);ctx.lineTo(W+90,w.y-20);ctx.lineTo(-90,w.y-20);ctx.fill();
    const ex=W/2;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex-40,w.y-70,18,22,0,0,TAU);ctx.ellipse(ex+40,w.y-70,18,22,0,0,TAU);ctx.fill();ctx.fillStyle='#1a2a4a';ctx.beginPath();ctx.arc(ex-40,w.y-64,8,0,TAU);ctx.arc(ex+40,w.y-64,8,0,TAU);ctx.fill();ctx.strokeStyle='#1a2a4a';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ex,w.y-50,22,.2,Math.PI-.2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='18px Jua';ctx.textAlign='center';ctx.fillText(w.type.name,ex,w.y-110)}
  for(const p of parts){ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,4,0,TAU);ctx.fill()}
  // 숨는 곳 화살표
  if(P.danger&&P.y<0&&P.x>=0&&P.x<=W){let best=null,bd=1e9;for(const a of alcoves){const d=Math.abs(a.y-P.y)+(a.side<0?P.x:W-P.x)*.5;if(d<bd){bd=d;best=a}}if(best){const tx=best.side<0?-37:W+37;const a=Math.atan2(best.y-P.y,tx-P.x);ctx.save();ctx.translate(P.x+Math.cos(a)*46,P.y+Math.sin(a)*46);ctx.rotate(a);ctx.fillStyle='#ff5a4a';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-7,-10);ctx.lineTo(-7,10);ctx.fill();ctx.restore()}}
  for(const p of pops){ctx.globalAlpha=Math.min(1,p.life*2);ctx.font=(p.big?24:18)+'px Jua';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='rgba(20,30,60,.8)';ctx.strokeText(p.t,p.x,p.y);ctx.fillStyle=p.c;ctx.fillText(p.t,p.x,p.y)}ctx.globalAlpha=1}
function drawMe(x,y){const w=Math.sin(P.walk)*3;ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y+15,13,5,0,0,TAU);ctx.fill();ctx.fillStyle='#3a5aa0';ctx.fillRect(x-7,y+2+w*.4,5,11);ctx.fillRect(x+2,y+2-w*.4,5,11);ctx.fillStyle='#ff6a5a';ctx.beginPath();ctx.roundRect(x-10,y-9,20,16,6);ctx.fill();ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(x,y-18,11,0,TAU);ctx.fill();ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.ellipse(x,y-25,13,6,0,Math.PI,0);ctx.fill();ctx.fillRect(x-2,y-27,14,4);
  ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(x-4+Math.cos(P.face)*2,y-17,2,0,TAU);ctx.arc(x+4+Math.cos(P.face)*2,y-17,2,0,TAU);ctx.fill();
  P.carried.forEach((c,i)=>drawCrit(x,y-44-i*22,CR[c.cid],c.mut,.55,i))}
function drawCrit(x,y,c,mut,s,seed,g){g=g||ctx;g.save();g.translate(x,y);g.scale(s,s);const r=RAR[c.rar];
  if(r.i>=3){g.fillStyle=r.c;g.globalAlpha=.25+.15*Math.sin(time*4+seed);g.beginPath();g.arc(0,0,30,0,TAU);g.fill();g.globalAlpha=1}
  g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.ellipse(0,16,16,5,0,0,TAU);g.fill();
  let body=c.c;if(mut==='gold')body='#ffd23f';if(mut==='rainbow')body=`hsl(${(time*120+seed*40)%360},90%,70%)`;
  g.fillStyle=body;
  if(c.ear==='round'){g.beginPath();g.arc(-11,-13,7,0,TAU);g.arc(11,-13,7,0,TAU);g.fill()}
  else if(c.ear==='long'){g.beginPath();g.ellipse(-7,-20,4,11,-.2,0,TAU);g.ellipse(7,-20,4,11,.2,0,TAU);g.fill()}
  else if(c.ear==='horn'){g.fillStyle='#fff6d0';g.beginPath();g.moveTo(-10,-10);g.lineTo(-6,-26);g.lineTo(-2,-12);g.moveTo(10,-10);g.lineTo(6,-26);g.lineTo(2,-12);g.fill();g.fillStyle=body}
  else if(c.ear==='wing'){g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.ellipse(-19,-2,9,5,-.5+Math.sin(time*12)*.3,0,TAU);g.ellipse(19,-2,9,5,.5-Math.sin(time*12)*.3,0,TAU);g.fill();g.fillStyle=body}
  g.beginPath();g.ellipse(0,0,17,15,0,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-6,-6,6,4,-.5,0,TAU);g.fill();
  const dk=c.c==='#2a2a4a'||c.c==='#3a4a7a';g.fillStyle=dk?'#fff':'#2a2420';g.beginPath();g.arc(-5,-1,2.4,0,TAU);g.arc(5,-1,2.4,0,TAU);g.fill();g.fillStyle='#ff8aa8';g.beginPath();g.arc(-10,4,3,0,TAU);g.arc(10,4,3,0,TAU);g.fill();g.strokeStyle=dk?'#fff':'#2a2420';g.lineWidth=1.5;g.beginPath();g.arc(0,2,3,.3,Math.PI-.3);g.stroke();
  if(r.i>=4){g.fillStyle='#ffd23f';g.beginPath();g.moveTo(-8,-15);g.lineTo(-8,-22);g.lineTo(-4,-18);g.lineTo(0,-24);g.lineTo(4,-18);g.lineTo(8,-22);g.lineTo(8,-15);g.fill()}
  if(mut==='spark'){g.fillStyle='#7af0ff';g.font='14px Jua';g.textAlign='center';g.fillText('⚡',-18+Math.sin(time*20)*2,-12);g.fillText('⚡',18,-10+Math.cos(time*20)*2)}
  if(mut==='gold'&&Math.sin(time*6+seed)>.6){g.fillStyle='#fff';g.fillRect(8,-12,4,4)}
  g.restore()}
function critCanvas(c,mut,size,hide){const e=document.createElement('canvas');e.width=size*2;e.height=size*2;e.style.width=size+'px';e.style.height=size+'px';const g=e.getContext('2d');g.scale(2,2);if(hide){g.filter='brightness(0) opacity(.5)'}drawCrit(size/2,size/2+4,c,mut,size/48,0,g);return e}

// ---------- 시작
function begin(){state='play';$('titleOv').hidden=true;crits=[];fillCrits();waves=[];nextWave=S.best?rand(12,18):D.firstWave;P.x=W/2;P.y=BASE-40;P.carried=[];
  const away=Math.min(D.offlineMax,(Date.now()-(S.t||Date.now()))/1000);let earned=0;if(away>30&&S.pads.some(p=>p)){for(const p of S.pads)if(p){const n=incOf(p)*away;p.bank+=n;earned+=n}banner('💤 자리 비운 사이에','기지 말랑이들이 🪙'+fmt(earned)+' 벌었어요! 발판을 밟아 모아요',3.5)}
  else if(!S.total)banner('🌊 쓰나미 탈출 말랑이','위로 달려가 말랑이를 데려와요!',3);snd('go');store()}
function toTitle(){state='title';paused=false;$('titleOv').hidden=false;setT($('startBtn'),S.total?'이어 하기':'시작하기');setT($('tRec'),S.total?'기지 말랑이 '+S.pads.filter(p=>p).length+'마리 · 매초 🪙'+fmt(totalInc())+' · 도감 '+Object.keys(S.dex).length+'/'+D.crit.length:'')}
$('startBtn').onclick=()=>{snd('click');begin()};
addEventListener('pagehide',store);document.addEventListener('visibilitychange',()=>{if(document.hidden){store();if(state==='play'&&!paused)openMenu()}});
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw()}
toTitle();requestAnimationFrame(frame);
window.__ts={begin,P,S,get crits(){return crits},get waves(){return waves},alcoves,keys,closePanel,get paused(){return paused},get state(){return state},speed,carryMax,slotMax,totalInc,free,W,openShop,get pending(){return pending},get nextWave(){return nextWave}};
});
