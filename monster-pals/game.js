/* 몬스터 친구들 — 풀숲에서 몬스터를 잡고 키워 관장을 이기는 모험. 데이터는 data.json */
Arcade.boot(D=>{
const snd=(...a)=>window.Arcade&&Arcade.play(...a);
const $=id=>document.getElementById(id),cv=$('c'),ctx=cv.getContext('2d');
const SAVE='monsterPals.save',SP=D.species,MV=D.moves,TY=D.types;
const josa=s=>s.replace(/(.)(\(Lv\d+\))?(은\(는\)|이\(가\)|을\(를\)|와\(과\)|\(으\)로)/g,(all,ch,lv,j)=>{let c=ch,bat;const src=lv?lv.slice(-2,-1):ch;if(/[가-힣]/.test(src)){const k=(src.charCodeAt(0)-0xac00)%28;bat=k!==0;if(j==='(으)로'&&k===8)bat=false}else if(/\d/.test(src))bat=(j==='(으)로'?'036':'013678').includes(src);else return all;
  const pairs={'은(는)':['은','는'],'이(가)':['이','가'],'을(를)':['을','를'],'와(과)':['과','와'],'(으)로':['으로','로']};return ch+(lv||'')+pairs[j][bat?0:1]});
const setT=(el,v)=>{v=josa(String(v));if(el.textContent!==v)el.textContent=v};
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],clamp=(v,a,b)=>v<a?a:v>b?b:v,ri=(a,b)=>Math.floor(rand(a,b+1));
let Wd=0,Ht=0,DPR=1,T=48;function fit(){DPR=Math.min(devicePixelRatio||1,2);Wd=innerWidth;Ht=innerHeight;cv.width=Wd*DPR;cv.height=Ht*DPR;T=Math.max(30,Math.min(Wd,Ht)/(Wd<Ht?9:10));fitB()}
const bc=$('bc'),bx=bc.getContext('2d');function fitB(){bc.width=Wd*DPR;bc.height=Ht*DPR}
addEventListener('resize',fit);

// ---------- 몬스터
const learnLv=D.learn;
function stats(m){const b=SP[m.sp],l=m.lv;m.max=Math.floor(b.hp*l/12)+l+10;m.atk=Math.floor(b.atk*l/25)+5;m.def=Math.floor(b.def*l/25)+5;m.spd=Math.floor(b.spd*l/25)+5}
function makeMon(sp,lv){const m={sp,lv,exp:0,moves:SP[sp].moves.filter((_,i)=>lv>=learnLv[i])};stats(m);m.hp=m.max;return m}
const need=l=>l*10;
const nm=m=>SP[m.sp].name;
const eff=(mt,dt)=>mt==='none'?1:((D.chart[mt]||{})[dt]||1);

// ---------- 몬스터 그리기 (우리만의 모양)
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>clamp(Math.round(k<0?v*(1+k):v+(255-v)*k),0,255);return `rgb(${f(r)},${f(g)},${f(b)})`}
function drawMon(c,sp,x,y,s,flip,t=0,hurt=0){const S0=SP[sp],col=S0.color,dk=shade(col,-.35),lt=shade(col,.45);
  c.save();c.translate(x,y);if(flip)c.scale(-1,1);const bob=Math.sin(t*3)*s*.03;c.translate(0,bob);
  if(hurt>0&&Math.floor(hurt*20)%2)c.globalAlpha=.35;
  c.fillStyle='rgba(0,0,0,.15)';c.beginPath();c.ellipse(0,s*.48-bob,s*.42,s*.08,0,0,7);c.fill();
  c.lineWidth=Math.max(2,s*.03);c.strokeStyle=dk;
  const body=(fn)=>{c.fillStyle=col;c.beginPath();fn();c.fill();c.stroke()};
  const eyes=(ex,ey,r)=>{for(const k of [-1,1]){c.fillStyle='#fff';c.beginPath();c.arc(ex+k*r*1.6,ey,r,0,7);c.fill();c.fillStyle='#2a2420';c.beginPath();c.arc(ex+k*r*1.6+r*.25,ey+r*.1,r*.55,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(ex+k*r*1.6+r*.45,ey-r*.25,r*.2,0,7);c.fill()}
    c.fillStyle='rgba(255,120,140,.45)';for(const k of [-1,1]){c.beginPath();c.ellipse(ex+k*r*3,ey+r*1.4,r*.7,r*.4,0,0,7);c.fill()}};
  const sh=S0.shape;
  if(sh==='blob'){body(()=>{c.moveTo(-s*.4,s*.42);c.quadraticCurveTo(-s*.46,-s*.3,0,-s*.32);c.quadraticCurveTo(s*.46,-s*.3,s*.4,s*.42);c.closePath()});
    c.fillStyle=lt;c.beginPath();c.ellipse(-s*.15,-s*.12,s*.08,s*.12,-.5,0,7);c.fill();
    if(S0.type==='bolt'){c.fillStyle='#fff6a0';c.beginPath();c.moveTo(0,-s*.32);c.lineTo(-s*.08,-s*.5);c.lineTo(s*.02,-s*.46);c.lineTo(-s*.02,-s*.62);c.lineTo(s*.1,-s*.42);c.lineTo(0,-s*.45);c.closePath();c.fill()}
    if(S0.type==='wind'){c.fillStyle='#fff';for(const k of [-1,0,1]){c.beginPath();c.arc(k*s*.18,-s*.3,s*.12,0,7);c.fill()}}
    if(S0.type==='water'){c.fillStyle=lt;c.beginPath();c.moveTo(0,-s*.55);c.quadraticCurveTo(s*.1,-s*.38,0,-s*.32);c.quadraticCurveTo(-s*.1,-s*.38,0,-s*.55);c.fill()}
    eyes(0,s*.02,s*.07)}
  else if(sh==='dog'){c.fillStyle=col;c.strokeStyle=dk;
    c.beginPath();c.moveTo(-s*.32,s*.05);c.quadraticCurveTo(-s*.55,-s*.1,-s*.5,-s*.32);c.stroke();
    if(S0.type==='fire'){c.fillStyle='#ffd23f';c.beginPath();c.ellipse(-s*.5,-s*.36,s*.07,s*.12,.3,0,7);c.fill()}
    body(()=>c.ellipse(-s*.05,s*.18,s*.34,s*.24,0,0,7));
    c.fillStyle=col;for(const k of [-.25,.15]){c.beginPath();c.roundRect(k*s,s*.3,s*.12,s*.16,s*.05);c.fill();c.stroke()}
    body(()=>c.arc(s*.18,-s*.12,s*.26,0,7));
    c.fillStyle=dk;for(const k of [-1,1]){c.beginPath();c.moveTo(s*.18+k*s*.12,-s*.3);c.lineTo(s*.18+k*s*.26,-s*.5);c.lineTo(s*.18+k*s*.02,-s*.36);c.fill()}
    c.fillStyle=lt;c.beginPath();c.ellipse(s*.3,-s*.04,s*.12,s*.08,0,0,7);c.fill();c.fillStyle='#2a2420';c.beginPath();c.arc(s*.38,-s*.07,s*.035,0,7);c.fill();
    eyes(s*.14,-s*.16,s*.05)}
  else if(sh==='sprout'){body(()=>c.ellipse(0,s*.14,s*.36,s*.32,0,0,7));
    c.strokeStyle='#4a8a2a';c.lineWidth=s*.04;c.beginPath();c.moveTo(0,-s*.17);c.lineTo(0,-s*.34);c.stroke();
    c.fillStyle=S0.type==='grass'?'#7ad84a':lt;for(const k of [-1,1]){c.beginPath();c.ellipse(k*s*.13,-s*.38,s*.15,s*.07,k*-.5,0,7);c.fill()}
    if(SP[sp].name.includes('콩')){c.fillStyle='#a0d860';c.beginPath();c.arc(0,-s*.44,s*.06,0,7);c.fill()}
    c.fillStyle=lt;c.beginPath();c.ellipse(0,s*.24,s*.2,s*.14,0,0,7);c.fill();
    eyes(0,s*.05,s*.06)}
  else if(sh==='mouse'){c.strokeStyle=dk;c.lineWidth=s*.04;c.beginPath();c.moveTo(-s*.3,s*.3);c.lineTo(-s*.45,s*.18);c.lineTo(-s*.38,s*.06);c.lineTo(-s*.52,-s*.06);c.stroke();c.lineWidth=Math.max(2,s*.03);
    for(const k of [-1,1]){c.fillStyle=col;c.beginPath();c.arc(k*s*.24,-s*.28,s*.15,0,7);c.fill();c.stroke();c.fillStyle='#ffb8c8';c.beginPath();c.arc(k*s*.24,-s*.28,s*.08,0,7);c.fill()}
    body(()=>c.ellipse(0,s*.1,s*.32,s*.34,0,0,7));
    c.fillStyle=dk;c.beginPath();c.moveTo(-s*.08,-s*.22);c.lineTo(s*.04,-s*.22);c.lineTo(-s*.02,-s*.1);c.fill();
    eyes(0,s*.02,s*.06);c.fillStyle='#ff6a6a';for(const k of [-1,1]){c.beginPath();c.arc(k*s*.2,s*.14,s*.05,0,7);c.fill()}}
  else if(sh==='rock'){body(()=>{c.moveTo(-s*.4,s*.42);c.lineTo(-s*.42,0);c.lineTo(-s*.25,-s*.3);c.lineTo(s*.1,-s*.36);c.lineTo(s*.38,-s*.12);c.lineTo(s*.42,s*.42);c.closePath()});
    c.strokeStyle=dk;c.beginPath();c.moveTo(s*.2,-s*.25);c.lineTo(s*.12,-s*.1);c.lineTo(s*.22,0);c.moveTo(-s*.3,s*.2);c.lineTo(-s*.18,s*.3);c.stroke();
    if(SP[sp].name.includes('모래')){c.fillStyle=lt;c.beginPath();c.ellipse(0,-s*.32,s*.22,s*.07,0,0,7);c.fill()}
    eyes(0,s*.05,s*.065)}
  else if(sh==='bird'){c.fillStyle=dk;c.beginPath();c.moveTo(-s*.2,s*.15);c.lineTo(-s*.5,s*.05);c.lineTo(-s*.42,s*.25);c.fill();
    body(()=>c.ellipse(0,s*.08,s*.32,s*.3,0,0,7));
    c.fillStyle=lt;c.beginPath();c.ellipse(0,s*.18,s*.2,s*.16,0,0,7);c.fill();
    const fl=Math.sin(t*8)*.3;c.fillStyle=dk;c.beginPath();c.ellipse(-s*.22,s*.06,s*.18,s*.09,-.6+fl,0,7);c.fill();
    c.fillStyle=S0.type==='fire'?'#ffd23f':dk;for(const k of [0,1,2]){c.beginPath();c.ellipse(-s*.05+k*s*.07,-s*.25,s*.035,s*.1,-.3+k*.3,0,7);c.fill()}
    c.fillStyle='#ffa83a';c.beginPath();c.moveTo(s*.26,-s*.02);c.lineTo(s*.42,s*.04);c.lineTo(s*.26,s*.1);c.fill();
    eyes(s*.08,-s*.04,s*.055)}
  c.restore()}
function monCanvas(sp,px){const k=document.createElement('canvas');k.width=k.height=px*2;const g=k.getContext('2d');drawMon(g,sp,px,px*1.05,px*1.7,false);return k}

// ---------- 저장
const fresh=()=>({party:[],box:[],x:0,y:0,coins:D.start.coins,balls:D.start.balls,beaten:{},badge:0,seen:{},caught:{},started:false});
let G=Object.assign(fresh(),(()=>{try{return JSON.parse(localStorage.getItem(SAVE))||{}}catch(_){return {}}})());
const store=()=>{try{localStorage.setItem(SAVE,JSON.stringify(G))}catch(_){}};
for(const m of [...G.party,...G.box])stats(m);

// ---------- 맵
const map=D.map.map(r=>r.split('')),MH=map.length,MW=map[0].length;
let start={x:2,y:2},homes=[];const tAt={};
for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const c=map[y][x];if(c==='S'){start={x,y};map[y][x]='.'}if(c==='H')homes.push({x,y})}
for(const [id,[x,y]] of Object.entries(D.trainerPos))tAt[y*MW+x]=id;
const walkable=c=>c==='.'||c==='"';
const P={x:0,y:0,fx:0,fy:0,dir:[0,1],moving:0,walk:0};
let state='title',time=0,tst=0;
function toast(t){const e=$('toast');e.textContent=josa(t);e.classList.add('on');tst=2.2}
function hud(){setT($('hBadge'),G.badge);setT($('hCoin'),G.coins);setT($('hBall'),G.balls);setT($('hDex'),Object.keys(G.caught).length+'/'+Object.keys(SP).length)}
function nearestHome(){let b=homes[0],bd=1e9;for(const h of homes){const d=Math.abs(h.x-P.x)+Math.abs(h.y-P.y);if(d<bd){bd=d;b=h}}return b}

