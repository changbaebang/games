/* 똑딱 시계 — 게임 동작
 * 단계(이름, 분 단위, 바늘 맞춤 간격, 문제 종류별 개수), '몇 분 전/뒤/걸린 시간'에 쓰는 분 목록,
 * 칭찬·결과 문구는 data.json 에서 읽어요.
 * 저장(localStorage): clockStars {단계번호: 별}, clockStarTotal (목록 화면 '내 기록'용), clockHelp (분 숫자 도우미 켜짐) */
(async () => {
const HERE=document.currentScript.src;
const $=id=>document.getElementById(id),snd=(...a)=>window.Arcade&&Arcade.play(...a);
let D;
try{const r=await fetch(new URL('data.json',HERE));if(!r.ok)throw new Error(r.status);D=await r.json()}
catch(e){document.getElementById('stages').innerHTML='<p class="loaderr">게임 데이터(data.json)를 불러오지 못했어요.<br>인터넷 연결을 확인하거나, 컴퓨터에서는 웹 서버로 열어 주세요.</p>';console.error('data.json 불러오기 실패',e);return}
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const QN=D.questionsPerStage,PRAISE=D.praise,STAGES=D.stages,LISTS=D.minuteLists;
let stars=store.get('clockStars',{});if(!stars||typeof stars!=='object')stars={};
let helpOn=!!store.get('clockHelp',false);

// ---------- 시각 도우미
const H=h=>((h-1)%12+12)%12+1;                       // 1~12로
const tot=(h,m)=>(h%12)*60+m;                        // 12시 기준 분
const fromTot=t=>{t=((t%720)+720)%720;return {h:Math.floor(t/60)||12,m:t%60}};
const fmt=(h,m,s)=>`${H(h)}시`+(m||s!=null?` ${m}분`:'')+(s!=null?` ${s}초`:'');
const fmtT=t=>{const o=fromTot(t);return fmt(o.h,o.m)};
const dur=d=>d<60?`${d}분`:`${Math.floor(d/60)}시간`+(d%60?` ${d%60}분`:'');
const secF=x=>x<60?`${x}초`:`${Math.floor(x/60)}분`+(x%60?` ${x%60}초`:'');
const BAT=[1,1,0,1,0,0,1,1,1,0],jo=(n,a,b)=>n+(BAT[n%10]?a:b);   // 숫자 뒤 조사 (일·삼·육·칠·팔·십 → 받침)
const NON5=[...Array(60).keys()].filter(m=>m%5);
function options(ans,cands,filler){const out=[ans],seen=new Set(out);for(const c of cands){if(out.length>=4)break;if(c&&!seen.has(c)){seen.add(c);out.push(c)}}
  for(let g=0;out.length<4&&g<80;g++){const c=filler();if(c&&!seen.has(c)){seen.add(c);out.push(c)}}return shuffle(out)}

// ---------- 설명 문장
function hourLine(h,m){return m===0?`짧은바늘이 ${jo(H(h),'을','를')} 가리켜요 → ${H(h)}시`:`짧은바늘이 ${jo(H(h),'과','와')} ${H(h+1)} 사이 → ${H(h)}시`}
function minLine(m){const n=Math.floor(m/5),r=m%5,num=n||12;
  if(m===0)return '긴바늘이 12를 가리켜요 → 정각';
  if(!r)return `긴바늘이 ${jo(num,'을','를')} 가리켜요 → 5씩 ${n}번, ${m}분`;
  return `긴바늘이 ${num}에서 작은 눈금 ${r}칸 더 → ${n*5}+${r} = ${m}분`}
function secLine(s){const n=s/5;return `초바늘이 ${jo(n||12,'을','를')} 가리켜요 → ${s}초`}

// ---------- 문제 만들기
// 단계의 minutes 설정: half(정각·30분) · five(5분 단위) · any(1분 단위)
const MODE=st=>STAGES[st-1].minutes||'any';
function genTime(st){const h=ri(1,12),md=MODE(st);let m;if(md==='half')m=pick([0,30]);else if(md==='five')m=ri(1,11)*5;else m=Math.random()<.75?pick(NON5):ri(0,11)*5;return {h,m}}
function qRead(st){const {h,m}=genTime(st),ans=fmt(h,m),num=Math.floor(m/5)||12;
  const md=MODE(st),c=[fmt(h+1,m),md==='half'?fmt(h,m?0:30):fmt(h,m%5?num:num===12?0:num),fmt(num,(H(h)*5)%60)];
  if(md==='any')c.splice(1,0,fmt(h,m<59?m+1:m-1));if(md==='five')c.push(fmt(h,(m+5)%60));c.push(fmt(h-1,m));
  return {kind:'read',text:'시계가 가리키는 시각은?',clock:tot(h,m),answer:ans,options:options(ans,c,()=>{const r=genTime(st);return fmt(r.h,r.m)}),explain:[hourLine(h,m),minLine(m)],hl:m%5?-1:(m/5)%12}}
function qSet(st){const {h,m}=genTime(st);let s0;do{const r=genTime(st);s0=tot(r.h,r.m)}while(s0===tot(h,m));
  return {kind:'set',text:`<span>${fmt(h,m)}</span><small>바늘을 돌려서 만들어 보세요</small>`,clock:s0,target:tot(h,m),snap:STAGES[st-1].snap||1,answer:fmt(h,m),explain:[hourLine(h,m),minLine(m)],hl:m%5?-1:(m/5)%12}}
function qBefore(){const h=ri(1,12),m=pick(LISTS.before),b=60-m,ans=`${H(h+1)}시 ${b}분 전`;
  return {kind:'choice',text:"이 시각을 '몇 시 몇 분 전'으로<br>말하면?",clock:tot(h,m),answer:ans,
    options:options(ans,[`${H(h)}시 ${b}분 전`,`${H(h+1)}시 ${m}분 전`,b>5?`${H(h+1)}시 ${b-5}분 전`:'',`${H(h+1)}시 ${b+5}분 전`],()=>`${H(h+ri(0,1))}시 ${pick([5,10,15,20])}분 전`),
    explain:[`지금은 ${fmt(h,m)}이에요.`,`${b}분이 더 지나면 ${H(h+1)}시가 돼요 → ${ans}`],hl:(m/5)%12}}
function qAfter(){const h=ri(1,12),m=ri(0,11)*5,d=pick(LISTS.after),t0=tot(h,m),e=fromTot(t0+d),ans=fmt(e.h,e.m),toN=60-m;
  let ex;if(m+d<60)ex=[`${fmt(h,m)}에서 긴바늘이 ${d}분만큼 돌면 ${ans}`];
  else if(d<=60)ex=[`${fmt(h,m)}에서 ${toN}분 뒤면 ${H(h+1)}시`,d-toN?`남은 ${d-toN}분을 더 가면 ${ans}`:`딱 ${ans}가 돼요`];
  else ex=[`1시간 뒤면 ${fmt(h+1,m)}`,`남은 ${d-60}분을 더 가면 ${ans}`];
  return {kind:'after',text:`지금 시각에서 <b style="color:var(--min);font-weight:400">${dur(d)}</b> 뒤는<br>몇 시 몇 분일까요?`,clock:t0,end:t0+d,answer:ans,
    options:options(ans,[m+d>=60?fmt(h,(m+d)%60):'',fmtT(t0+d+10),fmtT(t0-d),fmtT(t0+d-10),fmtT(t0+d+60)],()=>fmtT(t0+ri(1,20)*5)),explain:ex}}
function qElapsed(){const h=ri(1,11),m=ri(0,11)*5,d=pick(LISTS.elapsed),t0=tot(h,m),e=fromTot(t0+d),ans=dur(d);
  let ex;if(m+d<60)ex=[`긴바늘이 ${m}분에서 ${e.m}분까지 → ${e.m}-${m} = ${d}분`];
  else if(d<60)ex=[`${H(h+1)}시까지 ${60-m}분, 그 뒤로 ${e.m}분`,`${60-m}+${e.m} = ${d}분`];
  else ex=[`1시간 지나면 ${fmt(h+1,m)}`,`거기서 ${d-60}분 더 → ${ans}`];
  return {kind:'choice',text:'걸린 시간은 얼마일까요?',pair:[t0,t0+d],answer:ans,
    options:options(ans,[dur(Math.abs(e.m-m)||60),dur(d+10),d>10?dur(d-10):'',d<60?dur(d+60):dur(d-60)],()=>dur(ri(2,24)*5)),explain:ex}}
function qHourMin(){if(Math.random()<.5){const a=ri(1,2),b=ri(1,11)*5,v=a*60+b,ans=`${v}분`;
    return {kind:'choice',text:'몇 분일까요?',big:`${a}시간 ${b}분 = <b>?</b>분`,answer:ans,options:options(ans,[`${a*100+b}분`,`${v+10}분`,`${v-10}분`,`${a+b}분`],()=>`${v+ri(-6,6)*5}분`),
      explain:['1시간은 60분이에요.',`${a}시간 ${b}분 = ${Array(a).fill(60).join(' + ')} + ${b} = ${v}분`]}}
  const x=ri(13,35)*5,ans=dur(x);
  return {kind:'choice',text:'몇 시간 몇 분일까요?',big:`${x}분 = <b>?</b>`,answer:ans,options:options(ans,[x>=100?`${Math.floor(x/100)}시간 ${x%100}분`:'',dur(x+10),dur(x-10),`${Math.floor(x/60)+1}시간 ${x%60}분`],()=>dur(x+ri(-5,5)*5)),
    explain:['60분이 1시간이에요.',`${x}분 = ${Math.floor(x/60)*60}분 + ${x%60}분 → ${ans}`]}}
function qReadSec(){const h=ri(1,12),m=ri(0,59),s=ri(1,11)*5,ans=fmt(h,m,s);
  return {kind:'read',text:'시계가 가리키는 시각은?<small>초바늘(초록)까지 읽어 보세요</small>',clock:tot(h,m),sec:s,answer:ans,
    options:options(ans,[fmt(h,m,s/5),fmt(h,s<60?s:0,m),fmt(h+1,m,s),fmt(h,m,(s+5)%60||5)],()=>fmt(h,ri(0,59),ri(1,11)*5)),explain:[hourLine(h,m),minLine(m),secLine(s)],hl:-1}}
function qSec(){if(Math.random()<.5){const m=ri(1,3),s=ri(1,11)*5,v=m*60+s,ans=`${v}초`;
    return {kind:'choice',text:'몇 초일까요?',big:`${m}분 ${s}초 = <b>?</b>초`,answer:ans,options:options(ans,[`${m*100+s}초`,`${v+10}초`,`${v-10}초`,`${m+s}초`],()=>`${v+ri(-6,6)*5}초`),
      explain:['1분은 60초예요.',`${m}분 ${s}초 = ${Array(m).fill(60).join(' + ')} + ${s} = ${v}초`]}}
  const x=ri(13,47)*5,ans=secF(x);
  return {kind:'choice',text:'몇 분 몇 초일까요?',big:`${x}초 = <b>?</b>`,answer:ans,options:options(ans,[x>=100?`${Math.floor(x/100)}분 ${x%100}초`:'',secF(x+10),secF(x-10),`${Math.floor(x/60)+1}분 ${x%60}초`],()=>secF(x+ri(-5,5)*5)),
    explain:['60초가 1분이에요.',`${x}초 = ${Math.floor(x/60)*60}초 + ${x%60}초 → ${ans}`]}}
function qCalc(){if(Math.random()<.5){const m1=ri(1,4),s1=ri(4,11)*5,s2=ri(Math.ceil((60-s1)/5),11)*5,t=m1*60+s1+s2,ans=secF(t);
    return {kind:'choice',text:'시간을 더해 보세요',big:`${m1}분 ${s1}초 + ${s2}초 = <b>?</b>`,answer:ans,options:options(ans,[`${m1}분 ${s1+s2}초`,secF(t+10),secF(t-10),secF(t+60)],()=>secF(t+ri(-6,6)*5)),
      explain:[`${s1}초 + ${s2}초 = ${s1+s2}초 = 1분 ${s1+s2-60}초`,`${m1}분 + 1분 ${s1+s2-60}초 = ${ans}`]}}
  const m1=ri(2,5),s1=ri(0,5)*5,s2=ri(s1/5+1,11)*5,t=m1*60+s1-s2,ans=secF(t);
  return {kind:'choice',text:'시간을 빼 보세요',big:`${m1}분${s1?` ${s1}초`:''} − ${s2}초 = <b>?</b>`,answer:ans,options:options(ans,[`${m1}분 ${s2-s1}초`,secF(t+10),secF(t-10),secF(t-60)],()=>secF(t+ri(-6,6)*5)),
    explain:[`${s1}초에서 ${s2}초는 뺄 수 없으니 1분을 60초로 바꿔요.`,`${m1-1}분 ${s1+60}초 − ${s2}초 = ${ans}`]}}
// 단계의 plan {문제 종류: 개수} → 섞은 목록 (개수 합이 questionsPerStage 보다 적으면 앞에서부터 다시 채움)
function plan(st){const p=Object.entries(STAGES[st-1].plan).flatMap(([k,n])=>Array(n).fill(k));const out=shuffle(p.slice());while(out.length<QN)out.push(pick(p));return out.slice(0,QN)}
const GEN={read:qRead,set:qSet,before:qBefore,after:qAfter,elapsed:qElapsed,hourmin:qHourMin,readsec:qReadSec,sec:qSec,calc:qCalc};

// ---------- 시계 그림 (SVG)
function makeClock(main){const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg'),P=(r,deg)=>{const a=deg*Math.PI/180;return [(Math.sin(a)*r).toFixed(2),(-Math.cos(a)*r).toFixed(2)]};
  svg.setAttribute('viewBox','-128 -128 256 256');svg.setAttribute('class','clock');svg.setAttribute('role','img');
  let h='<circle r="111" fill="#c98a4a"/><circle r="104" fill="#e9b46a"/><circle r="99" fill="#fffdf7"/>';
  for(let i=0;i<60;i++){const big=i%5===0,[x1,y1]=P(big?85:90,i*6),[x2,y2]=P(96,i*6);h+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${big?'#2d3a55':'#a3abbf'}" stroke-width="${big?3.2:1.6}" stroke-linecap="round"/>`}
  for(let n=1;n<=12;n++){const [x,y]=P(70,n*30);h+=`<text x="${x}" y="${(+y+8).toFixed(2)}" text-anchor="middle" font-size="23" fill="#2d3a55">${n}</text>`}
  h+='<g class="helpers">';for(let n=0;n<12;n++){const [x,y]=P(118,n*30);h+=`<g data-n="${n}"><circle cx="${x}" cy="${y}" r="9.5" fill="#1fa38f"/><text x="${x}" y="${(+y+4).toFixed(2)}" text-anchor="middle" font-size="11" fill="#fff">${n*5}</text></g>`}h+='</g>';
  h+='<g class="hh"><line y1="10" y2="-50" stroke="#2d3a55" stroke-width="10" stroke-linecap="round"/></g><g class="mh"><line y1="13" y2="-82" stroke="#ef6a3a" stroke-width="6.5" stroke-linecap="round"/></g>';
  h+='<g class="sh"><line y1="17" y2="-90" stroke="#2fae5a" stroke-width="2.6" stroke-linecap="round"/><circle r="4.5" fill="#2fae5a"/></g><circle r="6.5" fill="#2d3a55"/><circle r="2.2" fill="#fffdf7"/>';
  svg.innerHTML=h;const hh=svg.querySelector('.hh'),mh=svg.querySelector('.mh'),sh=svg.querySelector('.sh'),hel=svg.querySelector('.helpers');
  const o={svg,t:0,s:null,
    set(t,s){o.t=((t%720)+720)%720;o.s=s==null?null:s;const ss=s||0;hh.setAttribute('transform',`rotate(${(o.t*.5+ss/120).toFixed(2)})`);mh.setAttribute('transform',`rotate(${((o.t%60)*6+ss*.1).toFixed(2)})`);
      sh.style.display=s==null?'none':'';if(s!=null)sh.setAttribute('transform',`rotate(${s*6})`);svg.setAttribute('aria-label','아날로그 시계')},
    helpers(on,hl=-1){hel.style.display=on?'':'none';for(const g of hel.children)g.firstChild.setAttribute('fill',+g.dataset.n===hl?'#ef6a3a':'#1fa38f')}};
  o.helpers(false);return o}
const mc=makeClock(true),c1=makeClock(),c2=makeClock();
$('mainWrap').appendChild(mc.svg);$('c1').appendChild(c1.svg);$('c2').appendChild(c2.svg);

// 바늘 끌기
let drag=null;
function pt(e){const r=mc.svg.getBoundingClientRect(),k=256/r.width,x=(e.clientX-r.left)*k-128,y=(e.clientY-r.top)*k-128;let a=Math.atan2(x,-y)*180/Math.PI;if(a<0)a+=360;return {a,r:Math.hypot(x,y)}}
const angDist=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
function moveHand(p,jump){const t=mc.t;let nt=t;
  if(drag==='m'){const step=cur.snap,nm=Math.round(p.a/6/step)*step%60;if(jump)nt=Math.floor(t/60)*60+nm;else{let d=nm-t%60;if(d>30)d-=60;if(d<-30)d+=60;nt=t+d}}
  else{const m=t%60;let hr=Math.round(p.a/30-m/60);hr=((hr%12)+12)%12;nt=hr*60+m}
  if(((nt%720)+720)%720!==t){mc.set(nt);snd('tick')}}
mc.svg.addEventListener('pointerdown',e=>{if(!cur||cur.kind!=='set'||locked)return;const p=pt(e);if(p.r<12||p.r>112)return;e.preventDefault();
  drag=(p.r<62&&angDist(p.a,mc.t*.5)<40)?'h':'m';try{mc.svg.setPointerCapture(e.pointerId)}catch(_){}moveHand(p,true)});
mc.svg.addEventListener('pointermove',e=>{if(drag)moveHand(pt(e),false)});
const endDrag=()=>{drag=null};mc.svg.addEventListener('pointerup',endDrag);mc.svg.addEventListener('pointercancel',endDrag);

// 바늘 움직이는 애니메이션
let anim=null;
function animTo(clock,t1,ms,cb){anim={clock,t0:clock.t,d:t1-clock.t,st:performance.now(),ms,cb,s:clock.s}}
function loop(now){if(anim){const k=Math.min(1,(now-anim.st)/anim.ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;anim.clock.set(anim.t0+anim.d*e,anim.s);if(k>=1){const cb=anim.cb;anim=null;cb&&cb()}}requestAnimationFrame(loop)}
requestAnimationFrame(loop);

// ---------- 진행
let stage=1,qs=[],qi=0,cur=null,results=[],locked=false,usedKeys=new Set(),autoT=0;
function startStage(n){stage=n;qs=plan(n);qi=0;results=[];usedKeys=new Set();$('stgName').textContent=`${n}단계 · ${STAGES[n-1].short}`;show(null);nextQ()}
function nextQ(){clearTimeout(autoT);$('fb').hidden=true;locked=false;anim=null;
  let q,g=0;do{q=GEN[qs[qi]](stage)}while(usedKeys.has(q.text+q.answer+(q.big||''))&&++g<30);usedKeys.add(q.text+q.answer+(q.big||''));cur=q;render()}
function render(){const q=cur;$('qText').innerHTML='<div>'+q.text+'</div>';
  const dots=$('dots');dots.innerHTML='';for(let i=0;i<QN;i++){const d=document.createElement('i');if(results[i])d.className=results[i];else if(i===qi)d.className='now';dots.appendChild(d)}
  $('mainWrap').hidden=q.clock==null;$('pairWrap').hidden=!q.pair;$('bigText').hidden=!q.big;$('helpBtn').hidden=q.clock==null&&!q.pair;
  if(q.clock!=null){mc.set(q.clock,q.sec);mc.helpers(helpOn)}
  if(q.pair){c1.set(q.pair[0]);c2.set(q.pair[1]);c1.helpers(helpOn);c2.helpers(helpOn)}
  if(q.big)$('bigText').innerHTML=q.big;
  const A=$('ans');A.innerHTML='';A.className='ans';
  if(q.kind==='set'){A.classList.add('setmode');A.innerHTML='<div class="legend"><span><i style="background:var(--hour)"></i>짧은바늘 = 시</span><span><i style="background:var(--min)"></i>긴바늘 = 분</span></div><button class="btn" id="checkBtn">다 맞췄어요!</button>';$('checkBtn').onclick=checkSet;return}
  for(const o of q.options){const b=document.createElement('button');b.className='opt';b.textContent=o;b.onclick=()=>choose(b,o);A.appendChild(b)}}
function choose(btn,val){if(locked)return;locked=true;const ok=val===cur.answer;
  for(const b of $('ans').children)if(b.textContent===cur.answer)b.classList.add('right');if(!ok)btn.classList.add('wrong');
  if(cur.kind==='after')animTo(mc,cur.end,1200,null);
  finishQ(ok)}
function checkSet(){if(locked)return;locked=true;drag=null;const ok=mc.t===cur.target;
  if(!ok){let d=((cur.target-mc.t)%720+720)%720;if(d>360)d-=720;animTo(mc,mc.t+d,900,null)}
  finishQ(ok)}
function finishQ(ok){results[qi]=ok?'o':'x';const dots=$('dots').children;dots[qi].className=results[qi];
  const fb=$('fb');fb.className='fb'+(ok?'':' bad');fb.hidden=false;
  if(cur.clock!=null&&(!ok||cur.kind==='read'))mc.helpers(true,cur.hl);if(cur.pair){c1.helpers(true);c2.helpers(true)}
  if(ok){snd('coin');$('fbTitle').textContent=PRAISE[Math.floor(Math.random()*PRAISE.length)]+' '+cur.answer;$('fbText').innerHTML=cur.kind==='after'||cur.kind==='set'&&stage>1?'<span>'+cur.explain.join('</span><span>')+'</span>':'';
    $('nextBtn').textContent=qi<QN-1?'다음 문제':'결과 보기';autoT=setTimeout(advance,cur.kind==='after'?2600:1500)}
  else{snd('bad');$('fbTitle').textContent='정답은 '+cur.answer;$('fbText').innerHTML='<span>'+cur.explain.join('</span><span>')+'</span>';$('nextBtn').textContent=qi<QN-1?'다음 문제':'결과 보기'}
  $('nextBtn').focus({preventScroll:true})}
function advance(){clearTimeout(autoT);if(qi>=QN-1)return endStage();qi++;nextQ()}
$('nextBtn').onclick=advance;
addEventListener('keydown',e=>{if(!$('fb').hidden&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();advance()}});

function endStage(){clearTimeout(autoT);$('fb').hidden=true;const ok=results.filter(r=>r==='o').length,s=D.starThresholds.filter(n=>ok>=n).length;
  stars[stage]=Math.max(stars[stage]||0,s);store.set('clockStars',stars);store.set('clockStarTotal',Object.values(stars).reduce((a,b)=>a+b,0));
  $('eStars').innerHTML='★'.repeat(s)+'<span style="color:#e8dcc6;text-shadow:none">'+'★'.repeat(3-s)+'</span>';
  $('eTitle').textContent=D.endTitles[s];
  $('eTxt').textContent=`${stage}단계 · ${STAGES[stage-1].name}\n${QN}문제 중 ${ok}개 맞혔어요`+(s<3?` · 별 3개는 ${QN}개 모두!`:'');
  $('eTxt').style.whiteSpace='pre-line';
  $('nextStageBtn').hidden=stage>=STAGES.length||s===0;$('nextStageBtn').textContent=`${stage+1}단계로`;
  show('endOv');snd(s>=2?'win':s===1?'level':'lose');($('nextStageBtn').hidden?$('againBtn'):$('nextStageBtn')).focus()}
$('nextStageBtn').onclick=()=>startStage(stage+1);$('againBtn').onclick=()=>startStage(stage);$('pickBtn').onclick=()=>{renderStages();show('titleOv')};
$('menuBtn').onclick=()=>{clearTimeout(autoT);$('fb').hidden=true;renderStages();show('titleOv')};
$('helpBtn').onclick=()=>{helpOn=!helpOn;store.set('clockHelp',helpOn);$('helpBtn').setAttribute('aria-pressed',helpOn);if(locked)return;mc.helpers(helpOn);c1.helpers(helpOn);c2.helpers(helpOn);snd('select')};
$('helpBtn').setAttribute('aria-pressed',helpOn);

function show(id){for(const o of ['titleOv','endOv'])$(o).hidden=o!==id}
function renderStages(){const el=$('stages');el.innerHTML='';const next=STAGES.findIndex((_,i)=>!stars[i+1]);
  STAGES.forEach((S,i)=>{const n=i+1,s=stars[n]||0,b=document.createElement('button');b.className='stage'+(i===next?' next':'');
    b.innerHTML=`<span class="no">${n}</span><span class="nm">${S.name}${S.grade3?'<span class="tag3">3학년</span>':''}<small>${S.sub}${S.grade?' · '+S.grade:''}</small></span><span class="st">${'★'.repeat(s)}<span class="off">${'★'.repeat(3-s)}</span></span>`;
    b.onclick=()=>{snd('click');startStage(n)};el.appendChild(b)})}
renderStages();
})();
