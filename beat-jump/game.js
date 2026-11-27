/* 박자 점프 — 음악에 맞춰 달리는 네모 점프. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const PH=D.physics,SAVE='beatJump.save',HB=.08;
const setT=(el,v)=>{v=String(v);if(el.textContent!==v)el.textContent=v};
const save=Object.assign({best:{},stars:{},done:0},(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(_){}};
let Wd=0,Ht=0,DPR=1,T=40;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;T=Math.min(Ht/11.5,Wd/13)}addEventListener('resize',fit);fit();

// ---------- 맵
let LV=null,grid=[],GW=0,GH=10,endX=0,li=0;
function load(i){li=i;LV=D.levels[i];GH=LV.rows.length;GW=LV.rows[0].length;grid=LV.rows.slice().reverse().map(r=>r.split(''));endX=GW;for(let x=0;x<GW;x++)if(grid[1][x]==='E'){endX=x;break}}
const at=(x,y)=>x<0||y<0||x>=GW||y>=GH?'.':grid[y][x];

// ---------- 물리 (봇도 쓰도록 순수 함수)
function newState(){return {x:2,y:1,vy:0,g:1,ground:true,dead:false,won:false,orbs:{},stars:{},rot:0}}
function copy(s){return Object.assign({},s,{orbs:Object.assign({},s.orbs),stars:Object.assign({},s.stars)})}
function sim(s,hold,dt){
  const py=s.y;s.x+=PH.speed*dt;
  if(hold&&s.ground){s.vy=PH.jump*s.g;s.ground=false;s.jumped=true}else s.jumped=false;
  const x0=Math.floor(s.x),x1=Math.floor(s.x+1-1e-6),y0=Math.floor(s.y-.5),y1=Math.floor(s.y+1.5);
  // 링
  if(hold&&!s.ground){for(let x=x0;x<=x1+1;x++)for(let y=y0;y<=y1;y++){if(at(x,y)!=='o'||s.orbs[x+','+y])continue;if(Math.abs(x+.5-(s.x+.5))<.95&&Math.abs(y+.5-(s.y+.5))<1.1){s.orbs[x+','+y]=1;s.vy=PH.orb*s.g;s.orbHit=true}}}
  s.vy-=PH.gravity*s.g*dt;s.y+=s.vy*dt;s.ground=false;
  for(let x=Math.floor(s.x);x<=Math.floor(s.x+1-1e-6);x++)for(let y=Math.floor(s.y)-1;y<=Math.floor(s.y)+2;y++){const t=at(x,y);if(t==='.')continue;
    const ox=s.x+HB<x+1&&s.x+1-HB>x,oy=s.y<y+1&&s.y+1>y;
    if(t==='#'&&ox&&oy){
      if(s.g>0&&s.vy<=0&&py>=y+1-.38){s.y=y+1;s.vy=0;s.ground=true}
      else if(s.g<0&&s.vy>=0&&py+1<=y+.38){s.y=y-1;s.vy=0;s.ground=true}
      else{s.dead=true;return s}}
    else if(t==='^'&&s.x+.82>x+.3&&s.x+.18<x+.7&&s.y+.1<y+.55&&s.y+.9>y){s.dead=true;return s}
    else if(t==='v'&&s.x+.82>x+.3&&s.x+.18<x+.7&&s.y+.9>y+.45&&s.y+.1<y+1){s.dead=true;return s}
    else if(t==='_'&&ox&&(s.g>0?s.y<y+.4:s.y+1>y+.6)&&oy){s.vy=PH.pad*s.g;s.ground=false;s.padHit=true}
    else if(t==='*'&&ox&&oy)s.stars[x]=1}
  const cx=Math.floor(s.x+.5);if(at(cx,1)==='G'||at(cx,2)==='G')s.g=-1;if(at(cx,1)==='N'||at(cx,2)==='N')s.g=1;
  if(s.x>=endX)s.won=true;if(s.y<-1||s.y>GH)s.dead=true;
  if(s.ground)s.rot=Math.round(s.rot/90)*90;else s.rot+=420*dt*s.g;
  return s}

// ---------- 음악 (단계마다 박자)
let ac=null,mus=null;
function musicStart(fromBeat){musicStop();if(window.Arcade&&Arcade.muted)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
  const step=60/LV.bpm/2;let n=fromBeat*2,next=ac.currentTime+.05;const out=ac.createGain();out.gain.value=.5;out.connect(ac.destination);
  const tick=()=>{while(next<ac.currentTime+.25){const t=next,k=n%16;
      if(k%4===0){const o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(out);o.start(t);o.stop(t+.22)}
      if(k%2===1){const b=ac.createBufferSource(),buf=ac.createBuffer(1,2000,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<2000;i++)d[i]=(Math.random()*2-1)*(1-i/2000);b.buffer=buf;const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=6000;const g=ac.createGain();g.gain.value=.18;b.connect(f);f.connect(g);g.connect(out);b.start(t)}
      const note=LV.notes[Math.floor(n/2)%LV.notes.length],o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();o.type='sawtooth';o.frequency.value=55*Math.pow(2,note/12);f.type='lowpass';f.frequency.value=700;
      g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.001,t+step*.9);o.connect(f);f.connect(g);g.connect(out);o.start(t);o.stop(t+step);
      if(k%8===4){const o2=ac.createOscillator(),g2=ac.createGain();o2.type='square';o2.frequency.value=440*Math.pow(2,(note+12)/12);g2.gain.setValueAtTime(.05,t);g2.gain.exponentialRampToValueAtTime(.001,t+step*1.5);o2.connect(g2);g2.connect(out);o2.start(t);o2.stop(t+step*1.6)}
      next+=step;n++}};
  mus={iv:setInterval(tick,50),out};tick()}catch(_){mus=null}}
function musicStop(){if(mus){clearInterval(mus.iv);try{mus.out.gain.setTargetAtTime(0,ac.currentTime,.05)}catch(_){}mus=null}}

// ---------- 진행
let state='title',paused=false,s=null,hold=false,tries=1,practice=false,check=null,deadT=0,time=0,beat=0,parts=[];
const keys={};
function begin(i){load(i);tries=1;check=null;practice=$('practice').checked;spawn();for(const id of ['titleOv','clearOv','pauseOv'])$(id).hidden=true}
function spawn(){s=check?copy(check):newState();state='play';paused=false;deadT=0;musicStart(Math.floor(s.x/(PH.speed*60/LV.bpm)));setT($('tries'),(practice?'연습 ':'도전 ')+tries)}
function die(){state='dead';deadT=0;musicStop();snd('boom');for(let i=0;i<14;i++)parts.push({x:s.x+.5,y:s.y+.5,vx:(Math.random()-.5)*12,vy:(Math.random()-.5)*12,t:.6});
  const pct=Math.min(100,Math.floor(s.x/endX*100));if(pct>(save.best[li]||0)){save.best[li]=pct;store()}}
function win(){state='clear';musicStop();snd('win');const st=Object.keys(s.stars).length;save.best[li]=100;save.stars[li]=Math.max(save.stars[li]||0,st);save.done=Math.max(save.done,li+1);store();
  if(window.Arcade)Arcade.record('beatJumpLevels',save.done);setT($('cStars'),'★'.repeat(st)+'☆'.repeat(3-st));$('cTxt').textContent=`${LV.name} 완주! 도전 ${tries}번`+(practice?' (연습 모드)':'');
  $('nextBtn').hidden=li+1>=D.levels.length;setTimeout(()=>$('clearOv').hidden=false,700)}
function update(dt){
  const h=hold||keys.Space||keys.ArrowUp||keys.KeyW;
  const sub=4;for(let i=0;i<sub&&state==='play';i++){sim(s,h,dt/sub);if(s.dead){die();return}if(s.won){win();return}}
  if(practice&&s.ground&&(!check||Math.floor(s.x/32)>Math.floor(check.x/32)))check=copy(s);
  if(s.padHit){s.padHit=false;snd('jump2')}if(s.orbHit){s.orbHit=false;snd('bounce',2)}
  setT($('pct'),Math.min(100,Math.floor(s.x/endX*100))+'%');$('prog').style.width=Math.min(100,s.x/endX*100)+'%';
}
// ---------- 입력
addEventListener('keydown',e=>{if(e.code==='KeyP'||e.code==='Escape'){setPause(!paused);return}keys[e.code]=true;if(['Space','ArrowUp'].includes(e.code))e.preventDefault()});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{for(const k in keys)keys[k]=false;hold=false});
cv.addEventListener('pointerdown',e=>{e.preventDefault();hold=true});for(const ev of ['pointerup','pointercancel','pointerleave'])cv.addEventListener(ev,()=>hold=false);
function setPause(on){if(state!=='play')on=false;paused=on;$('pauseOv').hidden=!on;if(on)musicStop();else if(state==='play')musicStart(Math.floor(s.x/(PH.speed*60/LV.bpm)))}

// ---------- 그리기
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);const col=LV?LV.color:'#2f8cff',bg=LV?LV.bg:'#0e1a40';
  beat=LV&&s?(s.x/(PH.speed*60/LV.bpm))%1:0;const pulse=Math.max(0,1-beat*3);
  ctx.fillStyle=bg;ctx.fillRect(0,0,Wd,Ht);
  if(!LV)return;
  const camX=(s?s.x:0)-Wd*.3/T,oy=(Ht-GH*T)/2;
  // 배경 무늬
  ctx.globalAlpha=.12+pulse*.15;ctx.fillStyle=col;for(let i=0;i<12;i++){const x=((i*170-camX*T*.3)%(Wd+200)+Wd+200)%(Wd+200)-100;ctx.fillRect(x,oy+T*2,60,GH*T-T*4)}ctx.globalAlpha=1;
  const xa=Math.floor(camX)-1,xb=Math.ceil(camX+Wd/T)+1;
  for(let y=0;y<GH;y++)for(let x=xa;x<=xb;x++){const t=at(x,y);if(t==='.')continue;const px=(x-camX)*T,py=oy+(GH-1-y)*T;
    if(t==='#'){ctx.fillStyle='#000';ctx.fillRect(px,py,T+.5,T+.5);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(px+2,py+2,T-4,T-4);ctx.fillStyle=col;ctx.globalAlpha=.25+pulse*.2;ctx.fillRect(px+5,py+5,T-10,T-10);ctx.globalAlpha=1}
    else if(t==='^'||t==='v'){ctx.fillStyle='#fff';ctx.beginPath();if(t==='^'){ctx.moveTo(px+T*.1,py+T);ctx.lineTo(px+T*.5,py+T*.1);ctx.lineTo(px+T*.9,py+T)}else{ctx.moveTo(px+T*.1,py);ctx.lineTo(px+T*.5,py+T*.9);ctx.lineTo(px+T*.9,py)}ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.stroke()}
    else if(t==='_'){ctx.fillStyle='#ffd23f';ctx.fillRect(px+T*.1,py+T*.75,T*.8,T*.25)}
    else if(t==='o'){if(!(s&&s.orbs[x+','+y])){ctx.strokeStyle='#ffd23f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(px+T/2,py+T/2,T*.35+pulse*3,0,7);ctx.stroke();ctx.fillStyle='rgba(255,210,63,.35)';ctx.fill()}}
    else if(t==='G'||t==='N'){ctx.fillStyle=t==='G'?'rgba(255,90,200,.35)':'rgba(90,200,255,.35)';ctx.fillRect(px+T*.25,py,T*.5,T+.5)}
    else if(t==='*'){if(!(s&&s.stars[x])){ctx.fillStyle='#ffd23f';ctx.font=`${T*.9}px Jua, sans-serif`;ctx.textAlign='center';ctx.fillText('★',px+T/2,py+T*.85)}}
    else if(t==='E'){ctx.fillStyle=Math.floor(time*6)%2?'#fff':col;ctx.fillRect(px+T*.35,py,T*.3,T+.5)}}
  // 네모
  if(s&&state!=='dead'){const px=(s.x-camX)*T,py=oy+(GH-1-s.y)*T;ctx.save();ctx.translate(px+T/2,py+T/2);ctx.rotate(s.rot*Math.PI/180);
    ctx.fillStyle='#ffd23f';ctx.fillRect(-T/2,-T/2,T,T);ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeRect(-T/2+1.5,-T/2+1.5,T-3,T-3);ctx.fillStyle='#22d3ee';ctx.fillRect(-T*.25,-T*.25,T*.5,T*.5);
    ctx.fillStyle='#000';ctx.fillRect(-T*.18,-T*.12,T*.1,T*.12);ctx.fillRect(T*.08,-T*.12,T*.1,T*.12);ctx.restore()}
  for(const p of parts){ctx.fillStyle='#ffd23f';ctx.globalAlpha=Math.max(0,p.t*1.6);ctx.fillRect((p.x-camX)*T-4,oy+(GH-1-p.y)*T+T/2-4,8,8);ctx.globalAlpha=1}
}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000||0,.04);last=now;
  if(!paused){time+=dt;if(state==='play')update(dt);else if(state==='dead'){deadT+=dt;if(deadT>.8){if(!practice||!check)tries++;else tries++;spawn()}}
    for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.t<=0)parts.splice(i,1)}}
  draw();requestAnimationFrame(frame)}

// ---------- 처음 화면
function toTitle(){state='title';musicStop();for(const id of ['pauseOv','clearOv'])$(id).hidden=true;if(!LV)load(0);s=null;
  const box=$('levels');box.innerHTML='';D.levels.forEach((L,i)=>{const b=document.createElement('button');b.className='lvb';b.style.setProperty('--c',L.color);const lock=i>save.done;b.disabled=lock;if(lock)b.style.opacity=.45;
    const nb=document.createElement('b'),sp=document.createElement('span');nb.textContent=(i+1)+'. '+L.name;sp.textContent=lock?'앞 단계를 완주하면 열려요':(save.best[i]?save.best[i]+'%':'도전!')+(save.stars[i]?' '+'★'.repeat(save.stars[i]):'');b.append(nb,sp);
    b.onclick=()=>{if(lock)return;snd('select');begin(i)};box.appendChild(b)});$('titleOv').hidden=false}
$('nextBtn').onclick=()=>{snd('click');begin(li+1)};$('cMenu').onclick=()=>{snd('click');toTitle()};
$('pauseBtn').onclick=()=>{snd('click');setPause(!paused)};$('resumeBtn').onclick=()=>{snd('click');setPause(false)};$('quitBtn').onclick=()=>{snd('click');toTitle()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
toTitle();requestAnimationFrame(frame);
window.__bj={sim,newState,copy,load,get endX(){return endX},get GW(){return GW},PH};
});
