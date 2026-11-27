/* 폭탄 미로 — 폭탄으로 상자를 부수고 마지막까지 살아남기. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='bombMaze.save',[GW,GH]=D.size;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const save=Object.assign({cups:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,T=40,OX=0,OY=0;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;
  const mob=matchMedia('(pointer:coarse)').matches;const bottom=mob&&Ht>Wd?Ht*.3:20;T=Math.floor(Math.min((Wd-16)/GW,(Ht-70-bottom)/GH));OX=(Wd-T*GW)/2;OY=60+((Ht-70-bottom)-T*GH)/2}addEventListener('resize',fit);fit();
let bigT=0;function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1.4}
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

// ---------- 상태
let grid=[],items={},bombs=[],flames={},PL=[],state='title',paused=false,time=0,clock=0,wins=[0,0,0,0],roundEnd=0,parts=[];
const key=(x,y)=>x+','+y;
function newRound(){grid=[];items={};bombs=[];flames={};parts=[];
  const spawns=[[1,1],[GW-2,GH-2],[GW-2,1],[1,GH-2]];const safe=new Set();for(const [sx,sy] of spawns)for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])safe.add(key(sx+dx,sy+dy));
  for(let y=0;y<GH;y++){const r=[];for(let x=0;x<GW;x++){let c='.';if(x===0||y===0||x===GW-1||y===GH-1||(x%2===0&&y%2===0))c='#';else if(!safe.has(key(x,y))&&Math.random()<D.soft)c='S';r.push(c)}grid.push(r)}
  PL=D.players.map((p,i)=>({i,name:p.name,color:p.color,band:p.band,human:i===0,x:spawns[i][0]+.5,y:spawns[i][1]+.5,dir:[0,1],face:[0,1],moving:false,alive:true,bombs:1,fire:2,speed:D.speed,walk:0,ai:{t:0,goal:null},deadT:0,pass:new Set()}));
  clock=D.time;roundEnd=0;state='play';paused=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;top();big('준비… 시작!');snd('go')}
function top(){const el=$('top');el.innerHTML='';PL.forEach((p,i)=>{const d=document.createElement('div');d.className=p.alive?'':'dead';d.style.borderColor=p.band;d.textContent=p.name+' '+'★'.repeat(wins[i])+'☆'.repeat(Math.max(0,D.rounds-wins[i]));el.appendChild(d)});
  const c=document.createElement('div');c.className='clock';c.textContent='⏱ '+Math.ceil(clock);el.appendChild(c)}
const cellAt=(x,y)=>grid[y]&&grid[y][x];
const bombAt=(x,y)=>bombs.find(b=>b.x===x&&b.y===y);
function passable(x,y,p){const c=cellAt(x,y);if(c!=='.')return false;const b=bombAt(x,y);if(b&&!(p&&p.pass.has(b)))return false;return true}

// ---------- 움직임 (칸 길 따라 미끄러지기)
function move(p,dx,dy,dt){let step=p.speed*dt;const cx=Math.floor(p.x),cy=Math.floor(p.y);
  if(dx){const off=p.y-(cy+.5);const ahead=passable(cx+dx,cy,p);const before=(p.x-(cx+.5))*dx<-.001;
    if(ahead||before){const a=Math.min(Math.abs(off),step);p.y-=Math.sign(off)*a;step-=a*.5;let nx=p.x+dx*step;if(!ahead)nx=dx>0?Math.min(nx,cx+.5):Math.max(nx,cx+.5);p.x=nx}
    else if(Math.abs(off)>.12){const nr=cy+Math.sign(off);if(passable(cx+dx,nr,p)&&passable(cx,nr,p))p.y+=Math.sign(off)*Math.min(step,1)}}
  else if(dy){const off=p.x-(cx+.5);const ahead=passable(cx,cy+dy,p);const before=(p.y-(cy+.5))*dy<-.001;
    if(ahead||before){const a=Math.min(Math.abs(off),step);p.x-=Math.sign(off)*a;step-=a*.5;let ny=p.y+dy*step;if(!ahead)ny=dy>0?Math.min(ny,cy+.5):Math.max(ny,cy+.5);p.y=ny}
    else if(Math.abs(off)>.12){const nc=cx+Math.sign(off);if(passable(nc,cy+dy,p)&&passable(nc,cy,p))p.x+=Math.sign(off)*Math.min(step,1)}}
  // 놓은 폭탄에서 벗어나면 다시 막힘
  for(const b of [...p.pass])if(Math.abs(p.x-(b.x+.5))>.9||Math.abs(p.y-(b.y+.5))>.9)p.pass.delete(b)}
function placeBomb(p){if(!p.alive||state!=='play')return false;const x=Math.floor(p.x),y=Math.floor(p.y);if(bombAt(x,y))return false;if(bombs.filter(b=>b.owner===p).length>=p.bombs)return false;
  const b={x,y,t:D.fuse,owner:p,fire:p.fire};bombs.push(b);for(const q of PL)if(Math.floor(q.x)===x&&Math.floor(q.y)===y)q.pass.add(b);snd('place');return true}
function explode(b){bombs=bombs.filter(o=>o!==b);snd('boom');const cells=[[b.x,b.y]];
  for(const [dx,dy] of DIRS)for(let i=1;i<=b.fire;i++){const x=b.x+dx*i,y=b.y+dy*i,c=cellAt(x,y);if(c==='#')break;cells.push([x,y]);if(c==='S'){grid[y][x]='.';for(let k=0;k<6;k++)parts.push({x:x+.5,y:y+.5,vx:rand(-3,3),vy:rand(-3,3),t:0});
      const r=Math.random(),I=D.items;let it=null;if(r<I.bomb)it='bomb';else if(r<I.bomb+I.fire)it='fire';else if(r<I.bomb+I.fire+I.speed)it='speed';if(it)items[key(x,y)]={k:it,t:.3};break}
    const ob=bombAt(x,y);if(ob){ob.t=Math.min(ob.t,.06)}}
  for(const [x,y] of cells){const k=key(x,y);flames[k]={t:D.flame,cx:b.x,cy:b.y};if(items[k]&&items[k].t<=0)delete items[k]}}

// ---------- 위험 지도 (컴퓨터용)
function dangerMap(extra){const m=new Map();for(const k in flames)m.set(k,0);const list=extra?[...bombs,extra]:bombs;
  for(const b of list){const t=b.t;const add=(x,y)=>{const k=key(x,y);m.set(k,Math.min(m.has(k)?m.get(k):99,t))};add(b.x,b.y);
    for(const [dx,dy] of DIRS)for(let i=1;i<=b.fire;i++){const x=b.x+dx*i,y=b.y+dy*i,c=cellAt(x,y);if(c==='#')break;add(x,y);if(c==='S')break}}return m}
function bfs(p,sx,sy,goalFn,danger,maxD=40){const seen=new Map();const q=[[sx,sy,0,null]];seen.set(key(sx,sy),null);
  while(q.length){const [x,y,d,first]=q.shift();if(goalFn(x,y,d))return {x,y,d,first:first||[x,y]};if(d>=maxD)continue;
    for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(seen.has(k))continue;if(!passable(nx,ny,p)&&!(nx===sx&&ny===sy))continue;
      const arrive=(d+1)/p.speed;const dt=danger.get(k);if(dt!==undefined&&(dt===0||dt<arrive+.7))continue;seen.set(k,1);q.push([nx,ny,d+1,first||[nx,ny]])}}return null}
function think(p,dt){const A=p.ai;const cx=Math.floor(p.x),cy=Math.floor(p.y);
  const danger=dangerMap();A.t-=dt;
  if(A.goal){const gk=key(A.goal[0],A.goal[1]);const reached=Math.abs(p.x-A.goal[0]-.5)<.08&&Math.abs(p.y-A.goal[1]-.5)<.08;
    if(!reached&&!(danger.has(gk)&&!A.escaping)&&passable(A.goal[0],A.goal[1],p)){go(p,A.goal);return}
    if(reached){p.x=A.goal[0]+.5;p.y=A.goal[1]+.5}A.goal=null;A.escaping=false}
  const centered=Math.abs(p.x-cx-.5)<.1&&Math.abs(p.y-cy-.5)<.1;
  if(!centered){A.goal=[cx,cy];go(p,A.goal);return}
  const here=danger.get(key(cx,cy));
  if(here!==undefined){const r=bfs(p,cx,cy,(x,y)=>!danger.has(key(x,y))&&passable(x,y,p),danger,12)||bfs(p,cx,cy,(x,y)=>!danger.has(key(x,y))&&passable(x,y,p),new Map([...danger].filter(([k,v])=>v===0)),12);A.goal=r?r.first:null;A.escaping=true;go(p,A.goal);return}
  if(A.t>0){p.moving=false;return}A.t=rand(0,.25)*(1.2-D.cpu);
  const enemies=PL.filter(q=>q!==p&&q.alive);
  // 폭탄 놓을까?
  let worth=false;for(const [dx,dy] of DIRS)for(let i=1;i<=p.fire;i++){const x=cx+dx*i,y=cy+dy*i,c=cellAt(x,y);if(c==='#')break;if(c==='S'){if(i===1||Math.random()<.4)worth=true;break}if(enemies.some(q=>Math.floor(q.x)===x&&Math.floor(q.y)===y)&&Math.random()<D.cpu)worth=true}
  if(enemies.some(q=>Math.floor(q.x)===cx&&Math.floor(q.y)===cy))worth=true;
  if(worth&&bombs.filter(b=>b.owner===p).length<p.bombs){const fake={x:cx,y:cy,t:D.fuse,fire:p.fire};const dm=dangerMap(fake);fake.owner=p;
    const dm2=new Map(dm);dm2.delete(key(cx,cy));const esc=bfs(p,cx,cy,(x,y)=>!dm.has(key(x,y)),dm2,8);if(esc&&esc.d<=Math.floor(D.fuse*p.speed*.7)){placeBomb(p);A.goal=esc.first;A.escaping=true;go(p,A.goal);return}}
  // 어디로 갈까
  const safeMap=new Map([...danger].map(([k,v])=>[k,v]));
  let r=bfs(p,cx,cy,(x,y,d)=>d>0&&items[key(x,y)]&&!danger.has(key(x,y)),safeMap,10);
  if(!r)r=bfs(p,cx,cy,(x,y,d)=>d>0&&!danger.has(key(x,y))&&DIRS.some(([dx,dy])=>cellAt(x+dx,y+dy)==='S'),safeMap,25);
  if(!r&&enemies.length){r=bfs(p,cx,cy,(x,y,d)=>d>0&&enemies.some(q=>Math.abs(Math.floor(q.x)-x)+Math.abs(Math.floor(q.y)-y)<=1),safeMap,40)}
  if(r){const nk=key(r.first[0],r.first[1]);if(danger.has(nk))r=null}
  A.goal=r?r.first:null;go(p,A.goal)}
function go(p,g){if(!g){p.moving=false;return}const tx=g[0]+.5,ty=g[1]+.5;const dx=tx-p.x,dy=ty-p.y;if(Math.abs(dx)<.06&&Math.abs(dy)<.06){p.moving=false;return}
  if(Math.abs(dx)>Math.abs(dy))p.dir=[Math.sign(dx),0];else p.dir=[0,Math.sign(dy)];p.moving=true}

// ---------- 입력
const keys={};addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k]&&(k===' '||k==='enter'))placeBomb(PL[0]);if(k==='p'||k==='escape')togglePause();keys[k]=true;if(k===' ')e.preventDefault()});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
let stk=null;$('stickZone').addEventListener('pointerdown',e=>{stk={id:e.pointerId,ox:e.clientX,oy:e.clientY,dx:0,dy:0};const s=$('stick');s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';s.style.display='block'});
addEventListener('pointermove',e=>{if(!stk||e.pointerId!==stk.id)return;let dx=e.clientX-stk.ox,dy=e.clientY-stk.oy;const l=Math.hypot(dx,dy);if(l>45){dx*=45/l;dy*=45/l}stk.dx=dx;stk.dy=dy;const k=$('stick').querySelector('i');if(k)k.style.transform=`translate(${dx}px,${dy}px)`});
const endS=e=>{if(stk&&e.pointerId===stk.id){stk=null;$('stick').style.display='none'}};addEventListener('pointerup',endS);addEventListener('pointercancel',endS);
$('bBomb').addEventListener('pointerdown',e=>{e.preventDefault();if(!paused)placeBomb(PL[0])});
function humanDir(p){let d=null;if(keys.arrowleft||keys.a)d=[-1,0];else if(keys.arrowright||keys.d)d=[1,0];else if(keys.arrowup||keys.w)d=[0,-1];else if(keys.arrowdown||keys.s)d=[0,1];
  if(stk&&Math.hypot(stk.dx,stk.dy)>12)d=Math.abs(stk.dx)>Math.abs(stk.dy)?[Math.sign(stk.dx),0]:[0,Math.sign(stk.dy)];if(d){p.dir=d;p.moving=true}else p.moving=false}

// ---------- 갱신
function update(dt){time+=dt;for(const p of parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt}parts=parts.filter(p=>p.t<.5);
  if(state!=='play')return;clock-=dt;if(Math.ceil(clock)!==Math.ceil(clock+dt))top();
  for(const b of [...bombs]){b.t-=dt;if(b.t<=0)explode(b)}
  for(const k in flames){flames[k].t-=dt;if(flames[k].t<=0)delete flames[k]}
  for(const k in items)if(items[k].t>0)items[k].t-=dt;
  for(const p of PL){if(!p.alive){p.deadT+=dt;continue}
    if(p.human)humanDir(p);else think(p,dt);
    if(p.moving){move(p,p.dir[0],p.dir[1],dt);p.face=p.dir;p.walk+=dt*10}
    const k=key(Math.floor(p.x),Math.floor(p.y));
    if(flames[k]){p.alive=false;snd(p.human?'lose':'hurt');top();if(p.human)big('앗, 맞았다!')}
    else if(items[k]&&items[k].t<=0){const it=items[k].k;delete items[k];if(it==='bomb')p.bombs++;if(it==='fire')p.fire++;if(it==='speed')p.speed=Math.min(6.5,p.speed+.6);if(p.human){snd('power');big(it==='bomb'?'💣 +1':it==='fire'?'🔥 +1':'👟 빨라졌다!')}}}
  const alive=PL.filter(p=>p.alive);
  if(!roundEnd&&(alive.length<=1||clock<=0))roundEnd=.001;
  if(roundEnd){roundEnd+=dt;if(roundEnd>1.8)endRound()}}
function endRound(){state='round';const alive=PL.filter(p=>p.alive);let w=alive.length===1?alive[0]:null;if(clock<=0&&alive.length>1)w=null;if(w)wins[w.i]++;top();
  const champ=wins.findIndex(v=>v>=D.rounds);
  if(champ>=0){if(champ===0){save.cups++;store();Arcade.record&&Arcade.record('bombMazeCups',save.cups)}
    $('oTitle').textContent=champ===0?'🏆 우승!':PL[champ].name+' 우승';$('oTxt').innerHTML=champ===0?'폭탄 미로의 왕! 지금까지 '+save.cups+'번 우승':'다시 도전해 봐요!';$('againBtn').textContent='새로 시작';wins=[0,0,0,0]}
  else{$('oTitle').textContent=w?(w.human?'이번 판 승리!':w.name+' 승리'):'무승부';$('oTxt').innerHTML='먼저 '+D.rounds+'판 이기면 우승!';$('againBtn').textContent='다음 판'}
  $('overOv').hidden=false;snd(w&&w.human?'win':'coin')}

// ---------- 그리기
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#2a4a2a';ctx.fillRect(0,0,W,H);if(!grid.length)return;
  const X=x=>OX+x*T,Y=y=>OY+y*T;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const c=grid[y][x];const px=X(x),py=Y(y);
    ctx.fillStyle=(x+y)%2?'#7ac85a':'#72c054';ctx.fillRect(px,py,T+1,T+1);
    if(c==='#'){ctx.fillStyle='#8a8a9a';ctx.fillRect(px,py,T,T);ctx.fillStyle='#a8a8b8';ctx.fillRect(px+2,py+2,T-4,T*.55);ctx.fillStyle='#6a6a7a';ctx.fillRect(px,py+T*.82,T,T*.18)}
    else if(c==='S'){ctx.fillStyle='#c8864a';ctx.fillRect(px+2,py+2,T-4,T-4);ctx.strokeStyle='#8a5a2a';ctx.lineWidth=2;ctx.strokeRect(px+3,py+3,T-6,T-6);ctx.beginPath();ctx.moveTo(px+4,py+4);ctx.lineTo(px+T-4,py+T-4);ctx.moveTo(px+T-4,py+4);ctx.lineTo(px+4,py+T-4);ctx.stroke()}}
  for(const k in items){const it=items[k];const [x,y]=k.split(',').map(Number);ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.roundRect(X(x)+T*.12,Y(y)+T*.12,T*.76,T*.76,T*.18);ctx.fill();ctx.font=(T*.55)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(it.k==='bomb'?'💣':it.k==='fire'?'🔥':'👟',X(x+.5),Y(y+.52))}
  for(const b of bombs){const s=1+Math.sin(time*(b.t<.8?24:10))*.08;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(X(b.x+.5),Y(b.y+.85),T*.3,T*.1,0,0,7);ctx.fill();ctx.fillStyle='#2a2a34';ctx.beginPath();ctx.arc(X(b.x+.5),Y(b.y+.52),T*.34*s,0,7);ctx.fill();ctx.fillStyle='#5a5a6a';ctx.beginPath();ctx.arc(X(b.x+.4),Y(b.y+.42),T*.08,0,7);ctx.fill();
    ctx.fillStyle=Math.floor(time*12)%2?'#ffd23f':'#ff6a2a';ctx.beginPath();ctx.arc(X(b.x+.68),Y(b.y+.18),T*.09,0,7);ctx.fill()}
  for(const k in flames){const f=flames[k];const [x,y]=k.split(',').map(Number);const a=clamp(f.t/D.flame*1.5,0,1);ctx.globalAlpha=a;ctx.fillStyle='#ff8a2a';ctx.fillRect(X(x)+T*.08,Y(y)+T*.08,T*.84,T*.84);ctx.fillStyle='#ffe05a';ctx.fillRect(X(x)+T*.25,Y(y)+T*.25,T*.5,T*.5);ctx.globalAlpha=1}
  for(const p of parts){ctx.fillStyle='#a8743a';ctx.fillRect(X(p.x)-3,Y(p.y)-3,6,6)}
  for(const p of PL.slice().sort((a,b)=>a.y-b.y)){if(!p.alive&&p.deadT>1)continue;const x=X(p.x),y=Y(p.y);ctx.save();ctx.translate(x,y);if(!p.alive){ctx.globalAlpha=1-p.deadT;ctx.rotate(p.deadT*8);ctx.scale(1-p.deadT*.5,1-p.deadT*.5)}
    const bob=p.moving?Math.abs(Math.sin(p.walk))*T*.06:0;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,T*.36,T*.28,T*.09,0,0,7);ctx.fill();
    ctx.fillStyle=p.color;ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,T*.12-bob,T*.26,T*.22,0,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,-T*.16-bob,T*.27,0,7);ctx.fill();ctx.stroke();ctx.fillStyle=p.band;ctx.fillRect(-T*.27,-T*.3-bob,T*.54,T*.09);
    const fx=p.face[0]*T*.07,fy=p.face[1]*T*.04;ctx.fillStyle='#1a1a2a';if(p.face[1]>=0||p.face[0]){for(const k of [-1,1]){ctx.beginPath();ctx.ellipse(k*T*.09+fx,-T*.12+fy-bob,T*.035,T*.06,0,0,7);ctx.fill()}}
    if(p.human){ctx.fillStyle='#fff';ctx.font=(T*.32)+'px Jua';ctx.textAlign='center';ctx.fillText('▼',0,-T*.5-bob)}ctx.restore()}}

// ---------- 화면
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
function showTitle(){state='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;setT($('tRounds'),D.rounds);setT($('tRec'),save.cups?'지금까지 '+save.cups+'번 우승':'')}
$('startBtn').onclick=()=>{snd('click');wins=[0,0,0,0];newRound()};$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{paused=false;showTitle()};
$('againBtn').onclick=()=>{snd('click');newRound()};$('oMenu').onclick=()=>{snd('click');wins=[0,0,0,0];showTitle()};
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}if(!paused)update(dt);draw();requestAnimationFrame(frame)}
showTitle();requestAnimationFrame(frame);
window.__bm={newRound,get PL(){return PL},get state(){return state},get wins(){return wins},get bombs(){return bombs},get grid(){return grid}};
});
