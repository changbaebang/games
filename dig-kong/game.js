/* 파고파고 고릴라 — 땅속 동굴을 부수며 황금 바나나를 찾아 한 층씩 내려가요. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches,PS=D.player,SAVE='digKong.save';
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rand(a,b+1));
const save=Object.assign({best:0,gold:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#1a1410');scene.fog=new THREE.Fog(0x1a1410,10,30);
const camera=new THREE.PerspectiveCamera(64,W()/H(),.1,120);
const amb=new THREE.HemisphereLight(0xffeedd,0x302018,.55);scene.add(amb);
const lamp=new THREE.PointLight(0xffd8a0,1.5,18,1.2);scene.add(lamp);
const torches=[0,1,2].map(()=>{const l=new THREE.PointLight(0xffa860,1.1,12,1.5);scene.add(l);return l});
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?78:64;camera.updateProjectionMatrix();renderer.setSize(W(),H())}addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1),mc={};const lam=c=>mc[c]||(mc[c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
function cube(c,w,h,d,x,y,z,par){const k=new THREE.Mesh(BOX,typeof c==='string'?lam(c):c);k.scale.set(w,h,d);k.position.set(x,y,z);(par||scene).add(k);return k}
const glow=(c,e)=>new THREE.MeshLambertMaterial({color:new THREE.Color(c),emissive:new THREE.Color(e)});

// ---------- 동굴 세계
const [WX,WY,WZ]=D.world;
let grid=new Uint8Array(WX*WY*WZ),hp=new Uint8Array(WX*WY*WZ),items=new Map(),inst={},dirty=true,LV=null,lvl=0;
const idx=(x,y,z)=>(y*WZ+z)*WX+x,inside=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<WX&&y<WY&&z<WZ;
const get=(x,y,z)=>inside(x,y,z)?grid[idx(x,y,z)]:6;
const solidAt=(x,y,z)=>get(Math.floor(x),Math.floor(y),Math.floor(z))>0;
const M4=new THREE.Matrix4();
function makeInst(){for(const k in inst)scene.remove(inst[k]);inst={};
  for(let t=1;t<=7;t++){const c=LV.colors[t];const mat=t===5?glow(c,'#7a5200'):t===7?glow(c,c):lam(c);const m=new THREE.InstancedMesh(BOX,mat,9000);m.count=0;scene.add(m);inst[t]=m}}
const airN=(x,y,z)=>!get(x+1,y,z)||!get(x-1,y,z)||!get(x,y+1,z)||!get(x,y-1,z)||!get(x,y,z+1)||!get(x,y,z-1);
function rebuild(){const cnt={1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  for(let y=0;y<WY;y++)for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const t=grid[idx(x,y,z)];if(!t)continue;if(!airN(x,y,z))continue;if(cnt[t]>=9000)continue;
    const s=hp[idx(x,y,z)]<(D.blocks[t].hp||1)?.9:1;M4.makeScale(s,s,s);M4.setPosition(x+.5,y+.5,z+.5);inst[t].setMatrixAt(cnt[t]++,M4)}
  for(const t in cnt){inst[t].count=cnt[t];inst[t].instanceMatrix.needsUpdate=true}dirty=false}
let cave=null;
function setB(x,y,z,t){if(!inside(x,y,z))return;const i=idx(x,y,z);grid[i]=t;hp[i]=D.blocks[t]?D.blocks[t].hp||1:1}
function floorAt(x,z,fromY){for(let y=Math.min(WY-2,Math.floor(fromY));y>0;y--)if(get(Math.floor(x),y,Math.floor(z))&&!get(Math.floor(x),y+1,Math.floor(z)))return y+1;return 2}
function gen(){grid.fill(0);hp.fill(0);items.clear();
  for(let y=0;y<WY;y++)for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const shell=x===0||z===0||y===0||x===WX-1||z===WZ-1||y===WY-1;setB(x,y,z,shell?6:Math.random()<LV.rock?4:(y+Math.floor(Math.sin(x*.7+z*.4)*1.5))%5<2?2:3)}
  // 방(둥근 굴)과 굴길 파기
  const rooms=[];let cx=5+Math.random()*3,cz=5+Math.random()*3;
  for(let i=0;i<9;i++){const r={x:cx,z:cz,y:3,rx:rand(3,4.6),rz:rand(3,4.6),ry:rand(3.2,4.6)};rooms.push(r);
    let tries=0;do{const a=Math.random()*6.28;cx=Math.max(5,Math.min(WX-6,r.x+Math.cos(a)*7));cz=Math.max(5,Math.min(WZ-6,r.z+Math.sin(a)*7));tries++}while(tries<20&&rooms.some(o=>Math.hypot(o.x-cx,o.z-cz)<5))}
  const carve=(x,y,z)=>{if(x<1||z<1||y<1||x>WX-2||z>WZ-2||y>WY-2)return;grid[idx(x,y,z)]=0};
  for(const r of rooms)for(let z=1;z<WZ-1;z++)for(let x=1;x<WX-1;x++){const v=((x+.5-r.x)/r.rx)**2+((z+.5-r.z)/r.rz)**2;if(v>=1)continue;const top=2+Math.floor(r.ry*Math.sqrt(1-v))+1;const fl=v>.55&&Math.random()<.25?3:2;for(let y=fl;y<=Math.min(WY-2,top);y++)carve(x,y,z)}
  for(let i=1;i<rooms.length;i++){const a=rooms[i-1],b=rooms[i];const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2);for(let k=0;k<=n;k++){const t=k/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let y=2;y<=4;y++)carve(Math.floor(x+dx),y,Math.floor(z+dz))}}
  // 바닥 이끼
  for(let y=1;y<WY-1;y++)for(let z=1;z<WZ-1;z++)for(let x=1;x<WX-1;x++){const t=grid[idx(x,y,z)];if(t&&t!==6&&!grid[idx(x,y+1,z)])setB(x,y,z,1)}
  const surf=[];for(let y=2;y<WY-2;y++)for(let z=2;z<WZ-2;z++)for(let x=2;x<WX-2;x++){const t=grid[idx(x,y,z)];if(t>1&&t!==6&&airN(x,y,z))surf.push([x,y,z])}
  const pickS=()=>surf[Math.floor(Math.random()*surf.length)];
  const inward=(x,y,z,n)=>{for(let k=0;k<n;k++){const opts=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,-1,0]].filter(([a,b,c])=>{const t=get(x+a,y+b,z+c);return t&&t!==6});if(!opts.length)break;const [a,b,c]=opts[Math.floor(Math.random()*opts.length)];x+=a;y+=b;z+=c}return [x,y,z]};
  // 금광맥
  for(let v=0;v<LV.ore;v++){let [x,y,z]=pickS();for(let k=0;k<ri(6,10);k++){if(get(x,y,z)&&get(x,y,z)!==6)setB(x,y,z,5);const d=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][ri(0,5)];x+=d[0];y+=d[1];z+=d[2];if(!inside(x,y,z)||get(x,y,z)===6)break}}
  // 수정 무리 (부수면 보석)
  const C={gold:[],nanas:[],rooms,exit:null,start:null,bats:[]};let gemsLeft=LV.gems;
  for(let v=0;v<LV.crystal;v++){const [x,y,z]=pickS();for(let k=0;k<4;k++){const p=[x+ri(-1,1),y+ri(0,1),z+ri(-1,1)];const t=get(...p);if(t&&t!==6){setB(...p,7);if(gemsLeft>0){items.set(idx(...p),'gem');gemsLeft--}}}}
  while(gemsLeft>0){const p=inward(...pickS(),ri(0,2));const i=idx(...p);if(get(...p)&&get(...p)!==6&&!items.has(i)){items.set(i,'gem');gemsLeft--}}
  // 황금 바나나
  const n=LV.gold;let placed=0;
  const bury=depth=>{for(let t=0;t<50;t++){const p=inward(...pickS(),depth);const i=idx(...p);if(get(...p)&&get(...p)!==6&&!items.has(i)){items.set(i,'gb');C.gold.push({buried:true,x:p[0]+.5,y:p[1]+.5,z:p[2]+.5,i});return true}}return false};
  // 1) 금광맥 속
  for(let t=0;t<300&&placed<2;t++){const p=pickS();const q=inward(...p,1);if(get(...q)===5){const i=idx(...q);if(!items.has(i)){items.set(i,'gb');C.gold.push({buried:true,x:q[0]+.5,y:q[1]+.5,z:q[2]+.5,i});placed++}}}
  // 2) 높은 선반 (벽 높은 곳에 판 작은 굴)
  for(let t=0;t<200&&placed<4;t++){const [x,y,z]=pickS();if(y<6)continue;const dirs=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>!get(x-a,y,z-b));if(!dirs.length)continue;const [a,b]=dirs[0];
    if(get(x,y,z)===6||get(x+a,y,z+b)===6)continue;grid[idx(x,y,z)]=0;grid[idx(x,y+1,z)]=get(x,y+1,z)===6?6:0;if(get(x,y-1,z)!==6)setB(x,y-1,z,1);C.gold.push({x:x+.5,y:y+.6,z:z+.5});placed++}
  // 3) 숨은 방 (벽 속 작은 빈 곳)
  for(let t=0;t<200&&placed<5;t++){const p=inward(...pickS(),3);const [x,y,z]=p;let ok=true;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){const tt=get(x+a,y+b,z+c);if(!tt||tt===6)ok=false}if(!ok)continue;
    for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)grid[idx(x+a,y+b,z+c)]=0;setB(x,y-1,z,7);setB(x+1,y-1,z,7);C.gold.push({x:x+1,y:y+.6,z:z+1,hidden:true});placed++}
  // 4) 나머지는 벽 속
  while(placed<n){if(bury(ri(1,2)))placed++;else break}
  // 굴길 바나나 줄
  for(let i=1;i<rooms.length;i++){const a=rooms[i-1],b=rooms[i];const m=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.5);for(let k=1;k<m;k++){const t=k/m,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;C.nanas.push({x,y:floorAt(x,z,6)+1.2,z})}}
  // 시작과 출구
  const s=rooms[0];C.start={x:s.x,z:s.z,y:floorAt(s.x,s.z,WY-3)};const e=rooms[rooms.length-1];C.exit={x:e.x,z:e.z,y:floorAt(e.x,e.z,WY-3)};
  for(let i=2;i<rooms.length;i+=2)C.bats.push({x:rooms[i].x,z:rooms[i].z,y:floorAt(rooms[i].x,rooms[i].z,WY-3)+3});
  cave=C}

// ---------- 고릴라
function limb(w,h,d,c,x,y,par){const p=new THREE.Group();p.position.set(x,y,0);cube(c,w,h,d,0,-h/2,0,p);par.add(p);return p}
const G=new THREE.Group(),Gb=new THREE.Group();G.add(Gb);scene.add(G);G.scale.setScalar(.55);
cube('#6a4428',1.5,1.3,1,0,1.9,0,Gb);cube('#d8a878',1,.8,.1,0,1.85,.5,Gb);cube('#6a4428',1,.9,.9,0,2.9,.1,Gb);cube('#d8a878',.8,.5,.3,0,2.75,.55,Gb);
cube('#111',.15,.15,.05,-.2,3.05,.56,Gb);cube('#111',.15,.15,.05,.2,3.05,.56,Gb);cube('#ff5a2a',.5,.12,.6,0,3.4,.1,Gb);
const legL=limb(.5,1.1,.6,'#5a3820',-.4,1.2,Gb),legR=limb(.5,1.1,.6,'#5a3820',.4,1.2,Gb);
const armL=limb(.55,1.5,.6,'#6a4428',-1,2.5,Gb),armR=limb(.55,1.5,.6,'#6a4428',1,2.5,Gb);cube('#d8a878',.6,.5,.6,0,-1.6,0,armR);cube('#d8a878',.6,.5,.6,0,-1.6,0,armL);
const pl={x:12,y:12,z:12,vx:0,vy:0,vz:0,face:0,ground:false,hp:PS.hp,inv:0,punchT:0,charge:0,phase:0};
let moles=[],pick=[],fx=[],gems=0,nanas=0,coins=0,state="title",paused=false,time=0,yaw=0,pitch=.42,dist=6.5;

// ---------- 입력
const keys={},joy={x:0,y:0};let punchHeld=false,downQ=false,jumpQ=false;
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true;if(e.repeat)return;if(e.code==='Space'){e.preventDefault();jumpQ=true}if(e.code==='KeyJ')punchHeld=true;if(e.code==='KeyK')downQ=true});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyJ'){releasePunch();punchHeld=false}});
const cv=renderer.domElement,jb=$('joy'),kn=$('knob');let jid=null,jo={x:0,y:0},drag=null;
function joyMove(e){let x=e.clientX-jo.x,y=e.clientY-jo.y;const l=Math.hypot(x,y),mx=50;if(l>mx){x*=mx/l;y*=mx/l}kn.style.transform=`translate(${x}px,${y}px)`;joy.x=x/mx;joy.y=y/mx}
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&jid===null&&e.clientX<innerWidth*.5&&e.clientY>innerHeight*.3){jid=e.pointerId;jo={x:e.clientX,y:e.clientY};jb.style.left=e.clientX+'px';jb.style.top=e.clientY+'px';jb.classList.add('on');cv.setPointerCapture(e.pointerId);joyMove(e);return}
  if(!drag){drag={x:e.clientX,y:e.clientY,id:e.pointerId,moved:false,mouse:e.pointerType==='mouse'};cv.setPointerCapture(e.pointerId);if(e.pointerType==='mouse')punchHeld=true}});
cv.addEventListener('pointermove',e=>{if(e.pointerId===jid){joyMove(e);return}if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<8)return;
  if(!drag.moved&&drag.mouse){punchHeld=false;pl.charge=0}drag.moved=true;const k=e.pointerType==='touch'?.009:.006;yaw-=dx*k;pitch=Math.max(.15,Math.min(1.3,pitch+dy*k*.7));drag.x=e.clientX;drag.y=e.clientY});
const pEnd=e=>{if(e.pointerId===jid){jid=null;joy.x=joy.y=0;kn.style.transform='';jb.classList.remove('on');jb.style.left=jb.style.top='';return}if(drag&&drag.id===e.pointerId){if(drag.mouse&&!drag.moved){releasePunch()}punchHeld=false;drag=null}};
cv.addEventListener('pointerup',pEnd);cv.addEventListener('pointercancel',pEnd);
cv.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(5,Math.min(16,dist+e.deltaY*.01))},{passive:false});
function hold(id,dn,up){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.classList.add('on');try{el.setPointerCapture(e.pointerId)}catch(_){}dn()});
  for(const ev of ['pointerup','pointercancel'])el.addEventListener(ev,()=>{if(el.classList.contains('on')){el.classList.remove('on');up&&up()}})}
hold('tPunch',()=>punchHeld=true,()=>{releasePunch();punchHeld=false});hold('tJump',()=>jumpQ=true);hold('tDown',()=>downQ=true);

// ---------- 빛나는 물건들
const GB_G=new THREE.BoxGeometry(.32,.9,.32);const gbMat=glow('#ffd23f','#c08a00'),nanaMat=glow('#ffe14a','#6a5a00');
let gbMeshes=[],nanaM=null,exitM=null,bats=[],held=null,throwns=[],sparks=null;
function gbMesh(){const g=new THREE.Group();const a=new THREE.Mesh(GB_G,gbMat);a.rotation.z=.45;a.position.x=-.08;g.add(a);const b=new THREE.Mesh(GB_G,gbMat);b.scale.set(.9,.8,.9);b.rotation.z=-.25;b.position.set(.18,.08,0);g.add(b);const c=cube('#6a4a10',.14,.18,.14,-.2,.48,0,g);scene.add(g);return g}
function placeThings(){for(const m of gbMeshes)scene.remove(m);gbMeshes=[];if(nanaM)scene.remove(nanaM);if(exitM)scene.remove(exitM);if(sparks)scene.remove(sparks);for(const b of bats)scene.remove(b.g);bats=[];if(held){scene.remove(held.m);held=null}for(const t of throwns)scene.remove(t.m);throwns=[];
  for(const g of cave.gold){g.got=false;g.m=gbMesh();g.m.visible=!g.buried;g.m.position.set(g.x,g.y,g.z)}gbMeshes=cave.gold.map(g=>g.m);
  nanaM=new THREE.InstancedMesh(new THREE.BoxGeometry(.22,.6,.22),nanaMat,Math.max(1,cave.nanas.length+60));scene.add(nanaM);
  sparks=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.12,.12),glow('#fff6a0','#ffe060'),64);scene.add(sparks);
  exitM=new THREE.Group();const E=cave.exit;cube('#5a4a3a',.6,3.2,.6,-1.3,1.6,0,exitM);cube('#5a4a3a',.6,3.2,.6,1.3,1.6,0,exitM);cube('#5a4a3a',3.2,.6,.6,0,3.2,0,exitM);exitM.door=cube(glow('#3a2a5a','#1a0a3a'),2,2.6,.2,0,1.4,0,exitM);exitM.position.set(E.x,E.y,E.z);scene.add(exitM);
  for(const B of cave.bats){const g=new THREE.Group();cube('#4a3a5a',.5,.4,.4,0,0,0,g);g.wl=cube('#3a2a4a',.7,.08,.4,-.5,0,0,g);g.wr=cube('#3a2a4a',.7,.08,.4,.5,0,0,g);cube('#ff5a5a',.08,.08,.05,-.1,.05,.2,g);cube('#ff5a5a',.08,.08,.05,.1,.05,.2,g);scene.add(g);bats.push({g,x:B.x,y:B.y,z:B.z,hx:B.x,hy:B.y,hz:B.z,t:Math.random()*6,dead:false,swoop:0})}}
const goldLeft=()=>cave.gold.filter(g=>!g.got).length;
function updThings(dt){const C=cave;let n=0;
  for(const b of C.nanas){if(b.got)continue;M4.makeRotationY(time*2+b.z);M4.setPosition(b.x,b.y+Math.sin(time*3+b.x)*.1,b.z);nanaM.setMatrixAt(n++,M4)}nanaM.count=n;nanaM.instanceMatrix.needsUpdate=true;
  for(const g of C.gold){if(g.got)continue;if(!g.buried){g.m.visible=true;g.m.rotation.y=time*2;g.m.position.y=g.y+Math.sin(time*2.5)*.15}}
  // 반짝이: 묻힌 황금 바나나와 보석이 표면 가까이 있으면 알려줘요
  let k=0;for(const g of C.gold){if(g.got||!g.buried||k>=56)continue;const d=Math.hypot(g.x-pl.x,g.z-pl.z);if(d>9)continue;for(let s=0;s<3;s++){const a=time*3+s*2.1+g.x;M4.makeScale(1,1,1);M4.setPosition(g.x+Math.cos(a)*.7,g.y+Math.sin(time*4+s)*.5,g.z+Math.sin(a)*.7);sparks.setMatrixAt(k++,M4)}}sparks.count=k;sparks.instanceMatrix.needsUpdate=true;
  const px=pl.x,py=pl.y+.9,pz=pl.z;const near=(o,r)=>Math.abs(o.z-pz)<r&&Math.abs(o.x-px)<r&&Math.abs(o.y-py)<r+.6;
  for(const b of C.nanas)if(!b.got&&near(b,1))(b.got=true,gotNana());
  for(const g of C.gold)if(!g.got&&!g.buried&&near(g,1.2))gotGold(g);
  // 출구
  const E=C.exit,open=collected()>=LV.need;exitM.door.material=open?glow('#ffd23f','#c08a00'):glow('#3a2a5a','#1a0a3a');exitM.door.scale.y=open?2.6+Math.sin(time*6)*.1:2.6;
  if(Math.hypot(px-E.x,pz-E.z)<1.4&&Math.abs(pl.y-E.y)<2){if(open&&!finished){finished=true;clearLevel()}else if(!open&&!exitMsg){exitMsg=2;toast('황금 바나나 '+LV.need+'개가 있어야 문이 열려요!')}}
  exitMsg=Math.max(0,exitMsg-dt);
  // 신호(가까운 황금 바나나)
  let best=1e9;for(const g of C.gold)if(!g.got){const d=Math.hypot(g.x-px,g.y-py,g.z-pz);if(d<best)best=d}
  const bars=best<3?3:best<6?2:best<10?1:0;setT($('radar'),'📡'+'▮'.repeat(bars)+'▯'.repeat(3-bars));
  pingT-=dt;if(bars>=2&&pingT<=0){pingT=bars===3?.5:1.1;snd('tick')}}
let pingT=0,exitMsg=0;
const collected=()=>cave.gold.filter(g=>g.got).length;
function gotGold(g){g.got=true;g.m.visible=false;snd('level');shake=.15;const c=collected();toast('🍌 황금 바나나! '+c+'/'+cave.gold.length);if(c===LV.need)setTimeout0(()=>toast('아래층 문이 열렸어요! 🚪'),1.4);meter=Math.min(D.bananza.need,meter+10);save.gold[lvl]=Math.max(save.gold[lvl]||0,c);store()}
function gotNana(){nanas++;snd('coin');if(pl.hp<maxHp)pl.hp++;if(nanas%30===0){maxHp=Math.min(8,maxHp+1);pl.hp=maxHp;toast('바나나 '+nanas+'개! 하트 +1')}}
const timers0=[];function setTimeout0(fn,t){timers0.push({fn,t})}

// ---------- 박쥐
function updBats(dt){for(const b of bats){if(b.dead)continue;b.t+=dt;const d=Math.hypot(pl.x-b.x,pl.z-b.z);
    if(b.swoop>0){b.swoop-=dt;const tx=pl.x,ty=pl.y+1,tz=pl.z;b.x+=(tx-b.x)*dt*2.2;b.y+=(ty-b.y)*dt*2.2;b.z+=(tz-b.z)*dt*2.2}
    else{b.x=b.hx+Math.cos(b.t*.8)*3;b.z=b.hz+Math.sin(b.t*.8)*3;b.y=b.hy+Math.sin(b.t*2)*.5;if(d<6&&Math.random()<dt*.6)b.swoop=1.6}
    b.g.position.set(b.x,b.y,b.z);b.g.rotation.y=Math.atan2(pl.x-b.x,pl.z-b.z);const f=Math.sin(time*20)*.6;b.g.wl.rotation.z=f;b.g.wr.rotation.z=-f;
    if(Math.hypot(b.x-pl.x,b.y-pl.y-1,b.z-pl.z)<.8){if(bananza>0){killBat(b)}else{hurt();b.swoop=0}}}}
function killBat(b){b.dead=true;scene.remove(b.g);coins+=4;burst(b.x,b.y,b.z,'#4a3a5a',8);snd('pop');toast('박쥐 퇴치! +4')}

// ---------- 부수기
function breakBlock(x,y,z,dmg){if(!inside(x,y,z))return false;const i=idx(x,y,z),t=grid[i];if(!t||t===6)return false;
  hp[i]=Math.max(0,hp[i]-dmg);dirty=true;
  if(hp[i]>0){snd('thud');burst(x+.5,y+.5,z+.5,LV.colors[t],3);return true}
  grid[i]=0;burst(x+.5,y+.5,z+.5,LV.colors[t],t===5||t===7?12:6);snd(t>=3?'crack':'pop');if(bananza<=0)meter=Math.min(D.bananza.need,meter+1);
  const c=D.blocks[t].coin;if(c){coins+=c;if(t===5)coinPop(x+.5,y+.5,z+.5,c)}
  const it=items.get(i);if(it){items.delete(i);if(it==='gb'){const g=cave.gold.find(g=>g.i===i);if(g){g.buried=false;g.x=x+.5;g.y=y+.5;g.z=z+.5;g.m.position.set(g.x,g.y,g.z);snd('power');toast('반짝! 황금 바나나가 나왔어요')}}else pick.push({kind:it,x:x+.5,y:y+.5,z:z+.5,vy:5,m:itemMesh(it),t:0})}return true}
function coinPop(x,y,z,n){for(let k=0;k<Math.min(5,n);k++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.06,10),glow('#ffd23f','#a07000'));m.rotation.x=Math.PI/2;m.position.set(x,y,z);scene.add(m);fx.push({m,vx:rand(-2,2),vy:rand(4,7),vz:rand(-2,2),t:.8})}}
function itemMesh(k){const g=new THREE.Group();scene.add(g);if(k==='gem'){const m=cube(glow('#c070ff','#7a2acc'),.42,.42,.42,0,0,0,g);m.rotation.set(.6,.6,0)}else{cube(nanaMat,.25,.7,.25,0,0,0,g).rotation.z=.5}return g}
function burst(x,y,z,col,n){for(let i=0;i<n;i++){if(fx.length>110)break;const m=cube(col,.18,.18,.18,x+(Math.random()-.5)*.6,y+(Math.random()-.5)*.6,z+(Math.random()-.5)*.6);fx.push({m,vx:(Math.random()-.5)*5,vy:Math.random()*5,vz:(Math.random()-.5)*5,t:.6})}}
function punch(power){
  if(bananza>0)power=3;pl.punchT=.25;const fx_=Math.sin(pl.face),fz=Math.cos(pl.face);let hit=false;snd(power>1?'boom':'slash');
  for(const m of moles){if(m.dead)continue;const dx=m.x-pl.x,dz=m.z-pl.z,d=Math.hypot(dx,dz)||.01;if(d<PS.punch+.7+(bananza>0?1:0)&&Math.abs(m.y-pl.y)<1.8&&(dx*fx_+dz*fz)>-.3){m.hp-=power;m.hit=.3;m.vx=dx/d*7;m.vz=dz/d*7;m.vy=4;if(m.hp<=0)killMole(m);hit=true}}
  for(const b of bats){if(b.dead)continue;if(Math.hypot(b.x-pl.x-fx_,b.y-pl.y-1.2,b.z-pl.z-fz)<1.8){killBat(b);hit=true}}
  const R0=bananza>0?1:0;
  for(let s=.6;s<=PS.punch&&!hit;s+=.3){const px=pl.x+fx_*s,pz=pl.z+fz*s;for(const hy of [pl.y+.4,pl.y+1.2,pl.y-.4,pl.y+2]){const bx=Math.floor(px),by=Math.floor(hy),bz=Math.floor(pz);if(get(bx,by,bz)&&get(bx,by,bz)!==6){
      if(power>1){const r=1+R0;for(let a=-r;a<=r;a++)for(let b=-1;b<=r;b++)for(let c=-r;c<=r;c++)breakBlock(bx+a,by+b,bz+c,power);shake=.35}else breakBlock(bx,by,bz,1);hit=true;break}}}
  if(!hit&&power>1)shake=.2}
function killMole(m){m.dead=true;scene.remove(m.g);coins+=5;combo++;comboT=2;toast(combo>1?'두더지 '+combo+'연속!':'두더지 퇴치! +5');if(combo>1)coins+=5*(combo-1);snd('power');burst(m.x,m.y+.4,m.z,'#8a6a5a',10);if(Math.random()<.6)cave.nanas.push({x:m.x,y:m.y+1,z:m.z})}
const R=.32,HT=1.7;
function punchDown(){pl.punchT=.25;snd('slash');const by=Math.floor(pl.y-.1),done=new Set();const r=bananza>0?1:0;
  for(let a=-r;a<=r;a++)for(let c=-r;c<=r;c++)for(const dx of [-R,R])for(const dz of [-R,R]){const bx=Math.floor(pl.x+dx)+a,bz=Math.floor(pl.z+dz)+c,k=bx+','+bz;if(done.has(k))continue;done.add(k);breakBlock(bx,by,bz,pl.charge>=PS.charge||bananza>0?3:1)}
  for(const m of moles)if(!m.dead&&Math.hypot(m.x-pl.x,m.z-pl.z)<2.4&&Math.abs(m.y-pl.y)<1.2){m.hp-=1;m.hit=.4;m.vy=5;if(m.hp<=0)killMole(m)}}
function releasePunch(){if(state!=='play'||paused)return;const p=pl.charge>=PS.charge?3:1;pl.charge=0;$('chargeBar').classList.remove('on');punch(p)}

// ---------- 들어서 던지기
function grab(){if(state!=='play'||paused)return;if(held){throwIt();return}const fx_=Math.sin(pl.face),fz=Math.cos(pl.face);
  for(let s=.6;s<=1.8;s+=.3)for(const hy of [pl.y+.4,pl.y+1.2,pl.y-.4]){const bx=Math.floor(pl.x+fx_*s),by=Math.floor(hy),bz=Math.floor(pl.z+fz*s);const t=get(bx,by,bz);if(t&&t!==6){
      const i=idx(bx,by,bz);grid[i]=0;dirty=true;const it=items.get(i);if(it){items.delete(i);if(it==='gb'){const g=cave.gold.find(g=>g.i===i);if(g){g.buried=false;g.x=bx+.5;g.y=by+.5;g.z=bz+.5;g.m.position.set(g.x,g.y,g.z)}}else pick.push({kind:it,x:bx+.5,y:by+.5,z:bz+.5,vy:4,m:itemMesh(it),t:0})}
      const m=cube(LV.colors[t],1.1,1.1,1.1,0,0,0);held={m,t};snd('power');toast('번쩍! 다시 누르면 던져요');return}}
  toast('앞에 들 수 있는 블록이 없어요')}
function throwIt(){const fx_=Math.sin(pl.face),fz=Math.cos(pl.face);throwns.push({m:held.m,t:held.t,x:pl.x+fx_*.8,y:pl.y+2.4,z:pl.z+fz*.8,vx:fx_*14,vy:3,vz:fz*14,life:2});held=null;snd('whoosh');pl.punchT=.25}
function updThrown(dt){for(let i=throwns.length-1;i>=0;i--){const t=throwns[i];t.life-=dt;t.vy-=14*dt;t.x+=t.vx*dt;t.y+=t.vy*dt;t.z+=t.vz*dt;t.m.position.set(t.x,t.y,t.z);t.m.rotation.x+=dt*8;let boom=t.life<=0;
    for(const m of moles)if(!m.dead&&Math.hypot(m.x-t.x,m.y+.4-t.y,m.z-t.z)<1.2){killMole(m);boom=true}
    for(const b of bats)if(!b.dead&&Math.hypot(b.x-t.x,b.y-t.y,b.z-t.z)<1.2){killBat(b);boom=true}
    if(solidAt(t.x,t.y,t.z)){const bx=Math.floor(t.x),by=Math.floor(t.y),bz=Math.floor(t.z);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)breakBlock(bx+a,by+b,bz+c,3);boom=true;shake=.3}
    if(boom){burst(t.x,t.y,t.z,LV.colors[t.t],12);snd('boom');scene.remove(t.m);throwns.splice(i,1)}}
  if(held){held.m.position.set(pl.x,pl.y+2.5+(bananza>0?.6:0),pl.z);held.m.rotation.y=pl.face}}

// ---------- 바난자 변신
let meter=0,bananza=0;
function transform(){if(state!=='play'||paused||bananza>0||meter<D.bananza.need)return;bananza=D.bananza.time;meter=0;snd('level');shake=.5;toast('🦍 바난자 변신!!');burst(pl.x,pl.y+1,pl.z,'#ffd23f',20)}

// ---------- 두더지
function moleMesh(){const g=new THREE.Group();cube('#8a6a5a',.9,.75,1.1,0,.38,0,g);cube('#ffb0b0',.32,.22,.22,0,.48,.6,g);cube('#111',.12,.12,.05,-.2,.66,.56,g);cube('#111',.12,.12,.05,.2,.66,.56,g);cube('#f4f0e0',.14,.18,.05,-.07,.3,.58,g);cube('#f4f0e0',.14,.18,.05,.07,.3,.58,g);cube(glow('#ffd23f','#806000'),.7,.18,.7,0,.85,0,g);cube(glow('#fff6c0','#ffe080'),.18,.18,.12,0,.95,.3,g);scene.add(g);return g}
function spawnMoles(){for(const m of moles)if(m.g)scene.remove(m.g);moles=[];const rs=cave.rooms.slice(1);for(let i=0;i<LV.moles;i++){const r=rs[i%rs.length];const x=r.x+rand(-1.5,1.5),z=r.z+rand(-1.5,1.5);moles.push({g:moleMesh(),x,y:floorAt(x,z,WY-3),z,hx:r.x,hz:r.z,vx:0,vz:0,vy:0,hp:2,hit:0,dead:false,dir:Math.random()*6,t:rand(0,1)})}}
function updMoles(dt){for(const m of moles){if(m.dead)continue;m.t-=dt;m.hit=Math.max(0,m.hit-dt);const d=Math.hypot(pl.x-m.x,pl.z-m.z);
    if(m.t<=0){m.t=.6+Math.random();m.dir=d<7?Math.atan2(pl.x-m.x,pl.z-m.z):Math.atan2(m.hx+rand(-2,2)-m.x,m.hz+rand(-2,2)-m.z)}
    if(m.hit<=0){m.vx=Math.sin(m.dir)*2.1;m.vz=Math.cos(m.dir)*2.1}else{m.vx*=.92;m.vz*=.92}
    const ox=m.x,oz=m.z;moveBody(m,dt);if(m.x===ox&&m.z===oz&&m.ground&&m.hit<=0)m.vy=6;
    m.g.position.set(m.x,m.y+Math.abs(Math.sin(time*9+m.hx))*.1,m.z);m.g.rotation.y=m.dir;
    if(d<.9&&Math.abs(m.y-pl.y)<1.2){if(bananza>0){killMole(m);continue}if(pl.vy<-2&&pl.y>m.y+.3){killMole(m);pl.vy=8;continue}hurt()}}}

// ---------- 몸 움직이기
function blocked(x,y,z){for(const dx of [-R,R])for(const dz of [-R,R])for(const dy of [.002,HT*.5,HT-.05])if(solidAt(x+dx,y+dy,z+dz))return true;return false}
function moveBody(b,dt){b.ground=false;const nx=b.x+b.vx*dt;if(!blocked(nx,b.y,b.z))b.x=nx;else b.vx=0;
  const nz=b.z+b.vz*dt;if(!blocked(b.x,b.y,nz))b.z=nz;else b.vz=0;
  b.vy=Math.max(-22,b.vy-PS.gravity*dt);const ny=b.y+b.vy*dt;if(!blocked(b.x,ny,b.z))b.y=ny;else{if(b.vy<0){b.y=Math.floor(ny)+1;b.ground=true}b.vy=0}}
function hurt(){if(pl.inv>0||bananza>0)return;pl.hp--;pl.inv=1.4;pl.vy=6;snd('hurt');toast('아야!');shake=.25;if(pl.hp<=0)lose()}

// ---------- 진행
let shake=0,maxHp=PS.hp,finished=false,combo=0,comboT=0,camD=7;
function begin(i,keep){lvl=i;LV=D.levels[i];scene.background=new THREE.Color(LV.fog);scene.fog.color=new THREE.Color(LV.fog);lamp.color=new THREE.Color(LV.light);gen();makeInst();rebuild();placeThings();
  for(const p of pick)scene.remove(p.m);pick=[];for(const p of fx)scene.remove(p.m);fx=[];finished=false;bananza=0;
  if(!keep){maxHp=PS.hp;coins=0;nanas=0;gems=0;meter=0}pl.hp=maxHp;const S=cave.start;Object.assign(pl,{x:S.x,y:S.y+.1,z:S.z,vx:0,vy:0,vz:0,inv:1,charge:0});spawnMoles();
  cave.rooms.slice(1).filter((_,k)=>k%3===1).slice(0,3).forEach((r,k)=>torches[k].position.set(r.x,floorAt(r.x,r.z,WY-3)+3,r.z));
  yaw=Math.atan2(cave.rooms[1].x-S.x,cave.rooms[1].z-S.z);
  state='play';paused=false;for(const id of ['titleOv','endOv','pauseOv'])$(id).hidden=true;toast('지하 '+(i+1)+'층 · '+LV.name);snd('go')}
function update(dt){
  for(let i=timers0.length-1;i>=0;i--){timers0[i].t-=dt;if(timers0[i].t<=0){const f=timers0[i].fn;timers0.splice(i,1);f()}}
  const fx_=Math.sin(yaw),fz=Math.cos(yaw),rx=-fz,rz=fx_;
  let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x;
  if(keys.ArrowLeft)yaw+=1.8*dt;if(keys.ArrowRight)yaw-=1.8*dt;
  let mx=fx_*f+rx*s,mz=fz*f+rz*s;const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  const sp=PS.speed*(bananza>0?1.4:1);pl.vx=mx*sp;pl.vz=mz*sp;if(ml>.1)pl.face=Math.atan2(mx,mz);
  if(ml>.1&&pl.ground){const ax=pl.x+mx*.5,az=pl.z+mz*.5;if(blocked(ax,pl.y,az)&&!blocked(ax,pl.y+1.05,az)&&!blocked(pl.x,pl.y+1.05,pl.z))pl.vy=Math.max(pl.vy,6.5)}
  if(jumpQ&&pl.ground){pl.vy=PS.jump*(bananza>0?1.15:1);snd('jump')}jumpQ=false;
  if(ml>.1&&!pl.ground){const ax=pl.x+mx*.45,az=pl.z+mz*.45;if(blocked(ax,pl.y,az)){pl.vy=Math.max(pl.vy,4.2);pl.climb=true}else pl.climb=false}else pl.climb=false;
  if(ml>.1&&pl.ground){const ax=pl.x+mx*.45,az=pl.z+mz*.45;if(blocked(ax,pl.y,az)&&blocked(ax,pl.y+1.05,az))pl.vy=Math.max(pl.vy,4.2)}
  moveBody(pl,dt);
  if(punchHeld){pl.charge+=dt;if(pl.charge>.15){$('chargeBar').classList.add('on');$('chargeBar').querySelector('i').style.width=Math.min(100,pl.charge/PS.charge*100)+'%'}}
  if(downQ){downQ=false;punchDown()}
  pl.inv=Math.max(0,pl.inv-dt);pl.punchT=Math.max(0,pl.punchT-dt);comboT-=dt;if(comboT<=0)combo=0;
  if(bananza>0){bananza-=dt;if(bananza<=0)toast('변신이 풀렸어요')}
  updMoles(dt);if(state!=='play')return;updBats(dt);if(state!=='play')return;updThrown(dt);updThings(dt);if(state!=='play')return;
  for(let i=pick.length-1;i>=0;i--){const p=pick[i];p.t+=dt;p.vy-=12*dt;const ny=p.y+p.vy*dt;if(solidAt(p.x,ny-.3,p.z)){p.vy=0}else p.y=ny;p.m.position.set(p.x,p.y+Math.sin(time*3)*.1,p.z);p.m.rotation.y+=dt*2;
    if(p.t>.3&&Math.hypot(p.x-pl.x,p.z-pl.z)<1.3&&Math.abs(p.y-(pl.y+.8))<1.8){scene.remove(p.m);pick.splice(i,1);if(p.kind==='gem'){gems++;snd('coin');if(gems%10===0){maxHp=Math.min(8,maxHp+1);pl.hp=maxHp;toast('보석 '+gems+'개! 하트 +1')}}else gotNana()}}
  for(let i=fx.length-1;i>=0;i--){const p=fx[i];p.t-=dt;p.vy-=14*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;if(p.t<=0){scene.remove(p.m);fx.splice(i,1)}}
  if(dirty)rebuild();
  G.position.set(pl.x,pl.y,pl.z);G.scale.setScalar(bananza>0?.8:.55);let dd=pl.face-G.rotation.y;dd=Math.atan2(Math.sin(dd),Math.cos(dd));G.rotation.y+=dd*Math.min(1,dt*14);
  pl.phase+=dt*ml*10;const w=pl.ground?Math.sin(pl.phase)*Math.min(1,ml):0;legL.rotation.x=w*.7;legR.rotation.x=-w*.7;
  armR.rotation.x=held?-3:pl.climb?-2.8:pl.punchT>0?-1.6:punchHeld?-.5:-w*.6;armL.rotation.x=held?-3:pl.punchT>0&&pl.charge===0?-1.6:w*.6;Gb.visible=!(pl.inv>0&&bananza<=0&&Math.floor(time*12)%2);
  lamp.position.set(pl.x,pl.y+3,pl.z);lamp.intensity=bananza>0?2.4:1.5;
  setT($('hearts'),'♥'.repeat(Math.max(0,pl.hp))+'♡'.repeat(Math.max(0,maxHp-pl.hp)));setT($('gold'),collected()+'/'+cave.gold.length);setT($('gems'),gems);setT($('nanas'),nanas);setT($('coins'),coins);
  const mb=$('meter');mb.querySelector('i').style.width=(bananza>0?bananza/D.bananza.time*100:meter/D.bananza.need*100)+'%';mb.classList.toggle('full',meter>=D.bananza.need&&bananza<=0);mb.classList.toggle('on',bananza>0);$('tBana').classList.toggle('ready',meter>=D.bananza.need&&bananza<=0)}
function clearLevel(){state='clear';snd('win');const c=collected(),all=c>=cave.gold.length;if(lvl+1>save.best)save.best=lvl+1;save.gold[lvl]=Math.max(save.gold[lvl]||0,c);store();if(window.Arcade)Arcade.record('digKongDepth',save.best);
  setT($('eTitle'),lvl+1>=D.levels.length?'🎉 동굴 끝까지 왔어요!':'지하 '+(lvl+1)+'층 탈출!');$('eTxt').innerHTML=`황금 바나나 ${c}/${cave.gold.length}${all?' 🌟 모두 찾았어요!':''}<br>보석 ${gems} · 바나나 ${nanas} · 금화 ${coins}`;
  $('nextBtn').hidden=lvl+1>=D.levels.length;$('retryBtn').hidden=false;setTimeout(()=>$('endOv').hidden=false,700)}
function lose(){state='over';snd('lose');setT($('eTitle'),'쾅쾅이가 지쳤어요');$('eTxt').textContent=`지하 ${lvl+1}층 · 황금 바나나 ${collected()}개`;$('nextBtn').hidden=true;$('retryBtn').hidden=false;setTimeout(()=>$('endOv').hidden=false,600)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}
// 카메라: 벽에 막히면 가까이
function camPlace(px,py,pz,dd){const cp=Math.cos(pitch);const tx=px-Math.sin(yaw)*cp*dd,ty=py+1.5+Math.sin(pitch)*dd,tz=pz-Math.cos(yaw)*cp*dd;let k=1;
  for(let s=.1;s<=1;s+=.05){const x=px+(tx-px)*s,y=py+1.6+(ty-py-1.6)*s,z=pz+(tz-pz)*s;if(solidAt(x,y,z)){k=Math.max(.08,s-.08);break}}
  camD+=((dd*k)-camD)*.25;const kk=camD/dd;camera.position.set(px+(tx-px)*kk,py+1.6+(ty-py-1.6)*kk,pz+(tz-pz)*kk)}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused){time+=dt;if(state==='play')update(dt);else if(state==='title')yaw+=dt*.15}
  shake=Math.max(0,shake-dt);const title=state==='title';
  if(title){const r=cave.rooms[0];camera.position.set(r.x-Math.sin(yaw)*5,6,r.z-Math.cos(yaw)*5);camera.lookAt(r.x,3,r.z);lamp.position.set(r.x,5,r.z)}
  else{camPlace(pl.x,pl.y,pl.z,dist);camera.position.x+=(Math.random()-.5)*shake;camera.lookAt(pl.x,pl.y+1.2,pl.z)}
  renderer.render(scene,camera)}
function toTitle(){state='title';for(const id of ['pauseOv','endOv'])$(id).hidden=true;if(!LV){LV=D.levels[0];gen();makeInst();rebuild();placeThings()}
  const l=$('lvls');l.innerHTML='';D.levels.forEach((L,i)=>{const b=document.createElement('button');b.disabled=i>save.best;b.textContent='지하 '+(i+1)+'층 · '+L.name;const s=document.createElement('small');s.textContent=save.gold[i]?'🍌'+save.gold[i]+'/'+L.gold:'';b.appendChild(s);b.onclick=()=>{snd('select');begin(i)};l.appendChild(b)});$('titleOv').hidden=false}
addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='KeyG'||e.code==='KeyL')grab();if(e.code==='KeyV'||e.code==='KeyB')transform()});
hold('tGrab',grab);hold('tBana',transform);
$('nextBtn').onclick=()=>{snd('click');begin(lvl+1,true)};$('retryBtn').onclick=()=>{snd('click');begin(lvl)};$('eMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__dk={pl,get state(){return state},begin,punch,punchDown,grab,transform,get items(){return items},get gems(){return gems},get:get,keys,get moles(){return moles},get cave(){return cave},get coins(){return coins},set jumpQ(v){jumpQ=v},set yaw(v){yaw=v},collected,get meter(){return meter},get bananza(){return bananza},get held(){return held}};
});
