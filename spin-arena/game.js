/* 팽이 대전 회오리 — 위에서 내려다본 팽이 배틀
 * 부품·상대·규칙·물리 숫자는 data.json. 모든 이름과 디자인은 이 게임만의 창작.
 * 저장: spinTop(내 팽이), spinBest(한 대회 최고 승수), spinChamp(우승 횟수) */
Arcade.boot(D => {
const $ = id => document.getElementById(id), snd = (...a) => Arcade.play(...a), TAU = Math.PI * 2;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const byId = (list, id) => list.find(x => x.id === id) || list[0];
const AR = D.arena, PH = D.physics, R = AR.radius, RAD = 26, WW = 400;

/* ---------- 팽이 만들기 ---------- */
const champs = () => store.get('spinChamp', 0);
const ringsOpen = () => D.rings.filter(r => !r.unlock || champs() >= r.unlock);
function statsOf(b) {
  const r = byId(D.rings, b.ring), w = byId(D.weights, b.weight), t = byId(D.tips, b.tip);
  return { atk: r.atk, def: Math.max(1, r.def + w.def), mass: w.mass, sta: t.sta * w.sta, mob: t.mob * w.spd, fric: t.fric, shape: r.shape, skill: r.skill };
}
const nameOf = b => b.name || `${byId(D.rings, b.ring).word} ${(D.emblems.find(e => e[1] === b.emblem) || D.emblems[0])[0]}`;
let my = store.get('spinTop', null);
if (!my || !D.rings.some(r => r.id === my.ring)) my = { ring: 'wing', weight: 'mid', tip: 'ball', emblem: D.emblems[0][1], color: D.colors[1] };
if (!ringsOpen().some(r => r.id === my.ring)) my.ring = 'wing';

/* ---------- 그리기: 팽이 ---------- */
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => clamp(Math.round(c * k), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function ringPath(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'round') { ctx.arc(0, 0, r, 0, TAU); return; }
  const spikes = { claw: 3, wing: 2, gear: 6 }[shape] || 3;
  for (let i = 0; i < spikes; i++) {
    const a = i / spikes * TAU;
    if (shape === 'gear') { for (let k = 0; k < 4; k++) { const aa = a + k / 4 * TAU / spikes, rr = k === 1 || k === 2 ? r * 1.08 : r * .86; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } }
    else if (shape === 'claw') { ctx.lineTo(Math.cos(a) * r * .84, Math.sin(a) * r * .84); ctx.quadraticCurveTo(Math.cos(a + .35) * r * 1.25, Math.sin(a + .35) * r * 1.25, Math.cos(a + .75) * r * 1.02, Math.sin(a + .75) * r * 1.02); ctx.lineTo(Math.cos(a + .9) * r * .8, Math.sin(a + .9) * r * .8); }
    else { ctx.lineTo(Math.cos(a - .25) * r * .78, Math.sin(a - .25) * r * .78); ctx.quadraticCurveTo(Math.cos(a + .4) * r * 1.3, Math.sin(a + .4) * r * 1.3, Math.cos(a + 1.3) * r * .86, Math.sin(a + 1.3) * r * .86); }
  }
  ctx.closePath();
}
function drawTop(ctx, b, x, y, ang, { r = RAD, spin = 100, shield = 0, alpha = 1, tilt = 0 } = {}) {
  const st = statsOf(b);
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(4, 7, r * 1.05, r * .9, 0, 0, TAU); ctx.fill();
  if (tilt) ctx.scale(1 - tilt * .12, 1);
  if (shield > 0) { ctx.strokeStyle = `rgba(120,230,255,${.4 + .3 * Math.sin(performance.now() / 90)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, TAU); ctx.stroke(); }
  const blur = clamp(spin / 100, 0, 1);
  for (let k = 2; k >= 0; k--) {            // 잔상
    ctx.save(); ctx.rotate(ang - k * .22 * blur); ctx.globalAlpha = alpha * (k ? .22 * blur : 1);
    ringPath(ctx, st.shape, r * 1.08); ctx.fillStyle = shade(b.color, .62); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.stroke();
    ctx.restore();
  }
  ctx.rotate(ang);
  const g = ctx.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r * .8); g.addColorStop(0, shade(b.color, 1.35)); g.addColorStop(1, b.color);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * .74, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * .5, 0, TAU * .7); ctx.stroke();
  ctx.font = `${Math.round(r * .78)}px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.emblem, 0, 2);
  ctx.restore();
}

/* ---------- 경기장 ---------- */
const cv = $('c'), ctx = cv.getContext('2d'); let S = 1, DPR = 1;
function resize() {
  const box = $('stage').getBoundingClientRect(), sz = Math.max(200, Math.min(box.width, box.height));
  DPR = Math.min(devicePixelRatio || 1, 2); S = sz / WW;
  cv.style.width = sz + 'px'; cv.style.height = sz + 'px'; cv.width = Math.round(sz * DPR); cv.height = Math.round(sz * DPR);
}
addEventListener('resize', resize);
const inPocket = a => AR.pockets.some(p => { let d = Math.abs(((a - p) % 360 + 540) % 360 - 180); return d < AR.pocketHalfWidth; });
function drawArena() {
  const c = WW / 2;
  const g = ctx.createRadialGradient(c, c, 10, c, c, R + 14); g.addColorStop(0, '#f3f6ff'); g.addColorStop(.75, '#c9d3f2'); g.addColorStop(1, '#8794c6');
  ctx.fillStyle = '#0c0f26'; ctx.beginPath(); ctx.arc(c, c, R + 18, 0, TAU); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(80,95,160,.25)'; ctx.lineWidth = 2; for (const rr of [R * .33, R * .66]) { ctx.beginPath(); ctx.arc(c, c, rr, 0, TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(c, c); ctx.rotate(performance.now() / 4000); ctx.strokeStyle = 'rgba(255,138,42,.35)'; ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 28, i * TAU / 3, i * TAU / 3 + 1.4); ctx.stroke(); } ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(c, c, R + 5, 0, TAU); ctx.stroke();
  AR.pockets.forEach(p => { const a = p * Math.PI / 180, w = AR.pocketHalfWidth * Math.PI / 180; ctx.strokeStyle = '#0c0f26'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(c, c, R + 6, a - w, a + w); ctx.stroke();
    ctx.fillStyle = '#ff8a2a'; ctx.font = '15px Jua,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OUT', c + Math.cos(a) * (R - 30), c + Math.sin(a) * (R - 30)); });
}

/* ---------- 경기 상태 ---------- */
let mode = 'menu', run = null, round = null, last = 0, shake = 0, parts = [], banner = null, paused = false;
function makeTop(b, side) {
  const s = statsOf(b);
  return { b, s, side, x: side ? 95 : -95, y: side ? -35 : 35, vx: 0, vy: 0, spin: 0, max: 100, ang: Math.random() * TAU, burst: 0, alive: true, fin: null, shield: 0, skillUsed: false, cd: 0, trail: [], fly: 0, scale: 1 };
}
function newRound() {
  const opp = D.opponents[run.idx];
  round = { me: makeTop(my, 0), op: makeTop(opp, 1), t: 0, phase: 'aim', power: null, cd: 0, word: -1, aiSkillAt: Math.random() < opp.skillChance ? rnd(3, 11) : 1e9, over: false };
  hud(); $('launchBox').hidden = false; $('skillBtn').hidden = true; $('nextBtn').hidden = true; $('launchBtn').disabled = false; banner = { t: 0, text: '게이지를 보고 발사!', small: true };
  mode = 'battle'; $('app').classList.remove('menu');
}
function launch(p) {
  const r = round, opp = D.opponents[run.idx], po = rnd(opp.power[0], opp.power[1]);
  [[r.me, p], [r.op, po]].forEach(([t, pw]) => {
    t.max = 55 + 45 * pw + (pw > .9 ? 6 : 0); t.spin = t.max; const sp = 110 + 90 * pw, d = Math.hypot(t.x, t.y);
    t.vx = -t.y / d * sp; t.vy = t.x / d * sp;
  });
  r.phase = 'fight'; r.t = 0; snd('whoosh'); snd('go');
  $('launchBox').hidden = true; $('skillBtn').hidden = false; skillBtn();
  banner = { t: 0, text: p > .88 ? '완벽한 발사!' : p > .6 ? '좋아요!' : '발사!' };
}
function skillBtn() { const sk = D.skills[round.me.s.skill]; $('skillBtn').textContent = `${sk.name}`; $('skillBtn').disabled = round.me.skillUsed || round.phase !== 'fight' || round.t < 2 || !round.me.alive; }
function useSkill(t) {
  if (t.skillUsed || !t.alive || round.phase !== 'fight') return; t.skillUsed = true;
  const o = t === round.me ? round.op : round.me, k = t.s.skill;
  if (k === 'dash') { const dx = o.x - t.x, dy = o.y - t.y, d = Math.hypot(dx, dy) || 1; t.vx += dx / d * 290; t.vy += dy / d * 290; snd('zap'); }
  if (k === 'shield') { t.shield = 4; snd('freeze'); }
  if (k === 'charge') { t.spin = Math.min(t.max, t.spin + 30); snd('power'); }
  sparks(WW / 2 + t.x, WW / 2 + t.y, t.side ? '#ff9a7a' : '#9ad6ff', 14);
  banner = { t: 0, text: (t.side ? '상대 ' : '') + D.skills[k].name, small: !!t.side };
  if (t === round.me) skillBtn();
}
function sparks(x, y, col, n = 10) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 260); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.25, .55), col, r: rnd(1.5, 3.5) }); } }
function finish(t, how) {
  if (!t.alive) return; t.alive = false; t.fin = how;
  if (how === 'burst') { snd('crack'); snd('boom'); for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + rnd(0, 1); parts.push({ x: WW / 2 + t.x, y: WW / 2 + t.y, vx: Math.cos(a) * 180 + t.vx * .4, vy: Math.sin(a) * 180 + t.vy * .4, life: 1.2, shard: true, col: shade(t.b.color, .62), rot: rnd(0, TAU), vr: rnd(-12, 12) }); } shake = .5; }
  if (how === 'out') { snd('whoosh'); t.fly = 1; shake = .3; }
  if (how === 'spin') snd('thud');
}