// ---------- 입력
const keys={};let stick=null;
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Escape'&&state==='walk')openParty(false)});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
cv.addEventListener('pointerdown',e=>{if(state!=='walk')return;stick={ox:e.clientX,oy:e.clientY,dx:0,dy:0,id:e.pointerId};const s=$('stick');s.style.left=e.clientX+'px';s.style.top=e.clientY+'px';s.style.display='block';s.firstElementChild&&(s.firstElementChild.style.transform='')});
addEventListener('pointermove',e=>{if(!stick||e.pointerId!==stick.id)return;let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy;const l=Math.hypot(dx,dy);if(l>40){dx*=40/l;dy*=40/l}stick.dx=dx;stick.dy=dy;const k=$('stick').querySelector('i');if(k)k.style.transform=`translate(${dx}px,${dy}px)`});
const endStick=e=>{if(stick&&e.pointerId===stick.id){stick=null;$('stick').style.display='none'}};
addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
function wantDir(){if(keys.arrowleft||keys.a)return [-1,0];if(keys.arrowright||keys.d)return [1,0];if(keys.arrowup||keys.w)return [0,-1];if(keys.arrowdown||keys.s)return [0,1];
  if(stick&&Math.hypot(stick.dx,stick.dy)>12)return Math.abs(stick.dx)>Math.abs(stick.dy)?[Math.sign(stick.dx),0]:[0,Math.sign(stick.dy)];return null}

