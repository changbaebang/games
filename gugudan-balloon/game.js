/* 구구단 풍선 — 게임 동작 (캔버스)
 * 한 판 문제 수, 하트 수, 풍선 속도, 도장 기준, 별 기준, 풍선 색, 칭찬·결과 문구는 data.json 에서 읽어요.
 * 저장(localStorage): gugudanOpts(고른 단·속도), gugudanStats(문제별 맞힘/틀림), gugudanBest, gugudanStamps */
(async () => {
const HERE=document.currentScript.src;
let D;
try{const r=await fetch(new URL('data.json',HERE));if(!r.ok)throw new Error(r.status);D=await r.json()}
catch(e){document.getElementById('dans').outerHTML='<p class="loaderr">게임 데이터(data.json)를 불러오지 못했어요.<br>인터넷 연결을 확인하거나, 컴퓨터에서는 웹 서버로 열어 주세요.</p>';document.getElementById('startBtn').disabled=true;console.error('data.json 불러오기 실패',e);return}
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d'),TAU=Math.PI*2;
const GW=480,GH=760,TOPY=236;   // 화면 크기와 풍선이 사라지는 높이 (게임 좌표)
const QN=D.questionsPerRound,MAXL=D.lives,SPEEDS=D.speeds.map(s=>s.speed),SPEED_NAMES=D.speeds.map(s=>s.name);
const COLS=D.balloonColors.map(c=>[c.fill,c.text]),PRAISE=D.praise,STAMP=D.stampAfterCorrect;
$('stampHow').textContent=`한 번 맞히면 답이 나타나고, ${STAMP}번 맞히면 도장을 쾅!`;
let S=1,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);S=Math.min(innerWidth/GW,innerHeight/GH);cv.style.width=GW*S+'px';cv.style.height=GH*S+'px';cv.width=Math.round(GW*S*DPR);cv.height=Math.round(GH*S*DPR)}
addEventListener('resize',resize);resize();

// ---------- 저장
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let opts=store.get('gugudanOpts',{});
if(!opts||typeof opts!=='object')opts={};
opts.dans=Array.isArray(opts.dans)?opts.dans.filter(d=>d>=2&&d<=9):[];
if(!opts.dans.length)opts.dans=[2,3,4,5,6,7,8,9];
if(![0,1,2].includes(opts.speed))opts.speed=1;
let stats=store.get('gugudanStats',{});if(!stats||typeof stats!=='object')stats={};
let best=(window.Arcade&&Arcade.best('gugudanBest'))||0;
const saveOpts=()=>store.set('gugudanOpts',opts);
function rec(k,ok){const s=stats[k]||(stats[k]={c:0,m:0});ok?s.c++:s.m++;store.set('gugudanStats',stats)}
function countStamps(){let n=0;for(let a=2;a<=9;a++)for(let b=1;b<=9;b++)if((stats[a+'x'+b]||{}).c>=STAMP)n++;return n}
const saveStampCount=()=>store.set('gugudanStamps',countStamps());   // 목록 화면 '내 기록'용

// ---------- 소리 (공통 모듈 common/arcade.js)
const snd=(...a)=>window.Arcade&&Arcade.play(...a);

// ---------- 문제 만들기
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
let roundAsk={},lastKey='';
function pickFact(){const pool=[];let sum=0;
  for(const a of opts.dans)for(let b=1;b<=9;b++){const k=a+'x'+b;if(k===lastKey)continue;const s=stats[k]||{c:0,m:0};
    let w=1+Math.min(5,Math.max(0,s.m*2-s.c));   // 자주 틀린 문제는 더 자주
    if(b===1)w*=.5;                              // x1은 쉬우니 덜
    w/=1+(roundAsk[k]||0)*1.5;                    // 이번 판에 나온 문제는 덜
    pool.push([a,b,w]);sum+=w}
  let r=Math.random()*sum;for(const p of pool){r-=p[2];if(r<=0)return p}return pool[pool.length-1]}
