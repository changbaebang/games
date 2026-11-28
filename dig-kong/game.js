/* 파고파고 고릴라 — 앞으로 쭉 이어진 길을 주먹으로 뚫고 달리는 모험. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches,PS=D.player,SAVE='digKong.save';
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a);
const save=Object.assign({best:0,stars:{}},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#8fd8ff');scene.fog=new THREE.Fog(0x8fd8ff,26,60);
const camera=new THREE.PerspectiveCamera(60,W()/H(),.1,200);
scene.add(new THREE.HemisphereLight(0xffffff,0x6a5a4a,.8));const sun=new THREE.DirectionalLight(0xffffff,.6);sun.position.set(-20,40,10);scene.add(sun);
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?76:60;camera.updateProjectionMatrix();renderer.setSize(W(),H())}addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1),mc={};const lam=c=>mc[c]||(mc[c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
function cube(c,w,h,d,x,y,z,par){const k=new THREE.Mesh(BOX,typeof c==='string'?lam(c):c);k.scale.set(w,h,d);k.position.set(x,y,z);(par||scene).add(k);return k}
const glow=(c,e)=>new THREE.MeshLambertMaterial({color:new THREE.Color(c),emissive:new THREE.Color(e)});

// ---------- 블록 세계 (앞으로 쭉 이어진 길)
const [WX,WY]=D.world;let WZ=80;
let grid=new Uint8Array(1),hp=new Uint8Array(1),items=new Map(),inst={},dirty=true,LV=null,lvl=0;
const idx=(x,y,z)=>(y*WZ+z)*WX+x,inside=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<WX&&y<WY&&z<WZ;
const get=(x,y,z)=>inside(x,y,z)?grid[idx(x,y,z)]:0;
const solidAt=(x,y,z)=>{const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);if(zi<0)return true;if(xi<0||xi>=WX||zi>=WZ)return false;if(yi<0)return false;return get(xi,yi,zi)>0};
const M4=new THREE.Matrix4();
function makeInst(){for(const k in inst)scene.remove(inst[k]);inst={};const n=WX*WY*WZ;
  for(let t=1;t<=7;t++){const mat=t===5?glow(LV.colors[5],'#6a4a00'):t===7?glow(LV.colors[7],'#5a1000'):lam(LV.colors[t]);const m=new THREE.InstancedMesh(BOX,mat,Math.min(n,12000));m.count=0;scene.add(m);inst[t]=m}}
function rebuild(){const cnt={1:0,2:0,3:0,4:0,5:0,6:0,7:0};
  for(let y=0;y<WY;y++)for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const t=grid[idx(x,y,z)];if(!t)continue;
    if(get(x+1,y,z)&&get(x-1,y,z)&&get(x,y+1,z)&&get(x,y-1,z)&&get(x,y,z+1)&&get(x,y,z-1))continue;
    if(cnt[t]>=inst[t].instanceMatrix.count&&inst[t].instanceMatrix.count)continue;
    const s=hp[idx(x,y,z)]<(D.blocks[t].hp||1)?.9:1;M4.makeScale(s,s,s);M4.setPosition(x+.5,y+.5,z+.5);inst[t].setMatrixAt(cnt[t]++,M4)}
  for(const t in cnt){inst[t].count=cnt[t];inst[t].instanceMatrix.needsUpdate=true}dirty=false}

// 길 만들기
let course=null;
function gen(){const toks=[...LV.course.matchAll(/([A-Z])(\d*)/g)].map(m=>[m[1],+m[2]||1]);
  let len=4;for(const [k,n] of toks){if('FUDGTN'.includes(k))len+=k==='U'||k==='D'?n*2:n;else if('WRXLCO'.includes(k))len+=1;else if(k==='E')len+=8}
  WZ=len+2;grid=new Uint8Array(WX*WY*WZ);hp=new Uint8Array(WX*WY*WZ);items.clear();
  const C={coins:[],nanas:[],letters:[],gems:[],barrels:[],checks:[{z:1.5,y:0}],moles:[],beams:[],goal:null,hAt:new Int8Array(WZ).fill(-1)};
  const X0=4,X1=12,MID=8.5;let z=0,h=5,li=0;
  const set=(x,y,zz,t)=>{if(!inside(x,y,zz))return;const i=idx(x,y,zz);grid[i]=t;hp[i]=D.blocks[t].hp||1};
  const col=(zz,hh,x0=X0,x1=X1)=>{for(let x=x0;x<=x1;x++)for(let y=0;y<=hh;y++){let t=y===0?6:y===hh?1:y>=hh-2?2:3;if(t===3&&Math.random()<LV.rock)t=4;if(t===3&&Math.random()<LV.gold)t=5;set(x,y,zz,t)}C.hAt[zz]=hh};
  const nana=(x,y,zz)=>C.nanas.push({x,y,z:zz});
  const flat=n=>{for(let k=0;k<n;k++){col(z,h);if(z%2===0)nana(MID+Math.sin(z*.35)*2.2,h+1.6,z+.5);z++}};
  col(0,h);col(1,h);col(2,h);col(3,h);z=4;
  for(const [k,n] of toks){
    if(k==='F')flat(n);
    else if(k==='U'||k==='D'){for(let i=0;i<n;i++){h=Math.max(2,Math.min(WY-7,h+(k==='U'?1:-1)));col(z,h);col(z+1,h);nana(MID,h+1.6,z+1);z+=2}}
    else if(k==='G'){for(let i=0;i<n;i++){nana(MID,h+1.8+Math.sin(Math.PI*(i+1)/(n+1))*1.6,z+.5);z++}}
    else if(k==='N'){for(let i=0;i<n;i++){col(z,h,8,9);for(let x=X0;x<=X1;x++)if(x<8||x>9)for(let y=0;y<h;y++)if(y<1)set(x,y,z,6);nana(9,h+1.6,z+.5);z++}}
    else if(k==='W'||k==='R'){col(z,h);for(let x=X0;x<=X1;x++)for(let y=h+1;y<=h+3;y++){let t=k==='R'?4:2;if(Math.random()<.18)t=5;set(x,y,z,t)}z++}
    else if(k==='T'){for(let i=0;i<n;i++){col(z,h);for(let x=X0;x<=X1;x++)for(let y=h+1;y<=h+4;y++){let t=y===h+4?1:Math.random()<.2?3:2;if(Math.random()<.12)t=5;set(x,y,z,t)}if(i===Math.floor(n/2))for(let y=h+1;y<=h+3;y++)items.set(idx(MID|0,y,z),'nana');z++}}
    else if(k==='X'){col(z,h);const gx=X0+1+Math.floor(Math.random()*(X1-X0-1));set(gx,h,z,7);const gi=idx(gx,h-2,z);items.set(gi,'gem');C.gems.push({x:gx,y:h-2,z});C.beams.push({x:gx+.5,y:h+1,z:z+.5,i:gi});z++}
    else if(k==='L'){col(z,h);C.letters.push({x:MID,y:h+2.3,z:z+.5,ch:D.letters[li%D.letters.length],got:false});li++;z++}
    else if(k==='O'){col(z,h);for(let a=0;a<8;a++)C.coins.push({x:MID+Math.cos(a/8*6.28)*1.4,y:h+2.6+Math.sin(a/8*6.28)*1.4,z:z+.5});z++}
    else if(k==='C'){col(z,h);C.checks.push({z:z+.5,y:h+1,mesh:null});z++}
    else if(k==='M'){C.moles.push({z,h,n})}
    else if(k==='B'){C.barrels.push({z:z+6,h,t:0})}
    else if(k==='E'){for(let i=0;i<8;i++)col(z+i,h);C.goal={x:MID,y:h+1,z:z+5};z+=8}}
  // 바닥 길 양옆에 작은 섬 장식
  course=C}

// ---------- 고릴라와 물건들
// ---------- 고릴라
function limb(w,h,d,c,x,y,par){const p=new THREE.Group();p.position.set(x,y,0);cube(c,w,h,d,0,-h/2,0,p);par.add(p);return p}
const G=new THREE.Group(),Gb=new THREE.Group();G.add(Gb);scene.add(G);G.scale.setScalar(.55);
cube('#6a4428',1.5,1.3,1,0,1.9,0,Gb);cube('#d8a878',1,.8,.1,0,1.85,.5,Gb);cube('#6a4428',1,.9,.9,0,2.9,.1,Gb);cube('#d8a878',.8,.5,.3,0,2.75,.55,Gb);
cube('#111',.15,.15,.05,-.2,3.05,.56,Gb);cube('#111',.15,.15,.05,.2,3.05,.56,Gb);cube('#ff5a2a',.5,.12,.6,0,3.4,.1,Gb);
const legL=limb(.5,1.1,.6,'#5a3820',-.4,1.2,Gb),legR=limb(.5,1.1,.6,'#5a3820',.4,1.2,Gb);
const armL=limb(.55,1.5,.6,'#6a4428',-1,2.5,Gb),armR=limb(.55,1.5,.6,'#6a4428',1,2.5,Gb);cube('#d8a878',.6,.5,.6,0,-1.6,0,armR);cube('#d8a878',.6,.5,.6,0,-1.6,0,armL);
const pl={x:12,y:12,z:12,vx:0,vy:0,vz:0,face:0,ground:false,hp:PS.hp,inv:0,punchT:0,charge:0,phase:0};
let moles=[],pick=[],fx=[],gems=0,nanas=0,coins=0,state='title',paused=false,time=0,yaw=0,pitch=.55,dist=9;

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

// ---------- 반짝이는 물건 (인스턴스로 한꺼번에)
const COIN_G=new THREE.CylinderGeometry(.32,.32,.08,14),NANA_G=new THREE.BoxGeometry(.22,.62,.22);
const RX90=new THREE.Matrix4().makeRotationX(Math.PI/2);let coinM=null,nanaM=null,beamM=[],letterM=[],checkM=[],goalM=null,barrels=[],markers=[];
const coinMat=glow('#ffd23f','#a07000'),nanaMat=glow('#ffe14a','#6a5a00');
function letterTex(ch,on){const k=document.createElement('canvas');k.width=k.height=64;const g=k.getContext('2d');g.fillStyle=on?'#ffd23f':'#ffe9a0';g.beginPath();g.arc(32,32,30,0,7);g.fill();g.strokeStyle='#c08a10';g.lineWidth=5;g.stroke();g.fillStyle='#7a4a00';g.font='bold 38px Jua,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ch,32,35);return new THREE.CanvasTexture(k)}
function placeThings(){for(const m of [coinM,nanaM,goalM,...beamM,...letterM,...checkM])if(m)scene.remove(m);for(const b of barrels)scene.remove(b.m);barrels=[];
  const C=course;coinM=new THREE.InstancedMesh(COIN_G,coinMat,Math.max(1,C.coins.length));nanaM=new THREE.InstancedMesh(NANA_G,nanaMat,Math.max(1,C.nanas.length));scene.add(coinM);scene.add(nanaM);
  beamM=C.beams.map(b=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,14,10,1,true),new THREE.MeshBasicMaterial({color:0xd07aff,transparent:true,opacity:.28,depthWrite:false}));m.position.set(b.x,b.y+7,b.z);scene.add(m);return m});
  letterM=C.letters.map(L=>{const m=new THREE.Mesh(new THREE.PlaneGeometry?new THREE.PlaneGeometry(1.1,1.1):BOX,new THREE.MeshBasicMaterial({map:letterTex(L.ch,true),transparent:true,side:THREE.DoubleSide}));m.position.set(L.x,L.y,L.z);scene.add(m);return m});
  checkM=C.checks.slice(1).map(c=>{const g=new THREE.Group();cube('#e8e8e8',.12,2.2,.12,0,1.1,0,g);const f=cube('#ff5a5a',.05,.6,.9,0,1.9,.45,g);g.flag=f;g.position.set(5,c.y,c.z);scene.add(g);return g});
  if(C.goal){goalM=new THREE.Group();cube('#c89a5a',2,.6,2,0,.3,0,goalM);const b1=cube(glow('#ffe14a','#8a6a00'),.6,2.2,.6,0,2,0,goalM);b1.rotation.z=.4;const b2=cube(glow('#ffe14a','#8a6a00'),.55,1.6,.55,.55,2.4,0,goalM);b2.rotation.z=-.3;goalM.position.set(C.goal.x,C.goal.y,C.goal.z);scene.add(goalM)}}
function updThings(dt){const C=course;let n=0;
  for(const c of C.coins){if(c.got)continue;M4.makeRotationY(time*3+c.z).multiply(RX90);M4.setPosition(c.x,c.y+Math.sin(time*2+c.x)*.08,c.z);coinM.setMatrixAt(n++,M4)}coinM.count=n;coinM.instanceMatrix.needsUpdate=true;
  n=0;for(const b of C.nanas){if(b.got)continue;M4.makeRotationY(time*2+b.z);M4.setPosition(b.x,b.y+Math.sin(time*3+b.z)*.12,b.z);nanaM.setMatrixAt(n++,M4)}nanaM.count=n;nanaM.instanceMatrix.needsUpdate=true;
  C.letters.forEach((L,i)=>{const m=letterM[i];if(!m)return;m.visible=!L.got;m.rotation.y=time*2;m.position.y=L.y+Math.sin(time*2)*.15});
  C.beams.forEach((b,i)=>{beamM[i].visible=items.get(b.i)==='gem';beamM[i].material.opacity=.18+Math.abs(Math.sin(time*2))*.15});
  if(goalM){goalM.rotation.y=time;goalM.position.y=C.goal.y+Math.sin(time*2)*.15}
  checkM.forEach((g,i)=>{g.flag.material=lam(i<lastCheck?'#4ac45a':'#ff5a5a')});
  // 먹기
  const px=pl.x,py=pl.y+.9,pz=pl.z;const near=(o,r)=>Math.abs(o.z-pz)<r&&Math.abs(o.x-px)<r&&Math.abs(o.y-py)<r+.5;
  for(const c of C.coins)if(!c.got&&near(c,1.2)){c.got=true;coins++;snd('coin')}
  for(const b of C.nanas)if(!b.got&&near(b,1.1)){b.got=true;gotNana()}
  C.letters.forEach(L=>{if(!L.got&&near(L,1.2)){L.got=true;snd('level');toast('금글자 「'+L.ch+'」!');letters()}});
  if(C.goal&&!finished&&Math.abs(pz-C.goal.z)<1.6&&Math.abs(px-C.goal.x)<2){finished=true;clearLevel()}
  for(let i=1;i<C.checks.length;i++)if(i>lastCheck&&pz>C.checks[i].z){lastCheck=i;toast('중간 깃발!');snd('power')}}
function gotNana(){nanas++;snd('coin');if(pl.hp<maxHp){pl.hp++}if(nanas%25===0){maxHp=Math.min(8,maxHp+1);pl.hp=maxHp;toast('바나나 '+nanas+'개! 하트 +1');snd('level')}}
function letters(){const el=$('letters');el.innerHTML='';for(const L of course.letters){const s=document.createElement('i');s.textContent=L.ch;if(L.got)s.className='on';el.appendChild(s)}}

// ---------- 굴러오는 통
function updBarrels(dt){for(const B of course.barrels){if(Math.abs(B.z-pl.z)>22||pl.z>B.z)continue;B.t-=dt;if(B.t<=0){B.t=D.barrel.every;const g=new THREE.Group();const c=cube('#8a5a2a',1.1,1.1,1.1,0,0,0,g);cube('#5a3a1a',1.15,.12,1.15,0,.3,0,g);cube('#5a3a1a',1.15,.12,1.15,0,-.3,0,g);g.position.set(rand(5.5,11.5),B.h+1.6,B.z);scene.add(g);barrels.push({m:g,x:g.position.x,y:B.h+1.6,z:B.z,vy:0,rot:0})}}
  for(let i=barrels.length-1;i>=0;i--){const b=barrels[i];b.z-=D.barrel.speed*dt;b.vy-=20*dt;let ny=b.y+b.vy*dt;if(solidAt(b.x,ny-.55,b.z)){b.vy=0;ny=Math.floor(ny-.55)+1.55}b.y=ny;
    if(solidAt(b.x,b.y,b.z-.6)){b.y+=1;}b.rot+=dt*D.barrel.speed*1.8;b.m.position.set(b.x,b.y,b.z);b.m.rotation.x=-b.rot;
    const hit=Math.abs(b.x-pl.x)<.9&&Math.abs(b.z-pl.z)<.9&&pl.y<b.y+.3&&pl.y+1.6>b.y-.55;
    if(hit){if(pl.vy<-1&&pl.y>b.y){burst(b.x,b.y,b.z,'#8a5a2a',10);scene.remove(b.m);barrels.splice(i,1);pl.vy=8;coins+=3;snd('pop');toast('통 쾅! +3');continue}hurt()}
    if(b.y<-6||b.z<-1){scene.remove(b.m);barrels.splice(i,1)}}}
function smashBarrels(){const fx_=Math.sin(pl.face),fz=Math.cos(pl.face);for(let i=barrels.length-1;i>=0;i--){const b=barrels[i];const dx=b.x-pl.x,dz=b.z-pl.z;if(Math.hypot(dx,dz)<2.2&&Math.abs(b.y-pl.y-.6)<1.5&&dx*fx_+dz*fz>-.3){burst(b.x,b.y,b.z,'#8a5a2a',10);scene.remove(b.m);barrels.splice(i,1);course.nanas.push({x:b.x,y:b.y,z:b.z});coins+=3;snd('pop');toast('통 쾅! +3')}}}

// ---------- 부수기
function breakBlock(x,y,z,dmg){if(!inside(x,y,z))return false;const i=idx(x,y,z),t=grid[i];if(!t||t===6)return false;
  hp[i]=Math.max(0,hp[i]-dmg);dirty=true;
  if(hp[i]>0){snd('thud');burst(x+.5,y+.5,z+.5,LV.colors[t],3);return true}
  grid[i]=0;burst(x+.5,y+.5,z+.5,LV.colors[t],t===5?14:8);snd(t>=3?'crack':'pop');
  const c=D.blocks[t].coin;if(c){if(t===5){for(let k=0;k<4;k++)course.coins.push({x:x+.5+rand(-.6,.6),y:y+.8+rand(0,.8),z:z+.5+rand(-.6,.6)});toast('금광석! 금화가 와르르')}else coins+=c}
  if(t===7)toast('보석이 가까워요! 더 파요');
  const it=items.get(i);if(it){items.delete(i);pick.push({kind:it,x:x+.5,y:y+.5,z:z+.5,vy:5,m:itemMesh(it),t:0})}return true}
function itemMesh(k){const g=new THREE.Group();scene.add(g);if(k==='gem'){const m=cube(glow('#c070ff','#7a2acc'),.6,.6,.6,0,0,0,g);m.rotation.set(.6,.6,0)}else{cube(nanaMat,.25,.7,.25,0,0,0,g).rotation.z=.5}return g}
function burst(x,y,z,col,n){for(let i=0;i<n;i++){if(fx.length>110)break;const m=cube(col,.18,.18,.18,x+(Math.random()-.5)*.6,y+(Math.random()-.5)*.6,z+(Math.random()-.5)*.6);fx.push({m,vx:(Math.random()-.5)*5,vy:Math.random()*5,vz:(Math.random()-.5)*5,t:.6})}}
function punch(power){
  pl.punchT=.25;const fx_=Math.sin(pl.face),fz=Math.cos(pl.face);let hit=false;snd(power>1?'boom':'slash');smashBarrels();
  for(const m of moles){if(m.dead)continue;const dx=m.x-pl.x,dz=m.z-pl.z,d=Math.hypot(dx,dz)||.01;if(d<PS.punch+.7&&Math.abs(m.y-pl.y)<1.6&&(dx*fx_+dz*fz)>-.3){m.hp-=power;m.hit=.3;m.vx=dx/d*7;m.vz=dz/d*7;m.vy=4;if(m.hp<=0)killMole(m);hit=true}}
  for(let s=.6;s<=PS.punch&&!hit;s+=.3){const px=pl.x+fx_*s,pz=pl.z+fz*s;for(const hy of [pl.y+.4,pl.y+1.2,pl.y-.4]){const bx=Math.floor(px),by=Math.floor(hy),bz=Math.floor(pz);if(get(bx,by,bz)){
      if(power>1){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)breakBlock(bx+a,by+b,bz+c,power);shake=.4}else breakBlock(bx,by,bz,1);hit=true;break}}}
  if(!hit&&power>1)shake=.2}
function killMole(m){m.dead=true;scene.remove(m.g);coins+=5;combo++;comboT=2;toast(combo>1?'두더지 '+combo+'연속! +'+(5*combo):'두더지 퇴치! +5');if(combo>1)coins+=5*(combo-1);snd('power');burst(m.x,m.y+.4,m.z,'#8a6a5a',10);if(Math.random()<.5)course.nanas.push({x:m.x,y:m.y+1,z:m.z})}
const R=.32,HT=1.7;
function punchDown(){pl.punchT=.25;snd('slash');const by=Math.floor(pl.y-.1),done=new Set();for(const dx of [-R,R])for(const dz of [-R,R]){const bx=Math.floor(pl.x+dx),bz=Math.floor(pl.z+dz),k=bx+','+bz;if(done.has(k))continue;done.add(k);breakBlock(bx,by,bz,pl.charge>=PS.charge?3:1)}
  // 쿵 내려찍기: 근처 두더지 기절
  for(const m of moles)if(!m.dead&&Math.hypot(m.x-pl.x,m.z-pl.z)<2.2&&Math.abs(m.y-pl.y)<1.2){m.hp-=1;m.hit=.4;m.vy=5;if(m.hp<=0)killMole(m)}}
function releasePunch(){if(state!=='play'||paused)return;const p=pl.charge>=PS.charge?3:1;pl.charge=0;$('chargeBar').classList.remove('on');punch(p)}

// ---------- 두더지
function moleMesh(){const g=new THREE.Group();cube('#8a6a5a',.9,.75,1.1,0,.38,0,g);cube('#ffb0b0',.32,.22,.22,0,.48,.6,g);cube('#111',.12,.12,.05,-.2,.66,.56,g);cube('#111',.12,.12,.05,.2,.66,.56,g);cube('#f4f0e0',.14,.18,.05,-.07,.3,.58,g);cube('#f4f0e0',.14,.18,.05,.07,.3,.58,g);cube('#ffd23f',.7,.18,.7,0,.85,0,g);scene.add(g);return g}
function spawnMoles(){for(const m of moles)if(m.g)scene.remove(m.g);moles=[];for(const s of course.moles)for(let i=0;i<s.n;i++){const x=rand(5,12),z=s.z+1+i*1.6+rand(0,1);moles.push({g:moleMesh(),x,y:s.h+1,z,home:z,vx:0,vz:0,vy:0,hp:D.mole.hp,hit:0,dead:false,dir:Math.PI,t:rand(0,1),hide:0})}}
function updMoles(dt){for(const m of moles){if(m.dead)continue;if(Math.abs(m.z-pl.z)>26){m.g.visible=false;continue}m.g.visible=true;m.t-=dt;m.hit=Math.max(0,m.hit-dt);const d=Math.hypot(pl.x-m.x,pl.z-m.z);
    if(m.t<=0){m.t=.6+Math.random();if(d<D.mole.chase)m.dir=Math.atan2(pl.x-m.x,pl.z-m.z);else m.dir=Math.atan2(rand(5,12)-m.x,m.home+rand(-2,2)-m.z)}
    if(m.hit<=0){m.vx=Math.sin(m.dir)*D.mole.speed;m.vz=Math.cos(m.dir)*D.mole.speed}else{m.vx*=.92;m.vz*=.92}
    // 길 밖으로 안 떨어지게
    if(!solidAt(m.x+m.vx*.3,m.y-.5,m.z+m.vz*.3)&&m.ground){m.vx=-m.vx;m.vz=-m.vz;m.dir+=Math.PI}
    const ox=m.x,oz=m.z;moveBody(m,dt);if(m.x===ox&&m.z===oz&&m.ground&&m.hit<=0)m.vy=6;if(m.y<-4){m.dead=true;scene.remove(m.g);continue}
    m.g.position.set(m.x,m.y+Math.abs(Math.sin(time*9+m.home))*.1,m.z);m.g.rotation.y=m.dir;
    if(d<.85&&Math.abs(m.y-pl.y)<1.2){if(pl.vy<-2&&pl.y>m.y+.3){killMole(m);pl.vy=8;continue}hurt()}}}

// ---------- 몸 움직이기(블록 충돌)
function blocked(x,y,z){for(const dx of [-R,R])for(const dz of [-R,R])for(const dy of [.002,HT*.5,HT-.05])if(solidAt(x+dx,y+dy,z+dz))return true;return false}
function moveBody(b,dt){b.ground=false;const nx=b.x+b.vx*dt;if(!blocked(nx,b.y,b.z))b.x=nx;else b.vx=0;
  const nz=b.z+b.vz*dt;if(!blocked(b.x,b.y,nz))b.z=nz;else b.vz=0;
  b.vy=Math.max(-22,b.vy-PS.gravity*dt);const ny=b.y+b.vy*dt;if(!blocked(b.x,ny,b.z))b.y=ny;else{if(b.vy<0){b.y=Math.floor(ny)+1;b.ground=true}b.vy=0}}
function hurt(){if(pl.inv>0)return;pl.hp--;pl.inv=1.4;pl.vy=6;snd('hurt');toast('아야!');shake=.25;if(pl.hp<=0)lose()}
function respawn(){const c=course.checks[lastCheck];pl.x=8.5;pl.z=c.z;pl.y=(c.y||course.hAt[Math.floor(c.z)]+1||8)+1;pl.vx=pl.vy=pl.vz=0;pl.inv=1.5;yaw=0}

// ---------- 진행
let shake=0,lastCheck=0,maxHp=PS.hp,finished=false,combo=0,comboT=0,idleCam=0;
function begin(i,keep){lvl=i;LV=D.levels[i];scene.background=new THREE.Color(LV.sky);scene.fog.color=new THREE.Color(LV.sky);gen();makeInst();rebuild();placeThings();
  for(const p of pick)scene.remove(p.m);pick=[];for(const p of fx)scene.remove(p.m);fx=[];lastCheck=0;finished=false;
  course.checks[0].y=course.hAt[1]+1;if(!keep){maxHp=PS.hp;coins=0;nanas=0}pl.hp=maxHp;respawn();pl.inv=0;spawnMoles();gems=0;letters();
  state='play';paused=false;for(const id of ['titleOv','endOv','pauseOv'])$(id).hidden=true;toast((i+1)+'단계 · '+LV.name);snd('go')}
function update(dt){
  const fx_=Math.sin(yaw),fz=Math.cos(yaw),rx=-fz,rz=fx_;
  let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x;
  if(keys.ArrowLeft)yaw+=1.8*dt;if(keys.ArrowRight)yaw-=1.8*dt;
  let mx=fx_*f+rx*s,mz=fz*f+rz*s;const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  pl.vx=mx*PS.speed;pl.vz=mz*PS.speed;if(ml>.1)pl.face=Math.atan2(mx,mz);
  if(ml>.1&&pl.ground){const ax=pl.x+mx*.5,az=pl.z+mz*.5;if(blocked(ax,pl.y,az)&&!blocked(ax,pl.y+1.05,az)&&!blocked(pl.x,pl.y+1.05,pl.z))pl.vy=Math.max(pl.vy,6.5)}
  if(jumpQ&&pl.ground){pl.vy=PS.jump;snd('jump')}jumpQ=false;
  if(ml>.1&&!pl.ground){const ax=pl.x+mx*.45,az=pl.z+mz*.45;if(blocked(ax,pl.y,az)){pl.vy=Math.max(pl.vy,4.2);pl.climb=true}else pl.climb=false}else pl.climb=false;
  if(ml>.1&&pl.ground){const ax=pl.x+mx*.45,az=pl.z+mz*.45;if(blocked(ax,pl.y,az)&&blocked(ax,pl.y+1.05,az))pl.vy=Math.max(pl.vy,4.2)}
  moveBody(pl,dt);
  if(pl.y<-3){hurt();if(state==='play'){respawn();toast('떨어졌어요! 깃발에서 다시')}}
  // 카메라: 앞으로 갈 때 천천히 정면으로
  if(drag||Math.abs(joy.x)>.6)idleCam=0;else idleCam+=dt;if(idleCam>1.2&&f>.3){yaw+=Math.atan2(Math.sin(-yaw),Math.cos(-yaw))*Math.min(1,dt*1.5)}
  if(punchHeld){pl.charge+=dt;if(pl.charge>.15){$('chargeBar').classList.add('on');$('chargeBar').querySelector('i').style.width=Math.min(100,pl.charge/PS.charge*100)+'%'}}
  if(downQ){downQ=false;punchDown()}
  pl.inv=Math.max(0,pl.inv-dt);pl.punchT=Math.max(0,pl.punchT-dt);comboT-=dt;if(comboT<=0)combo=0;
  updMoles(dt);if(state!=='play')return;updBarrels(dt);if(state!=='play')return;updThings(dt);
  for(let i=pick.length-1;i>=0;i--){const p=pick[i];p.t+=dt;p.vy-=12*dt;const ny=p.y+p.vy*dt;if(solidAt(p.x,ny-.3,p.z)){p.vy=0}else p.y=ny;p.m.position.set(p.x,p.y+Math.sin(time*3)*.1,p.z);p.m.rotation.y+=dt*2;
    if(p.t>.3&&Math.hypot(p.x-pl.x,p.z-pl.z)<1.2&&Math.abs(p.y-(pl.y+.8))<1.6){scene.remove(p.m);pick.splice(i,1);
      if(p.kind==='gem'){gems++;snd('level');toast('보석 '+gems+'/'+course.gems.length+'!');coins+=20}else gotNana()}}
  for(let i=fx.length-1;i>=0;i--){const p=fx[i];p.t-=dt;p.vy-=14*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;if(p.t<=0){scene.remove(p.m);fx.splice(i,1)}}
  if(dirty)rebuild();
  G.position.set(pl.x,pl.y,pl.z);let dd=pl.face-G.rotation.y;dd=Math.atan2(Math.sin(dd),Math.cos(dd));G.rotation.y+=dd*Math.min(1,dt*14);
  pl.phase+=dt*ml*10;const w=pl.ground?Math.sin(pl.phase)*Math.min(1,ml):0;legL.rotation.x=w*.7;legR.rotation.x=-w*.7;
  armR.rotation.x=pl.climb?-2.8:pl.punchT>0?-1.6:punchHeld?-.5:-w*.6;armL.rotation.x=pl.punchT>0&&pl.charge===0?-1.6:w*.6;Gb.visible=!(pl.inv>0&&Math.floor(time*12)%2);
  setT($('hearts'),'♥'.repeat(Math.max(0,pl.hp))+'♡'.repeat(Math.max(0,maxHp-pl.hp)));setT($('gems'),gems+'/'+course.gems.length);setT($('nanas'),nanas);setT($('coins'),coins);
  const prog=course.goal?Math.max(0,Math.min(1,pl.z/course.goal.z)):0;$('progress').querySelector('i').style.width=(prog*100)+'%';
}
function clearLevel(){state='clear';snd('win');const got=course.letters.filter(l=>l.got).length,allL=got===course.letters.length,allG=gems>=course.gems.length;const st=1+(allL?1:0)+(allG?1:0);
  save.stars[lvl]=Math.max(save.stars[lvl]||0,st);if(lvl+1>save.best){save.best=lvl+1}store();if(window.Arcade)Arcade.record('digKongDepth',save.best);
  setT($('eTitle'),'⭐'.repeat(st)+'☆'.repeat(3-st));$('eTxt').innerHTML=`${lvl+1}단계 「${LV.name}」 도착!<br>금글자 ${got}/${course.letters.length} · 보석 ${gems}/${course.gems.length} · 바나나 ${nanas} · 금화 ${coins}`+(st<3?'<br><small>'+(allL?'':'금글자 ')+(allG?'':'보석(빨간 칸 아래) ')+'을 다 모으면 별 3개!</small>':'');
  $('nextBtn').hidden=lvl+1>=D.levels.length;$('retryBtn').hidden=false;setTimeout(()=>$('endOv').hidden=false,900)}
function lose(){state='over';snd('lose');setT($('eTitle'),'쾅쾅이가 지쳤어요');$('eTxt').textContent=`${lvl+1}단계 · 금화 ${coins} · 바나나 ${nanas}`;$('nextBtn').hidden=true;$('retryBtn').hidden=false;setTimeout(()=>$('endOv').hidden=false,600)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused){time+=dt;if(state==='play')update(dt);else if(state==='title')yaw+=dt*.15}
  shake=Math.max(0,shake-dt);const cp=Math.cos(pitch),title=state==='title',dd=title?20:dist,px=title?8.5:pl.x,py=title?8:pl.y,pz=title?14:pl.z;
  camera.position.set(px-Math.sin(yaw)*cp*dd+(Math.random()-.5)*shake,py+1.5+Math.sin(pitch)*dd,pz-Math.cos(yaw)*cp*dd);camera.lookAt(px+Math.sin(yaw)*2,py+1,pz+Math.cos(yaw)*2);
  renderer.render(scene,camera)}
function toTitle(){state='title';for(const id of ['pauseOv','endOv'])$(id).hidden=true;if(!LV){LV=D.levels[0];gen();makeInst();rebuild();placeThings()}
  const l=$('lvls');l.innerHTML='';D.levels.forEach((L,i)=>{const b=document.createElement('button');b.disabled=i>save.best;b.textContent=(i+1)+'. '+L.name;const s=document.createElement('small');s.textContent=save.stars[i]?'⭐'.repeat(save.stars[i]):'';b.appendChild(s);b.onclick=()=>{snd('select');begin(i)};l.appendChild(b)});$('titleOv').hidden=false}
$('nextBtn').onclick=()=>{snd('click');begin(lvl+1,true)};$('retryBtn').onclick=()=>{snd('click');begin(lvl)};$('eMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__dk={pl,get state(){return state},begin,punch,punchDown,get items(){return items},get gems(){return gems},get:get,keys,get moles(){return moles},get pick(){return pick},set yaw(v){yaw=v},get course(){return course},get coins(){return coins},get nanas(){return nanas},set jumpQ(v){jumpQ=v},releasePunch,set punchHeld(v){punchHeld=v}};
});
