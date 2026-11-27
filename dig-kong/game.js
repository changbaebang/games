/* 파고파고 고릴라 — 블록 섬을 주먹으로 부수며 보석 찾기. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches,PS=D.player,SAVE='digKong.save';
const [WX,WY,WZ]=D.world;const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const save=Object.assign({best:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#8fd8ff');scene.fog=new THREE.Fog(0x8fd8ff,40,90);
const camera=new THREE.PerspectiveCamera(60,W()/H(),.1,200);
scene.add(new THREE.HemisphereLight(0xffffff,0x6a5a4a,.8));const sun=new THREE.DirectionalLight(0xffffff,.6);sun.position.set(-20,40,10);scene.add(sun);
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?74:60;camera.updateProjectionMatrix();renderer.setSize(W(),H())}addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1),mc={};const lam=c=>mc[c]||(mc[c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
function cube(c,w,h,d,x,y,z,par){const k=new THREE.Mesh(BOX,typeof c==='string'?lam(c):c);k.scale.set(w,h,d);k.position.set(x,y,z);(par||scene).add(k);return k}

// ---------- 블록 세계
let grid=new Uint8Array(WX*WY*WZ),hp=new Uint8Array(WX*WY*WZ),items=new Map(),inst={},dirty=true,LV=null,lvl=0;
const idx=(x,y,z)=>(y*WZ+z)*WX+x,inside=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<WX&&y<WY&&z<WZ;
const get=(x,y,z)=>inside(x,y,z)?grid[idx(x,y,z)]:0;
const solidAt=(x,y,z)=>{const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);if(xi<0||zi<0||xi>=WX||zi>=WZ)return true;if(yi<0)return true;return get(xi,yi,zi)>0};
function makeInst(){for(const k in inst){scene.remove(inst[k]);}inst={};for(let t=1;t<=6;t++){const m=new THREE.InstancedMesh(BOX,new THREE.MeshLambertMaterial({color:new THREE.Color(LV.colors[t])}),WX*WY*WZ);m.count=0;scene.add(m);inst[t]=m}
  const gm=new THREE.InstancedMesh(BOX,new THREE.MeshLambertMaterial({color:new THREE.Color('#c070ff'),emissive:new THREE.Color('#5a2a8a')}),64);gm.count=0;scene.add(gm);inst.gemHint=gm}
const M4=new THREE.Matrix4();
function rebuild(){const cnt={1:0,2:0,3:0,4:0,5:0,6:0};
  for(let y=0;y<WY;y++)for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const t=grid[idx(x,y,z)];if(!t)continue;
    if(get(x+1,y,z)&&get(x-1,y,z)&&get(x,y+1,z)&&get(x,y-1,z)&&get(x,y,z+1)&&get(x,y,z-1)&&x>0&&z>0&&x<WX-1&&z<WZ-1)continue;
    const s=hp[idx(x,y,z)]<(D.blocks[t].hp||1)?.9:1;M4.makeScale(s,s,s);M4.setPosition(x+.5,y+.5,z+.5);inst[t].setMatrixAt(cnt[t]++,M4)}
  for(const t in cnt){inst[t].count=cnt[t];inst[t].instanceMatrix.needsUpdate=true}dirty=false}
function gen(){grid.fill(0);hp.fill(0);items.clear();
  const ph=[Math.random()*6,Math.random()*6,Math.random()*6];
  for(let z=0;z<WZ;z++)for(let x=0;x<WX;x++){const h=Math.round(LV.base+LV.hill*(Math.sin(x*.35+ph[0])*.5+Math.sin(z*.3+ph[1])*.5+Math.sin((x+z)*.2+ph[2])*.3)*.6);
    for(let y=0;y<=Math.min(WY-2,h);y++){let t=y===0?6:y===h?1:y>=h-2?2:3;if(t===3&&Math.random()<LV.rock+(h-y)*.01)t=4;if(t===3&&Math.random()<LV.gold)t=5;grid[idx(x,y,z)]=t;hp[idx(x,y,z)]=D.blocks[t].hp}}
  const bury=(kind,n,minDepth)=>{let k=0,tries=0;while(k<n&&tries<3000){tries++;const x=2+Math.floor(Math.random()*(WX-4)),z=2+Math.floor(Math.random()*(WZ-4));let top=0;for(let y=WY-1;y>0;y--)if(get(x,y,z)){top=y;break}
      const y=Math.max(1,top-minDepth-Math.floor(Math.random()*3));const i=idx(x,y,z);if(!grid[i]||grid[i]===6||items.has(i))continue;items.set(i,kind);k++}};
  bury('gem',LV.gems,2);bury('nana',LV.bananas,0);}

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

// ---------- 부수기
function breakBlock(x,y,z,dmg){if(!inside(x,y,z))return false;const i=idx(x,y,z),t=grid[i];if(!t||t===6)return false;
  hp[i]=Math.max(0,hp[i]-dmg);dirty=true;
  if(hp[i]>0){snd('thud');burst(x+.5,y+.5,z+.5,LV.colors[t],3);return true}
  grid[i]=0;burst(x+.5,y+.5,z+.5,LV.colors[t],8);snd(t>=3?'crack':'pop');
  const c=D.blocks[t].coin;if(c){coins+=c;if(t===5)toast('금화 +'+c)}
  const it=items.get(i);if(it){items.delete(i);pick.push({kind:it,x:x+.5,y:y+.5,z:z+.5,vy:4,m:itemMesh(it),t:0})}return true}
function itemMesh(k){const g=new THREE.Group();scene.add(g);if(k==='gem'){const m=cube(new THREE.MeshLambertMaterial({color:new THREE.Color('#c070ff'),emissive:new THREE.Color('#6a2aaa')}),.55,.55,.55,0,0,0,g);m.rotation.set(.6,.6,0)}else{cube('#ffe14a',.25,.7,.25,0,0,0,g).rotation.z=.5;cube('#ffe14a',.25,.5,.25,.15,.1,0,g).rotation.z=-.3}return g}
function burst(x,y,z,col,n){for(let i=0;i<n;i++){if(fx.length>90)break;const m=cube(col,.18,.18,.18,x+(Math.random()-.5)*.6,y+(Math.random()-.5)*.6,z+(Math.random()-.5)*.6);fx.push({m,vx:(Math.random()-.5)*5,vy:Math.random()*5,vz:(Math.random()-.5)*5,t:.6})}}
function punch(power){
  pl.punchT=.25;const fx_=Math.sin(pl.face),fz=Math.cos(pl.face);let hit=false;snd(power>1?'boom':'slash');
  // 두더지
  for(const m of moles){if(m.dead)continue;const dx=m.x-pl.x,dz=m.z-pl.z,d=Math.hypot(dx,dz);if(d<PS.punch+.6&&Math.abs(m.y-pl.y)<1.6&&(dx*fx_+dz*fz)>-.2){m.hp-=power;m.hit=.2;m.vx=dx/d*6;m.vz=dz/d*6;if(m.hp<=0){m.dead=true;scene.remove(m.g);coins+=5;toast('두더지 퇴치! +5');snd('power')}hit=true}}
  // 블록: 앞쪽, 몸통 높이와 발 높이
  for(let s=.6;s<=PS.punch&&!hit;s+=.3){const px=pl.x+fx_*s,pz=pl.z+fz*s;for(const hy of [pl.y+.4,pl.y+1.2,pl.y-.4]){const bx=Math.floor(px),by=Math.floor(hy),bz=Math.floor(pz);if(get(bx,by,bz)){
      if(power>1){for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++)breakBlock(bx+a,by+b,bz+c,power);shake=.4}else breakBlock(bx,by,bz,1);hit=true;break}}}
  if(!hit&&power>1)shake=.2}
function punchDown(){pl.punchT=.25;snd('slash');const by=Math.floor(pl.y-.1),done=new Set();for(const dx of [-R,R])for(const dz of [-R,R]){const bx=Math.floor(pl.x+dx),bz=Math.floor(pl.z+dz),k=bx+','+bz;if(done.has(k))continue;done.add(k);breakBlock(bx,by,bz,pl.charge>=PS.charge?3:1)}}
function releasePunch(){if(state!=='play'||paused)return;const p=pl.charge>=PS.charge?3:1;pl.charge=0;$('chargeBar').classList.remove('on');punch(p)}

// ---------- 두더지
function spawnMoles(){for(const m of moles)scene.remove(m.g);moles=[];for(let i=0;i<LV.moles;i++){const x=2+Math.random()*(WX-4),z=2+Math.random()*(WZ-4);let y=WY-1;while(y>0&&!get(Math.floor(x),y-1,Math.floor(z)))y--;
  const g=new THREE.Group();cube('#8a6a5a',.9,.7,1.1,0,.35,0,g);cube('#ffb0b0',.3,.2,.2,0,.45,.6,g);cube('#111',.1,.1,.05,-.18,.6,.56,g);cube('#111',.1,.1,.05,.18,.6,.56,g);scene.add(g);
  moles.push({g,x,y,z,vx:0,vz:0,vy:0,hp:2,hit:0,dead:false,dir:Math.random()*6,t:0})}}

// ---------- 몸 움직이기(블록 충돌)
const R=.32,HT=1.7;
function blocked(x,y,z){for(const dx of [-R,R])for(const dz of [-R,R])for(const dy of [.002,HT*.5,HT-.05])if(solidAt(x+dx,y+dy,z+dz))return true;return false}
function moveBody(b,dt,ht){b.ground=false;const nx=b.x+b.vx*dt;if(!blocked(nx,b.y,b.z))b.x=nx;else if(b.stepUp&&b.ground0&&!blocked(nx,b.y+1.05,b.z)){}else b.vx=0;
  const nz=b.z+b.vz*dt;if(!blocked(b.x,b.y,nz))b.z=nz;else b.vz=0;
  b.vy-=PS.gravity*dt;const ny=b.y+b.vy*dt;if(!blocked(b.x,ny,b.z))b.y=ny;else{if(b.vy<0){b.y=Math.floor(ny)+1;b.ground=true}b.vy=0}
  if(b.y<-5)b.y=WY}

// ---------- 진행
let shake=0;
function begin(i){lvl=i;LV=D.levels[i%D.levels.length];scene.background=new THREE.Color(LV.sky);scene.fog.color=new THREE.Color(LV.sky);makeInst();gen();rebuild();
  for(const p of pick)scene.remove(p.m);pick=[];Object.assign(pl,{x:WX/2,z:WZ/2,y:WY,vx:0,vy:0,vz:0,hp:i===lvl&&state==='clear'?pl.hp:PS.hp,inv:0,charge:0});spawnMoles();gems=0;
  if(state!=='clear'){nanas=0;coins=0}state='play';paused=false;for(const id of ['titleOv','endOv','pauseOv'])$(id).hidden=true;toast((i+1)+'층 · '+LV.name);snd('go')}
function update(dt){
  const fx_=Math.sin(yaw),fz=Math.cos(yaw),rx=-fz,rz=fx_;
  let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y,s=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x;
  if(keys.ArrowLeft)yaw+=1.8*dt;if(keys.ArrowRight)yaw-=1.8*dt;
  let mx=fx_*f+rx*s,mz=fz*f+rz*s;const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml}
  pl.vx=mx*PS.speed;pl.vz=mz*PS.speed;if(ml>.1)pl.face=Math.atan2(mx,mz);
  // 한 칸 높이는 자동으로 올라가기
  if(ml>.1&&pl.ground){const ax=pl.x+mx*.5,az=pl.z+mz*.5;if(blocked(ax,pl.y,az)&&!blocked(ax,pl.y+1.05,az)&&!blocked(pl.x,pl.y+1.05,pl.z))pl.vy=Math.max(pl.vy,6.5)}
  if(jumpQ&&pl.ground){pl.vy=PS.jump;snd('jump')}jumpQ=false;
  // 벽에 붙어 앞으로 밀면 기어오르기 (구덩이에서 나오기)
  if(ml>.1&&!pl.ground){const ax=pl.x+mx*.45,az=pl.z+mz*.45;if(blocked(ax,pl.y,az)){pl.vy=Math.max(pl.vy,4.2);pl.climb=true}else pl.climb=false}else pl.climb=false;
  if(ml>.1&&pl.ground){const ax=pl.x+mx*.45,az=pl.z+mz*.45;if(blocked(ax,pl.y,az)&&blocked(ax,pl.y+1.05,az))pl.vy=Math.max(pl.vy,4.2)}
  moveBody(pl,dt);
  if(punchHeld){pl.charge+=dt;if(pl.charge>.15){$('chargeBar').classList.add('on');$('chargeBar').querySelector('i').style.width=Math.min(100,pl.charge/PS.charge*100)+'%'}}
  if(downQ){downQ=false;punchDown()}
  pl.inv=Math.max(0,pl.inv-dt);pl.punchT=Math.max(0,pl.punchT-dt);
  // 두더지
  for(const m of moles){if(m.dead)continue;m.t-=dt;m.hit=Math.max(0,m.hit-dt);const d=Math.hypot(pl.x-m.x,pl.z-m.z);
    if(m.t<=0){m.t=1+Math.random()*2;m.dir=d<6?Math.atan2(pl.x-m.x,pl.z-m.z):Math.random()*6}
    if(m.hit<=0){m.vx=Math.sin(m.dir)*1.8;m.vz=Math.cos(m.dir)*1.8}else{m.vx*=.9;m.vz*=.9}
    const ox=m.x;moveBody(m,dt);if(m.x===ox&&m.ground)m.vy=6;m.g.position.set(m.x,m.y,m.z);m.g.rotation.y=m.dir;m.g.position.y+=Math.abs(Math.sin(time*8))*.1;
    if(d<.8&&Math.abs(m.y-pl.y)<1.2&&pl.inv<=0){pl.hp--;pl.inv=1.3;pl.vy=5;snd('hurt');toast('아야!');if(pl.hp<=0){lose();return}}}
  // 줍기
  for(let i=pick.length-1;i>=0;i--){const p=pick[i];p.t+=dt;p.vy-=12*dt;const ny=p.y+p.vy*dt;if(solidAt(p.x,ny-.3,p.z)){p.vy=0}else p.y=ny;p.m.position.set(p.x,p.y+Math.sin(time*3)*.1,p.z);p.m.rotation.y+=dt*2;
    if(p.t>.3&&Math.hypot(p.x-pl.x,p.z-pl.z)<1&&Math.abs(p.y-(pl.y+.8))<1.4){scene.remove(p.m);pick.splice(i,1);
      if(p.kind==='gem'){gems++;snd('level');toast('보석 '+gems+'/'+LV.gems+'!');if(gems>=LV.gems){clearLevel();return}}else{nanas++;if(pl.hp<PS.hp){pl.hp++;toast('바나나! 힘이 나요')}else toast('바나나!');snd('coin')}}}
  for(let i=fx.length-1;i>=0;i--){const p=fx[i];p.t-=dt;p.vy-=14*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;if(p.t<=0){scene.remove(p.m);fx.splice(i,1)}}
  if(dirty)rebuild();
  // 보석 힌트: 보석이 묻힌 기둥 맨 위에서 반짝
  const gh=inst.gemHint;let n=0;for(const [i,k] of items){if(k!=='gem')continue;const x=i%WX,z=Math.floor(i/WX)%WZ;let top=0;for(let y=WY-1;y>0;y--)if(get(x,y,z)){top=y;break}
    const s=.18+Math.abs(Math.sin(time*4+x))*.12;M4.makeScale(s,s,s);M4.setPosition(x+.5,top+1.3+Math.sin(time*2+z)*.2,z+.5);gh.setMatrixAt(n++,M4)}gh.count=n;gh.instanceMatrix.needsUpdate=true;
  // 고릴라 모양
  G.position.set(pl.x,pl.y,pl.z);let dd=pl.face-G.rotation.y;dd=Math.atan2(Math.sin(dd),Math.cos(dd));G.rotation.y+=dd*Math.min(1,dt*14);
  pl.phase+=dt*ml*10;const w=pl.ground?Math.sin(pl.phase)*Math.min(1,ml):0;legL.rotation.x=w*.7;legR.rotation.x=-w*.7;
  armR.rotation.x=pl.climb?-2.8:pl.punchT>0?-1.6:punchHeld?-.5:-w*.6;armL.rotation.x=pl.punchT>0&&pl.charge===0?-1.6:w*.6;Gb.visible=!(pl.inv>0&&Math.floor(time*12)%2);
  setT($('hearts'),'♥'.repeat(Math.max(0,pl.hp))+'♡'.repeat(Math.max(0,PS.hp-pl.hp)));setT($('gems'),gems+'/'+LV.gems);setT($('nanas'),nanas);setT($('coins'),coins);
}
function clearLevel(){state='clear';snd('win');const deep=lvl+1;if(deep>save.best){save.best=deep;store()}if(window.Arcade)Arcade.record('digKongDepth',save.best);
  setT($('eTitle'),(lvl+1)+'층 클리어!');$('eTxt').textContent=`보석을 모두 찾았어요! 금화 ${coins} · 바나나 ${nanas}`;$('nextBtn').hidden=false;setTimeout(()=>$('endOv').hidden=false,700)}
function lose(){state='over';snd('lose');setT($('eTitle'),'쾅쾅이가 지쳤어요');$('eTxt').textContent=`${lvl+1}층까지 왔어요 · 금화 ${coins}`;$('nextBtn').hidden=true;setTimeout(()=>$('endOv').hidden=false,600)}
function toast(t){const el=$('toast');el.textContent=t;el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused){time+=dt;if(state==='play')update(dt);else yaw+=dt*(state==='title'?.15:0)}
  shake=Math.max(0,shake-dt);const cp=Math.cos(pitch),dd=state==='title'?26:dist,px=state==='title'?WX/2:pl.x,py=state==='title'?6:pl.y,pz=state==='title'?WZ/2:pl.z;
  camera.position.set(px-Math.sin(yaw)*cp*dd+(Math.random()-.5)*shake,py+1.5+Math.sin(pitch)*dd,pz-Math.cos(yaw)*cp*dd);camera.lookAt(px,py+1,pz);
  renderer.render(scene,camera);requestAnimationFrame(frame)}
function toTitle(){state='title';for(const id of ['pauseOv','endOv'])$(id).hidden=true;if(!LV){LV=D.levels[0];makeInst();gen();rebuild()}setT($('tBest'),save.best);$('titleOv').hidden=false}
$('startBtn').onclick=()=>{snd('select');state='title';begin(0)};$('nextBtn').onclick=()=>{snd('click');begin(lvl+1)};$('eMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__dk={pl,get state(){return state},begin,punch,punchDown,get items(){return items},get gems(){return gems},get:get,keys,get moles(){return moles},get pick(){return pick},set yaw(v){yaw=v}};
});