/* ---------- 물리 ---------- */
function stepTop(t, dt) {
  if (!t.alive) { if (t.fly > 0) { t.x += t.vx * dt; t.y += t.vy * dt; t.fly -= dt * 1.3; t.scale = 1 + (1 - t.fly) * .6; } return; }
  // 경사(가운데로) + 축이 바닥을 밀며 나아가는 힘 + 회전 때문에 휘어 도는 힘 → 꽃잎 모양으로 돌아다녀요
  const k = clamp(t.spin / 100, 0, 1), v0 = Math.hypot(t.vx, t.vy), hx = v0 > 4 ? t.vx / v0 : Math.cos(t.ang), hy = v0 > 4 ? t.vy / v0 : Math.sin(t.ang);
  const thrust = t.s.mob * PH.mobAccel * k, w = t.s.mob * PH.turn * k;
  let ax = -AR.slope * t.x + hx * thrust - hy * w * v0, ay = -AR.slope * t.y + hy * thrust + hx * w * v0;
  if (t.spin < PH.wobbleAt) { const w = 70 * (1 - t.spin / PH.wobbleAt); ax += rnd(-w, w); ay += rnd(-w, w); }
  t.vx += ax * dt; t.vy += ay * dt; t.vx *= 1 - PH.drag * dt; t.vy *= 1 - PH.drag * dt;
  t.x += t.vx * dt; t.y += t.vy * dt;
  const sp = Math.hypot(t.vx, t.vy);
  t.spin -= dt * (PH.spinDecay / t.s.sta + sp * PH.moveDecay * t.s.fric);
  t.shield = Math.max(0, t.shield - dt); t.cd = Math.max(0, t.cd - dt);
  t.ang += Math.min(t.spin / 100 * 30, 26) * dt;
  // 벽과 아웃 포켓
  const r = Math.hypot(t.x, t.y);
  if (r > R - RAD) {
    const nx = t.x / r, ny = t.y / r, vr = t.vx * nx + t.vy * ny, a = (Math.atan2(t.y, t.x) * 180 / Math.PI + 360) % 360;
    if (inPocket(a) && vr > AR.outSpeed) { finish(t, 'out'); return; }
    if (vr > 0) { t.vx -= 1.5 * vr * nx; t.vy -= 1.5 * vr * ny; t.spin -= vr * .01; if (vr > 60) { snd('bounce'); sparks(WW / 2 + nx * R, WW / 2 + ny * R, '#ffd84a', 5); } }
    t.x = nx * (R - RAD); t.y = ny * (R - RAD);
  }
  if (t.spin <= 0) { t.spin = 0; finish(t, 'spin'); }
}
function collide(a, b) {
  if (!a.alive || !b.alive) return;
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, min = RAD * 2;
  if (d >= min) return;
  const nx = dx / d, ny = dy / d, ma = a.s.mass * (a.shield ? 1.5 : 1), mb = b.s.mass * (b.shield ? 1.5 : 1);
  const ov = min - d; a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb); b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
  const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  const K = PH.kick * (a.s.atk * a.spin + b.s.atk * b.spin) / 1000;
  const J = (vrel > 0 ? (1 + PH.restitution) * vrel / (1 / ma + 1 / mb) : 0) + K;
  a.vx -= J / ma * nx; a.vy -= J / ma * ny; b.vx += J / mb * nx; b.vy += J / mb * ny;
  if (a.cd > 0 || b.cd > 0) return;
  a.cd = b.cd = .16;
  const impact = Math.max(0, vrel) + K * .5;
  const hurt = (t, o) => {
    const ratio = clamp(o.s.atk / (t.s.def * (t.shield ? 2 : 1)), .4, 2.2), dmg = (2 + impact * .05) * ratio * (.4 + o.spin / 100);
    t.spin -= dmg * PH.hitSpin; t.burst += dmg * PH.hitBurst * clamp(1.4 - t.spin / t.max, .4, 1.4);
    return dmg;
  };
  const da = hurt(a, b), db = hurt(b, a);
  const cx = WW / 2 + a.x + nx * RAD, cy = WW / 2 + a.y + ny * RAD;
  sparks(cx, cy, '#ffe08a', Math.min(22, 6 + impact / 12));
  snd(impact > 140 ? 'crit' : 'hit'); shake = Math.min(.35, shake + impact / 900);
  if (a.burst >= 100) finish(a, 'burst'); if (b.burst >= 100) finish(b, 'burst');
  if (a.spin <= 0) finish(a, 'spin'); if (b.spin <= 0) finish(b, 'spin');
  return da + db;
}
function physics(dt) {
  const r = round; r.t += dt;
  stepTop(r.me, dt); stepTop(r.op, dt); collide(r.me, r.op);
  if (r.t > r.aiSkillAt || (r.op.s.skill === 'charge' && r.op.spin < 25 && r.t > 3)) { useSkill(r.op); r.aiSkillAt = 1e9; }
  if (r.t > D.rules.timeLimit && r.me.alive && r.op.alive) finish(r.me.spin < r.op.spin ? r.me : r.op, 'spin');
}