// ---------- 걷기
let bumpCd=0;
function tryMove(d){P.dir=d;const nx=P.x+d[0],ny=P.y+d[1];const c=map[ny]&&map[ny][nx];
  if(walkable(c)){P.fx=P.x;P.fy=P.y;P.x=nx;P.y=ny;P.moving=1;return}
  if(bumpCd>0)return;bumpCd=.5;
  if(c==='T'||c==='L'){talkTrainer(tAt[ny*MW+nx]);return}
  if(c==='H'){talkHome();return}}
function arrive(){G.x=P.x;G.y=P.y;if(map[P.y][P.x]==='"'&&Math.random()<D.encounter)wildBattle()}
function updateWalk(dt){bumpCd-=dt;if(P.moving>0){P.moving-=dt*5.5;P.walk+=dt*10;if(P.moving<=0){P.moving=0;arrive()}return}const d=wantDir();if(d&&state==='walk')tryMove(d)}

// ---------- 말 걸기
function talk(name,txt,btns){$('tName').textContent=name;$('tTxt').innerHTML=josa(txt);const b=$('tBtns');b.innerHTML='';
  for(const [label,fn,soft] of btns){const e=document.createElement('button');e.className='btn'+(soft?' soft':'');e.textContent=label;e.onclick=()=>{snd('click');$('talkOv').hidden=true;state='walk';fn&&fn()};b.appendChild(e)}
  $('talkOv').hidden=false;state='talk';stick=null;$('stick').style.display='none'}
function healAll(){for(const m of G.party)m.hp=m.max}
function talkHome(){healAll();store();snd('coin');
  talk('몬스터 쉼터','몬스터들이 모두 기운을 되찾았어요! 💖<br>몬스터 공은 <b>'+D.shop.ball+'코인</b>이에요. (가진 코인 '+G.coins+')',[['공 1개 사기',()=>buy(1)],['공 5개 사기',()=>buy(5)],['괜찮아요',null,1]])}
