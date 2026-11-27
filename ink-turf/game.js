/* 잉크 땅따먹기 — 4대4 물감 칠하기 대결. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const MOBILE=matchMedia('(pointer:coarse)').matches,MT=D.match,PP=D.player,SAVE='inkTurf.save',TM=D.teams;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>v<a?a:v>b?b:v;
const save=Object.assign({wins:0,pick:'shot'},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,S=40;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;S=Math.min(Wd,Ht)/(Wd<Ht?10:13)}addEventListener('resize',fit);fit();

// ---------- 맵과 물감
const map=D.map.map(r=>r.split('')),MH=map.length,MW=map[0].length,PR=2,PW=MW*PR,PH=MH*PR;
let paint=new Int8Array(PW*PH),spawns=[[],[]];
for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];if(c==='a'||c==='b'){spawns[c==='a'?0:1].push({x:x+.5,y:y+.5});map[y][x]='.'}}
const solid=(x,y)=>{const tx=Math.floor(x),ty=Math.floor(y);return tx<0||ty<0||tx>=MW||ty>=MH||map[ty][tx]==='#'};
const R=.36;const free=(x,y)=>!solid(x-R,y-R)&&!solid(x+R,y-R)&&!solid(x-R,y+R)&&!solid(x+R,y+R);
function moveU(u,dx,dy){if(free(u.x+dx,u.y))u.x+=dx;if(free(u.x,u.y+dy))u.y+=dy}
const paintAt=(x,y)=>{const px=Math.floor(x*PR),py=Math.floor(y*PR);return px<0||py<0||px>=PW||py>=PH?0:paint[py*PW+px]};
let total=0;for(let y=0;y<PH;y++)for(let x=0;x<PW;x++)if(!solid((x+.5)/PR,(y+.5)/PR))total++;
function splat(x,y,r,team){const v=team+1;for(let py=Math.floor((y-r)*PR);py<=(y+r)*PR;py++)for(let px=Math.floor((x-r)*PR);px<=(x+r)*PR;px++){if(px<0||py<0||px>=PW||py>=PH)continue;const cx=(px+.5)/PR,cy=(py+.5)/PR;
  if((cx-x)**2+(cy-y)**2<=r*r&&!solid(cx,cy))paint[py*PW+px]=v}}
function counts(){let a=0,b=0;for(let i=0;i<paint.length;i++){if(paint[i]===1)a++;else if(paint[i]===2)b++}return [a/total*100,b/total*100]}
function flowTo(tx,ty){const dist=new Int16Array(MW*MH).fill(-1),q=[];const s=Math.floor(ty)*MW+Math.floor(tx);if(s<0||s>=dist.length)return dist;dist[s]=0;q.push(s);
  for(let i=0;i<q.length;i++){const c=q[i],cx=c%MW,cy=(c/MW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const n=ny*MW+nx;if(dist[n]>=0||map[ny][nx]==='#')continue;dist[n]=dist[c]+1;q.push(n)}}return dist}
function stepToward(u,dist){const cx=Math.floor(u.x),cy=Math.floor(u.y),d0=dist[cy*MW+cx];let best=null,bd=d0<0?1e9:d0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=MW||ny>=MH)continue;const d=dist[ny*MW+nx];if(d>=0&&d<bd){bd=d;best=[nx+.5,ny+.5]}}return best}

// ---------- 유닛
const WP=id=>D.weapons.find(w=>w.id===id);
let units=[],shots=[],fx=[],me=null,state='title',paused=false,time=0,clock=0;
function mkUnit(team,w,name,human,i){const sp=spawns[team][i%spawns[team].length];return {team,w,name,human,x:sp.x,y:sp.y,spawn:sp,hp:PP.hp,ink:100,cd:0,dead:false,rt:0,ax:0,ay:team?1:-1,swim:false,calm:0,hit:0,flow:null,flowT:0,goal:null,vx:0,vy:0}}
function start(){paint.fill(0);units=[];shots=[];fx=[];const names=D.botNames.slice().sort(()=>Math.random()-.5);
  me=mkUnit(0,WP(save.pick)||D.weapons[0],'나',true,0);units.push(me);
  for(let i=1;i<MT.teamSize;i++)units.push(mkUnit(0,pick(D.weapons),names.pop(),false,i));
  for(let i=0;i<MT.teamSize;i++)units.push(mkUnit(1,pick(D.weapons),names.pop(),false,i));
  for(const sp of spawns[0])splat(sp.x,sp.y,1.3,0);for(const sp of spawns[1])splat(sp.x,sp.y,1.3,1);
  clock=MT.time;state='play';paused=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;toast('칠해요!');snd('go')}

// ---------- 쏘기
function fire(u,ax,ay){const W=u.w;if(u.dead||u.cd>0||u.swim)return;if(u.ink<W.cost){if(u===me&&Math.random()<.05)toast('잉크 부족! 수영해서 채워요');return}
  const l=Math.hypot(ax,ay)||1;ax/=l;ay/=l;u.ax=ax;u.ay=ay;u.ink-=W.cost;u.cd=W.cd;u.calm=0;
  if(W.kind==='shot'){const a=Math.atan2(ay,ax)+rand(-.08,.08);shots.push({x:u.x,y:u.y,vx:Math.cos(a)*W.speed,vy:Math.sin(a)*W.speed,left:W.range*rand(.85,1),team:u.team,o:u,W});if(u===me||Math.random()<.2)snd('tick')}
  else if(W.kind==='lob'){const L=Math.min(W.range,(u.aimLen||1)*W.range),tx=u.x+ax*L,ty=u.y+ay*L;shots.push({lob:true,x0:u.x,y0:u.y,tx,ty,t:0,T:Math.max(.3,L/W.speed),team:u.team,o:u,W});snd('whoosh')}
  else{const tx=u.x+ax*W.flick,ty=u.y+ay*W.flick;for(let k=0;k<5;k++){const a=Math.atan2(ay,ax)+(k-2)*.22;shots.push({lob:true,x0:u.x,y0:u.y,tx:u.x+Math.cos(a)*W.flick,ty:u.y+Math.sin(a)*W.flick,t:0,T:.25,team:u.team,o:u,W,small:true})}u.cd=W.cd;snd('splat')}}
function hurt(e,d,by){if(e.dead||e.swim&&d<50&&Math.random()<.5)return;e.hp-=d;e.hit=.15;e.calm=0;if(by===me)snd('hit');if(e.hp<=0){e.dead=true;e.rt=MT.respawn;splat(e.x,e.y,1.4,by?by.team:1-e.team);fx.push({x:e.x,y:e.y,t:.4,c:TM[1-e.team].ink});snd(e===me?'hurt':'pop');if(by===me)toast('쓰러뜨렸어요!')}}

// ---------- 봇
function bot(u,dt){const W=u.w;u.flowT-=dt;
  let tgt=null,td=1e9;for(const e of units){if(e.team===u.team||e.dead)continue;if(e.swim&&Math.hypot(e.x-u.x,e.y-u.y)>2)continue;const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<td){td=d;tgt=e}}
  if(u.flowT<=0){u.flowT=.6+Math.random()*.4;let goal=null;
    if(u.ink<15)goal={x:u.x,y:u.y};
    else if(tgt&&td<6&&u.hp>40)goal={x:tgt.x,y:tgt.y};
    else{let bs=-1;for(let k=0;k<24;k++){const x=rand(.5,MW-.5),y=rand(.5,MH-.5);if(solid(x,y))continue;const d=Math.hypot(x-u.x,y-u.y),p=paintAt(x,y),score=(p===u.team+1?0:p===0?2:3)-d*.12+(u.team?y:MH-y)*.02;if(score>bs){bs=score;goal={x,y}}}}
    u.goal=goal;if(goal)u.flow=flowTo(goal.x,goal.y)}
  u.swim=u.ink<15&&paintAt(u.x,u.y)===u.team+1;
  let mx=0,my=0;if(u.flow&&!(u.ink<15&&u.swim)){const st=stepToward(u,u.flow);if(st){mx=st[0]-u.x;my=st[1]-u.y}else if(u.goal){mx=u.goal.x-u.x;my=u.goal.y-u.y}}
  if(u.ink<15&&!u.swim){let best=null,bd=1e9;for(let k=0;k<12;k++){const a=k/12*Math.PI*2,x=u.x+Math.cos(a)*1.2,y=u.y+Math.sin(a)*1.2;if(paintAt(x,y)===u.team+1&&!solid(x,y)){best=[x,y];break}}if(best){mx=best[0]-u.x;my=best[1]-u.y}}
  move(u,mx,my,dt);
  if(tgt&&td<W.range*.95){fire(u,tgt.x-u.x+rand(-.4,.4),tgt.y-u.y+rand(-.4,.4))}
  else if(W.kind==='shot'&&u.ink>40&&Math.random()<dt*4){const a=Math.atan2(my,mx)+rand(-1,1);fire(u,Math.cos(a),Math.sin(a))}
  else if(W.kind==='lob'&&u.ink>50&&Math.random()<dt*1.2){u.aimLen=rand(.5,1);const a=Math.atan2(my,mx)+rand(-.6,.6);fire(u,Math.cos(a),Math.sin(a))}}
function move(u,mx,my,dt){const l=Math.hypot(mx,my);if(l<.05){u.vx=u.vy=0;return}const k=Math.min(1,l)/l,p=paintAt(u.x,u.y);
  let sp=PP.speed*(u.swim&&p===u.team+1?PP.swimSpeed:1)*(p&&p!==u.team+1?PP.enemyInkSlow:1)*(u.w.kind==='roller'&&!u.swim?.9:1);if(u.swim&&p!==u.team+1)sp*=.6;
  const px=u.x,py=u.y;moveU(u,mx*k*sp*dt,my*k*sp*dt);u.vx=(u.x-px)/dt;u.vy=(u.y-py)/dt;
  if(!u.swim){u.ax=mx;u.ay=my}
  if(u.w.kind==='roller'&&!u.swim&&u.ink>u.w.cost*dt*10){u.ink-=u.w.cost*dt*6;splat(u.x+u.ax/Math.hypot(u.ax,u.ay)*.5,u.y+u.ay/Math.hypot(u.ax,u.ay)*.5,u.w.paint,u.team);
    for(const e of units){if(e.team!==u.team&&!e.dead&&Math.hypot(e.x-u.x,e.y-u.y)<u.w.range*.7)hurt(e,u.w.dmg*dt*3,u)}}}

// ---------- 입력 (보석 대작전과 같은 양손 조작)
const keys={},mv={x:0,y:0},aim={on:false,x:0,y:0,len:0};let mouse={x:0,y:0,down:false},swimHeld=false;
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.down=false});
const toWorld=(px,py)=>({x:(px-Wd/2)/S+cam.x,y:(py-Ht/2)/S+cam.y});
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')mouse={x:e.clientX,y:e.clientY,down:mouse.down}});
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY}});
addEventListener('pointerup',e=>{if(e.pointerType==='mouse')mouse.down=false});
function stick(el,onMove,onEnd){let id=null,ox=0,oy=0;const k=el.querySelector('i');
  el.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;const r=el.getBoundingClientRect();ox=r.left+r.width/2;oy=r.top+r.height/2;try{el.setPointerCapture(id)}catch(_){}mf(e)});
  const mf=e=>{if(e.pointerId!==id)return;let x=e.clientX-ox,y=e.clientY-oy;const l=Math.hypot(x,y),mx=52;if(l>mx){x*=mx/l;y*=mx/l}if(k)k.style.transform=`translate(${x}px,${y}px)`;onMove(x/mx,y/mx)};el.addEventListener('pointermove',mf);
  const end=e=>{if(e.pointerId!==id)return;id=null;if(k)k.style.transform='';onEnd()};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)}
stick($('moveStick'),(x,y)=>{mv.x=x;mv.y=y},()=>{mv.x=mv.y=0});
stick($('aimStick'),(x,y)=>{aim.on=true;aim.x=x;aim.y=y;aim.len=Math.hypot(x,y)},()=>{aim.on=false;aim.len=0});
const sb=$('superBtn');sb.addEventListener('pointerdown',e=>{e.preventDefault();swimHeld=true;sb.classList.add('on');try{sb.setPointerCapture(e.pointerId)}catch(_){}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])sb.addEventListener(ev,()=>{swimHeld=false;sb.classList.remove('on')});

// ---------- 진행
function update(dt){
  clock-=dt;
  if(!me.dead){let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+mv.x,y=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+mv.y;
    me.swim=(swimHeld||keys.ShiftLeft||keys.ShiftRight);move(me,x,y,dt);
    if(!MOBILE){const w=toWorld(mouse.x,mouse.y);me.ax=w.x-me.x;me.ay=w.y-me.y;me.aimLen=clamp(Math.hypot(me.ax,me.ay)/me.w.range,.2,1);if(mouse.down)fire(me,me.ax,me.ay)}
    else if(aim.on&&aim.len>.25){me.ax=aim.x;me.ay=aim.y;me.aimLen=clamp(aim.len,.2,1);fire(me,aim.x,aim.y)}}
  for(const u of units){if(u.dead){u.rt-=dt;if(u.rt<=0){u.dead=false;u.hp=PP.hp;u.ink=100;u.x=u.spawn.x;u.y=u.spawn.y}continue}
    u.cd=Math.max(0,u.cd-dt);u.hit=Math.max(0,u.hit-dt);u.calm+=dt;const p=paintAt(u.x,u.y);
    u.ink=Math.min(100,u.ink+(u.swim&&p===u.team+1?PP.swimRefill:PP.inkRefill*(u.cd>0?.2:1))*dt);
    if(u.calm>1.5&&u.hp<PP.hp)u.hp=Math.min(PP.hp,u.hp+PP.regen*dt*(u.swim?2:1));
    if(p&&p!==u.team+1)hurt(u,6*dt,null);
    if(!u.human)bot(u,dt)}
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];
    if(s.lob){s.t+=dt;if(s.t>=s.T){splat(s.tx,s.ty,s.small?.7:s.W.paint,s.team);for(const e of units)if(e.team!==s.team&&!e.dead&&Math.hypot(e.x-s.tx,e.y-s.ty)<(s.small?.8:s.W.paint)+R)hurt(e,s.small?s.W.dmg*.35:s.W.dmg,s.o);shots.splice(i,1)}continue}
    const st=Math.hypot(s.vx,s.vy)*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.left-=st;if(Math.random()<.35)splat(s.x,s.y,s.W.paint*.45,s.team);let gone=s.left<=0||solid(s.x,s.y);
    if(!gone)for(const e of units){if(e.team===s.team||e.dead)continue;if(Math.hypot(e.x-s.x,e.y-s.y)<R+.15){hurt(e,s.W.dmg,s.o);gone=true;break}}
    if(gone){splat(s.x-s.vx*dt*.5,s.y-s.vy*dt*.5,s.W.paint,s.team);shots.splice(i,1)}}
  for(let i=fx.length-1;i>=0;i--){fx[i].t-=dt;if(fx[i].t<=0)fx.splice(i,1)}
  if(Math.floor(time*4)!==update.k){update.k=Math.floor(time*4);const [a,b]=counts();setT($('gBlue'),Math.round(a)+'%');setT($('gRed'),Math.round(b)+'%')}
  const c=Math.max(0,clock);setT($('clock'),Math.floor(c/60)+':'+String(Math.floor(c%60)).padStart(2,'0'));setT($('count'),c<=10?'마지막 '+Math.ceil(c)+'초!':'');
  $('inkBar').querySelector('i').style.width=me.ink+'%';setT($('superBtn'),me.swim?'쏙!':'수영');
  if(clock<=0)end()}
function end(){state='over';const [a,b]=counts(),win=a>b;if(win){save.wins++;if(window.Arcade)Arcade.record('inkTurfWins',save.wins)}store();snd(win?'win':'lose');
  setT($('oTitle'),win?'우리 팀 승리!':a===b?'무승부':'아쉽게 졌어요');$('oTxt').textContent=`${TM[0].name} ${a.toFixed(1)}% : ${TM[1].name} ${b.toFixed(1)}%`;setTimeout(()=>{$('overOv').hidden=false;$('againBtn').focus()},900)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}

// ---------- 그리기
const cam={x:MW/2,y:MH/2};
function draw(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#1a2030';ctx.fillRect(0,0,Wd,Ht);
  const f=me&&state!=='title'?me:{x:MW/2,y:MH/2+Math.sin(time*.3)*6};cam.x+=(clamp(f.x,Wd/S/2-1,MW-Wd/S/2+1)-cam.x)*.15;cam.y+=(clamp(f.y,Ht/S/2-1.5,MH-Ht/S/2+1.5)-cam.y)*.15;if(Wd/S>MW+2)cam.x=MW/2;
  ctx.translate(Wd/2-cam.x*S,Ht/2-cam.y*S);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){if(map[y][x]==='#')continue;ctx.fillStyle=(x+y)%2?'#d8dce6':'#cfd4e0';ctx.fillRect(x*S,y*S,S+.5,S+.5)}
  const cs=S/PR;for(let py=0;py<PH;py++)for(let px=0;px<PW;px++){const v=paint[py*PW+px];if(!v)continue;ctx.fillStyle=TM[v-1].ink;ctx.fillRect(px*cs-.3,py*cs-.3,cs+.8,cs+.8)}
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){if(map[y][x]!=='#')continue;ctx.fillStyle='#5a6070';ctx.fillRect(x*S,y*S,S+.5,S+.5);ctx.fillStyle='#7a8090';ctx.fillRect(x*S,y*S-S*.22,S+.5,S*.8)}
  if(state==='play'&&me&&!me.dead&&(!MOBILE||aim.on)&&!me.swim){const a=Math.atan2(me.ay,me.ax);ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(me.x*S,me.y*S);const L=me.w.kind==='lob'?(me.aimLen||1)*me.w.range:me.w.kind==='roller'?me.w.flick:me.w.range;ctx.lineTo((me.x+Math.cos(a)*L)*S,(me.y+Math.sin(a)*L)*S);ctx.stroke();ctx.setLineDash([])}
  for(const u of units){if(u.dead)continue;const x=u.x*S,y=u.y*S,r=R*S*1.15,col=TM[u.team];
    if(u.swim&&paintAt(u.x,u.y)===u.team+1){if(u.team!==0&&Math.hypot(u.x-me.x,u.y-me.y)>2)continue;ctx.fillStyle=col.color;ctx.globalAlpha=.6;ctx.beginPath();ctx.ellipse(x,y,r*.9,r*.5,Math.atan2(u.vy,u.vx),0,7);ctx.fill();ctx.globalAlpha=1;continue}
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+r*.8,r,r*.4,0,0,7);ctx.fill();
    ctx.fillStyle=u.hit>0?'#fff':col.color;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
    const a=Math.atan2(u.ay,u.ax);ctx.fillStyle='#222';ctx.beginPath();ctx.ellipse(x+Math.cos(a)*r*.35,y+Math.sin(a)*r*.35,r*.65,r*.32,a+Math.PI/2,0,7);ctx.fill();
    ctx.fillStyle='#fff';for(const s of [-.5,.5]){ctx.beginPath();ctx.arc(x+Math.cos(a+s)*r*.4,y+Math.sin(a+s)*r*.4,r*.16,0,7);ctx.fill()}
    ctx.fillStyle=u.w.color;ctx.fillRect(x+Math.cos(a)*r*.9-r*.2,y+Math.sin(a)*r*.9-r*.2,r*.4,r*.4);
    const bw=S*.9;ctx.fillStyle='#222';ctx.fillRect(x-bw/2,y-r-11,bw,5);ctx.fillStyle=u.team?'#c08aff':'#ffc08a';ctx.fillRect(x-bw/2,y-r-11,bw*u.hp/PP.hp,5);
    if(u===me){ctx.font=`${Math.max(11,S*.3)}px Jua, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('나',x,y-r-14)}}
  for(const s of shots){ctx.fillStyle=TM[s.team].ink;if(s.lob){const k=s.t/s.T,x=s.x0+(s.tx-s.x0)*k,y=s.y0+(s.ty-s.y0)*k-Math.sin(k*Math.PI)*(s.small?.5:1.4);ctx.beginPath();ctx.arc(x*S,y*S,S*(s.small?.12:.24),0,7);ctx.fill()}else{ctx.beginPath();ctx.arc(s.x*S,s.y*S,S*.13,0,7);ctx.fill()}}
  for(const e of fx){ctx.fillStyle=e.c;ctx.globalAlpha=e.t*2;ctx.beginPath();ctx.arc(e.x*S,e.y*S,S*(1.4-e.t),0,7);ctx.fill();ctx.globalAlpha=1}
  if(me&&me.dead&&state==='play'){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,Wd,Ht);ctx.fillStyle='#fff';ctx.font='26px Jua, sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(me.rt)+'초 뒤에 다시 나와요',Wd/2,Ht/2)}}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused){time+=dt;if(state==='play')update(dt)}draw();requestAnimationFrame(frame)}
function toTitle(){state='title';paused=false;for(const id of ['pauseOv','overOv'])$(id).hidden=true;me=null;units=[];shots=[];
  setT($('tTro'),save.wins);const pk=$('picks');pk.innerHTML='';for(const w of D.weapons){const el=document.createElement('button');el.className='br'+(save.pick===w.id?' on':'');
    const i=document.createElement('i');i.style.setProperty('--c',w.color);const s=document.createElement('span');s.textContent=w.name;const sm=document.createElement('small');sm.textContent={shot:'멀리 쏘기',roller:'굴리며 칠하기',lob:'넓게 터뜨리기'}[w.kind];el.append(i,s,sm);
    el.onclick=()=>{save.pick=w.id;store();snd('select');toTitle()};pk.appendChild(el)}$('titleOv').hidden=false}
$('startBtn').onclick=()=>{snd('select');start()};$('againBtn').onclick=()=>{snd('select');start()};$('oMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__it={get me(){return me},get units(){return units},get state(){return state},start,counts,setBot:()=>{me.human=false}};
});