function distractors(a,b){const ans=a*b,used=new Set([ans]),out=[],ok=v=>Number.isInteger(v)&&v>0&&v<100&&!used.has(v);
  const take=list=>{for(const v of shuffle(list))if(ok(v)){used.add(v);out.push(v);return}};
  take([a*(b+1),a*(b-1)]);           // 같은 단의 이웃
  take([(a+1)*b,(a-1)*b]);           // 옆 단
  const sw=ans>=10?(ans%10)*10+Math.floor(ans/10):0;
  take([sw>=10?sw:0,ans+1,ans-1,ans+2,ans-2]);  // 헷갈리기 쉬운 비슷한 수
  while(out.length<3){const v=(2+Math.floor(Math.random()*8))*(1+Math.floor(Math.random()*9));if(ok(v)){used.add(v);out.push(v)}}
  return out}

// ---------- 상태
let st='title',score=0,lives=MAXL,qi=0,results=[],combo=0,maxCombo=0,balloons=[],fx=[],rings=[],pops=[],q=null,phase='rise',phaseT=0,hintKind='wrong',missed=[],stampsBefore=0,shake=0,T=0,decoT=0;
const clouds=[0,1,2,3,4].map(i=>({x:Math.random()*GW,y:270+i*92+Math.random()*30,s:.6+Math.random()*.6,v:5+Math.random()*9}));

function newRound(){score=0;lives=MAXL;qi=0;results=[];combo=0;maxCombo=0;fx=[];rings=[];pops=[];missed=[];roundAsk={};lastKey='';balloons=[];stampsBefore=countStamps();nextQ()}
function nextQ(){const [a,b]=pickFact();q={a,b,ans:a*b,k:a+'x'+b};lastKey=q.k;roundAsk[q.k]=(roundAsk[q.k]||0)+1;launch();phase='rise';phaseT=0}
function launch(){const vals=shuffle([q.ans,...distractors(q.a,q.b)]),lanes=shuffle([0,1,2,3]),order=shuffle([0,1,2,3]),cols=shuffle(COLS.slice()),base=SPEEDS[opts.speed]*(1+Math.min(.25,qi*.013));
  for(let i=0;i<4;i++)balloons.push({v:vals[i],ok:vals[i]===q.ans,x:66+lanes[i]*116,y:GH+56+order[i]*55,vy:-base*(.94+Math.random()*.12),ph:Math.random()*TAU,c:cols[i][0],tc:cols[i][1],alpha:1,state:'up'})}
function advance(){qi++;if(lives<=0||qi>=QN)finish();else nextQ()}

function pop(x,y,t,c){pops.push({x,y,t,c,life:1.1})}
function burst(b,bad){const x=b.x+Math.sin(b.ph)*6;rings.push({x,y:b.y,t:0,c:bad?'#8a96a8':b.c});
  for(let i=0;i<16;i++){const a=Math.random()*TAU,v=120+Math.random()*220;fx.push({x,y:b.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,t:.7+Math.random()*.3,c:bad?'#8a96a8':i%3?b.c:'#fff',r:3+Math.random()*4})}}
function fleeAll(){for(const o of balloons)if(o.state==='up')o.state='flee'}

function hit(b){const sp=Math.max(0,Math.min(1,(b.y-TOPY)/(GH-TOPY)));combo++;maxCombo=Math.max(maxCombo,combo);
  const pts=(10+Math.round(sp*10))*(combo>=5?2:1);score+=pts;results[qi]='o';rec(q.k,true);
  burst(b,false);b.state='dead';fleeAll();
  pop(b.x,b.y-20,'+'+pts,'#fff');pop(GW/2,268,PRAISE[Math.floor(Math.random()*PRAISE.length)],'#ffe066');
  if(combo===5)pop(GW/2,420,'5연속! 이제 점수 2배','#ffe066');else if(combo>5&&combo%5===0)pop(GW/2,420,combo+'연속!','#ffe066');
  phase='right';phaseT=0;snd('pop');snd('coin');if(combo>=3)snd('combo',combo)}