function buy(n){const c=D.shop.ball*n;if(G.coins<c){toast('코인이 모자라요');snd('bad');return}G.coins-=c;G.balls+=n;store();hud();toast('몬스터 공 '+n+'개!');snd('coin')}
const trainerDone=()=>Object.keys(D.trainers).filter(k=>k!=='L').every(k=>G.beaten[k]);
function talkTrainer(id){const tr=D.trainers[id];if(!tr)return;
  if(G.beaten[id]){talk(tr.name,id==='L'?'정말 멋진 대결이었어! 배지를 소중히 해 줘. 이제 도감을 채워 볼까?':'너 정말 강하구나! 다음에 또 붙자.',[['좋아요',null]]);return}
  if(id==='L'&&!trainerDone()){const left=Object.keys(D.trainers).filter(k=>k!=='L'&&!G.beaten[k]).length;talk(tr.name,'마을 트레이너 <b>'+left+'명</b>을 더 이기고 오렴!',[['알겠어요',null]]);return}
  if(!G.party.some(m=>m.hp>0)){talk(tr.name,'몬스터들이 지쳐 있네. 쉼터에 먼저 다녀와!',[['네',null]]);return}
  talk(tr.name,tr.say,[['대결!',()=>trainerBattle(id)],['나중에',null,1]])}

// ---------- 대결
let B=null;const seq=[];let msgT=0,cur=null;
const act=()=>G.party[B.mi],foe=()=>B.foes[B.fi];
function seen(sp){G.seen[sp]=1}
function openBattle(){seq.length=0;cur=null;state='battle';stick=null;$('stick').style.display='none';$('battle').hidden=false;$('menu').hidden=true;B.mi=G.party.findIndex(m=>m.hp>0);B.anim={me:0,foe:0,mhp:act().hp,fhp:foe().hp,shake:0,ball:null,hurtM:0,hurtF:0,fxs:[]};seen(foe().sp);snd('go')}
function wildBattle(){if(!G.party.some(m=>m.hp>0))return;const zone=[...D.wild].reverse().find(z=>P.y>=z.from)||D.wild[0];
  const sp=pick(zone.list);B={wild:true,foes:[makeMon(sp,ri(zone.lv[0],zone.lv[1]))],fi:0};openBattle();
  say('야생 '+nm(foe())+'(Lv'+foe().lv+')이(가) 나타났다!');say('가랏, '+nm(act())+'!');}
function trainerBattle(id){const tr=D.trainers[id];B={wild:false,id,tr,foes:tr.team.map(([s,l])=>makeMon(s,l)),fi:0};openBattle();
  say(tr.name+'이(가) 대결을 걸어왔다!');say(tr.name+'은(는) '+nm(foe())+'을(를) 내보냈다!');say('가랏, '+nm(act())+'!')}
function say(m,fn){seq.push(m&&typeof m==='object'?m:{m,fn})}
function sayNow(list){seq.unshift(...list)}
function showMenu(){const m=act();$('menu').hidden=false;const mv=$('moves');mv.innerHTML='';
  for(const id of m.moves){const k=MV[id],b=document.createElement('button');const col=k.type==='none'?'#e06aa8':TY[k.type].color;b.style.background=col;
    const e=k.type==='none'?'':eff(k.type,SP[foe().sp].type);b.innerHTML=k.name+'<small>'+(k.type==='none'?'체력 회복':TY[k.type].name+' · 위력 '+k.power+(e>1?' · 효과 굉장!':e<1?' · 별로…':''))+'</small>';
    b.onclick=()=>choose({k:'move',id});mv.appendChild(b)}
  $('aBall').disabled=!B.wild||G.balls<=0;$('aBall').textContent='⚪ 공 던지기 ('+G.balls+')';$('aRun').disabled=!B.wild;
  setT($('msg'),nm(m)+'은(는) 무엇을 할까?')}
$('aBall').onclick=()=>choose({k:'ball'});$('aRun').onclick=()=>choose({k:'run'});$('aSwap').onclick=()=>openParty(true);
$('msg').onclick=()=>{if(cur)msgT=Math.min(msgT,.12)};
function foeMove(){const f=foe(),m=act();let best=null,bs=-1;for(const id of f.moves){const k=MV[id];let s;
    if(k.heal)s=f.hp<f.max*.35?120:0;else s=k.power*eff(k.type,SP[m.sp].type)*(k.type===SP[f.sp].type?1.2:1);s*=rand(.7,1.3);if(s>bs){bs=s;best=id}}return best}
function damage(a,d,k){const st=k.type===SP[a.sp].type?1.2:1,e=eff(k.type,SP[d.sp].type);let dmg=Math.floor(((2*a.lv/5+2)*k.power*a.atk/d.def)/30+2);dmg=Math.max(1,Math.floor(dmg*st*e*rand(.85,1)));return {dmg,e}}
function attack(mine,id){return ()=>{const a=mine?act():foe(),d=mine?foe():act();if(!a||!d||a.hp<=0||d.hp<=0||(mine&&a!==B.actor)||(!mine&&a!==B.foeActor))return null;
  const k=MV[id];const who=(mine?'':(B.wild?'야생 ':'상대 '))+nm(a);
  if(k.heal){const h=Math.ceil(a.max*k.heal);a.hp=Math.min(a.max,a.hp+h);snd('coin');return who+'은(는) '+k.name+'! 체력을 회복했다.'}
  const {dmg,e}=damage(a,d,k);d.hp=Math.max(0,d.hp-dmg);B.anim[mine?'hurtF':'hurtM']=.6;B.anim[mine?'me':'foe']=1;B.anim.fxs.push({mine,type:k.type,t:0});snd(e>1?'boom':'hit');
  const after=[];if(e>1)after.push({m:'효과가 굉장했다!'});else if(e<1)after.push({m:'효과가 별로인 것 같다…'});
  if(d.hp<=0)after.push(...faint(!mine));sayNow(after);return who+'의 '+k.name+'!'}}
