/* 꿀꺽 젤리 — 빨아들이고 능력을 따라 쓰는 2D 모험. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const PP=D.player,SAVE='gulpJelly.save',clamp=(v,a,b)=>v<a?a:v>b?b:v;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const save=Object.assign({done:0,stars:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,T=40;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;T=Math.max(28,Math.min(Ht/10,Wd/14))}addEventListener('resize',fit);fit();

// ---------- 맵
let L=null,map=[],MW=0,MH=0,li=0,enemies=[],shots=[],fx=[],stars=[],door=null;
function load(i){li=i;L=D.levels[i];map=L.rows.map(r=>r.split(''));MH=map.length;MW=map[0].length;enemies=[];shots=[];fx=[];stars=[];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];
    if(c==='P'){pl.x=x+.5;pl.y=y+1;map[y][x]='.'}
    else if(c==='D'){door={x:x+.5,y:y+1};map[y][x]='.'}
    else if(c==='*'){stars.push({x:x+.5,y:y+.5,got:false});map[y][x]='.'}
    else if(D.enemies[c]){const E=D.enemies[c];let yy=y;while(yy>0&&solid(x+.5,yy+.5))yy--;enemies.push({k:c,E,x:x+.5,y:yy+1,vx:-E.speed,vy:0,hp:E.hp,fly:!!E.fly,by:yy+.5,ph:Math.random()*6,frozen:0,kick:0,dead:false,hit:0});map[y][x]='.'}}}
const tile=(x,y)=>{const tx=Math.floor(x),ty=Math.floor(y);if(tx<0||tx>=MW)return '#';if(ty<0)return '.';if(ty>=MH)return '.';return map[ty][tx]};
const solid=(x,y)=>{const t=tile(x,y);return t==='#'||t==='='};
const plat=(x,y)=>tile(x,y)==='-';

// ---------- 젤리
const pl={x:3,y:9,vx:0,vy:0,w:.8,h:.8,ground:false,face:1,flaps:0,puffed:false,full:null,ab:null,hp:PP.hp,inv:0,suck:false,act:0,abT:0};
function moveBody(b,dt,dropThrough){
  b.x+=b.vx*dt;const hw=b.w/2;
  for(const yy of [b.y-.05,b.y-b.h*.5,b.y-b.h+.05]){if(solid(b.x+hw,yy)){b.x=Math.floor(b.x+hw)-hw-.001;b.vx=Math.min(0,b.vx)}if(solid(b.x-hw,yy)){b.x=Math.floor(b.x-hw)+1+hw+.001;b.vx=Math.max(0,b.vx)}}
  const py=b.y;b.y+=b.vy*dt;b.ground=false;
  if(b.vy>=0){for(const xx of [b.x-hw+.05,b.x+hw-.05]){const ty=Math.floor(b.y);if((solid(xx,b.y)||(!dropThrough&&plat(xx,b.y)&&py<=ty+.05))&&b.y>=ty){b.y=ty;b.vy=0;b.ground=true}}}
  else{for(const xx of [b.x-hw+.05,b.x+hw-.05])if(solid(xx,b.y-b.h)){b.y=Math.floor(b.y-b.h)+1+b.h;b.vy=0}}
}

// ---------- 입력
const keys={},btn={};let jumpPressed=false,actPressed=false,downPressed=false;
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}if(!e.repeat){if(['Space','KeyW','ArrowUp'].includes(e.code))jumpPressed=true;if(['KeyJ','KeyX'].includes(e.code))actPressed=true;if(['KeyS','ArrowDown'].includes(e.code))downPressed=true;if(e.code==='KeyK')dropAbility()}
  keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;for(const k in btn)btn[k]=false});
function hold(id,k,onDown){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();btn[k]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId)}catch(_){}onDown&&onDown()});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{btn[k]=false;el.classList.remove('on')});el.addEventListener('contextmenu',e=>e.preventDefault())}
hold('tL','l');hold('tR','r');hold('tJump','j',()=>jumpPressed=true);hold('tAct','a',()=>actPressed=true);hold('tDown','d',()=>downPressed=true);

// ---------- 동작
const AB=k=>D.abilities[k];
function dropAbility(){if(!pl.ab)return;toast(AB(pl.ab).name+' 능력을 내려놨어요');pl.ab=null;snd('pop')}
function hurtPlayer(src){if(pl.inv>0)return;pl.hp--;pl.inv=1.4;pl.vx=(pl.x<src.x?-1:1)*6;pl.vy=-6;snd('hurt');
  if(pl.ab){toast(AB(pl.ab).name+' 능력을 잃었어요!');pl.ab=null}pl.full=null;pl.puffed=false;if(pl.hp<=0)lose()}
function hitEnemy(e,dmg,from){if(e.dead)return;if(e.E.spiky&&from==='spit'){dmg=Math.max(dmg,3)}e.hp-=dmg;e.hit=.15;e.vx=(e.x<pl.x?-1:1)*3;snd('hit');
  if(e.hp<=0){e.dead=true;fx.push({k:'pop',x:e.x,y:e.y-.4,t:.35});snd('pop')}}
function act(){
  if(pl.puffed){pl.puffed=false;pl.flaps=0;shots.push({k:'air',x:pl.x+pl.face*.6,y:pl.y-.45,vx:pl.face*9,t:.25});snd('whoosh');return}
  if(pl.full){shots.push({k:'star',x:pl.x+pl.face*.6,y:pl.y-.45,vx:pl.face*14,t:1.2});pl.full=null;snd('shoot');return}
  if(pl.ab){pl.abT=pl.ab==='sword'?.25:.5;if(pl.ab==='sword'){snd('slash');for(const e of enemies){if(e.dead)continue;const dx=(e.x-pl.x)*pl.face;if(dx>-.3&&dx<AB('sword').range&&Math.abs(e.y-pl.y)<1.3)hitEnemy(e,AB('sword').dmg,'sword')}}
    else snd(pl.ab==='fire'?'boom':'freeze');return}
  pl.suck=true;}
function swallow(){if(!pl.full)return;const E=pl.full;pl.full=null;if(E.ability){pl.ab=E.ability;toast(AB(E.ability).name+' 능력!');snd('power')}else{snd('coin');toast('냠!')}}

// ---------- 진행
let state='title',paused=false,time=0,starsGot=0;
function begin(i){load(i);Object.assign(pl,{vx:0,vy:0,flaps:0,puffed:false,full:null,hp:PP.hp,inv:0,suck:false,abT:0,face:1});
  starsGot=0;state='play';paused=false;for(const id of ['titleOv','endOv','pauseOv'])$(id).hidden=true;toast(L.name);snd('go')}
function lose(){state='end';snd('lose');setT($('eTitle'),'으앙, 쓰러졌어요');$('eTxt').textContent='다시 도전해 봐요!';$('nextBtn').hidden=true;setTimeout(()=>$('endOv').hidden=false,800)}
function win(){state='end';snd('win');save.done=Math.max(save.done,li+1);save.stars[li]=Math.max(save.stars[li]||0,starsGot);store();if(window.Arcade)Arcade.record('gulpJellyLevels',save.done);
  setT($('eTitle'),li===D.levels.length-1?'모험 완성!':'도착!');$('eTxt').textContent=`별 ${starsGot}/${stars.length}개 · 하트 ${pl.hp}개 남았어요`;$('nextBtn').hidden=li+1>=D.levels.length;setTimeout(()=>{$('endOv').hidden=false},700)}
function update(dt){
  const left=keys.ArrowLeft||keys.KeyA||btn.l,right=keys.ArrowRight||keys.KeyD||btn.r,actHeld=keys.KeyJ||keys.KeyX||btn.a;
  const dir=(right?1:0)-(left?1:0);if(dir)pl.face=dir;
  const sp=PP.speed*(pl.puffed?.7:pl.full?.8:1)*(pl.suck?.2:1);pl.vx+=(dir*sp-pl.vx)*Math.min(1,dt*12);
  if(jumpPressed){if(pl.ground&&!pl.puffed){pl.vy=-PP.jump;snd('jump')}else if(!pl.full&&pl.flaps<PP.flaps){pl.puffed=true;pl.flaps++;pl.vy=-PP.flap;snd('bounce',1)}}
  jumpPressed=false;
  if(actPressed){act()}actPressed=false;if(!actHeld)pl.suck=false;
  if(downPressed){if(pl.full)swallow();else if(pl.ground&&plat(pl.x,pl.y+.1))pl.y+=.2}downPressed=false;
  const g=PP.gravity*(pl.puffed?.3:1);pl.vy=Math.min(pl.puffed?3:16,pl.vy+g*dt);
  moveBody(pl,dt,(keys.ArrowDown||keys.KeyS||btn.d)&&!pl.full);if(pl.ground){pl.flaps=0;if(pl.puffed&&pl.vy>=0){}}
  if(pl.y>MH+3){pl.hp--;snd('hurt');if(pl.hp<=0){lose();return}pl.x=Math.max(2,pl.x-4);pl.y=2;pl.vy=0;while(pl.x>1&&!solid(pl.x,MH-1.5)&&!solid(pl.x,MH-2.5))pl.x-=1;pl.inv=1.4}
  pl.inv=Math.max(0,pl.inv-dt);pl.abT=Math.max(0,pl.abT-dt);
  // 빨아들이기
  if(pl.suck&&!pl.full&&!pl.puffed&&!pl.ab){for(const e of enemies){if(e.dead||e.E.spiky)continue;const dx=(e.x-pl.x)*pl.face,dy=e.y-pl.y;if(dx>0&&dx<PP.inhale&&Math.abs(dy)<1.2){e.x-=pl.face*dt*9;e.y+=(pl.y-e.y)*dt*6;e.sucked=true;if(dx<.7){e.dead=true;pl.full=e.E;pl.suck=false;snd('pop');toast('흡! 아래 버튼으로 삼키거나 뱉어요')}}}}
  if(pl.ab&&pl.abT>0&&pl.ab!=='sword'){const A=AB(pl.ab);for(const e of enemies){if(e.dead)continue;const dx=(e.x-pl.x)*pl.face;if(dx>0&&dx<A.range&&Math.abs(e.y-pl.y)<1){if(pl.ab==='ice'){if(!e.frozen){e.frozen=6;e.vx=0;snd('freeze')}}else if(!e.burnT||e.burnT<=0){e.burnT=.3;hitEnemy(e,A.dmg,'fire')}}}}
  if(actHeld&&pl.ab&&pl.ab!=='sword'&&pl.abT<.15)pl.abT=.3;
  // 적
  for(const e of enemies){if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);if(e.burnT)e.burnT-=dt;
    if(e.frozen>0){e.frozen-=dt;if(e.kick){e.x+=e.kick*dt;for(const o of enemies){if(o!==e&&!o.dead&&Math.abs(o.x-e.x)<.8&&Math.abs(o.y-e.y)<1)hitEnemy(o,2,'ice')}if(solid(e.x+Math.sign(e.kick)*.5,e.y-.4)){e.dead=true;fx.push({k:'pop',x:e.x,y:e.y-.4,t:.35});snd('crack')}}
      else if(Math.abs(e.x-pl.x)<.8&&Math.abs(e.y-pl.y)<.8){e.kick=pl.face*12;snd('swap')}continue}
    if(e.sucked){e.sucked=false;continue}
    if(e.fly){e.x+=e.vx*dt;e.ph+=dt*3;e.y=e.by+Math.sin(e.ph)*1.2;if(solid(e.x+Math.sign(e.vx)*.5,e.y-.4))e.vx=-e.vx}
    else{e.vy=Math.min(16,e.vy+PP.gravity*dt);const b={x:e.x,y:e.y,vx:e.vx,vy:e.vy,w:.8,h:.8};moveBody(b,dt,false);e.x=b.x;e.y=b.y;e.vy=b.vy;
      if(b.vx===0||(b.ground&&!solid(e.x+Math.sign(e.vx)*.6,e.y+.2)&&!plat(e.x+Math.sign(e.vx)*.6,e.y+.2)))e.vx=-(e.vx||e.E.speed);
      if(Math.abs(e.vx)<e.E.speed)e.vx=Math.sign(e.vx||-1)*e.E.speed;if(e.y>MH+2)e.dead=true}
    if(Math.abs(e.x-pl.x)<.75&&Math.abs((e.y-.4)-(pl.y-.4))<.75){if(e.E.spiky||!pl.puffed)hurtPlayer(e)}}
  // 발사체
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t-=dt;s.x+=s.vx*dt;let gone=s.t<=0||solid(s.x,s.y);
    for(const e of enemies){if(e.dead||gone)continue;if(Math.abs(e.x-s.x)<.7&&Math.abs(e.y-.4-s.y)<.7){hitEnemy(e,s.k==='star'?3:1,s.k==='star'?'spit':'air');if(s.k==='air')gone=true}}if(gone)shots.splice(i,1)}
  for(let i=fx.length-1;i>=0;i--){fx[i].t-=dt;if(fx[i].t<=0)fx.splice(i,1)}
  for(const s of stars){if(!s.got&&Math.abs(s.x-pl.x)<.8&&Math.abs(s.y-(pl.y-.4))<.9){s.got=true;starsGot++;snd('coin')}}
  if(door&&Math.abs(door.x-pl.x)<.7&&Math.abs(door.y-pl.y)<1.2&&state==='play')win();
  setT($('hearts'),'♥'.repeat(Math.max(0,pl.hp))+'♡'.repeat(Math.max(0,PP.hp-pl.hp)));setT($('stars'),starsGot+'/'+stars.length);
  const ab=$('ability');setT(ab,pl.ab?AB(pl.ab).name+' 능력':pl.full?'입에 쏙':'능력 없음');ab.style.setProperty('--c',pl.ab?AB(pl.ab).color:'transparent');
  setT($('tAct'),pl.puffed?'후!':pl.full?'퉤!':pl.ab?({fire:'불꽃',ice:'얼음',sword:'칼'})[pl.ab]:'흡!');
}
function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}

// ---------- 그리기
const cam={x:0,y:0};
function drawJelly(x,y,r,face,opt){ctx.save();ctx.translate(x,y);const sq=opt.squash||1;ctx.scale(1/sq,sq);
  ctx.fillStyle='#2aa88a';ctx.beginPath();ctx.ellipse(-r*.4,r*.88,r*.3,r*.14,0,0,7);ctx.ellipse(r*.4,r*.88,r*.3,r*.14,0,0,7);ctx.fill();
  ctx.fillStyle=opt.flash?'#fff':'#6ee8c0';ctx.beginPath();ctx.moveTo(-r,r*.2);ctx.quadraticCurveTo(-r,-r*1.05,0,-r);ctx.quadraticCurveTo(r,-r*1.05,r,r*.2);ctx.quadraticCurveTo(r,r*.9,0,r*.9);ctx.quadraticCurveTo(-r,r*.9,-r,r*.2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-r*.45,-r*.5,r*.18,r*.28,-.5,0,7);ctx.fill();
  if(!opt.hat){ctx.strokeStyle='#2a8a4a';ctx.lineWidth=Math.max(2,r*.1);ctx.beginPath();ctx.moveTo(0,-r*.95);ctx.lineTo(0,-r*1.3);ctx.stroke();ctx.fillStyle='#5ccf5c';ctx.beginPath();ctx.ellipse(r*.18,-r*1.32,r*.22,r*.11,-.5,0,7);ctx.ellipse(-r*.18,-r*1.32,r*.22,r*.11,.5,0,7);ctx.fill()}
  for(const s of [-1,1]){const ex=face*r*.2+s*r*.27;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex,-r*.12,r*.22,0,7);ctx.fill();ctx.fillStyle='#1a2a3a';ctx.beginPath();ctx.arc(ex+face*r*.07,-r*.1,r*.11,0,7);ctx.fill()}
  if(opt.mouth==='suck'){ctx.fillStyle='#1a5a4a';ctx.beginPath();ctx.ellipse(face*r*.3,r*.35,r*.26,r*.28,0,0,7);ctx.fill()}
  else if(opt.mouth==='full'){ctx.strokeStyle='#1a5a4a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(face*r*.05,r*.4);ctx.lineTo(face*r*.45,r*.4);ctx.stroke()}
  else{ctx.strokeStyle='#1a5a4a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(face*r*.2,r*.28,r*.15,.2,Math.PI-.2);ctx.stroke()}
  if(opt.hat==='fire'){ctx.fillStyle='#ff7a1c';for(const k of [-.5,0,.5]){ctx.beginPath();ctx.moveTo(k*r-r*.2,-r*.85);ctx.lineTo(k*r,-r*1.5-Math.random()*r*.2);ctx.lineTo(k*r+r*.2,-r*.85);ctx.fill()}}
  else if(opt.hat==='ice'){ctx.fillStyle='#7fd8ff';ctx.beginPath();ctx.ellipse(0,-r*.85,r*.8,r*.3,0,Math.PI,0);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,-r*1.2,r*.18,0,7);ctx.fill()}
  else if(opt.hat==='sword'){ctx.fillStyle='#ffb020';ctx.beginPath();ctx.moveTo(-r*.8,-r*.6);ctx.lineTo(r*.6,-r*1.5);ctx.lineTo(r*.8,-r*.6);ctx.fill()}
  ctx.restore()}
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=L?L.sky:'#bfe6ff';ctx.fillRect(0,0,Wd,Ht);if(!L)return;
  const tx=clamp(pl.x-Wd/T*.4,0,Math.max(0,MW-Wd/T)),ty=clamp(pl.y-Ht/T*.6,0,Math.max(0,MH-Ht/T));cam.x+=(tx-cam.x)*.15;cam.y+=(ty-cam.y)*.15;
  // 구름
  ctx.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<8;i++){const x=((i*260-cam.x*T*.3)%(Wd+300)+Wd+300)%(Wd+300)-150,y=40+(i*67)%160;ctx.beginPath();ctx.ellipse(x,y,70,24,0,0,7);ctx.ellipse(x+40,y-12,40,22,0,0,7);ctx.fill()}
  ctx.save();ctx.translate(-cam.x*T,-cam.y*T);
  const x0=Math.floor(cam.x)-1,x1=Math.ceil(cam.x+Wd/T)+1;
  for(let y=0;y<MH;y++)for(let x=x0;x<=x1;x++){const t=tile(x,y);if(t==='#'){ctx.fillStyle='#b07850';ctx.fillRect(x*T,y*T,T+.5,T+.5)}else if(t==='='){ctx.fillStyle='#b07850';ctx.fillRect(x*T,y*T,T+.5,T+.5);ctx.fillStyle=L.ground;ctx.fillRect(x*T,y*T,T+.5,T*.35)}else if(t==='-'){ctx.fillStyle='#ffd0e8';ctx.fillRect(x*T,y*T,T+.5,T*.3);ctx.fillStyle='#ff9ac8';ctx.fillRect(x*T,y*T+T*.24,T+.5,T*.08)}}
  if(door){ctx.fillStyle='#8a4ad0';ctx.fillRect((door.x-.5)*T,(door.y-1.6)*T,T,T*1.6);ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc((door.x+.25)*T,(door.y-.8)*T,T*.08,0,7);ctx.fill();ctx.font=`${T*.6}px Jua, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#ffd23f';ctx.fillText('★',door.x*T,(door.y-1.8)*T)}
  ctx.font=`${T*.8}px Jua, sans-serif`;ctx.textAlign='center';for(const s of stars)if(!s.got){ctx.fillStyle='#ffd23f';ctx.fillText('★',s.x*T,(s.y+.3+Math.sin(time*3+s.x)*.08)*T)}
  for(const e of enemies){if(e.dead)continue;const x=e.x*T,y=(e.y-.42)*T,r=T*.42;
    if(e.frozen>0){ctx.fillStyle='rgba(160,220,255,.9)';ctx.fillRect(x-r*1.1,y-r*1.1,r*2.2,r*2.2)}
    ctx.fillStyle=e.hit>0?'#fff':e.E.color;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
    if(e.E.spiky){ctx.fillStyle='#3a2a5a';for(let k=0;k<8;k++){const a=k/8*Math.PI*2+time;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.lineTo(x+Math.cos(a+.2)*r*1.45,y+Math.sin(a+.2)*r*1.45);ctx.lineTo(x+Math.cos(a+.4)*r,y+Math.sin(a+.4)*r);ctx.fill()}}
    if(e.fly){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y-r*.6,r*.7,r*.25*Math.abs(Math.sin(time*12)),0,0,7);ctx.fill()}
    if(e.k==='k'){ctx.fillStyle='#d0d6e0';ctx.fillRect(x-r,y-r*.95,r*2,r*.5)}
    if(e.k==='f'){ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.moveTo(x-r*.4,y-r*.8);ctx.lineTo(x,y-r*1.5);ctx.lineTo(x+r*.4,y-r*.8);ctx.fill()}
    if(e.k==='i'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y-r*.9,r*.25,0,7);ctx.fill()}
    const f=Math.sign(e.vx)||-1;ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x+f*r*.3-r*.15,y-r*.1,r*.12,0,7);ctx.arc(x+f*r*.3+r*.15,y-r*.1,r*.12,0,7);ctx.fill()}
  for(const s of shots){if(s.k==='star'){ctx.fillStyle='#ffd23f';ctx.font=`${T*.9}px Jua, sans-serif`;ctx.fillText('★',s.x*T,(s.y+.3)*T)}else{ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(s.x*T,s.y*T,T*.25,0,7);ctx.fill()}}
  // 능력 효과
  if(pl.ab&&pl.abT>0){const A=AB(pl.ab),x=pl.x*T,y=(pl.y-.42)*T;
    if(pl.ab==='sword'){ctx.strokeStyle='#e8f0ff';ctx.lineWidth=T*.15;ctx.beginPath();ctx.arc(x,y,A.range*T*.8,pl.face>0?-1.2:Math.PI-1.2+2.4*0,pl.face>0?1.2:Math.PI+1.2);ctx.stroke()}
    else{for(let k=0;k<8;k++){const d=Math.random()*A.range,yy=y+(Math.random()-.5)*T*.7;ctx.fillStyle=pl.ab==='fire'?(Math.random()<.5?'#ff7a1c':'#ffd23f'):(Math.random()<.5?'#bfefff':'#ffffff');ctx.beginPath();ctx.arc(x+pl.face*(T*.4+d*T),yy,T*.18+d*T*.05,0,7);ctx.fill()}}}
  if(pl.suck){const x=pl.x*T,y=(pl.y-.42)*T;ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=3;for(let k=0;k<4;k++){const d=((time*4+k/4)%1)*PP.inhale;ctx.beginPath();ctx.arc(x+pl.face*(PP.inhale-d)*T,y,T*.3*(1-d/PP.inhale+.3),0,7);ctx.stroke()}}
  for(const f of fx){ctx.fillStyle=`rgba(255,255,255,${f.t*2.5})`;ctx.beginPath();ctx.arc(f.x*T,f.y*T,T*(1-f.t*2),0,7);ctx.fill()}
  if(!(pl.inv>0&&Math.floor(time*12)%2)){const big=pl.puffed||pl.full;drawJelly(pl.x*T,(pl.y-.42)*T-(big?T*.1:0),T*.42*(pl.puffed?1.35:pl.full?1.25:1),pl.face,{mouth:pl.suck?'suck':pl.full?'full':'',hat:pl.ab,squash:pl.ground&&Math.abs(pl.vx)>1?1+Math.sin(time*16)*.04:1})}
  ctx.restore()}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.04);last=now;if(!paused){time+=dt;if(state==='play')update(dt)}draw();requestAnimationFrame(frame)}

// ---------- 처음 화면
function toTitle(){state='title';for(const id of ['pauseOv','endOv'])$(id).hidden=true;if(!L)load(0);
  const box=$('levels');box.innerHTML='';const cols=['#ff7ab8','#5ab8ff','#ff8a3a'];
  D.levels.forEach((lv,i)=>{const b=document.createElement('button');b.className='lvb';b.style.setProperty('--c',cols[i%3]);const lock=i>save.done;b.disabled=lock;
    const nb=document.createElement('b'),sp=document.createElement('span');nb.textContent=(i+1)+'. '+lv.name;sp.textContent=lock?'잠김':i<save.done?'별 '+(save.stars[i]||0)+'개 ✓':'도전!';b.append(nb,sp);b.onclick=()=>{if(lock)return;snd('select');begin(i)};box.appendChild(b)});
  $('titleOv').hidden=false}
$('nextBtn').onclick=()=>{snd('click');begin(li+1)};$('retryBtn').onclick=()=>{snd('click');begin(li)};$('eMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__gj={pl,get enemies(){return enemies},get state(){return state},begin,keys,btn,press:k=>{if(k==='j')jumpPressed=true;if(k==='a')actPressed=true;if(k==='d')downPressed=true},get door(){return door}};
});
