/* 철길 질주 — 3줄 철길 끝없이 달리기. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches;
const SAVE='railDash.save',PL=D.player,LX=D.lanes,TOP=D.trainTop;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const save=Object.assign({best:0,coins:0,up:{},mult:1,mi:0,mdone:[0,0,0],mprog:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

// ---------- three.js
const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});
renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());
$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#8fd0ff');scene.fog=new THREE.Fog(0x8fd0ff,50,150);
const camera=new THREE.PerspectiveCamera(62,W()/H(),.1,300);
scene.add(new THREE.HemisphereLight(0xffffff,0x8a9a7a,.9));const sun=new THREE.DirectionalLight(0xffffff,.6);sun.position.set(-20,40,-10);scene.add(sun);
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?78:62;camera.updateProjectionMatrix();renderer.setSize(W(),H())}
addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1),mc={};
const lam=c=>mc['l'+c]||(mc['l'+c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
const basic=c=>mc['b'+c]||(mc['b'+c]=new THREE.MeshBasicMaterial({color:new THREE.Color(c)}));
function cube(m,w,h,d,x,y,z,par){const k=new THREE.Mesh(BOX,m);k.scale.set(w,h,d);k.position.set(x,y,z);(par||scene).add(k);return k}
function tex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
const railTex=tex(256,64,(g)=>{g.fillStyle='#8a7f72';g.fillRect(0,0,256,64);for(let i=0;i<300;i++){g.fillStyle=Math.random()<.5?'#7a7064':'#9a8f80';g.fillRect(Math.random()*256,Math.random()*64,3,3)}
  for(const c of [42,128,214]){g.fillStyle='#6a4a32';for(let y=4;y<64;y+=16)g.fillRect(c-30,y,60,7);g.fillStyle='#c8ccd4';g.fillRect(c-20,0,4,64);g.fillRect(c+16,0,4,64)}});
railTex.repeat.set(1,12);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(9,200),new THREE.MeshLambertMaterial({map:railTex}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const grass=new THREE.Mesh(new THREE.PlaneGeometry(200,200),lam('#7cc85a'));grass.rotation.x=-Math.PI/2;grass.position.y=-.02;scene.add(grass);
const stripeTex=tex(64,16,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#ff4a2a';g.fillRect(i*8,0,8,16)}});
const winTex=tex(64,16,(g)=>{g.fillStyle='#2a3a5a';g.fillRect(0,0,64,16);g.fillStyle='#bfe6ff';for(let x=3;x<64;x+=10)g.fillRect(x,4,7,8)});
// 옆 건물
const props=[];for(let i=0;i<34;i++){const side=i%2?1:-1,h=rand(4,14),w=rand(4,7);const m=cube(lam(pick(['#ffb38a','#ffe08a','#9ad0ff','#c9a8ff','#a8e6a0','#f4f4f4'])),w,h,rand(5,9),side*rand(9,14),h/2,i*6);props.push({m,side})}

// ---------- 캐릭터
function limb(w,h,d,c,x,y){const p=new THREE.Group();p.position.set(x,y,0);cube(lam(c),w,h,d,0,-h/2,0,p);return p}
function makeChar(o){const g=new THREE.Group(),b=new THREE.Group();g.add(b);g.scale.setScalar(.62);
  const legL=limb(.48,1,.5,o.leg,-.26,1),legR=limb(.48,1,.5,o.leg,.26,1);cube(lam(o.torso),1.04,1.05,.55,0,1.52,0,b);
  const armL=limb(.46,1,.48,o.arm,-.76,2.02),armR=limb(.46,1,.48,o.arm,.76,2.02);cube(lam(o.head),.82,.82,.82,0,2.47,0,b);
  if(o.cap){cube(lam(o.cap),.9,.25,.9,0,2.95,0,b);cube(lam(o.cap),.9,.1,.5,0,2.85,.55,b)}
  for(const sx of [-.18,.18])cube(lam(o.eye||'#111'),.13,.15,.04,sx,2.56,-.42,b);
  b.add(legL,legR,armL,armR);scene.add(g);return {g,b,legL,legR,armL,armR}}
const P=makeChar({head:'#ffd23f',torso:'#2f8cff',arm:'#ffd23f',leg:'#3a3a5a',cap:'#ff4a2a'});P.g.rotation.y=Math.PI;
const BOT=makeChar({head:'#a0a8b8',torso:'#6a7488',arm:'#a0a8b8',leg:'#4a5060',eye:'#ff3030'});BOT.g.rotation.y=Math.PI;BOT.g.visible=false;
const jetM=cube(lam('#ffb020'),.6,.9,.4,0,1.1,.35,P.g);jetM.visible=false;

// ---------- 상태
let state='title',paused=false,time=0,speed=0,score=0,coins=0,dist=0,nextZ=0,objs=[],run={};
const pl={lane:1,x:0,y:0,z:0,vy:0,slideT:0,ground:0,stumbleT:0,inv:0,phase:0};
const pw={magnet:0,jet:0,shoes:0,double:0};
const PWR=id=>D.powers.find(p=>p.id===id);
const pwTime=id=>{const p=PWR(id);return p.time+p.perLevel*((save.up[id]||1)-1)};

// ---------- 구간 만들기
function mkTrain(lane,z,len,moving){const x=LX[lane],g=new THREE.Group();scene.add(g);g.position.set(x,0,z+len/2);
  const col=pick(['#ff5a5a','#2f8cff','#ffb020','#33b86a','#9b6bff']);cube(lam(col),2.3,3.0,len,0,1.7,0,g);cube(lam('#e8ecf2'),2.35,.3,len,0,3.25,0,g);
  const w=new THREE.MeshBasicMaterial({map:winTex.clone()});w.map.needsUpdate=true;w.map.repeat.set(len/6,1);
  cube(w,2.36,.8,len*.92,0,2.2,0,g);cube(lam('#333a48'),2.2,.5,len,0,.25,0,g);
  cube(basic(moving?'#fff6b0':'#cfd6e0'),.4,.3,.1,-.6,1.2,-len/2-.05,g);cube(basic(moving?'#fff6b0':'#cfd6e0'),.4,.3,.1,.6,1.2,-len/2-.05,g);
  return {type:'train',lane,x,z0:z,z1:z+len,len,v:moving?9:0,m:g}}
function addChunk(){
  const tier=Math.max(0,Math.min(2,Math.floor((speed-D.speed.start)/5))),pool=D.chunks.filter(c=>c.tier<=tier),C=pick(pool),z0=nextZ;
  for(const [t,lane,dz,ex] of C.items){const z=z0+dz,x=LX[lane];
    if(t==='train')objs.push(mkTrain(lane,z,ex||16,false));
    else if(t==='move')objs.push(mkTrain(lane,z,ex||14,true));
    else if(t==='ramp'){const len=ex||20;const r=new THREE.Mesh(BOX,lam('#8a8f9a'));const L=6,ang=Math.atan(TOP/L);r.scale.set(2.2,.3,Math.hypot(L,TOP));r.position.set(x,TOP/2,z+L/2);r.rotation.x=-ang;scene.add(r);
      objs.push({type:'slope',lane,x,z0:z,z1:z+L,m:r});objs.push(mkTrain(lane,z+L,len,false));
      for(let i=0;i<Math.floor(len/2.4);i++)objs.push(coin(x,TOP+1,z+L+1.5+i*2.4))}
    else if(t==='low'){const g=new THREE.Group();scene.add(g);g.position.set(x,0,z);const s=new THREE.MeshLambertMaterial({map:stripeTex});cube(s,2.3,.45,.3,0,.75,0,g);cube(lam('#ddd'),.15,.9,.15,-1,.45,0,g);cube(lam('#ddd'),.15,.9,.15,1,.45,0,g);objs.push({type:'low',lane,x,z0:z-.35,z1:z+.35,m:g})}
    else if(t==='high'){const g=new THREE.Group();scene.add(g);g.position.set(x,0,z);const s=new THREE.MeshLambertMaterial({map:stripeTex});cube(s,2.4,.6,.35,0,1.9,0,g);cube(lam('#555'),.2,2.3,.2,-1.15,1.1,0,g);cube(lam('#555'),.2,2.3,.2,1.15,1.1,0,g);objs.push({type:'high',lane,x,z0:z-.35,z1:z+.35,m:g})}
    else if(t==='coins'){for(let i=0;i<(ex||6);i++){const cz=z+i*2.2;objs.push(coin(x,surfaceAt(x,cz)+1,cz))}}
    else if(t==='arc'){for(let i=0;i<7;i++){const cz=z-6+i*2;objs.push(coin(x,1+2.3*Math.sin(i/6*Math.PI),cz))}}
    else if(t==='power'){const id=pick(D.powers).id,m=cube(lam(PWR(id).color),.9,.9,.9,x,1.3,z);objs.push({type:'power',id,x,lane,z0:z-.5,z1:z+.5,y:1.3,m})}
  }
  nextZ+=40;
}
function coin(x,y,z){const m=cube(mc.coin||(mc.coin=new THREE.MeshLambertMaterial({color:new THREE.Color('#ffd23f'),emissive:new THREE.Color('#6a4a00')})),.6,.6,.14,x,y,z);return {type:'coin',x,y,z0:z-.3,z1:z+.3,m}}
function surfaceAt(x,z){let g=0;for(const o of objs){if(Math.abs(o.x-x)>1.2||z<o.z0||z>o.z1)continue;if(o.type==='train')g=Math.max(g,TOP);else if(o.type==='slope')g=Math.max(g,TOP*(z-o.z0)/(o.z1-o.z0))}return g}

// ---------- 입력
let sw=null;
function act(a){if(state!=='play'||paused)return;
  if(a==='L'&&pl.lane>0){pl.prevLane=pl.lane;pl.lane--;snd('swap')}else if(a==='R'&&pl.lane<2){pl.prevLane=pl.lane;pl.lane++;snd('swap')}
  else if(a==='U'){if(pl.y<=pl.ground+.05&&pw.jet<=0){pl.vy=pw.shoes>0?PL.sneakerJump:PL.jump;pl.slideT=0;run.jump++;snd(pw.shoes>0?'jump2':'jump')}}
  else if(a==='D'){if(pw.jet>0)return;pl.slideT=PL.slide;if(pl.y>pl.ground+.1)pl.vy=-22;run.slide++;snd('whoosh')}}
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}if(e.repeat)return;
  const m={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',Space:'U',ArrowDown:'D',KeyS:'D'}[e.code];if(m){e.preventDefault();act(m)}});
const cv=renderer.domElement;
cv.addEventListener('pointerdown',e=>{sw={x:e.clientX,y:e.clientY,done:false,id:e.pointerId};try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!sw||sw.done||sw.id!==e.pointerId)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.hypot(dx,dy)<28)return;sw.done=true;
  act(Math.abs(dx)>Math.abs(dy)?(dx<0?'L':'R'):(dy<0?'U':'D'));$('swipeHint').style.opacity=0});
cv.addEventListener('pointerup',e=>{if(sw&&!sw.done&&sw.id===e.pointerId&&state==='play'&&MOBILE)act('U');sw=null});
cv.addEventListener('pointercancel',()=>sw=null);

// ---------- 흐름
function clearWorld(){for(const o of objs)scene.remove(o.m);objs=[]}
function start(){clearWorld();Object.assign(pl,{lane:1,x:0,y:0,z:0,vy:0,slideT:0,ground:0,stumbleT:0,inv:0,prevLane:1});for(const k in pw)pw[k]=0;
  speed=D.speed.start;score=0;coins=0;dist=0;nextZ=30;run={jump:0,slide:0,power:0,train:0,onTrain:false};
  while(nextZ<160)addChunk();for(const id of ['titleOv','overOv','pauseOv','shopOv'])$(id).hidden=true;state='play';paused=false;BOT.g.visible=false;snd('go');
  $('swipeHint').style.opacity=1;setTimeout(()=>$('swipeHint').style.opacity=0,3500)}
function crash(why){if(state!=='play')return;state='over';snd('boom');flash();
  P.b.rotation.x=-1.2;const total=Math.floor(score);save.coins+=coins;const best=total>save.best;if(best)save.best=total;
  updateMissions(true);store();if(window.Arcade){Arcade.record('railDashBest',save.best)}
  setT($('overTitle'),why==='caught'?'붙잡혔어요!':'쾅!');setT($('oScore'),total.toLocaleString());
  $('oTxt').textContent=`${Math.floor(dist)}m 달렸어요 · 동전 +${coins}`+(best?' · 최고 기록!':'');
  renderMissions($('oMissions'));setTimeout(()=>{$('overOv').hidden=false;$('againBtn').focus()},900)}
function flash(){const f=$('flash');f.style.opacity=.7;setTimeout(()=>f.style.opacity=0,150)}
function toast(t,c){const el=$('toast');el.textContent=t;el.style.color=c||'#fff';el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on;if(on){renderMissions($('pMissions'));$('resumeBtn').focus()}}

// ---------- 미션
function mission(i){const k=save.mi+i,base=D.missions[k%D.missions.length],round=Math.floor(k/D.missions.length);return Object.assign({},base,{n:base.n*(1+round)})}
function mValue(m){if(m.type==='coins')return coins;if(m.type==='dist')return Math.floor(dist);return (save.mprog[m.type]||0)+(run[m.type]||0)}
function updateMissions(end){
  for(let i=0;i<3;i++){const m=mission(i);if(!save.mdone[i]&&mValue(m)>=m.n){save.mdone[i]=1;if(!end){toast('미션 완료! ★','#ffd23f');snd('level')}}}
  if(end){for(const k of ['jump','slide','power','train'])save.mprog[k]=(save.mprog[k]||0)+(run[k]||0);
    if(save.mdone.every(Boolean)){save.mult++;save.mi+=3;save.mdone=[0,0,0];save.mprog={};setTimeout(()=>toast('점수 배수 ×'+save.mult+'!','#ffd23f'),1000)}}}
function renderMissions(el){el.innerHTML='';for(let i=0;i<3;i++){const m=mission(i),li=document.createElement('li');li.textContent=`${m.text.replace(/\d+/,m.n)} (${Math.min(m.n,mValue(m))}/${m.n})`;if(save.mdone[i])li.className='done';el.appendChild(li)}}

// ---------- 매 프레임
function update(dt){
  speed=Math.min(D.speed.max,speed+D.speed.accel*dt);const v=speed;
  const pz=pl.z;pl.z+=v*dt;dist=pl.z;
  // 줄 이동
  const tx=LX[pl.lane];const px=pl.x;pl.x+=(tx-pl.x)*Math.min(1,dt*14);
  // 제트팩
  if(pw.jet>0){pl.y+=(8-pl.y)*Math.min(1,dt*4);pl.vy=0;if(Math.random()<dt*6)objs.push(coin(LX[Math.floor(Math.random()*3)],8,pl.z+60))}
  else{pl.vy-=PL.gravity*dt;pl.y+=pl.vy*dt}
  const gnd=surfaceAt(pl.x,pl.z);
  if(pw.jet<=0){if(pl.y<=gnd&&(pl.y>=gnd-.6||gnd<TOP)){pl.y=gnd;pl.vy=0}}
  if(gnd>=TOP-.01&&pl.y>=TOP-.01&&!run.onTrain){run.onTrain=true;run.train++}if(gnd<TOP-.5)run.onTrain=false;
  pl.ground=gnd;pl.slideT=Math.max(0,pl.slideT-dt);pl.inv=Math.max(0,pl.inv-dt);pl.stumbleT=Math.max(0,pl.stumbleT-dt);
  for(const k in pw)if(pw[k]>0){pw[k]-=dt;if(pw[k]<=0&&k==='jet')pl.inv=1.2}
  const mult=save.mult*(pw.double>0?2:1);score+=v*dt*mult*.5;
  // 물체
  const hTop=pl.slideT>0?1:1.75;
  for(let i=objs.length-1;i>=0;i--){const o=objs[i];
    if(o.v){o.z0-=o.v*dt;o.z1-=o.v*dt;o.m.position.z-=o.v*dt}
    if(o.z1<pl.z-15){scene.remove(o.m);objs.splice(i,1);continue}
    if(o.type==='coin'){o.m.rotation.y+=dt*4;
      if(pw.magnet>0&&o.z0-pl.z<14&&o.z0-pl.z>-2){o.m.position.x+=(pl.x-o.m.position.x)*Math.min(1,dt*8);o.m.position.y+=(pl.y+1-o.m.position.y)*Math.min(1,dt*8);o.m.position.z+=(pl.z-o.m.position.z)*Math.min(1,dt*6);o.x=o.m.position.x;o.y=o.m.position.y;o.z0=o.m.position.z-.3;o.z1=o.m.position.z+.3}
      if(Math.abs(o.x-pl.x)<1&&o.z1>=pl.z-.6&&o.z0<=pl.z+.6&&Math.abs(o.y-(pl.y+.9))<1.3){coins++;score+=10*mult;scene.remove(o.m);objs.splice(i,1);snd('coin')}
      continue}
    if(o.type==='power'){o.m.rotation.y+=dt*2;if(Math.abs(o.x-pl.x)<1.1&&o.z1>=pl.z-.6&&o.z0<=pl.z+.6&&Math.abs(o.y-(pl.y+.9))<1.4){pw[o.id]=pwTime(o.id);run.power++;toast(PWR(o.id).name+'!',PWR(o.id).color);snd('power');scene.remove(o.m);objs.splice(i,1)}continue}
    if(o.type==='slope'||pw.jet>0||pl.inv>0)continue;
    if(Math.abs(o.x-pl.x)>1.35||pl.z+.4<o.z0||pl.z-.4>o.z1)continue;
    if(o.type==='train'){if(pl.y>=TOP-.6)continue;
      const wasBeside=pz-.4<=o.z1&&pz+.4>=o.z0&&Math.abs(o.x-px)>1.2;
      if(wasBeside||Math.abs(o.x-pl.x)>.9){stumble();continue}crash();return}
    if(o.type==='low'&&pl.y<1.0){if(Math.abs(o.x-pl.x)>.9){stumble();continue}crash();return}
    if(o.type==='high'&&pl.y+hTop>1.55&&pl.y<2.2){if(Math.abs(o.x-pl.x)>.9){stumble();continue}crash();return}
  }
  while(nextZ<pl.z+160)addChunk();
  // 화면
  ground.position.set(0,.01,pl.z+60);railTex.offset.y=-(pl.z/200*12)%1;grass.position.z=pl.z+60;
  for(const p of props)if(p.m.position.z<pl.z-15){p.m.position.z+=34*6;p.m.position.x=p.side*rand(9,14)}
  P.g.position.set(pl.x,pl.y,pl.z);pl.phase+=dt*v*.9;const on=pl.y<=pl.ground+.05,w=on?Math.sin(pl.phase):0;
  P.b.rotation.x=pl.slideT>0?1.3:0;P.b.position.y=pl.slideT>0?-.6:0;P.b.position.z=pl.slideT>0?.4:0;
  P.legL.rotation.x=on?w*1:-.8;P.legR.rotation.x=on?-w*1:.4;P.armL.rotation.x=on?-w*.9:-2.4;P.armR.rotation.x=on?w*.9:-2.4;P.g.rotation.z=(tx-pl.x)*.05;
  jetM.visible=pw.jet>0;
  // 로봇 추격
  if(pl.stumbleT>0){BOT.g.visible=true;BOT.g.position.set(pl.x,pl.ground,pl.z-3.2-(6-pl.stumbleT)*.15);const bw=Math.sin(time*16);BOT.legL.rotation.x=bw;BOT.legR.rotation.x=-bw;BOT.armL.rotation.x=-1.6;BOT.armR.rotation.x=-1.6}
  else BOT.g.visible=false;
  updateMissions(false);
  // HUD
  setT($('score'),Math.floor(score).toLocaleString());setT($('mult'),'×'+mult);setT($('coins'),coins);
  const box=$('powers');const act_=D.powers.filter(p=>pw[p.id]>0);if(box.children.length!==act_.length||act_.some((p,i)=>box.children[i]._id!==p.id)){box.innerHTML='';for(const p of act_){const d=document.createElement('div');d._id=p.id;d.className='pw';d.style.setProperty('--c',p.color);const sp=document.createElement('span');sp.textContent=p.name;const ii=document.createElement('i'),ss=document.createElement('s');ii.appendChild(ss);d.append(sp,ii);box.appendChild(d)}}
  act_.forEach((p,i)=>{const s=box.children[i]&&box.children[i].querySelector('s');if(s)s.style.width=(pw[p.id]/pwTime(p.id)*100)+'%'});
}
function stumble(){if(pl.stumbleT>0){crash('caught');return}pl.stumbleT=6;pl.inv=.6;pl.lane=pl.prevLane??1;snd('thud');toast('앗, 휘청!','#ffb38a');flash()}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(!paused){time+=dt;if(state==='play')update(dt);else if(state==='over'){P.g.position.y=Math.max(pl.ground,P.g.position.y-dt*4)}}
  const port=camera.aspect<1;
  if(state==='title'){camera.position.set(Math.sin(time*.3)*6,4,pl.z-9+Math.cos(time*.3)*2);camera.lookAt(0,1.5,pl.z+4)}
  else{camera.position.set(pl.x*.7,(port?6:5)+pl.y*.6,pl.z-(port?9:8));camera.lookAt(pl.x*.85,1.4+pl.y*.7,pl.z+(port?12:10))}
  renderer.render(scene,camera);requestAnimationFrame(frame)}

// ---------- 처음 화면 / 강화
function toTitle(){state='title';paused=false;for(const id of ['pauseOv','overOv','shopOv'])$(id).hidden=true;P.b.rotation.x=0;clearWorld();pl.z=0;pl.x=0;pl.y=0;nextZ=30;while(nextZ<120)addChunk();
  setT($('tBest'),save.best.toLocaleString());setT($('tCoins'),save.coins.toLocaleString());setT($('tMult'),'×'+save.mult);renderMissions($('tMissions'));$('titleOv').hidden=false}
function renderShop(){setT($('sCoins'),save.coins);const box=$('ups');box.innerHTML='';
  for(const p of D.powers){const lv=save.up[p.id]||1,max=p.cost.length,b=document.createElement('button');b.className='up';const cost=p.cost[lv];b.disabled=lv>=max||save.coins<cost;
    const nb=document.createElement('b'),ni=document.createElement('i'),ne=document.createElement('em');nb.textContent=p.name+' Lv'+lv;ni.textContent=`지금 ${pwTime(p.id)}초`+(lv<max?` → ${(p.time+p.perLevel*lv)}초`:'');ne.textContent=lv>=max?'최고':'동전 '+cost;b.append(nb,ni,ne);
    b.onclick=()=>{if(b.disabled)return;save.coins-=cost;save.up[p.id]=lv+1;store();snd('power');renderShop()};box.appendChild(b)}}
$('startBtn').onclick=()=>{snd('select');start()};$('againBtn').onclick=()=>{snd('select');start()};$('oTitle').onclick=()=>{snd('click');toTitle()};
$('shopBtn').onclick=()=>{snd('click');renderShop();$('titleOv').hidden=true;$('shopOv').hidden=false};$('shopClose').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');save.coins+=coins;store();toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__rd={pl,get objs(){return objs},get state(){return state},start,act,get score(){return score},get coins(){return coins},get dist(){return dist},save,pw,get speed(){return speed}};
});
