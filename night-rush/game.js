/* 나이트 러시 — 3D 거리 레이싱. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const W=()=>innerWidth,H=()=>innerHeight,$=id=>document.getElementById(id);
const MOBILE=matchMedia('(pointer:coarse)').matches;
const SAVE='nightRush.save',PH=D.physics,RD=D.road,HALF=RD.half,WALL=RD.half+RD.shoulder;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const CAR=id=>D.cars.find(c=>c.id===id)||D.cars[0];
const fmt=t=>{t=Math.max(0,t);const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1)};

// ---------- 저장
const save=Object.assign({coins:0,owned:['street'],car:'street',color:0,unlocked:1,best:{},ctrl:'drag',assist:true,wins:0,escapes:0},
  (()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
function store(){try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}}

// ---------- three.js
const renderer=new THREE.WebGLRenderer({antialias:!MOBILE||devicePixelRatio<2});
renderer.setPixelRatio(Math.min(devicePixelRatio,MOBILE?1.5:2));renderer.setSize(W(),H());
$('game').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1030');scene.fog=new THREE.Fog(0x0b1030,60,360);
const camera=new THREE.PerspectiveCamera(64,W()/H(),.5,1500);camera.rotation.order='YXZ';
const hemi=new THREE.HemisphereLight(0xffffff,0x334455,.8);scene.add(hemi);
const sunL=new THREE.DirectionalLight(0xffffff,.5);sunL.position.set(-200,300,120);scene.add(sunL);
let baseFov=64;
function fit(){camera.aspect=W()/H();baseFov=camera.aspect<1?78:64;camera.updateProjectionMatrix();renderer.setSize(W(),H())}
addEventListener('resize',fit);fit();
const BOX=new THREE.BoxGeometry(1,1,1);
const matCache={};
const lam=c=>matCache['l'+c]||(matCache['l'+c]=new THREE.MeshLambertMaterial({color:new THREE.Color(c)}));
const basic=c=>matCache['b'+c]||(matCache['b'+c]=new THREE.MeshBasicMaterial({color:new THREE.Color(c)}));
function cube(m,w,h,d,x,y,z,parent){const k=new THREE.Mesh(BOX,m);k.scale.set(w,h,d);k.position.set(x,y,z);(parent||world).add(k);return k}
function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);return t}

// ---------- 트랙 만들기 (조절점 → 2m 간격 샘플)
let TR=null,S=[],L=1,M=1,DS=2,world=null,minY=0,mapImg=null,mapBox=null;
function buildTrack(T){
  const P=T.points.map(p=>({x:p[0],z:p[1],y:p[2]||0})),n=P.length,dense=[];
  const cr=(a,b,c,d,t,k)=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
  for(let i=0;i<n;i++){const a=P[(i-1+n)%n],b=P[i],c=P[(i+1)%n],d=P[(i+2)%n];
    for(let j=0;j<32;j++){const t=j/32;dense.push({x:cr(a,b,c,d,t,'x'),z:cr(a,b,c,d,t,'z'),y:cr(a,b,c,d,t,'y')})}}
  const cum=[0];for(let i=1;i<=dense.length;i++){const a=dense[i-1],b=dense[i%dense.length];cum.push(cum[i-1]+Math.hypot(b.x-a.x,b.z-a.z))}
  L=cum[dense.length];M=Math.round(L/2);DS=L/M;S=[];let j=0;
  for(let i=0;i<M;i++){const s=i*DS;while(cum[j+1]<s)j++;const t=(s-cum[j])/(cum[j+1]-cum[j]),a=dense[j],b=dense[(j+1)%dense.length];
    S.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t})}
  for(let i=0;i<M;i++){const a=S[(i-1+M)%M],b=S[(i+1)%M];S[i].h=Math.atan2(b.x-a.x,b.z-a.z);S[i].g=(b.y-a.y)/(2*DS)}
  const kr=[];for(let i=0;i<M;i++){let dh=S[(i+1)%M].h-S[(i-1+M)%M].h;dh=Math.atan2(Math.sin(dh),Math.cos(dh));kr.push(dh/(2*DS))}
  for(let i=0;i<M;i++){let s=0;for(let w=-4;w<=4;w++)s+=kr[(i+w+M)%M];S[i].k=s/9}
  // 앞쪽 가장 급한 커브(인공지능 속도 조절용)
  for(let i=0;i<M;i++){let best=0;for(let w=0;w<=35;w+=3){const k=S[(i+w)%M].k;if(Math.abs(k)>Math.abs(best))best=k}S[i].ka=best}
  minY=Math.min(...S.map(s=>s.y));
}
const TP={x:0,y:0,z:0,h:0,k:0,g:0,ka:0};
const wrapS=s=>((s%L)+L)%L;
const rel=(a,b)=>{let r=wrapS(b-a);if(r>L/2)r-=L;return r};
function at(s){s=wrapS(s);const f=s/DS,i=Math.floor(f)%M,t=f-Math.floor(f),a=S[i],b=S[(i+1)%M];
  TP.x=a.x+(b.x-a.x)*t;TP.y=a.y+(b.y-a.y)*t;TP.z=a.z+(b.z-a.z)*t;let dh=b.h-a.h;dh=Math.atan2(Math.sin(dh),Math.cos(dh));TP.h=a.h+dh*t;
  TP.k=a.k+(b.k-a.k)*t;TP.g=a.g;TP.ka=a.ka;return TP}
// 오른쪽 = (-cos h, sin h)
function worldPos(s,d,o){const p=at(s);o.x=p.x-Math.cos(p.h)*d;o.z=p.z+Math.sin(p.h)*d;o.y=p.y;o.h=p.h;o.g=p.g;return o}

// 도로에서 떨어진 거리 (풍경 배치용 격자)
let grid={};
function gridBuild(){grid={};S.forEach((p,i)=>{const k=Math.floor(p.x/24)+','+Math.floor(p.z/24);(grid[k]||(grid[k]=[])).push(p)})}
function roadDist(x,z){let best=999;const cx=Math.floor(x/24),cz=Math.floor(z/24);
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const g=grid[(cx+a)+','+(cz+b)];if(g)for(const p of g){const d=Math.hypot(p.x-x,p.z-z);if(d<best)best=d}}return best}

function strip(rows,mat){const n=rows.length,pos=new Float32Array(n*6),uv=new Float32Array(n*4),idx=[];
  rows.forEach((r,i)=>{pos.set(r.slice(0,6),i*6);uv.set([0,r[6],1,r[6]],i*4);if(i<n-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3)}});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.Mesh(g,mat);world.add(m);return m}
const roadTex=canvasTex(128,128,(g)=>{g.fillStyle='#3b3e48';g.fillRect(0,0,128,128);
  for(let i=0;i<420;i++){g.fillStyle=Math.random()<.5?'#35373f':'#44474f';g.fillRect(Math.random()*128,Math.random()*128,2,2)}
  for(let y=0;y<128;y+=32){g.fillStyle=(y/32)%2?'#eeeeee':'#e0303c';g.fillRect(0,y,7,32);g.fillRect(121,y,7,32)}
  g.fillStyle='#f4f4f4';g.fillRect(9,0,2,128);g.fillRect(117,0,2,128);
  for(const x of [32,64,96])g.fillRect(x-1.5,0,3,60)});
roadTex.wrapS=roadTex.wrapT=THREE.RepeatWrapping;
const winTex=[0,1,2].map(v=>canvasTex(64,128,(g,w,h)=>{g.fillStyle=['#1c2140','#24203a','#1a2a3a'][v];g.fillRect(0,0,w,h);
  for(let y=6;y<h-4;y+=10)for(let x=5;x<w-4;x+=10){const on=Math.random()<.55;g.fillStyle=on?pick(['#ffe8a0','#ffd36a','#a0e8ff','#ffffff']):'#11142a';g.fillRect(x,y,6,6)}}));
const rampTex=canvasTex(64,64,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#1a1a1a':'#ffcf1f';g.fillRect(i*8,0,8,64)}g.fillStyle='rgba(255,255,255,.25)';g.fillRect(0,0,64,6)});
const padTex=canvasTex(64,128,(g)=>{g.fillStyle='#0a3a5a';g.fillRect(0,0,64,128);g.strokeStyle='#5ff0ff';g.lineWidth=9;g.lineJoin='round';
  for(let y=8;y<128;y+=40){g.beginPath();g.moveTo(8,y);g.lineTo(32,y+24);g.lineTo(56,y);g.stroke()}});
const padMat=new THREE.MeshBasicMaterial({map:padTex});
const checkTex=canvasTex(64,16,(g)=>{for(let x=0;x<16;x++)for(let y=0;y<4;y++){g.fillStyle=(x+y)%2?'#111':'#f4f4f4';g.fillRect(x*4,y*4,4,4)}});
const gateTex=canvasTex(256,48,(g,w,h)=>{g.fillStyle='#ff3b8a';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.font='32px Jua, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('NIGHT RUSH',w/2,h/2+2)});

function buildWorld(T){
  if(world){scene.remove(world);world.traverse(n=>{if(n.isMesh&&n.geometry!==BOX)n.geometry.dispose()})}
  world=new THREE.Group();scene.add(world);
  TR=T;buildTrack(T);gridBuild();
  const th=D.themes[T.theme];
  scene.background=new THREE.Color(th.sky);scene.fog.color=new THREE.Color(th.fog);scene.fog.far=th.fogFar;scene.fog.near=th.fogFar*.18;
  hemi.intensity=th.hemi;sunL.intensity=th.sun;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),lam(th.ground));ground.rotation.x=-Math.PI/2;ground.position.y=minY-.6;world.add(ground);
  const row=(i,d1,d2,y1,y2,v)=>{const p=S[i%M],c=Math.cos(p.h),s=Math.sin(p.h);return [p.x-c*d1,p.y+y1,p.z+s*d1,p.x-c*d2,p.y+y2,p.z+s*d2,v]};
  const R=[],SH1=[],SH2=[],B1=[],B2=[],K1=[],K2=[];
  for(let i=0;i<=M;i++){const v=i*DS/12;
    R.push(row(i,-HALF,HALF,.03,.03,v));SH1.push(row(i,-WALL-.4,-HALF,.02,.02,0));SH2.push(row(i,HALF,WALL+.4,.02,.02,0));
    B1.push(row(i,-WALL-.4,-WALL-.4,0,1.0,0));B2.push(row(i,WALL+.4,WALL+.4,0,1.0,0));
    K1.push(row(i,-WALL-.4,-WALL-.4,minY-S[i%M].y-.6,0,0));K2.push(row(i,WALL+.4,WALL+.4,minY-S[i%M].y-.6,0,0))}
  const ds=THREE.DoubleSide;
  strip(R,new THREE.MeshLambertMaterial({map:roadTex,side:ds}));
  const shm=new THREE.MeshLambertMaterial({color:new THREE.Color(th.shoulder),side:ds});strip(SH1,shm);strip(SH2,shm);
  const bm=new THREE.MeshLambertMaterial({color:new THREE.Color(th.barrier),side:ds});strip(B1,bm);strip(B2,bm);
  const km=new THREE.MeshLambertMaterial({color:new THREE.Color(th.skirt),side:ds});strip(K1,km);strip(K2,km);
  // 출발선과 아치
  const p0=at(0),line=new THREE.Mesh(BOX,new THREE.MeshBasicMaterial({map:checkTex}));line.scale.set(HALF*2,.05,3);line.position.set(p0.x,p0.y+.06,p0.z);line.rotation.y=p0.h;world.add(line);
  const gate=new THREE.Group();gate.position.set(p0.x,p0.y,p0.z);gate.rotation.y=p0.h;world.add(gate);
  cube(lam('#2a2f4a'),1.2,8,1.2,WALL+1.4,4,0,gate);cube(lam('#2a2f4a'),1.2,8,1.2,-WALL-1.4,4,0,gate);
  const ban=new THREE.Mesh(BOX,[basic('#ff3b8a'),basic('#ff3b8a'),basic('#ff3b8a'),basic('#ff3b8a'),new THREE.MeshBasicMaterial({map:gateTex}),new THREE.MeshBasicMaterial({map:gateTex})]);
  ban.scale.set(WALL*2+4,2.2,.6);ban.position.y=8.4;gate.add(ban);
  scenery(th.scenery);
  placeFeatures();
  drawMapBase();
}
// 점프대·부스트 판 (곧은 길에 자동 배치)
const F=D.features,G=28;let ramps=[],pads=[];
function placeFeatures(){
  ramps=[];pads=[];
  const straight=s=>{for(let x=-20;x<=55;x+=5)if(Math.abs(at(s+x).k)>.0055)return false;return true};
  const near=(s,list,dist)=>list.some(o=>Math.abs(rel(o.s,s))<dist);
  for(let i=0;i<F.ramps;i++){const want=L*(i+.55)/F.ramps;
    for(let o=0;o<L/F.ramps*.5;o+=6){let hit=null;for(const x of [want+o,want-o]){const ss=wrapS(x);if(ss>120&&ss<L-60&&straight(ss)&&!near(ss,ramps,L/(F.ramps+1)*.6)){hit=ss;break}}if(hit!=null){ramps.push({s:hit});break}}}
  for(let i=0;i<F.boostPads;i++){const want=L*(i+.2)/F.boostPads;
    for(let o=0;o<90;o+=4){let hit=null;for(const x of [want+o,want-o]){const ss=wrapS(x);if(ss>60&&ss<L-40&&Math.abs(at(ss).ka)<.006&&!near(ss,ramps,50)&&!near(ss,pads,40)){hit=ss;break}}
      if(hit!=null){pads.push({s:hit,d:RD.lanes[(i*3+1)%RD.lanes.length]});break}}}
  const ang=Math.atan(F.rampHeight/F.rampLen);
  for(const r of ramps){const p=at(r.s+F.rampLen/2),m=new THREE.Mesh(BOX,new THREE.MeshLambertMaterial({map:rampTex}));
    m.scale.set(HALF*2,.3,Math.hypot(F.rampLen,F.rampHeight));m.rotation.order='YXZ';m.rotation.y=p.h;m.rotation.x=-ang-Math.atan(p.g);m.position.set(p.x,p.y+F.rampHeight/2,p.z);world.add(m);
    const e=at(r.s+F.rampLen);cube(lam('#555a66'),HALF*2,F.rampHeight,.4,0,0,0).position.set(e.x,e.y+F.rampHeight/2,e.z);world.children[world.children.length-1].rotation.y=e.h}
  for(const q of pads){const o=worldPos(q.s,q.d,TMP),m=new THREE.Mesh(BOX,padMat);m.scale.set(3.6,.06,6);m.rotation.order='YXZ';m.rotation.y=o.h;m.rotation.x=-Math.atan(o.g);m.position.set(o.x,o.y+.07,o.z);world.add(m)}
}
const crossed=(a,b,x)=>b>=a?(x>a&&x<=b):(x>a||x<=b);
function rampAir(c,prev,dt){
  if(c.air){c.avy-=G*dt;c.ay+=c.avy*dt;if(c.ay<=0){c.ay=0;c.air=false;c.avy=0;return 'land'}return 'air'}
  c.ay=0;
  for(const r of ramps){const into=wrapS(c.s-r.s);if(into<F.rampLen&&Math.abs(c.d)<HALF+.5)c.ay=into/F.rampLen*F.rampHeight;
    if(Math.abs(c.d)<HALF+.5&&crossed(prev,c.s,wrapS(r.s+F.rampLen))){c.air=true;c.ay=F.rampHeight;c.avy=c.v>F.jumpMin?c.v*F.jumpLift:0;return c.avy>0?'jump':'drop'}}
  return null}
function scenery(kind){
  let seed=7;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;
  const place=(minOff,maxOff,step,fn)=>{for(let s=0;s<L;s+=step)for(const side of [-1,1]){if(rnd()<.25)continue;
    const off=minOff+rnd()*(maxOff-minOff),p=at(s),x=p.x-Math.cos(p.h)*off*side,z=p.z+Math.sin(p.h)*off*side;fn(x,z,p,rnd,side)}};
  if(kind==='city'){
    const wm=winTex.map(t=>new THREE.MeshBasicMaterial({map:t})),roof=lam('#141830');
    place(WALL+12,WALL+40,15,(x,z,p,r)=>{const w=8+r()*12,d=8+r()*12,h=14+r()*55;if(roadDist(x,z)<WALL+Math.max(w,d)*.75)return;
      const b=new THREE.Mesh(BOX,[wm[0],wm[1],roof,roof,wm[2],wm[0]].map((m,i)=>i===2||i===3?roof:wm[Math.floor(r()*3)]));b.scale.set(w,h,d);b.position.set(x,minY-.6+h/2,z);b.rotation.y=p.h;world.add(b)});
    for(let s=0;s<L;s+=44)for(const side of [-1,1]){const p=at(s+side*11),off=(WALL+1.2)*side,x=p.x-Math.cos(p.h)*off,z=p.z+Math.sin(p.h)*off;
      cube(lam('#4a5068'),.3,7,.3,x,p.y+3.5,z);cube(basic('#ffe9a8'),.9,.35,.9,x+Math.cos(p.h)*side*.6,p.y+7,z-Math.sin(p.h)*side*.6)}
  }else if(kind==='coast'){
    const trunk=lam('#9a6a3a'),leaf=lam('#2f9a4a'),rock=lam('#a08f7a');
    place(WALL+5,WALL+30,13,(x,z,p,r)=>{if(roadDist(x,z)<WALL+4)return;const y=minY-.6;
      if(r()<.65){const h=5+r()*4,t=cube(trunk,.5,h,.5,x,y+h/2,z);t.rotation.z=(r()-.5)*.3;cube(leaf,4,.4,1.2,x,y+h,z).rotation.y=r()*3;cube(leaf,1.2,.4,4,x,y+h+.1,z).rotation.y=r()*3}
      else{const s=1.5+r()*3;cube(rock,s,s*.7,s,x,y+s*.3,z).rotation.y=r()*3}});
    place(WALL+45,WALL+90,60,(x,z,p,r)=>{if(roadDist(x,z)<WALL+10)return;const w=6+r()*4;cube(lam(pick(['#ff9a7a','#7ac8ff','#fff1c0','#a0e0b0'])),w,4,w,x,minY-.6+2,z);cube(lam('#c0503a'),w+.6,.8,w+.6,x,minY-.6+4.4,z)});
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),lam('#2f8fc4'));sea.rotation.x=-Math.PI/2;sea.position.set(0,minY-.55,-2200);world.add(sea);
  }else{
    const trunk=lam('#6a4a2a'),pine=lam('#2a6a3a'),pine2=lam('#3a7a44'),rock=lam('#8a8a92');
    place(WALL+4,WALL+34,9,(x,z,p,r)=>{if(roadDist(x,z)<WALL+3)return;const y=Math.max(minY-.6,p.y-2);
      if(r()<.8){const h=5+r()*5;cube(trunk,.6,h*.4,.6,x,y+h*.2,z);for(let i=0;i<3;i++){const s=(3.2-i)*(h/7);cube(i%2?pine2:pine,s,h*.28,s,x,y+h*.35+i*h*.22,z)}}
      else{const s=2+r()*4;cube(rock,s,s*.8,s,x,y+s*.3,z).rotation.y=r()*3}});
  }
}

// ---------- 자동차
function makeCar(color,shape,police){
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);g.rotation.order='YXZ';scene.add(g);
  const body=lam(police?'#f4f6fa':color),dark=lam('#15171f'),glass=lam('#26304c');
  const low=shape==='hyper'?.82:shape==='sport'?.9:1,cl=shape==='hatch'?2.2:shape==='muscle'?1.7:1.6,cz=shape==='muscle'?-.55:shape==='hatch'?-.3:-.2;
  cube(body,2.0,.55*low,4.4,0,.62*low,0,b);
  cube(glass,1.7,.5*low,cl,0,(1.12)*low,cz,b);cube(body,1.62,.08,cl*.9,0,1.4*low,cz,b);
  if(shape==='muscle')cube(dark,.5,.12,1.4,0,.95,1.3,b);
  if(shape==='sport'||shape==='hyper'){cube(body,1.9,.08,.45,0,1.2*low,-2.0,b);cube(dark,.1,.35,.1,.6,1.0*low,-2.0,b);cube(dark,.1,.35,.1,-.6,1.0*low,-2.0,b)}
  if(shape==='hyper')cube(basic(color),2.04,.06,4.42,0,.4,0,b);
  for(const x of [-1.02,1.02])for(const z of [-1.4,1.4])cube(dark,.38,.72,.76,x,.38,z,b);
  cube(basic('#fff4c0'),.46,.16,.06,.62,.66*low,2.2,b);cube(basic('#fff4c0'),.46,.16,.06,-.62,.66*low,2.2,b);
  cube(basic('#ff2a3a'),.5,.16,.06,.66,.7*low,-2.2,b);cube(basic('#ff2a3a'),.5,.16,.06,-.66,.7*low,-2.2,b);
  const sh=new THREE.Mesh(BOX,new THREE.MeshBasicMaterial({color:new THREE.Color('#000'),transparent:true,opacity:.35,depthWrite:false}));sh.scale.set(2.3,.02,4.7);sh.position.y=.03;g.add(sh);
  const glow=new THREE.Mesh(BOX,new THREE.MeshBasicMaterial({color:new THREE.Color('#22e0ff'),transparent:true,opacity:.55,depthWrite:false}));glow.scale.set(2.9,.02,5.3);glow.position.y=.06;glow.visible=false;g.add(glow);
  let red=null,blue=null;
  if(police){cube(dark,2.04,.32,1.7,0,.6,0,b);red=cube(basic('#ff2030'),.6,.2,.4,-.33,1.55,cz,b);blue=cube(basic('#2060ff'),.6,.2,.4,.33,1.55,cz,b)}
  return {g,b,red,blue,body,glow}
}
function placeCar(c,yaw,roll){const o=worldPos(c.s,c.d,TMP);c.m.g.position.set(o.x,o.y+(c.ay||0),o.z);c.m.g.rotation.y=o.h+(yaw||0);
  const tilt=c.air?clamp(c.avy*.025,-.35,.35):(c.ay>0?Math.atan(F.rampHeight/F.rampLen):0);c.m.g.rotation.x=-Math.atan(o.g)-tilt;c.m.b.rotation.z=roll||0}
const TMP={x:0,y:0,z:0,h:0,g:0};

// ---------- 상태
let mode='race',trackI=0,state='title',paused=false,raceT=0,countT=0,shake=0,time=0;
const me={s:0,lap:0,d:0,v:0,dv:0,yaw:0,nitro:0,boost:false,drift:false,driftT:0,m:null,finished:false,lapStart:0,bestLap:1e9,finishT:0};
let others=[],finishOrder=[],chase=null,camYaw=0,steer=0,fov=64;
function clearCars(){for(const o of others)scene.remove(o.m.g);others=[];if(me.m){scene.remove(me.m.g);me.m=null}}
function progress(c){return c.lap*L+c.s}
function spawnTraffic(o,first){
  for(let tries=0;tries<20;tries++){const s=wrapS(me.s+(first?rand(120,L*.8):rand(200,360))),d=pick(RD.lanes);
    if(others.some(q=>q!==o&&Math.abs(rel(q.s,s))<18&&Math.abs(q.d-d)<3))continue;o.s=s;o.d=d;o.v=rand(...D.traffic.speed);o.last=null;return}
}
let stats={},doneNow=new Set(),lastLand=0;
function resetStats(){stats={near:0,jump:0,boost:0,drift:0,takedown:0};doneNow=new Set()}
function missionList(){return mode==='race'?(TR.missions||[]):(D.chaseMissions||[])}
function missionOk(m){if(m.type==='place')return !!(me.place&&me.place<=m.n);if(m.type==='escape')return !!me.escaped;if(m.type==='survive')return !!(chase&&chase.time>=m.n);return (stats[m.type]||0)>=m.n}
function starArr(md,id){save.stars=save.stars||{race:{},chase:{}};save.stars[md]=save.stars[md]||{};return save.stars[md][id]||(save.stars[md][id]=[0,0,0])}
function totalStars(){let n=0;const st=save.stars||{};for(const md in st)for(const id in st[md])n+=st[md][id].reduce((a,b)=>a+b,0);return n}
function checkMissions(){if(state!=='race')return;missionList().forEach((m,i)=>{if(m.type==='place'||m.type==='escape'||doneNow.has(i))return;if(missionOk(m)){doneNow.add(i);toast('미션 완료! ★','#ffd23f');snd('level')}})}
function awardStars(){const arr=starArr(mode,TR.id),fresh=[];missionList().forEach((m,i)=>{if(missionOk(m)&&!arr[i]){arr[i]=1;fresh.push(i)}});return fresh}
function renderMissions(el,fresh){el.innerHTML='';const arr=starArr(mode,TR.id);missionList().forEach((m,i)=>{const li=document.createElement('li');
  let prog='';if(state!=='title'&&!['place','escape'].includes(m.type)){const v=m.type==='survive'?Math.floor(chase?chase.time:0):m.type==='drift'?Math.floor(stats.drift||0):(stats[m.type]||0);prog=` (${Math.min(v,m.n)}/${m.n})`}
  li.textContent=m.text+prog;if(arr[i]||missionOk(m))li.className='done';if(fresh&&fresh.includes(i))li.className='done new';el.appendChild(li)})}
function applyNeon(){if(!me.m)return;const n=D.neon[save.neon||0];me.m.glow.visible=!!(n&&n.color);if(n&&n.color&&n.color!=='rainbow')me.m.glow.material.color.set(n.color)}
function takedown(o){o.wreck=F.wreckTime;o.spin=0;o.v*=.3;stats.takedown++;save.coins+=F.takedownCoins;me.earned+=F.takedownCoins;me.nitro=Math.min(100,me.nitro+F.takedownNitro);
  toast('테이크다운! +'+F.takedownCoins,'#ff9a3d');flash('#ff9a3d');shake=Math.max(shake,.55);snd('boom');const w=o.m.g.position;puff(w.x,w.y+1,w.z,'#ffb347',10,5,.6,.4);
  if(o.kind==='police'&&chase){chase.bust=Math.max(0,chase.bust-35)}}
function setupRace(){
  clearCars();finishOrder=[];chase=null;
  const car=CAR(save.car);me.m=makeCar(D.colors[save.color]||D.colors[0],car.shape);
  Object.assign(me,{lap:0,v:0,dv:0,yaw:0,nitro:PH.nitroStart,boost:false,drift:false,driftT:0,finished:false,lapStart:0,bestLap:1e9,lapNo:0,ay:0,air:false,avy:0,padT:0,airT:0,place:0,escaped:false});
  applyNeon();resetStats();
  if(mode==='race'){
    const R=D.rivals,grid=[[0,-3.4],[0,3.4],[1,-3.4],[1,3.4],[2,-3.4],[2,3.4]];
    me.s=wrapS(-8-12*2);me.d=3.4;me.lap=-1;
    for(let i=0;i<5;i++){const [r,dd]=grid[i],c={kind:'rival',name:R.names[i],s:wrapS(-8-12*r),d:dd,v:0,lap:-1,top:TR.aiTop*R.skill[i],laneBias:rand(-1,1),m:makeCar(R.colors[i],R.shapes[i]),finished:false};others.push(c)}
    for(let i=0;i<D.traffic.race;i++){const t={kind:'traffic',m:makeCar(pick(D.traffic.colors),pick(['hatch','muscle','hatch'])),s:0,d:0,v:15};others.push(t);spawnTraffic(t,true)}
  }else{
    me.s=0;me.d=2.25;me.lap=0;
    chase={time:0,bust:0,esc:0,heat:1,next:D.chase.reinforceEvery,siren:0};
    for(let i=0;i<D.traffic.chase;i++){const t={kind:'traffic',m:makeCar(pick(D.traffic.colors),pick(['hatch','muscle','hatch'])),s:0,d:0,v:15};others.push(t);spawnTraffic(t,true)}
    for(let i=0;i<D.chase.policeStart;i++)addPolice(-60-i*25);
  }
  for(const o of others)placeCar(o);placeCar(me);
  const p=at(me.s);camYaw=p.h;
}
function addPolice(back){const c={kind:'police',s:wrapS(me.s+back),d:pick(RD.lanes),v:me.v,stun:0,m:makeCar('#fff','sport',true)};others.push(c);return c}

// ---------- 입력
const keys={};let dragSteer=0,btnL=false,btnR=false,tiltSteer=0,tiltZero=0,tiltRaw=0,nitroBtn=false,driftBtn=false;
addEventListener('keydown',e=>{
  if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}
  keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;nitroBtn=driftBtn=btnL=btnR=false;dragSteer=0});
const sz=$('steerZone'),si=$('steerInd'),sk=$('steerKnob');let sid=null,sx0=0;
function knob(v){const w=si.offsetWidth||170;sk.style.transform=`translateX(${v*(w/2-27)}px)`}
sz.addEventListener('pointerdown',e=>{e.preventDefault();if(sid!==null)return;sid=e.pointerId;sx0=e.clientX;try{sz.setPointerCapture(e.pointerId)}catch(_){}si.classList.add('on')});
sz.addEventListener('pointermove',e=>{if(e.pointerId!==sid)return;let v=(e.clientX-sx0)/62;
  if(Math.abs(v)>1.4)sx0=e.clientX-Math.sign(v)*62*1.4; // 손가락이 많이 밀려도 반대로 꺾기 쉽게 기준점 따라가기
  dragSteer=clamp(v,-1,1);knob(dragSteer)});
const sEnd=e=>{if(e.pointerId!==sid)return;sid=null;dragSteer=0;knob(0);si.classList.remove('on')};
for(const ev of ['pointerup','pointercancel','lostpointercapture'])sz.addEventListener(ev,sEnd);
function hold(id,set){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();set(true);el.classList.add('on');try{el.setPointerCapture(e.pointerId)}catch(_){}});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{set(false);el.classList.remove('on')});
  el.addEventListener('contextmenu',e=>e.preventDefault())}
hold('tL',v=>btnL=v);hold('tR',v=>btnR=v);hold('tNitro',v=>nitroBtn=v);hold('tDrift',v=>driftBtn=v);
function onTilt(e){const a=(screen.orientation&&screen.orientation.angle)??window.orientation??0;
  let t=a===90?e.beta:(a===-90||a===270)?-e.beta:e.gamma;if(t==null)return;tiltRaw=t}
addEventListener('deviceorientation',onTilt);
function readSteer(dt){
  if(window.__botSteer!=null)return steer=window.__botSteer;
  let k=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
  if(save.ctrl==='buttons')k+=(btnR?1:0)-(btnL?1:0);
  let target=clamp(k,-1,1),analog=false;
  if(MOBILE&&save.ctrl==='drag'&&sid!==null){target=dragSteer;analog=true}
  if(MOBILE&&save.ctrl==='tilt'){const t=tiltRaw-tiltZero;target=Math.abs(t)<2.5?0:clamp((t-Math.sign(t)*2.5)/20,-1,1);analog=true}
  if(analog)steer+=(target-steer)*Math.min(1,dt*18);
  else{const r=target===0?7:Math.sign(target)!==Math.sign(steer)?9:4.5;steer+=clamp(target-steer,-r*dt,r*dt)}
  return steer}

// ---------- 소리 (엔진은 따로 작은 오디오)
let eng=null;
function engineStart(){if(eng)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ac=new AC(),o=ac.createOscillator(),o2=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();
  o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=650;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g);g.connect(ac.destination);o.start();o2.start();eng={ac,o,o2,g}}catch(_){eng=null}}
function engineSet(on){if(!eng)return;try{const muted=window.Arcade&&Arcade.muted,t=eng.ac.currentTime,r=me.v/60;
  if(on&&eng.ac.state==='suspended')eng.ac.resume();
  eng.o.frequency.setTargetAtTime(48+r*140+(me.boost?40:0)+((me.v*3)%14),t,.06);eng.o2.frequency.setTargetAtTime(24+r*70,t,.06);
  eng.g.gain.setTargetAtTime(on&&!muted?.035+r*.02:0,t,.08)}catch(_){}}

// ---------- 효과
const fx=[];
function puff(x,y,z,col,n,spd,life,size){for(let i=0;i<n;i++){if(fx.length>120)return;const m=new THREE.Mesh(BOX,basic(col));const s=size||.5;m.scale.set(s,s,s);m.position.set(x+rand(-.4,.4),y,z+rand(-.4,.4));scene.add(m);
  fx.push({m,vx:rand(-spd,spd),vy:rand(.5,2)+spd*.3,vz:rand(-spd,spd),life,max:life,s})}}
function toast(t,c){const el=$('toast');el.textContent=t;el.style.color=c||'';el.classList.remove('on');void el.offsetWidth;el.classList.add('on')}
function banner(t,sub){const b=$('banner');b.innerHTML='';b.append(t);if(sub){const s=document.createElement('small');s.textContent=sub;b.append(s)}b.classList.remove('on');void b.offsetWidth;b.classList.add('on')}
function flash(c){const f=$('flash');f.style.background=c;f.style.opacity=.45;setTimeout(()=>f.style.opacity=0,120)}

// ---------- 내 차 물리
function updateMe(dt){
  const car=CAR(save.car),p=at(me.s),k=p.k;
  const st=state==='race'?readSteer(dt):0;
  const off=Math.abs(me.d)>HALF;
  const brakeKey=keys.ArrowDown||keys.KeyS,driftKey=keys.Space||driftBtn;
  me.drift=state==='race'&&!me.air&&driftKey&&Math.abs(st)>.25&&me.v>18;
  const braking=state==='race'&&(brakeKey||(driftKey&&!me.drift));
  me.boost=state==='race'&&(keys.ShiftLeft||keys.ShiftRight||keys.KeyN||nitroBtn)&&me.nitro>0;
  if(me.boost)me.nitro=Math.max(0,me.nitro-PH.nitroUse*dt);
  me.padT=Math.max(0,me.padT-dt);
  let top=car.top*(me.boost?car.nitro:1)*(off&&!me.air?PH.offroadTop:1)*(me.padT>0?F.padMult:1);
  if(state!=='race'&&state!=='finish')top=0;
  if(state==='finish')top=car.top*.6;
  if(braking)me.v=Math.max(0,me.v-PH.brake*dt);
  else if(me.v<top)me.v+=(car.accel*(me.boost?1.6:1)+(me.padT>0?F.padAccel:0))*Math.max(0,1-(me.v/top)**2)*dt;
  if(me.v>top)me.v-=(me.v-top)*(off?1.4:.8)*dt;
  if(me.drift){me.v-=me.v*PH.driftDrag*dt;me.nitro=Math.min(100,me.nitro+PH.driftNitro*dt);me.driftT+=dt;stats.drift+=dt}
  else if(me.driftT>0){if(me.driftT>1.2){toast('드리프트! +니트로');me.nitro=Math.min(100,me.nitro+8)}me.driftT=0}
  let outward=k*me.v*me.v*PH.slide/car.grip;if(me.drift)outward*=PH.driftSlide;if(save.assist)outward*=1-PH.assist;
  const sr=PH.steerRate*(.4+.6*Math.min(1,me.v/25))*(me.drift?PH.driftSteer:1);
  const target=me.air?st*sr*.35:st*sr+outward;
  me.dv+=(target-me.dv)*Math.min(1,dt*6);
  me.d+=me.dv*dt;
  if(Math.abs(me.d)>WALL){const hit=Math.abs(me.dv);me.d=Math.sign(me.d)*WALL;
    if(hit>2.5){me.v*=1-PH.wallSlow*Math.min(1,hit/18);shake=Math.max(shake,.25);snd('thud');const o=worldPos(me.s,me.d,TMP);puff(o.x,o.y+.6,o.z,'#ffd36a',6,4,.4,.25)}
    me.dv=-me.dv*.2}
  const prev=me.s;me.s+=me.v*dt;
  if(me.s>=L){me.s-=L;onLap()}
  if(state==='race'){
    for(const q of pads)if(!me.air&&crossed(prev,me.s,q.s)&&Math.abs(me.d-q.d)<2.4){me.padT=F.padTime;stats.boost++;toast('부스트!','#5ff0ff');snd('power')}
    const ra=rampAir(me,prev,dt);
    if(ra==='jump'){me.airT=0;snd('jump')}
    if(me.air){me.airT+=dt;me.nitro=Math.min(100,me.nitro+F.airNitro*dt)}
    if(ra==='land'){shake=Math.max(shake,.2);snd('thud');if(me.airT>.35){stats.jump++;save.coins+=F.jumpCoins;me.earned+=F.jumpCoins;toast('점프! +니트로')}}
  }
  // 모양: 미끄러짐·드리프트 각도
  const slipT=me.drift?-Math.sign(st)*.55:-Math.atan2(me.dv,Math.max(8,me.v))*.9;
  me.yaw+=(slipT-me.yaw)*Math.min(1,dt*7);
  placeCar(me,me.yaw,clamp(-me.dv*.012,-.08,.08));
  if(me.m){const o=me.m.g.position;
    if(me.drift&&Math.random()<.7){const y=me.m.g.rotation.y;puff(o.x-Math.sin(y)*2,o.y+.3,o.z-Math.cos(y)*2,'#d0d4e0',1,1.5,.7,.7)}
    if(me.boost&&Math.random()<.9){const y=me.m.g.rotation.y;puff(o.x-Math.sin(y)*2.5,o.y+.6,o.z-Math.cos(y)*2.5,Math.random()<.5?'#22e0ff':'#ffffff',1,.6,.25,.35)}
    if(off&&me.v>15&&Math.random()<.3)puff(o.x,o.y+.2,o.z,'#a08a6a',1,1,.5,.4);
    if(me.padT>0&&Math.random()<.8){const y=me.m.g.rotation.y;puff(o.x-Math.sin(y)*2.4,o.y+.5,o.z-Math.cos(y)*2.4,'#5ff0ff',1,.8,.3,.4)}
    const n=D.neon[save.neon||0];if(n&&n.color==='rainbow')me.m.glow.material.color.setHSL((time*.3)%1,1,.55);me.m.glow.material.opacity=me.boost||me.padT>0?.85:.55}
}
function onLap(){
  me.lap++;
  if(mode!=='race'||state!=='race')return;
  if(me.lap===0){me.lapStart=raceT;return}
  const lt=raceT-me.lapStart;if(lt<me.bestLap)me.bestLap=lt;me.lapStart=raceT;
  if(me.lap>=TR.laps)finishRace();
  else{banner(me.lap===TR.laps-1?'마지막 바퀴!':'랩 '+(me.lap+1),'랩 기록 '+fmt(lt));snd('level')}
}

// ---------- 다른 차
function updateOthers(dt){
  const R=D.rivals,C=D.chase;
  for(const c of others){
    if(c.kind==='traffic'){const ps=c.s;c.s=wrapS(c.s+c.v*dt);rampAir(c,ps,dt);const r=rel(me.s,c.s);if(r<-60||r>520)spawnTraffic(c,false);placeCar(c);continue}
    if(state==='count'){placeCar(c);continue}
    if(c.wreck>0){c.wreck-=dt;c.v=Math.max(0,c.v-30*dt);c.spin+=dt*Math.max(0,c.wreck-F.wreckTime+1.2)*9;c.s=wrapS(c.s+c.v*dt);placeCar(c,c.spin,.3);
      if(Math.random()<.3){const w=c.m.g.position;puff(w.x,w.y+1,w.z,'#555a66',1,1,.9,.8)}
      if(c.wreck<=0){c.spin=0;if(c.kind==='police')c.remove=true}continue}
    const p=at(c.s);let vt,dT;
    if(c.kind==='rival'){
      vt=Math.min(c.top,Math.sqrt(R.latMax/Math.max(1e-4,Math.abs(p.ka))));
      const gap=progress(c)-progress(me);if(!me.finished){if(gap<-60)vt*=R.rubberBehind;else if(gap>140)vt*=R.rubberAhead}
      if(c.finished)vt=c.top*.6;
      dT=clamp(-Math.sign(p.ka)*Math.min(5.5,Math.abs(p.ka)*420)+c.laneBias,-7,7);
    }else{ // 경찰
      c.stun=Math.max(0,c.stun-dt);const r=rel(c.s,me.s),top=C.policeTop+C.policeTopPerHeat*(chase.heat-1);
      if(r>0)vt=Math.min(top,me.v+5+r*.06);else vt=Math.max(8,me.v-6);
      vt=Math.min(vt,Math.sqrt(R.latMax*1.15/Math.max(1e-4,Math.abs(p.ka))));
      if(c.stun>0)vt*=.4;
      dT=Math.abs(r)<35?me.d:clamp(-Math.sign(p.ka)*Math.min(5,Math.abs(p.ka)*400),-7,7);
      if(r>C.catchUpDist){c.s=wrapS(me.s-C.catchUpDist*.6);c.v=me.v;}
    }
    // 앞차 피하기
    for(const o of others.concat([me])){if(o===c)continue;const r=rel(c.s,o.s);if(r>0&&r<26&&Math.abs(o.d-c.d)<2.8){
        if(c.kind==='police'&&o===me)continue;
        const left=o.d+(o.d>-4?-4.4:4.4),right=o.d+(o.d<4?4.4:-4.4);dT=Math.abs(left-c.d)<Math.abs(right-c.d)?left:right;dT=clamp(dT,-7.2,7.2);
        if(r<9)vt=Math.min(vt,o.v)}}
    c.v+=clamp(vt-c.v,-PH.brake*dt,R.accel*dt);
    c.d+=clamp(dT-c.d,-5.5*dt,5.5*dt);c.d=clamp(c.d,-WALL+1,WALL-1);
    const ps=c.s,ns=c.s+c.v*dt;if(ns>=L){if(c.kind==='rival'){c.lap++;if(c.lap>=TR.laps&&!c.finished){c.finished=true;c.finishT=raceT;finishOrder.push(c)}}}c.s=wrapS(ns);rampAir(c,ps,dt);
    placeCar(c,0,0);
    if(c.red){const on=Math.floor(time*6)%2;c.red.visible=!!on;c.blue.visible=!on}
  }
  for(const c of others)if(c.remove)scene.remove(c.m.g);others=others.filter(c=>!c.remove);
  // 경찰과 일반 차 충돌
  for(const c of others)if(c.kind==='police')for(const t of others)if(t.kind==='traffic'){const r=rel(c.s,t.s);if(r>0&&r<4.6&&Math.abs(t.d-c.d)<2.1){c.v=Math.min(c.v,t.v)-4;c.stun=Math.max(c.stun,.6)}}
}
function collide(){
  for(const o of others){
    const r=rel(me.s,o.s),dd=o.d-me.d;
    if(o.kind==='traffic'&&o.last!=null&&o.last>0&&r<=0&&Math.abs(dd)<3.6&&Math.abs(dd)>=2.1&&me.v>22){
      stats.near++;me.nitro=Math.min(100,me.nitro+PH.nearMissNitro);save.coins+=PH.nearMissCoins;me.earned=(me.earned||0)+PH.nearMissCoins;toast('아슬아슬! +'+PH.nearMissCoins);snd('coin')}
    o.last=r;
    if(o.wreck>0||Math.abs((me.ay||0)-(o.ay||0))>1.3)continue;
    if(Math.abs(r)<4.5&&Math.abs(dd)<2.1){
      if(Math.abs(r)>Math.abs(dd)*1.3){
        if(r>0){const hard=me.v-o.v>14;me.v=Math.max(0,Math.min(me.v,o.v)-PH.bumpLoss*(hard?1.6:1));o.v+=3;me.s=wrapS(o.s-4.55);if(o.kind==='police')o.stun=.4;
          if(hard){toast('쾅!','#ff6a6a');flash('#ff4040')}shake=Math.max(shake,hard?.5:.3);snd(hard?'boom':'thud')}
        else{o.v=Math.max(0,Math.min(o.v,me.v)-3);o.s=wrapS(me.s-4.55);snd('thud');shake=Math.max(shake,.2)}
      }else{const sg=Math.sign(dd)||1,push=(2.1-Math.abs(dd))/2,toward=me.dv*sg;me.d-=push*sg;o.d+=push*sg;
        if((o.kind==='rival'||o.kind==='police')&&(toward>F.takedownSpeed||Math.abs(o.d)>WALL-1.3)){takedown(o);me.dv=-sg*2}
        else{me.dv=-sg*5;if(o.kind==='police'){o.stun=1;o.v*=.85}snd('thud');shake=Math.max(shake,.2)}}
    }
  }
}

// ---------- 추격 모드 규칙
function updateChase(dt){
  const C=D.chase;chase.time+=dt;
  let near=false,allFar=true,closest=1e9;
  for(const c of others){if(c.kind!=='police')continue;const r=rel(c.s,me.s),ad=Math.abs(r);closest=Math.min(closest,ad);
    if(ad<C.bustRange&&Math.abs(c.d-me.d)<5)near=true;if(ad<C.escapeDist)allFar=false}
  if(near)chase.bust=Math.min(100,chase.bust+dt*100/C.bustTime*(me.v<15?1.6:1));else chase.bust=Math.max(0,chase.bust-dt*14);
  if(allFar)chase.esc=Math.min(100,chase.esc+dt*100/C.escapeTime);else chase.esc=Math.max(0,chase.esc-dt*25);
  chase.next-=dt*(others.some(c=>c.kind==='police')?1:2.5);
  if(chase.next<=0){chase.next=C.reinforceEvery;const n=others.filter(c=>c.kind==='police').length;if(n<C.policeMax){addPolice(-200);chase.heat++;banner('경찰 지원 출동!','별 '+chase.heat+'개');snd('alert')}}
  chase.siren-=dt;if(closest<90&&chase.siren<=0){chase.siren=1.4;snd('siren')}
  if(chase.bust>=100)endChase(false);else if(chase.esc>=100)endChase(true);
}

// ---------- 시작/끝
function startRace(){
  buildWorld(D.tracks[trackI]);setupRace();
  for(const id of ['titleOv','garageOv','resultOv','pauseOv'])$(id).hidden=true;document.body.classList.remove('title');
  $('chaseHud').hidden=mode!=='chase';setT($('lapLbl'),mode==='race'?'랩':'시간');
  $('map').style.display='';
  state='count';countT=3.5;raceT=0;me.earned=0;paused=false;tiltZero=tiltRaw;
  renderMissions($('mList'));$('missionBox').hidden=false;
  engineStart();
}
function finishRace(){
  me.finished=true;state='finish';
  const place=finishOrder.length+1;me.place=place;finishOrder.push(me);me.finishT=raceT;
  const coins=D.rewards.place[place-1]||30;save.coins+=coins;me.earned+=coins;
  if(place<=3&&trackI+1>=save.unlocked&&trackI+1<D.tracks.length)save.unlocked=trackI+2;
  if(place===1){save.wins++;if(window.Arcade)Arcade.record('nightRushWins',save.wins)}
  if(me.bestLap<1e9){const k=TR.id,b=save.best[k];if(!b||me.bestLap<b)save.best[k]=me.bestLap}
  me.fresh=awardStars();store();
  banner(place===1?'우승!':place+'등','결승선 통과');snd(place<=3?'win':'goal');
  resultTimer=2.4;
}
let resultTimer=0;
function endChase(escaped){
  state='finish';const secs=Math.floor(chase.time),coins=(escaped?D.rewards.chaseEscape:0)+secs*D.rewards.chasePerSec;
  save.coins+=coins;me.earned+=coins;me.escaped=escaped;if(escaped){save.escapes++;if(window.Arcade)Arcade.record('nightRushEscapes',save.escapes)}me.fresh=awardStars();store();
  banner(escaped?'탈출 성공!':'체포됐어요',escaped?'경찰을 따돌렸어요':'다음엔 니트로로 도망쳐요');snd(escaped?'win':'lose');resultTimer=2.4;
}
function showResult(){
  if(state!=='finish'||!$('resultOv').hidden)return;
  const list=$('resList');list.innerHTML='';
  if(mode==='race'){
    const order=finishOrder.slice();const rest=others.filter(c=>c.kind==='rival'&&!c.finished).sort((a,b)=>progress(b)-progress(a));
    for(const c of order.concat(rest)){const li=document.createElement('li');li.textContent=c===me?'나':c.name;if(c===me)li.className='me';
      const sp=document.createElement('span');sp.textContent=c.finishT?fmt(c.finishT):'달리는 중';li.appendChild(sp);list.appendChild(li)}
    setT($('resTitle'),me.place===1?'우승!':me.place+'등');
    $('resTxt').textContent=`기록 ${fmt(me.finishT)} · 가장 빠른 랩 ${me.bestLap<1e9?fmt(me.bestLap):'-'} · 금화 +${me.earned}`;
    $('nextBtn').hidden=!(trackI+1<D.tracks.length&&trackI+1<save.unlocked);
  }else{
    setT($('resTitle'),me.escaped?'탈출 성공!':'체포!');
    $('resTxt').textContent=`${Math.floor(chase.time)}초 버텼어요 · 경찰 별 ${chase.heat}개 · 금화 +${me.earned}`;$('nextBtn').hidden=true;
  }
  renderMissions($('rMissions'),me.fresh||[]);$('missionBox').hidden=true;
  $('resultOv').hidden=false;engineSet(false);
}
function toTitle(){
  state='title';paused=false;for(const id of ['pauseOv','resultOv','garageOv'])$(id).hidden=true;$('chaseHud').hidden=true;
  if(!TR||TR!==D.tracks[trackI])buildWorld(D.tracks[trackI]);
  clearCars();me.m=makeCar(D.colors[save.color],CAR(save.car).shape);me.s=4;me.d=0;me.v=0;me.yaw=0;me.ay=0;me.air=false;applyNeon();placeCar(me);$('missionBox').hidden=true;
  renderTitle();$('titleOv').hidden=false;engineSet(false);
}
function setPause(on){if(state!=='race'&&state!=='count')on=false;paused=on;$('pauseOv').hidden=!on;if(on){renderMissions($('pMissions'));engineSet(false);nitroBtn=driftBtn=false;$('resumeBtn').focus()}}
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};
$('resumeBtn').onclick=()=>{snd('click');setPause(false)};
$('restartBtn').onclick=()=>{snd('click');startRace()};
$('quitBtn').onclick=()=>{snd('click');toTitle()};
$('againBtn').onclick=()=>{snd('click');startRace()};
$('nextBtn').onclick=()=>{snd('click');trackI++;startRace()};
$('resTitleBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden){setPause(true);engineSet(false)}});

// ---------- 처음 화면 / 차고
function renderTitle(){
  setT($('tCoins'),save.coins);setT($('tCar'),CAR(save.car).name);
  for(const b of $('modeSeg').children)b.classList.toggle('on',b.dataset.m===mode);
  $('modeDesc').textContent=mode==='race'?'라이벌 5대와 3바퀴 경주. 3등 안에 들면 다음 트랙이 열려요.':'경찰차를 따돌려요! 멀리 떨어져서 버티면 탈출, 붙잡히면 체포.';
  const box=$('tracks');box.innerHTML='';
  D.tracks.forEach((T,i)=>{const b=document.createElement('button');b.className='track';const lock=mode==='race'&&i>=save.unlocked;b.disabled=lock;
    const nb=document.createElement('b'),ni=document.createElement('i'),ne=document.createElement('em');nb.textContent=T.name;ni.textContent=lock?'앞 트랙에서 3등 안에 들면 열려요':T.desc;
    ne.textContent=lock?'잠김':mode==='race'?(save.best[T.id]?'최고 랩 '+fmt(save.best[T.id]):'출발'):'추격 시작';
    if(!lock){const sm=document.createElement('small'),a=starArr(mode,T.id);sm.textContent=a.map(x=>x?'★':'☆').join('');ne.appendChild(sm)}b.append(nb,ni,ne);
    b.onclick=()=>{if(lock)return;snd('select');trackI=i;startRace()};box.appendChild(b)});
  for(const b of $('ctrlSeg').children)b.classList.toggle('on',b.dataset.c===save.ctrl);
  $('ctrlRow').style.display=MOBILE?'':'none';
  const ab=$('assistBtn');ab.setAttribute('aria-pressed',String(!!save.assist));ab.textContent=save.assist?'켜짐':'꺼짐';
  $('ctrlHelp').textContent=MOBILE?({drag:'왼쪽 화면을 누른 채 좌우로 밀면 핸들이 돌아가요.',buttons:'왼쪽 아래 ◀ ▶ 버튼으로 방향을 바꿔요.',tilt:'휴대폰을 핸들처럼 기울여요. 출발할 때 잡은 각도가 가운데예요.'})[save.ctrl]+' 가속은 자동이에요.':'← → 핸들 · Space 드리프트 · ↓ 브레이크 · Shift 니트로. 가속은 자동이에요.';
  document.body.className='ctrl-'+save.ctrl+(state==='title'?' title':'');
}
for(const b of $('modeSeg').children)b.onclick=()=>{snd('click');mode=b.dataset.m;renderTitle()};
for(const b of $('ctrlSeg').children)b.onclick=()=>{snd('click');save.ctrl=b.dataset.c;store();renderTitle();
  if(save.ctrl==='tilt'&&window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')DeviceOrientationEvent.requestPermission().catch(()=>{})};
$('assistBtn').onclick=()=>{snd('click');save.assist=!save.assist;store();renderTitle()};
$('garageBtn').onclick=()=>{snd('click');renderGarage();$('titleOv').hidden=true;$('garageOv').hidden=false};
$('garageClose').onclick=()=>{snd('click');$('garageOv').hidden=true;toTitle()};
function renderGarage(){
  setT($('gCoins'),save.coins);const box=$('cars');box.innerHTML='';const mx={top:70,accel:16,grip:1.3,nitro:1.45};
  for(const c of D.cars){const own=save.owned.includes(c.id),b=document.createElement('button');b.className='carCard'+(save.car===c.id?' sel':'');
    const nb=document.createElement('b'),ne=document.createElement('em'),ni=document.createElement('i'),st=document.createElement('div');
    nb.textContent=c.name;ne.textContent=save.car===c.id?'타는 중':own?'타기':'금화 '+c.price;ni.textContent=c.desc;st.className='stats';
    for(const [k,n] of [['top','속도'],['accel','가속'],['grip','핸들링'],['nitro','니트로']]){const sp=document.createElement('span');sp.textContent=n;const u=document.createElement('u'),s=document.createElement('s');s.style.width=Math.round(c[k]/mx[k]*100)+'%';u.appendChild(s);st.append(sp,u)}
    b.append(nb,ne,ni,st);
    b.onclick=()=>{if(own){save.car=c.id;snd('select')}else if(save.coins>=c.price){save.coins-=c.price;save.owned.push(c.id);save.car=c.id;snd('power')}else{snd('bad');return}store();renderGarage();refreshMyCar()};
    box.appendChild(b)}
  const cb=$('colors');cb.innerHTML='';D.colors.forEach((col,i)=>{const b=document.createElement('button');b.style.background=col;b.setAttribute('aria-label','색 '+(i+1));if(i===save.color)b.className='on';
    b.onclick=()=>{save.color=i;store();snd('click');renderGarage();refreshMyCar()};cb.appendChild(b)});
  const ts=totalStars();setT($('starTotal'),'· 내 별 ★'+ts);const nb=$('neons');nb.innerHTML='';
  D.neon.forEach((n,i)=>{const b=document.createElement('button'),lock=ts<n.stars;b.disabled=lock;if(i===(save.neon||0))b.className='on';
    const dot=document.createElement('i');dot.style.background=n.color==='rainbow'?'linear-gradient(90deg,#f33,#fd3,#3f8,#3cf,#b5f)':n.color||'#555';b.style.setProperty('--c',n.color&&n.color!=='rainbow'?n.color:'#fff');
    b.append(dot,lock?n.name+' ★'+n.stars:n.name);b.onclick=()=>{if(lock)return;save.neon=i;store();snd('click');renderGarage();refreshMyCar()};nb.appendChild(b)});
}
function refreshMyCar(){if(me.m)scene.remove(me.m.g);me.m=makeCar(D.colors[save.color],CAR(save.car).shape);applyNeon();placeCar(me)}

// ---------- 미니맵
function drawMapBase(){
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of S){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);z0=Math.min(z0,p.z);z1=Math.max(z1,p.z)}
  const sc=120/Math.max(x1-x0,z1-z0);mapBox={x0,z0,sc,ox:(150-(x1-x0)*sc)/2,oz:(150-(z1-z0)*sc)/2};
  const c=document.createElement('canvas');c.width=c.height=150;const g=c.getContext('2d');
  g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=5;g.lineJoin='round';g.beginPath();
  S.forEach((p,i)=>{const [u,v]=mp(p.x,p.z);i?g.lineTo(u,v):g.moveTo(u,v)});g.closePath();g.stroke();mapImg=c;
}
// 미니맵은 위가 앞이 되도록 x를 뒤집는다(오른쪽 = -x)
function mp(x,z){return [150-(mapBox.ox+(x-mapBox.x0)*mapBox.sc),150-(mapBox.oz+(z-mapBox.z0)*mapBox.sc)]}
const mctx=$('map').getContext('2d');
function drawMap(){if(!mapImg)return;mctx.clearRect(0,0,150,150);mctx.drawImage(mapImg,0,0);
  for(const o of others.concat([me])){if(o.kind==='traffic')continue;const w=worldPos(o.s,o.d,TMP),[u,v]=mp(w.x,w.z);
    mctx.fillStyle=o===me?'#ffd23f':o.kind==='police'?(Math.floor(time*6)%2?'#ff3040':'#3070ff'):'#ff3b8a';mctx.beginPath();mctx.arc(u,v,o===me?5:3.5,0,7);mctx.fill()}}

// ---------- HUD
function updateHud(){
  setT($('speed'),Math.round(me.v*3.6));$('nitroFill').style.width=me.nitro+'%';$('nitroBar').classList.toggle('full',me.nitro>=99);$('tNitro').classList.toggle('empty',me.nitro<=0);
  if(mode==='race'){const rank=me.finished?me.place:1+others.filter(c=>c.kind==='rival'&&(c.finished||progress(c)>progress(me))).length;
    setT($('pos'),rank);setT($('posOf'),'/ 6등');setT($('lap'),Math.min(TR.laps,Math.max(1,me.lap+1))+' / '+TR.laps);setT($('time'),fmt(me.finished?me.finishT:raceT))}
  else if(chase){setT($('pos'),'★'.repeat(Math.min(5,chase.heat)));setT($('posOf'),'');setT($('lap'),fmt(chase.time));setT($('time'),'경찰 '+others.filter(c=>c.kind==='police').length+'대');
    $('bustFill').style.width=chase.bust+'%';$('escFill').style.width=chase.esc+'%';setT($('stars'),'')}
}

// ---------- 매 프레임
let last=performance.now(),lastN=0,goT=0,missionHideT=0;
function frame(now){
  const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(!paused){time+=dt;
    if(state==='count'){countT-=dt;const n=Math.ceil(countT-.5);setT($('count'),n>=1&&n<=3?n:'');
      if(n!==lastN){lastN=n;if(n>=1&&n<=3)snd('count')}
      if(countT<=.5){state='race';goT=.8;snd('go');missionHideT=1.5}
      updateMe(dt);updateOthers(dt)}
    else if(state==='race'||state==='finish'){
      if(state==='race')raceT+=dt;
      goT-=dt;setT($('count'),goT>0?'GO!':'');if(missionHideT>0&&(missionHideT-=dt)<=0)$('missionBox').hidden=true;checkMissions();
      updateMe(dt);updateOthers(dt);if(state==='race')collide();
      if(mode==='chase'&&state==='race')updateChase(dt);
      if(state==='finish'&&(resultTimer-=dt)<=0)showResult();
    }else if(state==='title'){camYaw+=dt*.25}
    for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.life-=dt;f.m.position.x+=f.vx*dt;f.m.position.y+=f.vy*dt;f.m.position.z+=f.vz*dt;
      const k=Math.max(.01,f.life/f.max);f.m.scale.setScalar(f.s*(1.6-k*.6)*k);if(f.life<=0){scene.remove(f.m);fx.splice(i,1)}}
    if(state!=='title'){updateHud();drawMap();engineSet(state==='race'||state==='count'||state==='finish')}
  }
  // 카메라
  const g=me.m?me.m.g.position:{x:0,y:0,z:0};
  if(state==='title'){const r=13;camera.position.set(g.x+Math.sin(camYaw)*r,g.y+4.2,g.z+Math.cos(camYaw)*r);camera.lookAt(g.x,g.y+1,g.z);camera.fov=baseFov;camera.updateProjectionMatrix()}
  else{
    const p=at(me.s);let dh=p.h+me.yaw*.35-camYaw;dh=Math.atan2(Math.sin(dh),Math.cos(dh));camYaw+=dh*Math.min(1,dt*5);
    const port=camera.aspect<1,back=(port?10:8.2)+me.v*.04,fx_=Math.sin(camYaw),fz=Math.cos(camYaw);
    shake=Math.max(0,shake-dt);const sk=shake*.5;
    const tx=g.x-fx_*back,tz=g.z-fz*back,ty=Math.max(g.y,at(me.s-back).y)+(port?4.6:3.1);
    const cp=camera.position,k=state==='count'?1:Math.min(1,dt*9);
    cp.x+=(tx-cp.x)*k;cp.z+=(tz-cp.z)*k;cp.y+=(ty-cp.y)*k;
    camera.position.set(cp.x+(Math.random()-.5)*sk,cp.y+(Math.random()-.5)*sk,cp.z);
    const ah=port?16:9;camera.lookAt(g.x+fx_*ah,g.y+(port?.6:1.3),g.z+fz*ah);
    const ft=baseFov+me.v*.13+(me.boost?9:0);fov+=(ft-fov)*Math.min(1,dt*4);camera.fov=fov;camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
toTitle();
requestAnimationFrame(frame);
window.__nr={get stats(){return stats},get ramps(){return ramps},get pads(){return pads},takedown,me,get others(){return others},get state(){return state},get chase(){return chase},get L(){return L},at,startRace,setMode:m=>{mode=m},setTrack:i=>{trackI=i},keys,save,get raceT(){return raceT},get finishOrder(){return finishOrder},showResult,S:()=>S};
});
