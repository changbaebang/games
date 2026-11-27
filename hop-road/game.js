/* 폴짝 건너기 — 블록 동물 길 건너기. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches;
const SAVE='hopRoad.save',C=2,COLS=D.cols,RW=D.rows;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rand(a,b+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
const save=Object.assign({best:0,coins:0,owned:['chick'],animal:'chick'},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};

const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});
renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());
renderer.shadowMap.enabled=true;$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#8fd16a');
const camera=new THREE.PerspectiveCamera(40,W()/H(),.1,200);
scene.add(new THREE.HemisphereLight(0xffffff,0x6a8a5a,.85));
const sun=new THREE.DirectionalLight(0xffffff,.75);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:80});scene.add(sun);scene.add(sun.target);
function fit(){camera.aspect=W()/H();camera.fov=camera.aspect<1?52:40;camera.updateProjectionMatrix();renderer.setSize(W(),H())}
addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1),mc={};
const lam=c=>mc[c]||(mc[c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
function cube(m,w,h,d,x,y,z,par,sh){const k=new THREE.Mesh(BOX,typeof m==='string'?lam(m):m);k.scale.set(w,h,d);k.position.set(x,y,z);k.castShadow=sh!==false;k.receiveShadow=true;(par||scene).add(k);return k}

// ---------- 줄 만들기
let rows={},maxGen=0,lastType='grass',groupLeft=0,score=0;
function rowType(r){
  if(r<=3)return 'grass';
  if(groupLeft>0){groupLeft--;return lastType}
  const ks=Object.keys(RW).filter(k=>k!==lastType||k==='road'),tot=ks.reduce((a,k)=>a+RW[k].weight,0);let x=Math.random()*tot,t=ks[0];
  for(const k of ks){x-=RW[k].weight;if(x<=0){t=k;break}}
  lastType=t;groupLeft=ri(RW[t].group[0],RW[t].group[1])-1;return t}
function makeRow(r){
  const type=rowType(r),g=new THREE.Group();g.position.z=r*C;scene.add(g);
  const row={r,type,g,objs:[],trees:new Set(),coins:new Map(),dir:Math.random()<.5?1:-1,speed:0};
  const shade=r%2?0:1;
  if(type==='grass'){cube(shade?'#8fd16a':'#84c862',25*C,.4,C,0,-.2,0,g,false);
    const dens=r<=3?0:rand(...RW.grass.trees);
    for(let c=-12;c<=12;c++){const edge=Math.abs(c)>COLS;if(r<=3&&!edge)continue;if((edge&&Math.random()<.7)||(!edge&&Math.random()<dens&&!(r===0))){row.trees.add(c);tree(g,c)}}
  }else if(type==='road'){cube('#5a5f6a',25*C,.4,C,0,-.22,0,g,false);if(rows[r-1]&&rows[r-1].type==='road')for(let c=-12;c<=12;c+=2)cube('#e8e8e8',1.1,.05,.12,c*C,.01,-C/2,g,false);
    row.speed=rand(...RW.road.speed)+r*RW.road.speedPerRow;let x=-14+rand(0,4);
    while(x<14){const truck=Math.random()<RW.road.truck,len=truck?2.4:1.3;row.objs.push({x,len,m:car(g,len,truck)});x+=len+rand(...RW.road.gap)}
  }else if(type==='river'){cube('#4ab0e8',25*C,.2,C,0,-.45,0,g,false);
    row.speed=rand(...RW.river.speed);let x=-14+rand(0,2);
    while(x<14){const len=ri(RW.river.log[0],RW.river.log[1]);row.objs.push({x,len,m:cube('#9a6a3a',len*C-.2,.5,C*.75,0,-.1,0,g)});x+=len+rand(...RW.river.gap)}
  }else{cube('#8a7060',25*C,.4,C,0,-.2,0,g,false);for(let c=-12;c<=12;c++)cube('#6a4a32',.5,.1,C*.9,c*C,.02,0,g,false);
    cube('#c8ccd4',25*C,.12,.15,0,.08,-.45,g,false);cube('#c8ccd4',25*C,.12,.15,0,.08,.45,g,false);
    const pole=cube('#444',.2,2,.2,(COLS+1.5)*C,1,-C*.45,g);row.light=cube(new THREE.MeshBasicMaterial({color:new THREE.Color('#552222')}),.5,.5,.3,(COLS+1.5)*C,2.1,-C*.45,g);
    row.trainT=rand(...RW.rail.every);row.train=null}
  // 동전
  if((type==='grass'||type==='road')&&r>3&&Math.random()<D.coinChance*3){const c=ri(-COLS,COLS);if(!row.trees.has(c)){const m=cube(new THREE.MeshLambertMaterial({color:new THREE.Color('#ffd23f'),emissive:new THREE.Color('#6a4a00')}),.7,.7,.18,c*C,.8,0,g);row.coins.set(c,m)}}
  rows[r]=row;
}
function tree(g,c){const h=ri(1,3);cube('#7a4e2a',.5,.6,.5,c*C,.3,0,g);cube(pick(['#2e9a4a','#3aaa50','#28883e']),1.4,.8*h,1.4,c*C,.6+.4*h,0,g)}
function car(g,len,truck){const k=new THREE.Group();g.add(k);const col=pick(['#ff5a5a','#2f8cff','#ffd23f','#9b6bff','#ff8a2a','#33b86a','#f4f4f4']);
  cube(col,len*C*.95,.8,C*.7,0,.6,0,k);cube(truck?'#e8e8e8':'#26304c',truck?len*C*.55:len*C*.5,.6,C*.6,truck?-len*C*.18:0,1.3,0,k);
  for(const x of [-.32,.32])for(const z of [-.38,.38])cube('#222',.5,.5,.25,x*len*C,.25,z*C,k);return k}
function genUpTo(r){while(maxGen<=r){makeRow(maxGen);maxGen++}}
function trainMesh(row){const k=new THREE.Group();row.g.add(k);for(let i=0;i<4;i++){const x=(i-1.5)*C*3.8;cube(i?'#ffb020':'#ff4a3a',C*3.6,1.8,C*.8,x,1.1,0,k);cube('#bfe6ff',C*3,.5,C*.82,x,1.5,0,k)}return k}

// ---------- 동물
function makeAnimal(a){const g=new THREE.Group(),b=new THREE.Group();g.add(b);scene.add(g);
  cube(a.body,1.1,1.0,1.1,0,.6,0,b);if(a.belly)cube(a.belly,.8,.7,.1,0,.55,.56,b);cube(a.head,.9,.8,.9,0,1.45,.1,b);
  cube('#111',.15,.18,.05,-.22,1.55,.56,b);cube('#111',.15,.18,.05,.22,1.55,.56,b);cube(a.beak,.35,.22,.3,0,1.3,.65,b);
  if(a.ears==='long'){cube(a.body,.2,.7,.15,-.22,2.1,.1,b);cube(a.body,.2,.7,.15,.22,2.1,.1,b)}
  else if(a.ears==='eyes'){cube('#fff',.3,.3,.3,-.25,1.95,.25,b);cube('#fff',.3,.3,.3,.25,1.95,.25,b)}
  else if(a.ears==='small'){cube(a.body,.25,.2,.15,-.3,1.95,.1,b);cube(a.body,.25,.2,.15,.3,1.95,.1,b)}
  else if(a.id==='chick')cube('#ff4a4a',.2,.25,.4,0,1.95,.1,b);
  cube(a.beak,.25,.15,.35,-.3,.05,.1,b);cube(a.beak,.25,.15,.35,.3,.05,.1,b);return {g,b}}
let A=null;function setAnimal(){if(A)scene.remove(A.g);A=makeAnimal(D.animals.find(x=>x.id===save.animal)||D.animals[0])}
const bird=new THREE.Group();scene.add(bird);cube('#5a3a2a',2.4,.8,1.6,0,0,0,bird);cube('#5a3a2a',6,.2,1.4,0,.2,0,bird);cube('#ffd23f',.5,.4,.6,0,-.1,1.1,bird);bird.visible=false;

// ---------- 상태
let state='title',paused=false,time=0,camZ=0,idle=0,coins=0,deathT=0;
const pl={col:0,row:0,x:0,z:0,hop:null,queue:null,face:0,dead:false};
function start(){
  for(const k in rows)scene.remove(rows[k].g);rows={};maxGen=-8;lastType='grass';groupLeft=0;genUpTo(20);
  Object.assign(pl,{col:0,row:0,x:0,z:0,hop:null,queue:null,face:0,dead:false});setAnimal();A.g.position.set(0,0,0);A.b.scale.set(1,1,1);A.g.rotation.set(0,0,0);
  camZ=0;idle=0;coins=0;score=0;bird.visible=false;state='play';paused=false;
  for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;snd('go');$('tapHint').style.opacity=1;setTimeout(()=>$('tapHint').style.opacity=0,3000)}
function hop(dc,dr){if(state!=='play'||paused)return;if(pl.hop){pl.queue=[dc,dr];return}
  const row=rows[pl.row],onRiver=row&&row.type==='river';let tc=pl.col+dc,tr=pl.row+dr;
  const trow=rows[tr];if(!trow)return;
  if(trow.type!=='river'&&!onRiver)tc=Math.round(tc);else if(trow.type!=='river')tc=Math.round(tc);
  if(Math.abs(tc)>COLS+.3)return;
  if(trow.trees.has(Math.round(tc))&&trow.type==='grass'){pl.face=Math.atan2(dc,dr);snd('bounce',1);return}
  pl.face=Math.atan2(dc,dr);pl.hop={x0:pl.x,z0:pl.z,x1:tc*C,z1:tr*C,t:0,col:tc,row:tr};snd('select');idle=0}
function die(how){if(state!=='play')return;state='dying';deathT=0;pl.how=how;snd(how==='water'?'splat':how==='bird'?'alert':'boom');
  if(how==='car'||how==='train'){A.b.scale.set(1.2,.25,1.2)}
}
function endGame(){state='over';save.coins+=coins;const best=score>save.best;if(best)save.best=score;store();if(window.Arcade)Arcade.record('hopRoadBest',save.best);
  setT($('overTitle'),{car:'빵빵! 부딪혔어요',water:'풍덩!',train:'기차가 지나갔어요',bird:'큰 새가 잡아갔어요',away:'떠내려갔어요'}[pl.how]||'앗!');
  setT($('oScore'),score);$('oTxt').textContent=`동전 +${coins}`+(best?' · 최고 기록!':` · 최고 ${save.best}칸`);$('overOv').hidden=false;$('againBtn').focus()}

// ---------- 입력
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}if(e.repeat)return;
  const m={ArrowUp:[0,1],KeyW:[0,1],Space:[0,1],ArrowDown:[0,-1],KeyS:[0,-1],ArrowLeft:[1,0],KeyA:[1,0],ArrowRight:[-1,0],KeyD:[-1,0]}[e.code];if(m){e.preventDefault();hop(...m)}});
const cv=renderer.domElement;let sw=null;
cv.addEventListener('pointerdown',e=>{sw={x:e.clientX,y:e.clientY,id:e.pointerId,done:false}});
cv.addEventListener('pointermove',e=>{if(!sw||sw.done||sw.id!==e.pointerId)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.hypot(dx,dy)<26)return;sw.done=true;
  if(Math.abs(dx)>Math.abs(dy))hop(dx<0?1:-1,0);else hop(0,dy<0?1:-1);$('tapHint').style.opacity=0});
cv.addEventListener('pointerup',e=>{if(sw&&!sw.done&&sw.id===e.pointerId)hop(0,1);sw=null});
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on;if(on)$('resumeBtn').focus()}

// ---------- 매 프레임
function update(dt){
  // 차·통나무·기차 움직이기
  for(const k in rows){const row=rows[k];
    for(const o of row.objs){o.x+=row.dir*row.speed*dt;if(o.x>15)o.x-=30;if(o.x<-15)o.x+=30;o.m.position.x=o.x*C+(row.type==='river'?0:0);if(row.type==='road')o.m.rotation.y=row.dir>0?0:Math.PI}
    if(row.type==='rail'){row.trainT-=dt;const warn=row.trainT<RW.rail.warn&&!row.train;row.light.material.color.set(warn&&Math.floor(time*8)%2?'#ff2020':'#552222');
      if(warn&&Math.abs(row.r-pl.row)<6&&Math.floor(time*8)%4===0)snd('tick');
      if(row.trainT<=0&&!row.train){row.train={x:-row.dir*60,m:trainMesh(row)};if(Math.abs(row.r-pl.row)<6)snd('whoosh')}
      if(row.train){const t=row.train;t.x+=row.dir*RW.rail.trainSpeed*dt;t.m.position.x=t.x;t.m.rotation.y=row.dir>0?0:Math.PI;
        if(Math.abs(t.x)>72){row.g.remove(t.m);row.train=null;row.trainT=rand(...RW.rail.every)}}}}
  // 깡충
  if(pl.hop){const h=pl.hop;h.t+=dt/.14;const k=Math.min(1,h.t);pl.x=h.x0+(h.x1-h.x0)*k;pl.z=h.z0+(h.z1-h.z0)*k;A.g.position.y=Math.sin(k*Math.PI)*.8;A.b.scale.y=1+Math.sin(k*Math.PI)*.15;
    if(k>=1){pl.hop=null;pl.col=h.col;pl.row=h.row;A.g.position.y=0;A.b.scale.y=1;
      if(pl.row>score){score=pl.row;if(score%25===0&&score>0)snd('level')}
      genUpTo(pl.row+22);for(const k2 in rows)if(+k2<pl.row-12){scene.remove(rows[k2].g);delete rows[k2]}
      const row=rows[pl.row];const cm=row&&row.coins.get(Math.round(pl.col));if(cm&&row.type!=='river'){row.g.remove(cm);row.coins.delete(Math.round(pl.col));coins++;snd('coin')}
      if(pl.queue){const q=pl.queue;pl.queue=null;hop(...q)}}}
  else{A.b.scale.y=1-Math.sin(time*6)*.03}
  // 위험 확인
  const row=rows[pl.row];
  if(row&&!pl.hop){
    if(row.type==='river'){let on=null;for(const o of row.objs)if(Math.abs(o.x-pl.col)<o.len/2+.15)on=o;
      if(!on){pl.x=pl.col*C;die('water');return}
      pl.col+=row.dir*row.speed*dt;pl.x=pl.col*C;if(Math.abs(pl.col)>COLS+1.6){die('away');return}}
  }
  const cr=pl.hop?(pl.hop.t>.5?pl.hop.row:Math.round(pl.z/C)):pl.row,crow=rows[cr];
  if(crow&&crow.type==='road')for(const o of crow.objs)if(Math.abs(o.x-pl.x/C)<o.len/2+.33){die('car');return}
  if(crow&&crow.type==='rail'&&crow.train&&Math.abs(crow.train.x-pl.x)<15.8){die('train');return}
  // 화면이 앞으로
  const sp=D.camera.speed+score*D.camera.speedPerRow;camZ=Math.max(camZ+sp*C*dt,pl.z-C*1.5);
  idle+=dt;if(pl.z<camZ-C*3.2||idle>D.camera.idle){die('bird');return}
  setT($('score'),score);setT($('coins'),coins);
}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(!paused){time+=dt;
    if(state==='play')update(dt);
    else if(state==='dying'){deathT+=dt;
      for(const k in rows){const row=rows[k];for(const o of row.objs){o.x+=row.dir*row.speed*dt;if(o.x>15)o.x-=30;if(o.x<-15)o.x+=30;o.m.position.x=o.x*C}}
      if(pl.how==='water')A.g.position.y=-deathT*2;
      if(pl.how==='bird'){bird.visible=true;const k=Math.min(1,deathT/1.2);bird.position.set(pl.x,6-k*5+Math.max(0,deathT-1.2)*8,pl.z+12-k*12);if(deathT>1.2)A.g.position.y=(deathT-1.2)*8}
      if(pl.how==='train'||pl.how==='away')A.g.position.x+=(pl.how==='train'?40:0)*dt;
      if(deathT>1.6){state='over-wait';endGame()}}}
  if(A){A.g.position.x=state==='play'||state==='dying'?pl.x:A.g.position.x;A.g.position.z=pl.z;let d=pl.face-A.g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));A.g.rotation.y+=d*Math.min(1,dt*20)}
  const cx=pl.x*.4,port=camera.aspect<1;
  camera.position.set(cx+(port?3:5),port?20:16,camZ-(port?12:10));camera.lookAt(cx,0,camZ+(port?5:3));
  sun.position.set(cx+10,30,camZ-5);sun.target.position.set(cx,0,camZ+5);
  renderer.render(scene,camera);requestAnimationFrame(frame)}

// ---------- 처음 화면
function toTitle(){state='title';for(const id of ['pauseOv','overOv'])$(id).hidden=true;
  setT($('tBest'),save.best);setT($('tCoins'),save.coins);const box=$('animals');box.innerHTML='';
  for(const a of D.animals){const own=save.owned.includes(a.id),b=document.createElement('button');b.className='an'+(save.animal===a.id?' on':'');
    const i=document.createElement('i');i.style.setProperty('--c',a.body);const s=document.createElement('span');s.textContent=a.name;b.append(i,s);if(!own){const em=document.createElement('em');em.textContent='동전 '+a.price;b.append(em)}
    b.onclick=()=>{if(own){save.animal=a.id}else if(save.coins>=a.price){save.coins-=a.price;save.owned.push(a.id);save.animal=a.id;snd('power')}else{snd('bad');return}store();snd('select');toTitle()};box.appendChild(b)}
  if(!Object.keys(rows).length){maxGen=-8;genUpTo(16)}setAnimal();A.g.position.set(0,0,0);pl.x=0;pl.z=0;camZ=0;$('titleOv').hidden=false}
$('startBtn').onclick=()=>{snd('select');start()};$('againBtn').onclick=()=>{snd('select');start()};$('oTitle').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__hr={pl,get rows(){return rows},get state(){return state},start,hop,get score(){return score},get camZ(){return camZ}};
});
