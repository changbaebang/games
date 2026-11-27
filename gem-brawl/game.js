/* 보석 대작전 — 3대3 보석 잡기 팀 대결. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const MOBILE=matchMedia('(pointer:coarse)').matches,MT=D.match,SAVE='gemBrawl.save';
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>v<a?a:v>b?b:v;
const save=Object.assign({tro:0,pick:'fire',map:0,wins:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,S=40;
function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;S=Math.min(Wd,Ht)/(Wd<Ht?10.5:10.5)}
addEventListener('resize',fit);fit();

// ---------- 맵
let map=[],MW=15,MH=21,mine={x:7.5,y:10.5},spawns=[[],[]];
function loadMap(i){const R=D.maps[i].rows;MH=R.length;MW=R[0].length;map=R.map(r=>r.split(''));spawns=[[],[]];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];if(c==='G'){mine={x:x+.5,y:y+.5};map[y][x]='.'}if(c==='1'||c==='2'){spawns[c==='1'?0:1].push({x:x+.5,y:y+.5});map[y][x]='.'}}}
const tileAt=(x,y)=>{const tx=Math.floor(x),ty=Math.floor(y);return tx<0||ty<0||tx>=MW||ty>=MH?'#':map[ty][tx]};
const solid=(x,y)=>{const t=tileAt(x,y);return t==='#'||t==='~'};
const R=.36;
function freeAt(x,y){return !solid(x-R,y-R)&&!solid(x+R,y-R)&&!solid(x-R,y+R)&&!solid(x+R,y+R)}
function moveU(u,dx,dy){if(freeAt(u.x+dx,u.y))u.x+=dx;if(freeAt(u.x,u.y+dy))u.y+=dy}
function los(ax,ay,bx,by){const d=Math.hypot(bx-ax,by-ay),n=Math.ceil(d*4);for(let i=1;i<n;i++){if(tileAt(ax+(bx-ax)*i/n,ay+(by-ay)*i/n)==='#')return false}return true}
const inBush=u=>tileAt(u.x,u.y)==='B';
// 길찾기(격자 BFS)
function flowTo(tx,ty){const dist=new Int16Array(MW*MH).fill(-1),q=[];const s=Math.floor(ty)*MW+Math.floor(tx);dist[s]=0;q.push(s);
  for(let i=0;i<q.length;i++){const c=q[i],cx=c%MW,cy=(c/MW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const n=ny*MW+nx;if(dist[n]>=0||map[ny][nx]==='#'||map[ny][nx]==='~')continue;dist[n]=dist[c]+1;q.push(n)}}return dist}
function stepToward(u,dist){const cx=Math.floor(u.x),cy=Math.floor(u.y),d0=dist[cy*MW+cx];let best=null,bd=d0<0?1e9:d0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const d=dist[ny*MW+nx];if(d>=0&&d<bd){bd=d;best=[nx+.5,ny+.5]}}return best}

// ---------- 유닛
const BR=id=>D.brawlers.find(b=>b.id===id);
let units=[],bullets=[],gems=[],fx=[],me=null,state='title',paused=false,time=0,clock=0,gemT=0,hold=null,botSkill=.5;
function mkUnit(team,b,name,human){const sp=spawns[team][units.filter(u=>u.team===team).length%3];
  return {team,b,name,human,x:sp.x,y:sp.y,hp:b.hp,max:b.hp,ammo:b.attack.ammo,sup:0,gems:0,dead:false,rt:0,ax:0,ay:team?1:-1,calm:0,cd:0,dash:null,hitBy:0,flow:null,flowT:0,goal:null,strafe:rand(-1,1),reveal:0,spawn:sp}}
function start(){
  loadMap(save.map);const mine_=BR(save.pick)||D.brawlers[0];units=[];bullets=[];gems=[];fx=[];
  const names=D.botNames.slice().sort(()=>Math.random()-.5);
  me=mkUnit(0,mine_,'나',true);units.push(me);
  for(let i=0;i<2;i++)units.push(mkUnit(0,pick(D.brawlers),names.pop(),false));
  for(let i=0;i<3;i++)units.push(mkUnit(1,pick(D.brawlers),names.pop(),false));
  botSkill=clamp(.45+save.tro/400,.45,.9);clock=MT.time;gemT=2;hold=null;state='play';paused=false;
  for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;toast('보석을 모아요!','#e8b0ff');snd('go')}

// ---------- 공격
function fire(u,ax,ay,isSuper){
  if(u.dead||u.dash)return false;const A=isSuper?u.b.super:u.b.attack;if(!isSuper&&(u.ammo<1||u.cd>0))return false;if(isSuper&&u.sup<1)return false;
  const l=Math.hypot(ax,ay)||1;ax/=l;ay/=l;u.ax=ax;u.ay=ay;u.calm=0;u.reveal=1;
  if(isSuper)u.sup=0;else{u.ammo-=1;u.cd=.28}
  const k=A.kind;
  if(k==='spread'){const n=A.count,sp=A.angle*Math.PI/180;for(let i=0;i<n;i++){const a=Math.atan2(ay,ax)+(i/(n-1)-.5)*sp;bullets.push({x:u.x,y:u.y,vx:Math.cos(a)*A.speed,vy:Math.sin(a)*A.speed,left:A.range,dmg:A.dmg,team:u.team,o:u,r:.12})}snd('shoot')}
  else if(k==='shot'||k==='pierce'){bullets.push({x:u.x,y:u.y,vx:ax*A.speed,vy:ay*A.speed,left:A.range,dmg:A.dmg,team:u.team,o:u,r:k==='pierce'?.3:.16,pierce:k==='pierce',hit:new Set()});snd(k==='pierce'?'zap':'shoot')}
  else if(k==='lob'||k==='bigbomb'){const range=A.range,tx=u.x+ax*range*(u.aimLen??1),ty=u.y+ay*range*(u.aimLen??1),d=Math.hypot(tx-u.x,ty-u.y);
    bullets.push({lob:true,x0:u.x,y0:u.y,tx,ty,t:0,T:Math.max(.35,d/(A.speed||9)),dmg:A.dmg,rad:A.radius,team:u.team,o:u,big:k==='bigbomb'});snd('whoosh')}
  else if(k==='swing'){fx.push({kind:'swing',x:u.x,y:u.y,a:Math.atan2(ay,ax),r:A.range,t:.2,col:u.b.color});snd('slash');
    for(const e of units){if(e.team===u.team||e.dead)continue;const dx=e.x-u.x,dy=e.y-u.y,d=Math.hypot(dx,dy);let da=Math.atan2(dy,dx)-Math.atan2(ay,ax);da=Math.atan2(Math.sin(da),Math.cos(da));
      if(d<A.range+R&&Math.abs(da)<A.angle*Math.PI/360)hurt(e,A.dmg,u)}}
  else if(k==='dash'||k==='charge'){u.dash={vx:ax,vy:ay,left:A.dist,dmg:A.dmg,hit:new Set(),kb:k==='charge'};snd('power')}
  return true}
function hurt(e,dmg,by){if(e.dead)return;e.hp-=dmg;e.calm=0;e.hitBy=.15;e.reveal=1;fx.push({kind:'num',x:e.x,y:e.y-.6,t:.7,txt:dmg,col:by===me?'#ffd23f':'#fff'});
  if(by&&!by.dead)by.sup=Math.min(1,by.sup+1/by.b.superHits);if(by===me)snd('hit');
  if(e.hp<=0)kill(e,by)}
function kill(e,by){e.dead=true;e.rt=MT.respawn;snd(e===me?'hurt':'pop');fx.push({kind:'boom',x:e.x,y:e.y,t:.4,r:.9});
  for(let i=0;i<e.gems;i++)gems.push({x:e.x,y:e.y,vx:rand(-2.5,2.5),vy:rand(-2.5,2.5)});if(e.gems>=3)toast((e.team?'상대':'우리')+' 보석 '+e.gems+'개 떨어짐!',e.team?'#7fd0ff':'#ff8a8a');e.gems=0;
  if(by===me)toast('쓰러뜨렸어요!','#ffd23f')}
function explode(x,y,rad,dmg,team,o,big){fx.push({kind:'boom',x,y,t:.35,r:rad});snd(big?'boom':'pop');
  for(const e of units){if(e.team===team||e.dead)continue;if(Math.hypot(e.x-x,e.y-y)<rad+R)hurt(e,dmg,o)}
  if(big)for(let yy=Math.floor(y-rad);yy<=y+rad;yy++)for(let xx=Math.floor(x-rad);xx<=x+rad;xx++){if(yy<0||xx<0||yy>=MH||xx>=MW)continue;if(map[yy][xx]==='#'&&Math.hypot(xx+.5-x,yy+.5-y)<rad){map[yy][xx]='.';fx.push({kind:'boom',x:xx+.5,y:yy+.5,t:.3,r:.5})}}}

// ---------- 봇
function visibleTo(team,e){if(e.dead)return false;if(!inBush(e)||e.reveal>0)return true;return units.some(u=>u.team===team&&!u.dead&&Math.hypot(u.x-e.x,u.y-e.y)<2.2)}
function teamGems(t){return units.filter(u=>u.team===t).reduce((a,u)=>a+u.gems,0)}
function bot(u,dt){
  const A=u.b.attack,enemies=units.filter(e=>e.team!==u.team&&visibleTo(u.team,e));
  let tgt=null,td=1e9;for(const e of enemies){const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<td){td=d;tgt=e}}
  u.flowT-=dt;
  if(u.flowT<=0){u.flowT=.5+Math.random()*.3;const tg=teamGems(u.team),og=teamGems(1-u.team);let goal;
    if(u.hp<u.max*.35||(u.gems>0&&tg>=MT.goal)||(u.gems>=4&&tg>og+2))goal=u.spawn;
    else if(gems.length){let g=null,gd=1e9;for(const q of gems){const d=Math.hypot(q.x-u.x,q.y-u.y);if(d<gd){gd=d;g=q}}goal=g}
    else if(tgt&&td<9)goal=tgt;else goal={x:mine.x+rand(-2,2),y:mine.y+(u.team?-2:2)};
    u.goal={x:goal.x,y:goal.y};u.flow=flowTo(clamp(goal.x,0,MW-.01),clamp(goal.y,0,MH-.01))}
  let mx=0,my=0;
  if(u.flow){const st=stepToward(u,u.flow);if(st){mx=st[0]-u.x;my=st[1]-u.y}else if(u.goal){mx=u.goal.x-u.x;my=u.goal.y-u.y}}
  if(tgt&&td<(A.range||3)*.8&&u.hp>u.max*.35){const px=-(tgt.y-u.y),py=tgt.x-u.x,l=Math.hypot(px,py)||1;mx=mx*.4+px/l*u.strafe;my=my*.4+py/l*u.strafe;if(Math.random()<dt*.6)u.strafe=-u.strafe}
  const l=Math.hypot(mx,my);if(l>.05){moveU(u,mx/l*u.b.speed*dt,my/l*u.b.speed*dt)}
  if(tgt&&u.cd<=0){const range=(A.range||3);const canHit=A.kind==='lob'||los(u.x,u.y,tgt.x,tgt.y);
    if(td<range*.95&&canHit&&Math.random()<dt*(1.5+botSkill*3)){
      const lead=A.speed?td/A.speed:0,ex=tgt.x+(tgt.vx||0)*lead*botSkill,ey=tgt.y+(tgt.vy||0)*lead*botSkill,err=(1-botSkill)*.5;
      u.aimLen=A.kind==='lob'?clamp(td/range,.2,1):1;
      if(u.sup>=1&&Math.random()<.5)fire(u,ex-u.x+rand(-err,err),ey-u.y+rand(-err,err),true);else if(u.ammo>=1)fire(u,ex-u.x+rand(-err,err),ey-u.y+rand(-err,err),false)}}
}

// ---------- 입력
const keys={},mv={x:0,y:0},aim={on:false,x:0,y:0,len:0};let mouse={x:0,y:0};
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true;if((e.code==='KeyE'||e.code==='Space')&&!e.repeat){e.preventDefault();doSuper()}});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
function toWorld(px,py){return {x:(px-Wd/2)/S+cam.x,y:(py-Ht/2)/S+cam.y}}
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouse={x:e.clientX,y:e.clientY}}});
cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||state!=='play')return;const w=toWorld(e.clientX,e.clientY);me.aimLen=clamp(Math.hypot(w.x-me.x,w.y-me.y)/(me.b.attack.range||3),.2,1);
  if(e.button===2)fire(me,w.x-me.x,w.y-me.y,true);else fire(me,w.x-me.x,w.y-me.y,false)});
cv.addEventListener('contextmenu',e=>e.preventDefault());
function stick(el,onMove,onEnd){let id=null,ox=0,oy=0;const k=el.firstElementChild||el.querySelector('i');
  el.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;const r=el.getBoundingClientRect();ox=r.left+r.width/2;oy=r.top+r.height/2;try{el.setPointerCapture(id)}catch(_){}mvFn(e)});
  const mvFn=e=>{if(e.pointerId!==id)return;let x=e.clientX-ox,y=e.clientY-oy;const l=Math.hypot(x,y),mx=52;if(l>mx){x*=mx/l;y*=mx/l}if(k)k.style.transform=`translate(${x}px,${y}px)`;onMove(x/mx,y/mx)};
  el.addEventListener('pointermove',mvFn);
  const end=e=>{if(e.pointerId!==id)return;id=null;if(k)k.style.transform='';onEnd()};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
stick($('moveStick'),(x,y)=>{mv.x=x;mv.y=y},()=>{mv.x=mv.y=0});
stick($('aimStick'),(x,y)=>{aim.on=true;aim.x=x;aim.y=y;aim.len=Math.hypot(x,y)},()=>{if(state==='play'){if(aim.len>.25){me.aimLen=clamp(aim.len,.2,1);fire(me,aim.x,aim.y,false)}else autoFire(false)}aim.on=false;aim.len=0});
$('superBtn').addEventListener('pointerdown',e=>{e.preventDefault();doSuper()});
function nearestEnemy(u,max){let t=null,d=max;for(const e of units){if(e.team===u.team||!visibleTo(u.team,e))continue;const dd=Math.hypot(e.x-u.x,e.y-u.y);if(dd<d){d=dd;t=e}}return t}
function autoFire(sup){const A=sup?me.b.super:me.b.attack,t=nearestEnemy(me,(A.range||A.dist||me.b.attack.range||3)*1.15);
  if(t){me.aimLen=clamp(Math.hypot(t.x-me.x,t.y-me.y)/(A.range||3),.2,1);fire(me,t.x-me.x,t.y-me.y,sup)}else{me.aimLen=1;fire(me,me.ax,me.ay,sup)}}
function doSuper(){if(state!=='play'||!me||me.sup<1)return;if(!MOBILE){const w=toWorld(mouse.x,mouse.y);me.aimLen=clamp(Math.hypot(w.x-me.x,w.y-me.y)/(me.b.super.range||3),.2,1);fire(me,w.x-me.x,w.y-me.y,true)}else if(aim.on&&aim.len>.25)fire(me,aim.x,aim.y,true);else autoFire(true)}

// ---------- 진행
function update(dt){
  clock-=dt;gemT-=dt;if(gemT<=0){gemT=MT.gemEvery;gems.push({x:mine.x,y:mine.y,vx:rand(-1.5,1.5),vy:rand(-1.5,1.5)});snd('tick')}
  // 나
  if(!me.dead&&!me.dash){let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+mv.x,y=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+mv.y;const l=Math.hypot(x,y);
    if(l>.1){const k=Math.min(1,l);moveU(me,x/l*me.b.speed*k*dt,y/l*me.b.speed*k*dt)}
    if(!MOBILE){const w=toWorld(mouse.x,mouse.y);me.ax=w.x-me.x;me.ay=w.y-me.y}else if(aim.on&&aim.len>.2){me.ax=aim.x;me.ay=aim.y}}
  for(const u of units){const px=u.x,py=u.y;
    if(u.dead){u.rt-=dt;if(u.rt<=0){u.dead=false;u.hp=u.max;u.x=u.spawn.x;u.y=u.spawn.y;u.ammo=u.b.attack.ammo;u.dash=null}continue}
    u.cd=Math.max(0,u.cd-dt);u.reveal=Math.max(0,u.reveal-dt);u.hitBy=Math.max(0,u.hitBy-dt);
    if(u.ammo<u.b.attack.ammo)u.ammo=Math.min(u.b.attack.ammo,u.ammo+dt/u.b.attack.reload);
    u.calm+=dt;if(u.calm>3&&u.hp<u.max)u.hp=Math.min(u.max,u.hp+u.max*.13*dt);
    if(u.dash){const sp=14*dt,dd=Math.min(sp,u.dash.left);moveU(u,u.dash.vx*dd,u.dash.vy*dd);u.dash.left-=dd;
      for(const e of units){if(e.team===u.team||e.dead||u.dash.hit.has(e))continue;if(Math.hypot(e.x-u.x,e.y-u.y)<R*2.4){u.dash.hit.add(e);hurt(e,u.dash.dmg,u);if(u.dash.kb)moveU(e,u.dash.vx*1.5,u.dash.vy*1.5)}}
      if(u.dash.left<=0)u.dash=null}
    else if(!u.human)bot(u,dt);
    u.vx=(u.x-px)/dt;u.vy=(u.y-py)/dt;
    for(let i=gems.length-1;i>=0;i--){const g=gems[i];if(Math.hypot(g.x-u.x,g.y-u.y)<.6){u.gems++;gems.splice(i,1);if(u===me)snd('coin')}}}
  // 총알
  for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];
    if(b.lob){b.t+=dt;if(b.t>=b.T){explode(b.tx,b.ty,b.rad,b.dmg,b.team,b.o,b.big);bullets.splice(i,1)}continue}
    const st=Math.hypot(b.vx,b.vy)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.left-=st;let gone=b.left<=0||tileAt(b.x,b.y)==='#';
    if(!gone)for(const e of units){if(e.team===b.team||e.dead||(b.hit&&b.hit.has(e)))continue;if(Math.hypot(e.x-b.x,e.y-b.y)<R+b.r){hurt(e,b.dmg,b.o);if(b.pierce)b.hit.add(e);else{gone=true;break}}}
    if(gone)bullets.splice(i,1)}
  for(const g of gems){g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=Math.exp(-4*dt);g.vy*=Math.exp(-4*dt);if(solid(g.x,g.y)){g.x-=g.vx*dt*2;g.y-=g.vy*dt*2;g.vx=-g.vx;g.vy=-g.vy}}
  for(let i=fx.length-1;i>=0;i--){fx[i].t-=dt;if(fx[i].t<=0)fx.splice(i,1)}
  // 승패
  const b0=teamGems(0),b1=teamGems(1);
  const lead=b0>=MT.goal&&b0>b1?0:b1>=MT.goal&&b1>b0?1:null;
  if(lead===null)hold=null;else if(!hold||hold.team!==lead){hold={team:lead,t:MT.holdTime};toast(lead?'상대 팀이 보석 10개!':'우리 팀 보석 10개! 버텨요!',lead?'#ff8a8a':'#7fd0ff');snd('alert')}
  if(hold){const prev=Math.ceil(hold.t);hold.t-=dt;if(Math.ceil(hold.t)!==prev&&hold.t<=5)snd('count');if(hold.t<=0){end(hold.team===0?'win':'lose');return}}
  if(clock<=0)end(b0>b1?'win':b1>b0?'lose':'draw');
  setT($('gBlue'),b0);setT($('gRed'),b1);const c=Math.max(0,clock);setT($('clock'),Math.floor(c/60)+':'+String(Math.floor(c%60)).padStart(2,'0'));
  setT($('count'),hold?(hold.team?'상대 ':'우리 ')+Math.ceil(hold.t)+'초':'');
  $('superBtn').classList.toggle('ready',me.sup>=1);setT($('superBtn'),me.sup>=1?me.b.super.name:Math.floor(me.sup*100)+'%');
}
function end(r){state='over';const d=r==='win'?MT.trophyWin:r==='lose'?-MT.trophyLose:0,before=save.tro;save.tro=Math.max(0,save.tro+d);if(r==='win'){save.wins++;if(window.Arcade)Arcade.record('gemBrawlWins',save.wins)}
  if(window.Arcade)Arcade.record('gemBrawlTrophy',save.tro);store();snd(r==='win'?'win':r==='lose'?'lose':'goal');
  setT($('oTitle'),r==='win'?'승리!':r==='lose'?'패배…':'무승부');$('oTxt').textContent=`트로피 ${d>=0?'+':''}${d} → ${save.tro}`+unlockMsg(before);
  setTimeout(()=>{$('overOv').hidden=false;$('againBtn').focus()},800)}
function unlockMsg(before){const nb=D.brawlers.find(b=>b.unlock>before&&b.unlock<=save.tro);return nb?` · 새 친구 ${nb.name} 열림!`:''}
function toast(t,c){const el=$('toast');el.textContent=t;el.style.color=c||'#fff';el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}

// ---------- 그리기
const cam={x:7.5,y:10.5};
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#2a3a2a';ctx.fillRect(0,0,Wd,Ht);
  const f=me&&state!=='title'?me:{x:MW/2,y:MH/2};cam.x+=(clamp(f.x,Wd/S/2-1,MW-Wd/S/2+1)-cam.x)*.15;cam.y+=(clamp(f.y,Ht/S/2-1.5,MH-Ht/S/2+1.5)-cam.y)*.15;
  if(Wd/S>MW+2)cam.x=MW/2;if(Ht/S>MH+3)cam.y=MH/2;
  ctx.translate(Wd/2-cam.x*S,Ht/2-cam.y*S);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const t=map[y][x];ctx.fillStyle=t==='~'?'#3a9ad8':(x+y)%2?'#8fcf6a':'#86c662';ctx.fillRect(x*S,y*S,S+.5,S+.5)}
  ctx.fillStyle='#5a3a8a';ctx.fillRect((mine.x-.7)*S,(mine.y-.7)*S,S*1.4,S*1.4);ctx.fillStyle='#3a2266';ctx.fillRect((mine.x-.5)*S,(mine.y-.5)*S,S,S);
  for(const sp of spawns[0]){ctx.fillStyle='rgba(47,125,225,.35)';ctx.fillRect((sp.x-.5)*S,(sp.y-.5)*S,S,S)}for(const sp of spawns[1]){ctx.fillStyle='rgba(224,74,74,.35)';ctx.fillRect((sp.x-.5)*S,(sp.y-.5)*S,S,S)}
  for(const g of gems)drawGem(g.x,g.y,.28);
  // 조준선
  if(state==='play'&&me&&!me.dead){const A=me.b.attack,a=Math.atan2(me.ay,me.ax),show=!MOBILE||aim.on;if(show){ctx.fillStyle='rgba(255,255,255,.22)';
    if(A.kind==='lob'){const L=(MOBILE?clamp(aim.len,.2,1):clamp(Math.hypot(me.ax,me.ay)/A.range,.2,1))*A.range;ctx.beginPath();ctx.arc((me.x+Math.cos(a)*L)*S,(me.y+Math.sin(a)*L)*S,A.radius*S,0,7);ctx.fill()}
    else{const sp=(A.angle||6)*Math.PI/360,r=(A.range||2)*S;ctx.beginPath();ctx.moveTo(me.x*S,me.y*S);ctx.arc(me.x*S,me.y*S,r,a-sp,a+sp);ctx.closePath();ctx.fill()}}}
  // 유닛
  for(const u of units){if(u.dead)continue;const hid=u.team!==0&&!visibleTo(0,u);if(hid)continue;
    const x=u.x*S,y=u.y*S,rr=R*S*1.15;ctx.globalAlpha=inBush(u)?.6:1;
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+rr*.8,rr,rr*.4,0,0,7);ctx.fill();
    ctx.fillStyle=u.team?'#e04a4a':'#2f7de1';ctx.beginPath();ctx.arc(x,y,rr+3,0,7);ctx.fill();
    ctx.fillStyle=u.hitBy>0?'#fff':u.b.color;ctx.beginPath();ctx.arc(x,y,rr,0,7);ctx.fill();
    const a=Math.atan2(u.ay,u.ax);ctx.fillStyle='#fff';for(const s of [-.45,.45]){ctx.beginPath();ctx.arc(x+Math.cos(a+s)*rr*.5,y+Math.sin(a+s)*rr*.5,rr*.22,0,7);ctx.fill()}
    ctx.fillStyle='#111';for(const s of [-.45,.45]){ctx.beginPath();ctx.arc(x+Math.cos(a+s)*rr*.58,y+Math.sin(a+s)*rr*.58,rr*.11,0,7);ctx.fill()}
    if(u.b.id==='bear'){ctx.fillStyle=u.b.color;for(const s of [-.9,.9]){ctx.beginPath();ctx.arc(x+Math.cos(-Math.PI/2+s)*rr*.95,y+Math.sin(-Math.PI/2+s)*rr*.95,rr*.3,0,7);ctx.fill()}}
    ctx.globalAlpha=1;
    const bw=S*.95;ctx.fillStyle='#222';ctx.fillRect(x-bw/2,y-rr-14,bw,6);ctx.fillStyle=u.team?'#ff5a5a':u===me?'#5fe07a':'#5ab8ff';ctx.fillRect(x-bw/2,y-rr-14,bw*u.hp/u.max,6);
    if(u===me){for(let i=0;i<u.b.attack.ammo;i++){ctx.fillStyle='#333';ctx.fillRect(x-bw/2+i*(bw/3),y-rr-7,bw/3-2,4);ctx.fillStyle='#ffb020';ctx.fillRect(x-bw/2+i*(bw/3),y-rr-7,(bw/3-2)*clamp(u.ammo-i,0,1),4)}}
    ctx.font=`${Math.max(11,S*.3)}px Jua, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(u.name,x,y-rr-18);
    if(u.gems>0){drawGem(u.x+.35,u.y-.95,.17);ctx.fillStyle='#fff';ctx.fillText(u.gems,x+S*.62,y-S*.82)}}
  // 풀숲
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){if(map[y][x]==='B'){ctx.fillStyle='rgba(40,140,60,.88)';ctx.fillRect(x*S,y*S,S+.5,S+.5);ctx.fillStyle='rgba(70,180,80,.9)';
    for(const [ox,oy] of [[.25,.3],[.7,.25],[.5,.7],[.2,.75],[.8,.7]]){ctx.beginPath();ctx.arc((x+ox)*S,(y+oy)*S,S*.22,0,7);ctx.fill()}}}
  // 벽
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){if(map[y][x]==='#'){ctx.fillStyle='#a0703a';ctx.fillRect(x*S,y*S,S+.5,S+.5);ctx.fillStyle='#c8945a';ctx.fillRect(x*S,y*S-S*.25,S+.5,S*.85)}}
  // 총알·효과
  for(const b of bullets){if(b.lob){const k=b.t/b.T,x=b.x0+(b.tx-b.x0)*k,y=b.y0+(b.ty-b.y0)*k-Math.sin(k*Math.PI)*1.6;ctx.fillStyle=b.big?'#5a2a8a':'#2a2a34';ctx.beginPath();ctx.arc(x*S,y*S,S*(b.big?.32:.2),0,7);ctx.fill();
      ctx.strokeStyle='rgba(255,80,80,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.tx*S,b.ty*S,b.rad*S,0,7);ctx.stroke();continue}
    ctx.fillStyle=b.team?'#ff8a6a':'#7fd8ff';ctx.beginPath();ctx.arc(b.x*S,b.y*S,b.r*S+2,0,7);ctx.fill()}
  for(const e of fx){if(e.kind==='boom'){ctx.fillStyle=`rgba(255,180,60,${e.t*1.8})`;ctx.beginPath();ctx.arc(e.x*S,e.y*S,e.r*S*(1.2-e.t),0,7);ctx.fill()}
    else if(e.kind==='swing'){ctx.strokeStyle=e.col;ctx.lineWidth=6;ctx.globalAlpha=e.t*4;ctx.beginPath();ctx.arc(e.x*S,e.y*S,e.r*S,e.a-1,e.a+1);ctx.stroke();ctx.globalAlpha=1}
    else if(e.kind==='num'){ctx.globalAlpha=Math.min(1,e.t*2);ctx.font=`${S*.4}px Jua, sans-serif`;ctx.fillStyle=e.col;ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(e.txt,e.x*S,(e.y-(.7-e.t))*S);ctx.fillText(e.txt,e.x*S,(e.y-(.7-e.t))*S);ctx.globalAlpha=1}}
  if(me&&me.dead&&state==='play'){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,Wd,Ht);ctx.fillStyle='#fff';ctx.font='28px Jua, sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(me.rt)+'초 뒤에 다시 나와요',Wd/2,Ht/2)}
}
function drawGem(x,y,r){ctx.fillStyle='#c070ff';ctx.beginPath();ctx.moveTo(x*S,(y-r)*S);ctx.lineTo((x+r)*S,y*S);ctx.lineTo(x*S,(y+r)*S);ctx.lineTo((x-r)*S,y*S);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect((x-r*.3)*S,(y-r*.5)*S,r*.3*S,r*.3*S)}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused){time+=dt;if(state==='play')update(dt)}draw();requestAnimationFrame(frame)}

// ---------- 처음 화면
function toTitle(){state='title';paused=false;for(const id of ['pauseOv','overOv'])$(id).hidden=true;loadMap(save.map);units=[];me=null;bullets=[];gems=[];
  setT($('tTro'),save.tro);const pk=$('picks');pk.innerHTML='';
  for(const b of D.brawlers){const lock=save.tro<b.unlock,el=document.createElement('button');el.className='br'+(save.pick===b.id?' on':'');el.disabled=lock;
    const i=document.createElement('i');i.style.setProperty('--c',b.color);const s=document.createElement('span');s.textContent=b.name;const sm=document.createElement('small');sm.textContent=lock?'트로피 '+b.unlock:b.super.name;el.append(i,s,sm);
    el.onclick=()=>{save.pick=b.id;store();snd('select');toTitle()};pk.appendChild(el)}
  const mp=$('maps');mp.innerHTML='';D.maps.forEach((m,i)=>{const el=document.createElement('button');el.className='mp'+(save.map===i?' on':'');el.textContent=m.name;el.onclick=()=>{save.map=i;store();snd('click');toTitle()};mp.appendChild(el)});
  $('titleOv').hidden=false}
$('startBtn').onclick=()=>{snd('select');start()};$('againBtn').onclick=()=>{snd('select');start()};$('oMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__gb={get units(){return units},get me(){return me},get state(){return state},start,save,get gems(){return gems},get clock(){return clock},teamGems,setHuman:v=>{me.human=v}};
});
