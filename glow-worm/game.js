/* 빛지렁이 — 빛 알갱이를 먹고 커지는 지렁이 대결. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const MOBILE=matchMedia('(pointer:coarse)').matches,WM=D.worm,AR=D.arena,SAVE='glowWorm.save';
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const save=Object.assign({best:0,skin:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();

let worms=[],orbs=[],me=null,state='title',paused=false,time=0,cam={x:0,y:0,z:14};
function randPos(r){const a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*(AR-r);return {x:Math.cos(a)*d,y:Math.sin(a)*d}}
function addOrb(x,y,v,col){orbs.push({x,y,v:v||D.orbs.value,c:col||pick(['#ff4a8a','#ffd23f','#22d3ee','#5ce08a','#b45cff','#ff8a2a']),p:Math.random()*6})}
function mkWorm(name,skin,bot){const p=randPos(12),a=Math.random()*Math.PI*2,pts=[];for(let i=0;i<WM.startLen;i++)pts.push({x:p.x-Math.cos(a)*i*WM.seg,y:p.y-Math.sin(a)*i*WM.seg});
  return {name,skin,bot,pts,len:WM.startLen,a,ta:a,boost:false,dead:false,think:0,aggro:Math.random()<.4,kills:0}}
const width=w=>.42+Math.min(.9,w.len*.006);
function start(){worms=[];orbs=[];for(let i=0;i<D.orbs.count;i++){const p=randPos(1);addOrb(p.x,p.y)}
  me=mkWorm('나',D.skins[save.skin]||D.skins[0],false);worms.push(me);const names=D.bots.names.slice().sort(()=>Math.random()-.5);
  for(let i=0;i<D.bots.count;i++){const w=mkWorm(names[i%names.length],pick(D.skins),true);w.len=WM.startLen+rand(0,60);worms.push(w)}
  state='play';paused=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;snd('go')}

// ---------- 공간 격자(충돌 확인용)
let grid=new Map();const GS=2;
function buildGrid(){grid.clear();for(const w of worms){if(w.dead)continue;const r=width(w);for(let i=3;i<w.pts.length;i++){const p=w.pts[i],k=Math.floor(p.x/GS)+','+Math.floor(p.y/GS);let c=grid.get(k);if(!c)grid.set(k,c=[]);c.push({w,p,r})}}}
function hitAt(x,y,r,self){const cx=Math.floor(x/GS),cy=Math.floor(y/GS);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const c=grid.get((cx+a)+','+(cy+b));if(!c)continue;for(const s of c){if(s.w===self)continue;if((s.p.x-x)**2+(s.p.y-y)**2<(s.r+r)**2)return s.w}}return null}

// ---------- 입력
let pointer=null,boostHeld=false;const keys={};
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true;if(e.code==='Space')e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=false);
let tid=null,tox=0,toy=0;
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){boostHeld=true;return}if(tid===null){tid=e.pointerId;tox=e.clientX;toy=e.clientY}});
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){pointer={x:e.clientX-Wd/2,y:e.clientY-Ht/2};return}if(e.pointerId===tid){const dx=e.clientX-tox,dy=e.clientY-toy;if(Math.hypot(dx,dy)>8)pointer={x:dx,y:dy};if(Math.hypot(dx,dy)>70){tox=e.clientX-dx*.8;toy=e.clientY-dy*.8}}});
const pend=e=>{if(e.pointerType==='mouse'){boostHeld=false;return}if(e.pointerId===tid)tid=null};
cv.addEventListener('pointerup',pend);cv.addEventListener('pointercancel',pend);
const bb=$('boostBtn');bb.addEventListener('pointerdown',e=>{e.preventDefault();boostHeld=true;bb.classList.add('on');try{bb.setPointerCapture(e.pointerId)}catch(_){}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])bb.addEventListener(ev,()=>{boostHeld=false;bb.classList.remove('on')});

// ---------- 봇
function botThink(w,dt){
  w.think-=dt;const h=w.pts[0];
  if(w.think<=0){w.think=rand(.15,.35);
    // 앞쪽 위험 살피기
    const look=3+width(w)*3;let danger=false;
    for(const da of [0,-.35,.35]){const a=w.a+da,x=h.x+Math.cos(a)*look,y=h.y+Math.sin(a)*look;if(hitAt(x,y,width(w),w)||Math.hypot(x,y)>AR-2){danger=true;break}}
    if(danger){let best=w.a,bs=-1;for(let k=-6;k<=6;k++){const a=w.a+k*.45;let s=0;for(let d=1.5;d<=look+2;d+=1.5){const x=h.x+Math.cos(a)*d,y=h.y+Math.sin(a)*d;if(hitAt(x,y,width(w),w)||Math.hypot(x,y)>AR-2)break;s++}s-=Math.abs(k)*.05;if(s>bs){bs=s;best=a}}w.ta=best;w.boost=false;return}
    // 사냥: 가까운 지렁이 머리 앞을 막기
    if(w.aggro&&w.len>25){for(const o of worms){if(o===w||o.dead)continue;const oh=o.pts[0],d=Math.hypot(oh.x-h.x,oh.y-h.y);if(d<10){const tx=oh.x+Math.cos(o.a)*4,ty=oh.y+Math.sin(o.a)*4;w.ta=Math.atan2(ty-h.y,tx-h.x);w.boost=w.len>WM.minBoostLen*2&&d<7;return}}}
    // 먹이 찾기
    let best=null,bd=1e9;for(const o of orbs){const d=(o.x-h.x)**2+(o.y-h.y)**2-o.v*30;if(d<bd){bd=d;best=o}}
    if(best){w.ta=Math.atan2(best.y-h.y,best.x-h.x);w.boost=best.v>=D.orbs.deadValue&&bd<60&&w.len>WM.minBoostLen*2}
    if(Math.hypot(h.x,h.y)>AR-8)w.ta=Math.atan2(-h.y,-h.x)}}

// ---------- 진행
function kill(w,by){w.dead=true;for(let i=0;i<w.pts.length;i+=2){const p=w.pts[i];addOrb(p.x+rand(-.4,.4),p.y+rand(-.4,.4),D.orbs.deadValue*(w.len/w.pts.length)*1.6,w.skin[i%4<2?0:1])}
  if(by){by.kills++;if(by===me){snd('power')}}
  if(w===me){snd('lose');end()}else if(Math.hypot(w.pts[0].x-me.pts[0].x,w.pts[0].y-me.pts[0].y)<25)snd('pop')}
function update(dt){
  buildGrid();
  for(const w of worms){if(w.dead)continue;const h=w.pts[0];
    if(w===me){let ta=w.a;if(pointer)ta=Math.atan2(pointer.y,pointer.x);const kx=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0),ky=(keys.ArrowDown||keys.KeyS?1:0)-(keys.ArrowUp||keys.KeyW?1:0);if(kx||ky){ta=Math.atan2(ky,kx);pointer=null}
      w.ta=ta;w.boost=(boostHeld||keys.Space)&&w.len>WM.minBoostLen}else botThink(w,dt);
    let d=w.ta-w.a;d=Math.atan2(Math.sin(d),Math.cos(d));const turn=WM.turn*(1.2-Math.min(.6,w.len*.002))*dt;w.a+=Math.max(-turn,Math.min(turn,d));
    const sp=(w.boost?WM.boost:WM.speed)*dt;h.x+=Math.cos(w.a)*sp;h.y+=Math.sin(w.a)*sp;
    if(w.boost){w.len-=WM.boostCost*dt;w.dropT=(w.dropT||0)-dt;if(w.dropT<=0){w.dropT=.12;const t=w.pts[w.pts.length-1];addOrb(t.x,t.y,WM.boostCost*.12*.8,w.skin[0])}}
    // 몸 따라오기
    const n=Math.max(4,Math.floor(w.len));while(w.pts.length<n){const t=w.pts[w.pts.length-1];w.pts.push({x:t.x,y:t.y})}while(w.pts.length>n)w.pts.pop();
    for(let i=1;i<w.pts.length;i++){const a=w.pts[i-1],b=w.pts[i],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);if(l>WM.seg){b.x=a.x+dx/l*WM.seg;b.y=a.y+dy/l*WM.seg}}
    // 먹기
    const r=width(w)+.5;for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];const dx=o.x-h.x,dy=o.y-h.y,dd=dx*dx+dy*dy;
      if(dd<(r+1.6)**2&&dd>r*r){o.x-=dx*dt*5;o.y-=dy*dt*5}
      if(dd<r*r){w.len+=o.v;orbs.splice(i,1);if(w===me&&o.v>=D.orbs.deadValue*.5)snd('coin')}}
  }
  // 충돌
  for(const w of worms){if(w.dead)continue;const h=w.pts[0];if(Math.hypot(h.x,h.y)>AR-width(w)){kill(w,null);continue}const o=hitAt(h.x,h.y,width(w)*.85,w);if(o)kill(w,o)}
  worms=worms.filter(w=>!w.dead||w===me);
  while(worms.filter(w=>w.bot).length<D.bots.count){let w,tries=0;do{w=mkWorm(pick(D.bots.names),pick(D.skins),true);tries++}while(me&&Math.hypot(w.pts[0].x-me.pts[0].x,w.pts[0].y-me.pts[0].y)<20&&tries<20);worms.push(w)}
  while(orbs.length<D.orbs.count){const p=randPos(1);addOrb(p.x,p.y)}
  if(orbs.length>D.orbs.count*2.5)orbs.splice(0,orbs.length-D.orbs.count*2.5);
  // HUD
  if(state==='play'&&!me.dead){const sorted=worms.filter(w=>!w.dead).sort((a,b)=>b.len-a.len),rk=sorted.indexOf(me)+1;setT($('len'),Math.floor(me.len));setT($('rank'),rk+'/'+sorted.length);
    if(Math.floor(time*4)!==update.lb){update.lb=Math.floor(time*4);const b=$('board');b.innerHTML='';for(const w of sorted.slice(0,5)){const li=document.createElement('li');li.textContent=w.name+' '+Math.floor(w.len);if(w===me)li.className='me';b.appendChild(li)}}}
}
function end(){state='over';const L=Math.floor(me.len),best=L>save.best;if(best)save.best=L;store();if(window.Arcade)Arcade.record('glowWormBest',save.best);
  setT($('oLen'),L);$('oTxt').textContent=`쓰러뜨린 지렁이 ${me.kills}마리`+(best?' · 최고 기록!':` · 최고 ${save.best}`);setTimeout(()=>{$('overOv').hidden=false;$('againBtn').focus()},900)}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}

// ---------- 그리기
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#0c1024';ctx.fillRect(0,0,Wd,Ht);
  const f=me&&state!=='title'?me.pts[0]:{x:Math.cos(time*.1)*20,y:Math.sin(time*.1)*20};
  const zt=Math.min(Wd,Ht)/(26+(me&&state!=='title'?Math.min(30,me.len*.08):0));cam.z+=(zt-cam.z)*.05;cam.x+=(f.x-cam.x)*.2;cam.y+=(f.y-cam.y)*.2;const Z=cam.z;
  ctx.translate(Wd/2-cam.x*Z,Ht/2-cam.y*Z);ctx.scale(Z,Z);
  // 바닥 무늬
  ctx.strokeStyle='rgba(80,100,180,.18)';ctx.lineWidth=.06;const x0=Math.floor((cam.x-Wd/2/Z)/3)*3,y0=Math.floor((cam.y-Ht/2/Z)/3)*3;
  for(let x=x0;x<cam.x+Wd/2/Z+3;x+=3)for(let y=y0;y<cam.y+Ht/2/Z+3;y+=3){ctx.beginPath();ctx.arc(x+(Math.floor(y/3)%2?1.5:0),y,1.2,0,7);ctx.stroke()}
  ctx.strokeStyle='#ff4a6a';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(0,0,AR,0,7);ctx.stroke();ctx.fillStyle='rgba(255,60,90,.08)';
  // 알갱이
  const vx0=cam.x-Wd/2/Z-2,vx1=cam.x+Wd/2/Z+2,vy0=cam.y-Ht/2/Z-2,vy1=cam.y+Ht/2/Z+2;
  for(const o of orbs){if(o.x<vx0||o.x>vx1||o.y<vy0||o.y>vy1)continue;const r=.14+Math.sqrt(o.v)*.28,g=.6+.4*Math.sin(time*4+o.p);ctx.globalAlpha=.35*g;ctx.fillStyle=o.c;ctx.beginPath();ctx.arc(o.x,o.y,r*2.2,0,7);ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(o.x,o.y,r,0,7);ctx.fill()}
  // 지렁이
  for(const w of worms){if(w.dead)continue;const r=width(w),h=w.pts[0];if(h.x<vx0-40||h.x>vx1+40||h.y<vy0-40||h.y>vy1+40)continue;
    if(w.boost){ctx.globalAlpha=.3;ctx.fillStyle=w.skin[0];for(let i=w.pts.length-1;i>=0;i-=2){const p=w.pts[i];ctx.beginPath();ctx.arc(p.x,p.y,r*1.6,0,7);ctx.fill()}ctx.globalAlpha=1}
    for(let i=w.pts.length-1;i>=0;i--){const p=w.pts[i];ctx.fillStyle=Math.floor(i/4)%2?w.skin[1]:w.skin[0];ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill()}
    const ex=Math.cos(w.a),ey=Math.sin(w.a);for(const s of [-1,1]){const px=h.x+ex*r*.3-ey*r*.5*s,py=h.y+ey*r*.3+ex*r*.5*s;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,r*.38,0,7);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(px+ex*r*.14,py+ey*r*.14,r*.18,0,7);ctx.fill()}
    ctx.font=`${.9}px Jua, sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillText(w.name,h.x,h.y-r-.6)}
}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused){time+=dt;if(state==='play'&&!me.dead)update(dt);else if(state==='title'||state==='over'){if(!worms.length)demo();updateDemo(dt)}}draw();requestAnimationFrame(frame)}
function demo(){worms=[];orbs=[];for(let i=0;i<D.orbs.count;i++){const p=randPos(1);addOrb(p.x,p.y)}for(let i=0;i<6;i++){const w=mkWorm('',pick(D.skins),true);w.len=20+rand(0,40);worms.push(w)}}
const dummy={dead:false,pts:[{x:0,y:0}],len:0,kills:0};function updateDemo(dt){if(state==='over')return;const keep=me;me=dummy;update(dt);me=keep}
// ---------- 처음 화면
function toTitle(){state='title';paused=false;for(const id of ['pauseOv','overOv'])$(id).hidden=true;demo();setT($('tBest'),save.best);
  const sk=$('skins');sk.innerHTML='';D.skins.forEach((s,i)=>{const b=document.createElement('button');b.className='sk'+(save.skin===i?' on':'');b.style.setProperty('--a',s[0]);b.style.setProperty('--b',s[1]);b.setAttribute('aria-label','무늬 '+(i+1));
    b.onclick=()=>{save.skin=i;store();snd('click');toTitle()};sk.appendChild(b)});$('titleOv').hidden=false}
$('startBtn').onclick=()=>{snd('select');start()};$('againBtn').onclick=()=>{snd('select');start()};$('oMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__gw={get me(){return me},get worms(){return worms},get state(){return state},start,setPointer:p=>pointer=p,get orbs(){return orbs}};
});
