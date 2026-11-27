/* 솜뭉치 날리기 — 새총으로 솜뭉치를 날려 블록 성을 무너뜨리는 물리 놀이. 데이터는 data.json */
Arcade.boot(D=>{
if(!window.Matter)throw new Error('물리 엔진을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
const {Engine,Bodies,Composite,Body,Events}=Matter;
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='puffSling.save',MAT=D.materials,BD=D.birds,GY=D.ground,[SX,SY]=D.sling;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const save=Object.assign({open:1,stars:{},best:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();
let bigT=0;function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1.3}
function hint(t){setT($('hint'),t)}

// ---------- 월드
let intro=0,eng=null,LV=0,L=null,blocks=[],targets=[],queue=[],flying=[],cur=null,state='title',paused=false,score=0,parts=[],pops=[],settleT=0,camX=0,camTarget=0,used=false,aim=null,time=0,wait=0,ended=false;
function build(i){LV=i;L=D.levels[i];eng=Engine.create();eng.gravity.y=1;blocks=[];targets=[];flying=[];parts=[];pops=[];score=0;ended=false;
  const ground=Bodies.rectangle(1000,GY+100,6000,200,{isStatic:true,label:'ground',friction:.9});Composite.add(eng.world,ground);
  for(const [hx,hy,hw,hh] of L.hills){const h=Bodies.rectangle(hx,hy,hw,hh,{isStatic:true,label:'hill',chamfer:{radius:30}});h.hill=[hx,hy,hw,hh];Composite.add(eng.world,h)}
  for(const [m,x,y,w,h,a] of L.blocks){const b=Bodies.rectangle(x,y,w,h,{angle:a||0,density:MAT[m].density,friction:.7,restitution:.05,label:'block'});b.mat=m;b.hp=MAT[m].hp*(Math.max(w,h)/100+.5);b.max=b.hp;b.w=w;b.h=h;blocks.push(b);Composite.add(eng.world,b)}
  for(const [x,y,r] of L.targets){const t=Bodies.circle(x,y,r,{density:.0012,friction:.6,restitution:.1,label:'target'});t.r=r;t.hp=r*1.1;t.max=t.hp;targets.push(t);Composite.add(eng.world,t)}
  // 처음 잠깐은 다치지 않게 (자리 잡기)
  wait=1;queue=L.birds.slice();Events.on(eng,'collisionStart',onHit);
  for(let k=0;k<30;k++)Engine.update(eng,1000/60);
  nextBird();camX=0;intro=2.4;state='play';hud()}
function nextBird(){if(!queue.length){cur=null;return}const k=queue.shift();cur={k,r:BD[k].r,body:null,ready:true,usedSkill:false};used=false;hint('솜뭉치를 뒤로 당겼다 놓아요');hud()}
function hud(){setT($('hLv'),(LV+1)+'단계');setT($('hScore'),score);const q=$('queue');q.innerHTML='';for(const k of queue){const e=document.createElement('i');e.style.background=BD[k].color;q.appendChild(e)}}

// ---------- 부딪힘
function onHit(ev){if(wait>0)return;for(const p of ev.pairs){const a=p.bodyA,b=p.bodyB;const rv=Math.hypot(a.velocity.x-b.velocity.x,a.velocity.y-b.velocity.y);if(rv<1.6)continue;
    for(const [s,o] of [[a,b],[b,a]]){if(s.label!=='block'&&s.label!=='target')continue;const om=o.isStatic?3:clamp(o.mass,.4,6);let dmg=(rv-1.4)*om*(o.label==='bird'?9:5);if(s.label==='target')dmg*=1.6;hurt(s,dmg)}
    if(rv>4)snd(rv>9?'crack':'thud')}}
function hurt(b,d){if(b.dead)return;b.hp-=d;if(b.hp<=0)destroy(b)}
function destroy(b){b.dead=true;Composite.remove(eng.world,b);const isT=b.label==='target';const pts=isT?5000:500;score+=pts;pops.push({x:b.position.x,y:b.position.y,t:0,txt:'+'+pts,col:isT?'#4ac45a':'#fff'});
  const col=isT?'#7ad86a':MAT[b.mat].color;for(let i=0;i<(isT?12:8);i++)parts.push({x:b.position.x+rand(-10,10),y:b.position.y+rand(-10,10),vx:rand(-4,4),vy:rand(-6,1),t:0,col,s:rand(4,9)});
  snd(isT?'pop':'crack');if(isT){targets=targets.filter(t=>t!==b);if(!targets.length&&!ended){ended=true;setTimeout0(win,1.4)}}else blocks=blocks.filter(x=>x!==b);hud()}

// ---------- 발사
const W2S=()=>{const sc=Math.min(Ht/760,Wd/900);return sc};
let S=1,offY=0;
function toWorld(px,py){return {x:px/S+camX,y:(py-offY)/S}}
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;if(intro>0)intro=Math.min(intro,.01);const w=toWorld(e.clientX,e.clientY);
  if(cur&&cur.ready){if(Math.hypot(w.x-SX,w.y-SY)<120/Math.min(1,S)||true){aim={x:SX,y:SY,id:e.pointerId,sx:e.clientX,sy:e.clientY};snd('tick')}return}
  if(cur&&cur.body&&!cur.usedSkill)skill()});
addEventListener('pointermove',e=>{if(!aim||e.pointerId!==aim.id)return;let dx=(e.clientX-aim.sx)/S,dy=(e.clientY-aim.sy)/S;const l=Math.hypot(dx,dy),M=110;if(l>M){dx*=M/l;dy*=M/l}aim.x=SX+dx;aim.y=SY+dy});
addEventListener('pointerup',e=>{if(!aim||e.pointerId!==aim.id)return;const dx=SX-aim.x,dy=SY-aim.y;aim=null;if(Math.hypot(dx,dy)<20)return;launch(dx*D.power,dy*D.power)});
function launch(vx,vy){const b=Bodies.circle(SX,SY,cur.r,{density:.004,restitution:.35,friction:.6,label:'bird'});b.kind=cur.k;Composite.add(eng.world,b);Body.setVelocity(b,{x:vx,y:vy});cur.body=b;cur.ready=false;cur.t=0;flying.push(b);snd('whoosh');hint(cur.k==='red'?'':'날아가는 중에 탭! 특기 쓰기');settleT=0}
function skill(){const b=cur.body;cur.usedSkill=true;hint('');const v=b.velocity;
  if(cur.k==='yellow'){Body.setVelocity(b,{x:v.x*2.1,y:v.y*2.1});snd('power');pops.push({x:b.position.x,y:b.position.y,t:0,txt:'쌩!',col:'#ffd23f'})}
  else if(cur.k==='blue'){for(const a of [-.22,.22]){const c=Bodies.circle(b.position.x,b.position.y,cur.r,{density:.004,restitution:.35,label:'bird'});c.kind='blue';const ang=Math.atan2(v.y,v.x)+a,sp=Math.hypot(v.x,v.y);Composite.add(eng.world,c);Body.setVelocity(c,{x:Math.cos(ang)*sp,y:Math.sin(ang)*sp});flying.push(c)}snd('pop')}
  else if(cur.k==='black'){explode(b.position.x,b.position.y);Composite.remove(eng.world,b);b.gone=true}
  else{snd('jump')}}
function explode(x,y){snd('boom');shake=.4;pops.push({x,y,t:0,boom:1});
  for(const o of [...blocks,...targets]){const dx=o.position.x-x,dy=o.position.y-y,d=Math.hypot(dx,dy);if(d<170){const f=(1-d/170);Body.applyForce(o,o.position,{x:dx/d*f*.035*o.mass,y:(dy/d*f-.3*f)*.035*o.mass});hurt(o,f*110)}}}
let shake=0;

// ---------- 프레임 타이머
const timers=[];function setTimeout0(fn,s){timers.push({fn,t:s})}
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}
  if(state!=='play')return;wait=Math.max(0,wait-dt);
  Engine.update(eng,Math.min(dt,1/30)*1000);
  // 화면 밖으로 떨어진 것
  for(const b of [...blocks,...targets])if(b.position.y>GY+200||b.position.x<-200||b.position.x>2600)destroy(b);
  for(const p of parts){p.t+=dt;p.vy+=20*dt;p.x+=p.vx;p.y+=p.vy}parts=parts.filter(p=>p.t<1);for(const p of pops)p.t+=dt;pops=pops.filter(p=>p.t<1);shake=Math.max(0,shake-dt);
  // 카메라
  const fb=cur&&cur.body&&!cur.body.gone?cur.body:null;
  if(intro>0){intro-=dt;camTarget=intro>1?9999:0}else if(aim||cur&&cur.ready)camTarget=0;else if(fb)camTarget=fb.position.x-Wd/S*.4;
  camX+=(clamp(camTarget,0,Math.max(0,1500-Wd/S))-camX)*Math.min(1,dt*3);
  // 다음 솜뭉치
  if(cur&&!cur.ready){cur.t+=dt;const all=[...blocks,...targets,...flying.filter(f=>!f.gone)];const moving=all.some(b=>b.speed>.35);settleT=moving?0:settleT+dt;
    if((settleT>.9&&cur.t>1.5)||cur.t>9){for(const f of flying){if(!f.gone)Composite.remove(eng.world,f)}flying=[];if(!ended){if(queue.length){nextBird();camTarget=0}else{cur=null;setTimeout0(()=>{if(!ended)lose()},1)}}else cur=null}}}
