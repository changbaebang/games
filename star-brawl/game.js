/* 별빛 대난투 — %를 쌓아 화면 밖으로 날리는 4인 난투. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='starBrawl.save',ST=D.stage,BL=ST.blast,MT=D.match,FD=D.fighters;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,sgn=v=>v<0?-1:1;
const save=Object.assign({wins:0,pick:'spark'},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();
let bigT=0;function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1.4}
const GRAV=38,FALL=19;

// ---------- 캐릭터 그리기
function drawFighter(c,ch,x,y,s,face,t,st){c.save();c.translate(x,y);c.scale(face,1);const col=ch.color,dk=shade(col,-.35);
  if(st.hurt>0)c.rotate(Math.sin(t*30)*.15);
  const sq=st.ground?1+Math.sin(t*(st.run?18:4))*(st.run?.05:.02):1;c.scale(1/sq,sq);
  // 발
  c.fillStyle=dk;const ft=st.run?Math.sin(t*18)*s*.12:0;c.beginPath();c.ellipse(-s*.18+ft,0,s*.16,s*.09,0,0,7);c.fill();c.beginPath();c.ellipse(s*.18-ft,0,s*.16,s*.09,0,0,7);c.fill();
  c.fillStyle=col;c.strokeStyle=dk;c.lineWidth=Math.max(2,s*.05);
  const sh=ch.shape;
  if(sh==='bear'){for(const k of [-1,1]){c.beginPath();c.arc(k*s*.3,-s*.88,s*.14,0,7);c.fill();c.stroke()}}
  if(sh==='bunny'){for(const k of [-1,1]){c.beginPath();c.ellipse(k*s*.15,-s*1.05,s*.09,s*.3,k*.15,0,7);c.fill();c.stroke()}}
  c.beginPath();c.ellipse(0,-s*.45,s*.42,s*.45,0,0,7);c.fill();c.stroke();
  if(sh==='flame'){c.fillStyle='#ffd23f';c.beginPath();c.moveTo(-s*.25,-s*.78);c.quadraticCurveTo(-s*.1,-s*1.25,0,-s*1.05);c.quadraticCurveTo(s*.12,-s*1.3,s*.25,-s*.78);c.fill()}
  if(sh==='wiz'){c.fillStyle='#4a2a90';c.beginPath();c.moveTo(-s*.4,-s*.78);c.lineTo(s*.05,-s*1.45);c.lineTo(s*.4,-s*.78);c.closePath();c.fill();c.fillStyle='#ffd23f';starP(c,s*.02,-s*1.1,s*.1)}
  if(sh==='bear'){c.fillStyle=shade(col,.4);c.beginPath();c.ellipse(s*.12,-s*.36,s*.18,s*.13,0,0,7);c.fill()}
  // 얼굴
  c.fillStyle='#fff';c.beginPath();c.ellipse(s*.15,-s*.55,s*.1,s*.13,0,0,7);c.fill();c.beginPath();c.ellipse(s*.38,-s*.55,s*.08,s*.12,0,0,7);c.fill();
  c.fillStyle='#1a1a2a';const blink=st.hurt>0?.3:1;c.beginPath();c.ellipse(s*.18,-s*.54,s*.05,s*.07*blink,0,0,7);c.fill();c.beginPath();c.ellipse(s*.4,-s*.54,s*.04,s*.07*blink,0,0,7);c.fill();
  // 팔 / 공격
  c.fillStyle=col;c.strokeStyle=dk;
  if(st.atk){const a=st.atk;const ext=a.phase==='hit'?1:a.phase==='start'?.3:.6;
    if(a.dir==='up'){c.beginPath();c.ellipse(s*.05,-s*.95-s*.35*ext,s*.14,s*.14,0,0,7);c.fill();c.stroke()}
    else if(a.dir==='down'){c.beginPath();c.ellipse(s*.05,s*.05+s*.3*ext,s*.16,s*.13,0,0,7);c.fill();c.stroke()}
    else{c.beginPath();c.ellipse(s*.45+s*.45*ext*(a.strong?1.2:1),-s*.45,s*.16*(a.strong?1.25:1),s*.14,0,0,7);c.fill();c.stroke()}
    if(a.phase==='hit'&&a.strong){c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=s*.06;c.beginPath();c.arc(s*.3,-s*.45,s*.8,-.6,.6);c.stroke()}}
  else{c.beginPath();c.ellipse(s*.42,-s*.35+(st.run?Math.sin(t*18)*s*.06:0),s*.12,s*.1,0,0,7);c.fill();c.stroke()}
  c.restore()}
function starP(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fill()}
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>clamp(Math.round(k<0?v*(1+k):v+(255-v)*k),0,255);return `rgb(${f(r)},${f(g)},${f(b)})`}

// ---------- 상태
let F=[],shots=[],fx=[],state='title',paused=false,time=0,camX=0,camY=-3,camS=30,endT=0;
function mk(ch,i,human){const sx=[-5,5,-2,2][i];return {ch,i,human,x:sx,y:-1,vx:0,vy:0,face:sx<0?1:-1,dmg:0,stocks:MT.stocks,ground:false,jumps:1,atk:null,stun:0,inv:0,upUsed:false,in:{x:0,up:false,down:false},ai:{t:0,mx:0},cd:0,ko:0,hurt:0,dropT:0,out:false,koT:0}}
function start(){const mine=FD.find(f=>f.id===save.pick)||FD[0];const others=FD.filter(f=>f!==mine);F=[mk(mine,0,true)];for(let i=0;i<MT.bots;i++)F.push(mk(others[i%others.length],i+1,false));
  shots=[];fx=[];state='play';paused=false;endT=0;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;big('난투 시작!');snd('go');cards()}
function cards(){const el=$('cards');el.innerHTML='';for(const f of F){const d=document.createElement('div');d.className='cd'+(f.out?' out':'');d.style.borderColor=f.ch.color;
  const n=document.createElement('div');n.className='n';n.textContent=f.human?'나':f.ch.name;const dd=document.createElement('div');dd.className='d';dd.textContent=Math.floor(f.dmg)+'%';dd.style.color=f.dmg>100?'#ff5a4a':f.dmg>50?'#ffc23a':'#fff';
  const s=document.createElement('div');s.className='s';s.textContent='●'.repeat(Math.max(0,f.stocks));d.appendChild(n);d.appendChild(dd);d.appendChild(s);el.appendChild(d)}}

// ---------- 공격
const MOVES={jab:{dmg:4,base:3.2,grow:.05,start:.05,act:.1,end:.12,rx:1.1,ry:.7,ang:-.35},
  smash:{dmg:11,base:7,grow:.13,start:.16,act:.1,end:.25,rx:1.35,ry:.8,ang:-.45},
  up:{dmg:8,base:6,grow:.1,start:.07,act:.12,end:.18,rx:.9,ry:1.2,ang:-1.45},
  down:{dmg:9,base:5,grow:.1,start:.08,act:.12,end:.2,rx:.9,ry:1,ang:1.3}};
function attack(f){if(f.atk||f.stun>0||f.out||f.ko>0)return;let k='jab';const d=f.in;
  if(d.up)k='up';else if(d.down&&!f.ground)k='down';else if(Math.abs(d.x)>.55)k='smash';
  if(d.x)f.face=sgn(d.x);const m=MOVES[k];f.atk={k,m,t:0,phase:'start',hit:new Set(),dir:k==='up'?'up':k==='down'?'down':'side',strong:k==='smash'};snd('whoosh')}
function special(f){if(f.atk||f.stun>0||f.out||f.ko>0||f.cd>0)return;const d=f.in;if(d.x)f.face=sgn(d.x);
  if(d.up){if(f.upUsed)return;f.upUsed=true;f.vy=-f.ch.jump*1.05;f.vx=d.x*4;f.atk={k:'rise',m:{dmg:7,base:5.5,grow:.09,start:0,act:.35,end:.25,rx:.9,ry:1.1,ang:-1.3},t:0,phase:'start',hit:new Set(),dir:'up'};snd('jump');return}
  const sp=f.ch.special;f.cd=.5;
  if(sp==='shot'){shots.push({x:f.x+f.face*.7,y:f.y-.5,vx:f.face*13,owner:f,t:0});f.atk={k:'cast',m:{dmg:0,base:0,grow:0,start:.05,act:.05,end:.2,rx:0,ry:0,ang:0},t:0,phase:'start',hit:new Set(),dir:'side'};snd('zap')}
  else if(sp==='dash'){f.vx=f.face*17;if(!f.ground)f.vy=Math.min(f.vy,-2);f.atk={k:'dash',m:{dmg:9,base:6,grow:.11,start:.04,act:.25,end:.2,rx:1,ry:.8,ang:-.4},t:0,phase:'start',hit:new Set(),dir:'side',strong:true};snd('power')}
  else if(sp==='spin'){f.atk={k:'spin',m:{dmg:12,base:7.5,grow:.13,start:.12,act:.22,end:.3,rx:1.5,ry:1,ang:-.6,both:1},t:0,phase:'start',hit:new Set(),dir:'side',strong:true};if(!f.ground)f.vy=Math.min(f.vy,-4);snd('power')}}
function hitTarget(a,b,m,dirx){if(b.inv>0||b.out||b.ko>0)return;const pw=a?a.ch.power:1;const dmg=m.dmg*pw;b.dmg+=dmg;
  const kb=(m.base+b.dmg*m.grow)*pw/b.ch.weight;const ang=m.ang;b.vx=Math.cos(ang)*kb*dirx*1.15;b.vy=Math.sin(ang)*kb*1.15;b.stun=.12+kb*.025;b.hurt=b.stun;b.atk=null;b.ground=false;b.jumps=1;
  fx.push({x:b.x,y:b.y-.5,t:0,big:kb>12});snd(kb>12?'boom':'hit');if(kb>14)shake=.25;cards()}
let shake=0;
function updAtk(f,dt){const a=f.atk;if(!a)return;a.t+=dt;const m=a.m;
  a.phase=a.t<m.start?'start':a.t<m.start+m.act?'hit':'end';
  if(a.phase==='hit'&&m.dmg>0){for(const o of F){if(o===f||a.hit.has(o)||o.out)continue;const dx=o.x-f.x,dy=(o.y-.45)-(f.y-.45);
      let cx=a.dir==='side'?f.face*m.rx*.6:0,cy=a.dir==='up'?-m.ry*.6:a.dir==='down'?m.ry*.5:0;if(m.both)cx=0;
      if(Math.abs(dx-cx)<m.rx*(m.both?1:.75)&&Math.abs(dy-cy)<m.ry){a.hit.add(o);hitTarget(f,o,m,m.both?sgn(dx):a.dir==='side'?f.face:sgn(dx)||f.face)}}}
  if(a.t>m.start+m.act+m.end)f.atk=null}

// ---------- 입력
const keys={};const tin={x:0,up:false,down:false,jump:false,a:false,b:false};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(keys[k])return;keys[k]=true;if(k==='p'||k==='escape')togglePause();if(state!=='play'||paused)return;const me=F[0];if(!me)return;
  if(k===' '||k==='arrowup'||k==='w'){if(k===' '||!keys.k)jump(me)}if(k==='j'||k==='z')attack(me);if(k==='k'||k==='x')special(me)});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
let stk=null;const sz=$('stickZone');
sz.addEventListener('pointerdown',e=>{if(state!=='play')return;stk={id:e.pointerId,ox:e.clientX,oy:e.clientY,dx:0,dy:0,flick:false};const s=$('stick');s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';s.style.display='block'});
addEventListener('pointermove',e=>{if(!stk||e.pointerId!==stk.id)return;let dx=e.clientX-stk.ox,dy=e.clientY-stk.oy;const l=Math.hypot(dx,dy);if(l>45){dx*=45/l;dy*=45/l}
  if(dy<-30&&stk.dy>=-30&&F[0])jump(F[0]);stk.dx=dx;stk.dy=dy;const k=$('stick').querySelector('i');if(k)k.style.transform=`translate(${dx}px,${dy}px)`});
const endStk=e=>{if(stk&&e.pointerId===stk.id){stk=null;$('stick').style.display='none'}};addEventListener('pointerup',endStk);addEventListener('pointercancel',endStk);
for(const [id,fn] of [['bA',()=>attack(F[0])],['bB',()=>special(F[0])],['bJ',()=>jump(F[0])]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(state==='play'&&!paused&&F[0])fn();b.classList.add('on')});
  b.addEventListener('pointerup',()=>b.classList.remove('on'));b.addEventListener('pointerleave',()=>b.classList.remove('on'))}
function readMe(f){let x=0,up=false,down=false;if(keys.arrowleft||keys.a)x-=1;if(keys.arrowright||keys.d)x+=1;if(keys.arrowup||keys.w)up=true;if(keys.arrowdown||keys.s)down=true;
  if(stk){x=Math.abs(stk.dx)>10?clamp(stk.dx/40,-1,1):0;if(stk.dy<-25)up=true;if(stk.dy>25)down=true}f.in={x,up,down}}
function jump(f){if(f.stun>0||f.out||f.ko>0||(f.atk&&f.atk.k!=='jab'))return;if(f.ground){f.vy=-f.ch.jump;f.ground=false;snd('jump')}else if(f.jumps>0){f.jumps--;f.vy=-f.ch.jump*.92;snd('jump');fx.push({x:f.x,y:f.y,t:0,ring:1})}}

// ---------- 컴퓨터
function think(f,dt){const A=f.ai;A.t-=dt;const cpu=MT.cpu;
  const offstage=Math.abs(f.x)>ST.half+.2||f.y>.3;
  if(offstage){f.in={x:-sgn(f.x),up:false,down:false};if(f.vy>-2&&(f.y>-1||Math.abs(f.x)>ST.half+2)){if(f.jumps>0&&f.vy>0)jump(f);else if(!f.upUsed&&f.jumps===0&&f.vy>2){f.in.up=true;special(f)}}return}
  if(A.t>0){return}A.t=rand(.08,.2)*(1.6-cpu);
  let tg=null,bd=1e9;for(const o of F){if(o===f||o.out||o.ko>0)continue;const d=Math.hypot(o.x-f.x,o.y-f.y)*(o.human?.85:1);if(d<bd){bd=d;tg=o}}
  if(!tg){f.in={x:0,up:false,down:false};return}
  const dx=tg.x-f.x,dy=tg.y-f.y;let x=Math.abs(dx)>.9?sgn(dx):0;
  if(Math.abs(f.x+x*.8)>ST.half-.4&&Math.abs(tg.x)>ST.half)x=0;
  f.in={x,up:false,down:false};
  if(dy<-2&&Math.abs(dx)<3&&Math.random()<.5)jump(f);
  if(Math.abs(dx)<1.4&&Math.abs(dy)<1.3&&Math.random()<cpu){f.face=sgn(dx)||f.face;if(dy<-.8)f.in.up=true;else if(tg.dmg>55&&Math.random()<.6)f.in.x=sgn(dx);else f.in.x=0;
    if(Math.random()<.25&&f.ch.special!=='shot'){f.in.x=sgn(dx);special(f)}else attack(f)}
  else if(f.ch.special==='shot'&&Math.abs(dy)<1&&Math.abs(dx)>3&&Math.random()<cpu*.35){f.face=sgn(dx);f.in.x=0;special(f)}
  else if(f.ch.special==='dash'&&Math.abs(dy)<1&&Math.abs(dx)>2.5&&Math.abs(dx)<6&&Math.random()<cpu*.2&&Math.abs(tg.x)<ST.half){f.in.x=sgn(dx);special(f)}}

// ---------- 갱신
function stepF(f,dt){if(f.out)return;
  if(f.ko>0){f.ko-=dt;if(f.ko<=0){if(f.stocks>0){f.x=0;f.y=-9;f.vx=f.vy=0;f.dmg=0;f.inv=2;f.float=1.6;f.jumps=1;f.upUsed=false;cards()}else{f.out=true;cards()}}return}
  f.cd=Math.max(0,f.cd-dt);f.inv=Math.max(0,f.inv-dt);f.hurt=Math.max(0,f.hurt-dt);f.dropT=Math.max(0,f.dropT-dt);
  if(f.human)readMe(f);else think(f,dt);
  if(f.float>0){f.float-=dt;if(Math.abs(f.in.x)>.1||f.float<=0)f.float=0;else{f.vx=0;f.vy=0;updAtk(f,dt);return}}
  const ctrl=f.stun<=0;f.stun=Math.max(0,f.stun-dt);
  if(ctrl&&!(f.atk&&f.atk.k==='dash')){const tv=f.in.x*f.ch.speed*(f.atk&&f.ground?.3:1);const acc=f.ground?60:28;f.vx+=clamp(tv-f.vx,-acc*dt,acc*dt);if(f.in.x&&!f.atk)f.face=sgn(f.in.x)}
  else if(f.atk&&f.atk.k==='dash'){f.vx*=Math.exp(-3*dt)}
  else f.vx*=Math.exp(-.8*dt);
  if(f.ground&&f.in.down&&ctrl&&f.y<-.1)f.dropT=.25;
  f.vy=Math.min(FALL,f.vy+GRAV*dt*(f.atk&&f.atk.k==='rise'&&f.atk.t<.2?.3:1));
  const py=f.y;f.x+=f.vx*dt;f.y+=f.vy*dt;
  const wasG=f.ground;f.ground=false;
  if(f.vy>=0){if(Math.abs(f.x)<=ST.half&&py<=.001&&f.y>=0){f.y=0;f.ground=true}
    else if(f.dropT<=0)for(const [px,pyy,ph] of ST.platforms){if(Math.abs(f.x-px)<=ph&&py<=pyy+.001&&f.y>=pyy){f.y=pyy;f.ground=true;break}}}
  // 무대 옆면
  if(f.y>.05&&f.y<3.4&&Math.abs(f.x)<ST.half+.3){f.x=sgn(f.x)*(ST.half+.3);f.vx=0}
  if(f.ground){f.vy=0;f.jumps=1;f.upUsed=false;if(!wasG&&f.stun>0&&Math.abs(f.vy)<1)f.stun=Math.min(f.stun,.1);f.vx*=f.stun>0?.85:1}
  updAtk(f,dt);
  // 화면 밖
  if(f.x<-BL.x||f.x>BL.x||f.y>BL.bottom||f.y<BL.top){f.stocks--;f.ko=1.4;f.atk=null;fx.push({x:clamp(f.x,-BL.x+1,BL.x-1),y:clamp(f.y,BL.top+1,BL.bottom-1),t:0,ko:1,col:f.ch.color});snd('boom');shake=.4;cards();if(f.human)big(f.stocks>0?'날아갔다!':'탈락…')}}
function update(dt){time+=dt;for(const f of F)stepF(f,dt);
  for(const s of shots){s.t+=dt;s.x+=s.vx*dt;for(const o of F){if(o===s.owner||o.out||o.ko>0||o.inv>0)continue;if(Math.abs(o.x-s.x)<.55&&Math.abs(o.y-.45-s.y)<.6){hitTarget(s.owner,o,{dmg:6,base:3.5,grow:.06,ang:-.3},sgn(s.vx));s.t=9}}}
  shots=shots.filter(s=>s.t<1.6);for(const e of fx)e.t+=dt;fx=fx.filter(e=>e.t<(e.ko?1:.4));shake=Math.max(0,shake-dt);
  if(state==='play'){const alive=F.filter(f=>!f.out);const me=F[0];if((alive.length<=1||me.out)&&endT===0)endT=.001}
  if(endT>0){endT+=dt;if(endT>1.4&&state==='play')finish()}}
function finish(){state='over';const alive=F.filter(f=>!f.out);const me=F[0];const win=!me.out&&alive.length===1;
  if(win){save.wins++;store();Arcade.record&&Arcade.record('starBrawlWins',save.wins)}
  const place=win?1:F.filter(f=>!f.out).length+1;
  $('oTitle').textContent=win?'🏆 승리!':'아깝다!';$('oTxt').innerHTML=win?'모두를 날려 보냈어요! 지금까지 <b>'+save.wins+'</b>번 우승':(alive.length===1?alive[0].ch.name+'의 승리':'')+' · 나는 <b>'+place+'등</b>';$('overOv').hidden=false;snd(win?'win':'lose')}

// ---------- 그리기
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a1440');g.addColorStop(1,'#4a2a70');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fff';for(let i=0;i<60;i++){const x=(i*137.5%1)*W,y=((i*71.3)%97)/97*H*.8;ctx.globalAlpha=.3+.7*Math.abs(Math.sin(time*.8+i));ctx.fillRect((i*97)%W,y,2,2)}ctx.globalAlpha=1;
  // 카메라
  let x0=-ST.half-1,x1=ST.half+1,y0=-7.5,y1=3;for(const f of F){if(f.out||f.ko>0)continue;x0=Math.min(x0,f.x-2);x1=Math.max(x1,f.x+2);y0=Math.min(y0,f.y-3);y1=Math.max(y1,f.y+1.5)}
  x0=Math.max(x0,-BL.x);x1=Math.min(x1,BL.x);y0=Math.max(y0,BL.top);y1=Math.min(y1,BL.bottom);
  const top=70,bot=Math.min(170,H*.22);const sc=Math.min(W/(x1-x0),(H-top-bot*.4)/(y1-y0));
  camS+=(sc-camS)*.08;camX+=((x0+x1)/2-camX)*.1;camY+=((y0+y1)/2-camY)*.1;const S=camS;
  const sx=shake>0?rand(-1,1)*shake*20:0,sy=shake>0?rand(-1,1)*shake*20:0;
  const X=x=>W/2+(x-camX)*S+sx,Y=y=>(top+(H-top-bot*.4)/2)+(y-camY)*S+sy;
  // 무대
  ctx.fillStyle='#5a4a7a';ctx.beginPath();ctx.moveTo(X(-ST.half),Y(0));ctx.lineTo(X(ST.half),Y(0));ctx.lineTo(X(ST.half-1.2),Y(2));ctx.lineTo(X(1.5),Y(4.5));ctx.lineTo(X(-1.5),Y(4.5));ctx.lineTo(X(-ST.half+1.2),Y(2));ctx.closePath();ctx.fill();
  ctx.fillStyle='#8ad87a';ctx.fillRect(X(-ST.half),Y(0)-4,ST.half*2*S,Math.max(6,S*.3));ctx.fillStyle='#6ab85a';ctx.fillRect(X(-ST.half),Y(0)+Math.max(6,S*.3)-4,ST.half*2*S,3);
  for(const [px,py,ph] of ST.platforms){ctx.fillStyle='rgba(180,200,255,.85)';ctx.beginPath();ctx.roundRect(X(px-ph),Y(py)-3,ph*2*S,Math.max(6,S*.22),4);ctx.fill()}
  // 탄
  for(const s of shots){ctx.fillStyle='#ffd23f';starP(ctx,X(s.x),Y(s.y),S*.3);ctx.fillStyle='rgba(255,210,63,.3)';ctx.beginPath();ctx.arc(X(s.x-s.vx*.03),Y(s.y),S*.3,0,7);ctx.fill()}
  // 선수
  for(const f of F){if(f.out||f.ko>0)continue;if(f.inv>0&&Math.floor(time*12)%2)ctx.globalAlpha=.5;
    if(f.float>0){ctx.fillStyle='rgba(180,220,255,.6)';ctx.beginPath();ctx.ellipse(X(f.x),Y(f.y)+3,S*.6,S*.15,0,0,7);ctx.fill()}
    drawFighter(ctx,f.ch,X(f.x),Y(f.y),S*1.05,f.face,time+f.i,{ground:f.ground,run:f.ground&&Math.abs(f.vx)>1,atk:f.atk,hurt:f.hurt});ctx.globalAlpha=1;
    ctx.fillStyle=f.human?'#fff':f.ch.color;ctx.font='bold '+Math.max(11,S*.4)+'px Jua';ctx.textAlign='center';ctx.fillText(f.human?'▼ 나':'P'+(f.i+1),X(f.x),Y(f.y)-S*1.55);
    // 화면 밖 화살표
    const px=X(f.x),py=Y(f.y);if(px<0||px>W||py<0||py>H){const cx=clamp(px,24,W-24),cy=clamp(py,90,H-24);ctx.fillStyle=f.ch.color;ctx.beginPath();ctx.arc(cx,cy,16,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font='13px Jua';ctx.fillText(Math.floor(f.dmg)+'%',cx,cy+5)}}
  for(const e of fx){if(e.ko){const k=e.t;ctx.strokeStyle=e.col;ctx.lineWidth=8*(1-k);ctx.beginPath();ctx.arc(clamp(X(e.x),0,W),clamp(Y(e.y),0,H),40+k*200,0,7);ctx.stroke();continue}
    if(e.ring){ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(X(e.x),Y(e.y),S*.5*(1+e.t*3),S*.15*(1+e.t*3),0,0,7);ctx.stroke();continue}
    ctx.fillStyle=e.big?'#ffd23f':'#fff';ctx.globalAlpha=1-e.t/.4;starP(ctx,X(e.x),Y(e.y),S*(e.big?.9:.5)*(1+e.t*2));ctx.globalAlpha=1}}

// ---------- 화면
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
function showTitle(){state='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;const p=$('picks');p.innerHTML='';
  for(const ch of FD){const b=document.createElement('button');if(ch.id===save.pick)b.className='on';const k=document.createElement('canvas');k.width=k.height=112;drawFighter(k.getContext('2d'),ch,56,96,62,1,0,{ground:true});b.appendChild(k);const t=document.createElement('span');t.textContent=ch.name;b.appendChild(t);
    b.onclick=()=>{save.pick=ch.id;store();snd('click');showTitle()};p.appendChild(b)}
  const ch=FD.find(f=>f.id===save.pick)||FD[0];const spn={shot:'별 에너지탄을 쏴요',dash:'앞으로 휙 돌진해요',spin:'빙글빙글 강한 회전 공격'};
  setT($('pDesc'),ch.name+' · 필살기: '+spn[ch.special]+(ch.weight>1.2?' · 무거워서 잘 안 날아가요':ch.jump>16?' · 점프가 높아요':ch.speed>8.3?' · 아주 빨라요':''));setT($('tRec'),save.wins?'지금까지 '+save.wins+'번 우승':'');F=[];cards()}
$('startBtn').onclick=()=>{snd('click');start()};$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
$('quitBtn').onclick=()=>{paused=false;showTitle()};$('againBtn').onclick=()=>{snd('click');start()};$('oMenu').onclick=()=>{snd('click');showTitle()};
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}
  if((state==='play'||state==='over')&&!paused)update(dt);draw();requestAnimationFrame(frame)}
showTitle();requestAnimationFrame(frame);
window.__sb={start,get F(){return F},state:()=>state,attack,special,jump};
});