function miss(kind,b){lives--;combo=0;results[qi]='x';rec(q.k,false);if(!missed.includes(q.k))missed.push(q.k);
  if(b){burst(b,true);b.state='dead';shake=.25}
  fleeAll();phase='wrong';phaseT=0;hintKind=kind;snd('bad')}

function finish(){st='end';const ok=results.filter(r=>r==='o').length,asked=results.length,stars=1+D.starThresholds.filter(n=>ok>=n).length;
  if(window.Arcade)Arcade.record('gugudanBest',score);best=Math.max(best,score);saveStampCount();
  const fresh=countStamps()-stampsBefore;
  $('eStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
  $('eTitle').textContent=lives<=0?D.outOfLivesTitle:D.endTitles[stars-1];
  $('eScore').textContent=score.toLocaleString();
  $('eTxt').textContent=`${asked}문제 중 ${ok}개 맞혔어요 · 최고 연속 ${maxCombo} · 최고 점수 ${best.toLocaleString()}`+(fresh>0?` · 새 도장 ${fresh}개!`:'');
  $('eMissLbl').firstChild.textContent=missed.length?'다시 볼 문제':'틀린 문제가 없어요!';
  $('eMiss').innerHTML=missed.map(k=>{const [a,b]=k.split('x').map(Number);return `<span>${a} × ${b} = ${a*b}</span>`}).join('');
  show('endOv');$('againBtn').focus();snd(stars>=2?'win':'level')}

// ---------- 화면 전환 / 설정
let back='titleOv';
function show(id){for(const o of ['titleOv','endOv','stampOv'])$(o).hidden=o!==id}
const dansEl=$('dans'),spdEl=$('spd');
for(let d=2;d<=9;d++){const b=document.createElement('button');b.className='chip';b.textContent=d+'단';b.dataset.d=d;
  b.onclick=()=>{snd('select');const i=opts.dans.indexOf(d);if(i>=0){if(opts.dans.length>1)opts.dans.splice(i,1)}else{opts.dans.push(d);opts.dans.sort((x,y)=>x-y)}syncUI();saveOpts()};dansEl.appendChild(b)}
SPEED_NAMES.forEach((n,i)=>{const b=document.createElement('button');b.className='chip';b.textContent=n;b.dataset.s=i;b.onclick=()=>{opts.speed=i;syncUI();saveOpts()};spdEl.appendChild(b)});
function syncUI(){for(const b of dansEl.children)b.setAttribute('aria-pressed',opts.dans.includes(+b.dataset.d));for(const b of spdEl.children)b.setAttribute('aria-pressed',+b.dataset.s===opts.speed)}
syncUI();
$('allBtn').onclick=()=>{opts.dans=[2,3,4,5,6,7,8,9];syncUI();saveOpts()};
function start(){snd('click');st='play';show(null);newRound()}
$('startBtn').onclick=start;$('againBtn').onclick=start;
$('menuBtn').onclick=()=>{st='title';balloons=[];q=null;show('titleOv')};
function renderStamps(){let h='<span class="hd"></span>';for(let b=1;b<=9;b++)h+=`<span class="hd">×${b}</span>`;
  for(let a=2;a<=9;a++){h+=`<span class="hd">${a}단</span>`;for(let b=1;b<=9;b++){const c=(stats[a+'x'+b]||{}).c||0;h+=`<span class="cell${c>=STAMP?' on':c>0?' part':''}" title="${a}×${b}=${a*b} · ${c}번 맞힘">${c>0?a*b:''}</span>`}}
  let found=0;for(let a=2;a<=9;a++)for(let b=1;b<=9;b++)if((stats[a+'x'+b]||{}).c>0)found++;
  $('board').innerHTML=h;$('stampCount').textContent=`찾은 답 ${found} / 72 · 도장 ${countStamps()}개`}
$('stampBtn').onclick=()=>{back='titleOv';renderStamps();show('stampOv')};
$('stamp2Btn').onclick=()=>{back='endOv';renderStamps();show('stampOv')};
$('stampClose').onclick=()=>show(back);
$('resetBtn').onclick=()=>{if(confirm('도장판과 틀린 문제 기록을 모두 지울까요?')){stats={};store.set('gugudanStats',stats);saveStampCount();renderStamps()}};

// ---------- 입력
addEventListener('pointerdown',e=>{if(st!=='play'||e.target.closest('.overlay'))return;
  if(phase==='wrong'){if(phaseT>.8)advance();return}
  if(phase!=='rise')return;
  const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/S,y=(e.clientY-r.top)/S;let pick=null,pd=1e9;
  for(const b of balloons){if(b.state!=='up'||b.alpha<.15)continue;const dx=(x-(b.x+Math.sin(b.ph)*6))/56,dy=(y-b.y)/64,d=dx*dx+dy*dy;if(d<=1&&d<pd){pd=d;pick=b}}
  if(pick)pick.ok?hit(pick):miss('wrong',pick)});
addEventListener('keydown',e=>{if(st==='play'&&phase==='wrong'&&phaseT>.8&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();advance()}});

// ---------- 업데이트
function spawnDeco(){const c=COLS[Math.floor(Math.random()*COLS.length)];balloons.push({v:(2+Math.floor(Math.random()*8))*(1+Math.floor(Math.random()*9)),ok:false,x:50+Math.random()*(GW-100),y:GH+60,vy:-(45+Math.random()*30),ph:Math.random()*TAU,c:c[0],tc:c[1],alpha:1,state:'up'})}
function update(dt){T+=dt;
  for(const c of clouds){c.x+=c.v*dt;if(c.x>GW+90)c.x=-90}
  if(st==='play'){phaseT+=dt;if(phase==='right'&&phaseT>.9)advance();else if(phase==='wrong'&&phaseT>7)advance()}
  else{decoT-=dt;if(decoT<=0&&balloons.length<6){decoT=1.3;spawnDeco()}}
  for(const b of balloons){b.ph+=dt*2.2;
    if(b.state==='flee'){b.vy-=700*dt;b.y+=b.vy*dt;b.alpha-=dt*2.5;if(b.alpha<=0)b.state='dead';continue}
    if(b.state!=='up')continue;
    b.y+=b.vy*dt;b.alpha=Math.max(0,Math.min(1,(b.y-TOPY)/70));
    if(b.y<TOPY){b.state='dead';if(st==='play'&&b.ok&&phase==='rise')miss('late',null)}}
  balloons=balloons.filter(b=>b.state!=='dead');
  for(const f of fx){f.t-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=600*dt}fx=fx.filter(f=>f.t>0);
  for(const r of rings)r.t+=dt;rings=rings.filter(r=>r.t<.35);
  for(const p of pops){p.life-=dt;p.y-=30*dt}pops=pops.filter(p=>p.life>0);
  shake=Math.max(0,shake-dt)}

// ---------- 그리기
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
function eqText(left,right,rc,y,size,lc){ctx.font=size+'px Jua,sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';const wl=ctx.measureText(left).width,wr=ctx.measureText(right).width,x=GW/2-(wl+wr)/2;ctx.fillStyle=lc;ctx.fillText(left,x,y);ctx.fillStyle=rc;ctx.fillText(right,x+wl,y)}
function balloon(b){const x=b.x+Math.sin(b.ph)*6,y=b.y;ctx.globalAlpha=Math.max(0,Math.min(1,b.alpha));
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+56);ctx.quadraticCurveTo(x+10*Math.sin(b.ph*1.3),y+84,x-4,y+116);ctx.stroke();
  ctx.fillStyle=b.c;ctx.beginPath();ctx.moveTo(x,y+48);ctx.lineTo(x-7,y+58);ctx.lineTo(x+7,y+58);ctx.fill();
  ctx.beginPath();ctx.ellipse(x,y,42,50,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.08)';ctx.beginPath();ctx.ellipse(x+14,y+20,22,26,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.ellipse(x-17,y-20,7,14,-.5,0,TAU);ctx.fill();
  ctx.font=(b.v>=10?42:48)+'px Jua,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  if(b.tc==='#fff'){ctx.lineWidth=5;ctx.strokeStyle='rgba(0,0,0,.22)';ctx.strokeText(b.v,x,y+2)}
  ctx.fillStyle=b.tc;ctx.fillText(b.v,x,y+2);ctx.globalAlpha=1}