function stars(){const left=queue.length+(cur&&cur.ready?1:0);const s=score+left*10000;const tot=L.targets.length*5000+L.blocks.length*500;return left>=2?3:left===1?2:1}
function win(){if(state!=='play')return;state='over';const left=queue.length+(cur&&cur.ready?1:0);score+=left*10000;const st=stars();
  save.stars[LV]=Math.max(save.stars[LV]||0,st);save.best[LV]=Math.max(save.best[LV]||0,score);save.open=Math.max(save.open,LV+2);store();
  const total=Object.values(save.stars).reduce((a,b)=>a+b,0);Arcade.record&&Arcade.record('puffSlingStars',total);
  $('oTitle').textContent=LV+1>=D.levels.length?'🎉 모든 단계 성공!':'성공!';setT($('oStars'),'⭐'.repeat(st)+'☆'.repeat(3-st));$('oTxt').innerHTML='점수 <b>'+score+'</b>'+(left?' (남은 솜뭉치 보너스 포함)':'');
  $('againBtn').hidden=LV+1>=D.levels.length;$('overOv').hidden=false;hint('');snd('win')}
function lose(){if(state!=='play')return;state='over';$('oTitle').textContent='아깝다!';setT($('oStars'),'');$('oTxt').innerHTML='투덜 버섯이 <b>'+targets.length+'</b>개 남았어요';$('againBtn').hidden=true;$('overOv').hidden=false;hint('');snd('lose')}

