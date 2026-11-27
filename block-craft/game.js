/* 블록 쌓기 — 블록을 놓고 부수며 마음껏 짓는 3D 세계. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id);
const [SX,SY,SZ]=D.size,BL=D.blocks,PP=D.player,SAVE='blockCraft.world',META='blockCraft.meta';
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const meta=Object.assign({placed:0,sel:1},(()=>{try{return JSON.parse(localStorage.getItem(META))||{}}catch(_){return {}}})());
const storeMeta=()=>{try{localStorage.setItem(META,JSON.stringify(meta))}catch(_){}};

// ---------- 3D 준비
const renderer=new THREE.WebGLRenderer({antialias:false});if(!renderer.getContext())throw new Error('WebGL을 쓸 수 없어요');
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));$('view').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#8ad0ff');scene.fog=new THREE.Fog('#8ad0ff',22,52);
const cam=new THREE.PerspectiveCamera(72,1,.05,200);
scene.add(new THREE.HemisphereLight(0xffffff,0x88aa88,.75));const sun=new THREE.DirectionalLight(0xffffff,.55);sun.position.set(.5,1,.3);scene.add(sun);
function fit(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}addEventListener('resize',fit);fit();

// ---------- 블록 무늬 (작은 픽셀 그림)
function tex(c,c2,pat,seed){const k=document.createElement('canvas');k.width=k.height=16;const g=k.getContext('2d');g.fillStyle=c;g.fillRect(0,0,16,16);let s=seed*9301+49297;const R=()=>(s=(s*9301+49297)%233280)/233280;g.fillStyle=c2;
  if(pat==='noise'||pat==='leaf'){for(let i=0;i<(pat==='leaf'?60:34);i++)g.fillRect(Math.floor(R()*16),Math.floor(R()*16),1,1);if(pat==='leaf'){g.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<14;i++)g.fillRect(Math.floor(R()*16),Math.floor(R()*16),1,1)}}
  else if(pat==='brick'){g.fillStyle=c2;for(let y=0;y<16;y+=4){g.fillRect(0,y,16,1);for(let x=(y/4)%2?0:4;x<16;x+=8)g.fillRect(x,y,1,4)}}
  else if(pat==='plank'){for(let y=0;y<16;y+=4){g.fillRect(0,y+3,16,1);g.fillRect((y*3)%16,y,1,3)}}
  else if(pat==='log'){for(let x=1;x<16;x+=3)g.fillRect(x,0,1,16)}
  else if(pat==='glass'){g.fillStyle=c2;g.fillRect(0,0,16,1);g.fillRect(0,15,16,1);g.fillRect(0,0,1,16);g.fillRect(15,0,1,16);g.fillRect(3,3,1,3);g.fillRect(4,4,1,3)}
  else if(pat==='wool'){for(let i=0;i<20;i++){g.fillRect(Math.floor(R()*16),Math.floor(R()*16),2,1)}}
  const t=new THREE.CanvasTexture(k);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return {t,k}}
const MATS={},ICONS={};
for(const id in BL){const b=BL[id];const side=tex(b.c,b.c2,b.pat,+id);ICONS[id]=side.k;
  const mk=t=>new THREE.MeshLambertMaterial({map:t,transparent:!!b.alpha,opacity:b.alpha||1,depthWrite:!b.alpha,emissive:b.glow?new THREE.Color('#ffe080'):new THREE.Color(0),emissiveIntensity:b.glow?.8:0});
  if(b.top){const top=tex(b.top,id==='5'?b.c2:shade(b.top),id==='5'?'wool':'noise',+id+7);const sm=mk(side.t),tm=mk(top.t),bm=id==='1'?mk(tex('#8a6a4a','#7a5a3a','noise',3).t):tm;MATS[id]=[sm,sm,tm,bm,sm,sm];ICONS[id]=top.k}
  else MATS[id]=mk(side.t)}
function shade(h){const n=parseInt(h.slice(1),16);const f=v=>Math.max(0,Math.round(v*.82));return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(f).map(v=>v.toString(16).padStart(2,'0')).join('')}

// ---------- 세계
let W=new Uint8Array(SX*SY*SZ);const idx=(x,y,z)=>(y*SZ+z)*SX+x;
const get=(x,y,z)=>x<0||z<0||x>=SX||z>=SZ||y<0?3:y>=SY?0:W[idx(x,y,z)];
const solidId=id=>id&&BL[id]&&BL[id].solid!==false;
function gen(){W=new Uint8Array(SX*SY*SZ);const s=Math.random()*100;
  const hgt=(x,z)=>Math.floor(7+Math.sin((x+s)*.18)*2.2+Math.cos((z-s)*.15)*2.4+Math.sin((x+z)*.09+s)*2+Math.cos((x-z)*.25)*1);
  for(let x=0;x<SX;x++)for(let z=0;z<SZ;z++){const h=clamp(hgt(x,z),2,SY-6);for(let y=0;y<=h;y++)W[idx(x,y,z)]=y===h?(h<=D.sea?4:1):y>h-3?2:3;for(let y=h+1;y<=D.sea;y++)W[idx(x,y,z)]=10}
  for(let i=0;i<14;i++){const x=2+Math.floor(Math.random()*(SX-4)),z=2+Math.floor(Math.random()*(SZ-4));let y=SY-1;while(y>0&&!W[idx(x,y,z)])y--;if(W[idx(x,y,z)]!==1)continue;
    const th=4+Math.floor(Math.random()*2);for(let k=1;k<=th;k++)W[idx(x,y+k,z)]=5;for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=th-1;dy<=th+1;dy++){if(Math.abs(dx)+Math.abs(dz)+(dy>th?1:0)>3)continue;const X=x+dx,Y=y+dy,Z=z+dz;if(X<0||Z<0||X>=SX||Z>=SZ||Y>=SY)continue;if(!W[idx(X,Y,Z)])W[idx(X,Y,Z)]=6}}}
function saveWorld(){try{let out=[],prev=W[0],n=0;for(let i=0;i<W.length;i++){if(W[i]===prev&&n<255)n++;else{out.push(prev,n);prev=W[i];n=1}}out.push(prev,n);
  let s='';for(const v of out)s+=String.fromCharCode(v);localStorage.setItem(SAVE,btoa(s))}catch(_){}}
function loadWorld(){try{const s=localStorage.getItem(SAVE);if(!s)return false;const b=atob(s);const w=new Uint8Array(SX*SY*SZ);let p=0;for(let i=0;i<b.length;i+=2){const v=b.charCodeAt(i),n=b.charCodeAt(i+1);for(let k=0;k<n&&p<w.length;k++)w[p++]=v}if(p!==w.length)return false;W=w;return true}catch(_){return false}}

// ---------- 그리기 (보이는 블록만)
const BOX=new THREE.BoxGeometry(1,1,1);let inst={};const M4=new THREE.Matrix4();
function rebuild(){for(const k in inst)scene.remove(inst[k]);inst={};const lists={};
  for(let y=0;y<SY;y++)for(let z=0;z<SZ;z++)for(let x=0;x<SX;x++){const id=W[idx(x,y,z)];if(!id)continue;const tr=!!BL[id].alpha;
    let vis=false;for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const n=get(x+dx,y+dy,z+dz);if(!n||(BL[n]&&BL[n].alpha&&n!==id)){vis=true;break}}
    if(!vis)continue;(lists[id]=lists[id]||[]).push(x,y,z)}
  for(const id in lists){const L=lists[id];const m=new THREE.InstancedMesh(BOX,MATS[id],L.length/3);for(let i=0;i<L.length;i+=3){M4.makeTranslation(L[i]+.5,L[i+1]+.5,L[i+2]+.5);m.setMatrixAt(i/3,M4)}m.instanceMatrix.needsUpdate=true;if(BL[id].alpha)m.renderOrder=1;scene.add(m);inst[id]=m}}
// 고른 칸 테두리
const hl=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01)),new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:.6}));scene.add(hl);hl.visible=false;

// ---------- 플레이어
const P={x:SX/2,y:SY,z:SZ/2,vx:0,vy:0,vz:0,yaw:0,pitch:-.2,ground:false,fly:false};
function spawn(){let y=SY-1;const x=Math.floor(P.x),z=Math.floor(P.z);while(y>0&&!solidId(get(x,y,z)))y--;P.y=y+1.01;P.vy=0}
const PW=.3,PH=1.7;
function collides(x,y,z){for(let X=Math.floor(x-PW);X<=Math.floor(x+PW);X++)for(let Y=Math.floor(y);Y<=Math.floor(y+PH-.01);Y++)for(let Z=Math.floor(z-PW);Z<=Math.floor(z+PW);Z++)if(solidId(get(X,Y,Z)))return true;return false}
function moveAxis(ax,d){if(!d)return false;const o={x:P.x,y:P.y,z:P.z};o[ax]+=d;if(!collides(o.x,o.y,o.z)){P[ax]=o[ax];return false}
  // 한 칸 턱은 자동으로 올라가기
  if(ax!=='y'&&P.ground&&!P.fly&&!collides(o.x,o.y+1.01,o.z)&&!collides(P.x,P.y+1.01,P.z)){P.y+=1.01;P[ax]=o[ax];return false}
  return true}

// ---------- 입력
const keys={};let mode='place',sel=meta.sel||1,stk=null,look=null,toastT=0;
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');toastT=1.6}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(state!=='play')return;if(k==='f')toggleFly();if(k==='q')toggleMode();const n=parseInt(k);if(n>=1&&n<=9&&D.palette[n-1])pick(D.palette[n-1]);if(k===' '&&P.ground&&!P.fly){P.vy=PP.jump;P.ground=false}if([' '].includes(k))e.preventDefault()});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
const cvs=renderer.domElement;cvs.addEventListener('contextmenu',e=>e.preventDefault());
cvs.addEventListener('pointerdown',e=>{if(state!=='play')return;look={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),moved:0,btn:e.button}});
addEventListener('pointermove',e=>{if(stk&&e.pointerId===stk.id){let dx=e.clientX-stk.ox,dy=e.clientY-stk.oy;const l=Math.hypot(dx,dy);if(l>45){dx*=45/l;dy*=45/l}stk.dx=dx;stk.dy=dy;const k=$('stick').querySelector('i');if(k)k.style.transform=`translate(${dx}px,${dy}px)`;return}
  if(look&&e.pointerId===look.id){const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;look.moved+=Math.abs(dx)+Math.abs(dy);if(look.moved>8){P.yaw-=dx*.006;P.pitch=clamp(P.pitch-dy*.006,-1.5,1.5)}}});
addEventListener('pointerup',e=>{if(stk&&e.pointerId===stk.id){stk=null;$('stick').style.display='none';return}
  if(look&&e.pointerId===look.id){const l=look;look=null;if(l.moved<10&&performance.now()-l.t<500)act(l.sx,l.sy,l.btn===2?'break':mode)}});
addEventListener('pointercancel',()=>{look=null;stk=null;$('stick').style.display='none'});
$('stickZone').addEventListener('pointerdown',e=>{e.stopPropagation();stk={id:e.pointerId,ox:e.clientX,oy:e.clientY,dx:0,dy:0};const s=$('stick');s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';s.style.display='block'});
let upHeld=false,downHeld=false;
for(const [id,set] of [['upBtn',v=>{upHeld=v;if(v&&P.ground&&!P.fly){P.vy=PP.jump;P.ground=false}}],['downBtn',v=>downHeld=v]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();set(true)});for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>set(false))}
function toggleFly(){P.fly=!P.fly;P.vy=0;$('flyBtn').classList.toggle('on',P.fly);$('downBtn').hidden=!P.fly;toast(P.fly?'🕊 날기 켬':'🚶 걷기');snd('click')}
function toggleMode(){mode=mode==='place'?'break':'place';const b=$('modeBtn');b.className=mode;b.textContent=mode==='place'?'🧱 놓기':'⛏ 부수기';snd('click')}
$('flyBtn').onclick=toggleFly;$('modeBtn').onclick=toggleMode;$('downBtn').hidden=true;
function pick(id){sel=id;meta.sel=id;storeMeta();for(const b of $('palette').querySelectorAll('button'))b.classList.toggle('on',+b.dataset.id===id);toast(BL[id].name);snd('tick')}
function buildPalette(){const p=$('palette');p.innerHTML='';for(const id of D.palette){const b=document.createElement('button');b.dataset.id=id;b.title=BL[id].name;const k=document.createElement('canvas');k.width=k.height=16;k.getContext('2d').drawImage(ICONS[id],0,0);b.appendChild(k);b.onclick=e=>{e.stopPropagation();pick(id)};p.appendChild(b)}pick(sel)}

// ---------- 블록 고르기 (광선)
const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
function cast(px,py){v2.set(px/innerWidth*2-1,-(py/innerHeight)*2+1);ray.setFromCamera(v2,cam);const o=ray.ray.origin,d=ray.ray.direction;
  let x=Math.floor(o.x),y=Math.floor(o.y),z=Math.floor(o.z);const sx=Math.sign(d.x),sy=Math.sign(d.y),sz=Math.sign(d.z);
  const tdx=Math.abs(1/d.x),tdy=Math.abs(1/d.y),tdz=Math.abs(1/d.z);let tx=((sx>0?x+1-o.x:o.x-x))*tdx,ty=((sy>0?y+1-o.y:o.y-y))*tdy,tz=((sz>0?z+1-o.z:o.z-z))*tdz;let prev=null;
  for(let i=0;i<64;i++){const id=(x<0||z<0||x>=SX||z>=SZ||y<0||y>=SY)?0:W[idx(x,y,z)];if(id&&id!==10)return {x,y,z,prev,id};if(Math.min(tx,ty,tz)>7)return null;prev=[x,y,z];
    if(tx<ty&&tx<tz){x+=sx;tx+=tdx}else if(ty<tz){y+=sy;ty+=tdy}else{z+=sz;tz+=tdz}}return null}
function act(px,py,how){const h=cast(px,py);if(!h)return;
  if(how==='break'){if(h.y===0){toast('맨 아래는 못 부숴요');return}W[idx(h.x,h.y,h.z)]=0;burst(h.x,h.y,h.z,h.id);snd('crack')}
  else{if(!h.prev)return;const [x,y,z]=h.prev;if(y>=SY||x<0||z<0||x>=SX||z>=SZ)return;
    // 내 몸과 겹치면 안 돼요
    if(solidId(sel)&&x+1>P.x-PW&&x<P.x+PW&&z+1>P.z-PW&&z<P.z+PW&&y+1>P.y&&y<P.y+PH){toast('내 몸 자리에는 못 놓아요');return}
    W[idx(x,y,z)]=sel;meta.placed++;if(meta.placed%10===0){storeMeta();Arcade.record&&Arcade.record('blockCraftPlaced',meta.placed)}snd('place')}
  rebuild();dirty=true}
let dirty=false,saveT=0;
// 부서지는 조각
const bits=[];function burst(x,y,z,id){for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.18,.18,.18),Array.isArray(MATS[id])?MATS[id][0]:MATS[id]);m.position.set(x+.5,y+.5,z+.5);m.v=new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4);m.t=0;scene.add(m);bits.push(m)}}

// ---------- 갱신
let state='title',last=performance.now();
function update(dt){
  let fx=0,fz=0;if(keys.w||keys.arrowup)fz+=1;if(keys.s||keys.arrowdown)fz-=1;if(keys.a||keys.arrowleft)fx-=1;if(keys.d||keys.arrowright)fx+=1;
  if(stk){fx=clamp(stk.dx/40,-1,1);fz=clamp(-stk.dy/40,-1,1)}
  const sp=P.fly?PP.fly:PP.walk;const cy=Math.cos(P.yaw),sy=Math.sin(P.yaw);
  const wx=(-sy*fz+cy*fx)*sp,wz=(-cy*fz-sy*fx)*sp;
  if(P.fly){let vy=0;if(keys[' ']||upHeld)vy+=sp;if(keys.shift||downHeld)vy-=sp;P.vy=vy}else{P.vy=Math.max(-30,P.vy-24*dt);if(upHeld&&P.ground){P.vy=PP.jump;P.ground=false}}
  moveAxis('x',wx*dt);moveAxis('z',wz*dt);const hitY=moveAxis('y',P.vy*dt);
  if(hitY){if(P.vy<0)P.ground=true;P.vy=0}else P.ground=P.fly?false:collides(P.x,P.y-.05,P.z);
  if(P.y<-10){spawn()}P.x=clamp(P.x,.4,SX-.4);P.z=clamp(P.z,.4,SZ-.4);
  cam.position.set(P.x,P.y+1.55,P.z);cam.rotation.order='YXZ';cam.rotation.y=P.yaw;cam.rotation.x=P.pitch;
  // 가운데 겨냥 테두리 (데스크톱 마우스 없을 때)
  const h=cast(innerWidth/2,innerHeight/2);if(h){hl.visible=true;hl.position.set(h.x+.5,h.y+.5,h.z+.5)}else hl.visible=false;
  for(const b of bits){b.t+=dt;b.v.y-=15*dt;b.position.addScaledVector(b.v,dt);b.rotation.x+=dt*5}for(let i=bits.length-1;i>=0;i--)if(bits[i].t>.7){scene.remove(bits[i]);bits.splice(i,1)}
  if(dirty){saveT+=dt;if(saveT>2){saveT=0;dirty=false;saveWorld()}}}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.remove('on')}if(state==='play')update(dt);renderer.render(scene,cam);requestAnimationFrame(frame)}

// ---------- 화면
function enter(){$('titleOv').hidden=true;state='play';snd('go');toast(mode==='place'?'탭하면 블록을 놓아요':'탭하면 부숴요')}
$('playBtn').onclick=()=>{snd('click');enter()};$('newBtn').onclick=()=>{$('newOv').hidden=false};$('newNo').onclick=()=>{$('newOv').hidden=true};
$('newYes').onclick=()=>{$('newOv').hidden=true;gen();saveWorld();rebuild();P.x=SX/2;P.z=SZ/2;spawn();enter()};
$('menuBtn').onclick=()=>{saveWorld();state='title';$('titleOv').hidden=false;setRec()};
function setRec(){$('tRec').textContent=meta.placed?'지금까지 블록 '+meta.placed+'개를 놓았어요':''}
addEventListener('visibilitychange',()=>{if(document.hidden)saveWorld()});
if(!loadWorld())gen();rebuild();spawn();buildPalette();setRec();cam.position.set(P.x,P.y+1.6,P.z);requestAnimationFrame(frame);
window.__bc={get P(){return P},act,cast,get W(){return W},idx,update,enter,gen,rebuild,count:()=>Object.values(inst).reduce((a,m)=>a+m.count,0)};
});