/* ---------- 라운드 끝 ---------- */
function roundOver() {
  const r = round; r.phase = 'end'; $('skillBtn').hidden = true;
  const meLost = !r.me.alive, opLost = !r.op.alive;
  let text, sub = '';
  if (meLost && opLost) { text = D.finishText.draw; }
  else {
    const loser = meLost ? r.me : r.op, pts = D.rules.points[loser.fin];
    if (opLost) run.pts[0] += pts; else run.pts[1] += pts;
    text = D.finishText[loser.fin]; sub = `${opLost ? '나' : '상대'} +${pts}점`;
    snd(opLost ? 'goal' : 'bad');
  }
  banner = { t: 0, text, sub, hold: true }; hud();
  const done = run.pts[0] >= D.rules.winPoints || run.pts[1] >= D.rules.winPoints;
  setTimeout(() => { if (done) matchOver(run.pts[0] >= D.rules.winPoints); else { $('nextBtn').hidden = false; $('nextBtn').focus({ preventScroll: true }); } }, done ? 1400 : 700);
}
function matchOver(won) {
  mode = 'menu'; const opp = D.opponents[run.idx];
  if (won) {
    run.idx++; Arcade.record('spinBest', run.idx);
    if (run.idx >= D.opponents.length) {
      const first = champs() === 0; store.set('spinChamp', champs() + 1); snd('win');
      showEnd('🏆', '우승!', `회오리 컵 챔피언이 되었어요!${first ? '<br>새 부품 <b>별 톱니</b>가 열렸어요!' : ''}<br>우승 ${champs()}번`, '대회 다시 나가기', startCup);
    } else { snd('level'); showEnd('🎉', '승리!', `${opp.who}의 <b>${opp.name}</b>을(를) 이겼어요!<br>다음 상대: ${D.opponents[run.idx].title}`, '다음 경기', () => { show('bracketOv'); renderBracket(); }); }
  } else { snd('lose'); showEnd('💫', '아쉬워요!', `${opp.name}에게 졌어요. 팽이를 바꿔 보거나, 발사를 더 세게!`, '다시 도전', () => { run.pts = [0, 0]; show(null); newRound(); }); }
}
function showEnd(e, t, txt, btn, fn) { $('eEmoji').textContent = e; $('eTitle').textContent = t; $('eTxt').innerHTML = txt; $('eMain').textContent = btn; $('eMain').onclick = () => { snd('click'); fn(); }; show('endOv'); }