// ---------- 그리기
function draw(){const W=Wd,H=Ht;S=W<H?W/820:Math.min(H/700,W/1350);offY=H-(GY+60)*S;ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7ac8ff');g.addColorStop(1,'#d8f2ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<5;i++){const cx=((i*330-camX*S*.2)%(W+300)+W+300)%(W+300)-150,cy=60+i*37%160;ctx.beginPath();ctx.ellipse(cx,cy,70,22,0,0,7);ctx.ellipse(cx+40,cy-12,40,20,0,0,7);ctx.fill()}
  ctx.fillStyle='#a8e08a';for(let i=0;i<6;i++){const cx=((i*420-camX*S*.5)%(W+600)+W+600)%(W+600)-300;ctx.beginPath();ctx.ellipse(cx,offY+GY*S,260,120*S+60,0,Math.PI,0);ctx.fill()}
  const sx=shake>0?rand(-6,6):0;ctx.save();ctx.translate(sx-camX*S,offY);ctx.scale(S,S);
  ctx.fillStyle='#6ac85a';ctx.fillRect(camX-50,GY,W/S+100,30);ctx.fillStyle='#a8744a';ctx.fillRect(camX-50,GY+30,W/S+100,400);
  for(const [hx,hy,hw,hh] of L.hills){ctx.fillStyle='#8a6a4a';ctx.beginPath();ctx.roundRect(hx-hw/2,hy-hh/2,hw,hh+40,30);ctx.fill();ctx.fillStyle='#6ac85a';ctx.beginPath();ctx.roundRect(hx-hw/2,hy-hh/2,hw,22,[30,30,0,0]);ctx.fill()}
  // 새총 뒤쪽
  ctx.fillStyle='#8a5a2a';ctx.fillRect(SX-8,SY,16,GY-SY);ctx.fillRect(SX-26,SY-30,12,40);ctx.fillRect(SX+14,SY-30,12,40);
  const pull=aim?{x:aim.x,y:aim.y}:{x:SX,y:SY};
  if(cur&&cur.ready){ctx.strokeStyle='#5a3010';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(SX+20,SY-24);ctx.lineTo(pull.x,pull.y);ctx.stroke()}
  // 블록
  for(const b of blocks){ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);const m=MAT[b.mat];ctx.fillStyle=m.color;ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h);
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2;ctx.strokeRect(-b.w/2+1,-b.h/2+1,b.w-2,b.h-2);
    if(b.mat==='wood'){ctx.strokeStyle='rgba(120,70,30,.35)';ctx.beginPath();if(b.w>b.h){ctx.moveTo(-b.w/2+6,-2);ctx.lineTo(b.w/2-6,-2)}else{ctx.moveTo(-2,-b.h/2+6);ctx.lineTo(-2,b.h/2-6)}ctx.stroke()}
    if(b.mat==='ice'){ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(-b.w/2+3,-b.h/2+3,Math.min(8,b.w/3),Math.min(8,b.h/3))}
    const dmg=1-b.hp/b.max;if(dmg>.3){ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-b.w*.3,-b.h*.3);ctx.lineTo(0,0);ctx.lineTo(b.w*.2,-b.h*.1);if(dmg>.6){ctx.moveTo(0,0);ctx.lineTo(-b.w*.1,b.h*.35)}ctx.stroke()}
    ctx.restore()}
  for(const t of targets){ctx.save();ctx.translate(t.position.x,t.position.y);ctx.rotate(t.angle);const r=t.r;
    ctx.fillStyle='#f0e8d0';ctx.fillRect(-r*.4,0,r*.8,r*.9);ctx.fillStyle='#5ac84a';ctx.beginPath();ctx.ellipse(0,-r*.05,r*1.05,r*.85,0,Math.PI,0);ctx.lineTo(r*1.05,r*.15);ctx.lineTo(-r*1.05,r*.15);ctx.fill();
    ctx.fillStyle='#e8ffd8';for(const [a,b,c] of [[-.45,-.45,.18],[.35,-.55,.14],[.6,-.15,.12]]){ctx.beginPath();ctx.arc(a*r,b*r,c*r,0,7);ctx.fill()}
    ctx.fillStyle='#2a2a2a';ctx.beginPath();ctx.arc(-r*.2,r*.35,r*.09,0,7);ctx.arc(r*.2,r*.35,r*.09,0,7);ctx.fill();ctx.strokeStyle='#2a2a2a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r*.35,r*.15);ctx.lineTo(-r*.08,r*.24);ctx.moveTo(r*.35,r*.15);ctx.lineTo(r*.08,r*.24);ctx.moveTo(-r*.15,r*.65);ctx.quadraticCurveTo(0,r*.55,r*.15,r*.65);ctx.stroke();
    ctx.restore()}
  // 솜뭉치
  for(const f of flying)if(!f.gone)puff(f.position.x,f.position.y,BD[f.kind].r,f.kind,f.angle);
  if(cur&&cur.ready)puff(pull.x,pull.y,cur.r,cur.k,0);
  // 기다리는 솜뭉치
  queue.forEach((k,i)=>puff(SX-50-i*34,GY-BD[k].r,BD[k].r*.9,k,0));
  // 새총 앞쪽 끈
  if(cur&&cur.ready){ctx.strokeStyle='#5a3010';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(SX-20,SY-24);ctx.lineTo(pull.x,pull.y);ctx.stroke()}
  // 궤적 미리보기
  if(aim){const vx=(SX-aim.x)*D.power,vy=(SY-aim.y)*D.power;let x=SX,y=SY,ux=vx,uy=vy;const gg=eng.gravity.y*eng.gravity.scale*(1000/60)**2;ctx.fillStyle='rgba(255,255,255,.85)';
    for(let i=0;i<60;i++){for(let k=0;k<3;k++){uy+=gg;x+=ux;y+=uy}if(i>2&&i%1===0){ctx.beginPath();ctx.arc(x,y,4-i*.04,0,7);ctx.fill()}if(y>GY)break}}
  for(const p of parts){ctx.globalAlpha=1-p.t;ctx.fillStyle=p.col;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}ctx.globalAlpha=1;
  for(const p of pops){if(p.boom){ctx.fillStyle=`rgba(255,180,60,${1-p.t})`;ctx.beginPath();ctx.arc(p.x,p.y,40+p.t*150,0,7);ctx.fill();continue}ctx.fillStyle=p.col;ctx.globalAlpha=1-p.t;ctx.font='bold 26px Jua';ctx.textAlign='center';ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=4;ctx.strokeText(p.txt,p.x,p.y-p.t*40);ctx.fillText(p.txt,p.x,p.y-p.t*40);ctx.globalAlpha=1}
  ctx.restore()}