function cloud(c){const s=c.s;ctx.beginPath();for(const [dx,dy,r] of [[-26,4,17],[0,-8,23],[26,4,17],[0,8,18]]){ctx.moveTo(c.x+dx*s+r*s,c.y+dy*s);ctx.arc(c.x+dx*s,c.y+dy*s,r*s,0,TAU)}ctx.fill()}
function heart(x,y,on){ctx.fillStyle=on?'#ff5a7a':'rgba(255,255,255,.3)';ctx.beginPath();ctx.arc(x-5,y,6,0,TAU);ctx.arc(x+5,y,6,0,TAU);ctx.moveTo(x-11,y+2);ctx.lineTo(x,y+14);ctx.lineTo(x+11,y+2);ctx.fill()}
function drawHint(){const a=q.a,b=q.b,k=Math.min(1,phaseT*5),y0=258+(1-k)*30;ctx.save();ctx.globalAlpha=k;
  ctx.fillStyle='rgba(20,60,110,.3)';ctx.fillRect(0,TOPY,GW,GH-TOPY);
  ctx.fillStyle='rgba(0,0,0,.15)';rr(46,y0+8,388,392,24);ctx.fill();ctx.fillStyle='#fffaf0';rr(42,y0,396,392,24);ctx.fill();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e0563c';ctx.font='24px Jua,sans-serif';ctx.fillText(hintKind==='late'?'놓쳤어요! 정답은':'땡! 정답은',GW/2,y0+34);
  eqText(`${a} × ${b} = `,String(a*b),'#e0563c',y0+82,52,'#23406a');
  ctx.textAlign='center';ctx.font='21px Jua,sans-serif';ctx.fillStyle='#6a86aa';ctx.fillText(`${a}씩 ${b}묶음`,GW/2,y0+126);
  const sp=19,gw=(a-1)*sp,gx=GW/2-gw/2-20,gy=y0+156,shown=Math.min(b,1+Math.floor(phaseT/.14));
  for(let r=0;r<shown;r++){const yy=gy+r*21;ctx.fillStyle=r%2?'#4a9dff':'#ff8a5a';for(let c=0;c<a;c++){ctx.beginPath();ctx.arc(gx+c*sp,yy,7,0,TAU);ctx.fill()}
    const last=r===b-1;ctx.textAlign='left';ctx.font=(last?'19px':'15px')+' Jua,sans-serif';ctx.fillStyle=last?'#e0563c':'#8aa0bf';ctx.fillText(a*(r+1),gx+gw+16,yy)}
  if(phaseT>.8){ctx.textAlign='center';ctx.fillStyle='#6a86aa';ctx.font='16px Jua,sans-serif';ctx.fillText('화면을 누르면 다음 문제',GW/2,y0+372)}
  ctx.restore()}
