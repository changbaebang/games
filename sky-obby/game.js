/* 하늘 점프맵 — 블록 장애물 코스. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches;
const SAVE='skyObby.save',PS=D.player;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const save=Object.assign({unlocked:1,best:{},stars:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

// ---------- three.js
const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});
renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());
renderer.shadowMap.enabled=true;
$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#9fd8ff');scene.fog=new THREE.Fog(0x9fd8ff,60,180);
const camera=new THREE.PerspectiveCamera(62,W()/H(),.1,400);
scene.add(new THREE.HemisphereLight(0xffffff,0x8fb0d0,.85));
const sun=new THREE.DirectionalLight(0xffffff,.7);sun.castShadow=true;sun.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);
Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:120});scene.add(sun);if(sun.target)scene.add(sun.target);
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?75:62;camera.updateProjectionMatrix();renderer.setSize(W(),H())}
addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1),mc={};
const lam=c=>mc[c]||(mc[c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
function cube(m,w,h,d,x,y,z,par){const k=new THREE.Mesh(BOX,m);k.scale.set(w,h,d);k.position.set(x,y,z);k.castShadow=true;k.receiveShadow=true;(par||world).add(k);return k}
// 구름
const clouds=new THREE.Group();scene.add(clouds);
for(let i=0;i<40;i++){const g=new THREE.Group(),x=(Math.random()-.5)*300,z=(Math.random()-.2)*400,y=-25+Math.random()*60;
  for(let j=0;j<3;j++){const c=new THREE.Mesh(BOX,lam('#ffffff'));c.scale.set(10+Math.random()*12,4+Math.random()*3,8+Math.random()*8);c.position.set(j*7-7,Math.random()*2,Math.random()*4);g.add(c)}
  g.position.set(x,y,z);clouds.add(g)}

// ---------- 코스 만들기
let world=null,blocks=[],starsArr=[],stage=0,cur,lowest=0,colI=0,check=null,goalB=null;
function col(){return D.colors[(colI++)%D.colors.length]}
function add(type,x,top,z,w,h,d,extra){
  const b=Object.assign({type,x,y:top,z,w,h,d,active:true,t:0,ox:x,oy:top,oz:z},extra||{});
  const c=type==='check'?'#3ccf6e':type==='goal'?'#ffcc33':type==='lava'||type==='bar'?'#ff4a1c':type==='bounce'?'#ff6bc1':type==='vanish'?'#d8e6ff':b.col||col();
  b.mesh=cube(lam(c),w,h,d,x,top-h/2,z);if(type==='lava'||type==='bar'){b.mesh.material=new THREE.MeshBasicMaterial({color:new THREE.Color(c)})}
  if(type==='vanish'){b.mesh.material=new THREE.MeshLambertMaterial({color:new THREE.Color(c),transparent:true,opacity:1})}
  blocks.push(b);lowest=Math.min(lowest,top-h);return b}
function place(gap,w,h,d,dx,dy,type,extra){const z=cur.z+gap+d/2;cur.x+=dx;cur.y+=dy;const b=add(type||'solid',cur.x,cur.y,z,w,h,d,extra);cur.z=z+d/2;return b}
const SEC={
  start(){add('solid',0,0,0,8,1,8,{col:'#8fd16a'});cur={x:0,y:0,z:4}},
  steps(n){for(let i=0;i<n;i++)place(2.2,2.6,1,2.6,i%2?1.3:-1.3,.8)},
  gap(n,g){for(let i=0;i<n;i++)place(g||3,3,1,3,i%2?1.2:-1.2,0)},
  narrow(n){for(let i=0;i<n;i++)place(1.6,.9,.8,6,i%2?1.6:-1.6,0)},
  move(n){for(let i=0;i<n;i++){const b=place(2.6,3,.6,3,0,0,'solid');b.mx=3.5;b.per=3.4;b.ph=i*1.3}place(2.4,4,1,4,0,0)},
  lift(n){for(let i=0;i<n;i++){const b=place(2.4,3,.6,3,0,0,'solid');b.my=4;b.per=4.2;b.ph=i*Math.PI;b.oy-=1;cur.y+=2.5}place(2.2,4,1,4,0,.5)},
  vanish(n){for(let i=0;i<n;i++)place(1.8,2.6,.6,2.6,i%2?1:-1,0,'vanish')},
  lava(n){const z0=cur.z;for(let i=0;i<n;i++)place(1.9,1.7,1,1.7,i%2?1.8:-1.8,0);add('lava',0,cur.y-.7,(z0+cur.z)/2,9,.4,cur.z-z0+1);place(1.6,4,1,4,-cur.x,0)},
  bars(n){const len=n*6+5,b=place(.8,6,1,len,-cur.x,0);for(let i=0;i<n;i++)add('bar',b.x,b.y+.5,b.z-len/2+6+i*6,6,.5,.5)},
  spinner(){const b=place(1.6,11,1,11,-cur.x,0);b.spin={len:5.2,speed:1.15,y:b.y+.6};b.bar=cube(new THREE.MeshBasicMaterial({color:new THREE.Color('#ff4a1c')}),10.4,.5,.5,b.x,b.y+.6,b.z);
    cube(lam('#555'),.8,1.2,.8,b.x,b.y+.6,b.z)},
  bounce(){place(1.8,3,.5,3,0,0,'bounce');place(2,4,1,4,0,5.5)},
  tower(n){for(let i=0;i<n;i++)place(.6,2.4,1,2.4,i%2?2.6:-2.6,1.4)},
  check(){check=check;place(2,5,1,5,-cur.x*.5,0,'check')},
  goal(){goalB=place(2.2,6,1,6,-cur.x*.5,0,'goal');const f=cube(lam('#ffffff'),.2,4,.2,goalB.x+2,goalB.y+2,goalB.z);cube(lam('#ff4a6a'),.1,1.2,1.8,goalB.x+2,goalB.y+3.4,goalB.z+.9)}
};
function buildStage(i){
  if(world){scene.remove(world)}world=new THREE.Group();scene.add(world);blocks=[];starsArr=[];colI=i*3;lowest=0;
  const S=D.stages[i];scene.background=new THREE.Color(S.sky);scene.fog.color=new THREE.Color(S.sky);
  for(const [k,...a] of S.sections)SEC[k](...a);
  // 별 3개: 코스 25%·55%·85% 쯤 블록 위
  const plain=blocks.filter(b=>b.type==='solid'||b.type==='vanish');
  for(const f of [.25,.55,.85]){const b=plain[Math.floor(f*(plain.length-1))];if(!b)continue;
    const m=new THREE.Mesh(BOX,new THREE.MeshLambertMaterial({color:new THREE.Color('#ffd23f'),emissive:new THREE.Color('#7a5a00')}));m.scale.set(.7,.7,.7);m.rotation.z=Math.PI/4;world.add(m);
    starsArr.push({b,m,got:false})}
}

// ---------- 캐릭터
function limb(w,h,d,c,x,y){const p=new THREE.Group();p.position.set(x,y,0);const m=cube(lam(c),w,h,d,0,-h/2,0,p);return p}
function makeChar(){const g=new THREE.Group(),b=new THREE.Group();g.add(b);g.scale.setScalar(.65);
  const legL=limb(.48,1,.5,'#3a9a48',-.26,1),legR=limb(.48,1,.5,'#3a9a48',.26,1);cube(lam('#ff6b6b'),1.04,1.05,.55,0,1.52,0,b);
  const armL=limb(.46,1,.48,'#ffd23f',-.76,2.02),armR=limb(.46,1,.48,'#ffd23f',.76,2.02);cube(lam('#ffd23f'),.82,.82,.82,0,2.47,0,b);
  for(const sx of [-.18,.18])cube(lam('#111'),.13,.15,.04,sx,2.56,.42,b);cube(lam('#111'),.34,.07,.04,0,2.33,.42,b);
  b.add(legL,legR,armL,armR);scene.add(g);return {g,b,legL,legR,armL,armR}}
const P=makeChar();
const pl={x:0,y:0,z:0,vx:0,vy:0,vz:0,face:0,ground:null,coyote:0,buf:0,phase:0,R:.38,HT:1.8};
let state='title',paused=false,t0=0,elapsed=0,deaths=0,got=0,yaw=Math.PI,pitch=.45,dist=10,time=0,respawn={x:0,y:0,z:0};

// ---------- 입력
const keys={},joy={x:0,y:0};
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)pl.buf=.15}if(e.code==='KeyR'&&state==='play')die(true)});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
const cv=renderer.domElement,jb=$('joy'),kn=$('knob');let jid=null,jo={x:0,y:0},drag=null;
function joyMove(e){let x=e.clientX-jo.x,y=e.clientY-jo.y;const l=Math.hypot(x,y),mx=50;if(l>mx){x*=mx/l;y*=mx/l}kn.style.transform=`translate(${x}px,${y}px)`;joy.x=x/mx;joy.y=y/mx}
function joyEnd(){jid=null;joy.x=joy.y=0;kn.style.transform='';jb.classList.remove('on');jb.style.left=jb.style.top=''}
cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'&&jid===null&&e.clientX<innerWidth*.5&&e.clientY>innerHeight*.3){jid=e.pointerId;jo={x:e.clientX,y:e.clientY};jb.style.left=e.clientX+'px';jb.style.top=e.clientY+'px';jb.classList.add('on');cv.setPointerCapture(e.pointerId);joyMove(e);return}
  if(drag)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(e.pointerId===jid){joyMove(e);return}if(!drag||drag.id!==e.pointerId)return;
  const k=e.pointerType==='touch'?.009:.006;yaw-=(e.clientX-drag.x)*k;pitch=Math.max(.1,Math.min(1.2,pitch+(e.clientY-drag.y)*k*.7));drag.x=e.clientX;drag.y=e.clientY});
const pEnd=e=>{if(e.pointerId===jid){joyEnd();return}if(drag&&drag.id===e.pointerId)drag=null};
cv.addEventListener('pointerup',pEnd);cv.addEventListener('pointercancel',pEnd);
cv.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(6,Math.min(18,dist+e.deltaY*.01))},{passive:false});
const tj=$('tJump');tj.addEventListener('pointerdown',e=>{e.preventDefault();pl.buf=.15;tj.classList.add('on')});
for(const ev of ['pointerup','pointercancel'])tj.addEventListener(ev,()=>tj.classList.remove('on'));

// ---------- 물리
const solidNow=b=>b.active&&b.type!=='lava'&&b.type!=='bar';
const overlapXZ=(b,x,z,r)=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r;
function blockAt(x,y,z,r){for(const b of blocks){if(!solidNow(b))continue;if(overlapXZ(b,x,z,r)&&y<b.y-.02&&y+pl.HT>b.y-b.h)return b}return null}
function updateBlocks(dt){
  for(const b of blocks){const px=b.x,py=b.y;
    if(b.mx)b.x=b.ox+Math.sin(time*2*Math.PI/b.per+b.ph)*b.mx;
    if(b.my)b.y=b.oy+(.5-.5*Math.cos(time*2*Math.PI/b.per+b.ph))*b.my;
    b.dx=b.x-px;b.dy=b.y-py;if(b.dx||b.dy)b.mesh.position.set(b.x,b.y-b.h/2,b.z);
    if(b.type==='vanish'){if(b.t>0){b.t-=dt;if(b.t<=0){if(b.active){b.active=false;b.t=2.6;b.mesh.visible=false;snd('pop')}else{b.active=true;b.mesh.visible=true;b.mesh.material.opacity=1}}
        else if(b.active)b.mesh.material.opacity=.4+.6*Math.abs(Math.sin(b.t*14))}}
    if(b.spin){b.bar.rotation.y=time*b.spin.speed}
  }
}
function die(manual){if(state!=='play')return;deaths++;snd(manual?'whoosh':'hurt');const f=$('fade');f.style.opacity=.7;setTimeout(()=>f.style.opacity=0,200);
  pl.x=respawn.x;pl.y=respawn.y;pl.z=respawn.z;pl.vx=pl.vy=pl.vz=0;pl.ground=null}
function updatePlayer(dt){
  const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=-fz,rz=fx;
  let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x;
  if(keys.ArrowLeft)yaw+=1.8*dt;if(keys.ArrowRight)yaw-=1.8*dt;
  let mx=fx*f+rx*s,mz=fz*f+rz*s;const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  const acc=pl.ground?40:22,tvx=mx*PS.speed,tvz=mz*PS.speed;
  pl.vx+=Math.max(-acc*dt,Math.min(acc*dt,tvx-pl.vx));pl.vz+=Math.max(-acc*dt,Math.min(acc*dt,tvz-pl.vz));
  if(ml>.1)pl.face=Math.atan2(mx,mz);
  // 발판이 움직이면 같이 이동
  if(pl.ground&&(pl.ground.dx||pl.ground.dy)){pl.x+=pl.ground.dx;pl.z+=0;pl.y+=pl.ground.dy}
  pl.coyote=pl.ground?.12:pl.coyote-dt;pl.buf-=dt;
  if(pl.buf>0&&pl.coyote>0){pl.vy=PS.jump;pl.coyote=0;pl.buf=0;pl.ground=null;snd('jump')}
  pl.vy-=PS.gravity*dt;
  const r=pl.R;
  // x, z 축 따로 부딪힘 처리
  pl.x+=pl.vx*dt;let b=blockAt(pl.x,pl.y,pl.z,r);if(b){pl.x=pl.vx>0?b.x-b.w/2-r:b.x+b.w/2+r;pl.vx=0}
  pl.z+=pl.vz*dt;b=blockAt(pl.x,pl.y,pl.z,r);if(b){pl.z=pl.vz>0?b.z-b.d/2-r:b.z+b.d/2+r;pl.vz=0}
  const py=pl.y;pl.y+=pl.vy*dt;pl.ground=null;
  for(const q of blocks){if(!solidNow(q)||!overlapXZ(q,pl.x,pl.z,r-.05))continue;
    if(pl.vy<=0&&py>=q.y-.25&&pl.y<=q.y){pl.y=q.y;pl.vy=0;pl.ground=q;pl.lastGround=q}
    else if(pl.vy>0&&py+pl.HT<=q.y-q.h+.05&&pl.y+pl.HT>q.y-q.h){pl.y=q.y-q.h-pl.HT;pl.vy=0}}
  const g=pl.ground;
  if(g){if(g.type==='bounce'){pl.vy=PS.bounce;pl.ground=null;snd('bounce',2)}
    else if(g.type==='vanish'&&g.t<=0&&g.active)g.t=.7;
    else if(g.type==='check'&&(respawn.b!==g)){respawn={x:g.x,y:g.y,z:g.z,b:g};toast('체크포인트!');snd('coin')}
    else if(g.type==='goal'&&state==='play')clear()}
  // 용암
  for(const q of blocks){if(q.type!=='lava'&&q.type!=='bar')continue;if(overlapXZ(q,pl.x,pl.z,r-.1)&&pl.y<q.y+.05&&pl.y+pl.HT>q.y-q.h){die();return}}
  for(const q of blocks){if(!q.spin)continue;if(Math.abs(pl.y-(q.spin.y-.3))>.9)continue;
    const a=time*q.spin.speed,ux=Math.cos(a),uz=-Math.sin(a),dx=pl.x-q.x,dz=pl.z-q.z,t=Math.max(-q.spin.len,Math.min(q.spin.len,dx*ux+dz*uz));
    if(Math.hypot(dx-ux*t,dz-uz*t)<.25+r){die();return}}
  if(pl.y<lowest-14){die();return}
  // 별
  for(const s of starsArr){if(s.got)continue;const sx=s.b.x,sy=s.b.y+1.4,sz=s.b.z;s.m.position.set(sx,sy+Math.sin(time*3)*.15,sz);s.m.rotation.y+=dt*2;
    if(Math.hypot(pl.x-sx,pl.z-sz)<1.1&&Math.abs(pl.y+.9-sy)<1.4){s.got=true;s.m.visible=false;got++;snd('power');toast('별 '+got+'/3')}}
  // 모양
  P.g.position.set(pl.x,pl.y,pl.z);let d=pl.face-P.g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));P.g.rotation.y+=d*Math.min(1,dt*15);
  const sp=Math.hypot(pl.vx,pl.vz);pl.phase+=dt*sp*2.4;const w=pl.ground&&sp>.5?Math.sin(pl.phase):0;
  P.legL.rotation.x=w*.8;P.legR.rotation.x=-w*.8;P.armL.rotation.x=pl.ground?-w*.7:-2.6;P.armR.rotation.x=pl.ground?w*.7:-2.6;
}
let toastT=null;function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}

// ---------- 흐름
function start(i){
  stage=i;buildStage(i);const s=blocks[0];respawn={x:s.x,y:s.y,z:s.z,b:s};
  Object.assign(pl,{x:s.x,y:s.y,z:s.z-1,vx:0,vy:0,vz:0,ground:null,face:0});yaw=0;deaths=0;got=0;elapsed=0;
  for(const id of ['titleOv','pauseOv','clearOv'])$(id).hidden=true;paused=false;state='play';
  setT($('stName'),(i+1)+'. '+D.stages[i].name);toast((i+1)+'단계 · '+D.stages[i].name);snd('go');
}
function clear(){
  state='clear';snd('win');const t=elapsed,i=stage;
  if(!save.best[i]||t<save.best[i])save.best[i]=t;save.stars[i]=Math.max(save.stars[i]||0,got);
  if(i+2>save.unlocked)save.unlocked=Math.min(D.stages.length,i+2);store();
  if(window.Arcade)Arcade.record('skyObbyStages',Object.keys(save.best).length);
  setT($('clrTitle'),i===D.stages.length-1?'하늘 끝 정복!':'도착!');setT($('clrStars'),'★'.repeat(got)+'☆'.repeat(3-got));
  $('clrTxt').textContent=`${t.toFixed(1)}초 · 넘어짐 ${deaths}번`+(save.best[i]===t?' · 최고 기록!':'');
  $('nextBtn').hidden=i+1>=D.stages.length;
  setTimeout(()=>{$('clearOv').hidden=false;$('nextBtn').hidden||$('nextBtn').focus()},900);
}
function toTitle(){state='title';paused=false;for(const id of ['pauseOv','clearOv'])$(id).hidden=true;
  const box=$('stageList');box.innerHTML='';
  D.stages.forEach((S,i)=>{const b=document.createElement('button');b.className='stage';b.style.setProperty('--c',D.colors[i%D.colors.length]);const lock=i>=save.unlocked;b.disabled=lock;
    const nb=document.createElement('b'),ni=document.createElement('i');nb.textContent=(i+1)+'. '+S.name;
    ni.textContent=lock?'잠김':save.best[i]?'★'.repeat(save.stars[i]||0)+'☆'.repeat(3-(save.stars[i]||0))+' '+save.best[i].toFixed(1)+'초':'도전!';b.append(nb,ni);
    b.onclick=()=>{if(lock)return;snd('select');start(i)};box.appendChild(b)});
  $('titleOv').hidden=false;if(!world)buildStage(Math.min(save.unlocked-1,D.stages.length-1))}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on;if(on){for(const k in keys)keys[k]=false;$('resumeBtn').focus()}}
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};
$('checkBtn').onclick=()=>{setPause(false);die(true)};$('restartBtn').onclick=()=>{snd('click');start(stage)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
$('nextBtn').onclick=()=>{snd('click');start(stage+1)};$('againBtn').onclick=()=>{snd('click');start(stage)};$('clrQuit').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});

// ---------- 매 프레임
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(!paused){time+=dt;updateBlocks(dt);
    if(state==='play'){elapsed+=dt;updatePlayer(dt);setT($('time'),elapsed.toFixed(1));setT($('deaths'),deaths);setT($('stars'),got+'/3')}
    else if(state==='title')yaw+=dt*.15;
    clouds.rotation.y+=dt*.004}
  const p=state==='title'?{x:0,y:0,z:0}:pl,cp=Math.cos(pitch),dd=state==='title'?26:dist;
  if(state==='play'&&!drag&&jid!==null&&joy.y<-.5&&Math.abs(joy.x)<.6){let d=pl.face-yaw;d=Math.atan2(Math.sin(d),Math.cos(d));yaw+=d*dt*1.2}
  camera.position.set(p.x-Math.sin(yaw)*cp*dd,p.y+1.5+Math.sin(pitch)*dd,p.z-Math.cos(yaw)*cp*dd);camera.lookAt(p.x,p.y+1.2,p.z);
  sun.position.set(p.x+20,p.y+40,p.z+10);if(sun.target)sun.target.position.set(p.x,p.y,p.z);
  renderer.render(scene,camera);requestAnimationFrame(frame)}
toTitle();requestAnimationFrame(frame);
window.__so={pl,get blocks(){return blocks},get state(){return state},start,keys,get deaths(){return deaths},get got(){return got},set yaw(v){yaw=v},get yaw(){return yaw},get respawn(){return respawn},save};
});
