/* 블록 헌터 v2 — 지형이 바뀌는 블록 아레나. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const tags=$('tags');
const MOBILE=matchMedia('(pointer:coarse)').matches;
const SAVE='blockHunter.save';
const PS=D.player,IT=D.items;
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};

// ---------- three.js 기본
const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});
renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();
const skyCol=new THREE.Color('#87c8f0');scene.background=skyCol;scene.fog=new THREE.Fog(0x87c8f0,55,130);
const camera=new THREE.PerspectiveCamera(60,W()/H(),.1,300);
scene.add(new THREE.HemisphereLight(0xffffff,0x5a6a4a,.78));
const sun=new THREE.DirectionalLight(0xffffff,.8);sun.castShadow=true;
sun.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,far:150});
scene.add(sun);if(sun.target)scene.add(sun.target);
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?78:60;camera.updateProjectionMatrix();renderer.setSize(W(),H())}
addEventListener('resize',fit);fit();

const mat=c=>new THREE.MeshLambertMaterial({color:new THREE.Color(c)});
function box(w,h,d,c){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.castShadow=true;m.receiveShadow=true;return m}
function dispose(o){o.traverse(n=>{if(n.isMesh){n.geometry&&n.geometry!==unit&&n.geometry.dispose();n.material&&!n.material._keep&&n.material.dispose()}})}

// ---------- 지형 (18x18 칸 높이맵)
const N=D.layouts[0].rows.length,TS=D.tileSize,HU=D.heightUnit,HALF=N*TS/2,BASE=3;
const tileX=c=>(c-N/2+.5)*TS,tileC=x=>Math.floor(x/TS+N/2);
const unit=new THREE.BoxGeometry(1,1,1);
const lvMats=[];for(let l=0;l<5;l++){const a=mat('#fff'),b=mat('#fff');a._keep=b._keep=true;lvMats.push([a,b])}
const tiles=[];
for(let r=0;r<N;r++)for(let c=0;c<N;c++){
  const m=new THREE.Mesh(unit,lvMats[0][(r+c)&1]);m.receiveShadow=true;m.castShadow=!MOBILE;
  m.position.x=tileX(c);m.position.z=tileX(r);scene.add(m);const t={m,h0:0,h1:0,h:0,lv:0};setTileH(t,0);tiles.push(t)}
function setTileH(t,h){t.h=h;const hh=h+BASE;t.m.scale.set(TS,hh,TS);t.m.position.y=h-hh/2}
const outMat=mat('#58b84a');outMat._keep=true;
const outside=new THREE.Mesh(new THREE.PlaneGeometry(400,400),outMat);outside.rotation.x=-Math.PI/2;outside.position.y=-.02;outside.receiveShadow=true;scene.add(outside);
const wallMat=mat('#8a7a6a');wallMat._keep=true;
for(const [x,z,w,d] of [[0,-HALF-1,N*TS+4,2],[0,HALF+1,N*TS+4,2],[-HALF-1,0,2,N*TS],[HALF+1,0,2,N*TS]]){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,6,d),wallMat);m.position.set(x,2,z);m.castShadow=m.receiveShadow=true;scene.add(m)}
const topAt=(c,r)=>c<0||r<0||c>=N||r>=N?99:tiles[r*N+c].h;
const heightAt=(x,z)=>topAt(tileC(x),tileC(z));
const lvAt=(x,z)=>{const c=tileC(x),r=tileC(z);return c<0||r<0||c>=N||r>=N?0:tiles[r*N+c].lv};
function floorUnder(x,z,r){r*=.7;return Math.max(heightAt(x-r,z-r),heightAt(x+r,z-r),heightAt(x-r,z+r),heightAt(x+r,z+r))}
const obstacles=[];
const tileOf=(x,z)=>{const c=Math.max(0,Math.min(N-1,tileC(x))),r=Math.max(0,Math.min(N-1,tileC(z)));return r*N+c};
// 길찾기: 목표 칸에서 거꾸로 퍼지는 거리 지도 (한 칸 높이까지만 올라갈 수 있음)
function buildFlow(ti){const dist=new Int16Array(N*N).fill(-1);dist[ti]=0;const qu=[ti];
  for(let i=0;i<qu.length;i++){const b=qu[i],bc=b%N,br=(b/N)|0;
    for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=bc+dc,r=br+dr;if(c<0||r<0||c>=N||r>=N)continue;const a=r*N+c;
      if(dist[a]>=0||tiles[b].lv-tiles[a].lv>1)continue;dist[a]=dist[b]+1;qu.push(a)}}
  return dist}
function pathTarget(q,dist,tx,tz){const a=tileOf(q.x,q.z),da=dist[a];if(da<=1)return [tx,tz];
  const ac=a%N,ar=(a/N)|0;let best=null;
  for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=ac+dc,r=ar+dr;if(c<0||r<0||c>=N||r>=N)continue;const b=r*N+c;
    if(dist[b]===da-1&&tiles[b].lv-tiles[a].lv<=1){best=[tileX(c),tileX(r)];break}}
  return best||[tx,tz]}
function blockedAt(x,z,r,foot){
  if(Math.abs(x)>HALF-r||Math.abs(z)>HALF-r)return true;
  for(const [sx,sz] of [[-r,-r],[r,-r],[-r,r],[r,r]])if(heightAt(x+sx,z+sz)>foot+.5)return true;
  for(const o of obstacles)if((x-o.x)**2+(z-o.z)**2<(o.r+r)**2)return true;
  return false;
}
function moveBody(p,dx,dz,r){let hit=false;
  if(dx){if(!blockedAt(p.x+dx,p.z,r,p.y))p.x+=dx;else hit=true}
  if(dz){if(!blockedAt(p.x,p.z+dz,r,p.y))p.z+=dz;else hit=true}
  return hit}

// ---------- 테마/레이아웃 바꾸기
const colOf=(th,l)=>l===0?th.ground:th.levels[l-1];
const cA=new THREE.Color(),cB=new THREE.Color();
let curTheme=null,layoutI=-1,morph=null;
const trees=[],chests=[];
function paintTheme(from,to,k){
  for(let l=0;l<5;l++){cA.set(colOf(from,l));cB.set(colOf(to,l));cA.lerp(cB,k);lvMats[l][0].color.copy(cA);lvMats[l][1].color.copy(cA).multiplyScalar(.93)}
  cA.set(from.ground);cB.set(to.ground);outMat.color.copy(cA.lerp(cB,k)).multiplyScalar(.8);
  cA.set(from.sky);cB.set(to.sky);skyCol.copy(cA.lerp(cB,k));if(scene.fog.color)scene.fog.color.copy(skyCol);
}
function makeTree(th){const g=new THREE.Group(),t=box(1,3,1,th.tree[0]),l=box(3.4,3,3.4,th.tree[1]),l2=box(2,1.4,2,th.tree[1]);
  t.position.y=1.5;l.position.y=4.2;l2.position.y=6.3;l2.scale.y=1;g.add(t,l,l2);return g}
function makeChest(){const g=new THREE.Group(),b=box(1.5,.85,1.05,'#9a6230'),lid=new THREE.Group(),lt=box(1.56,.36,1.1,'#c0843f'),lk=box(.24,.3,.06,'#ffd23f');
  b.position.y=.43;lid.position.set(0,.86,-.52);lt.position.set(0,.18,.53);lk.position.set(0,-.05,1.09);lid.add(lt,lk);
  const mark=box(.4,.4,.4,'#ffd23f');mark.castShadow=false;mark.position.y=2.4;mark.material.emissive&&mark.material.emissive.setRGB&&mark.material.emissive.setRGB(.5,.35,0);
  g.add(b,lid,mark);return {g,lid,mark}}
function applyLayout(i,instant,cb){
  const L=D.layouts[i],th=D.themes[L.theme],from=curTheme||th;
  layoutI=i;
  for(const t of trees){burst({x:t.g.position.x,y:t.g.position.y+3,z:t.g.position.z},th.tree[1],6);scene.remove(t.g);dispose(t.g)}trees.length=0;obstacles.length=0;
  for(const c of chests){scene.remove(c.g);dispose(c.g)}chests.length=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=tiles[r*N+c],ch=L.rows[r][c],lv=ch==='.'?0:+ch;
    t.h0=t.h;t.h1=lv*HU;t.lv=lv;t.m.material=lvMats[lv][(r+c)&1]}
  for(const [c,r] of L.trees||[]){const g=makeTree(th),x=tileX(c),z=tileX(r);g.position.set(x,0,z);scene.add(g);trees.push({g,c,r});obstacles.push({x,z,r:1.1})}
  for(const [c,r] of L.chests||[]){const o=makeChest();o.x=tileX(c);o.z=tileX(r);o.c=c;o.r=r;o.open=false;o.g.position.set(o.x,0,o.z);o.g.rotation.y=Math.random()*6;scene.add(o.g);chests.push(o)}
  morph={t:0,dur:instant?0:D.morphSeconds,from,to:th,cb};curTheme=th;
  if(!instant)snd('build');
  updateMorph(0);
}
function updateMorph(dt){
  if(!morph)return;morph.t+=dt;const k=morph.dur?Math.min(1,morph.t/morph.dur):1,e=k<.5?2*k*k:1-(-2*k+2)**2/2;
  for(const t of tiles)setTileH(t,t.h0+(t.h1-t.h0)*e);
  for(const t of trees){t.g.position.y=topAt(t.c,t.r);t.g.scale.setScalar(Math.max(.01,e))}
  for(const c of chests)c.g.position.y=topAt(c.c,c.r);
  paintTheme(morph.from,morph.to,e);
  if(morph.dur&&k<1)shake=Math.max(shake,.12);
  if(k>=1){const cb=morph.cb;morph=null;cb&&cb()}
}

// ---------- 캐릭터
function limb(w,h,d,c,x,y){const p=new THREE.Group();p.position.set(x,y,0);const m=box(w,h,d,c);m.position.y=-h/2;p.add(m);return p}
function makeChar(o){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const legL=limb(.48,1,.5,o.leg,-.26,1),legR=limb(.48,1,.5,o.leg,.26,1);
  const torso=box(1.04,1.05,.55,o.torso);torso.position.y=1.52;
  const armL=limb(.46,1,.48,o.arm,-.76,2.02),armR=limb(.46,1,.48,o.arm,.76,2.02);
  const head=box(.82,.82,.82,o.head);head.position.y=2.47;
  body.add(legL,legR,torso,armL,armR,head);
  for(const sx of [-.18,.18]){const e=box(.13,o.eyeH||.15,.04,o.eye||'#111');e.castShadow=false;e.position.set(sx,2.56,.42);body.add(e)}
  const m=box(o.smile?.34:.42,.07,.04,'#111');m.castShadow=false;m.position.set(0,2.33,.42);body.add(m);
  const mats=[];body.traverse(n=>{if(n.isMesh)mats.push(n.material)});
  return {g,body,legL,legR,armL,armR,head,mats};
}
function weaponMesh(id){
  const c=D.weapons[id].color,g=new THREE.Group(),add=(w,h,d,col,x,y)=>{const b=box(w,h,d,col);b.position.set(x,y,0);g.add(b);return b};
  if(id==='sword'){add(.16,1.7,.08,c,0,.85);add(.55,.12,.18,'#8a5a2a',0,0);add(.12,.35,.12,'#5a3a1a',0,-.2)}
  else if(id==='hammer'){add(.14,1.9,.14,'#6a4424',0,.7);add(.95,.62,.62,c,0,1.7)}
  else if(id==='spear'){add(.1,3,.1,'#8a6a3a',0,1);add(.24,.55,.1,c,0,2.7)}
  else if(id==='dual'){add(.13,1.25,.07,c,0,.65);add(.42,.1,.15,'#334455',0,0)}
  else if(id==='axe'){add(.13,1.7,.13,'#6a4424',0,.7);add(.75,.7,.1,c,.34,1.35)}
  else{add(.12,2.2,.12,'#5a3a7a',0,.9);const o=add(.4,.4,.4,c,0,2.1);o.material.emissive&&o.material.emissive.setRGB&&o.material.emissive.setRGB(.35,.15,.6)}
  return g}

const P=makeChar({head:'#ffd23f',torso:'#2f7de1',arm:'#ffd23f',leg:'#3a9a48',smile:true});scene.add(P.g);
const shieldM=new THREE.Mesh(new THREE.BoxGeometry(2.6,3.6,2.6),new THREE.MeshLambertMaterial({color:new THREE.Color('#7fd8ff'),transparent:true,opacity:.22,depthWrite:false}));
shieldM.position.y=1.6;shieldM.visible=false;P.g.add(shieldM);
let wR=null,wL=null;
function equip(id){
  if(wR){P.armR.remove(wR);dispose(wR)}if(wL){P.armL.remove(wL);dispose(wL);wL=null}
  wR=weaponMesh(id);wR.position.set(0,-.95,.15);wR.rotation.x=Math.PI/2;P.armR.add(wR);
  if(id==='dual'){wL=weaponMesh(id);wL.position.set(0,-.95,.15);wL.rotation.x=Math.PI/2;P.armL.add(wL)}
}
const pl={hp:100,max:100,vy:0,face:0,atk:0,atkDur:.3,hit:false,hit2:false,lastHurt:-9,phase:0,onGround:true,air:0,
  dash:0,dashCd:0,dx:0,dz:0,boots:0,shield:0,inv:0,coins:0,weapon:{id:'sword',lv:1},bag:{potion:0,bomb:0},alt:false};
let mode='normal',M=D.modes.normal,wave=1,kills=0,state='title',paused=false,shake=0,time=0,combo=0,lastKill=-9;
let yaw=0,pitch=.5,dist=14;

// ---------- 효과
const debris=[];
function pop(pos,text,cls,h=1){
  const v=new THREE.Vector3(pos.x,pos.y+3.1*h,pos.z).project(camera);if(v.z>1)return;
  const el=document.createElement('div');el.className='dmg '+(cls||'');el.textContent=text;
  el.style.left=((v.x+1)/2*W()+(Math.random()*20-10))+'px';el.style.top=((1-v.y)/2*H())+'px';
  tags.appendChild(el);setTimeout(()=>el.remove(),900);
}
function burst(pos,color,n=10,spd=8){
  for(let i=0;i<n;i++){const c=box(.28,.28,.28,color);c.castShadow=false;c.position.set(pos.x,(pos.y||0)+1.2,pos.z);scene.add(c);
    debris.push({m:c,vx:(Math.random()-.5)*spd,vy:3+Math.random()*6,vz:(Math.random()-.5)*spd,life:1.1})}
}
function banner(t,sub){const b=$('banner');b.innerHTML='';b.append(t);if(sub){const s=document.createElement('small');s.textContent=sub;b.append(s)}
  b.classList.remove('on');void b.offsetWidth;b.classList.add('on')}

// ---------- 몬스터
const TYPES=D.monsters;let mons=[];
function spawn(type){
  const T=TYPES[type],p=P.g.position;let x=0,z=0,n=0;
  do{x=rand(-HALF+3,HALF-3);z=rand(-HALF+3,HALF-3);n++}
  while(n<120&&(Math.hypot(x-p.x,z-p.z)<(n<80?20:10)||heightAt(x,z)>HU+.01||blockedAt(x,z,.6*T.sc,heightAt(x,z))));
  const ch=makeChar(T.c);ch.g.scale.setScalar(T.sc);const y=floorUnder(x,z,.45*T.sc);ch.g.position.set(x,y,z);scene.add(ch.g);
  const bar=document.createElement('div'),fill=document.createElement('i');bar.className='mbar';bar.appendChild(fill);tags.appendChild(bar);
  const hpm=Math.round(T.hp*(1+(wave-1)*D.waves.hpPerWave)*M.monsterHp);
  mons.push({T,type,ch,hp:hpm,max:hpm,state:T.boss?'chase':'wander',tx:x,tz:z,wt:0,dt:Math.random(),chaseT:T.boss?99:0,kx:0,kz:0,cd:0,flash:0,swing:0,
    bar,fill,dead:false,die:0,phase:Math.random()*6,idle:0,vy:0,onGround:true,side:Math.random()<.5?1:-1,stuck:0});
}
function waveComp(){
  let comp=D.waves.list[wave-1];
  if(!comp){const E=D.waves.endless,n=Math.min(E.maxMonsters,E.base+wave*E.perWave),bs=Math.min(E.bruteShareMax,E.bruteShare+wave*E.bruteSharePerWave);comp={zombie:0,runner:0,brute:0};
    for(let i=0;i<n;i++){const r=Math.random();comp[r<bs?'brute':r<bs+E.runnerShare?'runner':'zombie']++}if(wave%E.bossEvery===0)comp.king=Math.floor(wave/E.bossEvery)}
  return comp}
function spawnWave(){
  const comp=waveComp();let boss=false;
  for(const k in comp){if(!TYPES[k])continue;if(TYPES[k].boss&&comp[k])boss=true;for(let i=0;i<comp[k];i++)spawn(k)}
  if(window.Arcade)Arcade.record('blockHunterWave',wave);
  banner('웨이브 '+wave,boss?'보스 등장!':D.layouts[layoutI].name);snd(boss?'alert':'go');
  state='fight';waveTime=0;
}
let waveTime=0;
function dmgRoll(){const Wp=D.weapons[pl.weapon.id],lvK=1+D.weaponPerLevel*(pl.weapon.lv-1),crit=Math.random()<PS.critChance;
  return [Math.round(rand(Wp.dmg[0],Wp.dmg[1])*lvK*(crit?PS.critMult:1)),crit]}
function hurtMon(m,dmg,crit,knock,fx,fz){
  if(m.dead)return;m.hp-=dmg;m.flash=.18;const q=m.ch.g.position,dx=q.x-fx,dz=q.z-fz,d=Math.hypot(dx,dz)||1;
  const kb=(knock||8)*(crit?1.5:1)/m.T.sc;m.kx=dx/d*kb;m.kz=dz/d*kb;
  pop(q,crit?dmg+'!':dmg,crit?'crit':'',m.T.sc);snd(crit?'crit':'hit');
  if(m.state!=='chase'){m.state='chase';m.chaseT=8}
  if(m.hp<=0)killMon(m);
}
function killMon(m){
  const q=m.ch.g.position,T=m.T;m.dead=true;m.die=.5;m.bar.remove();kills++;snd('pop');burst(q,T.c.head,T.sc>=1.5?16:10);shake=Math.max(shake,.15);
  let c=Math.max(1,Math.round(T.coins*M.coinMult));
  combo=time-lastKill<D.combo.window?combo+1:1;lastKill=time;
  if(combo>=D.combo.coinBonusEvery&&combo%D.combo.coinBonusEvery===0){const b=combo/D.combo.coinBonusEvery;c+=b;pop(P.g.position,combo+' 콤보! +'+b,'alert');snd('combo',Math.min(8,b))}
  pl.coins+=c;
  const at={x:q.x,z:q.z};
  if(T.boss&&Math.random()<D.drops.bossWeapon)dropWeapon(at);
  for(const k of ['potion','bomb','boots','shield'])if(Math.random()<D.drops[k]*(T.boss?6:T.sc>1.2?2.5:1)){dropItem(k,at);break}
}

// ---------- 아이템
const pickups=[];
function itemMesh(k){const g=new THREE.Group(),a=(w,h,d,c,y)=>{const b=box(w,h,d,c);b.position.y=y;g.add(b)};
  if(k==='potion'){a(.6,.7,.6,'#ff4d6a',0);a(.26,.3,.26,'#c99a5a',.5)}
  else if(k==='bomb'){a(.75,.75,.75,'#2a2a34',0);a(.12,.35,.12,'#ffb52e',.5)}
  else if(k==='boots'){a(.36,.55,.4,'#8a5a2a',0);const b=box(.36,.25,.6,'#6a3a1a');b.position.set(0,-.2,.18);g.add(b);const w=box(.5,.12,.12,'#9ff5ff');w.position.set(0,.15,-.2);g.add(w)}
  else{a(.85,.95,.18,'#4a9af0',0);a(.3,.5,.22,'#ffd23f',.05)}
  return g}
function addPickup(o,at){o.x=at.x+rand(-.6,.6);o.z=at.z+rand(-.6,.6);o.y=heightAt(o.x,o.z)+3;o.vy=4;o.t=0;o.m.position.set(o.x,o.y,o.z);scene.add(o.m);pickups.push(o)}
function dropItem(k,at){addPickup({kind:k,m:itemMesh(k),life:25},at)}
function dropWeapon(at,id){
  const ids=Object.keys(D.weapons);id=id||pick(ids.filter(i=>i!==pl.weapon.id).concat(pl.weapon.lv<D.weaponMaxLevel?[pl.weapon.id]:[]));
  const g=new THREE.Group(),w=weaponMesh(id);w.position.y=-1;g.add(w);g.scale.setScalar(1.15);addPickup({kind:'weapon',id,m:g,life:1e9},at)}
const WN=id=>D.weapons[id].name;
function collect(o){
  const p=P.g.position;
  if(o.kind==='weapon'){const w=pl.weapon;
    if(o.id===w.id){if(w.lv>=D.weaponMaxLevel)return false;w.lv++;pop(p,WN(o.id)+' Lv'+w.lv+'!','item');snd('level')}
    else{pl.weapon={id:o.id,lv:w.lv};equip(o.id);pop(p,WN(o.id)+'!','item');snd('power');
      banner(WN(o.id),'무기를 바꿨어요');}
    return true}
  if(o.kind==='potion'){if(pl.bag.potion<IT.bagMax){pl.bag.potion++;pop(p,'물약 +1','item')}else if(pl.hp<pl.max)heal(IT.potionHeal);else return false}
  else if(o.kind==='bomb'){if(pl.bag.bomb>=IT.bagMax)return false;pl.bag.bomb++;pop(p,'폭탄 +1','item')}
  else if(o.kind==='boots'){pl.boots=IT.bootsTime;pop(p,'점프 신발!','item')}
  else{pl.shield=IT.shieldTime;pop(p,'방패!','item')}
  snd('coin');return true}
function heal(n){pl.hp=Math.min(pl.max,pl.hp+n);pop(P.g.position,'+'+n,'heal');snd('power')}
function usePotion(){if(state!=='fight'&&state!=='morph'||paused)return;if(!pl.bag.potion||pl.hp>=pl.max){snd('bad');return}pl.bag.potion--;heal(IT.potionHeal)}
function openChest(o){
  o.open=true;o.mark.visible=false;snd('coin');const at={x:o.x,z:o.z};
  if(Math.random()<D.chest.weaponChance)dropWeapon(at);
  else{const c=Math.round(D.chest.coins*M.coinMult);pl.coins+=c;pop(P.g.position,'금화 +'+c,'alert');dropItem(Math.random()<.5?'potion':'bomb',at)}
  burst({x:o.x,y:topAt(o.c,o.r),z:o.z},'#ffd23f',12,6)}

// ---------- 공격
const projs=[],bombs=[];
function nearest(maxD,p){let best=null,bd=maxD;for(const m of mons){if(m.dead)continue;const q=m.ch.g.position,d=Math.hypot(q.x-p.x,q.z-p.z);if(d<bd){bd=d;best=m}}return best}
function attack(){
  if(state!=='fight'&&state!=='morph'||paused||pl.atk>0||pl.dash>0)return;
  const Wp=D.weapons[pl.weapon.id];pl.atkDur=Math.max(.17,Wp.cd);pl.atk=pl.atkDur;pl.hit=pl.hit2=false;pl.alt=!pl.alt;
  snd(Wp.ranged?'zap':Wp.slam?'whoosh':'slash');
  const t=nearest(Wp.ranged?Wp.range:Wp.range+3,P.g.position);if(t){const q=t.ch.g.position,p=P.g.position;pl.face=Math.atan2(q.x-p.x,q.z-p.z)}
}
function meleeHit(Wp){
  const p=P.g.position;let n=0;
  for(const m of mons){if(m.dead)continue;const q=m.ch.g.position,dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);
    if(Math.abs(q.y-p.y)>2.4)continue;
    let da=Math.atan2(dx,dz)-pl.face;da=Math.atan2(Math.sin(da),Math.cos(da));
    if(d<Wp.range+m.T.sc*.5&&(Wp.arc>=360||Math.abs(da)<Wp.arc*Math.PI/360||d<1.3)){const [dm,cr]=dmgRoll();hurtMon(m,dm,cr,Wp.knock,p.x,p.z);n++}}
  if(Wp.slam){shake=Math.max(shake,.35);snd('boom');const fl=lvAt(p.x,p.z);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2,c=box(.4,.4,.4,colOf(curTheme,fl));c.castShadow=false;c.position.set(p.x+Math.sin(a)*1.2,p.y+.3,p.z+Math.cos(a)*1.2);scene.add(c);
      debris.push({m:c,vx:Math.sin(a)*Wp.range*3,vy:4,vz:Math.cos(a)*Wp.range*3,life:.6})}}
}
function shoot(Wp){
  const p=P.g.position,sx=p.x+Math.sin(pl.face)*.9,sz=p.z+Math.cos(pl.face)*.9,sy=p.y+2;
  let vx=Math.sin(pl.face),vz=Math.cos(pl.face),vy=0;
  const t=nearest(Wp.range,p);
  if(t){const q=t.ch.g.position,tx=q.x-sx,ty=q.y+1.4*t.T.sc-sy,tz=q.z-sz,l=Math.hypot(tx,ty,tz)||1;vx=tx/l;vy=ty/l;vz=tz/l}
  const m=box(.42,.42,.42,Wp.color);m.castShadow=false;m.material.emissive&&m.material.emissive.setRGB&&m.material.emissive.setRGB(.4,.2,.7);m.position.set(sx,sy,sz);scene.add(m);
  projs.push({m,x:sx,y:sy,z:sz,vx:vx*Wp.speed,vy:vy*Wp.speed,vz:vz*Wp.speed,life:Wp.range/Wp.speed,Wp});
}
function throwBomb(){
  if(state!=='fight'&&state!=='morph'||paused)return;if(!pl.bag.bomb){snd('bad');return}pl.bag.bomb--;
  const p=P.g.position,t=nearest(14,p);let tx,tz,ty;
  if(t){const q=t.ch.g.position;tx=q.x;tz=q.z;ty=q.y;pl.face=Math.atan2(q.x-p.x,q.z-p.z)}else{tx=p.x+Math.sin(pl.face)*8;tz=p.z+Math.cos(pl.face)*8;ty=heightAt(tx,tz)}
  const T=.7,g=PS.gravity,m=itemMesh('bomb');m.position.set(p.x,p.y+2.2,p.z);scene.add(m);
  bombs.push({m,x:p.x,y:p.y+2.2,z:p.z,vx:(tx-p.x)/T,vz:(tz-p.z)/T,vy:(ty+.4-(p.y+2.2))/T+.5*g*T,fuse:IT.bombFuse});snd('whoosh');pl.atk=.25;pl.atkDur=.25;pl.hit=pl.hit2=true;
}
function explode(x,y,z){
  shake=Math.max(shake,.5);snd('boom');burst({x,y:y-1,z},'#ff9b3d',16,12);burst({x,y:y-1,z},'#3a3a3a',8,8);
  for(const m of mons){if(m.dead)continue;const q=m.ch.g.position,d=Math.hypot(q.x-x,(q.y-y)*.7,q.z-z);
    if(d<IT.bombRadius){hurtMon(m,Math.round(IT.bombDamage*(1-d/IT.bombRadius*.5)),false,18,x,z)}}
}
function dash(){
  if(state!=='fight'&&state!=='morph'||paused||pl.dashCd>0)return;
  let dx=mvx,dz=mvz;if(Math.hypot(dx,dz)<.1){dx=Math.sin(pl.face);dz=Math.cos(pl.face)}const l=Math.hypot(dx,dz);
  pl.dx=dx/l;pl.dz=dz/l;pl.dash=PS.dashTime;pl.dashCd=PS.dashCooldown;pl.face=Math.atan2(pl.dx,pl.dz);snd('whoosh');
}
function jump(){
  if(state==='title'||state==='dead'||paused)return;
  if(pl.onGround||pl.air<.1){pl.vy=PS.jump*(pl.boots>0?IT.bootsJump:1);pl.onGround=false;pl.air=1;snd(pl.boots>0?'jump2':'jump')}
}
function hurtPlayer(dmg){
  if(state!=='fight'||pl.dash>0||pl.inv>0)return;
  if(pl.shield>0){dmg=Math.max(1,Math.round(dmg*(1-IT.shieldBlock)))}
  pl.hp-=dmg;pl.lastHurt=time;pl.inv=.25;shake=.3;snd('hurt');pop(P.g.position,'-'+dmg,'hurt');
  const v=$('vig');v.style.opacity=1;setTimeout(()=>v.style.opacity=pl.hp<pl.max*.3?.45:0,180);
  if(pl.hp<=0)die();
}
function die(){
  pl.hp=0;state='dead';snd('lose');combo=0;
  if(window.Arcade)Arcade.record('blockHunterBest',kills);
  try{localStorage.removeItem(SAVE)}catch(_){}
  setTimeout(()=>{$('deadTxt').textContent=`${M.name} · 웨이브 ${wave}까지 버티고 몬스터 ${kills}마리를 처치했어요.`;$('deadOv').hidden=false;$('againBtn').focus()},900);
}

// ---------- 저장 / 이어 하기
function saveRun(){
  if(state==='title'||state==='dead')return;
  const s={mode,wave,hp:Math.max(1,Math.ceil(pl.hp)),max:pl.max,kills,coins:pl.coins,weapon:pl.weapon,bag:pl.bag};
  try{localStorage.setItem(SAVE,JSON.stringify(s))}catch(_){}
  if(window.Arcade)Arcade.record('blockHunterBest',kills);
}
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE));return s&&D.modes[s.mode]&&s.wave?s:null}catch(_){return null}}
addEventListener('pagehide',saveRun);
document.addEventListener('visibilitychange',()=>{if(document.hidden){saveRun();if(state==='fight'||state==='morph')setPause(true)}});

function clearField(){
  for(const m of mons){scene.remove(m.ch.g);dispose(m.ch.g);m.bar.remove()}mons=[];
  for(const a of [pickups,projs,bombs]){for(const o of a){scene.remove(o.m);dispose(o.m)}a.length=0}
}
function startRun(s){
  clearField();
  mode=s.mode;M=D.modes[mode];wave=s.wave||1;kills=s.kills||0;
  Object.assign(pl,{max:s.max||M.playerHp,vy:0,atk:0,lastHurt:-9,dash:0,dashCd:0,boots:0,shield:0,inv:0,coins:s.coins||0,
    weapon:{id:(s.weapon&&D.weapons[s.weapon.id])?s.weapon.id:'sword',lv:Math.min(D.weaponMaxLevel,(s.weapon&&s.weapon.lv)||1)},
    bag:{potion:(s.bag&&s.bag.potion)||0,bomb:(s.bag&&s.bag.bomb)||0}});
  pl.hp=s.hp?Math.min(pl.max,Math.max(pl.max*.4,s.hp)):pl.max;
  equip(pl.weapon.id);P.body.rotation.set(0,0,0);combo=0;
  $('titleOv').hidden=$('deadOv').hidden=$('restOv').hidden=$('pauseOv').hidden=true;paused=false;$('vig').style.opacity=0;
  goWave(true);
}
function goWave(place){
  const li=(wave-1)%D.layouts.length,L=D.layouts[li];state='morph';
  const go=()=>{if(place)placePlayer(L);spawnWave()};
  if(li===layoutI){go();return}
  if(place)placePlayer(L);
  banner('지형이 바뀌어요!',L.name);applyLayout(li,false,go);
}
function placePlayer(L){const [c,r]=L.spawn||[9,9],p=P.g.position;p.x=tileX(c);p.z=tileX(r);p.y=Math.max(topAt(c,r),floorUnder(p.x,p.z,.45));pl.vy=0;
  yaw=Math.atan2(-p.x,-p.z)||0}
function waveCleared(){
  state='clear';snd('win');banner('웨이브 '+wave+' 클리어!');
  pl.hp=Math.min(pl.max,pl.hp+M.waveHeal);pop(P.g.position,'+'+M.waveHeal,'heal');
  const cc=D.waves.clearCoins||[0,0],bonus=Math.round((cc[0]+cc[1]*wave)*M.coinMult);pl.coins+=bonus;setTimeout(()=>pop(P.g.position,'금화 +'+bonus,'alert'),400);
  wave++;saveRun();
  clearT=1.6;
}
let clearT=0;

// ---------- 휴식 가게
function openRest(){
  state='rest';
  $('restTitle').textContent='웨이브 '+(wave-1)+' 클리어!';
  const items=D.shop.items.slice().sort(()=>Math.random()-.5).filter(it=>!(it.id==='upgrade'&&pl.weapon.lv>=D.weaponMaxLevel)).slice(0,D.shop.offers);
  const box_=$('offers');box_.innerHTML='';
  const refresh=()=>{$('restTxt').textContent=`금화 ${pl.coins}개 · 체력 ${Math.ceil(pl.hp)}/${pl.max} · ${WN(pl.weapon.id)} Lv${pl.weapon.lv}`;
    for(const b of box_.children)b.disabled=b._bought||pl.coins<b._it.cost||!canBuy(b._it)};
  for(const it of items){const b=document.createElement('button');b.className='offer';b._it=it;
    const nb=document.createElement('b'),ni=document.createElement('i'),ne=document.createElement('em');nb.textContent=it.name;ni.textContent=it.desc;ne.textContent='금화 '+it.cost;b.append(nb,ni,ne);
    b.onclick=()=>{if(b.disabled)return;pl.coins-=it.cost;buy(it.id);b._bought=true;snd('coin');refresh();saveRun()};box_.appendChild(b)}
  refresh();$('restOv').hidden=false;$('nextBtn').focus();
}
function canBuy(it){
  if(it.id==='potion')return pl.bag.potion<IT.bagMax;if(it.id==='bomb')return pl.bag.bomb<IT.bagMax;
  if(it.id==='heal')return pl.hp<pl.max;if(it.id==='upgrade')return pl.weapon.lv<D.weaponMaxLevel;return true}
function buy(id){
  if(id==='potion')pl.bag.potion++;else if(id==='bomb')pl.bag.bomb++;
  else if(id==='maxhp'){pl.max+=20;pl.hp+=20}else if(id==='heal')pl.hp=pl.max;
  else if(id==='upgrade')pl.weapon.lv++;
  else if(id==='weapon'){const nid=pick(Object.keys(D.weapons).filter(i=>i!==pl.weapon.id));pl.weapon={id:nid,lv:pl.weapon.lv};equip(nid);pop(P.g.position,WN(nid)+'!','item')}
}
$('nextBtn').onclick=()=>{snd('click');$('restOv').hidden=true;goWave(false)};

// ---------- 화면 전환
function setPause(on){if(state==='title'||state==='dead'||state==='rest')on=false;paused=on;$('pauseOv').hidden=!on;if(on){for(const k in keys)keys[k]=false;atkHeld=false;$('resumeBtn').focus()}}
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};
$('resumeBtn').onclick=()=>{snd('click');setPause(false)};
$('saveExitBtn').onclick=()=>{saveRun();location.href='../'};
$('titleBtn').onclick=()=>{saveRun();toTitle()};
$('againBtn').onclick=()=>{snd('click');startRun({mode})};
$('deadTitleBtn').onclick=()=>{snd('click');toTitle()};
function toTitle(){
  clearField();state='title';paused=false;
  for(const id of ['pauseOv','deadOv','restOv'])$(id).hidden=true;
  const s=loadSave(),cb=$('contBtn');
  if(s){cb.hidden=false;cb.textContent=`이어 하기 · ${D.modes[s.mode].name} · 웨이브 ${s.wave}`;cb.onclick=()=>{snd('select');startRun(s)}}else cb.hidden=true;
  $('titleOv').hidden=false;
}
const modesEl=$('modes');
for(const k in D.modes){const md=D.modes[k],b=document.createElement('button');b.className='mode '+k;
  const nb=document.createElement('b'),ni=document.createElement('i');nb.textContent=md.name;ni.textContent=md.desc;b.append(nb,ni);
  b.onclick=()=>{snd('select');try{localStorage.removeItem(SAVE)}catch(_){}startRun({mode:k})};modesEl.appendChild(b)}

// ---------- 입력
const keys={},joy={x:0,y:0};let mvx=0,mvz=0;
addEventListener('keydown',e=>{
  if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}
  keys[e.code]=true;if(e.repeat)return;
  if(e.code==='Space'){e.preventDefault();jump()}
  else if(e.code==='KeyJ')attack();
  else if(e.code==='ShiftLeft'||e.code==='ShiftRight')dash();
  else if(e.code==='KeyQ')usePotion();
  else if(e.code==='KeyF')throwBomb();
});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
const cv=renderer.domElement;let drag=null;
cv.addEventListener('contextmenu',e=>e.preventDefault());
const jb=$('joy'),kn=$('knob');let jid=null,jo={x:0,y:0};
function joyMove(e){let x=e.clientX-jo.x,y=e.clientY-jo.y;const l=Math.hypot(x,y),mx=50;
  if(l>mx){x*=mx/l;y*=mx/l}kn.style.transform=`translate(${x}px,${y}px)`;joy.x=x/mx;joy.y=y/mx}
function joyEnd(){jid=null;joy.x=joy.y=0;kn.style.transform='';jb.classList.remove('on');jb.style.left=jb.style.top=''}
cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'&&jid===null&&e.clientX<innerWidth*.45&&e.clientY>innerHeight*.35){
    jid=e.pointerId;jo={x:e.clientX,y:e.clientY};jb.style.left=e.clientX+'px';jb.style.top=e.clientY+'px';jb.classList.add('on');
    cv.setPointerCapture(e.pointerId);joyMove(e);return}
  if(drag)return;drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,touch:e.pointerType==='touch'};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(e.pointerId===jid){joyMove(e);return}
  if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<(drag.touch?10:7))return;drag.moved=true;const k=drag.touch?.009:.006;
  yaw-=dx*k;pitch=Math.max(.15,Math.min(1.3,pitch+dy*k*.7));drag.x=e.clientX;drag.y=e.clientY});
const ptrEnd=e=>{if(e.pointerId===jid){joyEnd();return}if(drag&&drag.id===e.pointerId){if(!drag.moved&&e.button===0&&e.type==='pointerup')attack();drag=null}};
cv.addEventListener('pointerup',ptrEnd);cv.addEventListener('pointercancel',ptrEnd);
cv.addEventListener('dblclick',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(7,Math.min(26,dist+e.deltaY*.01))},{passive:false});
let atkHeld=false;const ta=$('tAtk');
ta.addEventListener('pointerdown',e=>{e.preventDefault();atkHeld=true;try{ta.setPointerCapture(e.pointerId)}catch(_){}attack()});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])ta.addEventListener(ev,()=>atkHeld=false);
const tap=(id,f)=>$(id).addEventListener('pointerdown',e=>{e.preventDefault();f()});
tap('tJmp',jump);tap('tDash',dash);tap('tPot',usePotion);tap('tBomb',throwBomb);

// ---------- 매 프레임
const lerpA=(a,b,t)=>{let d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*Math.min(1,t)};
const tmp=new THREE.Vector3();
function updatePlayer(dt){
  const p=P.g.position,Wp=D.weapons[pl.weapon.id],alive=state!=='dead';
  const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=-fz,rz=fx;
  let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y;
  let s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x;
  if(keys.ArrowLeft||keys.KeyZ)yaw+=1.8*dt;if(keys.ArrowRight||keys.KeyC)yaw-=1.8*dt;
  mvx=fx*f+rx*s;mvz=fz*f+rz*s;const ml=Math.hypot(mvx,mvz);
  let spd=(keys.ShiftLeft||keys.ShiftRight?PS.runSpeed:PS.speed)*(pl.boots>0?IT.bootsSpeed:1);
  if(curTheme&&curTheme.groundSlow&&pl.onGround&&p.y<.05)spd*=curTheme.groundSlow;
  pl.dashCd-=dt;pl.inv-=dt;pl.boots=Math.max(0,pl.boots-dt);pl.shield=Math.max(0,pl.shield-dt);
  if(pl.dash>0&&alive){pl.dash-=dt;moveBody(p,pl.dx*PS.dashSpeed*dt,pl.dz*PS.dashSpeed*dt,.45);
    if(Math.random()<.6){const c=box(.3,.3,.3,'#ffffff');c.castShadow=false;c.position.set(p.x,p.y+.4,p.z);scene.add(c);debris.push({m:c,vx:0,vy:1,vz:0,life:.4})}}
  else if(ml>.1&&alive){const k=Math.min(1,ml);mvx/=ml;mvz/=ml;moveBody(p,mvx*spd*k*dt,mvz*spd*k*dt,.45);
    if(pl.atk<=0)pl.face=lerpA(pl.face,Math.atan2(mvx,mvz),dt*12);pl.phase+=dt*spd*1.6*k}
  pl.vy-=PS.gravity*dt;p.y+=pl.vy*dt;const fl=floorUnder(p.x,p.z,.45);
  if(p.y<=fl){if(!pl.onGround&&pl.vy<-8)snd('thud');p.y=fl;pl.vy=0;pl.onGround=true;pl.air=0}else{pl.onGround=false;pl.air+=dt}
  if(atkHeld)attack();
  if(jid!==null&&!drag&&joy.y<-.5&&Math.abs(joy.x)<.6)yaw=lerpA(yaw,pl.face,dt*.9);
  P.g.rotation.y=lerpA(P.g.rotation.y,pl.face,dt*20);
  const walk=ml>.1&&pl.onGround?Math.sin(pl.phase):0;
  P.legL.rotation.x=walk*.8;P.legR.rotation.x=-walk*.8;P.armL.rotation.x=-walk*.7;P.armL.rotation.z=0;P.armR.rotation.z=0;P.body.rotation.y=0;
  P.armR.position.z=0;
  if(pl.atk>0){pl.atk-=dt;const t=1-Math.max(0,pl.atk)/pl.atkDur,e=1-(1-t)**3,id=pl.weapon.id;
    if(id==='spear'){const th=Math.sin(Math.min(1,t*1.6)*Math.PI);P.armR.rotation.x=-1.57;P.armR.position.z=th*.8;if(t>.3&&!pl.hit){pl.hit=true;meleeHit(Wp)}}
    else if(id==='hammer'){P.armR.rotation.x=t<.55?-3.1*(t/.55):-3.1+(t-.55)/.45*3.3;P.armL.rotation.x=P.armR.rotation.x;if(t>.6&&!pl.hit){pl.hit=true;meleeHit(Wp)}}
    else if(id==='axe'){P.body.rotation.y=e*Math.PI*2;P.armR.rotation.z=1.5;P.armR.rotation.x=-1.4;if(t>.3&&!pl.hit){pl.hit=true;meleeHit(Wp)}}
    else if(id==='staff'){P.armR.rotation.x=-1.4-Math.sin(t*Math.PI)*.5;if(t>.25&&!pl.hit){pl.hit=true;shoot(Wp)}}
    else{const arm=id==='dual'&&pl.alt?P.armL:P.armR;arm.rotation.x=-2.9+e*2.8;arm.rotation.z=(arm===P.armR?.3:-.3)-e*(arm===P.armR?.5:-.5);if(t>.4&&!pl.hit){pl.hit=true;meleeHit(Wp)}}}
  else{P.armR.rotation.x=walk*.7-.2;if(pl.weapon.id==='staff')P.armR.rotation.x=-.5}
  if(!alive){P.body.rotation.x=Math.min(Math.PI/2,P.body.rotation.x+dt*4)}else P.body.rotation.x=0;
  if(alive&&state==='fight'&&time-pl.lastHurt>PS.regenDelay&&pl.hp<pl.max)pl.hp=Math.min(pl.max,pl.hp+PS.regenPerSec*dt);
  shieldM.visible=pl.shield>0&&(pl.shield>2||Math.sin(time*20)>0);
  for(const mt of P.mats)mt.emissive&&mt.emissive.setScalar(pl.inv>0?.35:pl.boots>0?.08:0);
  // 상자
  for(const c of chests){if(c.open){c.lid.rotation.x=Math.max(-1.9,c.lid.rotation.x-dt*6);continue}
    c.mark.position.y=2.4+Math.sin(time*3)*.25;c.mark.rotation.y+=dt*2;
    if(alive&&(state==='fight'||state==='morph')&&Math.hypot(c.x-p.x,c.z-p.z)<1.9&&Math.abs(p.y-topAt(c.c,c.r))<1)openChest(c)}
}
let flow=null,flowTile=-1,flowAge=0;
function updateMonsters(dt){
  const p=P.g.position,alive=state==='fight';
  const pt=tileOf(p.x,p.z);if(pt!==flowTile||(flowAge-=dt)<=0){flow=buildFlow(pt);flowTile=pt;flowAge=.5}
  if(alive)waveTime+=dt;const live=mons.filter(m=>!m.dead).length,hurry=alive&&(waveTime>D.waves.hurryAfter||live<=2);
  for(const m of mons){
    const g=m.ch.g,q=g.position,T=m.T,r=.45*T.sc;
    if(m.dead){m.die-=dt;g.rotation.x=Math.min(Math.PI/2,g.rotation.x+dt*6);g.scale.setScalar(T.sc*Math.max(.01,m.die/.5));continue}
    const dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);
    m.dt-=dt;m.chaseT-=dt;m.cd-=dt;
    if(m.dt<=0){m.dt=.7+Math.random()*.6;
      if(m.state==='wander'&&hurry){m.state='chase';m.chaseT=99;pop(q,'!','alert',T.sc)}
      else if(m.state==='wander'&&alive&&d<T.aggro&&Math.random()<M.chaseChance){m.state='chase';m.chaseT=5+Math.random()*6;pop(q,'!','alert',T.sc);if(d<10)snd('alert')}
      else if(!T.boss&&!hurry&&m.state==='chase'&&(!alive||d>T.aggro+9||(m.chaseT<=0&&d>5&&Math.random()<1-M.chaseChance))){m.state='wander';m.wt=0;pop(q,'?','alert',T.sc)}}
    let tx,tz,sp=T.spd*M.monsterSpeed,moving=true;
    if(curTheme&&curTheme.groundSlow&&q.y<.05)sp*=curTheme.groundSlow;
    if(m.state==='chase'){[tx,tz]=pathTarget(q,flow,p.x,p.z);
      if(d<1.3*T.sc+.5&&Math.abs(p.y-q.y)<1.6+T.sc*.4){moving=false;if(m.cd<=0&&alive){m.cd=1.1;m.swing=.3;hurtPlayer(Math.round(T.dmg*M.monsterDmg))}}}
    else{m.wt-=dt;if(m.wt<=0||Math.hypot(m.tx-q.x,m.tz-q.z)<.6){m.wt=2+Math.random()*3;m.idle=Math.random()<.35?1.5+Math.random()*2:0;
        m.tx=q.x+rand(-10,10);m.tz=q.z+rand(-10,10)}
      tx=m.tx;tz=m.tz;sp*=.4;if(m.idle>0){m.idle-=dt;moving=false}}
    let ux=tx-q.x,uz=tz-q.z;const ul=Math.hypot(ux,uz)||1;ux/=ul;uz/=ul;
    if(moving){
      if(m.stuck>0){m.stuck-=dt;const a=m.side*1.2,c=Math.cos(a),s=Math.sin(a);[ux,uz]=[ux*c-uz*s,ux*s+uz*c]}
      const hit=moveBody(q,ux*sp*dt,uz*sp*dt,r);
      if(hit){const ah=heightAt(q.x+ux*(r+.5),q.z+uz*(r+.5));
        if(ah-q.y<=HU+.15&&m.onGround&&m.state==='chase'){m.vy=9.6;m.onGround=false}
        else if(m.state==='chase'){if(m.stuck<=0){m.stuck=.7+Math.random()*.6;if(Math.random()<.3)m.side*=-1}}
        else m.wt=0}
      m.phase+=dt*sp*2.2;g.rotation.y=lerpA(g.rotation.y,Math.atan2(ux,uz),dt*8)}
    else if(m.state==='chase')g.rotation.y=lerpA(g.rotation.y,Math.atan2(dx,dz),dt*10);
    moveBody(q,m.kx*dt,m.kz*dt,r);const dmp=Math.exp(-7*dt);m.kx*=dmp;m.kz*=dmp;
    for(const o of mons){if(o===m||o.dead)continue;const op=o.ch.g.position,ox=q.x-op.x,oz=q.z-op.z,od=Math.hypot(ox,oz),mn=.6*(T.sc+o.T.sc);
      if(od<mn&&od>1e-4&&Math.abs(op.y-q.y)<2)moveBody(q,ox/od*(mn-od)*.5,oz/od*(mn-od)*.5,r)}
    const mn=.6+.5*T.sc;if(d<mn&&d>1e-4&&Math.abs(p.y-q.y)<2)moveBody(q,-dx/d*(mn-d),-dz/d*(mn-d),r);
    m.vy-=PS.gravity*dt;q.y+=m.vy*dt;const fl=floorUnder(q.x,q.z,r);if(q.y<=fl){q.y=fl;m.vy=0;m.onGround=true}else m.onGround=false;
    const w=moving?Math.sin(m.phase):0;m.ch.legL.rotation.x=w*.7;m.ch.legR.rotation.x=-w*.7;
    const base=T.zombie?-1.45:0;let sw=0;if(m.swing>0){m.swing-=dt;sw=-Math.sin((1-m.swing/.3)*Math.PI)*1.3}
    m.ch.armL.rotation.x=base+(T.zombie?w*.15:-w*.7)+sw;m.ch.armR.rotation.x=base+(T.zombie?-w*.15:w*.7)+sw;
    m.flash=Math.max(0,m.flash-dt);const flv=m.flash>0?.8:0;for(const mt of m.ch.mats)mt.emissive&&mt.emissive.setScalar(flv);
    const show=m.hp<m.max||m.state==='chase';
    tmp.set(q.x,q.y+3.15*T.sc+.1,q.z).project(camera);
    if(show&&tmp.z<1&&d<45){m.bar.style.display='';m.bar.style.left=(tmp.x+1)/2*W()+'px';m.bar.style.top=(1-tmp.y)/2*H()+'px';m.fill.style.width=Math.max(0,m.hp/m.max*100)+'%'}
    else m.bar.style.display='none';
  }
  mons=mons.filter(m=>{if(m.dead&&m.die<=0){scene.remove(m.ch.g);dispose(m.ch.g);return false}return true});
  if(state==='fight'&&mons.length===0)waveCleared();
}
function updateThings(dt){
  const p=P.g.position;
  for(let i=projs.length-1;i>=0;i--){const o=projs[i];o.life-=dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.z+=o.vz*dt;o.m.position.set(o.x,o.y,o.z);o.m.rotation.x+=dt*8;o.m.rotation.y+=dt*6;
    let hitM=null;for(const m of mons){if(m.dead)continue;const q=m.ch.g.position;if(Math.hypot(q.x-o.x,q.y+1.4*m.T.sc-o.y,q.z-o.z)<.8*m.T.sc+.4){hitM=m;break}}
    if(hitM||o.life<=0||heightAt(o.x,o.z)>o.y||Math.abs(o.x)>HALF||Math.abs(o.z)>HALF){
      for(const m of mons){if(m.dead)continue;const q=m.ch.g.position;
        if(m===hitM||Math.hypot(q.x-o.x,q.y+1-o.y,q.z-o.z)<o.Wp.splash+m.T.sc*.4){const [dm,cr]=dmgRoll();hurtMon(m,m===hitM?dm:Math.round(dm*.6),cr,o.Wp.knock,o.x,o.z)}}
      burst({x:o.x,y:o.y-1.2,z:o.z},o.Wp.color,6,5);scene.remove(o.m);dispose(o.m);projs.splice(i,1)}}
  for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.fuse-=dt;b.vy-=PS.gravity*dt;
    if(blockedAt(b.x+b.vx*dt,b.z,.3,b.y))b.vx*=-.4;else b.x+=b.vx*dt;
    if(blockedAt(b.x,b.z+b.vz*dt,.3,b.y))b.vz*=-.4;else b.z+=b.vz*dt;
    b.y+=b.vy*dt;const fl=heightAt(b.x,b.z)+.38;if(b.y<fl){b.y=fl;b.vy*=-.3;b.vx*=.5;b.vz*=.5}
    b.m.position.set(b.x,b.y,b.z);b.m.rotation.z+=dt*5;const s=b.fuse<.4?1+Math.sin(time*40)*.15:1;b.m.scale.setScalar(s);
    if(b.fuse<=0){explode(b.x,b.y,b.z);scene.remove(b.m);dispose(b.m);bombs.splice(i,1)}}
  for(let i=pickups.length-1;i>=0;i--){const o=pickups[i];o.t+=dt;o.life-=dt;
    const fl=heightAt(o.x,o.z)+.7;o.vy-=20*dt;o.y+=o.vy*dt;if(o.y<fl){o.y=fl;o.vy=0}
    o.m.position.set(o.x,o.y+Math.sin(o.t*3)*.15,o.z);o.m.rotation.y+=dt*2.2;
    if(o.life<4)o.m.visible=Math.sin(o.t*18)>0;
    let gone=o.life<=0;
    if(!gone&&state!=='dead'&&o.t>.4&&Math.hypot(o.x-p.x,o.z-p.z)<1.5&&Math.abs(o.y-.7-p.y)<1.7&&collect(o))gone=true;
    if(gone){scene.remove(o.m);dispose(o.m);pickups.splice(i,1)}}
  for(let i=debris.length-1;i>=0;i--){const b=debris[i];b.life-=dt;b.vy-=22*dt;b.m.position.x+=b.vx*dt;b.m.position.z+=b.vz*dt;
    const fl=heightAt(b.m.position.x,b.m.position.z)+.14;b.m.position.y+=b.vy*dt;
    if(b.m.position.y<fl){b.m.position.y=fl;b.vx*=.9;b.vz*=.9;b.vy=Math.abs(b.vy)*.3}
    b.m.rotation.x+=dt*6;b.m.scale.setScalar(Math.max(.01,Math.min(1,b.life*2)));
    if(b.life<=0){scene.remove(b.m);dispose(b.m);debris.splice(i,1)}}
}
let bossShown=false;
function updateHud(){
  $('hp').style.width=Math.max(0,pl.hp/pl.max*100)+'%';$('hp').style.background=pl.hp<pl.max*.3?'linear-gradient(#ff7a6a,#e0392b)':'';
  setT($('hpTxt'),Math.ceil(pl.hp)+' / '+pl.max);setT($('wave'),wave);setT($('kills'),kills);setT($('coins'),pl.coins);
  setT($('wName'),WN(pl.weapon.id)+' Lv'+pl.weapon.lv);
  let b=`물약 ${pl.bag.potion} · 폭탄 ${pl.bag.bomb}`;if(pl.boots>0)b+=` · 신발 ${Math.ceil(pl.boots)}초`;if(pl.shield>0)b+=` · 방패 ${Math.ceil(pl.shield)}초`;
  if(pl.dashCd>0)b+=` · 대시 ${pl.dashCd.toFixed(1)}`;setT($('buffs'),b);
  setT($('nPot'),pl.bag.potion);setT($('nBomb'),pl.bag.bomb);
  setT($('comboTxt'),combo>=2&&time-lastKill<D.combo.window?combo+' 콤보':'');
  const bosses=mons.filter(m=>m.T.boss&&!m.dead);
  if(bosses.length){if(!bossShown){$('bossBar').hidden=false;bossShown=true}setT($('bossName'),bosses[0].T.n+(bosses.length>1?' x'+bosses.length:''));
    $('bossFill').style.width=bosses.reduce((s,m)=>s+Math.max(0,m.hp),0)/bosses.reduce((s,m)=>s+m.max,0)*100+'%'}
  else if(bossShown){$('bossBar').hidden=true;bossShown=false}
}
let last=performance.now();
function frame(now){
  const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(!paused){time+=dt;updateMorph(dt);
    if(state==='clear'&&(clearT-=dt)<=0)openRest();
    if(state!=='title'){updatePlayer(dt);updateMonsters(dt);updateThings(dt);updateHud()}
    else{yaw+=dt*.12}}
  const p=P.g.position,cp=Math.cos(pitch);
  shake=Math.max(0,shake-dt);const sk=shake*.6;
  const d=state==='title'?30:dist;
  let cx=p.x-Math.sin(yaw)*cp*d,cz=p.z-Math.cos(yaw)*cp*d,cy=p.y+Math.sin(pitch)*d+1.5;
  cy=Math.max(cy,heightAt(cx,cz)+1);
  camera.position.set(cx+(Math.random()-.5)*sk,cy+(Math.random()-.5)*sk,cz);
  camera.lookAt(p.x,p.y+2,p.z);
  sun.position.set(p.x+28,p.y+50,p.z+18);if(sun.target){sun.target.position.set(p.x,p.y,p.z);sun.target.updateMatrixWorld&&sun.target.updateMatrixWorld()}
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
applyLayout(0,true);placePlayer(D.layouts[0]);toTitle();
requestAnimationFrame(frame);
window.__bh={buildFlow,pathTarget,tileOf,get yaw(){return yaw},set yaw(v){yaw=v},pl,get mons(){return mons},get state(){return state},get wave(){return wave},get kills(){return kills},chests,pickups,tiles,startRun,openRest,P,attack,jump,dash,throwBomb,usePotion,heightAt,floorUnder,get layoutI(){return layoutI},setPause,saveRun,loadSave,toTitle,keys};
});