function draw(){ctx.setTransform(S*DPR,0,0,S*DPR,0,0);if(shake)ctx.translate((Math.random()-.5)*shake*16,(Math.random()-.5)*shake*16);
  const g=ctx.createLinearGradient(0,0,0,GH);g.addColorStop(0,'#6fc0f2');g.addColorStop(.7,'#bfe6ff');g.addColorStop(1,'#e2f5ff');ctx.fillStyle=g;ctx.fillRect(-20,-20,GW+40,GH+40);
  ctx.fillStyle='rgba(255,255,255,.85)';for(const c of clouds)cloud(c);
  ctx.fillStyle='#8fd46a';ctx.beginPath();ctx.moveTo(0,GH-70);ctx.quadraticCurveTo(GW*.3,GH-125,GW*.6,GH-75);ctx.quadraticCurveTo(GW*.85,GH-45,GW,GH-82);ctx.lineTo(GW,GH);ctx.lineTo(0,GH);ctx.fill();
  ctx.fillStyle='#5fb84a';ctx.beginPath();ctx.moveTo(0,GH-34);ctx.quadraticCurveTo(GW*.5,GH-72,GW,GH-30);ctx.lineTo(GW,GH);ctx.lineTo(0,GH);ctx.fill();
  for(const b of balloons)balloon(b);
  for(const r of rings){ctx.globalAlpha=1-r.t/.35;ctx.strokeStyle=r.c;ctx.lineWidth=4;ctx.beginPath();ctx.arc(r.x,r.y,40+r.t*160,0,TAU);ctx.stroke()}ctx.globalAlpha=1;
  for(const f of fx){ctx.globalAlpha=Math.max(0,Math.min(1,f.t*1.6));ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill()}ctx.globalAlpha=1;
  // 문제 팻말
  ctx.strokeStyle='#8a5a2a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(110,50);ctx.lineTo(110,78);ctx.moveTo(370,50);ctx.lineTo(370,78);ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,.18)';rr(54,80,380,118,20);ctx.fill();
  ctx.fillStyle='#e9b46a';rr(50,74,380,118,20);ctx.fill();ctx.strokeStyle='#a8692e';ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#8a5a2a';for(const [x,y] of [[66,90],[414,90],[66,176],[414,176]]){ctx.beginPath();ctx.arc(x,y,4,0,TAU);ctx.fill()}
  if(st==='play'&&q){const done=phase!=='rise',rc=phase==='right'?'#178a3e':phase==='wrong'?'#d0421e':'#9a5a20';
    ctx.save();if(phase==='right'){const s=1+Math.max(0,.12-phaseT*.3);ctx.translate(GW/2,134);ctx.scale(s,s);ctx.translate(-GW/2,-134)}
    eqText(`${q.a} × ${q.b} = `,done?String(q.ans):'?',rc,136,62,'#4a2a10');ctx.restore()}
  else eqText('구구단 ','풍선','#d0421e',136,58,'#4a2a10');
  // 진행 점
  if(st!=='title'){const sp=Math.min(19,(GW-60)/Math.max(1,QN-1)),x0=GW/2-(QN-1)*sp/2;for(let i=0;i<QN;i++){const x=x0+i*sp,y=216,r=results[i];ctx.beginPath();ctx.arc(x,y,6.5,0,TAU);ctx.fillStyle=r==='o'?'#2fbf5a':r==='x'?'#ff5a5a':'rgba(255,255,255,.6)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='rgba(30,70,120,.35)';ctx.stroke();
    if(st==='play'&&i===qi&&!r){ctx.beginPath();ctx.arc(x,y,10+Math.sin(T*6),0,TAU);ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke()}}}
  if(st==='play'&&phase==='wrong')drawHint();
  // 상단 점수·하트
  ctx.fillStyle='rgba(20,60,110,.35)';ctx.fillRect(0,0,GW,50);ctx.textBaseline='middle';ctx.textAlign='left';ctx.font='16px "Press Start 2P",monospace';ctx.fillStyle='#fff';ctx.fillText(String(score).padStart(5,'0'),14,26);
  for(let i=0;i<MAXL;i++)heart(GW-24-i*26,22,i<lives);
  if(st==='play'&&combo>=3){ctx.textAlign='center';ctx.font='19px Jua,sans-serif';ctx.fillStyle='#ffe066';ctx.fillText(`연속 ${combo}`+(combo>=5?' · 점수 2배':''),GW/2,26)}
  ctx.font='24px Jua,sans-serif';ctx.lineWidth=5;ctx.strokeStyle='#23406a';ctx.textAlign='center';
  for(const p of pops){ctx.globalAlpha=Math.max(0,Math.min(1,p.life*2));ctx.strokeText(p.t,p.x,p.y);ctx.fillStyle=p.c;ctx.fillText(p.t,p.x,p.y)}ctx.globalAlpha=1;ctx.textBaseline='alphabetic'}

let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
})();
