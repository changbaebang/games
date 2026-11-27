/* 과일 쓱싹 — 날아오르는 과일을 손가락으로 그어 자르기. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='fruitSlice.save',FR=D.fruits;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const save=Object.assign({classic:0,time:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,K=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;K=clamp(Math.min(Wd,Ht)/520,.65,1.4)}addEventListener('resize',fit);fit();
let bigT=0;function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1}

let mode='classic',state='title',paused=false,time=0,score=0,lives=3,clock=0,objs=[],halves=[],splats=[],drops=[],pops=[],trail=[],spawnT=0,elapsed=0,flash=0,swipeHits=0,swipeT=0;
const G=()=>Ht*1.15;
function start(m){mode=m;score=0;lives=D.classic.lives;clock=D.timeAttack.time;objs=[];halves=[];splats=[];drops=[];pops=[];trail=[];spawnT=.6;elapsed=0;flash=0;state='play';paused=false;
  for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;hud();big('쓱싹 시작!');snd('go')}
function hud(){setT($('hScore'),score);setT($('hLife'),mode==='classic'?'✖'.repeat(D.classic.lives-lives)+'○'.repeat(lives):'⏱ '+Math.ceil(clock))}
function pickFruit(){for(const f of FR)if(f.rare&&Math.random()<f.rare)return f;const n=FR.filter(f=>!f.rare);return n[Math.floor(Math.random()*n.length)]}
function launch(bomb){const x=rand(Wd*.15,Wd*.85),peak=rand(Ht*.15,Ht*.45);const g=G();const vy=-Math.sqrt(2*g*(Ht+40-peak));const tx=clamp(x+rand(-Wd*.3,Wd*.3),Wd*.1,Wd*.9);const T=-vy/g*2;const vx=(tx-x)/T;
  const f=bomb?null:pickFruit();objs.push({bomb,f,x,y:Ht+40,vx,vy,r:(bomb?28:f.r)*K,rot:rand(0,6),vr:rand(-3,3),cut:false,hits:0})}
function spawnWave(){const r=clamp(elapsed/D.waves.ramp,0,1);const n=Math.round(lerp(D.waves.count[0],D.waves.count[1],r*rand(.5,1.1)));const bp=lerp(D.bomb.start,D.bomb.max,r);
  let k=0;const go=()=>{launch(Math.random()<bp&&k>0||Math.random()<bp*.4);k++};for(let i=0;i<Math.max(1,n);i++)later(i*rand(.05,.25),go);spawnT=lerp(D.waves.gap[0],D.waves.gap[1],r)+n*.25}
const timers=[];function later(s,fn){timers.push({t:s,fn})}

// ---------- 입력
let down=false,last=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;down=true;last={x:e.clientX,y:e.clientY};trail=[{x:e.clientX,y:e.clientY,t:0}];swipeHits=0;swipeT=0});
addEventListener('pointermove',e=>{if(!down||state!=='play'||paused)return;const p={x:e.clientX,y:e.clientY};cutLine(last,p);last=p;trail.push({x:p.x,y:p.y,t:0});if(trail.length>14)trail.shift()});
addEventListener('pointerup',()=>{down=false;endSwipe()});addEventListener('pointercancel',()=>{down=false;endSwipe()});
function endSwipe(){if(swipeHits>=3){const b=swipeHits*2;score+=b;big(swipeHits+' 콤보! +'+b);snd('combo');hud()}swipeHits=0}
function segDist(px,py,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;let t=l?((px-a.x)*dx+(py-a.y)*dy)/l:0;t=clamp(t,0,1);return Math.hypot(px-(a.x+dx*t),py-(a.y+dy*t))}
function cutLine(a,b){if(Math.hypot(b.x-a.x,b.y-a.y)<3)return;const ang=Math.atan2(b.y-a.y,b.x-a.x);
  for(const o of objs){if(o.cut)continue;if(segDist(o.x,o.y,a,b)<o.r){if(o.bomb){boom(o);return}slice(o,ang)}}}
function slice(o,ang){o.cut=true;const f=o.f;score+=f.pts;swipeHits++;snd(f.pts>1?'level':'slash');
  for(const s of [-1,1])halves.push({f,x:o.x,y:o.y,vx:o.vx+Math.cos(ang+Math.PI/2)*s*120,vy:o.vy*.4+Math.sin(ang+Math.PI/2)*s*120-60,rot:ang,vr:s*rand(2,5),side:s,r:o.r,t:0});
  splats.push({x:o.x,y:o.y,r:o.r*rand(1.3,1.9),col:f.flesh,t:0,a:rand(0,6)});for(let i=0;i<10;i++)drops.push({x:o.x,y:o.y,vx:rand(-260,260),vy:rand(-320,80),col:f.flesh,t:0,s:rand(3,7)*K});
  pops.push({x:o.x,y:o.y-o.r,txt:'+'+f.pts,t:0});hud()}
function boom(o){o.cut=true;o.exploded=true;flash=1;snd('boom');for(let i=0;i<24;i++)drops.push({x:o.x,y:o.y,vx:rand(-500,500),vy:rand(-500,300),col:i%2?'#ffd23f':'#ff6a2a',t:0,s:rand(4,9)});
  if(mode==='classic'){later(.6,()=>over('펑! 폭탄을 잘랐어요'))}else{clock=Math.max(0,clock-D.timeAttack.bombPenalty);big('-'+D.timeAttack.bombPenalty+'초!');hud()}}
function over(why){if(state!=='play')return;state='over';const key=mode==='classic'?'classic':'time';const nb=score>save[key];if(nb){save[key]=score;store()}
  Arcade.record&&Arcade.record('fruitSliceBest',Math.max(save.classic,save.time));
  $('oTitle').textContent=nb?'🎉 새 기록!':'끝!';$('oTxt').innerHTML=why+'<br>점수 <b>'+score+'</b> · 최고 '+save[key];$('overOv').hidden=false;snd(nb?'win':'lose')}

// ---------- 갱신
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);if(state==='play')f()}}
  for(const t of trail)t.t+=dt;trail=trail.filter(t=>t.t<.15);swipeT+=dt;
  for(const s of splats)s.t+=dt;splats=splats.filter(s=>s.t<4);for(const d of drops){d.t+=dt;d.vy+=G()*.8*dt;d.x+=d.vx*dt;d.y+=d.vy*dt}drops=drops.filter(d=>d.t<1.2);for(const p of pops)p.t+=dt;pops=pops.filter(p=>p.t<.8);flash=Math.max(0,flash-dt*2);
  for(const h of halves){h.t+=dt;h.vy+=G()*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;h.rot+=h.vr*dt}halves=halves.filter(h=>h.y<Ht+100);
  if(state!=='play')return;elapsed+=dt;
  if(mode==='time'){clock-=dt;if(Math.ceil(clock)!==Math.ceil(clock+dt))hud();if(clock<=0){clock=0;hud();over('시간 끝!');return}}
  spawnT-=dt;if(spawnT<=0)spawnWave();
  for(const o of objs){o.vy+=G()*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.rot+=o.vr*dt;
    if(!o.cut&&o.vy>0&&o.y>Ht+o.r+10){o.gone=true;if(!o.bomb&&mode==='classic'){lives--;snd('bad');hud();if(lives<=0)over('과일을 3개 놓쳤어요')}}}
  objs=objs.filter(o=>!o.gone&&!o.cut)}

// ---------- 그리기
function drawFruit(f,r,half){const c=ctx;
  if(f.id==='water'){c.fillStyle=f.skin;c.beginPath();c.ellipse(0,0,r*1.1,r*.9,0,0,7);c.fill();c.strokeStyle=f.stripe;c.lineWidth=r*.12;for(const k of [-.5,0,.5]){c.beginPath();c.ellipse(k*r*.9,0,r*.12,r*.85,0,0,7);c.stroke()}}
  else if(f.id==='star'){c.fillStyle=f.skin;c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.55:r*1.15;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill()}
  else{c.fillStyle=f.skin;c.beginPath();c.arc(0,0,r,0,7);c.fill();
    if(f.id==='apple'||f.id==='peach'){c.strokeStyle='#5a3a1a';c.lineWidth=r*.1;c.beginPath();c.moveTo(0,-r*.85);c.lineTo(r*.1,-r*1.2);c.stroke();c.fillStyle='#4ac45a';c.beginPath();c.ellipse(r*.3,-r*1.05,r*.25,r*.12,-.4,0,7);c.fill()}
    if(f.id==='orange'){c.fillStyle='rgba(255,255,255,.15)';for(let i=0;i<5;i++){c.beginPath();c.arc(rand(-1,1)*0,0,0,0,0)}c.fillStyle='#4ac45a';c.beginPath();c.ellipse(0,-r*.9,r*.15,r*.08,0,0,7);c.fill()}
    if(f.id==='kiwi'){c.fillStyle='rgba(0,0,0,.15)';for(let i=0;i<8;i++){c.fillRect(Math.cos(i)*r*.6,Math.sin(i*1.7)*r*.6,2,2)}}
    if(f.id==='lemon'){c.beginPath();c.ellipse(0,0,r*1.15,r*.9,0,0,7);c.fill();c.beginPath();c.arc(r*1.1,0,r*.18,0,7);c.fill()}}
  c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(-r*.35,-r*.35,r*.22,r*.14,-.6,0,7);c.fill()}
function drawHalf(h){const c=ctx,r=h.r,f=h.f;c.save();c.translate(h.x,h.y);c.rotate(h.rot);c.beginPath();c.rect(-r*1.4,h.side<0?-r*1.4:0,r*2.8,r*1.4);c.clip();drawFruit(f,r);
  c.fillStyle=f.flesh;c.beginPath();c.ellipse(0,0,r*(f.id==='water'?1:.9),r*.18,0,0,7);c.fill();c.fillStyle=f.seed;for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(i*r*.25,0,r*.05,r*.035,0,0,7);c.fill()}c.restore()}
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8a5a34');g.addColorStop(1,'#5a3a24');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(0,0,0,.12)';ctx.lineWidth=3;for(let y=60;y<H;y+=90){ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=W;x+=40)ctx.lineTo(x,y+Math.sin(x*.01+y)*6);ctx.stroke()}
  for(const s of splats){ctx.globalAlpha=.55*(1-s.t/4);ctx.fillStyle=s.col;ctx.beginPath();for(let i=0;i<12;i++){const a=s.a+i/12*6.28,rr=s.r*(i%2?.7:1);ctx.lineTo(s.x+Math.cos(a)*rr,s.y+Math.sin(a)*rr)}ctx.fill()}ctx.globalAlpha=1;
  for(const o of objs){ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rot);
    if(o.bomb){ctx.fillStyle='#2a2a34';ctx.beginPath();ctx.arc(0,0,o.r,0,7);ctx.fill();ctx.fillStyle='#4a4a5a';ctx.fillRect(-o.r*.25,-o.r*1.15,o.r*.5,o.r*.3);ctx.strokeStyle='#c8a060';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-o.r*1.15);ctx.quadraticCurveTo(o.r*.4,-o.r*1.5,o.r*.2,-o.r*1.7);ctx.stroke();
      ctx.fillStyle=Math.floor(time*12)%2?'#ffd23f':'#ff6a2a';ctx.beginPath();ctx.arc(o.r*.2,-o.r*1.7,o.r*.18,0,7);ctx.fill();ctx.fillStyle='#ff4a4a';ctx.font='bold '+(o.r*.8)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✕',0,2);ctx.textBaseline='alphabetic'}
    else drawFruit(o.f,o.r);ctx.restore()}
  for(const h of halves)drawHalf(h);
  for(const d of drops){ctx.globalAlpha=1-d.t/1.2;ctx.fillStyle=d.col;ctx.beginPath();ctx.arc(d.x,d.y,d.s,0,7);ctx.fill()}ctx.globalAlpha=1;
  // 칼 자국
  if(trail.length>1){for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i];const w=(i/trail.length)*10*K;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
    ctx.strokeStyle='rgba(120,220,255,.35)';ctx.lineWidth=16*K;ctx.beginPath();trail.forEach((t,i)=>i?ctx.lineTo(t.x,t.y):ctx.moveTo(t.x,t.y));ctx.stroke()}
  for(const p of pops){ctx.globalAlpha=1-p.t/.8;ctx.fillStyle='#ffd23f';ctx.font='bold '+(26*K)+'px Jua';ctx.textAlign='center';ctx.fillText(p.txt,p.x,p.y-p.t*50)}ctx.globalAlpha=1;
  if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,W,H)}}

// ---------- 화면
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
function showTitle(){state='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;setT($('tRec'),(save.classic||save.time)?'최고 — 기본 '+save.classic+'점 · 60초 '+save.time+'점':'')}
$('goClassic').onclick=()=>{snd('click');start('classic')};$('goTime').onclick=()=>{snd('click');start('time')};
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{paused=false;objs=[];showTitle()};
$('againBtn').onclick=()=>{snd('click');start(mode)};$('oMenu').onclick=()=>{snd('click');showTitle()};
addEventListener('keydown',e=>{if(e.key==='p'||e.key==='Escape')togglePause()});
let lt=performance.now();
function frame(now){const dt=Math.min(.033,(now-lt)/1000);lt=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}
  if(!paused)update(dt);draw();requestAnimationFrame(frame)}
showTitle();requestAnimationFrame(frame);
window.__fs={start,get objs(){return objs},cutLine,endSwipe,get score(){return score},get state(){return state},get lives(){return lives}};
});