/* ---------- 화면 ---------- */
const OVS = ['titleOv', 'garageOv', 'bracketOv', 'endOv', 'pauseOv'];
function show(id) { OVS.forEach(o => { $(o).hidden = o !== id; }); $('app').classList.toggle('menu', !round || mode !== 'battle'); }
function hud() {
  const r = round; if (!r) return;
  const dots = n => '●'.repeat(Math.min(n, D.rules.winPoints)) + '○'.repeat(Math.max(0, D.rules.winPoints - n));
  $('meName').textContent = nameOf(my); $('opName').textContent = D.opponents[run.idx].name;
  $('mePts').textContent = dots(run.pts[0]); $('opPts').textContent = dots(run.pts[1]);
  $('meSpin').style.width = clamp(r.me.spin, 0, 100) + '%'; $('opSpin').style.width = clamp(r.op.spin, 0, 100) + '%';
  $('meBurst').style.width = clamp(r.me.burst, 0, 100) + '%'; $('opBurst').style.width = clamp(r.op.burst, 0, 100) + '%';
}
function startCup() { run = { idx: 0, pts: [0, 0] }; show('bracketOv'); renderBracket(); }
function renderBracket() {
  $('bracket').innerHTML = D.opponents.map((o, i) => `<li class="${i < run.idx ? 'done' : i === run.idx ? 'now' : ''}"><span class="e">${o.emblem}</span><span>${o.title} · <b>${o.name}</b><small>${o.who} · ${byId(D.rings, o.ring).name}, ${byId(D.tips, o.tip).name}</small></span><span class="st">${i < run.idx ? '이김 ✓' : i === run.idx ? '다음!' : ''}</span></li>`).join('');
}
$('fightBtn').onclick = () => { snd('click'); run.pts = [0, 0]; show(null); resize(); newRound(); };

