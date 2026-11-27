/* 스포츠 한 판 — 쓱 밀어서 하는 볼링과 테니스. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='sportsDay.save',BW=D.bowling,TN=D.tennis;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,sgn=v=>v<0?-1:1;
const save=Object.assign({bowl:0,tenWins:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR}addEventListener('resize',fit);fit();
let mode=null,state='title',paused=false,time=0,bigT=0;
function big(t){const e=$('big');e.textContent=t;e.classList.add('on');bigT=1.4}
function hint(t){setT($('hint'),t)}

// ---------- 원근 카메라
const cam={x:0,y:1.3,z:-2.5,F:500,HY:200};
function P(x,y,z){const d=Math.max(.25,z-cam.z),k=cam.F/d;return [Wd/2+(x-cam.x)*k,cam.HY+(cam.y-y)*k,k]}
function poly(pts,fill){ctx.fillStyle=fill;ctx.beginPath();pts.forEach((p,i)=>{const q=P(p[0],p[1],p[2]);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});ctx.closePath();ctx.fill()}

// ---------- 밀기(스와이프) 입력
let sw=null,swipeCb=null;
cv.addEventListener('pointerdown',e=>{if(state!=='play'||paused)return;sw={pts:[[e.clientX,e.clientY,performance.now()]],id:e.pointerId}});
addEventListener('pointermove',e=>{if(!sw||e.pointerId!==sw.id)return;sw.pts.push([e.clientX,e.clientY,performance.now()]);if(mode==='bowl')bowlDrag(sw)});
addEventListener('pointerup',e=>{if(!sw||e.pointerId!==sw.id)return;const s=sw;sw=null;s.pts.push([e.clientX,e.clientY,performance.now()]);readSwipe(s)});
addEventListener('pointercancel',()=>{sw=null});
function readSwipe(s){const a=s.pts[0],b=s.pts[s.pts.length-1];const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  // 마지막 0.25초의 빠르기
  let k=s.pts.length-1;while(k>0&&b[2]-s.pts[k][2]<250)k--;const c=s.pts[k],dt=Math.max(16,b[2]-c[2]);const sp=Math.hypot(b[0]-c[0],b[1]-c[1])/dt;
  // 휘기: 앞 절반과 뒤 절반 방향 차이
  const m=s.pts[Math.floor(s.pts.length/2)];const a1=Math.atan2(m[0]-a[0],-(m[1]-a[1])),a2=Math.atan2(b[0]-m[0],-(b[1]-m[1]));let turn=a2-a1;if(turn>Math.PI)turn-=2*Math.PI;if(turn<-Math.PI)turn+=2*Math.PI;
  const g={dx,dy,len,sp,turn,unit:Math.min(Wd,Ht)};if(mode==='bowl')bowlSwipe(g);else if(mode==='ten')tenSwipe(g)}
const keys={};addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(k==='p'||k==='escape')togglePause();if(state==='play'&&!paused)keyAct(k)});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
function keyAct(k){if(mode==='bowl'&&k===' ')bowlSwipe({dx:0,dy:-200,len:200,sp:1.6,turn:0,unit:400});
  if(mode==='ten'&&(k===' '||k==='arrowup'))tenSwipe({dx:keys.arrowleft?-120:keys.arrowright?120:0,dy:-200,len:220,sp:1.4,turn:0,unit:400})}

// =====================================================================
// 볼링
// =====================================================================
const LL=BW.laneLen,LW=.53,GW=.66,PR=.06,BR=.11,PIT=LL+1.3;
let pins=[],ball=null,bowl=null;
const pinHome=[];for(let r=0;r<4;r++)for(let i=0;i<=r;i++)pinHome.push([(i-r/2)*.305,LL+r*.264]);
function rackPins(){pins=pinHome.map(([x,z])=>({x,z,hx:x,hz:z,vx:0,vz:0,down:false,gone:false,tilt:0,ang:0}))}
function bowlStart(){mode='bowl';bowl={frames:[],marks:[],fi:0,cur:[],aimX:0,phase:'aim',t:0,total:0,upBefore:10};rackPins();newBall();$('card').hidden=false;$('tscore').hidden=true;$('moveBtns').hidden=false;drawCard();go()}
function newBall(){ball={x:bowl.aimX,z:0,vx:0,vz:0,spin:0,gutter:false,rolling:false,rot:0};bowl.phase='aim';hint('위로 쓱 밀어 굴려요 · 휘어 밀면 휘어요');cam.z=-2.5}
function bowlDrag(s){if(bowl.phase!=='aim')return;const a=s.pts[0],b=s.pts[s.pts.length-1];if(Math.abs(b[1]-a[1])<30&&s.pts.length>2){const q=s.pts[s.pts.length-2];bowl.aimX=clamp(bowl.aimX+(b[0]-q[0])/Math.min(Wd,Ht)*1.2,-.42,.42);ball.x=bowl.aimX}}
function moveAim(d){if(mode==='bowl'&&bowl.phase==='aim'){bowl.aimX=clamp(bowl.aimX+d*.06,-.42,.42);ball.x=bowl.aimX}}
function bowlSwipe(g){if(bowl.phase!=='aim')return;if(g.dy>-40||Math.abs(g.dy)<Math.abs(g.dx)*.8)return;
  const p=clamp((g.sp-.4)/2.2,0,1);const v=BW.minSpeed+(BW.maxSpeed-BW.minSpeed)*p;
  ball.vz=v;ball.vx=clamp(g.dx/Math.abs(g.dy),-.6,.6)*.09*v;ball.spin=clamp(g.turn*1.4,-1,1);ball.rolling=true;bowl.upBefore=pinsUp();bowl.phase='roll';bowl.t=0;hint('');snd('whoosh')}
function pinsUp(){return pins.filter(p=>!p.gone&&!p.down).length}
function collide(a,b,ra,rb,ma,mb,hitDown){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),r=ra+rb;if(d>=r||d===0)return 0;
  const nx=dx/d,nz=dz/d,ov=r-d;a.x-=nx*ov*mb/(ma+mb);a.z-=nz*ov*mb/(ma+mb);b.x+=nx*ov*ma/(ma+mb);b.z+=nz*ov*ma/(ma+mb);
  const rv=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rv>0)return 0;const j=-(1.8)*rv/(1/ma+1/mb);
  a.vx-=j*nx/ma;a.vz-=j*nz/ma;b.vx+=j*nx/mb;b.vz+=j*nz/mb;
  // 옆으로 흩어지기
  const sc=rand(-.6,.6)*Math.abs(rv);b.vx+=-nz*sc;b.vz+=nx*sc;return -rv}
function bowlUpdate(dt){const B=ball;
  if(bowl.phase==='roll'){bowl.t+=dt;
    for(let it=0;it<4;it++){const h=dt/4;
      if(B.rolling){const hk=B.gutter?0:B.spin*BW.hook*clamp((B.z-5)/10,0,1);B.vx+=hk*h;B.x+=B.vx*h;B.z+=B.vz*h;B.rot+=B.vz*h*4;
        if(!B.gutter&&Math.abs(B.x)>LW){B.gutter=true;B.x=sgn(B.x)*(LW+.07);B.vx=0;snd('thud');hint('도랑에 빠졌어요!')}
        if(B.z>PIT)B.rolling=false}
      if(!B.gutter&&B.rolling)for(const p of pins){if(p.gone)continue;const imp=collide(B,p,BR,PR,BW.ballMass,BW.pinMass);if(imp>.3){if(!p.down)snd('crack');p.down=true}}
      for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++){const a=pins[i],b=pins[j];if(a.gone||b.gone)continue;const ra=a.down&&a.tilt>.3?.12:PR,rb2=b.down&&b.tilt>.3?.12:PR;const imp=collide(a,b,ra,rb2,BW.pinMass,BW.pinMass);if(imp>.35){a.down=true;b.down=true}}
      for(const p of pins){if(p.gone)continue;p.x+=p.vx*h;p.z+=p.vz*h;const f=Math.exp(-(p.down?2.2:4)*h);p.vx*=f;p.vz*=f;if(p.down){p.tilt=Math.min(1,p.tilt+h*5);if(Math.hypot(p.vx,p.vz)>.1)p.ang=Math.atan2(p.vx,p.vz)}
        if(Math.hypot(p.x-p.hx,p.z-p.hz)>.05)p.down=true;if(Math.abs(p.x)>GW||p.z>PIT+.3){p.gone=true;p.down=true}}}
    cam.z+=((Math.min(B.z,LL-4.5)-2.5)-cam.z)*Math.min(1,dt*3);
    const moving=pins.some(p=>!p.gone&&Math.hypot(p.vx,p.vz)>.05);
    if((!B.rolling&&!moving&&bowl.t>1)||bowl.t>9)endRoll()}
  else if(bowl.phase==='show'){bowl.t+=dt;if(bowl.t>1.6)nextRoll()}
  else if(bowl.phase==='aim'){cam.z+=(-2.5-cam.z)*Math.min(1,dt*4)}}
function endRoll(){const last=bowl.fi===BW.frames-1;const standing=pinsUp();const knocked=Math.max(0,bowl.upBefore-standing);
  bowl.cur.push(knocked);bowl.phase='show';bowl.t=0;const c=bowl.cur;let msg,mark;
  if(standing===0&&bowl.upBefore===10){msg='스트라이크!';mark='X';snd('win')}
  else if(standing===0){msg='스페어!';mark='/';snd('level')}
  else{msg=knocked===0?'앗, 0개…':knocked+'개!';mark=knocked===0?'-':String(knocked)}
  (bowl.marks[bowl.fi]=bowl.marks[bowl.fi]||[]).push(mark);big(msg);drawCard()}
function nextRoll(){const c=bowl.cur,last=bowl.fi===BW.frames-1;let frameDone=false;
  if(!last)frameDone=c[0]===10||c.length===2;
  else frameDone=c.length===3||(c.length===2&&c[0]+c[1]<10);
  if(frameDone){bowl.frames[bowl.fi]=c.slice();bowl.cur=[];bowl.fi++;if(bowl.fi>=BW.frames){bowl.phase='done';drawCard();bowlOver();return}rackPins()}
  else if(pinsUp()===0)rackPins();
  else{for(const p of pins){if(p.down)p.gone=true;p.vx=p.vz=0}}
  drawCard();newBall()}
function scoreFrames(fr){const rolls=[];fr.forEach(f=>rolls.push(...f));let i=0;const out=[];for(let f=0;f<fr.length;f++){const a=fr[f];if(f===BW.frames-1){out.push(a.reduce((x,y)=>x+y,0));continue}
  if(a[0]===10){const n=rolls.slice(i+1,i+3);out.push(n.length<2?null:10+n[0]+n[1]);i+=1}
  else if(a[0]+a[1]===10){const n=rolls[i+2];out.push(n===undefined?null:10+n);i+=2}else{out.push(a[0]+a[1]);i+=2}}return out}
function drawCard(){const el=$('card');el.innerHTML='';const all=bowl.frames.slice();if(bowl.cur.length)all[bowl.fi]=bowl.cur;const sc=scoreFrames(all);let run=0,ok=true;
  for(let f=0;f<BW.frames;f++){const d=document.createElement('div');d.className='f'+(f===bowl.fi?' on':'')+(f===BW.frames-1?' last':'');
    let s='';if(ok&&bowl.frames[f]&&sc[f]!=null){run+=sc[f];s=run}else ok=false;
    const n=document.createElement('div');n.className='n';n.textContent=f+1;const r=document.createElement('div');r.className='r';r.textContent=(bowl.marks[f]||[]).join(' ');const ss=document.createElement('div');ss.className='s';ss.textContent=s;d.appendChild(n);d.appendChild(r);d.appendChild(ss);el.appendChild(d)}
  bowl.total=run}
function bowlOver(){drawCard();const t=bowl.total;const nb=t>save.bowl;if(nb){save.bowl=t;store()}Arcade.record&&Arcade.record('sportsBowlBest',t);
  over(t>=150?'멋진 볼링!':'볼링 끝!','점수 <b>'+t+'</b>점'+(nb?' · 🎉 새 최고 기록!':' · 최고 '+save.bowl+'점'))}
function bowlDraw(){const W=Wd,H=Ht;cam.F=Math.min(W*1.45,H*1.3);cam.HY=H*.2;cam.y=1.3;cam.x=0;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a1f3a');g.addColorStop(1,'#3a2a50');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const zn=Math.max(cam.z+.3,-1),zf=PIT+.6;
  poly([[-2.4,0,zn],[2.4,0,zn],[2.4,0,zf],[-2.4,0,zf]],'#2a2440');
  // 뒷벽
  {const a=P(-2.4,1.2,zf),b=P(2.4,0,zf);ctx.fillStyle='#1a1428';ctx.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);ctx.fillStyle='#ff8ac8';ctx.font=Math.max(10,(b[0]-a[0])*.06)+'px Jua';ctx.textAlign='center';ctx.fillText('★ STRIKE ★',(a[0]+b[0])/2,a[1]+(b[1]-a[1])*.35)}
  for(const s of [-1,1])poly([[s*LW,0,zn],[s*GW,0,zn],[s*GW,0,zf],[s*LW,0,zf]],'#4a4458');
  poly([[-LW,0,zn],[LW,0,zn],[LW,0,LL+1],[-LW,0,LL+1]],'#e8b878');
  ctx.strokeStyle='rgba(160,100,50,.35)';ctx.lineWidth=1;for(let i=1;i<10;i++){const x=-LW+i*LW*2/10;const a=P(x,0,zn),b=P(x,0,LL+1);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  // 화살표 표시
  ctx.fillStyle='#b05a2a';for(let i=-3;i<=3;i++){const p=P(i*.12,0,4.6-Math.abs(i)*.25);ctx.beginPath();ctx.moveTo(p[0],p[1]-p[2]*.08);ctx.lineTo(p[0]-p[2]*.03,p[1]+p[2]*.04);ctx.lineTo(p[0]+p[2]*.03,p[1]+p[2]*.04);ctx.fill()}
  {const a=P(-LW,0,0),b=P(LW,0,0);if(cam.z<-.3){ctx.strokeStyle='#c03030';ctx.lineWidth=Math.max(1,a[2]*.015);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}}
  // 핀과 공 (먼 것부터)
  const obj=pins.filter(p=>!p.gone).map(p=>({z:p.z,p}));obj.push({z:ball.z,b:1});obj.sort((a,b)=>b.z-a.z);
  for(const o of obj){if(o.b)drawBall();else drawPin(o.p)}
  // 조준 안내
  if(bowl.phase==='aim'){ctx.setLineDash([6,8]);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;const a=P(ball.x,0,.3),b=P(ball.x,0,LL);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.setLineDash([])}
  // 프레임 표시
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='16px Jua';ctx.textAlign='left';ctx.fillText((bowl.fi+1)+'프레임 · '+(bowl.cur.length+1)+'구',12,H-(bowl.phase==='aim'?70:16))}
function drawBall(){const B=ball;if(B.z>PIT+.2)return;const p=P(B.x,BR,B.z),r=BR*p[2];if(p[1]>Ht+r)return;
  ctx.fillStyle='rgba(0,0,0,.3)';const s=P(B.x,0,B.z);ctx.beginPath();ctx.ellipse(s[0],s[1],r,r*.3,0,0,7);ctx.fill();
  const g=ctx.createRadialGradient(p[0]-r*.35,p[1]-r*.35,r*.1,p[0],p[1],r);g.addColorStop(0,'#7ab8ff');g.addColorStop(1,'#1a4aa0');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p[0],p[1],r,0,7);ctx.fill();
  ctx.fillStyle='#0a1a40';for(let i=0;i<3;i++){const a=B.rot+i*.5;const yy=Math.cos(a);if(yy<0)continue;ctx.beginPath();ctx.arc(p[0]+(i-1)*r*.22,p[1]-r*.3*Math.sin(a)-r*.1,r*.08,0,7);ctx.fill()}}
function drawPin(p){const base=P(p.x,0,p.z),k=base[2];const h=.38*k,w=.06*k;ctx.save();ctx.translate(base[0],base[1]);
  if(p.down){ctx.rotate(p.ang>0?1.3*p.tilt:-1.3*p.tilt);ctx.globalAlpha=.9}
  ctx.fillStyle='rgba(0,0,0,.25)';if(!p.down){ctx.beginPath();ctx.ellipse(0,0,w*1.1,w*.35,0,0,7);ctx.fill()}
  ctx.fillStyle='#fffaf2';ctx.strokeStyle='#c8bca8';ctx.lineWidth=Math.max(.5,w*.08);ctx.beginPath();ctx.moveTo(-w*.55,0);ctx.bezierCurveTo(-w*1.15,-h*.35,-w*.3,-h*.55,-w*.35,-h*.75);ctx.bezierCurveTo(-w*.7,-h*.95,w*.7,-h*.95,w*.35,-h*.75);ctx.bezierCurveTo(w*.3,-h*.55,w*1.15,-h*.35,w*.55,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#e0303a';ctx.fillRect(-w*.42,-h*.66,w*.84,h*.04);ctx.fillRect(-w*.4,-h*.6,w*.8,h*.03);ctx.restore()}

// =====================================================================
// 테니스
// =====================================================================
const CW=4.115,CL=11.89,NET=.914,SVC=6.4,G=9.8;
let ten=null,tb=null,me=null,ai=null;
function tenStart(){mode='ten';ten={pts:[0,0],games:[0,0],server:0,phase:'serve',t:0,faults:0,last:null,bounces:0,queued:null,rally:0};me={x:0,z:-CL-.6,swing:0,side:0};ai={x:0,z:CL+.6,swing:0,side:1,react:0};
  $('card').hidden=true;$('tscore').hidden=false;$('moveBtns').hidden=true;newPoint();go()}
function newPoint(){tb=null;ten.phase='serve';ten.t=0;ten.faults=0;ten.queued=null;ten.bounces=0;ten.last=null;ten.rally=0;
  const odd=(ten.pts[0]+ten.pts[1])%2;const sx=odd?-.8:.8;
  if(ten.server===0){me.x=sx;me.z=-CL-.4;ai.x=-sx*2.2;ai.z=CL+.8;hint('위로 쓱 밀어 서브! (좌우로 밀면 방향)')}else{ai.x=-sx;ai.z=CL+.4;me.x=sx*2.2;me.z=-CL-.8;hint('상대 서브! 공이 오면 쓱 밀어요')}
  tscore()}
function shot(from,tx,tz,T){let vx,vy,vz;for(let i=0;i<8;i++){vx=(tx-from.x)/T;vz=(tz-from.z)/T;vy=(0-from.y+.5*G*T*T)/T;const tn=(0-from.z)/vz;const yn=from.y+vy*tn-.5*G*tn*tn;if(yn>NET+.25)break;T+=.12}return {vx,vy,vz}}
function launch(who,from,tx,tz,T){const v=shot(from,tx,tz,T);tb={x:from.x,y:from.y,z:from.z,vx:v.vx,vy:v.vy,vz:v.vz,by:who,bounces:0,crossed:false,dead:false};ten.last=who;ten.bounces=0;snd('hit')}
function tenSwipe(g){if(ten.phase==='serve'&&ten.server===0&&!tb){if(g.dy>-30)return;const p=clamp((g.sp-.3)/2,0,1);const aim=clamp(g.dx/g.unit*6,-3.6,3.6);
    const odd=(ten.pts[0]+ten.pts[1])%2;const box=odd?1:-1;// 대각선 서비스 박스
    let tx=clamp(box*1.9+aim*.6,-4.4,4.4)+rand(-.4,.4)*p,tz=3.4+p*2.8+rand(-.4,.6)*p;me.swing=.35;launch(0,{x:me.x,y:2.5,z:me.z+.3},tx,tz,.95-p*.3);ten.phase='rally';ten.serving=box;hint('');return}
  if(ten.phase==='rally'||ten.phase==='serve'){if(g.len<25)return;const p=clamp((g.sp-.3)/2,0,1);ten.queued={aim:clamp(g.dx/g.unit*9,-3.6,3.6),p,t:1.1};me.swing=Math.max(me.swing,.01)}}
function canReach(pl,R){if(!tb||tb.dead)return false;const dx=tb.x-pl.x,dz=tb.z-pl.z;return Math.abs(dx)<R&&Math.abs(dz)<.9&&tb.y<2.6&&tb.y>.05}
function pointTo(w,why){if(ten.phase==='point')return;ten.phase='point';ten.t=0;ten.pts[w]++;snd(w===0?'coin':'bad');
  const [a,b]=ten.pts;let gw=-1;if(a>=4&&a-b>=2)gw=0;else if(b>=4&&b-a>=2)gw=1;
  if(gw>=0){ten.games[gw]++;ten.pts=[0,0];ten.server=1-ten.server;big(gw===0?'게임 따냄!':'게임 뺏김');if(ten.games[gw]>=TN.games){ten.phase='over';ten.t=0;tscore();return}}
  else big(why||(w===0?'득점!':'실점'));tscore()}
function tscore(){const el=$('tscore');const nm=['0','15','30','40'];const [a,b]=ten.pts;let sa,sb;
  if(a>=3&&b>=3){if(a===b){sa=sb='듀스'}else{sa=a>b?'어드':'40';sb=b>a?'어드':'40'}}else{sa=nm[Math.min(a,3)];sb=nm[Math.min(b,3)]}
  el.innerHTML='';const mk=(cls,label,s,gm)=>{const d=document.createElement('div');d.className=cls;const t=document.createElement('span');t.textContent=label+' · 게임 '+gm;const bb=document.createElement('b');bb.textContent=s;d.appendChild(t);d.appendChild(bb);el.appendChild(d)};
  mk('me','나'+(ten.server===0?' 🎾':''),sa,ten.games[0]);mk('ai','상대'+(ten.server===1?' 🎾':''),sb,ten.games[1])}
function predictX(pl){if(!tb)return pl.x;const vz=tb.vz;if(Math.abs(vz)<.1)return tb.x;const t=(pl.z-tb.z)/vz;return t>0?tb.x+tb.vx*t:tb.x}
function bounceSpot(){if(!tb)return null;let x=tb.x,y=tb.y,z=tb.z,vy=tb.vy;for(let i=0;i<200;i++){const h=.02;vy-=G*h;y+=vy*h;x+=tb.vx*h;z+=tb.vz*h;if(y<=0)return {x,z}}return {x,z}}
function tenUpdate(dt){me.swing=Math.max(0,me.swing-dt);ai.swing=Math.max(0,ai.swing-dt);if(ten.queued){ten.queued.t-=dt;if(ten.queued.t<=0)ten.queued=null}
  if(ten.phase==='point'){ten.t+=dt;if(tb&&!tb.dead)stepBall(dt);if(ten.t>1.6)newPoint();return}
  if(ten.phase==='over'){ten.t+=dt;if(ten.t>1.2){const win=ten.games[0]>ten.games[1];if(win){save.tenWins++;store();Arcade.record&&Arcade.record('sportsTennisWins',save.tenWins)}
      over(win?'우승!':'아깝다!','게임 '+ten.games[0]+' : '+ten.games[1]+(win?' · 지금까지 '+save.tenWins+'번 이겼어요':''));ten.phase='done'}return}
  if(ten.phase==='serve'&&ten.server===1&&!tb){ten.t+=dt;if(ten.t>1.2){const odd=(ten.pts[0]+ten.pts[1])%2;const box=odd?-1:1;const fault=Math.random()<TN.faultAI;
      const tx=box*rand(.6,3.4)*(fault&&Math.random()<.5?1.4:1),tz=-(fault?rand(6.6,7.5):rand(3.6,6));ai.swing=.35;launch(1,{x:ai.x,y:2.5,z:ai.z-.3},tx,tz,rand(.85,1.05));ten.phase='rally';ten.serving=box}}
  // 선수 움직임
  const toward=(pl,tx,tz,sp)=>{const dx=tx-pl.x,dz=tz-pl.z,d=Math.hypot(dx,dz);if(d>.02){const m=Math.min(d,sp*dt);pl.x+=dx/d*m;pl.z+=dz/d*m}};
  if(tb&&!tb.dead){const coming0=tb.vz<0&&tb.by===1,coming1=tb.vz>0&&tb.by===0;
    if(coming0){const bs=bounceSpot();const tz=clamp((bs&&!tb.bounces?bs.z:tb.z)-2.2,-CL-2.5,-3);const tx=predictX({x:me.x,z:tz})+(.35);toward(me,clamp(tx,-CW-1.5,CW+1.5),tz,TN.me.speed)}
    else toward(me,0,-CL-.6,TN.me.speed*.6);
    if(coming1){if(ai.react<=0)ai.react=rand(.05,.25);ai.react-=dt;if(ai.react<.0){}const bs=bounceSpot();const tz=clamp((bs&&!tb.bounces?bs.z:tb.z)+2.2,3,CL+2.5);toward(ai,clamp(predictX({x:ai.x,z:tz})-.35,-CW-1.5,CW+1.5),tz,TN.ai.speed)}
    else{ai.react=0;toward(ai,0,CL+.6,TN.ai.speed*.6)}}
  if(tb&&!tb.dead){stepBall(dt);
    // 내가 치기
    if(tb.by===1&&tb.vz<0&&ten.phase==='rally'&&tb.bounces<=1&&canReach(me,TN.me.reach)&&ten.queued&&!(tb.serve&&tb.bounces===0)){const q=ten.queued;ten.queued=null;me.swing=.35;ten.rally++;
      const T=1.35-q.p*.5,e=.3+q.p*.7,tz=7+q.p*3.8+rand(-e,e);launch(0,{x:tb.x,y:Math.max(.6,tb.y),z:tb.z},q.aim+rand(-e,e),tz,T)}
    // 상대 치기
    else if(tb.by===0&&tb.vz>0&&tb.bounces===1&&canReach(ai,TN.ai.reach)){ai.swing=.35;ten.rally++;const err=Math.random()<TN.ai.err+ten.rally*.01;let tx=rand(-3.5,3.5),tz=-rand(6,10.5);
      if(Math.abs(me.x-tx)<1.5)tx=-sgn(me.x||1)*rand(1.5,3.5);if(err){if(Math.random()<.5)tx=sgn(tx)*rand(4.4,5.5);else tz=-rand(12.3,13.5)}
      launch(1,{x:tb.x,y:Math.max(.6,tb.y),z:tb.z},tx,tz,rand(1,1.35)-Math.min(.25,ten.rally*.02))}}}
function stepBall(dt){const b=tb;const n=3;for(let i=0;i<n;i++){const h=dt/n;const pz=b.z;b.vy-=G*h;b.x+=b.vx*h;b.y+=b.vy*h;b.z+=b.vz*h;
    if(!b.crossed&&sgn(pz)!==sgn(b.z)&&pz!==0){if(b.y<NET){b.vz*=-.15;b.vx*=.3;b.z=pz;if(ten.phase==='rally'){snd('thud');pointTo(1-b.by,'네트!')}}else b.crossed=true}
    if(b.y<=0&&b.vy<0){b.y=0;b.vy*=-.7;b.vx*=.85;b.vz*=.85;b.bounces++;snd('bounce');
      if(ten.phase==='rally'){const side=b.z<0?0:1;
        if(b.bounces===1){const inX=Math.abs(b.x)<=CW+.05,inZ=Math.abs(b.z)<=CL+.05;let ok=side!==b.by&&inX&&inZ;
          if(b.serve){ok=ok&&Math.abs(b.z)<=SVC+.05&&sgn(b.x)===ten.serving}
          if(!ok){if(b.serve&&ten.faults===0){ten.faults=1;big('폴트!');snd('bad');const sv=b.by;tb.dead=true;setTimeout0(()=>{if(ten.phase!=='rally')return;tb=null;ten.phase='serve';ten.t=0;if(sv===0)hint('두 번째 서브!')},.9)}else pointTo(1-b.by,b.serve?'더블 폴트':'아웃!')}}
        else if(b.bounces===2)pointTo(b.by,side===0?'놓쳤어요':'득점!')}}
    if(b.bounces>6)b.dead=true}}
// 프레임 타이머 (setTimeout 대신)
const timers=[];function setTimeout0(fn,s){timers.push({fn,t:s})}
function runTimers(dt){for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f()}}}
const _launch=launch;launch=function(who,from,tx,tz,T){_launch(who,from,tx,tz,T);tb.serve=ten.phase==='serve'};
function tenDraw(){const W=Wd,H=Ht;cam.x=me.x*.35;cam.y=4.6;cam.z=-CL-8.5;cam.F=Math.min(W*.62*8.5/CW*.5,H*1.05);cam.HY=H*.16;
  const g=ctx.createLinearGradient(0,0,0,cam.HY+30);g.addColorStop(0,'#7ac8ff');g.addColorStop(1,'#d8f0ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  poly([[-30,0,cam.z+1],[30,0,cam.z+1],[30,0,60],[-30,0,60]],'#4a9a5a');
  poly([[-CW-3,0,-CL-5],[CW+3,0,-CL-5],[CW+3,0,CL+5],[-CW-3,0,CL+5]],'#3a7ac0');
  poly([[-CW,0,-CL],[CW,0,-CL],[CW,0,CL],[-CW,0,CL]],'#3a8ad8');
  ctx.strokeStyle='#fff';const line=(a,b)=>{const p=P(...a),q=P(...b);ctx.lineWidth=Math.max(1,(p[2]+q[2])*.02);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()};
  for(const s of [-1,1]){line([-CW,0,s*CL],[CW,0,s*CL]);line([s*CW,0,-CL],[s*CW,0,CL]);line([-CW,0,s*SVC],[CW,0,s*SVC])}line([0,0,-SVC],[0,0,SVC]);
  // 공 그림자/상대/네트/공/나 순서
  const drawShadow=()=>{if(!tb)return;const s=P(tb.x,0,tb.z);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(s[0],s[1],s[2]*.06,s[2]*.02,0,0,7);ctx.fill()};
  const drawB=()=>{if(!tb)return;const p=P(tb.x,tb.y,tb.z);ctx.fillStyle='#e8ff4a';ctx.strokeStyle='#8aa020';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p[0],p[1],Math.max(2.5,p[2]*.07),0,7);ctx.fill();ctx.stroke()};
  const ballFar=tb&&tb.z>0;
  if(ballFar)drawShadow();player(ai,D.colors.ai,true);if(ballFar)drawB();
  // 네트
  {const a=P(-CW-.9,NET,0),b=P(CW+.9,0,0);ctx.fillStyle='rgba(30,30,40,.55)';ctx.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;for(let x=a[0];x<b[0];x+=6){ctx.beginPath();ctx.moveTo(x,a[1]);ctx.lineTo(x,b[1]);ctx.stroke()}
    ctx.fillStyle='#fff';ctx.fillRect(a[0],a[1]-2,b[0]-a[0],4);ctx.fillStyle='#555';for(const x of [a[0],b[0]])ctx.fillRect(x-2,a[1]-3,4,b[1]-a[1]+3)}
  if(!ballFar)drawShadow();if(!ballFar)drawB();player(me,D.colors.me,false);
  if(ten.queued){ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='15px Jua';ctx.textAlign='center';const p=P(me.x,2.4,me.z);ctx.fillText('준비!',p[0],p[1]-6)}}
function player(pl,col,far){const k=P(pl.x,0,pl.z)[2],b=P(pl.x,0,pl.z);const s=k;ctx.save();ctx.translate(b[0],b[1]);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(0,0,s*.35,s*.1,0,0,7);ctx.fill();
  ctx.fillStyle='#3a3a4a';ctx.fillRect(-s*.16,-s*.55,s*.12,s*.55);ctx.fillRect(s*.04,-s*.55,s*.12,s*.55);
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(-s*.26,-s*1.25,s*.52,s*.75,s*.15);ctx.fill();
  ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(0,-s*1.48,s*.24,0,7);ctx.fill();
  ctx.fillStyle=far?'#5a3a2a':'#3a2a1a';ctx.beginPath();ctx.arc(0,-s*1.55,s*.24,Math.PI*(far?.9:1.05),Math.PI*(far?2.1:1.95));ctx.fill();
  if(far){ctx.fillStyle='#2a2420';for(const e of [-1,1]){ctx.beginPath();ctx.arc(e*s*.08,-s*1.48,s*.03,0,7);ctx.fill()}}
  // 라켓
  const sw=pl.swing>0?(1-pl.swing/.35):0;const ang=far?(-.6+sw*2.4):(.6-sw*2.6);ctx.translate(s*.3*(far?-1:1),-s*1.0);ctx.rotate(ang+(far?Math.PI:0));
  ctx.strokeStyle='#5a5a6a';ctx.lineWidth=s*.05;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-s*.45);ctx.stroke();ctx.strokeStyle='#e04a5a';ctx.fillStyle='rgba(255,255,255,.5)';ctx.lineWidth=s*.04;ctx.beginPath();ctx.ellipse(0,-s*.62,s*.15,s*.2,0,0,7);ctx.fill();ctx.stroke();
  ctx.restore()}

// ---------- 공통
function go(){state='play';paused=false;for(const id of ['titleOv','overOv','pauseOv'])$(id).hidden=true;snd('go')}
function over(t,txt){state='over';$('oTitle').textContent=t;$('oTxt').innerHTML=txt;$('overOv').hidden=false;hint('')}
function showTitle(){state='title';mode=null;$('titleOv').hidden=false;$('overOv').hidden=true;$('pauseOv').hidden=true;$('card').hidden=true;$('tscore').hidden=true;$('moveBtns').hidden=true;hint('');
  setT($('rBowl'),save.bowl?'최고 '+save.bowl+'점':'');setT($('rTen'),save.tenWins?save.tenWins+'번 우승':'')}
function togglePause(){if(state!=='play')return;paused=!paused;$('pauseOv').hidden=!paused}
$('goBowl').onclick=()=>{snd('click');bowlStart()};$('goTen').onclick=()=>{snd('click');tenStart()};
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('quitBtn').onclick=()=>{snd('click');showTitle()};
$('againBtn').onclick=()=>{snd('click');mode==='bowl'?bowlStart():tenStart()};$('oMenu').onclick=()=>{snd('click');showTitle()};
for(const [id,d] of [['mL',-1],['mR',1]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.stopPropagation();moveAim(d);b._h=1;b._t=0});b.addEventListener('pointerup',()=>b._h=0);b.addEventListener('pointerleave',()=>b._h=0)}
let last=performance.now();
function frame(now){const dt=Math.min(.033,(now-last)/1000);last=now;time+=dt;if(bigT>0){bigT-=dt;if(bigT<=0)$('big').classList.remove('on')}
  if(state==='play'&&!paused){runTimers(dt);if(mode==='bowl'){if(keys.arrowleft)moveAim(-dt*8);if(keys.arrowright)moveAim(dt*8);for(const [id,d] of [['mL',-1],['mR',1]]){const b=$(id);if(b._h){b._t+=dt;if(b._t>.25)moveAim(d*dt*8)}}bowlUpdate(dt)}else if(mode==='ten')tenUpdate(dt)}
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(mode==='bowl')bowlDraw();else if(mode==='ten')tenDraw();else{ctx.fillStyle='#2a3450';ctx.fillRect(0,0,Wd,Ht)}
  requestAnimationFrame(frame)}
showTitle();requestAnimationFrame(frame);
window.__sd={bowlStart,tenStart,bowlSwipe,tenSwipe,get bowl(){return bowl},get ten(){return ten},get tb(){return tb},get me(){return me},get ai(){return ai},get pins(){return pins},state:()=>state};
});
