/* 유령 미로 — 씨앗을 모두 먹고 유령을 피하는 미로 게임. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='ghostMaze.save',SRC=D.map,MH=SRC.length,MW=SRC[0].length;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const save=Object.assign({best:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,T=24,OX=0,OY=0;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;T=Math.floor(Math.min((Wd-12)/MW,(Ht-80)/MH));OX=(Wd-T*MW)/2;OY=56+(Ht-70-T*MH)/2}addEventListener('resize',fit);fit();
let bigT=0;function big(t,s=1.4){const e=$('big');e.textContent=t;e.classList.add('on');bigT=s}
const DIRS={r:[1,0],l:[-1,0],d:[0,1],u:[0,-1]},OPP={r:'l',l:'r',u:'d',d:'u'};

// ---------- 상태
let map=[],dots=0,eaten=0,P=null,GH=[],level=1,score=0,lives=D.lives,state='title',paused=false,time=0,fright=0,combo=0,modeT=0,scatter=true,deathT=0,readyT=0,fruit=null,pops=[],start={x:9,y:16},house={x:9,y:10},door={x:9,y:9};
function loadMap(){map=SRC.map(r=>r.split(''));dots=0;for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];if(c==='.'||c==='o')dots++;if(c==='P'){start={x,y};map[y][x]=' '}if(c==='-')door={x,y}}eaten=0}
const cell=(x,y)=>{if(y<0||y>=MH)return 'x';x=((x%MW)+MW)%MW;return map[y][x]};
const walkP=(x,y)=>' .o'.includes(cell(x,y));
const walkG=(x,y,g)=>{const c=cell(x,y);if(' .o'.includes(c))return true;if(c==='G')return true;if(c==='-')return g.st==='leave'||g.st==='eaten';return false};
function resetActors(){P={x:start.x+.5,y:start.y+.5,dir:'l',next:'l',mouth:0,moving:true};
  GH=D.ghosts.map((g,i)=>({i,name:g.name,color:g.color,mode:g.mode,x:(i===0?door.x:door.x-1+((i-1)%3))+.5,y:(i===0?door.y-1:house.y)+.5,dir:i===0?'l':'u',st:i===0?'out':'house',wait:i*2.5,bob:i}));
  fright=0;combo=0;modeT=0;scatter=true;readyT=2;fruit=null}
function newGame(){score=0;lives=D.lives;level=1;loadMap();resetActors();state='play';paused=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;hud();big('준비!',1.8);snd('go')}
function hud(){setT($('hScore'),score);setT($('hLv'),level+'단계');setT($('hLife'),'💚'.repeat(Math.max(0,lives)))}
const gSpeed=()=>D.ghostSpeed[Math.min(level-1,D.ghostSpeed.length-1)],fTime=()=>D.frightTime[Math.min(level-1,D.frightTime.length-1)];

// ---------- 칸 따라 움직이기
function stepActor(a,sp,dt,canWalk,choose){let rem=sp*dt;let guard=0;
  while(rem>0&&guard++<4){const cx=Math.floor(a.x),cy=Math.floor(a.y),ccx=cx+.5,ccy=cy+.5;const [dx,dy]=DIRS[a.dir];
    let toC=(ccx-a.x)*dx+(ccy-a.y)*dy;// 다음 가운데까지 남은 거리
    let tx=cx,ty=cy;if(toC<-1e-6){toC+=1;tx=cx+dx;ty=cy+dy}
    if(toC>1e-6){const m=Math.min(rem,toC);a.x+=dx*m;a.y+=dy*m;rem-=m;if(m<toC-1e-9)break}
    // 가운데 도착: 방향 고르기
    tx=((tx%MW)+MW)%MW;a.x=tx+.5;a.y=ty+.5;choose(a,tx,ty);const [ex,ey]=DIRS[a.dir];if(!canWalk(tx+ex,ty+ey,a)){a.stopped=true;break}a.stopped=false;
    const m=Math.min(rem,.5);a.x+=ex*m;a.y+=ey*m;rem-=m;
    if(a.x<0)a.x+=MW;if(a.x>=MW)a.x-=MW}
  if(a.x<0)a.x+=MW;if(a.x>=MW)a.x-=MW}
function playerChoose(a,cx,cy){const [nx,ny]=DIRS[a.next];if(walkP(cx+nx,cy+ny))a.dir=a.next}
function ghostTarget(g){const px=Math.floor(P.x),py=Math.floor(P.y),[dx,dy]=DIRS[P.dir];
  if(g.st==='eaten')return [door.x,door.y];
  if(scatter&&g.mode!=='shy'||g.mode==='shy'&&Math.hypot(g.x-P.x,g.y-P.y)<7)return [[MW-2,-2],[1,-2],[MW-1,MH+1],[0,MH+1]][g.i];
  if(g.mode==='chase'||g.mode==='shy')return [px,py];
  if(g.mode==='ambush')return [px+dx*4,py+dy*4];
  const r=GH[0];const ax=px+dx*2,ay=py+dy*2;return [ax*2-Math.floor(r.x),ay*2-Math.floor(r.y)]}
function ghostChoose(g,cx,cy){if(g.st==='leave'){if(cx===door.x&&cy<=door.y-1){g.st='out';g.dir='l';return}g.dir=cx<door.x?'r':cx>door.x?'l':'u';return}
  if(g.st==='eaten'&&cx===door.x&&cy===door.y-1){g.dir='d';return}
  if(g.st==='eaten'&&cell(cx,cy)==='G'||g.st==='eaten'&&cx===door.x&&cy===door.y){if(cell(cx,cy)==='G'){g.st='leave';g.dir='u';return}g.dir='d';return}
  const opts=[];for(const k of ['u','l','d','r']){if(k===OPP[g.dir])continue;const [dx,dy]=DIRS[k];const nx=cx+dx,ny=cy+dy;if(!walkG(nx,ny,g))continue;if(cell(nx,ny)==='-'&&g.st!=='eaten')continue;if(cell(nx,ny)==='G'&&g.st!=='eaten')continue;opts.push(k)}
  if(!opts.length){g.dir=OPP[g.dir];return}
  if(g.st==='fright'){g.dir=opts[Math.floor(Math.random()*opts.length)];return}
  const [tx,ty]=ghostTarget(g);let best=opts[0],bd=1e9;for(const k of opts){const [dx,dy]=DIRS[k];const d=(cx+dx-tx)**2+(cy+dy-ty)**2;if(d<bd){bd=d;best=k}}g.dir=best}

// ---------- 갱신
function update(dt){time+=dt;for(const p of pops)p.t+=dt;pops=pops.filter(p=>p.t<1);
  if(state==='dying'){deathT+=dt;if(deathT>1.8){if(lives<=0){gameOver();return}resetActors();state='play';big('준비!',1.6)}return}
  if(state==='clear'){deathT+=dt;if(deathT>2){level++;loadMap();resetActors();state='play';hud();big(level+'단계!',1.6);snd('go')}return}
  if(state!=='play')return;
  if(readyT>0){readyT-=dt;return}
  // 모드 바꾸기
  if(fright>0){fright-=dt;if(fright<=0){for(const g of GH)if(g.st==='fright')g.st='out';combo=0}}
  else{modeT+=dt;const lim=scatter?7:20;if(modeT>lim){modeT=0;scatter=!scatter;for(const g of GH)if(g.st==='out')g.dir=OPP[g.dir]}}
  // 냠냠이
  stepActor(P,D.speed*(fright>0?1.08:1),dt,(x,y)=>walkP(x,y),playerChoose);P.mouth+=dt*(P.stopped?0:14);
  const cx=Math.floor(P.x),cy=Math.floor(P.y),c=cell(cx,cy);
  if(c==='.'){map[cy][cx]=' ';score+=10;eaten++;if(eaten%2)snd('tick');afterEat()}
  else if(c==='o'){map[cy][cx]=' ';score+=50;eaten++;fright=fTime();combo=0;for(const g of GH)if(g.st==='out'||g.st==='fright'){g.st='fright';g.dir=OPP[g.dir]}snd('power');afterEat()}
  if(fruit){fruit.t-=dt;if(fruit.t<=0)fruit=null;else if(cx===fruit.x&&cy===fruit.y){const v=100*Math.min(level,6)*2;score+=v;pops.push({x:fruit.x,y:fruit.y,txt:'+'+v,t:0});fruit=null;snd('level');hud()}}
  // 유령
  for(const g of GH){g.bob+=dt*8;
    if(g.st==='house'){g.wait-=dt;g.y=house.y+.5+Math.sin(time*5+g.i)*.2;if(g.wait<=0){g.st='leave';g.y=house.y+.5;g.x=Math.floor(g.x)+.5}continue}
    const sp=g.st==='eaten'?11:g.st==='fright'?gSpeed()*.55:(cell(Math.floor(g.x),Math.floor(g.y))===' '&&Math.floor(g.y)===10&&(g.x<4||g.x>MW-4))?gSpeed()*.55:g.st==='leave'?3:gSpeed();
    stepActor(g,sp,dt,(x,y,a)=>walkG(x,y,a),ghostChoose);
    if(g.st==='eaten'&&cell(Math.floor(g.x),Math.floor(g.y))==='G'){g.st='leave'}
    if(Math.abs(g.x-P.x)<.6&&Math.abs(g.y-P.y)<.6){if(g.st==='fright'){g.st='eaten';combo++;const v=200*2**(combo-1);score+=v;pops.push({x:g.x,y:g.y,txt:'+'+v,t:0});snd('combo');hud()}
      else if(g.st==='out'||g.st==='leave'&&false){die();return}}}}
function afterEat(){hud();if(eaten===70||eaten===140)fruit={x:start.x,y:start.y,t:9,e:D.fruits[Math.min(level-1,D.fruits.length-1)]};if(eaten>=dots){state='clear';deathT=0;big('미로 클리어!',1.8);snd('win')}}
function die(){state='dying';deathT=0;lives--;hud();snd('lose')}
function gameOver(){state='over';const nb=score>save.best;if(nb){save.best=score;store()}Arcade.record&&Arcade.record('ghostMazeBest',save.best);
  $('oTitle').textContent=nb?'🎉 새 기록!':'잡혔어요!';$('oTxt').innerHTML=level+'단계까지 · 점수 <b>'+score+'</b> · 최고 '+save.best;$('overOv').hidden=false}

// ---------- 입력
function want(d){if(P)P.next=d;if(P&&OPP[P.dir]===d)P.dir=d}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();const m={arrowleft:'l',a:'l',arrowright:'r',d:'r',arrowup:'u',w:'u',arrowdown:'d',s:'d'}[k];if(m&&state==='play'){want(m);e.preventDefault()}if(k==='p'||k==='escape')togglePause()});
let sw=null;cv.addEventListener('pointerdown',e=>{sw={x:e.clientX,y:e.clientY,id:e.pointerId}});
addEventListener('pointermove',e=>{if(!sw||e.pointerId!==sw.id)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.hypot(dx,dy)>22){want(Math.abs(dx)>Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u'));sw.x=e.clientX;sw.y=e.clientY}});
addEventListener('pointerup',()=>sw=null);

// ---------- 그리기
function draw(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#12122a';ctx.fillRect(0,0,W,H);if(!map.length)return;
  const X=x=>OX+x*T,Y=y=>OY+y*T;const wall=(x,y)=>{const c=cell(x,y);return c==='#'};
  const flashW=state==='clear'&&Math.floor(deathT*6)%2;
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];
    if(c==='#'){ctx.fillStyle=flashW?'#fff':'#3a2a7a';ctx.fillRect(X(x),Y(y),T+.5,T+.5);ctx.strokeStyle=flashW?'#fff':'#a07aff';ctx.lineWidth=Math.max(1.5,T*.1);ctx.beginPath();
      if(!wall(x,y-1)&&y>0){ctx.moveTo(X(x),Y(y)+1);ctx.lineTo(X(x+1),Y(y)+1)}if(!wall(x,y+1)&&y<MH-1){ctx.moveTo(X(x),Y(y+1)-1);ctx.lineTo(X(x+1),Y(y+1)-1)}
      if(!wall(x-1,y)&&x>0){ctx.moveTo(X(x)+1,Y(y));ctx.lineTo(X(x)+1,Y(y+1))}if(!wall(x+1,y)&&x<MW-1){ctx.moveTo(X(x+1)-1,Y(y));ctx.lineTo(X(x+1)-1,Y(y+1))}ctx.stroke()}
    else if(c==='-'){ctx.fillStyle='#ff9ae0';ctx.fillRect(X(x),Y(y)+T*.4,T,T*.2)}
    else if(c==='.'){ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(X(x+.5),Y(y+.5),T*.11,0,7);ctx.fill()}
    else if(c==='o'){if(Math.floor(time*4)%2||state!=='play'){ctx.fillStyle='#ff8ad8';ctx.beginPath();ctx.arc(X(x+.5),Y(y+.5),T*.3,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(X(x+.42),Y(y+.42),T*.08,0,7);ctx.fill()}}}
  if(fruit){ctx.font=(T*.9)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(fruit.e,X(fruit.x+.5),Y(fruit.y+.55));ctx.textBaseline='alphabetic'}
  // 냠냠이
  if(P&&!(state==='dying'&&deathT>1.2)){const s=state==='dying'?Math.max(0,1-deathT/1.2):1;const px=X(P.x),py=Y(P.y);ctx.save();ctx.translate(px,py);ctx.scale(s,s);if(state==='dying')ctx.rotate(deathT*10);
    const r=T*.46;ctx.fillStyle='#7ae0a0';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.fillStyle='#5ac080';ctx.beginPath();ctx.ellipse(0,r*.55,r*.7,r*.3,0,0,Math.PI);ctx.fill();
    const [dx,dy]=DIRS[P.dir];const ex=dx*r*.25,ey=dy*r*.2;ctx.fillStyle='#fff';for(const k of [-1,1]){ctx.beginPath();ctx.arc(k*r*.32+ex,-r*.25+ey,r*.24,0,7);ctx.fill()}ctx.fillStyle='#1a1a2a';for(const k of [-1,1]){ctx.beginPath();ctx.arc(k*r*.32+ex*1.4,-r*.22+ey*1.4,r*.12,0,7);ctx.fill()}
    const open=Math.abs(Math.sin(P.mouth));ctx.fillStyle='#a02a4a';ctx.beginPath();ctx.ellipse(ex*1.2,r*.32+ey,r*.28,r*(.06+open*.22),0,0,7);ctx.fill();
    ctx.fillStyle='#4ac46a';ctx.beginPath();ctx.ellipse(r*.1,-r*1.0,r*.22,r*.1,-.5,0,7);ctx.fill();ctx.restore()}
  // 유령
  if(state!=='dying'||deathT<.4)for(const g of GH){const gx=X(g.x),gy=Y(g.y),r=T*.46;ctx.save();ctx.translate(gx,gy);
    const fr=g.st==='fright',blink=fr&&fright<2&&Math.floor(time*6)%2;
    if(g.st!=='eaten'){ctx.fillStyle=fr?(blink?'#fff':'#4a5aff'):g.color;ctx.beginPath();ctx.arc(0,-r*.1,r,Math.PI,0);ctx.lineTo(r,r*.8);for(let i=0;i<4;i++){const x0=r-(i+.5)*r/2;ctx.quadraticCurveTo(x0,r*(.5+.4*Math.sin(g.bob+i)),x0-r/4,r*.8)}ctx.lineTo(-r,r*.8);ctx.closePath();ctx.fill()}
    const [dx,dy]=DIRS[g.dir];if(fr){ctx.fillStyle=blink?'#ff4a5a':'#fff';for(const k of [-1,1]){ctx.beginPath();ctx.arc(k*r*.32,-r*.15,r*.12,0,7);ctx.fill()}ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=4;i++)ctx.lineTo(-r*.5+i*r*.25,r*.3+(i%2?-1:1)*r*.08);ctx.stroke()}
    else{ctx.fillStyle='#fff';for(const k of [-1,1]){ctx.beginPath();ctx.ellipse(k*r*.35,-r*.15,r*.24,r*.3,0,0,7);ctx.fill()}ctx.fillStyle='#2a2a6a';for(const k of [-1,1]){ctx.beginPath();ctx.arc(k*r*.35+dx*r*.12,-r*.15+dy*r*.14,r*.13,0,7);ctx.fill()}
      if(g.st!=='eaten'){ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.ellipse(-r*.45,-r*.65,r*.18,r*.1,-.5,0,7);ctx.fill()}}
    ctx.restore()}
  for(const p of pops){ctx.globalAlpha=1-p.t;ctx.fillStyle='#4ae0ff';ctx.font='bold '+(T*.7)+'px Jua';ctx.textAlign='center';ctx.fillText(p.txt,X(p.x),Y(p.y)-p.t*20)}ctx.globalAlpha=1;
  if(state==='play'&&readyT>0){ctx.fillStyle='#ffd23f';ctx.font=(T*.9)+'px Jua';ctx.textAlign='center';ctx.fillText('준비!',X(MW/2),Y(12.8))}}

// ---------- 화면
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
function showTitle(){state='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;setT($('tRec'),save.best?'최고 점수 '+save.best:'');loadMap();resetActors()}
$('startBtn').onclick=()=>{snd('click');newGame()};$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{paused=false;showTitle()};
$('againBtn').onclick=()=>{snd('click');newGame()};$('oMenu').onclick=()=>{snd('click');showTitle()};
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}if(!paused)update(dt);draw();requestAnimationFrame(frame)}
showTitle();requestAnimationFrame(frame);
window.__gm={newGame,want,get P(){return P},get GH(){return GH},get state(){return state},get score(){return score},get level(){return level},get eaten(){return eaten},get dots(){return dots},cell,get lives(){return lives}};
});
