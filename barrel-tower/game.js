/* 통 굴리기 탑 — 굴러오는 통을 피해 사다리를 올라 친구 구하기. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const MOBILE=matchMedia('(pointer:coarse)').matches,P=D.player,G=D.girders,LAD=D.ladders,SAVE='barrelTower.save';
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const save=Object.assign({best:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,S=20,OX=0,OY=0;
function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;const top=48,bot=MOBILE?(Wd<Ht?170:20):36;
  S=Math.min((Wd-(MOBILE&&Wd>Ht?300:0))/28,(Ht-top-bot)/33);OX=(Wd-28*S)/2;OY=top+((Ht-top-bot)-33*S)/2+S}
addEventListener('resize',fit);fit();

// ---------- 철골
const gx0=i=>Math.min(G[i][0],G[i][2]),gx1=i=>Math.max(G[i][0],G[i][2]);
const inG=(i,x)=>x>=gx0(i)-.05&&x<=gx1(i)+.05;
const gy=(i,x)=>{const [x1,y1,x2,y2]=G[i];return y1+(y2-y1)*((x-x1)/(x2-x1))};
const downDir=i=>G[i][1]>G[i][3]?-1:1;
function landOn(x,py,ny){let best=null,by=1e9;for(let i=0;i<G.length;i++){if(!inG(i,x))continue;const y=gy(i,x);if(py<=y+.05&&ny>=y&&y<by){by=y;best=i}}return best}
const ladTop=l=>gy(l[2],l[0]),ladBot=l=>gy(l[1],l[0]),ladLimit=l=>l[3]?ladBot(l)-(ladBot(l)-ladTop(l))*.45:ladTop(l);

// ---------- 상태
const pl={x:3,y:0,vx:0,vy:0,on:0,lad:null,air:false,face:1,fallY:0,hammer:0,anim:0,dead:0};
let clearT=0,state='title',paused=false,time=0,score=0,lives=P.lives,lvl=0,bonus=5000,barrels=[],fires=[],hammers=[],throwT=1.5,bonusT=0,flash=0,gorT=0;
const LV=()=>D.levels[Math.min(lvl,D.levels.length-1)];
function resetLevel(){Object.assign(pl,{x:3,on:0,lad:null,air:false,vx:0,vy:0,face:1,hammer:0,dead:0});pl.y=gy(0,3);barrels=[];fires=[];throwT=1.5;bonus=5000;bonusT=0;
  hammers=D.hammers.map(([x,g])=>({x,g,got:false}))}
function start(){score=0;lives=P.lives;lvl=0;resetLevel();state='play';paused=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;snd('go');toast('1단계')}

// ---------- 입력
const keys={},btn={};let jumpQ=false;
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true;if(['Space','KeyW','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)jumpQ=true});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;for(const k in btn)btn[k]=false});
function hold(id,k){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();btn[k]=true;if(k==='j')jumpQ=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId)}catch(_){}});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{btn[k]=false;el.classList.remove('on')});el.addEventListener('contextmenu',e=>e.preventDefault())}
hold('tL','l');hold('tR','r');hold('tU','u');hold('tD','d');hold('tJ','j');
// 휴대폰: 화면을 누른 채 끌면 그 방향으로 걷기·사다리, 짧게 톡 치면 점프
const ring=document.getElementById('dragRing');let drag=null;
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||state!=='play')return;e.preventDefault();
  if(drag){jumpQ=true;return}
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:false};try{cv.setPointerCapture(e.pointerId)}catch(_){}
  ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';ring.hidden=false});
cv.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;const l=Math.hypot(dx,dy);
  if(l>70){drag.x=e.clientX-dx/l*70;drag.y=e.clientY-dy/l*70;dx=e.clientX-drag.x;dy=e.clientY-drag.y;ring.style.left=drag.x+'px';ring.style.top=drag.y+'px'}
  if(l>14)drag.moved=true;
  const ax=Math.abs(dx),ay=Math.abs(dy);
  btn.l=dx<-16&&ax>=ay*.6;btn.r=dx>16&&ax>=ay*.6;btn.u=dy<-22&&ay>ax*.7;btn.d=dy>22&&ay>ax*.7;
  ring.firstElementChild.style.transform=`translate(${Math.max(-40,Math.min(40,dx))}px,${Math.max(-40,Math.min(40,dy))}px)`});
const dragEnd=e=>{if(!drag||e.pointerId!==drag.id)return;if(!drag.moved&&performance.now()-drag.t<260)jumpQ=true;drag=null;btn.l=btn.r=btn.u=btn.d=false;ring.hidden=true;ring.firstElementChild.style.transform=''};
cv.addEventListener('pointerup',dragEnd);cv.addEventListener('pointercancel',dragEnd);

// ---------- 진행
function die(){if(pl.dead)return;pl.dead=1.6;snd('lose');lives--;flash=.3}
function update(dt){
  if(pl.dead){pl.dead-=dt;if(pl.dead<=0){if(lives<=0){gameOver();return}resetLevel()}return}
  const L=(keys.ArrowLeft||keys.KeyA||btn.l),R=(keys.ArrowRight||keys.KeyD||btn.r),U=(keys.ArrowUp||keys.KeyW||btn.u),Dn=(keys.ArrowDown||keys.KeyS||btn.d);
  const dir=(R?1:0)-(L?1:0);
  bonusT+=dt;if(bonusT>=2){bonusT=0;bonus=Math.max(0,bonus-100);if(bonus===0){die();return}}
  if(pl.hammer>0)pl.hammer-=dt;
  // 사다리
  if(pl.lad){const l=pl.lad;let vy=(Dn?1:0)-(U?1:0);pl.y+=vy*P.climb*dt;pl.anim+=Math.abs(vy)*dt*8;
    const top=ladLimit(l),bot=ladBot(l);
    if(pl.y<=top){pl.y=top;if(!l[3]){pl.on=l[2];pl.lad=null;pl.y=gy(pl.on,pl.x)}}
    if(pl.y>=bot){pl.y=bot;pl.on=l[1];pl.lad=null}}
  else if(!pl.air){
    if(pl.hammer<=0){for(const l of LAD){if(Math.abs(pl.x-l[0])>.45)continue;if(U&&l[1]===pl.on){pl.lad=l;pl.x=l[0];pl.y-=.05;break}if(Dn&&l[2]===pl.on&&!l[3]){pl.lad=l;pl.x=l[0];pl.y+=.05;break}}}
    if(!pl.lad){
      if(dir){pl.face=dir;pl.x+=dir*P.speed*dt;pl.anim+=dt*10}pl.x=Math.max(.4,Math.min(27.6,pl.x));
      if(jumpQ&&pl.hammer<=0){pl.air=true;pl.vy=-P.jump;pl.vx=dir*P.speed;pl.fallY=pl.y;pl.jumped=new Set();snd('jump')}
      else if(!inG(pl.on,pl.x)){pl.air=true;pl.vy=0;pl.vx=dir*P.speed*.6;pl.fallY=pl.y;pl.jumped=new Set()}
      else pl.y=gy(pl.on,pl.x)}}
  else{pl.vy+=P.gravity*dt;const py=pl.y;pl.y+=pl.vy*dt;pl.x=Math.max(.4,Math.min(27.6,pl.x+pl.vx*dt));
    if(pl.vy<0)pl.fallY=Math.min(pl.fallY,pl.y);
    const g=pl.vy>0?landOn(pl.x,py,pl.y):null;if(g!==null){pl.air=false;pl.on=g;pl.y=gy(g,pl.x);if(pl.y-pl.fallY>P.fall){die();return}}
    if(pl.y>34){die();return}}
  jumpQ=false;
  // 망치
  for(const h of hammers){if(h.got)continue;const hy=gy(h.g,h.x)-1.6;if(Math.abs(pl.x-h.x)<.7&&Math.abs((pl.y-.8)-hy)<1.1){h.got=true;pl.hammer=P.hammerTime;snd('power');toast('망치!')}}
  // 고릴라가 통 던지기
  const lv=LV();throwT-=dt;gorT=Math.max(0,gorT-dt);
  if(throwT<=0){throwT=lv.barrelEvery*(0.8+Math.random()*.4);const g=D.gorilla.girder;barrels.push({x:D.gorilla.x+1.5,y:gy(g,D.gorilla.x+1.5),on:g,dir:downDir(g),st:'roll',vy:0,rot:0,jumped:false,blue:Math.random()<.12&&lvl>0});gorT=.5;snd('thud')}
  for(let i=barrels.length-1;i>=0;i--){const b=barrels[i];b.rot+=b.dir*dt*8;
    if(b.st==='roll'){const px=b.x;b.x+=b.dir*lv.barrelSpeed*dt;
      for(const l of LAD){if(l[2]!==b.on)continue;if((px-l[0])*(b.x-l[0])<=0&&Math.random()<lv.ladderChance*(pl.y>b.y?1.4:.6)){b.st='lad';b.x=l[0];b.lad=l;break}}
      if(b.st==='roll'){if(!inG(b.on,b.x)){b.st='fall';b.vy=0}else b.y=gy(b.on,b.x)}}
    else if(b.st==='lad'){b.y+=3.2*dt;const bot=ladBot(b.lad);if(b.y>=bot){b.y=bot;b.on=b.lad[1];b.dir=downDir(b.on);b.st='roll'}}
    else{b.vy+=P.gravity*.8*dt;const py=b.y;b.y+=b.vy*dt;b.x+=b.dir*1.6*dt;const g=landOn(b.x,py,b.y);if(g!==null){b.on=g;b.y=gy(g,b.x);b.dir=downDir(g);b.st='roll';snd('bounce',.5)}}
    if(b.on===0&&b.st==='roll'&&b.x<1.2){barrels.splice(i,1);if(fires.length<lv.fires){fires.push({x:1.5,y:gy(0,1.5),on:0,dir:1,t:0,lad:null});toast('불꽃이 나왔어요!')}continue}
    if(b.y>34||b.x<-2||b.x>30){barrels.splice(i,1);continue}
    // 망치로 부수기
    if(pl.hammer>0&&Math.abs(b.x-(pl.x+pl.face*.9))<.9&&Math.abs((b.y-.5)-(pl.y-.9))<1.2){barrels.splice(i,1);score+=300;snd('crack');toast('+300');continue}
    // 부딪힘
    if(Math.abs(b.x-pl.x)<.62&&b.y-.9<pl.y-.1&&b.y>pl.y-1.4){die();return}
    if(pl.air&&!b.jumped&&Math.abs(b.x-pl.x)<.8&&b.y>pl.y&&b.y-pl.y<2.6){b.jumped=true;score+=100;snd('coin')}}
  // 불꽃
  for(const f of fires){f.t+=dt;
    if(f.lad){f.y+=f.ldir*2*dt;const top=ladTop(f.lad),bot=ladBot(f.lad);if(f.y<=top){f.y=top;f.on=f.lad[2];f.lad=null}else if(f.y>=bot){f.y=bot;f.on=f.lad[1];f.lad=null}}
    else{f.x+=f.dir*1.6*dt;if(!inG(f.on,f.x+f.dir*.3)||Math.random()<dt*.3)f.dir=-f.dir;f.y=gy(f.on,f.x);
      if(Math.random()<dt*.8)for(const l of LAD){if(Math.abs(f.x-l[0])<.2&&!l[3]){if(l[1]===f.on&&Math.random()<.6){f.lad=l;f.ldir=-1;f.x=l[0]}else if(l[2]===f.on){f.lad=l;f.ldir=1;f.x=l[0]}break}}}
    if(pl.hammer>0&&Math.abs(f.x-(pl.x+pl.face*.9))<.9&&Math.abs(f.y-pl.y)<1.4){f.dead=true;score+=500;snd('crack');toast('+500')}
    else if(Math.abs(f.x-pl.x)<.7&&Math.abs((f.y-.5)-(pl.y-.8))<1){die();return}}
  fires=fires.filter(f=>!f.dead);
  // 도착
  if(!pl.lad&&!pl.air&&pl.on===G.length-1){score+=bonus;snd('win');toast('토리를 구했어요! +'+bonus);lvl++;state='clear';clearT=2}
  setT($('score'),score);setT($('lvl'),lvl+1);setT($('lives'),'♥'.repeat(Math.max(0,lives)));setT($('bonus'),bonus);
}
function gameOver(){state='over';const best=score>save.best;if(best)save.best=score;store();if(window.Arcade)Arcade.record('barrelTowerBest',save.best);
  setT($('oScore'),score);$('oTxt').textContent=`${lvl+1}단계까지 왔어요`+(best?' · 최고 기록!':` · 최고 ${save.best}점`);$('overOv').hidden=false;$('againBtn').focus()}
function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}

// ---------- 그리기
const X=x=>OX+x*S,Y=y=>OY+y*S;
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,Wd,Ht);
  if(flash>0){ctx.fillStyle=`rgba(255,80,80,${flash})`;ctx.fillRect(0,0,Wd,Ht)}
  // 사다리
  for(const l of LAD){const x=X(l[0]),t=Y(ladTop(l)),b=Y(ladBot(l));ctx.strokeStyle='#4ad8e8';ctx.lineWidth=Math.max(2,S*.12);
    ctx.beginPath();ctx.moveTo(x-S*.35,b);ctx.lineTo(x-S*.35,l[3]?Y(ladLimit(l))+S*.6:t);ctx.moveTo(x+S*.35,b);ctx.lineTo(x+S*.35,l[3]?Y(ladLimit(l))+S*.6:t);
    if(l[3]){ctx.moveTo(x-S*.35,t+S*.3);ctx.lineTo(x-S*.35,t+S*1.1);ctx.moveTo(x+S*.35,t+S*.3);ctx.lineTo(x+S*.35,t+S*1.1)}ctx.stroke();
    for(let y=b-S*.5;y>t;y-=S*.7){if(l[3]&&y<Y(ladLimit(l))+S*.6&&y>t+S*1.1)continue;ctx.beginPath();ctx.moveTo(x-S*.35,y);ctx.lineTo(x+S*.35,y);ctx.stroke()}}
  // 철골
  for(const g of G){const [x1,y1,x2,y2]=g;ctx.fillStyle='#e0302a';ctx.beginPath();ctx.moveTo(X(x1),Y(y1));ctx.lineTo(X(x2),Y(y2));ctx.lineTo(X(x2),Y(y2)+S*.7);ctx.lineTo(X(x1),Y(y1)+S*.7);ctx.fill();
    ctx.strokeStyle='#ff8a6a';ctx.lineWidth=1.5;const n=Math.round(Math.abs(x2-x1));for(let k=0;k<n;k++){const xa=x1+(x2-x1)*k/n,xb=x1+(x2-x1)*(k+1)/n,ya=y1+(y2-y1)*k/n,yb=y1+(y2-y1)*(k+1)/n;ctx.beginPath();ctx.moveTo(X(xa),Y(ya)+S*.65);ctx.lineTo(X((xa+xb)/2),Y((ya+yb)/2)+S*.08);ctx.lineTo(X(xb),Y(yb)+S*.65);ctx.stroke()}}
  // 기름통
  ctx.fillStyle='#2f6ad0';ctx.fillRect(X(.1),Y(gy(0,.6))-S*1.5,S*1.1,S*1.5);ctx.fillStyle='#fff';ctx.font=`${S*.45}px Jua, sans-serif`;ctx.textAlign='center';ctx.fillText('OIL',X(.65),Y(gy(0,.6))-S*.6);
  if(fires.length||lvl>0){ctx.fillStyle=Math.floor(time*8)%2?'#ffb020':'#ff5a2a';ctx.beginPath();ctx.moveTo(X(.2),Y(gy(0,.6))-S*1.5);ctx.lineTo(X(.65),Y(gy(0,.6))-S*2.3);ctx.lineTo(X(1.1),Y(gy(0,.6))-S*1.5);ctx.fill()}
  // 친구
  const fg=G.length-1,fx=D.friend,fy=gy(fg,fx);ctx.fillStyle='#ffb0d0';ctx.fillRect(X(fx-.4),Y(fy)-S*1.3,S*.8,S*1.3);ctx.fillRect(X(fx-.3),Y(fy)-S*2,S*.2,S*.8);ctx.fillRect(X(fx+.1),Y(fy)-S*2,S*.2,S*.8);
  ctx.fillStyle='#111';ctx.fillRect(X(fx-.2),Y(fy)-S*1.05,S*.1,S*.12);ctx.fillRect(X(fx+.1),Y(fy)-S*1.05,S*.1,S*.12);
  if(Math.floor(time*1.5)%2){ctx.fillStyle='#fff';ctx.font=`${S*.6}px Jua, sans-serif`;ctx.fillText('도와줘!',X(fx+2),Y(fy)-S*1.5)}
  // 고릴라
  const gg=D.gorilla,gx=gg.x,gyy=gy(gg.girder,gx),arm=gorT>0?-1:Math.sin(time*4)*.3;
  ctx.fillStyle='#7a4a2a';ctx.fillRect(X(gx-1.3),Y(gyy)-S*2.8,S*2.6,S*2.2);ctx.fillRect(X(gx-.9),Y(gyy)-S*3.7,S*1.8,S*1.2);
  ctx.fillStyle='#d8a878';ctx.fillRect(X(gx-.6),Y(gyy)-S*3.3,S*1.2,S*.8);ctx.fillRect(X(gx-.7),Y(gyy)-S*2.4,S*1.4,S*1.4);
  ctx.fillStyle='#111';ctx.fillRect(X(gx-.4),Y(gyy)-S*3.2,S*.2,S*.2);ctx.fillRect(X(gx+.2),Y(gyy)-S*3.2,S*.2,S*.2);
  ctx.fillStyle='#7a4a2a';ctx.fillRect(X(gx-2),Y(gyy)-S*(2.6+arm),S*.7,S*1.6);ctx.fillRect(X(gx+1.3),Y(gyy)-S*(2.6-arm),S*.7,S*1.6);
  ctx.fillRect(X(gx-1.1),Y(gyy)-S*.6,S*.8,S*.6);ctx.fillRect(X(gx+.3),Y(gyy)-S*.6,S*.8,S*.6);
  ctx.fillStyle='#8a5a2a';for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(X(gx-2.4),Y(gyy)-S*(.5+k*.8),S*.45,S*.38,0,0,7);ctx.fill()}
  // 망치
  for(const h of hammers){if(h.got)continue;const hy=gy(h.g,h.x)-1.6;ctx.fillStyle='#c88a4a';ctx.fillRect(X(h.x)-S*.08,Y(hy),S*.16,S*.9);ctx.fillStyle='#d0d6e0';ctx.fillRect(X(h.x)-S*.35,Y(hy)-S*.1,S*.7,S*.35)}
  // 통
  for(const b of barrels){const x=X(b.x),y=Y(b.y)-S*.5;ctx.save();ctx.translate(x,y);ctx.rotate(b.rot);ctx.fillStyle=b.blue?'#3a8ad8':'#a0622a';ctx.beginPath();ctx.arc(0,0,S*.5,0,7);ctx.fill();
    ctx.strokeStyle=b.blue?'#9ad0ff':'#5a3010';ctx.lineWidth=S*.1;ctx.beginPath();ctx.moveTo(-S*.45,-S*.15);ctx.lineTo(S*.45,-S*.15);ctx.moveTo(-S*.45,S*.15);ctx.lineTo(S*.45,S*.15);ctx.stroke();ctx.restore()}
  for(const f of fires){const x=X(f.x),y=Y(f.y);ctx.fillStyle=Math.floor(time*10)%2?'#ffd23f':'#ff7a1c';ctx.beginPath();ctx.moveTo(x-S*.4,y);ctx.quadraticCurveTo(x,y-S*1.6,x+S*.4,y);ctx.fill();ctx.fillStyle='#111';ctx.fillRect(x-S*.2,y-S*.6,S*.1,S*.12);ctx.fillRect(x+.1*S,y-S*.6,S*.1,S*.12)}
  // 주인공
  if(!(pl.dead&&Math.floor(time*10)%2)){const x=X(pl.x),y=Y(pl.y),f=pl.face,w=Math.sin(pl.anim)*S*.15;
    ctx.fillStyle='#6a4a2a';ctx.fillRect(x-S*.35,y-S*.6,S*.3,S*.6);ctx.fillRect(x+S*.05,y-S*.6,S*.3,S*.6);
    ctx.fillStyle='#ff9a1c';ctx.fillRect(x-S*.4,y-S*1.2,S*.8,S*.65);ctx.fillStyle='#ffd23f';ctx.fillRect(x-S*.1,y-S*1.15,S*.2,S*.5);
    ctx.fillStyle='#ffd0a0';ctx.fillRect(x-S*.32,y-S*1.68,S*.64,S*.5);ctx.fillStyle='#33b86a';ctx.fillRect(x-S*.38,y-S*1.8,S*.76,S*.2);ctx.fillRect(x+f*S*.1,y-S*1.68,S*.36*f,S*.1);
    ctx.fillStyle='#111';ctx.fillRect(x+f*S*.12,y-S*1.5,S*.08,S*.1);
    if(pl.hammer>0){const up=Math.floor(time*8)%2;ctx.fillStyle='#c88a4a';ctx.fillRect(x+f*S*.5,y-S*(up?2.2:1.3),S*.14,S*.8);ctx.fillStyle=pl.hammer<2&&Math.floor(time*10)%2?'#ff6a6a':'#d0d6e0';ctx.fillRect(x+f*S*.5-S*.25,y-S*(up?2.4:1.4),S*.64,S*.32)}}
}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.04);last=now;if(!paused){time+=dt;flash=Math.max(0,flash-dt);if(state==='play')update(dt);else if(state==='clear'&&(clearT-=dt)<=0){resetLevel();state='play';toast((lvl+1)+'단계')}}draw();requestAnimationFrame(frame)}
function toTitle(){state='title';for(const id of ['pauseOv','overOv'])$(id).hidden=true;resetLevel();setT($('tBest'),save.best);$('titleOv').hidden=false}
$('startBtn').onclick=()=>{snd('select');start()};$('againBtn').onclick=()=>{snd('select');start()};$('oMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__bt={pl,get barrels(){return barrels},get state(){return state},start,keys,btn,jump:()=>jumpQ=true,get lvl(){return lvl},get lives(){return lives},get score(){return score},gy,LAD,G};
});
