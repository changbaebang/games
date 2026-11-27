/* 파티 보드게임 — 주사위로 보드를 돌며 코인·별 모으기 + 라운드마다 미니게임. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='partyBoard.save';
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rand(a,b+1)),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>v<a?a:v>b?b:v;
const save=Object.assign({wins:0,rounds:D.rounds},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();
let bigT=0;function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1.5}
function hint(t){setT($('hint'),t)}

// ---------- 보드 (11x7 둘레 32칸)
const TYPES=D.board.split(''),N=TYPES.length;const cells=[];
const BWD=D.boardW,BHT=D.boardH;{const W=BWD,H=BHT;for(let x=0;x<W;x++)cells.push([x,0]);for(let y=1;y<H-1;y++)cells.push([W-1,y]);for(let x=W-1;x>=0;x--)cells.push([x,H-1]);for(let y=H-2;y>=1;y--)cells.push([0,y])}
// ---------- 상태
let PL=[],round=1,cur=0,phase='title',paused=false,time=0,star=5,dice={v:1,t:0,stop:false},steps=0,stepT=0,timers=[],mg=null,ROUNDS=save.rounds;
function wait(s,fn){timers.push({t:s,fn})}
function runTimers(dt){for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}}
function sideUI(){const el=$('side');el.innerHTML='';PL.forEach((p,i)=>{const d=document.createElement('div');d.className='p'+(i===cur&&phase!=='mini'?' on':'');const c=document.createElement('i');c.style.background=p.color;const n=document.createElement('b');n.textContent=p.name;const s=document.createElement('span');s.textContent='⭐'+p.stars+' 🪙'+p.coins;d.appendChild(c);d.appendChild(n);d.appendChild(s);el.appendChild(d)});
  setT($('round'),round+' / '+ROUNDS+' 라운드')}
function start(){PL=D.players.map((p,i)=>({i,name:p.name,color:p.color,coins:D.startCoins,stars:0,pos:0,bot:i>0,hop:0}));round=1;cur=0;timers=[];star=newStarPos();phase='board';
  for(const id of ['titleOv','overOv','pauseOv','askOv'])$(id).hidden=true;paused=false;sideUI();snd('go');big('파티 시작!');wait(1.2,beginTurn)}
function newStarPos(){let p;do{p=ri(3,N-1)}while(p===star||PL.some(q=>q.pos===p));return p}
function beginTurn(){const p=PL[cur];phase='roll';dice={v:ri(1,D.dice),t:0,stop:false,stopT:rand(.7,1.3)};sideUI();
  hint(p.bot?p.name+'의 차례':'탭해서 주사위 멈추기!');snd('tick')}
function stopDice(){if(phase!=='roll'||dice.stop)return;dice.stop=true;snd('pop');steps=dice.v;wait(.6,()=>{phase='move';stepT=0})}
function moveStep(){const p=PL[cur];p.pos=(p.pos+1)%N;p.hop=1;steps--;snd('bounce');
  if(p.pos===star){if(tryStar(p,()=>{if(steps>0)phase='move';else land()}))return}
  if(steps<=0)land()}
function tryStar(p,after){if(p.coins<D.starCost){if(!p.bot)toastBig('코인이 '+D.starCost+'개 있어야 별을 사요');phase='wait';wait(.8,after);return true}
  phase='wait';if(p.bot){wait(.4,()=>{buyStar(p);wait(1.2,after)})}else{$('askP').textContent='코인 '+D.starCost+'개로 별 1개! (가진 코인 '+p.coins+')';$('askOv').hidden=false;askAfter=after}return true}
let askAfter=null;
$('askYes').onclick=()=>{$('askOv').hidden=true;buyStar(PL[cur]);wait(1.2,askAfter)};$('askNo').onclick=()=>{$('askOv').hidden=true;snd('click');wait(.2,askAfter)};
function buyStar(p){p.coins-=D.starCost;p.stars++;snd('win');big(p.name+' ⭐ 별 획득!');star=newStarPos();sideUI()}
function toastBig(t){big(t)}
function coin(p,v){const before=p.coins;p.coins=Math.max(0,p.coins+v);sideUI();return p.coins-before}
function land(){const p=PL[cur],t=TYPES[p.pos];phase='land';
  if(t==='B'){coin(p,D.blue);snd('coin');big('+'+D.blue+' 코인')}
  else if(t==='R'){const d=coin(p,-D.red);snd('bad');big((d||0)+' 코인')}
  else if(t==='?'){const e=pick(D.events);snd('alert');big(e.msg);
    if(e.t==='coin')coin(p,e.v);
    else if(e.t==='steal'){for(const q of PL)if(q!==p){const g=Math.min(q.coins,e.v);q.coins-=g;p.coins+=g}sideUI()}
    else if(e.t==='give'){for(const q of PL)if(q!==p){const g=Math.min(p.coins,e.v);p.coins-=g;q.coins+=g}sideUI()}
    else if(e.t==='warp'){wait(.8,()=>{p.pos=ri(1,N-1);p.hop=1;snd('whoosh')})}
    else if(e.t==='star'){wait(.9,()=>{p.pos=star;p.hop=1;tryStar(p,endTurn)});return}}
  wait(1.3,endTurn)}
function endTurn(){cur++;if(cur<PL.length){beginTurn();return}cur=0;startMini()}

// ---------- 미니게임
let miniIdx=-1;
function startMini(){miniIdx=(miniIdx+1+ri(0,2))%D.minigames.length;const M=D.minigames[miniIdx];phase='miniIntro';hint('');sideUI();
  mg={id:M.id,name:M.name,how:M.how,t:0,done:false,ps:PL.map(p=>({p,x:.2+p.i*.2,v:0,prog:0,fin:null,stopV:null,alive:true,out:null,got:0,rate:rand(5.6,8.4),react:rand(.15,.4),aim:.5,think:0})),rocks:[],coins:[],spawn:0,needle:0};snd('alert')}
function miniBegin(){phase='mini';mg.t=0;snd('go');hint(mg.how)}
function miniInput(kind,x){if(phase==='miniIntro'&&kind==='tap'){if(mg.t>1)miniBegin();return}
  if(phase!=='mini')return;const me=mg.ps[0];
  if(mg.id==='mash'&&kind==='tap'&&me.fin===null){me.prog+=1/38;snd('tick')}
  if(mg.id==='stop'&&kind==='tap'&&me.stopV===null){me.stopV=mg.needle;snd('pop')}
  if((mg.id==='dodge'||mg.id==='catch')&&x!=null)me.aim=clamp(x,.04,.96)}
function miniUpdate(dt){mg.t+=dt;const ps=mg.ps,me=ps[0];
  if(mg.id==='mash'){for(const s of ps){if(s.fin!==null)continue;if(s.p.bot)s.prog+=s.rate*dt/38*rand(.6,1.4);if(s.prog>=1){s.prog=1;s.fin=mg.t;snd(s===me?'win':'coin')}}
    if(ps.every(s=>s.fin!==null)||mg.t>14)miniEnd(ps.map(s=>s.fin===null?99-s.prog:s.fin),true)}
  else if(mg.id==='stop'){mg.needle=.5+.5*Math.sin(mg.t*3.4+Math.sin(mg.t*1.3));for(const s of ps)if(s.p.bot&&s.stopV===null&&mg.t>s.react*8+1.2&&Math.abs(mg.needle-.5)<rand(.02,.25))s.stopV=mg.needle;
    if(ps.every(s=>s.stopV!==null)||mg.t>7)wait0(()=>miniEnd(ps.map(s=>s.stopV===null?9:Math.abs(s.stopV-.5)),true))}
  else{// dodge / catch: 좌우 이동
    const dur=mg.id==='dodge'?16:12;
    mg.spawn-=dt;if(mg.spawn<=0){if(mg.id==='dodge'){mg.spawn=Math.max(.22,.7-mg.t*.03);mg.rocks.push({x:rand(.05,.95),y:-.05,v:rand(.45,.7)+mg.t*.02,r:rand(.035,.06)})}else{mg.spawn=rand(.25,.45);mg.coins.push({x:rand(.05,.95),y:-.05,v:rand(.35,.55),gold:Math.random()<.15})}}
    for(const s of ps){if(!s.alive)continue;
      if(s.p.bot){s.think-=dt;if(s.think<=0){s.think=s.react;
          if(mg.id==='dodge'){let threat=null,best=1e9;for(const r of mg.rocks){const tt=(.9-r.y)/r.v;if(tt>0&&tt<1.1&&Math.abs(r.x-s.x)<r.r+.08){if(tt<best){best=tt;threat=r}}}if(threat)s.aim=clamp(s.x+(s.x<threat.x?-1:1)*rand(.12,.22),.04,.96);else if(Math.random()<.2)s.aim=rand(.1,.9)}
          else{let tg=null,bd=1e9;for(const c of mg.coins){const tt=(.9-c.y)/c.v;const need=Math.abs(c.x-s.x)/.55;if(tt>need*.9&&tt<bd+(c.gold?.4:0)){bd=tt;tg=c}}if(tg)s.aim=tg.x+rand(-.03,.03)}}}
      const sp=s.p.bot?.55:1.3;const d=s.aim-s.x;s.x+=clamp(d,-sp*dt,sp*dt)}
    for(const r of mg.rocks){r.y+=r.v*dt;for(const s of ps)if(s.alive&&Math.abs(r.x-s.x)<r.r+.03&&Math.abs(r.y-.9)<r.r+.03){s.alive=false;s.out=mg.t;snd(s===me?'hurt':'thud')}}
    mg.rocks=mg.rocks.filter(r=>r.y<1.1);
    for(const c of mg.coins){c.y+=c.v*dt;if(c.taken)continue;for(const s of ps)if(Math.abs(c.x-s.x)<.06&&Math.abs(c.y-.88)<.04){c.taken=true;s.got+=c.gold?3:1;if(s===me)snd('coin');break}}
    mg.coins=mg.coins.filter(c=>c.y<1.1&&!c.taken);
    const alive=ps.filter(s=>s.alive).length;
    if(mg.t>dur||(mg.id==='dodge'&&alive<=1))miniEnd(ps.map(s=>mg.id==='dodge'?-(s.alive?99:s.out):-s.got),true)}}
let endQ=false;function wait0(fn){if(!endQ){endQ=true;wait(.6,()=>{endQ=false;fn()})}}
function miniEnd(scores,lowWins){if(mg.done)return;mg.done=true;phase='miniEnd';hint('');
  const order=mg.ps.map((s,i)=>({i,v:scores[i]})).sort((a,b)=>a.v-b.v);let rank=0;mg.rank=[];order.forEach((o,k)=>{if(k>0&&o.v!==order[k-1].v)rank=k;mg.rank[o.i]=rank});
  mg.ps.forEach((s,i)=>{s.prize=D.prize[mg.rank[i]];coin(s.p,s.prize)});snd(mg.rank[0]===0?'win':'coin');
  wait(2.8,()=>{mg=null;round++;if(round>ROUNDS){gameOver();return}phase='board';big(round===ROUNDS?'마지막 라운드!':round+' 라운드');sideUI();wait(1.2,beginTurn)})}
function gameOver(){phase='over';const order=PL.slice().sort((a,b)=>b.stars-a.stars||b.coins-a.coins);const win=order[0]===PL[0];
  if(win){save.wins++;store();Arcade.record&&Arcade.record('partyBoardWins',save.wins)}
  $('oTitle').textContent=win?'🏆 우승!':order[0].name+' 우승!';const r=$('oRank');r.innerHTML='';
  order.forEach((p,k)=>{const d=document.createElement('div');d.className='r';const c=document.createElement('i');c.style.background=p.color;const t=document.createElement('span');t.textContent=(k+1)+'등 '+p.name+' · ⭐'+p.stars+' 🪙'+p.coins;d.appendChild(c);d.appendChild(t);r.appendChild(d)});
  $('overOv').hidden=false;hint('');snd(win?'goal':'lose')}

// ---------- 입력
function armX(e){return (e.clientX-arena.x)/arena.w}
let drag=false;
cv.addEventListener('pointerdown',e=>{if(paused)return;if(phase==='roll'&&!PL[cur].bot){stopDice();return}if(phase==='miniIntro'||phase==='mini'){drag=true;miniInput('tap',armX(e))}});
addEventListener('pointermove',e=>{if(drag&&phase==='mini')miniInput('move',armX(e))});addEventListener('pointerup',()=>drag=false);
const keys={};addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(k==='p'||k==='escape')togglePause();if(paused)return;if(k===' '||k==='enter'){if(phase==='roll'&&!PL[cur].bot)stopDice();else if(phase==='miniIntro'||phase==='mini')miniInput('tap')}});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});

// ---------- 그리기
let arena={x:0,y:0,w:1,h:1};
function face(x,y,r,col,hop){ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(x,y+r*.9,r*.8,r*.25,0,0,7);ctx.fill();y-=hop;
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';for(const k of [-1,1]){ctx.beginPath();ctx.arc(x+k*r*.33,y-r*.12,r*.22,0,7);ctx.fill()}ctx.fillStyle='#2a2420';for(const k of [-1,1]){ctx.beginPath();ctx.arc(x+k*r*.33,y-r*.08,r*.11,0,7);ctx.fill()}
  ctx.strokeStyle='#2a2420';ctx.lineWidth=Math.max(1.5,r*.08);ctx.beginPath();ctx.arc(x,y+r*.2,r*.25,.2,Math.PI-.2);ctx.stroke()}
function starShape(x,y,r,col){ctx.fillStyle=col;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
function drawBoard(){const W=Wd,H=Ht,port=H>W;const gw=port?BHT:BWD,gh=port?BWD:BHT;const top=port?130:Math.max(70,($('side').offsetHeight||40)+30);const C=Math.min((W-20)/(gw+.6),(H-top-60)/(gh+.6));const ox=(W-C*gw)/2,oy=top+(H-top-60-C*gh)/2;
  const pos=i=>{const [x,y]=cells[i];const gx=port?(BHT-1-y):x,gy=port?x:y;return [ox+(gx+.5)*C,oy+(gy+.5)*C]};
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8ad0ff');g.addColorStop(1,'#d8f0ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<5;i++){ctx.fillStyle='rgba(255,255,255,.7)';const cx=(i*237+time*12)%(W+200)-100,cy=60+i*97%(H*.8);ctx.beginPath();ctx.ellipse(cx,cy,60,18,0,0,7);ctx.fill()}
  ctx.fillStyle='#7ac46a';ctx.beginPath();ctx.roundRect(ox-C*.3,oy-C*.3,C*(gw+.6),C*(gh+.6),C*.8);ctx.fill();ctx.fillStyle='#5aa84a';ctx.beginPath();ctx.roundRect(ox-C*.3,oy+C*(gh+.1),C*(gw+.6),C*.4,C*.3);ctx.fill();
  // 가운데 마당
  ctx.fillStyle='#9ad87a';ctx.beginPath();ctx.roundRect(ox+C*1.2,oy+C*1.2,C*(gw-2.4),C*(gh-2.4),C*.5);ctx.fill();
  // 길 잇기
  ctx.strokeStyle='#e8d8a8';ctx.lineWidth=C*.35;ctx.beginPath();for(let i=0;i<=N;i++){const [x,y]=pos(i%N);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
  for(let i=0;i<N;i++){const [x,y]=pos(i),t=TYPES[i];const col=t==='B'?'#3a8ae0':t==='R'?'#e04a4a':t==='?'?'#4ac45a':'#ffc23a';ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y+C*.08,C*.38,C*.32,0,0,7);ctx.fill();
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,C*.38,C*.32,0,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.font=(C*.3)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(t==='B'?'+':t==='R'?'−':t==='?'?'?':'출발',x,y+1)}
  {const [x,y]=pos(star);const b=Math.sin(time*4)*C*.06;starShape(x,y-C*.55+b,C*.36,'#ffd23f');ctx.strokeStyle='#e0a020';ctx.lineWidth=2;ctx.stroke()}
  // 말
  const at={};PL.forEach(p=>{(at[p.pos]=at[p.pos]||[]).push(p)});
  PL.forEach(p=>{const [x,y]=pos(p.pos);const grp=at[p.pos],k=grp.indexOf(p),n=grp.length;const dx=n>1?(k-(n-1)/2)*C*.3:0;p.hop=Math.max(0,p.hop-.06);const hop=Math.sin(p.hop*Math.PI)*C*.3+(PL[cur]===p&&phase==='roll'?Math.abs(Math.sin(time*6))*C*.08:0);face(x+dx,y-C*.1,C*.24,p.color,hop)});
  // 가운데: 주사위
  const cx=ox+C*gw/2,cy=oy+C*gh/2;
  if(phase==='roll'||(phase==='move'||phase==='wait')&&steps>0){const s=C*1.3;const p=PL[cur];ctx.fillStyle='#fff';ctx.strokeStyle=p.color;ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(cx-s/2,cy-s/2,s,s,s*.18);ctx.fill();ctx.stroke();
    const v=phase==='roll'?dice.v:steps;ctx.fillStyle='#2a2a3a';ctx.font=(s*.62)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v,cx,cy+2);
    ctx.fillStyle=p.color;ctx.font=(C*.36)+'px Jua';ctx.fillText(p.name+(phase==='roll'?(p.bot?' 굴리는 중…':' · 탭!'):' · '+steps+'칸'),cx,cy+s*.75)}
  else{ctx.fillStyle='rgba(255,255,255,.75)';ctx.font=(C*.45)+'px Jua';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⭐ 별 '+D.starCost+'코인',cx,cy)}
  ctx.textBaseline='alphabetic'}
function drawMini(){const W=Wd,H=Ht;const top=Math.min(160,H*.2);arena={x:Math.max(10,(W-Math.min(W-20,700))/2),y:top,w:Math.min(W-20,700),h:H-top-60};const A=arena;
  ctx.fillStyle='#ffe8b0';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff6dc';ctx.beginPath();ctx.roundRect(A.x,A.y,A.w,A.h,20);ctx.fill();
  ctx.fillStyle='#e0602a';ctx.font='28px Jua';ctx.textAlign='center';ctx.fillText(mg.name,W/2,top-34);
  if(phase==='miniIntro'){ctx.fillStyle='#4a3a2a';ctx.font='22px Jua';ctx.fillText(mg.how,W/2,A.y+A.h*.4);ctx.font='18px Jua';ctx.fillStyle='#7a6a50';ctx.fillText(mg.t>1?'탭해서 시작!':'준비…',W/2,A.y+A.h*.4+40);
    if(mg.t>3.5)miniBegin();return}
  const ps=mg.ps;
  if(mg.id==='mash'){const lane=A.h/4;ps.forEach((s,i)=>{const y=A.y+lane*(i+.5);ctx.strokeStyle='rgba(0,0,0,.08)';ctx.lineWidth=lane*.5;ctx.beginPath();ctx.moveTo(A.x+30,y);ctx.lineTo(A.x+A.w-30,y);ctx.stroke();
      const fx=A.x+A.w-40;ctx.fillStyle='#e04a4a';ctx.fillRect(fx,y-lane*.35,4,lane*.5);ctx.beginPath();ctx.moveTo(fx+4,y-lane*.35);ctx.lineTo(fx+28,y-lane*.25);ctx.lineTo(fx+4,y-lane*.15);ctx.fill();
      face(A.x+40+(A.w-90)*s.prog,y,Math.min(lane*.3,26),s.p.color,s.fin===null&&s.prog>0?Math.abs(Math.sin(mg.t*14+i))*6:0);
      ctx.fillStyle='#4a3a2a';ctx.font='15px Jua';ctx.textAlign='left';ctx.fillText(s.p.name+(s.fin!==null?' 골인!':''),A.x+10,y-lane*.32)})}
  else if(mg.id==='stop'){const bw=A.w*.8,bx=A.x+A.w*.1;ps.forEach((s,i)=>{const y=A.y+A.h*(.15+i*.22);const g=ctx.createLinearGradient(bx,0,bx+bw,0);g.addColorStop(0,'#ff8a8a');g.addColorStop(.45,'#ffe08a');g.addColorStop(.5,'#6ad86a');g.addColorStop(.55,'#ffe08a');g.addColorStop(1,'#ff8a8a');
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(bx,y-14,bw,28,14);ctx.fill();const v=s.stopV===null?mg.needle:s.stopV;ctx.fillStyle='#2a2a3a';ctx.fillRect(bx+bw*v-3,y-22,6,44);
      face(bx-26,y,16,s.p.color,0);if(s.stopV!==null){ctx.fillStyle='#4a3a2a';ctx.font='15px Jua';ctx.textAlign='left';ctx.fillText('멈춤!',bx+bw+8>W-50?bx+bw-50:bx+bw+8,y-20)}})}
  else{const gy=A.y+A.h*.9;ctx.fillStyle='#c8a878';ctx.fillRect(A.x,gy+A.h*.04,A.w,A.h*.06);
    if(mg.id==='dodge')for(const r of mg.rocks){ctx.fillStyle='#8a7a6a';ctx.beginPath();ctx.arc(A.x+r.x*A.w,A.y+r.y*A.h,r.r*A.w,0,7);ctx.fill();ctx.fillStyle='#6a5a4a';ctx.beginPath();ctx.arc(A.x+(r.x-r.r*.3)*A.w,A.y+r.y*A.h,r.r*A.w*.3,0,7);ctx.fill()}
    else for(const c of mg.coins){ctx.fillStyle=c.gold?'#ff9a2a':'#ffd23f';ctx.beginPath();ctx.arc(A.x+c.x*A.w,A.y+c.y*A.h,c.gold?14:10,0,7);ctx.fill();ctx.strokeStyle='#c89a20';ctx.lineWidth=2;ctx.stroke()}
    ps.forEach((s,i)=>{ctx.globalAlpha=s.alive?1:.3;face(A.x+s.x*A.w,gy,Math.min(22,A.w*.035),s.p.color,0);ctx.globalAlpha=1;
      ctx.fillStyle='#4a3a2a';ctx.font='14px Jua';ctx.textAlign='center';ctx.fillText(mg.id==='catch'?s.got:s.p.name,A.x+s.x*A.w,gy-30)});
    const dur=mg.id==='dodge'?16:12;ctx.fillStyle='#4a3a2a';ctx.font='20px Jua';ctx.textAlign='right';ctx.fillText(Math.max(0,Math.ceil(dur-mg.t))+'초',A.x+A.w-12,A.y+28)}
  if(phase==='miniEnd'&&mg.rank){ctx.fillStyle='rgba(255,255,255,.92)';const bw=Math.min(320,W-40),bh=190;ctx.beginPath();ctx.roundRect(W/2-bw/2,A.y+A.h/2-bh/2,bw,bh,18);ctx.fill();
    mg.ps.map((s,i)=>({s,r:mg.rank[i]})).sort((a,b)=>a.r-b.r).forEach((o,k)=>{const y=A.y+A.h/2-bh/2+36+k*40;face(W/2-bw/2+36,y-6,13,o.s.p.color,0);ctx.fillStyle='#4a3a2a';ctx.font='19px Jua';ctx.textAlign='left';ctx.fillText((o.r+1)+'등 '+o.s.p.name,W/2-bw/2+58,y);ctx.textAlign='right';ctx.fillText('+'+o.s.prize+' 🪙',W/2+bw/2-16,y)})}}

// ---------- 루프
function togglePause(){if(phase==='title'||phase==='over')return;paused=!paused;$('pauseOv').hidden=!paused}
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}
  if(!paused&&phase!=='title'&&phase!=='over'){time+=dt;runTimers(dt);
    if(phase==='roll'){dice.t+=dt;if(!dice.stop){if(Math.floor(time/.07)!==Math.floor((time-dt)/.07))dice.v=dice.v%D.dice+1;if(PL[cur].bot&&dice.t>dice.stopT){dice.v=ri(1,D.dice);stopDice()}}}
    if(phase==='move'){stepT-=dt;if(stepT<=0){stepT=.3;moveStep()}}
    if(mg&&(phase==='miniIntro'||phase==='miniEnd'))mg.t+=dt;
    if(phase==='mini'){if(keys.arrowleft)mg.ps[0].aim=clamp(mg.ps[0].x-.08,.04,.96);if(keys.arrowright)mg.ps[0].aim=clamp(mg.ps[0].x+.08,.04,.96);miniUpdate(dt)}}
  ctx.setTransform(DPR,0,0,DPR,0,0);if(mg&&(phase==='miniIntro'||phase==='mini'||phase==='miniEnd'))drawMini();else drawBoard();
  requestAnimationFrame(frame)}
function showTitle(){phase='title';$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;hint('');PL=D.players.map((p,i)=>({i,name:p.name,color:p.color,coins:D.startCoins,stars:0,pos:0,bot:i>0,hop:0}));sideUI();
  setT($('tCost'),D.starCost);setT($('tRec'),save.wins?'지금까지 '+save.wins+'번 우승했어요':'');const r=$('rounds');r.innerHTML='';
  for(const n of [5,10,15]){const b=document.createElement('button');b.textContent=n+'라운드';if(n===ROUNDS)b.className='on';b.onclick=()=>{ROUNDS=save.rounds=n;store();snd('click');showTitle()};r.appendChild(b)}}
$('startBtn').onclick=()=>{snd('click');start()};$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
$('quitBtn').onclick=()=>{paused=false;timers=[];mg=null;showTitle()};$('againBtn').onclick=()=>{snd('click');start()};$('oMenu').onclick=()=>{snd('click');showTitle()};
showTitle();requestAnimationFrame(frame);
window.__pb={get phase(){return phase},get PL(){return PL},get mg(){return mg},get round(){return round},stopDice,miniInput,start,get cur(){return cur}};
});
