/* 흑백 저택 탈출 — 색깔 열쇠 4개와 번호 쪽지를 찾아 엘리베이터로 탈출해요. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2,T=D.tile;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const SAVE='mono.save';
let Wd=0,Ht=0,DPR=1;const dark=document.createElement('canvas'),dctx=dark.getContext('2d');
function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;dark.width=Math.ceil(Wd/2);dark.height=Math.ceil(Ht/2)}addEventListener('resize',fit);fit();
const save=Object.assign({best:{},wins:0,unlocked:0,run:null,seenTut:false},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||JSON.parse(localStorage.getItem(SAVE+'.bak'))||{}}catch(_){return {}}})());
function store(){if(state==='play')save.run=snapshot();try{const s=JSON.stringify(save);localStorage.setItem(SAVE,s);localStorage.setItem(SAVE+'.bak',s)}catch(_){}}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const KEY={};for(const k of D.keys)KEY[k.id]=k;

// ---------- 저택 만들기
let L,G,MW,MH,MT,cx,rooms,furn,pass,code,run;
function build(lv,seed){L=D.levels[lv];const R=mulberry(seed);const rw=L.rw,rh=L.rh;
  MW=Math.max(rw*8+1,15);const ci=Math.floor(rw/2);cx=1+ci*8+2;MT=14;MH=MT+rh*7+1;
  G=[];for(let y=0;y<MH;y++){G.push(new Array(MW).fill(1))}
  const carve=(x0,y0,w,h,v=0)=>{for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(y>=0&&y<MH&&x>=0&&x<MW)G[y][x]=v};
  carve(cx,1,3,2);G[3][cx]=G[3][cx+1]=G[3][cx+2]=5;// 엘리베이터 칸과 문
  carve(cx-5,4,13,6);// 로비
  G[10][cx]=G[10][cx+1]=G[10][cx+2]=2;// 판자
  carve(cx,11,3,3);carve(cx,MT,3,1);// 계단
  rooms=[];for(let j=0;j<rh;j++)for(let i=0;i<rw;i++){const r={i,j,x0:1+i*8,y0:MT+1+j*7,id:rooms.length,adj:[],visited:false};carve(r.x0,r.y0,7,6);rooms.push(r)}
  const rm=(i,j)=>rooms[j*rw+i];
  // 길 잇기: 나무 + 고리
  const seen=new Set(),stack=[rm(ci,0)],edges=[];seen.add(stack[0].id);
  while(stack.length){const a=stack[stack.length-1];const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>rm(a.i+dx,a.j+dy)).filter(b=>b&&b.i>=0&&b.i<rw&&b.j>=0&&b.j<rh&&Math.abs(b.i-a.i)+Math.abs(b.j-a.j)===1&&!seen.has(b.id));
    if(!nb.length){stack.pop();continue}const b=nb[Math.floor(R()*nb.length)];seen.add(b.id);edges.push([a,b]);stack.push(b)}
  for(let j=0;j<rh;j++)for(let i=0;i<rw;i++){const a=rm(i,j);for(const b of [i+1<rw?rm(i+1,j):null,j+1<rh?rm(i,j+1):null])if(b&&R()<.35&&!edges.some(e=>(e[0]===a&&e[1]===b)||(e[0]===b&&e[1]===a)))edges.push([a,b])}
  for(const [a,b] of edges){a.adj.push(b.id);b.adj.push(a.id);if(a.j===b.j){const x=8*(Math.max(a.i,b.i));G[a.y0+2][x]=G[a.y0+3][x]=0}else{const y=MT+7*Math.max(a.j,b.j);for(let k=2;k<=4;k++)G[y][a.x0+k]=0}}
  // 방까지 거리
  const start=rm(ci,0);const dist={[start.id]:0},q=[start];while(q.length){const a=q.shift();for(const b of a.adj)if(!(b in dist)){dist[b]=dist[a.id]+1;q.push(rooms[b])}}for(const r of rooms)r.d=dist[r.id];
  // 가구
  furn=[];const slots=r=>[[r.x0,r.y0],[r.x0+5,r.y0],[r.x0,r.y0+5],[r.x0+5,r.y0+5]];
  let fid=0;const add=(k,x,y,w,h,room,ex)=>{const f=Object.assign({id:fid++,k,x,y,w,h,room},ex||{});furn.push(f);return f};
  // 로비 물건
  add('lock',cx-3,4,1,1,-1);add('keypad',cx+5,4,1,1,-1);add('plant',cx-5,4,1,1,-1);add('plant',cx+7,4,1,1,-1);add('bench',cx-5,8,2,1,-1);add('bench',cx+6,8,2,1,-1);
  for(const r of rooms){const s=slots(r).sort(()=>R()-.5);const n=1+Math.floor(R()*2.2);let used=0;
    if(r.d>0||R()<.5){add('wardrobe',s[used][0],s[used][1],2,1,r.id);used++}
    for(let k=0;k<n&&used<4;k++){add('dresser',s[used][0],s[used][1],2,1,r.id,{items:[],open:false});used++}
    r.free=s.slice(used);if(R()<.4)r.rug=true}
  // 번호 쪽지 받침대
  const far=rooms.filter(r=>r.d>=2&&r.free.length).sort(()=>R()-.5);const cr=far[0]||rooms.find(r=>r.free.length);const cs=cr.free.shift();add('block',cs[0],cs[1],2,1,cr.id);
  code=[];for(let i=0;i<4;i++)code.push(1+Math.floor(R()*9));
  // 열쇠: 서로 다른 먼 방의 서랍장
  const drs=furn.filter(f=>f.k==='dresser');const byRoom={};for(const f of drs)(byRoom[f.room]=byRoom[f.room]||[]).push(f);
  const keyRooms=Object.keys(byRoom).map(Number).filter(id=>rooms[id].d>=1).sort((a,b)=>(rooms[b].d+R()*2)-(rooms[a].d+R()*2));
  D.keys.forEach((k,i)=>{const rid=keyRooms[i%keyRooms.length];const list=byRoom[rid];const f=list[Math.floor(R()*list.length)];f.items.push('key:'+k.id)});
  const near=drs.filter(f=>rooms[f.room].d<=2&&!f.items.length);const rf=near[Math.floor(R()*near.length)]||drs.find(f=>!f.items.length);if(rf)rf.items.push('radar');
  for(const f of drs)if(!f.items.length&&R()<.25)f.items.push(R()<.5?'snack':'candy');
  // 걸을 수 있는 칸
  pass=[];for(let y=0;y<MH;y++){pass.push([]);for(let x=0;x<MW;x++)pass[y].push(G[y][x]===0)}for(const f of furn)for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)pass[y][x]=false}
const tileAt=(px,py)=>[Math.floor(px/T),Math.floor(py/T)];
function solid(tx,ty){if(ty<0||ty>=MH||tx<0||tx>=MW)return true;const g=G[ty][tx];if(g===1)return true;if(g===2)return !run.pried;if(g===5)return !run.open;if(!pass[ty][tx]&&g===0)return true;return false}
function blockedAt(px,py,r=13){for(const [ox,oy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){const [tx,ty]=tileAt(px+ox,py+oy);if(solid(tx,ty))return true}return false}
const inMaze=py=>py/T>MT;
function roomOf(px,py){const tx=px/T,ty=py/T;for(const r of rooms)if(tx>=r.x0-.5&&tx<r.x0+7.5&&ty>=r.y0-.5&&ty<r.y0+6.5)return r;return null}

// ---------- 상태
const P={x:0,y:0,face:0,walk:0,hidden:null,inv:0,running:false};
let state='title',paused=false,time=0,mons=[],pops=[],parts=[],holdT=0,holdWhat=null,radarT=0,radarCool=0,stepT=0,warnT=0,warnTxt='',beat=0,shake=0,codeIn='',tips={};
function newRun(lv){const seed=Math.floor(Math.random()*1e9);run={lv,seed,hp:D.hp,pried:0,open:false,opened:[],inserted:[],carried:[],dropped:[],codeRead:false,codeOK:false,radar:false,time:0,visited:[],items:{candy:0}};begin(true)}
function snapshot(){return Object.assign({},run,{px:P.x,py:P.y})}
function begin(fresh){build(run.lv,run.seed);for(const id of run.opened){const f=furn[id];if(f){f.open=true;f.items=f.items.filter(it=>!(it.startsWith('key:')&&(run.inserted.includes(it.slice(4))||run.carried.includes(it.slice(4))||run.dropped.some(d=>d.id===it.slice(4)))));if(f.items.length&&f.items.every(it=>it==='radar'&&run.radar))f.items=[]}}
  for(const id of run.visited)if(rooms[id])rooms[id].visited=true;
  if(fresh||!run.px){P.x=(cx+1.5)*T;P.y=7*T}else{P.x=run.px;P.y=run.py}P.hidden=null;P.inv=1;
  mons=[];for(let i=0;i<L.mons;i++)mons.push(spawnMon(i));state='play';paused=false;$('titleOv').hidden=true;$('panel').hidden=true;radarT=0;radarCool=0;
  ui();applySat();snd('go');if(fresh){banner('🏚️ '+L.name,'색을 잃은 저택에 갇혔어요!',3);if(!save.seenTut){later(3.2,()=>banner('💡 먼저 아래쪽 판자를 떼요','행동 버튼을 꾹 누르고 있어요',3.5));save.seenTut=true}}store()}
function spawnMon(i){const far=rooms.filter(r=>r.d>=Math.min(3,Math.max(...rooms.map(q=>q.d)))).sort(()=>Math.random()-.5);const r=far[i%far.length]||rooms[rooms.length-1];return {x:(r.x0+3.5)*T,y:(r.y0+3)*T,st:'patrol',path:[],repath:0,lost:0,lx:0,ly:0,look:0,face:0,walk:0,id:i}}
const timers=[];function later(t,fn){timers.push({t,fn})}
function toast(t){const el=$('toast');const d=document.createElement('div');d.textContent=t;el.appendChild(d);for(let g=0;g<5&&el.children.length>3;g++)el.children[0].remove();later(2.6,()=>d.remove())}
let bq=[],bt=0;function banner(t,s,dur){bq.push([t,s,dur||2.6])}
function updBanner(dt){const el=$('banner');if(bt>0){bt-=dt;if(bt<=0)el.classList.remove('on');return}if(bq.length){const [t,s,d]=bq.shift();el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=t;el.querySelector('small').textContent=s;el.classList.add('on');bt=d}}
function pop(x,y,t,c){pops.push({x,y,t,c:c||'#fff',life:1.3})}
function warn(t,s){warnTxt=t;warnT=s||1}
function tip(k,t){if(tips[k])return;tips[k]=1;toast(t)}
const sat=()=>D.sat[run?run.inserted.length:0];
function applySat(){}

// ---------- 입력
const keys={};let actQ=false,actHeld=false;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!keys[k]){if(k===' '||k==='e'){actQ=true;actHeld=true}if(k==='r')useRadar();if(k==='escape'||k==='p')openMenu()}keys[k]=true;if(k===' ')e.preventDefault()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k===' '||k==='e')actHeld=false});
let joy=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,x:0,y:0}});
addEventListener('pointermove',e=>{if(!joy||e.pointerId!==joy.id)return;let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy;const l=Math.hypot(dx,dy),M=50;if(l>M){joy.ox+=dx/l*(l-M);joy.oy+=dy/l*(l-M);dx=dx/l*M;dy=dy/l*M}joy.x=dx/M;joy.y=dy/M});
const jEnd=e=>{if(joy&&e.pointerId===joy.id)joy=null};addEventListener('pointerup',jEnd);addEventListener('pointercancel',jEnd);
const ab=$('actBtn');ab.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();actQ=true;actHeld=true});const abUp=()=>{actHeld=false};ab.addEventListener('pointerup',abUp);ab.addEventListener('pointerleave',abUp);ab.addEventListener('pointercancel',abUp);
let runToggle=false;$('runBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();runToggle=!runToggle;$('runBtn').classList.toggle('on',runToggle);tip('run','🏃 달리면 빠르지만 쿵쾅 소리가 나요!')});
$('radarBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();useRadar()});
function useRadar(){if(!run||!run.radar||state!=='play')return;if(radarCool>0){toast('📡 충전 중… '+Math.ceil(radarCool)+'초');return}radarT=D.radar.show;radarCool=D.radar.cool;snd('zap');toast('📡 뿔뿔이가 지도에 보여요!')}

// ---------- 무엇을 할 수 있나
function near(f,d=1.15){const tx=P.x/T,ty=P.y/T;const dx=Math.max(0,Math.abs(tx-(f.x+f.w/2))-f.w/2),dy=Math.max(0,Math.abs(ty-(f.y+f.h/2))-f.h/2);return Math.hypot(dx,dy)<d}
function target(){if(P.hidden)return {k:'unhide',label:'나오기'};
  const tx=P.x/T,ty=P.y/T;
  for(const d of run.dropped)if(Math.hypot(d.x/T-tx,d.y/T-ty)<1)return {k:'pick',d,label:'열쇠\n줍기'};
  if(!run.pried&&ty>8&&ty<11.5&&tx>cx-.5&&tx<cx+3.5)return {k:'pry',label:'판자 떼기\n(꾹)',hold:D.pry*D.boards};
  if(run.open&&ty<4.6&&tx>cx-.2&&tx<cx+3.2)return null;
  let best=null,bd=9;
  for(const f of furn){if(!near(f))continue;const d=Math.hypot(tx-(f.x+f.w/2),ty-(f.y+f.h/2))+(f.k==='wardrobe'&&!beat?.8:0)-(f.k==='dresser'&&!f.open?.4:0);if(d>=bd)continue;let t=null;
    if(f.k==='wardrobe')t={k:'hide',f,label:'옷장에\n숨기'};
    else if(f.k==='dresser'&&!f.open)t={k:'search',f,label:'서랍장\n뒤지기',hold:D.search};
    else if(f.k==='block')t={k:'read',f,label:run.codeRead?'쪽지\n다시 보기':'쪽지\n읽기'};
    else if(f.k==='lock')t={k:'lock',f,label:run.carried.length?'열쇠\n꽂기':'자물쇠\n보기'};
    else if(f.k==='keypad')t={k:'keypad',f,label:'번호\n누르기'};
    if(t){bd=d;best=t}}
  return best}
function doAct(t){
  if(t.k==='unhide'){unhide();return}
  if(t.k==='pick'){run.dropped=run.dropped.filter(d=>d!==t.d);run.carried.push(t.d.id);snd('coin');pop(P.x,P.y-30,'🔑 '+KEY[t.d.id].name+' 열쇠!',KEY[t.d.id].c);ui();return}
  if(t.k==='hide'){P.hidden=t.f;P.sx=P.x;P.sy=P.y;P.x=(t.f.x+1)*T;P.y=(t.f.y+.5)*T;snd('thud');tip('hide','🤫 옷장 안에서는 뿔뿔이가 지나갈 때까지 기다려요');return}
  if(t.k==='read'){run.codeRead=true;snd('level');panel('📜 번호 쪽지',b=>{const c=document.createElement('div');c.className='code';c.textContent=code.join(' ');b.appendChild(c);const p=document.createElement('p');p.className='small';p.textContent='엘리베이터 옆 번호판에 순서대로 눌러요. 위쪽 표시에도 적어 둘게요!';b.appendChild(p)},[['알았어요',closePanel]]);ui();return}
  if(t.k==='lock'){if(run.carried.length){for(const k of run.carried){run.inserted.push(k);pop(P.x,P.y-30-run.inserted.length*16,'🔓 '+KEY[k].name+' 철컥!',KEY[k].c)}const n=run.carried.length;run.carried=[];snd('power');later(.2,()=>snd('level'));
      banner('🎨 색이 돌아와요!',run.inserted.length+'/4 · '+(run.inserted.length<4?'열쇠 '+(4-run.inserted.length)+'개 더!':run.codeOK?'엘리베이터가 열려요!':'이제 번호를 눌러요'));checkOpen();ui();store()}
    else panel('🔒 자물쇠 4개',b=>{b.appendChild(lightsEl());const p=document.createElement('p');p.textContent='아래층 서랍장에서 색깔 열쇠를 찾아 꽂아요. 꽂을 때마다 세상에 색이 돌아와요!';b.appendChild(p)},[['알았어요',closePanel]]);return}
  if(t.k==='keypad'){openKeypad();return}}
function finishHold(t){
  if(t.k==='pry'){run.pried=1;snd('crack');shake=.3;for(let i=0;i<14;i++)parts.push({x:(cx+1.5)*T,y:10.5*T,vx:rand(-160,160),vy:rand(-200,-40),life:1,c:'#8a6a4a'});banner('🪜 아래층으로 가는 길!','서랍장을 뒤져서 열쇠 4개와 번호 쪽지를 찾아요',3.2);store();return}
  if(t.k==='search'){const f=t.f;f.open=true;run.opened.push(f.id);snd('pop');noise(f.x*T+T,f.y*T,3.5);let shown=false;
    for(const it of f.items){shown=true;if(it.startsWith('key:')){const k=KEY[it.slice(4)];run.carried.push(k.id);pop((f.x+1)*T,f.y*T,'🔑 '+k.name+' 열쇠!',k.c);snd('win');banner('🔑 '+k.name+' 열쇠를 찾았어요!','위층 자물쇠에 꽂으러 가요',2.4);tip('carry','💡 열쇠를 든 채 잡히면 떨어뜨려요. 바로 꽂으러 가요!')}
      else if(it==='radar'){run.radar=true;pop((f.x+1)*T,f.y*T,'📡 레이더!','#7ad8ff');banner('📡 레이더를 찾았어요!','누르면 뿔뿔이가 지도에 보여요',2.6);snd('power')}
      else if(it==='snack'){if(run.hp<D.hp){run.hp++;pop((f.x+1)*T,f.y*T,'🍪 하트 +1','#ff8ab0')}else{run.items.candy++;pop((f.x+1)*T,f.y*T,'🍬 사탕!','#ff8ab0')}snd('coin')}
      else if(it==='candy'){run.items.candy++;pop((f.x+1)*T,f.y*T,'🍬 사탕!','#ff8ab0');snd('coin')}}
    f.items=[];if(!shown)pop((f.x+1)*T,f.y*T,'텅~','#ddd');ui();store()}}
function unhide(){const f=P.hidden;P.hidden=null;$('hideBar').hidden=true;const cand=[[f.x,f.y+1],[f.x+1,f.y+1],[f.x,f.y-1],[f.x+1,f.y-1],[f.x-1,f.y],[f.x+2,f.y]];let best=null,bd=1e9;for(const [x,y] of cand)if(!solid(x,y)){const d=Math.hypot(x+.5-P.sx/T,y+.5-P.sy/T);if(d<bd){bd=d;best=[x,y]}}if(best){P.x=(best[0]+.5)*T;P.y=(best[1]+.5)*T}else{P.x=P.sx;P.y=P.sy}snd('thud')}
function checkOpen(){if(!run.open&&run.inserted.length>=4&&run.codeOK){run.open=true;snd('win');banner('🛗 엘리베이터가 열렸어요!','위로 들어가면 탈출!',3)}}

// ---------- 패널
function panel(title,build,btns){$('pTitle').textContent=title;const b=$('pBody');b.innerHTML='';build(b);const bb=$('pBtns');bb.innerHTML='';for(const [l,fn,soft] of btns){const e=document.createElement('button');e.className='btn'+(soft?' soft':'');e.textContent=l;e.onclick=()=>{snd('click');fn()};bb.appendChild(e)}$('panel').hidden=false;paused=true;joy=null;actHeld=false}
const closePanel=()=>{$('panel').hidden=true;paused=false};
function lightsEl(){const d=document.createElement('div');d.className='lights';for(const k of D.keys){const s=document.createElement('span');if(run.inserted.includes(k.id))s.style.background=k.c;s.title=k.name;d.appendChild(s)}return d}
function openKeypad(){codeIn='';panel('🔢 엘리베이터 번호판',b=>{b.appendChild(lightsEl());const p=document.createElement('p');p.className='small';p.textContent=run.codeOK?'번호는 이미 맞았어요! 열쇠 '+(4-run.inserted.length)+'개만 더 꽂으면 열려요':run.codeRead?'쪽지에 적힌 번호: '+code.join(' '):'번호 쪽지는 아래층 하얀 받침대 위에 있어요';b.appendChild(p);
  const cd=document.createElement('div');cd.className='code';cd.textContent=run.codeOK?'✔✔✔✔':'____';b.appendChild(cd);if(run.codeOK)return;const pad=document.createElement('div');pad.className='pad';
  for(const n of [1,2,3,4,5,6,7,8,9,'←',0,'✔']){const bt=document.createElement('button');bt.textContent=n;bt.onclick=()=>{snd('tick');if(n==='←')codeIn=codeIn.slice(0,-1);else if(n==='✔'){if(codeIn===code.join('')){run.codeOK=true;snd('level');toast('✔ 띠리링! 번호가 맞았어요');closePanel();checkOpen();ui();store()}else{codeIn='';snd('bad');toast('삐빅! 번호가 달라요')}}else if(codeIn.length<4)codeIn+=n;cd.textContent=(codeIn+'____').slice(0,4)};pad.appendChild(bt)}b.appendChild(pad)},[['닫기',closePanel,1]])}
function openMenu(){if(state!=='play')return;panel('잠깐 쉬기',b=>{const p=document.createElement('p');p.textContent=L.name+' · 열쇠 '+run.inserted.length+'/4'+(run.carried.length?' (들고 있는 것 '+run.carried.length+')':'')+' · 사탕 '+run.items.candy;b.appendChild(p);b.appendChild(lightsEl());const q=document.createElement('p');q.className='small';q.textContent='💡 뒤진 방은 지도에 ✓ 표시가 생겨요. 쿵쿵 소리가 가까우면 옷장에 숨어요.';b.appendChild(q)},[['계속하기',closePanel],['처음 화면',()=>{store();closePanel();toTitle()},1]])}

// ---------- 다치기
function caught(m){if(P.inv>0||state!=='play')return;run.hp--;shake=.5;snd('hurt');P.inv=2;
  for(const k of run.carried)run.dropped.push({id:k,x:P.x+rand(-10,10),y:P.y+rand(-10,10)});const lost=run.carried.length;run.carried=[];
  for(const mm of mons){const s=spawnMon(mm.id);Object.assign(mm,s)}
  if(run.hp<=0){state='dead';save.run=null;try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}snd('lose');later(.5,()=>panel('😵 뿔뿔이에게 잡혔어요',b=>{const p=document.createElement('p');p.textContent='하트를 모두 잃었어요. 새 저택에서 다시 해요!';b.appendChild(p);const q=document.createElement('p');q.className='small';q.textContent='💡 쿵쿵 소리가 들리면 서랍장을 뒤지지 말고 옷장에 숨어요. 긴 복도에서는 멀리서도 보여요.';b.appendChild(q)},[['다시 하기',()=>{closePanel();newRun(run.lv)}],['처음 화면',()=>{closePanel();toTitle()},1]]));return}
  P.x=(cx+1.5)*T;P.y=7*T;P.hidden=null;banner('😵 뿔뿔이에게 잡혔어요!',lost?'열쇠를 떨어뜨렸어요. 잡힌 곳에 반짝이고 있어요':'하트 '+run.hp+'개 남았어요 · 꽂은 열쇠는 그대로예요',3);ui();store()}
function noise(x,y,r){for(const m of mons){if(m.st==='chase')continue;if(Math.hypot(m.x-x,m.y-y)<r*T){m.st='investigate';m.lx=x;m.ly=y;m.repath=0}}}

// ---------- 뿔뿔이
function bfs(sx,sy,gx,gy){if(sx===gx&&sy===gy)return [];const W=MW,prev=new Int32Array(W*MH).fill(-1);const q=[sy*W+sx];prev[sy*W+sx]=sy*W+sx;let h=0;const goal=gy*W+gx;
  while(h<q.length){const c=q[h++];if(c===goal)break;const x=c%W,y=(c/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(ny<=MT||ny>=MH||nx<0||nx>=MW)continue;const n=ny*W+nx;if(prev[n]>=0||!pass[ny][nx])continue;prev[n]=c;q.push(n)}}
  if(prev[goal]<0)return null;const path=[];let c=goal;while(c!==sy*W+sx){path.unshift([c%W,(c/W)|0]);c=prev[c]}return path}
function sees(m){if(P.hidden||!inMaze(P.y))return false;const d=Math.hypot(P.x-m.x,P.y-m.y);if(d>L.sight*T)return false;if(d<1.3*T)return true;const n=Math.ceil(d/(T/3));for(let i=1;i<n;i++){const x=m.x+(P.x-m.x)*i/n,y=m.y+(P.y-m.y)*i/n;const [tx,ty]=tileAt(x,y);if(G[ty][tx]===1)return false}return true}
function updMon(m,dt){m.repath-=dt;const [mx,my]=tileAt(m.x,m.y);
  if(sees(m)){if(m.st!=='chase'){m.st='chase';snd('alert');warn('❗ 뿔뿔이가 봤어요! 달려서 옷장에 숨어요!',2);tip('chase','💡 뿔뿔이 눈에 안 보이는 곳까지 가서 옷장에 숨어요')}m.lx=P.x;m.ly=P.y;m.lost=0}
  else if(m.st==='chase'){m.lost+=dt;if(m.lost>2.5){m.st='investigate';m.repath=0;if(P.hidden&&Math.hypot(P.x-m.x,P.y-m.y)<5*T){m.st='look';m.look=2.4;m.lx=P.hidden.x*T+T;m.ly=(P.hidden.y+1.5)*T}}}
  if(m.st==='look'){m.look-=dt;if(m.look<=0){m.st='patrol';m.path=[];m.goFar=true;m.repath=0;if(P.hidden)toast('휴… 뿔뿔이가 그냥 갔어요')}}
  let sp=m.st==='chase'?L.chase:m.st==='investigate'?L.mspeed*1.4:L.mspeed;if(m.st==='look')sp=L.mspeed*.6;
  if(m.repath<=0||!m.path||!m.path.length){m.repath=m.st==='chase'?.25:1.2;let gx,gy;
    if(m.st==='patrol'){if(!m.path||!m.path.length){let cand=rooms;if(m.goFar){cand=rooms.filter(r=>Math.hypot((r.x0+3)*T-P.x,(r.y0+3)*T-P.y)>12*T);m.goFar=false;if(!cand.length)cand=rooms}const r=cand[Math.floor(Math.random()*cand.length)];gx=r.x0+1+Math.floor(Math.random()*5);gy=r.y0+1+Math.floor(Math.random()*4)}else{m.repath=1;gx=null}}
    else{[gx,gy]=tileAt(m.lx,m.ly);gy=Math.max(gy,MT+1)}
    if(gx!=null){if(!pass[gy]||!pass[gy][gx]){for(const [ox,oy] of [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]])if(pass[gy+oy]&&pass[gy+oy][gx+ox]){gx+=ox;gy+=oy;break}}const p=bfs(mx,my,gx,gy);m.path=p||[];if(m.st==='investigate'&&m.path.length===0&&p){m.st='patrol'}}}
  if(m.path&&m.path.length){const [nx,ny]=m.path[0];const tx=(nx+.5)*T,ty=(ny+.5)*T;const dx=tx-m.x,dy=ty-m.y,l=Math.hypot(dx,dy);if(l<4){m.path.shift();if(!m.path.length&&m.st==='investigate'){m.st='patrol';m.repath=0;m.goFar=Math.random()<.5}}else{const s=Math.min(l,sp*dt);m.x+=dx/l*s;m.y+=dy/l*s;m.face=Math.atan2(dy,dx);m.walk+=dt*sp/12}}
  if(m.st==='chase'&&(!m.path||!m.path.length)){const dx=P.x-m.x,dy=P.y-m.y,l=Math.hypot(dx,dy);if(l>1){m.x+=dx/l*sp*dt;m.y+=dy/l*sp*dt}}
  if(!P.hidden&&Math.hypot(P.x-m.x,P.y-m.y)<T*.62)caught(m)}

// ---------- 갱신
function update(dt){time+=dt;for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}updBanner(dt);
  if(paused||state!=='play'){for(const p of pops)p.life-=dt;return}
  run.time+=dt;P.inv=Math.max(0,P.inv-dt);radarT=Math.max(0,radarT-dt);radarCool=Math.max(0,radarCool-dt);warnT=Math.max(0,warnT-dt);shake=Math.max(0,shake-dt);
  const t=target();
  if(actQ){actQ=false;if(t&&!t.hold)doAct(t)}
  if(t&&t.hold&&actHeld){if(holdWhat!==(t.f||t.k)){holdWhat=t.f||t.k;holdT=0;if(t.k==='search')noise(P.x,P.y,2.5)}holdT+=dt;$('holdBar').hidden=false;$('holdBar').querySelector('i').style.width=Math.min(100,holdT/t.hold*100)+'%';setT($('holdTxt'),t.k==='pry'?'판자 떼는 중… '+Math.min(D.boards,Math.floor(holdT/D.pry))+'/'+D.boards:'뒤적뒤적…');if(t.k==='pry'&&Math.floor((holdT-dt)/D.pry)<Math.floor(holdT/D.pry))snd('crack');if(holdT>=t.hold){holdT=0;holdWhat=null;$('holdBar').hidden=true;actHeld=false;finishHold(t)}}
  else{if(holdT>0&&t&&t.k==='pry'){}else{holdT=0;holdWhat=null}$('holdBar').hidden=true}
  if(P.hidden){$('hideBar').hidden=false}
  else{let mx=0,my=0;if(keys.arrowleft||keys.a)mx--;if(keys.arrowright||keys.d)mx++;if(keys.arrowup||keys.w)my--;if(keys.arrowdown||keys.s)my++;if(joy){mx=joy.x;my=joy.y}const ml=Math.hypot(mx,my);
    P.running=(keys.shift||runToggle)&&ml>.15;
    if(ml>.15){const sp=(P.running?D.run:D.walk)*Math.min(1,ml);const vx=mx/Math.max(1,ml)*sp*dt,vy=my/Math.max(1,ml)*sp*dt;
      if(!blockedAt(P.x+vx,P.y))P.x+=vx;else if(Math.abs(vy)<1e-6){const c=(Math.floor(P.y/T)+.5)*T,o=c-P.y;if(!blockedAt(P.x+vx,c))P.y+=Math.sign(o)*Math.min(Math.abs(o),sp*dt)}
      if(!blockedAt(P.x,P.y+vy))P.y+=vy;else if(Math.abs(vx)<1e-6){const c=(Math.floor(P.x/T)+.5)*T;const ox=[c-P.x,c+T-P.x,c-T-P.x].find(o=>!blockedAt(P.x+o,P.y+vy*4)&&!blockedAt(P.x+o,P.y));if(ox!==undefined&&Math.abs(ox)<T*.8)P.x+=Math.sign(ox)*Math.min(Math.abs(ox),sp*dt)}
      P.face=Math.atan2(my,mx);P.walk+=dt*(P.running?16:10);if(P.running&&inMaze(P.y)){stepT-=dt;if(stepT<=0){stepT=.3;noise(P.x,P.y,L.hear)}}}}
  const r=roomOf(P.x,P.y);if(r&&!r.visited){r.visited=true;run.visited.push(r.id)}
  if(run.open&&P.y/T<3.2){win();return}
  for(const m of mons)updMon(m,dt);
  // 발소리
  let nd=1e9;for(const m of mons)nd=Math.min(nd,Math.hypot(m.x-P.x,m.y-P.y)/T);beat=inMaze(P.y)||P.y/T>10?clamp(1-(nd-2)/8,0,1):0;
  if(beat>0){stepT-=0;const iv=mons.some(m=>m.st==='chase')?.32:.6;if(!(time%iv<dt))0;if(Math.floor(time/iv)!==Math.floor((time-dt)/iv)){snd('thud');pops.push({x:0,y:0,t:'',life:0,step:1})}if(beat>.35)warnT<=0&&warn('👣 쿵… 쿵… 뿔뿔이가 가까워요!',.5);tip('steps','👣 쿵쿵 발소리! 뿔뿔이가 가까우면 옷장에 숨어요')}
  for(const p of parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=400*dt}parts=parts.filter(p=>p.life>0);for(const p of pops){p.life-=dt;p.y-=26*dt}pops=pops.filter(p=>p.life>0);
  autoT-=dt;if(autoT<=0){autoT=5;store()}
  setT($('warn'),warnT>0?warnTxt:'');ab.textContent=t?t.label:'행동';ab.classList.toggle('off',!t);$('radarBtn').hidden=!run.radar;$('radarBtn').classList.toggle('on',radarT>0);setT($('radarBtn'),radarCool>0&&radarT<=0?Math.ceil(radarCool):'📡');setT($('quest'),quest())}
let autoT=5;
function quest(){if(!run.pried)return '① 로비 아래쪽 판자를 떼요 (행동 꾹)';if(run.open)return '🛗 엘리베이터 안으로 들어가요!';if(run.carried.length)return '🔑 열쇠 '+run.carried.length+'개! 위층 자물쇠(왼쪽)에 꽂아요';
  const k=run.inserted.length;if(k<4)return '② 아래층 서랍장에서 색깔 열쇠 찾기 '+k+'/4'+(run.codeRead?'':' · 번호 쪽지도!');if(!run.codeOK)return run.codeRead?'③ 번호판(오른쪽)에 '+code.join('')+' 누르기':'③ 하얀 받침대 위 번호 쪽지를 찾아요';return ''}
function win(){state='won';const t=Math.round(run.time);const lv=run.lv;const pb=save.best[lv];if(!pb||t<pb)save.best[lv]=t;save.wins++;save.unlocked=Math.max(save.unlocked,Math.min(D.levels.length-1,lv+1));save.run=null;try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}Arcade.record&&Arcade.record('monoWins',save.wins);snd('win');
  for(let i=0;i<50;i++)parts.push({x:P.x,y:P.y,vx:rand(-220,220),vy:rand(-320,-60),life:1.6,c:D.keys[i%4].c});
  later(1.2,()=>panel('🎉 탈출 성공!',b=>{const p=document.createElement('p');p.textContent=L.name+'에서 '+Math.floor(t/60)+'분 '+(t%60)+'초 만에 탈출! 저택에 색이 모두 돌아왔어요.';b.appendChild(p);const q=document.createElement('p');q.className='small';q.textContent='사탕 '+run.items.candy+'개 · 탈출 '+save.wins+'번째'+(lv+1<D.levels.length?' · 「'+D.levels[lv+1].name+'」이 열렸어요!':'');b.appendChild(q)},
    [...(lv+1<D.levels.length?[[D.levels[lv+1].name+' 도전',()=>{closePanel();newRun(lv+1)}]]:[]),['다시 하기',()=>{closePanel();newRun(lv)},1],['처음 화면',()=>{closePanel();toTitle()},1]]))}

// ---------- 그리기
const PAL={wall:'#8a5a6a',wallTop:'#6a3a4a',floorA:'#c8a070',floorB:'#d4ac7a',lobA:'#a8c8e8',lobB:'#b4d2ee',rug:'#c84a6a',wood:'#8a5a3a',wood2:'#a8744a',stair:'#9a8a7a'};
function view(){return {x:P.x-Wd/2+(shake>0?rand(-6,6):0),y:P.y-Ht*.5}}
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#16161a';ctx.fillRect(0,0,W,H);if(!run||state==='title')return;
  const v=view(),X=x=>x-v.x,Y=y=>y-v.y;
  const x0=Math.max(0,Math.floor(v.x/T)),x1=Math.min(MW-1,Math.ceil((v.x+W)/T)),y0=Math.max(0,Math.floor(v.y/T)),y1=Math.min(MH-1,Math.ceil((v.y+H)/T));
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const g=G[ty][tx],px=X(tx*T),py=Y(ty*T);
    if(g===1){ctx.fillStyle=PAL.wall;ctx.fillRect(px,py,T+1,T+1);if(ty+1<MH&&G[ty+1][tx]!==1){ctx.fillStyle=PAL.wallTop;ctx.fillRect(px,py+T*.7,T+1,T*.3+1)}continue}
    const lobby=ty<=10;ctx.fillStyle=lobby?((tx+ty)%2?PAL.lobA:PAL.lobB):((tx+ty)%2?PAL.floorA:PAL.floorB);if(ty>10&&ty<=MT)ctx.fillStyle=(ty%2)?PAL.stair:'#aa9a8a';if(ty<=2)ctx.fillStyle='#d8d0c0';ctx.fillRect(px,py,T+1,T+1);
    if(g===2&&!run.pried){ctx.fillStyle=PAL.wood;ctx.fillRect(px,py,T+1,T+1);ctx.fillStyle=PAL.wood2;for(let i=0;i<3;i++)ctx.fillRect(px,py+4+i*14,T+1,9);if(tx===cx+1){ctx.fillStyle='#fff';ctx.font='11px Jua';ctx.textAlign='center';ctx.fillText('들어가지 마세요',px+T/2,py-4)}}
    if(g===5&&!run.open){ctx.fillStyle='#9aa0a8';ctx.fillRect(px,py,T+1,T+1);ctx.fillStyle='#7a8088';ctx.fillRect(px+T/2-1,py,2,T);if(tx===cx+1){ctx.fillStyle='#ffd23f';ctx.font='18px Jua';ctx.textAlign='center';ctx.fillText('🛗',px+T/2,py-6)}}}
  for(const r of rooms)if(r.rug&&X((r.x0+2)*T)<W&&X((r.x0+5)*T)>0){ctx.fillStyle=PAL.rug;ctx.globalAlpha=.5;ctx.beginPath();ctx.roundRect(X((r.x0+2)*T),Y((r.y0+1.5)*T),3*T,3*T,14);ctx.fill();ctx.globalAlpha=1}
  for(const f of furn)if(X(f.x*T)<W+T&&X((f.x+f.w)*T)>-T&&Y(f.y*T)<H+T&&Y((f.y+f.h)*T)>-T)drawFurn(f,X(f.x*T),Y(f.y*T),f.w*T,f.h*T);
  for(const m of mons)drawMon(m,X(m.x),Y(m.y));
  if(!P.hidden&&!(P.inv>0&&Math.floor(time*12)%2))drawMe(X(P.x),Y(P.y));
  for(const p of parts){ctx.fillStyle=p.c;ctx.fillRect(X(p.x)-3,Y(p.y)-3,6,6)}
  // 흑백: 열쇠를 꽂을수록 색이 돌아와요
  const s=sat();if(s<1){ctx.save();ctx.globalCompositeOperation='saturation';ctx.globalAlpha=1-s;ctx.fillStyle='#808080';ctx.fillRect(0,0,W,H);ctx.restore()}
  // 어둠 (아래층)
  const dk=P.y/T>MT+.5?.9:P.y/T>10.5?.55:0;
  if(dk>0){const k=.5;dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,dark.width,dark.height);dctx.fillStyle=`rgba(8,8,14,${dk})`;dctx.fillRect(0,0,dark.width,dark.height);dctx.globalCompositeOperation='destination-out';
    const lx=X(P.x)*k,ly=Y(P.y)*k,rr=(P.hidden?70:175)*k;let g=dctx.createRadialGradient(lx,ly,0,lx,ly,rr);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.7,'rgba(0,0,0,.85)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.beginPath();dctx.arc(lx,ly,rr,0,TAU);dctx.fill();
    if(!P.hidden){const a=P.face,cl=320*k;dctx.beginPath();dctx.moveTo(lx,ly);dctx.arc(lx,ly,cl,a-.42,a+.42);dctx.closePath();g=dctx.createRadialGradient(lx,ly,0,lx,ly,cl);g.addColorStop(0,'rgba(0,0,0,.9)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.fill()}
    ctx.drawImage(dark,0,0,W,H)}
  // 어둠 위: 빛나는 것들
  for(const m of mons){const d=Math.hypot(m.x-P.x,m.y-P.y);if(d<520){ctx.globalAlpha=clamp(1.3-d/520,0,1);ctx.fillStyle='#fff8c0';const ex=X(m.x),ey=Y(m.y)-42;ctx.beginPath();ctx.ellipse(ex-8,ey,5,m.st==='chase'?3:6,0,0,TAU);ctx.ellipse(ex+8,ey,5,m.st==='chase'?3:6,0,0,TAU);ctx.fill();ctx.globalAlpha=1}}
  for(const d of run.dropped){const k=KEY[d.id];ctx.fillStyle=k.c;ctx.globalAlpha=.4+.3*Math.sin(time*5);ctx.beginPath();ctx.arc(X(d.x),Y(d.y),16,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.font='20px Jua';ctx.textAlign='center';ctx.fillText('🔑',X(d.x),Y(d.y)+7)}
  // 자물쇠 불빛 (색깔)
  const lk=furn.find(f=>f.k==='lock');if(lk){D.keys.forEach((k,i)=>{ctx.fillStyle=run.inserted.includes(k.id)?k.c:'#555';ctx.beginPath();ctx.arc(X((lk.x+.5)*T)-15+i*10,Y(lk.y*T)-8,4,0,TAU);ctx.fill()})}
  if(P.hidden){ctx.fillStyle='#fff';ctx.font='15px Jua';ctx.textAlign='center';ctx.fillText('👀',X(P.x),Y(P.y)+5)}
  for(const p of pops){if(p.step)continue;ctx.globalAlpha=Math.min(1,p.life*2);ctx.font='18px Jua';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(20,20,30,.85)';ctx.strokeText(p.t,X(p.x),Y(p.y));ctx.fillStyle=p.c;ctx.fillText(p.t,X(p.x),Y(p.y))}ctx.globalAlpha=1;
  // 가까움 테두리
  if(beat>0){const pulse=.5+.5*Math.sin(time*(mons.some(m=>m.st==='chase')?18:9));const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(120,0,40,0)');g.addColorStop(1,`rgba(120,0,40,${beat*.55*(.6+.4*pulse)})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
  // 레이더 화살표
  if(radarT>0)for(const m of mons){const a=Math.atan2(m.y-P.y,m.x-P.x);ctx.save();ctx.translate(X(P.x)+Math.cos(a)*60,Y(P.y)+Math.sin(a)*60);ctx.rotate(a);ctx.fillStyle='#ff5a7a';ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.fill();ctx.restore()}
  if(run.carried.length&&inMaze(P.y)){const a=Math.atan2(7*T-P.y,(cx+1.5)*T-P.x);ctx.save();ctx.translate(X(P.x)+Math.cos(a)*48,Y(P.y)+Math.sin(a)*48);ctx.rotate(a);ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-5,-7);ctx.lineTo(-5,7);ctx.fill();ctx.restore()}
  drawMini(W,H)}
function drawMini(W,H){if(!run.pried)return;const s=Math.max(5,Math.min(9,Math.floor(150/Math.max(L.rw,L.rh)/1.4))),cw=s*1.4,ch=s,mw=L.rw*cw,mh=L.rh*ch+ch*.8,ox=W-mw-12,oy=62;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.roundRect(ox-6,oy-6,mw+12,mh+12,8);ctx.fill();
  const lx=ox+(Math.floor(L.rw/2))*cw;ctx.fillStyle='#b4d2ee';ctx.fillRect(lx+1,oy,cw-2,ch*.6);
  for(const r of rooms){const rx=ox+r.i*cw,ry=oy+ch*.8+r.j*ch;ctx.fillStyle=r.visited?'#d8c8a8':'#4a4a50';ctx.fillRect(rx+1,ry+1,cw-2,ch-2);
    const drs=furn.filter(f=>f.room===r.id&&f.k==='dresser');if(r.visited&&drs.length&&drs.every(f=>f.open)){ctx.fillStyle='#3a9a4a';ctx.font=(ch-2)+'px Jua';ctx.textAlign='center';ctx.fillText('✓',rx+cw/2,ry+ch-2)}
    if(run.codeRead&&furn.some(f=>f.k==='block'&&f.room===r.id)){ctx.fillStyle='#fff';ctx.fillRect(rx+2,ry+2,3,3)}}
  const mp=(x,y)=>[ox+(x/T-1)/8*cw,y/T<=MT?oy+ch*.3:oy+ch*.8+(y/T-MT-1)/7*ch];
  const [px,py]=mp(P.x,P.y);ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.arc(px,py,3,0,TAU);ctx.fill();
  if(radarT>0)for(const m of mons){const [a,b]=mp(m.x,m.y);ctx.fillStyle='#ff4a6a';ctx.beginPath();ctx.arc(a,b,3.5,0,TAU);ctx.fill()}
  for(const d of run.dropped){const [a,b]=mp(d.x,d.y);ctx.fillStyle=KEY[d.id].c;ctx.fillRect(a-2,b-2,4,4)}}
function drawFurn(f,x,y,w,h){ctx.save();
  if(f.k==='wardrobe'){ctx.fillStyle='#6a4a3a';ctx.fillRect(x+2,y-14,w-4,h+10);ctx.fillStyle='#8a5e44';ctx.fillRect(x+5,y-10,w/2-7,h+3);ctx.fillRect(x+w/2+2,y-10,w/2-7,h+3);ctx.fillStyle='#e8c87a';ctx.fillRect(x+w/2-6,y+h/2-8,3,8);ctx.fillRect(x+w/2+3,y+h/2-8,3,8);if(P.hidden===f){ctx.fillStyle='#fff';ctx.font='13px Jua';ctx.textAlign='center';ctx.fillText('👀',x+w/2,y+4)}}
  else if(f.k==='dresser'){ctx.fillStyle='#7a5a44';ctx.fillRect(x+3,y-6,w-6,h+2);for(let i=0;i<3;i++){ctx.fillStyle=f.open?'#3a2a20':'#a07a5a';ctx.fillRect(x+7,y-2+i*13,w-14,10);ctx.fillStyle='#e8c87a';ctx.fillRect(x+w/2-5,y+2+i*13,10,3)}if(f.open){ctx.fillStyle='#fff';ctx.font='12px Jua';ctx.textAlign='center';ctx.fillText('열림',x+w/2,y-10)}}
  else if(f.k==='block'){ctx.fillStyle='#eeeeee';ctx.fillRect(x+6,y+2,w-12,h-6);ctx.fillStyle='#ccc';ctx.fillRect(x+6,y+h-8,w-12,4);ctx.fillStyle='#fffbe8';ctx.save();ctx.translate(x+w/2,y+h/2-4);ctx.rotate(-.12);ctx.fillRect(-14,-9,28,18);ctx.fillStyle='#555';for(let i=0;i<3;i++)ctx.fillRect(-10,-5+i*5,20,2);ctx.restore();if(!run.codeRead&&Math.sin(time*4)>.3){ctx.fillStyle='#fff';ctx.fillRect(x+w-14,y,4,4)}}
  else if(f.k==='lock'){ctx.fillStyle='#5a5a66';ctx.beginPath();ctx.roundRect(x+6,y+4,w-12,h-10,6);ctx.fill();ctx.font='18px Jua';ctx.textAlign='center';ctx.fillText('🔒',x+w/2,y+h-12)}
  else if(f.k==='keypad'){ctx.fillStyle='#5a5a66';ctx.beginPath();ctx.roundRect(x+8,y+4,w-16,h-10,6);ctx.fill();ctx.fillStyle=run.codeOK?'#5ad86a':'#cfd6e0';for(let i=0;i<3;i++)for(let j=0;j<3;j++)ctx.fillRect(x+12+i*7,y+8+j*7,5,5)}
  else if(f.k==='plant'){ctx.fillStyle='#b86a4a';ctx.fillRect(x+12,y+22,w-24,h-24);ctx.fillStyle='#4aa85a';ctx.beginPath();ctx.arc(x+w/2,y+16,14,0,TAU);ctx.fill()}
  else if(f.k==='bench'){ctx.fillStyle='#9a6a44';ctx.fillRect(x+3,y+12,w-6,h-20);ctx.fillStyle='#7a4a2a';ctx.fillRect(x+6,y+h-10,5,8);ctx.fillRect(x+w-11,y+h-10,5,8)}
  ctx.restore()}
function drawMe(x,y){const w=Math.sin(P.walk)*3;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y+14,12,5,0,0,TAU);ctx.fill();ctx.fillStyle='#3a5aa0';ctx.fillRect(x-7,y+2+w*.4,5,11);ctx.fillRect(x+2,y+2-w*.4,5,11);ctx.fillStyle='#ff8a4a';ctx.beginPath();ctx.roundRect(x-10,y-9,20,16,6);ctx.fill();ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(x,y-18,11,0,TAU);ctx.fill();ctx.fillStyle='#3a2a2a';ctx.beginPath();ctx.arc(x,y-22,11,Math.PI,0);ctx.fill();
  const ex=Math.cos(P.face)*3,ey=Math.sin(P.face)*2;ctx.fillStyle='#2a2420';ctx.beginPath();ctx.arc(x-4+ex,y-17+ey,2,0,TAU);ctx.arc(x+4+ex,y-17+ey,2,0,TAU);ctx.fill();
  if(run.carried.length){run.carried.forEach((k,i)=>{ctx.fillStyle=KEY[k].c;ctx.beginPath();ctx.arc(x-8+i*6,y-36,4,0,TAU);ctx.fill()})}
  if(P.running){ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='12px Jua';ctx.textAlign='center';ctx.fillText('쿵쾅',x,y+28)}}
function drawMon(m,x,y){const b=Math.sin(m.walk)*3;ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,16,20,6,0,0,TAU);ctx.fill();
  ctx.fillStyle='#2a2a34';ctx.beginPath();ctx.moveTo(-18,14);ctx.quadraticCurveTo(-22,-40+b,0,-48+b);ctx.quadraticCurveTo(22,-40+b,18,14);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e8e0d0';ctx.beginPath();ctx.moveTo(-12,-40+b);ctx.quadraticCurveTo(-22,-58+b,-14,-66+b);ctx.quadraticCurveTo(-12,-54+b,-6,-46+b);ctx.fill();ctx.beginPath();ctx.moveTo(12,-40+b);ctx.quadraticCurveTo(22,-58+b,14,-66+b);ctx.quadraticCurveTo(12,-54+b,6,-46+b);ctx.fill();
  ctx.fillStyle='#ffb0c8';ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(-11,-30+b,4,0,TAU);ctx.arc(11,-30+b,4,0,TAU);ctx.fill();ctx.globalAlpha=1;
  if(m.st==='look'){ctx.fillStyle='#fff';ctx.font='14px Jua';ctx.textAlign='center';ctx.fillText('킁킁…',0,-74)}else if(m.st==='investigate'){ctx.fillStyle='#fff';ctx.font='16px Jua';ctx.textAlign='center';ctx.fillText('?',0,-74)}else if(m.st==='chase'){ctx.fillStyle='#ff6a8a';ctx.font='18px Jua';ctx.textAlign='center';ctx.fillText('!',0,-74)}
  ctx.restore()}

// ---------- 화면
function ui(){if(!run)return;setT($('hearts'),'♥'.repeat(Math.max(0,run.hp))+'♡'.repeat(Math.max(0,D.hp-run.hp)));const kb=$('keysBox');kb.innerHTML='';for(const k of D.keys){const s=document.createElement('span');s.textContent=run.inserted.includes(k.id)?'●':run.carried.includes(k.id)?'🔑':'○';s.style.color=k.c;kb.appendChild(s)}setT($('codeBox'),run.codeRead?'🔢 '+code.join(''):'')}
function toTitle(){state='title';paused=false;$('titleOv').hidden=false;$('hideBar').hidden=true;$('holdBar').hidden=true;setT($('quest'),'');setT($('warn'),'');const sb=$('startBtns');sb.innerHTML='';
  if(save.run){const b=document.createElement('button');b.className='btn';b.textContent='이어 하기 · '+D.levels[save.run.lv].name+' 열쇠 '+save.run.inserted.length+'/4';b.onclick=()=>{snd('click');run=save.run;begin(false)};sb.appendChild(b)}
  const wrap=document.createElement('div');wrap.className='lvl';D.levels.forEach((l,i)=>{const b=document.createElement('button');b.className='btn'+(save.run?' soft':'');b.disabled=i>save.unlocked;b.textContent=(i>save.unlocked?'🔒 ':'')+l.name+(save.best[i]?' · '+Math.floor(save.best[i]/60)+':'+String(save.best[i]%60).padStart(2,'0'):'');b.onclick=()=>{snd('click');newRun(i)};wrap.appendChild(b)});sb.appendChild(wrap);
  setT($('tRec'),save.wins?'탈출 '+save.wins+'번':'')}
$('menuBtn').onclick=()=>{snd('click');openMenu()};
addEventListener('pagehide',()=>{if(state==='play')store()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'){store();if(!paused)openMenu()}});
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw()}
toTitle();requestAnimationFrame(frame);
window.__me={newRun,P,get run(){return run},get mons(){return mons},get furn(){return furn},get rooms(){return rooms},solid,target,keys,act:()=>{actQ=true},hold:v=>{actHeld=v},get state(){return state},closePanel,get paused(){return paused},get code(){return code},get cx(){return cx},get MT(){return MT},openKeypad,checkOpen,toTitle,begin:()=>{},get G(){return G},useRadar};
});
