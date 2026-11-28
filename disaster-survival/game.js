/* 자연재해 살아남기 — 섬 마을에 찾아오는 재난을 피해 끝까지 살아남아요. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const T=D.tile,C=D.cols,R=D.rows,G=D.ground,WW=C*T,WH=R*T,PH=26,PW=9;
const SAVE='disaster.save';
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();
const S=Object.assign({pts:0,items:{apple:1},hat:'',rounds:0,wins:0,streak:0,best:0,dis:{},seenTut:false},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||JSON.parse(localStorage.getItem(SAVE+'.bak'))||{}}catch(_){return {}}})());
function store(){try{const s=JSON.stringify(S);localStorage.setItem(SAVE,s);localStorage.setItem(SAVE+'.bak',s)}catch(_){}}
const DIS={};for(const d of D.disasters)DIS[d.id]=d;

// ---------- 지도
// 칸: 0 빈칸, g 풀, d 흙, # 돌(안 부서짐), B 벽돌, W 나무, G 유리, L 잎(지나감), T 줄기(지나감), b 탄 풀
const SOLID=new Set(['g','d','#','B','W','G','b']),FLAM=new Set(['W','L','T','g']),BREAK=new Set(['B','W','G','L','T']);
const COL={g:'#5ac85a',d:'#a8744a','#':'#8a8a9a',B:'#d86a4a',W:'#c8945a',G:'rgba(180,230,255,.75)',L:'#3aa84a',T:'#8a5a3a',b:'#5a5a4a'};
let grid=[],hp=[],burn=[],mapIdx=0;
const at=(x,y)=>x<0||x>=C||y>=R?'#':y<0?0:grid[y*C+x];
const solid=(x,y)=>{const t=at(x,y);return t!==0&&SOLID.has(t)};
function set(x,y,t){if(x<0||x>=C||y<0||y>=R)return;grid[y*C+x]=t;hp[y*C+x]=t==='B'?3:1}
function buildMap(i){mapIdx=i;grid=new Array(C*R).fill(0);hp=new Array(C*R).fill(1);burn=new Array(C*R).fill(0);
  for(let x=0;x<C;x++){set(x,G,'g');for(let y=G+1;y<R;y++)set(x,y,'d')}
  for(const b of D.maps[i].build){const [k,x]=b;
    if(k==='tree'){for(let y=G-4;y<G;y++)set(x,y,'T');for(let y=G-7;y<=G-5;y++)for(let dx=-2;dx<=2;dx++)if(!(Math.abs(dx)===2&&(y===G-7)))set(x+dx,y,'L')}
    else if(k==='hill'){const w=b[2],h=b[3];for(let k2=1;k2<=h;k2++)for(let cx=x+k2-1;cx<=x+w-k2;cx++)set(cx,G-k2,'d')}
    else if(k==='trailer'){for(let y=G-3;y<G;y++){set(x,y,'W');set(x+6,y,'W')}set(x,G-1,0);set(x,G-2,0);set(x+6,G-2,'G');for(let cx=x;cx<=x+6;cx++)set(cx,G-4,'W');set(x+7,G-1,'W');set(x+7,G-2,'W')}
    else if(k==='house'){const w=b[2],fl=b[3],m=b[4],slab=m==='#'?'#':m==='W'?'W':'W';
      for(let f=0;f<fl;f++){const base=G-1-f*5;for(let y=base-3;y<=base;y++){set(x,y,m);set(x+w-1,y,m)}
        if(f===0){set(x,base,0);set(x,base-1,0);set(x+w-1,base,0);set(x+w-1,base-1,0)}else{set(x,base-2,'G');set(x+w-1,base-2,'G')}
        for(let cx=x;cx<x+w;cx++)set(cx,base-4,f===fl-1?(m==='#'?'#':slab):slab);
        if(f<fl-1){const st=slab==='#'?'#':'W';if(f%2===0){for(let s=0;s<4;s++)for(let y=base-s;y<=base;y++)set(x+w-6+s,y,st);for(let k=2;k<=4;k++)set(x+w-k,base-4,0)}else{for(let s=0;s<4;s++)for(let y=base-s;y<=base;y++)set(x+5-s,y,st);for(let k=1;k<=3;k++)set(x+k,base-4,0)}}}
      const top=G-1-(fl-1)*5-4;if(m==='#'){for(let cx=x;cx<x+w;cx+=2)set(cx,top-1,'#')}else{for(let r=1;r<=3;r++)for(let cx=x+r*2-1;cx<=x+w-r*2;cx++)set(cx,top-r,'W')}}}}
function standY(px){const x=Math.floor(px/T);for(let y=0;y<R;y++)if(solid(x,y)&&!solid(x,y-1)&&!solid(x,y-2))return y*T;return G*T}
function roofed(px,py){const x=Math.floor(px/T);for(let y=Math.floor((py-PH-2)/T);y>=0;y--)if(solid(x,y))return true;return false}

// ---------- 생물 (나와 동물 친구들)
function mkEnt(o){return Object.assign({x:0,y:0,vx:0,vy:0,hp:D.player.hp,air:100,cold:0,on:false,face:1,walk:0,inv:0,dead:false,hitWave:false,tx:0,think:0,jumpT:0},o)}
let P=mkEnt({me:true,name:'나'}),npcs=[],ents=[];
function physics(e,dt,inx,jump){const g=D.player.gravity*(S.items.balloon&&e.me?.6:1);const inW=waterY!=null&&e.y-6>waterY,inL=lavaY!=null&&e.y>lavaY;
  let sp=D.player.speed*(dis.has('snow')?.8:1)*(inW?.6:1);e.vx+=(inx*sp-e.vx)*Math.min(1,dt*12);
  if(inW){e.vy+=g*.25*dt;e.vy=Math.min(e.vy,90);if(jump)e.vy=Math.max(e.vy-900*dt,-170)}else{e.vy+=g*dt;if(jump&&e.on){e.vy=-D.player.jump*(S.items.balloon&&e.me?1.18:1);e.on=false;if(e.me)snd('jump')}}
  e.vy=Math.min(e.vy,S.items.balloon&&e.me&&!inW?380:900);
  const n=Math.ceil(Math.max(Math.abs(e.vx),Math.abs(e.vy))*dt/(T*.4))||1;for(let i=0;i<n;i++){moveX(e,e.vx*dt/n);moveY(e,e.vy*dt/n)}
  if(inx)e.face=inx>0?1:-1;e.walk+=Math.abs(e.vx)*dt/10;if(e.y>WH+200){e.y=standY(e.x);e.vy=0}}
function moveX(e,dx){let nx=e.x+dx;const r0=Math.floor((e.y-PH+1)/T),r1=Math.floor((e.y-1)/T);
  if(dx>0){const c=Math.floor((nx+PW)/T);for(let r=r0;r<=r1;r++)if(solid(c,r)){nx=c*T-PW-.01;e.vx=0;break}}
  else if(dx<0){const c=Math.floor((nx-PW)/T);for(let r=r0;r<=r1;r++)if(solid(c,r)){nx=(c+1)*T+PW+.01;e.vx=0;break}}e.x=nx}
function moveY(e,dy){let ny=e.y+dy;const c0=Math.floor((e.x-PW+1)/T),c1=Math.floor((e.x+PW-1)/T);e.on=false;
  if(dy>=0){const r=Math.floor(ny/T);for(let c=c0;c<=c1;c++)if(solid(c,r)){ny=r*T-.01;e.vy=0;e.on=true;break}}
  else{const r=Math.floor((ny-PH)/T);for(let c=c0;c<=c1;c++)if(solid(c,r)){ny=(r+1)*T+PH+.01;e.vy=0;break}}e.y=ny}
function hurt(e,n,why){if(e.dead||n<=0)return;e.hp-=n;if(e.me){P.hurtT=.25;if(n>=8)snd('hurt')}if(e.hp<=0){e.hp=0;e.dead=true;e.why=why;if(e.me){snd('lose');banner('😵 탈락했어요','다음 판에 다시 도전해요! ('+why+')',3);toast('👻 유령이 되어 구경해요')}else{toast('😢 '+e.name+' 탈락')}for(let i=0;i<16;i++)parts.push({x:e.x,y:e.y-14,vx:rand(-150,150),vy:rand(-250,-50),life:.9,c:e.c||'#ffd23f'})}}

// ---------- 재난
let dis=new Set(),waterY=null,lavaY=null,waterTarget=null,lavaTarget=null,wave=null,tornado=null,meteors=[],bolts=[],bombs=[],debris=[],parts=[],pops=[],rainT=0,quakeT=0,shake=0,floodHold=0;
function startDis(id){dis.add(id);const d=DIS[id];
  if(id==='flood'){let top=G;for(let x=1;x<C-1;x++)for(let y=1;y<G;y++)if(solid(x,y+1)&&!solid(x,y)&&!solid(x,y-1)&&at(x,y)!=='L'){top=Math.min(top,y+1);break}const h=clamp(G-top-2,3,d.flood);waterY=G*T+4;waterTarget=(G-h)*T}
  if(id==='tsunami'){wave={x:-160,sp:210,top:(G-11)*T,dir:1};if(Math.random()<.5){wave.x=WW+160;wave.dir=-1}}
  if(id==='tornado'){tornado={x:Math.random()<.5?2*T:WW-2*T,vx:70,t:0};tornado.vx=tornado.x<WW/2?70:-70}
  if(id==='fire'){const fl=[];for(let i=0;i<C*R;i++)if(grid[i]==='W'||grid[i]==='L'||grid[i]==='T')fl.push(i);for(let k=0;k<3;k++){const i=fl.length?pick(fl):(G*C+Math.floor(rand(5,C-5)));burn[i]=.01}}
  if(id==='volcano'){lavaY=G*T+4;lavaTarget=(G-3)*T}}
function breakTile(x,y,force){const i=y*C+x,t=grid[i];if(!t||!BREAK.has(t))return false;hp[i]-=force||1;if(hp[i]>0)return false;grid[i]=0;burn[i]=0;debris.push({x:x*T+T/2,y:y*T+T/2,vx:rand(-40,40),vy:rand(-60,0),c:COL[t],t:3});return true}
function exposedSky(e){return !roofed(e.x,e.y)}
function updDis(dt,t){
  // 물·용암
  if(waterY!=null&&waterTarget!=null){if(floodHold>0){floodHold-=dt;if(floodHold<=0)waterTarget=G*T+40}waterY+=clamp(waterTarget-waterY,-40*dt,40*dt);if(waterY>G*T+30&&waterTarget>G*T){waterY=null;waterTarget=null}}
  if(lavaY!=null){lavaY+=clamp(lavaTarget-lavaY,-12*dt,12*dt)}
  if(dis.has('tsunami')&&wave){wave.x+=wave.sp*wave.dir*dt;const cx=Math.floor(wave.x/T);if(cx>=0&&cx<C)for(let y=Math.floor(wave.top/T);y<G;y++)if(at(cx,y)&&at(cx,y)!=='#'&&Math.random()<.5)breakTile(cx,y,2);
    for(const e of ents)if(!e.dead&&!e.hitWave&&Math.abs(e.x-wave.x)<36&&e.y>wave.top){e.hitWave=true;hurt(e,35,'쓰나미');e.vx=330*wave.dir;e.vy=-260;if(e.me)shake=.4}
    if(wave.x<-300||wave.x>WW+300){wave=null;waterY=G*T+4;waterTarget=(G-4)*T;floodHold=12}}
  if(dis.has('quake')){shake=Math.max(shake,.15);quakeT-=dt;if(quakeT<=0){quakeT=.12;for(let k=0;k<3;k++){const x=Math.floor(rand(0,C)),y=Math.floor(rand(0,G));if(BREAK.has(at(x,y)))breakTile(x,y,1)}}for(const e of ents)if(e.on&&Math.random()<dt*3)e.vy=-120}
  if(dis.has('meteor')){if(Math.random()<dt*1.1){const al=ents.filter(e=>!e.dead);const tx=Math.random()<.35&&al.length?pick(al).x+rand(-60,60):rand(40,WW-40);meteors.push({tx,ty:standY(tx),t:1.3})}
    for(const m of meteors){m.t-=dt;if(m.t<=0&&!m.done){m.done=true;const cx=Math.floor(m.tx/T),cy=Math.floor(m.ty/T);for(let dy=-2;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=5)breakTile(cx+dx,cy+dy,2);
      for(const e of ents)if(Math.hypot(e.x-m.tx,e.y-10-m.ty)<70)hurt(e,30,'별똥별');snd('boom');shake=Math.max(shake,.25);for(let i=0;i<20;i++)parts.push({x:m.tx,y:m.ty,vx:rand(-220,220),vy:rand(-300,-40),life:.8,c:i%2?'#ffb020':'#ff6a3a'})}}meteors=meteors.filter(m=>m.t>-.3)}
  if(dis.has('tornado')&&tornado){tornado.x+=tornado.vx*dt;if(tornado.x<T*2&&tornado.vx<0||tornado.x>WW-T*2&&tornado.vx>0)tornado.vx*=-1;if(Math.random()<dt*.3)tornado.vx*=-1;
    const cx=Math.floor(tornado.x/T);for(let k=0;k<2;k++){const x=cx+Math.floor(rand(-1,2)),y=Math.floor(rand(4,G));if(BREAK.has(at(x,y))&&Math.random()<dt*20)breakTile(x,y,3)}
    for(const e of ents)if(!e.dead&&Math.abs(e.x-tornado.x)<48){e.vy=Math.min(e.vy,-260);e.vx+=rand(-1,1)*900*dt+(e.x<tornado.x?-1:1)*300*dt;hurt(e,12*dt,'회오리바람')}}
  if(dis.has('fire')){for(let i=0;i<C*R;i++){if(burn[i]<=0)continue;burn[i]+=dt;const x=i%C,y=(i/C)|0;
      if(Math.random()<dt*.45){const [nx,ny]=pick([[1,0],[-1,0],[0,1],[0,-1]]);const j=(y+ny)*C+x+nx;if(x+nx>=0&&x+nx<C&&y+ny>=0&&y+ny<R&&FLAM.has(grid[j])&&burn[j]<=0&&(grid[j]!=='g'||Math.random()<.3))burn[j]=.01}
      if(burn[i]>7){if(grid[i]==='g'){grid[i]='b';burn[i]=0}else{grid[i]=0;burn[i]=0}}}
    for(const e of ents){if(e.dead)continue;const c0=Math.floor((e.x-PW-3)/T),c1=Math.floor((e.x+PW+3)/T),r0=Math.floor((e.y-PH-3)/T),r1=Math.floor((e.y+3)/T);let f=false;for(let r=r0;r<=r1&&!f;r++)for(let c=c0;c<=c1;c++)if(c>=0&&c<C&&r>=0&&r<R&&burn[r*C+c]>0){f=true;break}if(f)hurt(e,14*dt,'불')}}
  if(dis.has('acid'))for(const e of ents)if(!e.dead&&exposedSky(e))hurt(e,7*dt,'따끔 비');
  if(dis.has('sand'))for(const e of ents){if(e.dead)continue;const x=Math.floor(e.x/T),r=Math.floor((e.y-12)/T);let shel=false;for(let k=1;k<=4;k++)if(solid(x-k,r)){shel=true;break}if(!shel){e.vx+=140*dt*3;hurt(e,4*dt,'모래바람')}}
  if(dis.has('snow'))for(const e of ents){if(e.dead)continue;e.cold=clamp(e.cold+(exposedSky(e)?14:-25)*dt,0,100);if(e.cold>=100)hurt(e,6*dt,'눈보라')}
  if(dis.has('volcano')){if(Math.random()<dt*.9){const from=Math.random()<.5?-1:1;bombs.push({x:from<0?0:WW,y:G*T-200,vx:from<0?rand(150,420):-rand(150,420),vy:-rand(300,520)})}
    for(const b of bombs){b.vy+=600*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;const cx=Math.floor(b.x/T),cy=Math.floor(b.y/T);if(!b.done&&(solid(cx,cy)||b.y>G*T)){b.done=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){breakTile(cx+dx,cy+dy,1);const j=(cy+dy)*C+cx+dx;if(FLAM.has(grid[j]))burn[j]=.01}for(const e of ents)if(Math.hypot(e.x-b.x,e.y-10-b.y)<46)hurt(e,25,'불덩이');snd('thud')}}bombs=bombs.filter(b=>!b.done);
    for(const e of ents)if(!e.dead&&e.y>lavaY+4)hurt(e,30*dt,'용암');if(dis.has('volcano')&&Math.random()<dt*2){for(let i=0;i<C*R;i++){}}}
  if(dis.has('thunder')){if(Math.random()<dt*.75){const al=ents.filter(e=>!e.dead);const tx=Math.random()<.4&&al.length?pick(al).x:rand(20,WW-20);bolts.push({x:tx,t:1.1})}
    for(const b of bolts){b.t-=dt;if(b.t<=0&&!b.done){b.done=true;b.flash=.25;const cx=Math.floor(b.x/T);let top=G;for(let y=0;y<=G;y++)if(solid(cx,y)||at(cx,y)==='L'){top=y;break}b.ty=top*T;
      for(const e of ents)if(!e.dead&&Math.abs(e.x-b.x)<22&&e.y<=top*T+2&&exposedSky(e))hurt(e,45,'번개');const t0=at(cx,top);if(t0==='W'||t0==='L'||t0==='T'){burn[top*C+cx]=.01;dis.add('fire')}snd('zap');shake=Math.max(shake,.15)}b.flash=(b.flash||0)-dt}bolts=bolts.filter(b=>b.t>-.4)}
  // 물에 빠짐
  if(waterY!=null)for(const e of ents){if(e.dead)continue;const head=e.y-PH+4;if(head>waterY){e.air=Math.max(0,e.air-dt*14);if(e.air<=0)hurt(e,12*dt,'물에 빠짐')}else e.air=Math.min(100,e.air+dt*40)}
  // 부서진 조각
  for(const b of debris){b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;for(const e of ents)if(!e.dead&&b.vy>150&&Math.abs(b.x-e.x)<14&&b.y>e.y-PH&&b.y<e.y){hurt(e,8,'무너진 조각');b.t=0}if(solid(Math.floor(b.x/T),Math.floor(b.y/T)))b.t=0}debris=debris.filter(b=>b.t>0)}

// ---------- 동물 친구 생각
function npcGoal(e){const ids=[...dis];let tx=e.x;
  const high=()=>{let best=null,by=1e9;for(let x=1;x<C-1;x++)for(let y=0;y<G;y++)if(solid(x,y+1)&&!solid(x,y)&&!solid(x,y-1)&&y<by-0.5){if(at(x,y+1)==='G')continue;by=y;best=x}return best!=null?(best+.5)*T:e.x};
  const roof=()=>{let best=null,bd=1e9;for(let x=1;x<C-1;x++){const px=(x+.5)*T;if(roofed(px,G*T)&&!solid(x,G-1)&&Math.abs(px-e.x)<bd){bd=Math.abs(px-e.x);best=px}}return best??e.x};
  if(ids.some(i=>i==='flood'||i==='tsunami'||i==='volcano'))tx=high();
  else if(ids.some(i=>i==='acid'||i==='snow'||i==='thunder'||i==='meteor'||i==='sand'))tx=roof();
  else if(ids.includes('tornado')&&tornado)tx=tornado.x>WW/2?rand(2,10)*T:rand(C-10,C-2)*T;
  else tx=rand(3,C-3)*T;return tx+rand(-20,20)}
function npcThink(e,dt){if(e.dead)return [0,false];e.think-=dt;if(e.think<=0){e.think=rand(1.5,3.5);e.tx=state==='play'||state==='warn'?(state==='warn'&&Math.random()<.5?e.x+rand(-120,120):npcGoal(e)):e.x+rand(-150,150)}
  let dir=Math.abs(e.tx-e.x)>14?Math.sign(e.tx-e.x):0;if(dis.has('tornado')&&tornado&&Math.abs(e.x-tornado.x)<160)dir=e.x<tornado.x?-1:1;
  const cx=Math.floor((e.x+dir*(PW+6))/T),r=Math.floor((e.y-4)/T);let jump=false;if(dir&&(solid(cx,r)||solid(cx,r-1))&&e.on)jump=true;
  const inW=waterY!=null&&e.y-6>waterY;if(inW)jump=true;if(dir&&!e.on&&Math.random()<.02)jump=true;if(dir===0&&Math.random()<dt*.15&&e.on)jump=true;return [dir,jump]}

// ---------- 흐름
let state='title',stT=0,round=0,curDis=[],votes=[],myVote=-1,paused=false,time=0,appleUsed=false,result=null;
function toLobby(){state='lobby';stT=D.round.lobby;const all=[...D.maps.keys()].sort(()=>Math.random()-.5);votes=all.slice(0,3);myVote=-1;dis.clear();resetDis();
  $('lobbyOv').hidden=false;$('titleOv').hidden=true;const v=$('vote');v.innerHTML='';votes.forEach((mi,k)=>{const b=document.createElement('button');b.innerHTML='<b></b><small>지도</small>';b.querySelector('b').textContent=D.maps[mi].name;b.onclick=()=>{myVote=k;snd('select');[...v.children].forEach((c,j)=>c.classList.toggle('me',j===k))};v.appendChild(b)});
  setT($('lStat'),'살아남은 판 '+S.wins+' / '+S.rounds+' · 연속 '+S.streak+' (최고 '+S.best+') · ⭐'+S.pts);if(!S.seenTut){S.seenTut=true;store();later(.3,()=>banner('🏝️ 지도를 골라요','곧 재난이 시작돼요!',2.4))}}
function resetDis(){waterY=lavaY=waterTarget=lavaTarget=null;wave=tornado=null;meteors=[];bolts=[];bombs=[];debris=[];floodHold=0}
function startRound(){const cnt=[0,0,0];cnt[myVote>=0?myVote:Math.floor(Math.random()*3)]+=2;for(let i=0;i<6;i++)cnt[Math.floor(Math.random()*3)]++;let bi=0;for(let k=1;k<3;k++)if(cnt[k]>cnt[bi])bi=k;
  if(window.__forceMap!=null)votes[bi]=window.__forceMap;buildMap(votes[bi]);$('lobbyOv').hidden=true;round++;const ids=D.disasters.map(d=>d.id);curDis=[pick(ids)];if(round>=D.double.from&&Math.random()<D.double.p){let o=pick(ids);while(o===curDis[0])o=pick(ids);curDis.push(o)}
  P=mkEnt({me:true,name:'나',c:'#ffd23f'});npcs=D.npcs.map(n=>mkEnt({name:n.name,c:n.c,ear:n.ear}));ents=[P,...npcs];for(const e of ents){e.x=rand(3,C-3)*T;e.y=standY(e.x)-1;e.tx=e.x}
  state='warn';stT=D.round.warn;appleUsed=false;resetDis();dis.clear();const d0=DIS[curDis[0]];banner(D.maps[bi===undefined?0:votes[bi]].name,'곧 재난이 와요… 어디로 갈지 생각해요',2);snd('go');
  later(2.1,()=>{if(state!=='warn')return;const ws=curDis.map(i=>DIS[i]);banner('⚠️ '+ws.map(d=>d.icon+' '+d.warn).join(' + '),ws.map(d=>d.tip).join(' / '),3.8);snd('alert')})}
function startDisaster(){state='play';stT=D.round.time;for(const id of curDis)startDis(id);for(const e of npcs)e.think=0}
function endRound(){state='result';stT=D.round.result;S.rounds++;const alive=!P.dead;let gain=0;
  for(const id of curDis){S.dis[id]=S.dis[id]||{seen:0,surv:0};S.dis[id].seen++;if(alive)S.dis[id].surv++}
  if(alive){S.wins++;S.streak++;S.best=Math.max(S.best,S.streak);gain=D.reward.survive+Math.min(D.reward.streakMax,(S.streak-1)*D.reward.streak)+(curDis.length>1?D.reward.double:0);S.pts+=gain;snd('win');Arcade.record&&Arcade.record('disasterWins',S.wins)}else{S.streak=0}
  store();panel(alive?'🎉 살아남았어요!':'😢 이번엔 탈락',b=>{const p=document.createElement('p');p.textContent=curDis.map(i=>DIS[i].icon+' '+DIS[i].name).join(' + ')+(alive?' · ⭐ +'+gain+(S.streak>1?' (연속 '+S.streak+'판!)':''):' · '+(P.why||''));b.appendChild(p);
    const g=document.createElement('div');g.className='surv';for(const e of ents){const d=document.createElement('div');d.className=e.dead?'no':'ok';d.textContent=(e.dead?'✗ ':'✓ ')+e.name;g.appendChild(d)}b.appendChild(g);if(!alive){const q=document.createElement('p');q.className='small';q.textContent='💡 '+curDis.map(i=>DIS[i].tip).join(' / ');b.appendChild(q)}},[['다음 판',()=>{closePanel();toLobby()}]])}

// ---------- 입력
const keys={};addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k]&&k==='e')useApple();keys[k]=true;if([' ','arrowup','arrowdown'].includes(k))e.preventDefault()});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
const hold={l:false,r:false,j:false};for(const [id,k] of [['lBtn','l'],['rBtn','r'],['jBtn','j']]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();hold[k]=true;b.classList.add('on')});const up=()=>{hold[k]=false;b.classList.remove('on')};b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up);b.addEventListener('pointercancel',up)}
$('appleBtn').addEventListener('pointerdown',e=>{e.preventDefault();useApple()});
function useApple(){if(state!=='play'&&state!=='warn')return;if(P.dead||appleUsed)return;if(!(S.items.apple>0)){toast('사과가 없어요');return}if(P.hp>=D.player.hp){toast('하트가 가득해요');return}S.items.apple--;appleUsed=true;P.hp=Math.min(D.player.hp,P.hp+50);snd('power');pop(P.x,P.y-40,'🍎 +50','#ff6a6a');store()}

// ---------- 패널
function panel(title,build,btns){$('pTitle').textContent=title;const b=$('pBody');b.innerHTML='';build(b);const bb=$('pBtns');bb.innerHTML='';for(const [l,fn,soft] of btns){const e=document.createElement('button');e.className='btn'+(soft?' soft':'');e.textContent=l;e.onclick=()=>{snd('click');fn()};bb.appendChild(e)}$('panel').hidden=false;paused=state!=='lobby'&&state!=='result'}
const closePanel=()=>{$('panel').hidden=true;paused=false};
function row(b,ic,name,desc,btn,ok,fn){const r=document.createElement('div');r.className='row';r.innerHTML='<div class="ic"></div><div class="nm"><b></b><small></small></div>';r.querySelector('.ic').textContent=ic;r.querySelector('b').textContent=name;r.querySelector('small').textContent=desc;if(btn){const e=document.createElement('button');e.textContent=btn;e.disabled=!ok;e.onclick=()=>{fn();snd('coin')};r.appendChild(e)}b.appendChild(r)}
function openShop(){panel('🛒 상점 · ⭐'+S.pts,b=>{for(const it of D.shop){const own=S.items[it.id];if(it.stack)row(b,it.icon,it.name+' (가진 것 '+(own||0)+')',it.desc,'⭐'+it.price,S.pts>=it.price,()=>{S.pts-=it.price;S.items[it.id]=(own||0)+1;store();openShop()});
  else if(!own)row(b,it.icon,it.name,it.desc,'⭐'+it.price,S.pts>=it.price,()=>{S.pts-=it.price;S.items[it.id]=1;if(it.hat)S.hat=it.id;store();openShop()});
  else if(it.hat)row(b,it.icon,it.name,S.hat===it.id?'쓰고 있어요':'가지고 있어요',S.hat===it.id?'벗기':'쓰기',true,()=>{S.hat=S.hat===it.id?'':it.id;store();openShop()});else row(b,it.icon,it.name,'가지고 있어요 ✓','',false)}},[['닫기',closePanel]])}
function openBook(){panel('📖 재난 도감',b=>{for(const d of D.disasters){const s=S.dis[d.id];row(b,s?d.icon:'❓',s?d.name:'???',s?('살아남음 '+s.surv+' / '+s.seen+' · '+d.tip):'아직 못 만났어요','',false)}},[['닫기',closePanel]])}
$('shopBtn').onclick=()=>{snd('click');openShop()};$('bookBtn').onclick=()=>{snd('click');openBook()};
$('menuBtn').onclick=()=>{snd('click');if(state==='title')return;panel('잠깐 쉬기',b=>{const p=document.createElement('p');p.textContent='살아남은 판 '+S.wins+' / '+S.rounds+' · 최고 연속 '+S.best+' · ⭐'+S.pts;b.appendChild(p)},[['계속하기',closePanel],['처음 화면',()=>{closePanel();toTitle()},1]])};

// ---------- 갱신
const timers=[];function later(t,fn){timers.push({t,fn})}
function toast(t){const el=$('toast');const d=document.createElement('div');d.textContent=t;el.appendChild(d);for(let g=0;g<5&&el.children.length>3;g++)el.children[0].remove();later(2.6,()=>d.remove())}
let bq=[],bt=0;function banner(t,s,dur){bq.push([t,s,dur||2.6])}
function updBanner(dt){const el=$('banner');if(bt>0){bt-=dt;if(bt<=0)el.classList.remove('on');return}if(bq.length){const [t,s,d]=bq.shift();el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=t;el.querySelector('small').textContent=s;el.classList.add('on');bt=d}}
function pop(x,y,t,c){pops.push({x,y,t,c:c||'#fff',life:1.2})}
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}updBanner(dt);
  if(state==='title'||paused)return;
  stT-=dt;
  if(state==='lobby'){setT($('lCount'),'⏳ '+Math.ceil(stT)+'초 뒤에 시작! 지도를 골라요');if(stT<=0){startRound()}return}
  if(state==='warn'&&stT<=0)startDisaster();
  if(state==='play'&&stT<=0){endRound();return}
  if(state==='play')updDis(dt,time);
  // 움직이기
  let inx=0;if(keys.arrowleft||keys.a||hold.l)inx--;if(keys.arrowright||keys.d||hold.r)inx++;const jump=keys.arrowup||keys.w||keys[' ']||hold.j;
  if(P.dead){P.x=clamp(P.x+inx*260*dt,0,WW);P.y=clamp(P.y+((keys.arrowdown||keys.s)?260:jump?-260:0)*dt,40,WH)}else physics(P,dt,inx,jump);
  for(const e of npcs){const [d,j]=npcThink(e,dt);if(!e.dead)physics(e,dt,d,j)}if(window.__autoMe&&!P.dead){P.name=P.name||'나';const [d,j]=npcThink(P,dt);physics(P,0,0,false);hold.l=d<0;hold.r=d>0;hold.j=j}
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt}parts=parts.filter(p=>p.life>0);for(const p of pops){p.life-=dt;p.y-=30*dt}pops=pops.filter(p=>p.life>0);
  shake=Math.max(0,shake-dt);P.hurtT=Math.max(0,(P.hurtT||0)-dt);
  if(state==='play'&&ents.every(e=>e.dead))stT=Math.min(stT,.5);
  hud()}
function hud(){$('hpFill').style.width=Math.max(0,P.hp)+'%';setT($('ptTxt'),S.pts);setT($('aliveTxt'),ents.filter(e=>!e.dead).length+'/'+ents.length);
  const ds=curDis.map(i=>DIS[i]);setT($('stage'),state==='warn'?'⚠️ '+ds.map(d=>d.icon+' '+d.name).join(' + ')+' · '+Math.ceil(stT):state==='play'?ds.map(d=>d.icon).join('')+' 버텨요! '+Math.ceil(stT)+'초':'');
  const uw=waterY!=null&&P.y-PH+4>waterY&&!P.dead;$('airBox').hidden=!(uw||P.air<100)||P.dead;$('airFill').style.width=P.air+'%';$('coldBox').hidden=!dis.has('snow')||P.dead;$('coldFill').style.width=P.cold+'%';
  $('appleBtn').hidden=!(S.items.apple>0)||appleUsed||P.dead||state==='lobby'}

// ---------- 그리기
function view(){const s=clamp(Math.min(Ht/700,Wd/600),.55,1.6);const vw=Wd/s,vh=Ht/s;return {s,vw,vh,x:clamp(P.x-vw/2,Math.min(0,(WW-vw)/2),Math.max(WW-vw,(WW-vw)/2)),y:clamp(P.y-vh*.55,Math.min(0,WH-vh),WH-vh+60)}}
function sky(){if(dis.has('acid'))return ['#9ac870','#d8f0a0'];if(dis.has('sand'))return ['#e8b060','#ffe0a0'];if(dis.has('snow'))return ['#c8d8e8','#f0f6ff'];if(dis.has('volcano'))return ['#8a3a3a','#ffa060'];if(dis.has('thunder')||dis.has('tornado'))return ['#5a6a8a','#a8b8c8'];if(dis.has('meteor'))return ['#2a2a5a','#8a6aa8'];return ['#6ac0ff','#c8ecff']}
function draw(){ctx.setTransform(DPR,0,0,DPR,0,0);const [s1,s2]=sky();const g0=ctx.createLinearGradient(0,0,0,Ht);g0.addColorStop(0,s1);g0.addColorStop(1,s2);ctx.fillStyle=g0;ctx.fillRect(0,0,Wd,Ht);if(state==='title'||!grid.length)return;
  const v=view();const sx=shake>0?rand(-5,5):0,sy=shake>0?rand(-4,4):0;ctx.setTransform(DPR*v.s,0,0,DPR*v.s,(-v.x+sx)*DPR*v.s,(-v.y+sy)*DPR*v.s);
  // 바다
  ctx.fillStyle='#3a8ad8';ctx.fillRect(v.x-50,(G+1)*T,v.vw+100,WH);
  const x0=Math.max(0,Math.floor(v.x/T)),x1=Math.min(C-1,Math.ceil((v.x+v.vw)/T)),y0=Math.max(0,Math.floor(v.y/T)),y1=Math.min(R-1,Math.ceil((v.y+v.vh)/T));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=grid[y*C+x];if(!t)continue;const px=x*T,py=y*T;ctx.fillStyle=COL[t];
    if(t==='L'){ctx.beginPath();ctx.arc(px+T/2,py+T/2,T*.62,0,TAU);ctx.fill();continue}if(t==='T'){ctx.fillRect(px+8,py,T-16,T+1);continue}
    ctx.fillRect(px,py,T+.5,T+.5);if(t==='B'){ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(px,py+T/2-1,T,2);ctx.fillRect(px+(y%2?T/2:0),py,2,T/2);ctx.fillRect(px+(y%2?0:T/2),py+T/2,2,T/2)}
    else if(t==='W'){ctx.fillStyle='rgba(0,0,0,.1)';ctx.fillRect(px,py+T/3,T,2);ctx.fillRect(px,py+T*2/3,T,2)}else if(t==='g'){ctx.fillStyle='#a8744a';ctx.fillRect(px,py+8,T+.5,T-8)}else if(t==='#'){ctx.strokeStyle='rgba(0,0,0,.15)';ctx.strokeRect(px+1,py+1,T-2,T-2)}else if(t==='G'){ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(px+4,py+4,4,T-10)}}
  // 불
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const b=burn[y*C+x];if(b>0){const px=x*T,py=y*T;for(let k=0;k<3;k++){ctx.fillStyle=k?'#ffd23f':'#ff6a2a';ctx.beginPath();ctx.ellipse(px+6+k*8,py+T/2-Math.sin(time*12+k+x)*4,5,10+Math.sin(time*9+k)*3,0,0,TAU);ctx.fill()}}}
  // 별똥별 표시
  for(const m of meteors){if(m.t>0){ctx.strokeStyle=`rgba(255,60,60,${.5+.5*Math.sin(time*16)})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.tx,m.ty,60,14,0,0,TAU);ctx.stroke();const k=m.t/1.3;const mx=m.tx+k*300,my=m.ty-k*900;ctx.fillStyle='#ff8a3a';ctx.beginPath();ctx.arc(mx,my,14,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,200,80,.5)';ctx.beginPath();ctx.moveTo(mx-10,my-6);ctx.lineTo(mx+80,my-220);ctx.lineTo(mx+10,my+6);ctx.fill()}}
  for(const b of bombs){ctx.fillStyle='#ff5a2a';ctx.beginPath();ctx.arc(b.x,b.y,10,0,TAU);ctx.fill();ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(b.x-3,b.y-3,4,0,TAU);ctx.fill()}
  for(const b of debris){ctx.fillStyle=b.c;ctx.fillRect(b.x-7,b.y-7,14,14)}
  // 생물
  for(const e of npcs)if(!e.dead)drawEnt(e);if(!P.dead)drawEnt(P);else{ctx.globalAlpha=.6;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x,P.y-16,13,Math.PI,0);ctx.lineTo(P.x+13,P.y);for(let i=0;i<4;i++)ctx.lineTo(P.x+13-(i+.5)*6.5,P.y-(i%2?0:5));ctx.fill();ctx.fillStyle='#2a2a3a';ctx.beginPath();ctx.arc(P.x-4,P.y-18,2,0,TAU);ctx.arc(P.x+4,P.y-18,2,0,TAU);ctx.fill();ctx.globalAlpha=1}
  // 물·용암·파도
  if(waterY!=null){ctx.fillStyle='rgba(60,150,230,.55)';ctx.fillRect(v.x-50,waterY,v.vw+100,WH-waterY+100);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=3;ctx.beginPath();for(let x=v.x-50;x<v.x+v.vw+50;x+=20)ctx.lineTo(x,waterY+Math.sin(x/25+time*3)*3);ctx.stroke()}
  if(lavaY!=null){ctx.fillStyle='rgba(255,90,30,.85)';ctx.fillRect(v.x-50,lavaY,v.vw+100,WH-lavaY+100);ctx.fillStyle='#ffd23f';for(let x=Math.floor(v.x/60)*60;x<v.x+v.vw;x+=60){ctx.beginPath();ctx.arc(x+Math.sin(time+x)*10,lavaY+6,4+Math.sin(time*3+x)*2,0,TAU);ctx.fill()}}
  if(wave){const top=wave.top,w=260;const x=wave.dir>0?wave.x-w:wave.x;const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(wave.dir>0?0:1,'rgba(40,120,220,.4)');g.addColorStop(wave.dir>0?1:0,'rgba(40,120,220,.9)');ctx.fillStyle=g;ctx.fillRect(x,top,w,G*T-top);ctx.fillStyle='#e8f8ff';ctx.beginPath();ctx.arc(wave.x,top+20,26,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(wave.x-wave.dir*12,top+60,10,0,TAU);ctx.arc(wave.x-wave.dir*12,top+100,10,0,TAU);ctx.fill();ctx.fillStyle='#1a2a4a';ctx.beginPath();ctx.arc(wave.x-wave.dir*9,top+62,4,0,TAU);ctx.arc(wave.x-wave.dir*9,top+102,4,0,TAU);ctx.fill()}
  if(tornado){for(let i=0;i<14;i++){const yy=G*T-i*40,w=20+i*7,ox=Math.sin(time*6+i*.6)*10;ctx.fillStyle=`rgba(150,150,170,${.55-i*.02})`;ctx.beginPath();ctx.ellipse(tornado.x+ox,yy,w,14,0,0,TAU);ctx.fill()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(tornado.x-10,G*T-300,6,0,TAU);ctx.arc(tornado.x+10,G*T-300,6,0,TAU);ctx.fill();ctx.fillStyle='#2a2a3a';ctx.beginPath();ctx.arc(tornado.x-9,G*T-299,3,0,TAU);ctx.arc(tornado.x+11,G*T-299,3,0,TAU);ctx.fill()}
  for(const b of bolts){if(b.t>0){ctx.fillStyle=`rgba(60,60,80,${.6})`;ctx.beginPath();ctx.ellipse(b.x,v.y+60,70,24,0,0,TAU);ctx.fill();if(Math.sin(time*30)>0){ctx.strokeStyle='rgba(255,255,120,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x,v.y+80);ctx.lineTo(b.x,v.y+120);ctx.stroke()}}else if(b.flash>0){ctx.strokeStyle='#fff8a0';ctx.lineWidth=6;ctx.beginPath();let yy=v.y+60;ctx.moveTo(b.x,yy);while(yy<b.ty){yy+=30;ctx.lineTo(b.x+rand(-14,14),Math.min(yy,b.ty))}ctx.stroke()}}
  for(const p of parts){ctx.fillStyle=p.c;ctx.fillRect(p.x-3,p.y-3,6,6)}
  for(const p of pops){ctx.globalAlpha=Math.min(1,p.life*2);ctx.font='18px Jua';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(20,20,40,.8)';ctx.strokeText(p.t,p.x,p.y);ctx.fillStyle=p.c;ctx.fillText(p.t,p.x,p.y)}ctx.globalAlpha=1;
  // 날씨 (화면)
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(dis.has('acid')||dis.has('thunder')){ctx.strokeStyle=dis.has('acid')?'rgba(160,255,80,.6)':'rgba(200,220,255,.5)';ctx.lineWidth=2;for(let i=0;i<70;i++){const x=(i*97+time*60)%Wd,y=(i*53+time*700)%Ht;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+14);ctx.stroke()}}
  if(dis.has('snow')){ctx.fillStyle='#fff';for(let i=0;i<80;i++){const x=(i*97+time*90+Math.sin(time+i)*20)%Wd,y=(i*53+time*120)%Ht;ctx.beginPath();ctx.arc(x,y,2.5,0,TAU);ctx.fill()}}
  if(dis.has('sand')){ctx.fillStyle='rgba(230,180,100,.35)';ctx.fillRect(0,0,Wd,Ht);ctx.fillStyle='rgba(200,150,80,.6)';for(let i=0;i<60;i++){const x=(i*131+time*500)%Wd,y=(i*71)%Ht;ctx.fillRect(x,y,10,2)}}
  if(bolts.some(b=>b.flash>0)){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(0,0,Wd,Ht)}
  if(P.hurtT>0){ctx.fillStyle=`rgba(255,60,60,${P.hurtT})`;ctx.fillRect(0,0,Wd,Ht)}}
function drawEnt(e){const x=e.x,y=e.y,w=Math.sin(e.walk)*3;ctx.save();ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y,10,3,0,0,TAU);ctx.fill();
  if(e.me){if(S.items.balloon){ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+6,y-14);ctx.lineTo(x+14,y-50);ctx.stroke();ctx.fillStyle='#5ad86a';ctx.beginPath();ctx.ellipse(x+14,y-60,9,11,0,0,TAU);ctx.fill()}
    ctx.fillStyle='#3a5aa0';ctx.fillRect(x-6,y-9+w*.3,5,9);ctx.fillRect(x+1,y-9-w*.3,5,9);ctx.fillStyle='#ff6a5a';ctx.beginPath();ctx.roundRect(x-8,y-19,16,12,5);ctx.fill();ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(x,y-25,9,0,TAU);ctx.fill();ctx.fillStyle='#4a2a1a';ctx.beginPath();ctx.arc(x,y-28,9,Math.PI,0);ctx.fill();ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(x-3+e.face,y-25,1.7,0,TAU);ctx.arc(x+3+e.face,y-25,1.7,0,TAU);ctx.fill();
    const h=S.hat&&D.shop.find(s=>s.id===S.hat);if(h){if(h.hat==='crown'){ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.moveTo(x-8,y-33);ctx.lineTo(x-8,y-41);ctx.lineTo(x-4,y-36);ctx.lineTo(x,y-43);ctx.lineTo(x+4,y-36);ctx.lineTo(x+8,y-41);ctx.lineTo(x+8,y-33);ctx.fill()}else if(h.hat==='party'){ctx.fillStyle='#ff6ab0';ctx.beginPath();ctx.moveTo(x-7,y-32);ctx.lineTo(x,y-48);ctx.lineTo(x+7,y-32);ctx.fill()}else{ctx.fillStyle=h.hat;ctx.beginPath();ctx.ellipse(x,y-32,13,4,0,0,TAU);ctx.fill();ctx.fillRect(x-7,y-38,14,6)}}
    ctx.fillStyle='#fff';ctx.font='11px Jua';ctx.textAlign='center';ctx.fillText('나',x,y-46)}
  else{ctx.fillStyle=e.c;ctx.beginPath();ctx.ellipse(x,y-11,11,11,0,0,TAU);ctx.fill();if(e.ear==='long'){ctx.beginPath();ctx.ellipse(x-4,y-26,3,7,0,0,TAU);ctx.ellipse(x+4,y-26,3,7,0,0,TAU);ctx.fill()}else if(e.ear==='round'){ctx.beginPath();ctx.arc(x-8,y-19,4,0,TAU);ctx.arc(x+8,y-19,4,0,TAU);ctx.fill()}else if(e.ear==='cat'){ctx.beginPath();ctx.moveTo(x-10,y-15);ctx.lineTo(x-7,y-25);ctx.lineTo(x-3,y-19);ctx.moveTo(x+10,y-15);ctx.lineTo(x+7,y-25);ctx.lineTo(x+3,y-19);ctx.fill()}else if(e.ear==='pig'){ctx.fillStyle='#ff8aa8';ctx.beginPath();ctx.ellipse(x+e.face*4,y-9,4,3,0,0,TAU);ctx.fill()}
    const dk=e.c==='#3a4a6a';ctx.fillStyle=dk?'#fff':'#2a2420';ctx.beginPath();ctx.arc(x-3+e.face*2,y-13,1.8,0,TAU);ctx.arc(x+3+e.face*2,y-13,1.8,0,TAU);ctx.fill();if(e.c==='#ffd23f'||e.c==='#3a4a6a'){ctx.fillStyle='#ff9a3a';ctx.beginPath();ctx.moveTo(x+e.face*6,y-11);ctx.lineTo(x+e.face*11,y-10);ctx.lineTo(x+e.face*6,y-8);ctx.fill()}
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='10px Jua';ctx.textAlign='center';ctx.fillText(e.name,x,y-30)}
  if(e.hp<100){ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(x-12,y-(e.me?52:38),24,3);ctx.fillStyle='#5ad86a';ctx.fillRect(x-12,y-(e.me?52:38),24*e.hp/100,3)}
  ctx.restore()}

// ---------- 시작
function toTitle(){state='title';$('titleOv').hidden=false;$('lobbyOv').hidden=true;setT($('tRec'),S.rounds?'살아남은 판 '+S.wins+' · 최고 연속 '+S.best+' · ⭐'+S.pts:'')}
$('startBtn').onclick=()=>{snd('click');buildMap(0);P=mkEnt({me:true,name:'나'});P.x=WW/2;P.y=standY(P.x);npcs=[];ents=[P];toLobby()};
addEventListener('pagehide',store);
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);draw()}
toTitle();requestAnimationFrame(frame);
window.__ds={P:()=>P,get ents(){return ents},get state(){return state},keys,hold,S,closePanel,get curDis(){return curDis},startBtn:()=>$('startBtn').onclick(),solid,standY,roofed,get waterY(){return waterY},get lavaY(){return lavaY},get tornado(){return tornado},get grid(){return grid},C,T,G,forceDis:ids=>{curDis=ids},get paused(){return paused},endRound,buildMap};
});