function faint(meDown){const out=[];
  if(!meDown){const f=foe();out.push({m:(B.wild?'야생 ':'상대 ')+nm(f)+'은(는) 쓰러졌다!',fn:()=>snd('pop')});
    const gain=Math.floor((f.lv*6+5)*(B.wild?1:1.5));out.push(...giveExp(act(),gain));
    for(const m of G.party)if(m!==act()&&m.hp>0)out.push(...giveExp(m,Math.floor(gain*.3),true));
    if(!B.wild&&B.fi<B.foes.length-1)out.push({m:'',fn:()=>{B.fi++;seen(foe().sp);B.anim.fhp=foe().hp;B.foeActor=null},skip:1},{m:()=>B.tr.name+'은(는) '+nm(foe())+'을(를) 내보냈다!'});
    else out.push({m:'',fn:()=>winBattle(),skip:1})}
  else{out.push({m:nm(act())+'은(는) 쓰러졌다…',fn:()=>snd('bad')})}
  return out}
function giveExp(m,g,quiet){const out=[];if(!quiet)out.push({m:nm(m)+'은(는) 경험치 '+g+'을(를) 얻었다!'});m.exp+=g;
  while(m.exp>=need(m.lv)&&m.lv<50){m.exp-=need(m.lv);const oldMax=m.max;m.lv++;stats(m);m.hp+=m.max-oldMax;const lv=m.lv;out.push({m:nm(m)+'의 레벨이 '+lv+'(으)로 올랐다! 🎉',fn:()=>snd('level')});
    SP[m.sp].moves.forEach((id,i)=>{if(learnLv[i]===lv&&!m.moves.includes(id)){m.moves.push(id);out.push({m:nm(m)+'은(는) 새 기술 「'+MV[id].name+'」을(를) 배웠다!'})}})}
  return out}
function winBattle(){if(B.wild){sayNow([{m:'',fn:()=>endBattle('win'),skip:1}]);return}
  const tr=B.tr;G.beaten[B.id]=1;G.coins+=tr.prize;const list=[{m:tr.name+'을(를) 이겼다! 상금 '+tr.prize+'코인을 받았다.',fn:()=>snd('win')}];
  if(B.id==='L'){G.badge=1;list.push({m:'🏅 별빛 배지를 받았다! 축하해요!',fn:()=>{snd('goal');Arcade.record&&Arcade.record('monsterPalsBadge',1)}})}
  list.push({m:'',fn:()=>endBattle('win'),skip:1});sayNow(list)}
function endBattle(r){seq.length=0;cur=null;$('battle').hidden=true;$('menu').hidden=true;state='walk';
  if(r==='lose'){const h=nearestHome();P.x=h.x;P.y=h.y+1;P.moving=0;G.coins=Math.floor(G.coins/2);healAll();talk('몬스터 쉼터','눈앞이 캄캄해졌다… 쉼터로 돌아와 몬스터들이 회복했어요. (코인 절반을 잃었어요)',[['다시 힘내기',null]])}
  if(r==='caught'&&G.badge===0&&Object.keys(G.caught).length>=6)toast('도감이 점점 채워져요!');
  G.x=P.x;G.y=P.y;store();hud();B=null}
function choose(c){$('menu').hidden=true;B.actor=act();B.foeActor=foe();const fm=foeMove();
  if(c.k==='move'){const mineFirst=act().spd>=foe().spd*rand(.9,1.1);const a=attack(true,c.id),b=attack(false,fm);
    if(mineFirst){say(a);say(b)}else{say(b);say(a)}}
  else if(c.k==='ball'){G.balls--;hud();say(throwBall())}
  else if(c.k==='run'){const ok=Math.random()<clamp(.5+(act().spd-foe().spd)/40,.3,.95);if(ok){say('무사히 도망쳤다!',()=>snd('jump'));say({m:'',fn:()=>endBattle('run'),skip:1})}else{say('도망칠 수 없었다!');say(attack(false,fm))}}
  else if(c.k==='swap'){const prev=act();B.mi=c.i;B.actor=act();B.anim.mhp=act().hp;say(nm(prev)+', 돌아와! 가랏, '+nm(act())+'!');say(attack(false,fm))}}
function throwBall(){return ()=>{const f=foe();const chance=clamp((1-f.hp/f.max*.72)*.85+(f.lv<act().lv?.08:0),.12,.95);const caught=Math.random()<chance;
  B.anim.ball={t:0,caught,shakes:caught?3:ri(0,2)};snd('jump');
  if(caught){sayNow([{m:'...',wait:2.2},{m:'잡았다! '+nm(f)+'이(가) 친구가 되었다! 🎉',fn:()=>{snd('win');f.exp=0;G.caught[f.sp]=1;Arcade.record&&Arcade.record('monsterPalsCaught',Object.keys(G.caught).length);if(G.party.length<6)G.party.push(f);else{G.box.push(f);toast('보관함으로 보냈어요')}}},{m:'',fn:()=>endBattle('caught'),skip:1}])}
  else{const fm=foeMove();sayNow([{m:'...',wait:.6+B.anim.ball.shakes*.5},{m:'앗, 공에서 빠져나왔다!',fn:()=>{B.anim.ball=null;snd('bad')}},attackStep(fm)])}
  return nm(act())+'의 트레이너는 몬스터 공을 던졌다!'}}