/* ---------- 조립소 ---------- */
const prev = $('prevCv'), pctx = prev.getContext('2d');
function renderGarage() {
  const rows = [['ring', '공격 날', ringsOpen()], ['weight', '몸통', D.weights], ['tip', '축', D.tips], ['emblem', '무늬', D.emblems.map(([n, e]) => ({ id: e, name: `${e} ${n}` }))]];
  $('parts').innerHTML = rows.map(([k, lab, list]) => { const cur = list.find(x => x.id === my[k]) || list[0]; return `<div class="part" data-k="${k}"><button data-d="-1" aria-label="${lab} 이전">◀</button><div><span class="k">${lab}</span><b>${cur.name}</b><small>${cur.desc || (cur.mass ? `무게 ${cur.mass}` : '')}</small></div><button data-d="1" aria-label="${lab} 다음">▶</button></div>`; }).join('')
    + (champs() < 1 ? '<small style="color:#7a819c">🔒 대회에서 우승하면 새 날이 열려요</small>' : '');
  $('parts').querySelectorAll('.part button').forEach(b => b.onclick = () => {
    const k = b.parentElement.dataset.k, list = k === 'emblem' ? D.emblems.map(e => ({ id: e[1] })) : k === 'ring' ? ringsOpen() : k === 'weight' ? D.weights : D.tips;
    const i = list.findIndex(x => x.id === my[k]); my[k] = list[(i + +b.dataset.d + list.length) % list.length].id; snd('swap'); renderGarage();
  });
  $('swatches').innerHTML = D.colors.map(c => `<button style="background:${c}" class="${c === my.color ? 'on' : ''}" data-c="${c}" aria-label="색 ${c}"></button>`).join('');
  $('swatches').querySelectorAll('button').forEach(b => b.onclick = () => { my.color = b.dataset.c; snd('select'); renderGarage(); });
  const s = statsOf(my), bars = [['공격', s.atk], ['방어', s.def], ['지구력', Math.round(s.sta * 6.5)], ['속도', Math.round(s.mob * 6)]];
  $('stats').innerHTML = bars.map(([n, v]) => `<span>${n}</span><div class="sb"><i style="width:${clamp(v, 1, 10) * 10}%"></i></div>`).join('') + `<span>기술</span><span>${D.skills[s.skill].name} ${D.skills[s.skill].desc}</span>`;
  $('topName').textContent = nameOf(my);
}
$('doneBtn').onclick = () => { store.set('spinTop', my); snd('level'); if (run && run.idx < D.opponents.length) { show('bracketOv'); renderBracket(); } else { show('titleOv'); title(); } };
const openGarage = () => { snd('click'); renderGarage(); show('garageOv'); };
$('garageBtn').onclick = openGarage; $('bGarage').onclick = openGarage; $('eGarage').onclick = openGarage;
const home = () => { snd('click'); mode = 'menu'; round = null; title(); show('titleOv'); };
$('bHome').onclick = home; $('eHome').onclick = home;
$('goBtn').onclick = () => { snd('click'); startCup(); };
function title() {
  const b = Arcade.best('spinBest'), c = champs();
  $('recTxt').textContent = c ? `우승 ${c}번! 🏆` : b ? `최고 기록: ${b}승 (${D.opponents[Math.min(b, D.opponents.length - 1)].title} 진출)` : '';
}

