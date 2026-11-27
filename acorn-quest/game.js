/* 도토리 대모험 — 달리고 뛰어 깃발까지 가는 옆으로 가기 모험. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='acornQuest.save',PP=D.player;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,sgn=v=>v<0?-1:1,rand=(a,b)=>a+Math.random()*(b-a);
const save=Object.assign({open:1,best:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,T=40,OY=0;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;T=Math.min(Ht/15.2,Wd/12);OY=Wd<Ht?Math.max(60,(Ht-15*T)*.35):(Ht-15*T)/2}addEventListener('resize',fit);fit();
let bigT=0;function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1.5}

// ---------- 상태
let LV=0,map=null,MW=0,MH=15,theme='field',P=null,ens=[],items=[],fires=[],parts=[],coinsMap=new Set(),bumps=[],camX=0,state='title',paused=false,time=0,clock=0,lives=D.lives,coins=0,flagX=0,castleX=0,checkX=0,startX=3,deadT=0,clearT=0,useCheck=false;
const SOLID='#BXp=?ME';
const tile=(x,y)=>{if(x<0)return '#';if(y<0||y>=MH||x>=MW)return '.';return map[y][x]};
const solidAt=(x,y)=>SOLID.includes(tile(Math.floor(x),Math.floor(y)));
function load(i,keepSize){LV=i;const L=D.levels[i];theme=L.theme;map=L.map.map(r=>r.split(''));MW=map[0].length;ens=[];items=[];fires=[];parts=[];coinsMap=new Set();bumps=[];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];
    if(c==='@'){startX=x;map[y][x]='.'}else if(c==='c'){coinsMap.add(x+','+y);map[y][x]='.'}
    else if(c==='e'||c==='s'||c==='b'){ens.push({t:c==='e'?'walk':c==='s'?'snail':'bee',x:x+.1,y:y+.15,w:.8,h:.85,vx:c==='b'?-1.4:-2,vy:0,alive:true,act:false,by:y,ph:Math.random()*6,dead:0});map[y][x]='.'}
    else if(c==='F'){flagX=x;map[y][x]='.'}else if(c==='C'){castleX=x;map[y][x]='.'}}
  checkX=Math.floor(MW*.5);
  const sx=useCheck?checkX:startX;let sy=1;for(let y=0;y<MH;y++)if(SOLID.includes(tile(sx,y))){sy=y;break}
  const size=keepSize?P.size:0;P={x:sx+.15,y:sy-(size?1.75:.9),w:.7,h:size?1.75:.9,vx:0,vy:0,ground:false,face:1,size,inv:0,coyote:0,buf:0,fireCd:0,anim:0,flag:0};
  camX=Math.max(0,P.x-5);clock=L.time;state='play';hud()}
function hud(){setT($('hLife'),lives);setT($('hCoin'),coins);setT($('hLv'),D.levels[LV].name.split('.')[0]+'단계');setT($('hTime'),Math.ceil(clock));$('bF').classList.toggle('off',P&&P.size<2)}

// ---------- 몸 움직이기 (타일 충돌)
function moveBody(o,dt,onHead){o.hitWall=0;o.ground=false;
  o.x+=o.vx*dt;
  if(o.vx>0){const r=o.x+o.w;for(let y=Math.floor(o.y+.02);y<=Math.floor(o.y+o.h-.02);y++)if(solidAt(r,y)){o.x=Math.floor(r)-o.w-.001;o.vx=0;o.hitWall=1;break}}
  else if(o.vx<0){for(let y=Math.floor(o.y+.02);y<=Math.floor(o.y+o.h-.02);y++)if(solidAt(o.x,y)){o.x=Math.floor(o.x)+1.001;o.vx=0;o.hitWall=-1;break}}
  o.y+=o.vy*dt;
  if(o.vy>0){const b=o.y+o.h;for(let x=Math.floor(o.x+.04);x<=Math.floor(o.x+o.w-.04);x++)if(solidAt(x,b)){o.y=Math.floor(b)-o.h;o.vy=0;o.ground=true;break}}
  else if(o.vy<0){let hit=null,bd=9;for(let x=Math.floor(o.x+.04);x<=Math.floor(o.x+o.w-.04);x++)if(solidAt(x,o.y)){const d=Math.abs(x+.5-(o.x+o.w/2));if(d<bd){bd=d;hit=x}}
    if(hit!==null){const ty=Math.floor(o.y);o.y=ty+1;o.vy=0;if(onHead)onHead(hit,ty)}}}

// ---------- 머리 박치기
function headHit(x,y){const c=tile(x,y);bumps.push({x,y,t:0});
  // 위에 있는 적 혼내기
  for(const e of ens)if(e.alive&&Math.abs(e.x+e.w/2-(x+.5))<.8&&Math.abs(e.y+e.h-y)<.3){killEnemy(e,true)}
  if(c==='?'){map[y][x]='E';coins++;snd('coin');parts.push({k:'coin',x:x+.5,y:y-.5,vy:-12,t:0});lifeCheck();hud()}
  else if(c==='M'){map[y][x]='E';snd('power');items.push({k:P.size===0?'acorn':'fruit',x:x+.1,y:y-.01,w:.8,h:.8,vx:P.size===0?3:0,vy:0,rise:.8})}
  else if(c==='B'){if(P.size>0){map[y][x]='.';snd('crack');for(let i=0;i<4;i++)parts.push({k:'brick',x:x+.5,y:y+.5,vx:(i%2?1:-1)*rand(2,4),vy:-rand(8,13),t:0})}else snd('thud')}
  else snd('thud')}
function lifeCheck(){if(coins>=50){coins-=50;lives++;snd('level');big('목숨 +1!')}}

// ---------- 적
function killEnemy(e,flip){e.alive=false;e.dead=flip?1.5:.5;e.flip=flip;e.vy=flip?-8:0;snd(flip?'pop':'thud')}
function stomp(e){if(e.t==='snail'){e.t='shell';e.vx=0;e.h=.7;e.y+=.15;e.kickT=.2;snd('thud')}else if(e.t==='shell'){if(e.vx!==0){e.vx=0;e.kickT=.2;snd('thud')}else kick(e)}else killEnemy(e,false)}
function kick(e){e.vx=sgn(e.x+e.w/2-(P.x+P.w/2))*12;e.kickT=.25;snd('hit')}
function updEnemy(e,dt){if(!e.act){if(e.x<camX+Wd/T+2)e.act=true;else return}
  if(!e.alive){e.dead-=dt;if(e.flip){e.vy+=40*dt;e.y+=e.vy*dt}return}
  if(e.t==='bee'){e.ph+=dt*2.6;e.x+=e.vx*dt;e.y=e.by+Math.sin(e.ph)*1.3;if(Math.random()<dt*.25)e.vx*=-1;return}
  e.vy=Math.min(18,e.vy+40*dt);moveBody(e,dt);if(e.hitWall){e.vx=-e.hitWall*Math.abs(e.vx||2);if(e.t==='shell')snd('thud')}
  if(e.t==='walk'&&e.vx===0)e.vx=-2;if(e.t==='snail'&&e.vx===0)e.vx=-1.6;
  if(e.kickT>0)e.kickT-=dt;
  if(e.t==='shell'&&e.vx!==0){for(const o of ens)if(o!==e&&o.alive&&overlap(e,o)){killEnemy(o,true)}}
  if(e.y>MH+2)e.alive=false,e.dead=0}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

// ---------- 입력
const keys={};let jumpHit=false,fireHit=false;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k]){if(k===' '||k==='arrowup'||k==='w'||k==='z')jumpHit=true;if(k==='x'||k==='j')fireHit=true;if(k==='p'||k==='escape')togglePause()}keys[k]=true;if([' ','arrowup','arrowdown'].includes(k))e.preventDefault()});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
let stk=null;const sz=$('stickZone');
sz.addEventListener('pointerdown',e=>{stk={id:e.pointerId,ox:e.clientX,oy:e.clientY,dx:0,dy:0};const s=$('stick');s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';s.style.display='block'});
addEventListener('pointermove',e=>{if(!stk||e.pointerId!==stk.id)return;let dx=e.clientX-stk.ox,dy=e.clientY-stk.oy;const l=Math.hypot(dx,dy);if(l>55){dx*=55/l;dy*=55/l}stk.dx=dx;stk.dy=dy;const k=$('stick').querySelector('i');if(k)k.style.transform=`translate(${dx}px,${dy}px)`});
const endStk=e=>{if(stk&&e.pointerId===stk.id){stk=null;$('stick').style.display='none'}};addEventListener('pointerup',endStk);addEventListener('pointercancel',endStk);
let jumpTouch=false;
const bJ=$('bJ'),bF=$('bF');
bJ.addEventListener('pointerdown',e=>{e.preventDefault();jumpHit=true;jumpTouch=true;bJ.classList.add('on')});
for(const ev of ['pointerup','pointercancel','pointerleave'])bJ.addEventListener(ev,()=>{jumpTouch=false;bJ.classList.remove('on')});
bF.addEventListener('pointerdown',e=>{e.preventDefault();fireHit=true;bF.classList.add('on')});bF.addEventListener('pointerup',()=>bF.classList.remove('on'));
function input(){let x=0,run=keys.shift;if(keys.arrowleft||keys.a)x-=1;if(keys.arrowright||keys.d)x+=1;if(stk){x=Math.abs(stk.dx)>8?clamp(stk.dx/40,-1,1):0;if(Math.abs(stk.dx)>42)run=true}
  return {x,run,jump:jumpTouch||keys[' ']||keys.arrowup||keys.w||keys.z}}

// ---------- 플레이어
function setSize(s){const oh=P.h;P.size=s;P.h=s?1.75:.9;P.y+=oh-P.h;if(P.h>oh&&solidAt(P.x+.1,P.y)||solidAt(P.x+P.w-.1,P.y)){}hud()}
function hurt(){if(P.inv>0||state!=='play')return;if(P.size>0){setSize(0);P.inv=1.8;snd('hurt');big('앗!')}else die()}
function die(){if(state!=='play')return;state='dying';deadT=0;P.vy=-14;P.vx=0;snd('lose')}
function updPlayer(dt){const I=input();const max=I.run?PP.run:PP.walk;
  if(P.flag){updFlag(dt);return}
  const acc=P.ground?32:20;if(I.x){P.vx+=clamp(I.x*max-P.vx,-acc*dt,acc*dt);P.face=sgn(I.x)}else{const f=P.ground?28:6;P.vx-=clamp(P.vx,-f*dt,f*dt)}
  P.coyote=P.ground?.09:Math.max(0,P.coyote-dt);if(jumpHit)P.buf=.13;else P.buf=Math.max(0,P.buf-dt);
  if(P.buf>0&&P.coyote>0){P.vy=-PP.jump*(1+Math.abs(P.vx)/PP.run*.08);P.buf=0;P.coyote=0;P.ground=false;snd('jump')}
  P.vy=Math.min(PP.fall,P.vy+(P.vy<0&&I.jump?PP.gravUp:PP.grav)*dt);
  moveBody(P,dt,headHit);if(P.x<camX)P.x=camX,P.vx=Math.max(0,P.vx);
  P.anim+=Math.abs(P.vx)*dt*1.8;P.inv=Math.max(0,P.inv-dt);P.fireCd=Math.max(0,P.fireCd-dt);
  if(fireHit&&P.size===2&&P.fireCd<=0&&fires.length<2){fires.push({x:P.x+P.w/2+P.face*.4,y:P.y+.6,vx:P.face*11,vy:2,t:0});P.fireCd=.25;snd('shoot')}
  // 코인
  for(let y=Math.floor(P.y);y<=Math.floor(P.y+P.h);y++)for(let x=Math.floor(P.x);x<=Math.floor(P.x+P.w);x++){const k=x+','+y;if(coinsMap.has(k)){coinsMap.delete(k);coins++;snd('coin');lifeCheck();hud()}}
  // 적
  for(const e of ens){if(!e.alive||!e.act||!overlap(P,e))continue;
    const fromTop=P.vy>0&&(P.y+P.h)-e.y<.55;
    if(fromTop){stomp(e);P.vy=I.jump?-15:-10;P.y=e.y-P.h-.01;continue}
    if(e.t==='shell'&&e.vx===0){kick(e);continue}
    if(e.t==='shell'&&e.kickT>0)continue;hurt()}
  // 아이템
  for(const it of items){if(it.rise>0||it.got||!overlap(P,it))continue;it.got=1;if(it.k==='acorn'){if(P.size===0)setSize(1);snd('level');big('쑥쑥!')}else{if(P.size===0)setSize(1);P.size=2;snd('level');big('불씨 파워!');hud()}}
  // 구덩이
  if(P.y>MH+1)die();
  if(P.x>checkX&&!useCheck){useCheck=true}
  // 깃발
  if(P.x+P.w>flagX+.3&&!P.flag){P.flag=1;P.x=flagX-P.w+.45;P.vx=0;P.vy=0;const h=Math.max(0,12-P.y);const bonus=Math.round(h)*2;coins+=bonus;snd('goal');big(bonus?'깃발! +'+bonus+'🪙':'깃발!');lifeCheck();hud()}}
function updFlag(dt){if(P.flag===1){P.y=Math.min(13-P.h,P.y+8*dt);if(P.y>=13-P.h-.01){P.flag=2;P.x=flagX+.6}}
  else if(P.flag===2){P.vx=4;P.vy=Math.min(PP.fall,P.vy+PP.grav*dt);moveBody(P,dt);P.anim+=dt*7;if(P.x>castleX+1.5){P.flag=3;clearT=0}}
  else if(P.flag===3){clearT+=dt;if(clearT>1&&state==='play')levelClear()}}
function levelClear(){state='clear';const left=Math.ceil(clock);const b=Math.floor(left/10);coins+=b;
  save.best[LV]=Math.max(save.best[LV]||0,left);if(LV+1<D.levels.length)save.open=Math.max(save.open,LV+2);store();Arcade.record&&Arcade.record('acornQuestStage',Math.min(D.levels.length,LV+1));
  const last=LV+1>=D.levels.length;$('oTitle').textContent=last?'🎉 모두 클리어!':'스테이지 클리어!';$('oTxt').innerHTML='남은 시간 '+left+'초 → 보너스 '+b+'🪙'+(last?'<br>도리가 숲을 모두 건넜어요!':'');
  $('againBtn').textContent=last?'처음부터 다시':'다음 스테이지';$('overOv').hidden=false;snd('win')}

// ---------- 갱신
function update(dt){time+=dt;
  if(state==='dying'){deadT+=dt;P.vy+=40*dt;P.y+=P.vy*dt;if(deadT>2){lives--;if(lives<=0){gameOver();return}P.size=0;load(LV,false);big('다시 한 번!')}return}
  if(state!=='play')return;
  if(!P.flag){clock-=dt;if(clock<=0){clock=0;die()}}
  updPlayer(dt);jumpHit=false;fireHit=false;
  for(const e of ens)updEnemy(e,dt);ens=ens.filter(e=>e.alive||e.dead>0);
  for(const it of items){if(it.rise>0){it.rise-=dt;it.y-=dt*1.0;continue}it.vy=Math.min(18,it.vy+40*dt);moveBody(it,dt);if(it.hitWall)it.vx=-it.hitWall*3;if(it.y>MH+2)it.got=1}
  items=items.filter(i=>!i.got);
  for(const f of fires){f.t+=dt;f.vy=Math.min(16,f.vy+50*dt);f.x+=f.vx*dt;f.y+=f.vy*dt;if(solidAt(f.x,f.y+.2)&&f.vy>0){f.y=Math.floor(f.y+.2)-.2;f.vy=-8}if(solidAt(f.x+sgn(f.vx)*.2,f.y))f.t=9;
    for(const e of ens)if(e.alive&&e.act&&f.x>e.x&&f.x<e.x+e.w&&f.y>e.y-.1&&f.y<e.y+e.h+.1){killEnemy(e,true);f.t=9;break}}
  fires=fires.filter(f=>f.t<3&&f.x>camX-1&&f.x<camX+Wd/T+1);
  for(const p of parts){p.t+=dt;p.vy+=40*dt;p.y+=p.vy*dt;if(p.vx)p.x+=p.vx*dt}parts=parts.filter(p=>p.t<(p.k==='coin'?.45:1.2));
  for(const b of bumps)b.t+=dt;bumps=bumps.filter(b=>b.t<.2);
  const vw=Wd/T;camX=clamp(Math.max(camX,P.x-vw*.38),0,Math.max(0,MW-vw));
  if(Math.floor(clock)!==Math.floor(clock+dt))hud()}
function gameOver(){state='over';$('oTitle').textContent='게임 오버';$('oTxt').innerHTML=D.levels[LV].name+'에서 멈췄어요. 다시 도전!';$('againBtn').textContent='이 스테이지 다시';$('overOv').hidden=false}

// ---------- 그리기
const TH={field:{sky:['#6ac8ff','#c8ecff'],top:'#5ac85a',dirt:'#c8864a',dirt2:'#a86a3a',hill:'#8ad87a'},cave:{sky:['#1a1a30','#2a2a48'],top:'#6a8ac8',dirt:'#4a5a8a',dirt2:'#3a4a70',hill:'#24244a'},sky:{sky:['#ffb8d8','#ffe8c8'],top:'#fff',dirt:'#e8e0f8',dirt2:'#c8c0e8',hill:'#ffd8e8'}};
function draw(){const W=Wd,H=Ht,th=TH[theme];ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.sky[0]);g.addColorStop(1,th.sky[1]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const X=x=>(x-camX)*T,Y=y=>OY+y*T;
  // 배경
  if(theme!=='cave'){ctx.fillStyle=th.hill;for(let i=-1;i<8;i++){const bx=((i*9-camX*.3)%72+72)%72-8;ctx.beginPath();ctx.ellipse(bx*T,Y(13),T*4,T*2.4,0,Math.PI,0);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<6;i++){const bx=((i*13-camX*.15)%80+80)%80-6;const by=1.5+(i*3)%5;ctx.beginPath();ctx.ellipse(bx*T,Y(by),T*1.4,T*.55,0,0,7);ctx.ellipse(bx*T+T*.9,Y(by)-T*.3,T*.9,T*.5,0,0,7);ctx.fill()}}
  else{ctx.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<30;i++){const bx=((i*7.3-camX*.4)%60+60)%60;ctx.fillRect(bx*T,Y((i*5)%12+1),3,3)}}
  if(OY>0){ctx.fillStyle=th.dirt2;ctx.fillRect(0,Y(15),W,H-Y(15))}
  const x0=Math.floor(camX)-1,x1=Math.ceil(camX+W/T)+1;
  // 성
  if(castleX>=x0-6&&castleX<=x1+6){const cx=X(castleX-2),cy=Y(13);ctx.fillStyle=theme==='cave'?'#6a6a8a':'#b8a088';ctx.fillRect(cx,cy-T*4,T*5,T*4);for(let i=0;i<5;i+=2)ctx.fillRect(cx+i*T,cy-T*4.6,T*.9,T*.6);ctx.fillRect(cx+T*1.5,cy-T*6,T*2,T*2);ctx.fillRect(cx+T*1.5,cy-T*6.5,T*.6,T*.5);ctx.fillRect(cx+T*2.9,cy-T*6.5,T*.6,T*.5);
    ctx.fillStyle='#3a2a2a';ctx.beginPath();ctx.roundRect(cx+T*1.8,cy-T*1.8,T*1.4,T*1.8,[T*.7,T*.7,0,0]);ctx.fill();ctx.fillStyle='#ff9a3a';ctx.beginPath();ctx.moveTo(cx+T*2.5,cy-T*6);ctx.lineTo(cx+T*2.5,cy-T*7.4);ctx.lineTo(cx+T*3.4,cy-T*7);ctx.lineTo(cx+T*2.5,cy-T*6.7);ctx.fill()}
  // 깃대
  if(flagX>=x0&&flagX<=x1){const fx=X(flagX+.5);ctx.fillStyle='#e8e8e8';ctx.fillRect(fx-T*.06,Y(2),T*.12,T*10);ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(fx,Y(2),T*.2,0,7);ctx.fill();
    const fy=P.flag?Math.min(Y(P.y),Y(11)):Y(2.4);ctx.fillStyle='#4ac45a';ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx-T*1.1,fy+T*.4);ctx.lineTo(fx,fy+T*.8);ctx.fill();ctx.fillStyle='#fff';ctx.font=(T*.4)+'px Jua';ctx.textAlign='center';ctx.fillText('🌰',fx-T*.45,fy+T*.55)}
  for(let y=0;y<MH;y++)for(let x=Math.max(0,x0);x<=Math.min(MW-1,x1);x++){const c=map[y][x];if(c==='.')continue;let bx=X(x),by=Y(y);const bm=bumps.find(b=>b.x===x&&b.y===y);if(bm)by-=Math.sin(bm.t/.2*Math.PI)*T*.3;drawTile(c,bx,by,x,y,th)}
  // 코인
  for(const k of coinsMap){const [x,y]=k.split(',').map(Number);if(x<x0||x>x1)continue;coinG(X(x+.5),Y(y+.5),T*.3,time*4+x)}
  for(const p of parts){if(p.k==='coin')coinG(X(p.x),Y(p.y),T*.3,time*12);else{ctx.fillStyle='#c8643a';ctx.fillRect(X(p.x)-T*.15,Y(p.y)-T*.15,T*.3,T*.3)}}
  for(const it of items){const ix=X(it.x+.4),iy=Y(it.y+.4);if(it.k==='acorn'){ctx.fillStyle='#e8a040';ctx.beginPath();ctx.ellipse(ix,iy+T*.08,T*.3,T*.32,0,0,7);ctx.fill();ctx.fillStyle='#8a5a2a';ctx.beginPath();ctx.ellipse(ix,iy-T*.12,T*.36,T*.18,0,Math.PI,0);ctx.fill();ctx.fillRect(ix-T*.04,iy-T*.38,T*.08,T*.12);ctx.fillStyle='#ffe8a0';ctx.beginPath();ctx.arc(ix-T*.1,iy+T*.05,T*.07,0,7);ctx.fill()}
    else{ctx.fillStyle='#ff5a3a';ctx.beginPath();ctx.arc(ix,iy+T*.05,T*.3,0,7);ctx.fill();ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(ix-T*.08,iy-T*.02,T*.1,0,7);ctx.fill();ctx.fillStyle='#4ac45a';ctx.beginPath();ctx.ellipse(ix+T*.1,iy-T*.3,T*.14,T*.07,-.5,0,7);ctx.fill()}}
  for(const e of ens)if(e.act||e.x<camX+W/T+2)drawEnemy(e,X,Y);
  for(const f of fires){ctx.fillStyle='#ff7a2a';ctx.beginPath();ctx.arc(X(f.x),Y(f.y),T*.18,0,7);ctx.fill();ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(X(f.x),Y(f.y),T*.09,0,7);ctx.fill()}
  if(!(P.flag===3)&&!(P.inv>0&&Math.floor(time*14)%2))drawHero(X(P.x+P.w/2),Y(P.y+P.h),P)}
function coinG(x,y,r,t){const s=Math.abs(Math.cos(t));ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.ellipse(x,y,r*Math.max(.2,s),r,0,0,7);ctx.fill();ctx.strokeStyle='#d8a020';ctx.lineWidth=2;ctx.stroke()}
function drawTile(c,x,y,tx,ty,th){const t=T;
  if(c==='#'){const top=tile(tx,ty-1)!=='#';ctx.fillStyle=th.dirt;ctx.fillRect(x,y,t+1,t+1);ctx.fillStyle=th.dirt2;ctx.fillRect(x+t*.15,y+t*.55,t*.2,t*.15);ctx.fillRect(x+t*.6,y+t*.3,t*.18,t*.12);if(top){ctx.fillStyle=th.top;ctx.fillRect(x,y,t+1,t*.28);ctx.beginPath();for(let i=0;i<4;i++)ctx.arc(x+t*(.125+i*.25),y+t*.28,t*.12,0,Math.PI);ctx.fill()}}
  else if(c==='B'){ctx.fillStyle='#c8643a';ctx.fillRect(x,y,t,t);ctx.strokeStyle='#8a3a1a';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,t-2,t-2);ctx.beginPath();ctx.moveTo(x,y+t/2);ctx.lineTo(x+t,y+t/2);ctx.moveTo(x+t/2,y);ctx.lineTo(x+t/2,y+t/2);ctx.moveTo(x+t/4,y+t/2);ctx.lineTo(x+t/4,y+t);ctx.moveTo(x+t*.75,y+t/2);ctx.lineTo(x+t*.75,y+t);ctx.stroke()}
  else if(c==='?'||c==='M'){ctx.fillStyle='#ffc23a';ctx.beginPath();ctx.roundRect(x+1,y+1,t-2,t-2,t*.12);ctx.fill();ctx.strokeStyle='#c8862a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font=(t*.6)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',x+t/2,y+t/2+Math.sin(time*5)*t*.04);ctx.textBaseline='alphabetic'}
  else if(c==='E'){ctx.fillStyle='#a8845a';ctx.beginPath();ctx.roundRect(x+1,y+1,t-2,t-2,t*.12);ctx.fill();ctx.fillStyle='#8a6a4a';for(const [a,b] of [[.2,.2],[.8,.2],[.2,.8],[.8,.8]]){ctx.beginPath();ctx.arc(x+t*a,y+t*b,t*.05,0,7);ctx.fill()}}
  else if(c==='X'){ctx.fillStyle=theme==='sky'?'#c8b8e8':'#a8886a';ctx.fillRect(x,y,t,t);ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(x,y,t,t*.12);ctx.fillRect(x,y,t*.12,t);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x,y+t*.88,t,t*.12);ctx.fillRect(x+t*.88,y,t*.12,t)}
  else if(c==='p'){const left=tile(tx-1,ty)!=='p',topL=tile(tx,ty-1)!=='p';ctx.fillStyle='#3ab84a';ctx.fillRect(x+(left?t*.1:0),y,left?t*.9:t*.9,t+1);ctx.fillStyle='#7ae08a';if(left)ctx.fillRect(x+t*.25,y,t*.18,t+1);
    if(topL){ctx.fillStyle='#2a9a3a';ctx.fillRect(x+(left?-t*.05:0),y,left?t*1.05:t*1.05-t*.1+t*.1,t*.45);ctx.fillStyle='#7ae08a';if(left)ctx.fillRect(x+t*.15,y+t*.06,t*.2,t*.32)}}
  else if(c==='='){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x+t/2,y+t*.35,t*.62,t*.38,0,0,7);ctx.fill();ctx.fillStyle='#e8e0f8';ctx.fillRect(x,y+t*.5,t,t*.2)}}
function drawEnemy(e,X,Y){const x=X(e.x+e.w/2),y=Y(e.y+e.h),s=T;ctx.save();ctx.translate(x,y);if(!e.alive&&e.flip)ctx.scale(1,-1),ctx.translate(0,s*.8);
  const face=e.vx>0?1:-1;
  if(e.t==='walk'){const sq=!e.alive&&!e.flip?.35:1;ctx.scale(1,sq);ctx.fillStyle='#8ad83a';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-face*(i*.22-.1)*s,-s*.3+Math.sin(time*10+i)*s*.03,s*.26-i*.03*s,0,7);ctx.fill()}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(face*s*.18,-s*.4,s*.1,0,7);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(face*s*.2,-s*.4,s*.05,0,7);ctx.fill();ctx.strokeStyle='#4a8a2a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(face*s*.15,-s*.55);ctx.lineTo(face*s*.25,-s*.75);ctx.stroke()}
  else if(e.t==='snail'||e.t==='shell'){if(e.t==='snail'){ctx.fillStyle='#f0d080';ctx.beginPath();ctx.ellipse(face*s*.15,-s*.12,s*.4,s*.12,0,0,7);ctx.fill();ctx.fillRect(face>0?s*.3:-s*.42,-s*.5,s*.12,s*.4);ctx.fillStyle='#222';ctx.beginPath();ctx.arc(face*s*.38,-s*.52,s*.05,0,7);ctx.fill()}
    ctx.fillStyle='#e06a8a';ctx.beginPath();ctx.arc(e.t==='shell'?0:-face*s*.08,-s*.38,s*.32,0,7);ctx.fill();ctx.strokeStyle='#a03a5a';ctx.lineWidth=3;ctx.beginPath();const sp=e.t==='shell'&&e.vx?time*20:0;for(let a=0;a<9;a+=.3){const r=s*.03*a;ctx.lineTo((e.t==='shell'?0:-face*s*.08)+Math.cos(a+sp)*r,-s*.38+Math.sin(a+sp)*r)}ctx.stroke()}
  else if(e.t==='bee'){ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.ellipse(0,-s*.4,s*.32,s*.24,0,0,7);ctx.fill();ctx.fillStyle='#2a2a2a';ctx.fillRect(-s*.08,-s*.62,s*.08,s*.44);ctx.fillRect(s*.1,-s*.6,s*.07,s*.4);
    ctx.fillStyle='rgba(255,255,255,.8)';const fl=Math.sin(time*40)*.3;ctx.beginPath();ctx.ellipse(-s*.05,-s*.72,s*.16,s*.09,-.4+fl,0,7);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(face*s*.22,-s*.45,s*.05,0,7);ctx.fill()}
  ctx.restore()}
function drawHero(x,y,p){const s=T,big=p.size>0,h=big?1.75:.9;const run=p.ground&&Math.abs(p.vx)>.5;const leg=run?Math.sin(p.anim*3)*s*.15:0;ctx.save();ctx.translate(x,y);ctx.scale(p.face,1);
  const fur=p.size===2?'#ff8a3a':'#c8783a',belly='#ffe8c8';
  // 꼬리
  ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(-s*.42,-s*(big?.9:.5),s*.22,s*(big?.55:.32),-.3+Math.sin(time*6)*.1,0,7);ctx.fill();
  // 다리
  ctx.fillStyle='#8a4a2a';ctx.fillRect(-s*.2+leg,-s*.2,s*.16,s*.2);ctx.fillRect(s*.05-leg,-s*.2,s*.16,s*.2);
  // 몸
  const bh=big?s*.9:s*.35;ctx.fillStyle=fur;ctx.beginPath();ctx.roundRect(-s*.3,-s*.2-bh,s*.6,bh,s*.15);ctx.fill();ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(s*.05,-s*.2-bh/2,s*.17,bh*.38,0,0,7);ctx.fill();
  // 머리
  const hy=-s*.2-bh-s*.28;ctx.fillStyle=fur;ctx.beginPath();ctx.arc(0,hy,s*.33,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(-s*.25,hy-s*.15);ctx.lineTo(-s*.18,hy-s*.48);ctx.lineTo(-s*.05,hy-s*.25);ctx.fill();
  ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(s*.14,hy+s*.08,s*.17,s*.13,0,0,7);ctx.fill();
  // 도토리 모자
  ctx.fillStyle='#7a4a1a';ctx.beginPath();ctx.ellipse(0,hy-s*.2,s*.34,s*.17,0,Math.PI,0);ctx.fill();ctx.fillRect(-s*.03,hy-s*.47,s*.07,s*.12);ctx.strokeStyle='#5a3010';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-s*.25,hy-s*.25);ctx.lineTo(s*.25,hy-s*.25);ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*.12,hy-s*.04,s*.09,0,7);ctx.fill();ctx.fillStyle='#222';ctx.beginPath();ctx.arc(s*.15,hy-s*.03,s*.05,0,7);ctx.fill();ctx.fillStyle='#3a2010';ctx.beginPath();ctx.arc(s*.3,hy+s*.06,s*.05,0,7);ctx.fill();
  // 팔
  ctx.fillStyle=fur;ctx.beginPath();ctx.ellipse(s*.22,-s*.2-bh*.6+(run?-leg*.5:0),s*.1,s*.16,.6,0,7);ctx.fill();
  ctx.restore()}

// ---------- 화면
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
function showTitle(){state='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;const l=$('lvs');l.innerHTML='';
  D.levels.forEach((L,i)=>{const b=document.createElement('button');b.disabled=i+1>save.open;b.textContent=L.name;if(save.best[i]){const s=document.createElement('small');s.textContent='✓ 클리어';b.appendChild(s)}b.onclick=()=>{snd('click');begin(i,true)};l.appendChild(b)});if(!map)load(0)}
function begin(i,fresh){if(fresh){lives=D.lives;coins=0}useCheck=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;paused=false;load(i,false);big(D.levels[i].name);snd('go')}
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{paused=false;showTitle()};
$('againBtn').onclick=()=>{snd('click');if(state==='clear'){const keep=P.size;if(LV+1<D.levels.length){useCheck=false;$('overOv').hidden=true;load(LV+1,false);P.size=0;big(D.levels[LV].name);snd('go')}else begin(0,true)}else begin(LV,true)};
$('oMenu').onclick=()=>{snd('click');showTitle()};
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}
  if(!paused&&(state==='play'||state==='dying'))update(dt);if(map)draw();requestAnimationFrame(frame)}
showTitle();state='title';requestAnimationFrame(frame);
window.__aq={begin,get P(){return P},state:()=>state,get ens(){return ens},get camX(){return camX},get LV(){return LV},tile,keys,setJump:v=>{jumpTouch=v;if(v)jumpHit=true},get lives(){return lives},get coins(){return coins}};
});