const attackStep=fm=>({m:attack(false,fm)});
function runSeq(dt){if(cur){msgT-=dt;if(msgT>0)return;cur=null}
  while(seq.length){let s=seq.shift();if(typeof s==='function')s={m:s};if(typeof s==='string')s={m:s};let m=s.m;if(typeof m==='function')m=m();
    if(s.fn)s.fn();if(!B)return;if(s.skip||m===null||m==='')continue;setT($('msg'),m);cur=s;msgT=s.wait||1.15;return}
  // 순서가 끝남
  if(!$('partyOv').hidden)return;
  if(act().hp<=0){if(G.party.some(m=>m.hp>0)){openParty(true,true)}else{say('싸울 수 있는 몬스터가 없다…');say({m:'',fn:()=>endBattle('lose'),skip:1})}return}
  if($('menu').hidden&&$('partyOv').hidden)showMenu()}

// ---------- 몬스터 목록
let pForce=false,pBattle=false,pSel=0;
function card(m,i,sel,box){const b=document.createElement('button');b.className='pm'+(sel?' sel':'')+(m.hp<=0?' dead':'');b.appendChild(monCanvas(m.sp,28));
  const inf=document.createElement('div');inf.className='info';inf.innerHTML='<div class="nm">'+nm(m)+' <span class="sub">Lv'+m.lv+' · '+TY[SP[m.sp].type].name+'</span></div><div class="sub">체력 '+m.hp+'/'+m.max+'</div><div class="bar"><i style="width:'+(m.hp/m.max*100)+'%;background:'+(m.hp<m.max*.3?'#ff5a4a':'#4ac45a')+'"></i></div>';b.appendChild(inf);return b}
function openParty(battle,force){pBattle=battle;pForce=!!force;pSel=0;renderParty();$('partyOv').hidden=false;if(!battle)state='party'}
function renderParty(){const pl=$('plist'),bl=$('blist');pl.innerHTML='';bl.innerHTML='';
  $('pTitle').textContent=pBattle?(pForce?'다음 몬스터를 골라요':'누구로 바꿀까?'):'내 몬스터';
  $('pHint').textContent=pBattle?'체력이 남은 몬스터를 눌러요':'누르면 맨 앞(먼저 나가는 몬스터)으로 · 보관함 몬스터를 누르면 고른 몬스터와 바꿔요';
  G.party.forEach((m,i)=>{const b=card(m,i,!pBattle&&i===pSel);b.onclick=()=>{snd('click');
    if(pBattle){if(m.hp<=0||i===B.mi){toast(m.hp<=0?'쓰러진 몬스터예요':'이미 나와 있어요');return}$('partyOv').hidden=true;
      if(pForce){B.mi=i;B.anim.mhp=m.hp;say('가랏, '+nm(m)+'!')}else choose({k:'swap',i});return}
    if(pSel===i&&i>0){G.party.splice(i,1);G.party.unshift(m);pSel=0;store()}else pSel=i;renderParty()};pl.appendChild(b)});
  $('boxH').hidden=pBattle||!G.box.length;
  if(!pBattle)G.box.forEach((m,i)=>{const b=card(m,i,false,true);b.onclick=()=>{snd('click');const p=G.party[pSel];G.party[pSel]=m;G.box[i]=p;store();renderParty()};bl.appendChild(b)});
  $('pClose').hidden=pForce;}
$('pClose').onclick=()=>{snd('click');$('partyOv').hidden=true;if(!pBattle)state='walk';else showMenu()};
$('partyBtn').onclick=()=>{if(state==='walk')openParty(false)};
$('pauseBtn').onclick=()=>{if(state!=='walk')return;talk('메뉴','진행은 자동으로 저장돼요.',[['계속하기',null],['처음 화면',()=>{state='title';showTitle()},1]])};

// ---------- 시작 화면
function showTitle(){$('titleOv').hidden=false;state='title';const st=$('starters');st.innerHTML='';
  const has=G.started&&G.party.length;$('contBtn').hidden=!has;$('newBtn').hidden=!has;st.hidden=!!has;
  if(!has)for(const sp of D.starters){const b=document.createElement('button');b.className='mon';b.appendChild(monCanvas(sp,36));
    const nb=document.createElement('b');nb.textContent=SP[sp].name;const ts=document.createElement('span');ts.className='ty';ts.style.background=TY[SP[sp].type].color;ts.textContent=TY[SP[sp].type].name;b.appendChild(nb);b.appendChild(ts);
    b.onclick=()=>{snd('click');G=fresh();G.started=true;const m=makeMon(sp,D.start.level);G.party=[m];G.caught[sp]=1;G.seen[sp]=1;G.x=start.x;G.y=start.y;store();begin();toast(SP[sp].name+'와(과) 모험 시작!')};st.appendChild(b)}}
$('contBtn').onclick=()=>{snd('click');begin()};
$('newBtn').onclick=()=>{snd('click');G.started=false;G.party=[];showTitle()};
function begin(){$('titleOv').hidden=true;P.x=G.x||start.x;P.y=G.y||start.y;if(!walkable(map[P.y][P.x])){P.x=start.x;P.y=start.y}P.moving=0;state='walk';hud();snd('go')}