/* ---------- 입력 ---------- */
const gaugeVal = () => (1 - Math.cos(performance.now() / 1000 * TAU / 1.25)) / 2;
function pressLaunch() {
  if (mode !== 'battle' || !round || round.phase !== 'aim' || round.power != null) return;
  round.power = gaugeVal(); $('launchBtn').disabled = true; snd('count'); round.cd = 0; round.word = 0;
}
$('launchBtn').onclick = pressLaunch;
$('skillBtn').onclick = () => { if (round) useSkill(round.me); };
$('nextBtn').onclick = () => { snd('click'); newRound(); };
$('menuBtn').onclick = () => { if (mode === 'battle') { paused = true; show('pauseOv'); } else { home(); } };
$('resumeBtn').onclick = () => { paused = false; show(null); last = performance.now(); };
$('quitBtn').onclick = () => { paused = false; home(); };
addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.code !== 'Enter') return; if (!OVS.every(o => $(o).hidden)) return; e.preventDefault();
  if (round && round.phase === 'aim') pressLaunch(); else if (round && round.phase === 'fight') useSkill(round.me); else if (!$('nextBtn').hidden) $('nextBtn').click();
});

/* ---------- 루프 ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  // 제목 로고
  const lc = $('logoCv'); if (!$('titleOv').hidden && lc) { const l = lc.getContext('2d'); l.clearRect(0, 0, 200, 200); drawTop(l, my, 100, 100, now / 40, { r: 70 }); }
  if (!$('garageOv').hidden) { pctx.clearRect(0, 0, 220, 220); drawTop(pctx, my, 110, 110, now / 45, { r: 76 }); }
  if (mode !== 'battle' || !round) return;
  if (!paused) {
    const r = round;
    if (r.phase === 'aim') {
      $('needle').style.left = (r.power != null ? r.power : gaugeVal()) * 100 + '%';
      if (r.power != null) { r.cd += dt; const w = Math.floor(r.cd / .42); if (w !== r.word && w < D.launchWords.length) { r.word = w; snd(w === D.launchWords.length - 1 ? 'go' : 'count'); } if (r.cd >= .42 * D.launchWords.length) launch(r.power); }
    } else if (r.phase === 'fight') {
      for (let i = 0; i < 4; i++) physics(dt / 4);
      if (!r.me.alive || !r.op.alive) roundOver();
      skillBtn();
    } else if (r.phase === 'end') { stepTop(r.me, dt); stepTop(r.op, dt); }
    parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; if (p.rot != null) p.rot += p.vr * dt; }); parts = parts.filter(p => p.life > 0);
    shake = Math.max(0, shake - dt); if (banner) banner.t += dt;
    hud();
  }
  draw(now);
}
function draw(now) {
  const r = round;
  ctx.setTransform(S * DPR, 0, 0, S * DPR, 0, 0); ctx.clearRect(0, 0, WW, WW);
  if (shake) ctx.translate(rnd(-1, 1) * shake * 14, rnd(-1, 1) * shake * 14);
  drawArena();
  const c = WW / 2;
  for (const t of [r.me, r.op]) {
    if (r.phase === 'aim') { drawTop(ctx, t.b, c + t.x, c + t.y, t.ang, { spin: 0, alpha: .9 }); continue; }
    if (!t.alive && t.fin === 'burst') continue;
    if (!t.alive && t.fin === 'out' && t.fly <= 0) continue;
    ctx.save(); if (t.scale !== 1) { ctx.translate(c + t.x, c + t.y); ctx.scale(t.scale, t.scale); ctx.translate(-(c + t.x), -(c + t.y)); }
    drawTop(ctx, t.b, c + t.x, c + t.y, t.ang, { spin: t.alive ? t.spin : 0, shield: t.shield, alpha: t.fin === 'out' ? clamp(t.fly, 0, 1) : 1, tilt: t.alive && t.spin < PH.wobbleAt ? Math.sin(now / 60) * (1 - t.spin / PH.wobbleAt) : t.fin === 'spin' ? 1 : 0 });
    ctx.restore();
    if (t.alive) { ctx.fillStyle = t.side ? '#ff5a5a' : '#4fb0ff'; ctx.beginPath(); ctx.moveTo(c + t.x - 7, c + t.y - RAD - 16); ctx.lineTo(c + t.x + 7, c + t.y - RAD - 16); ctx.lineTo(c + t.x, c + t.y - RAD - 7); ctx.fill(); }
  }
  parts.forEach(p => {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    if (p.shard) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(14, -2); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
  });
  ctx.globalAlpha = 1;
  // 글자
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const big = (txt, y, size, col = '#fff') => { ctx.font = `${size}px Jua,system-ui,sans-serif`; ctx.lineWidth = 7; ctx.strokeStyle = '#121633'; ctx.strokeText(txt, c, y); ctx.fillStyle = col; ctx.fillText(txt, c, y); };
  if (r.phase === 'aim' && r.power != null && r.word >= 0) big(D.launchWords[Math.min(r.word, D.launchWords.length - 1)], c, 64, '#ffd84a');
  else if (banner && (banner.hold || banner.t < 1.3)) {
    const k = banner.hold ? 1 : clamp(1.3 - banner.t, 0, 1) * 3; ctx.globalAlpha = clamp(k, 0, 1);
    big(banner.text, c - (banner.sub ? 14 : 0), banner.small ? 26 : 44, banner.small ? '#fff' : '#ffd84a'); if (banner.sub) big(banner.sub, c + 32, 24);
    ctx.globalAlpha = 1;
  }
}

/* ---------- 시작 ---------- */
title(); show('titleOv'); resize(); requestAnimationFrame(frame);
window.__spin = { get round() { return round; }, get run() { return run; }, statsOf, launch: p => { if (round && round.phase === 'aim') launch(p); } };   // 테스트용
});