function puff(x,y,r,k,ang){ctx.save();ctx.translate(x,y);ctx.rotate(ang*.3);const c=BD[k].color;ctx.fillStyle=c;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*r*.55,Math.sin(a)*r*.55,r*.55,0,7);ctx.fill()}ctx.beginPath();ctx.arc(0,0,r*.8,0,7);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r*.15,-r*.15,r*.28,0,7);ctx.arc(r*.6,-r*.15,r*.22,0,7);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(r*.22,-r*.12,r*.13,0,7);ctx.arc(r*.64,-r*.12,r*.1,0,7);ctx.fill();
  // 머리띠
  ctx.fillStyle=k==='black'?'#ff5a4a':'#fff';ctx.fillRect(-r*.9,-r*.55,r*1.8,r*.18);ctx.fillStyle='#ffb0a0';ctx.beginPath();ctx.arc(r*.35,r*.25,r*.12,0,7);ctx.fill();
  if(k==='black'){ctx.strokeStyle='#ffd23f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-r*.9);ctx.quadraticCurveTo(r*.3,-r*1.3,r*.1,-r*1.4);ctx.stroke()}
  ctx.restore()}

// ---------- 화면
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
function showTitle(){state='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;hint('');const l=$('lvs');l.innerHTML='';
  D.levels.forEach((lv,i)=>{const b=document.createElement('button');b.disabled=i+1>save.open;b.textContent=(i+1)+'. '+lv.name;const s=document.createElement('small');s.textContent=save.stars[i]?'⭐'.repeat(save.stars[i]):' ';b.appendChild(s);b.onclick=()=>{snd('click');go(i)};l.appendChild(b)})}
function go(i){for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;paused=false;timers.length=0;build(i);big((i+1)+'. '+D.levels[i].name);snd('go')}
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{paused=false;showTitle()};
$('retryBtn').onclick=()=>{if(state==='play'||state==='over'){snd('click');go(LV)}};
$('againBtn').onclick=()=>{snd('click');go(Math.min(LV+1,D.levels.length-1))};$('redoBtn').onclick=()=>{snd('click');go(LV)};$('oMenu').onclick=()=>{snd('click');showTitle()};
addEventListener('keydown',e=>{if(e.key==='p'||e.key==='Escape')togglePause();if(e.key===' '&&cur&&cur.body&&!cur.usedSkill&&state==='play')skill()});
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}
  if(!paused)update(dt);if(L)draw();else{ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#9ad8ff';ctx.fillRect(0,0,Wd,Ht)}requestAnimationFrame(frame)}
build(0);state='title';showTitle();requestAnimationFrame(frame);
window.__ps={go,launch:(vx,vy)=>launch(vx,vy),skill,get state(){return state},get targets(){return targets},get cur(){return cur},get queue(){return queue}};
});