// ---------- 그리기: 마을
function drawWorld(){const W=Wd,H=Ht;ctx.setTransform(DPR,0,0,DPR,0,0);
  const t=P.moving>0?P.moving:0;const px=P.x-(P.x-P.fx)*t,py=P.y-(P.y-P.fy)*t;
  const ox=W/2-(px+.5)*T,oy=H/2-(py+.5)*T;ctx.fillStyle='#3a7a3a';ctx.fillRect(0,0,W,H);
  const x0=Math.max(0,Math.floor(-ox/T)),x1=Math.min(MW-1,Math.ceil((W-ox)/T)),y0=Math.max(0,Math.floor(-oy/T)),y1=Math.min(MH-1,Math.ceil((H-oy)/T));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const c=map[y][x],X=ox+x*T,Y=oy+y*T;
    ctx.fillStyle=(x+y)%2?'#8ad27a':'#84cc74';ctx.fillRect(X,Y,T+1,T+1);
    if(c==='"'){ctx.fillStyle='#4aa84a';ctx.fillRect(X+1,Y+1,T-2,T-2);ctx.fillStyle='#2f8a3a';const sw=Math.sin(time*2+x+y)*T*.04;
      for(let k=0;k<3;k++){const bx0=X+T*(.2+k*.3);ctx.beginPath();ctx.moveTo(bx0-T*.1,Y+T*.85);ctx.lineTo(bx0+sw,Y+T*.25);ctx.lineTo(bx0+T*.1,Y+T*.85);ctx.fill()}}
    else if(c==='~'){ctx.fillStyle='#4aa8e8';ctx.fillRect(X,Y,T+1,T+1);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.beginPath();const w=Math.sin(time*2+x)*T*.08;ctx.moveTo(X+T*.2,Y+T*.5+w);ctx.quadraticCurveTo(X+T*.5,Y+T*.35+w,X+T*.8,Y+T*.5+w);ctx.stroke()}
    else if(c==='#'){ctx.fillStyle='#6a4a2a';ctx.fillRect(X+T*.42,Y+T*.6,T*.16,T*.32);ctx.fillStyle='#2e7a34';ctx.beginPath();ctx.arc(X+T*.5,Y+T*.45,T*.42,0,7);ctx.fill();ctx.fillStyle='#3e9a44';ctx.beginPath();ctx.arc(X+T*.4,Y+T*.36,T*.2,0,7);ctx.fill()}
    else if(c==='H'){ctx.fillStyle='#fff3dc';ctx.fillRect(X+T*.08,Y+T*.4,T*.84,T*.56);ctx.fillStyle='#ff6a5a';ctx.beginPath();ctx.moveTo(X-T*.02,Y+T*.45);ctx.lineTo(X+T*.5,Y+T*.02);ctx.lineTo(X+T*1.02,Y+T*.45);ctx.fill();
      ctx.fillStyle='#ff6a8a';ctx.fillRect(X+T*.44,Y+T*.5,T*.12,T*.3);ctx.fillRect(X+T*.35,Y+T*.59,T*.3,T*.12)}
    else if(c==='T'||c==='L'){const id=tAt[y*MW+x];person(X+T/2,Y+T/2,id==='L'?'#8a4ae0':['#3a8ae0','#e04a8a','#2aa8a0','#e0a02a'][+id.slice(1)-1],G.beaten[id],id==='L')}}
  // 나
  const bob=P.moving>0?Math.abs(Math.sin(P.walk))*T*.06:0;person(ox+(px+.5)*T,oy+(py+.5)*T-bob,'#ff8a3a',false,false,true);
  // 앞장선 몬스터 졸졸
  if(G.party[0]){const fx=px-P.dir[0]*.75,fy=py-P.dir[1]*.75;drawMon(ctx,G.party[0].sp,ox+(fx+.5)*T,oy+(fy+.55)*T,T*.62,P.dir[0]<0,time)}}
function person(x,y,col,done,star,me){const s=T;ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y+s*.38,s*.26,s*.08,0,0,7);ctx.fill();
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x-s*.2,y-s*.02,s*.4,s*.38,s*.12);ctx.fill();
  ctx.fillStyle='#ffd8b0';ctx.beginPath();ctx.arc(x,y-s*.18,s*.2,0,7);ctx.fill();
  ctx.fillStyle=me?'#3a6ae0':'#5a3a2a';ctx.beginPath();ctx.arc(x,y-s*.24,s*.2,Math.PI,0);ctx.fill();if(me){ctx.fillRect(x-s*.02,y-s*.27,s*.26,s*.06)}
  ctx.fillStyle='#2a2420';const lx=me?P.dir[0]*s*.06:0;for(const k of [-1,1]){ctx.beginPath();ctx.arc(x+k*s*.07+lx,y-s*.15,s*.03,0,7);ctx.fill()}
  if(star){ctx.fillStyle='#ffd23f';ctx.font=(s*.34)+'px Jua';ctx.textAlign='center';ctx.fillText('★',x,y-s*.42)}
  if(!me&&!done&&!star){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+s*.32,y-s*.42,s*.13,0,7);ctx.fill();ctx.fillStyle='#e0402a';ctx.font=(s*.22)+'px Jua';ctx.textAlign='center';ctx.fillText('!',x+s*.32,y-s*.34)}}

// ---------- 그리기: 대결
function drawBattle(dt){const W=Wd,H=Ht,A=B.anim;bx.setTransform(DPR,0,0,DPR,0,0);
  const g=bx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#bfe6ff');g.addColorStop(.55,'#e8f6d8');g.addColorStop(1,'#a8d890');bx.fillStyle=g;bx.fillRect(0,0,W,H);
  const portrait=H>W,box=Math.min(H*.42,290),avail=H-box;const s=Math.min(W*.36,avail*.42,220);
  const fxp=W*(portrait?.7:.68),fyp=avail*(portrait?.36:.4),mxp=W*(portrait?.3:.32),myp=avail*(portrait?.8:.82);
  for(const [x,y] of [[fxp,fyp],[mxp,myp]]){bx.fillStyle='#8ac46a';bx.beginPath();bx.ellipse(x,y+s*.45,s*.62,s*.16,0,0,7);bx.fill()}
  for(const k of ['me','foe'])A[k]=Math.max(0,A[k]-dt*4);for(const k of ['hurtM','hurtF'])A[k]=Math.max(0,A[k]-dt);
  const f=foe(),m=act();
  A.fhp+=(f.hp-A.fhp)*Math.min(1,dt*6);A.mhp+=(m.hp-A.mhp)*Math.min(1,dt*6);
  const lunge=k=>Math.sin(A[k]*Math.PI)*s*.25;
  if(!A.ball||!A.ball.caught||A.ball.t<.6)drawMon(bx,f.sp,fxp-lunge('foe'),fyp+lunge('foe')*.4,s*.92,true,time,A.hurtF);
  if(m.hp>0||A.hurtM>0)drawMon(bx,m.sp,mxp+lunge('me'),myp-lunge('me')*.4,s,false,time+1,A.hurtM);
  // 공
  if(A.ball){const b=A.ball;b.t+=dt;const k=Math.min(1,b.t/.6);let x=mxp+(fxp-mxp)*k,y=myp+(fyp+s*.2-myp)*k-Math.sin(k*Math.PI)*s*.8;
    if(b.t>.6){const sh=b.t-.6,n=Math.floor(sh/.5);x=fxp+(n<b.shakes?Math.sin(sh*18)*s*.05:0);y=fyp+s*.3}ball(bx,x,y,s*.12)}
  // 기술 효과
  for(const e of A.fxs){e.t+=dt;const tx=e.mine?fxp:mxp,ty=e.mine?fyp:myp;const col=e.type==='none'?'#ff8ac8':TY[e.type].color;bx.globalAlpha=Math.max(0,1-e.t*2);bx.fillStyle=col;
    for(let i=0;i<7;i++){const a=i/7*6.28+e.t*3,r=s*(.15+e.t*.8);bx.beginPath();bx.arc(tx+Math.cos(a)*r,ty+Math.sin(a)*r*.7,s*.07,0,7);bx.fill()}bx.globalAlpha=1}
  A.fxs=A.fxs.filter(e=>e.t<.5);
  // 체력 상자
  const bw=Math.min(W*.44,260);infoBox(portrait?10:W*.06,10+(portrait?40:0),bw,f,A.fhp,!B.wild);infoBox(W-bw-(portrait?10:W*.06),avail-78,bw,m,A.mhp,false,true);
  if(!B.wild){bx.fillStyle='#5a4a30';bx.font='15px Jua';bx.textAlign='left';const left=B.foes.length-B.fi;bx.fillText('남은 몬스터 '+'●'.repeat(left)+'○'.repeat(B.fi),portrait?14:W*.06+4,portrait?88+40:94)}}
function ball(c,x,y,r){c.fillStyle='#ff5a4a';c.beginPath();c.arc(x,y,r,Math.PI,0);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x,y,r,0,Math.PI);c.fill();c.strokeStyle='#2a2420';c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,7);c.moveTo(x-r,y);c.lineTo(x+r,y);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(x,y,r*.3,0,7);c.fill();c.stroke()}
function infoBox(x,y,w,m,hp,tr,mine){const c=bx;c.fillStyle='rgba(255,251,234,.95)';c.strokeStyle='#5a4a30';c.lineWidth=3;c.beginPath();c.roundRect(x,y,w,mine?68:56,14);c.fill();c.stroke();
  c.fillStyle='#33302a';c.font='19px Jua';c.textAlign='left';c.fillText(nm(m),x+12,y+24);c.textAlign='right';c.fillText('Lv'+m.lv,x+w-12,y+24);
  const ty=TY[SP[m.sp].type];c.fillStyle=ty.color;c.font='13px Jua';c.textAlign='left';const tw=c.measureText(nm(m)).width;
  c.font='19px Jua';const nw=c.measureText(nm(m)).width;c.beginPath();c.roundRect(x+18+nw,y+10,34,18,8);c.fill();c.fillStyle='#fff';c.font='13px Jua';c.textAlign='center';c.fillText(ty.name,x+35+nw,y+24);
  const r=clamp(hp/m.max,0,1);c.fillStyle='#e0d8c4';c.beginPath();c.roundRect(x+12,y+34,w-24,11,6);c.fill();c.fillStyle=r<.25?'#ff5a4a':r<.5?'#ffc23a':'#4ac45a';c.beginPath();c.roundRect(x+12,y+34,(w-24)*r,11,6);c.fill();
  if(mine){c.fillStyle='#5a4a30';c.font='13px Jua';c.textAlign='left';c.fillText('체력 '+Math.round(hp)+'/'+m.max,x+12,y+61);c.textAlign='right';const er=m.exp/need(m.lv);c.fillText('경험치',x+w-80,y+61);c.fillStyle='#e0d8c4';c.fillRect(x+w-74,y+54,62,6);c.fillStyle='#3a9aff';c.fillRect(x+w-74,y+54,62*er,6)}
  if(!mine&&B.wild&&G.caught[m.sp]){ball(c,x+w-60,y+17,6)}}

// ---------- 루프
let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;if(tst>0){tst-=dt;if(tst<=0)$('toast').classList.remove('on')}
  if(state==='walk'||state==='talk'||state==='party'||state==='title'){updateWalk(dt);drawWorld()}
  if(state==='battle'&&B){runSeq(dt);if(B)drawBattle(dt)}
  requestAnimationFrame(frame)}
fit();showTitle();if(G.started&&G.party.length){P.x=G.x;P.y=G.y}else{P.x=start.x;P.y=start.y}hud();requestAnimationFrame(frame);
window.__mp={G:()=>G,B:()=>B,P,choose,tryMove,wildBattle,trainerBattle,state:()=>state,openParty,renderParty,map,makeMon,talkHome};
});
