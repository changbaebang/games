/* 팽이 대전 회오리 v2 — 위에서 내려다본 팽이 배틀
 * 참고한 재미 요소(이름·디자인은 모두 창작): 당겨서 쏘는 발사와 '슛!' 타이밍, 벽 레일 대시,
 * 출구별 점수(OUT 2 · 슈퍼 아웃 3), 부딪히며 차는 필살기 게이지, 끌어서 조종, 이길 때마다 부품 획득, 둘이서 대결.
 * 부품·상대·규칙·물리 숫자는 data.json.
 * 저장: spinTop(내 팽이), spinParts(얻은 부품), spinBest(대회 최고 승수), spinChamp(우승 횟수) */
Arcade.boot(D => {
const $ = id => document.getElementById(id), snd = (...a) => Arcade.play(...a), TAU = Math.PI * 2;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = a => a[Math.floor(Math.random() * a.length)];
const byId = (list, id) => list.find(x => x.id === id) || list[0];
const AR = D.arena, PH = D.physics, R = AR.radius, RAD = 26, WW = 400, C0 = WW / 2;
const deg = (x, y) => (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, adiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

/* ---------- 부품과 팽이 ---------- */
const KINDS = { ring: D.rings, weight: D.weights, tip: D.tips };
let owned = new Set(store.get('spinParts', []));
const has = p => !p.locked || owned.has(p.id);
const lockedLeft = () => [...D.rings, ...D.tips].filter(p => p.locked && !owned.has(p.id));
function statsOf(b) {
  const r = byId(D.rings, b.ring), w = byId(D.weights, b.weight), t = byId(D.tips, b.tip);
  return { atk: r.atk + (t.atk || 0), def: Math.max(1, r.def + w.def), mass: w.mass, sta: t.sta * w.sta, mob: t.mob * w.spd, fric: t.fric, gear: t.gear, shape: r.shape, skill: r.skill };
}
const nameOf = b => b.name || `${byId(D.rings, b.ring).word} ${(D.emblems.find(e => e[1] === b.emblem) || D.emblems[0])[0]}`;
let my = store.get('spinTop', null);
if (!my || !D.rings.some(r => r.id === my.ring)) my = { ring: 'wing', weight: 'mid', tip: 'ball', emblem: D.emblems[0][1], color: D.colors[1] };
for (const k of ['ring', 'weight', 'tip']) if (!has(byId(KINDS[k], my[k]))) my[k] = KINDS[k].find(has).id;

/* ---------- 그리기: 팽이 ---------- */
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => clamp(Math.round(c * k), 0, 255); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function ringPath(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'round') { ctx.arc(0, 0, r, 0, TAU); return; }
  if (shape === 'flame') { for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rr = r * (i % 3 === 0 ? 1.1 : .93); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); return; }
  const n = { claw: 3, wing: 2, gear: 6, fang: 5 }[shape] || 3;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    if (shape === 'gear') { for (let k = 0; k < 4; k++) { const aa = a + k / 4 * TAU / n, rr = k === 1 || k === 2 ? r * 1.08 : r * .86; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } }
    else if (shape === 'fang') { ctx.lineTo(Math.cos(a) * r * .86, Math.sin(a) * r * .86); ctx.lineTo(Math.cos(a + .5) * r * 1.22, Math.sin(a + .5) * r * 1.22); ctx.lineTo(Math.cos(a + .75) * r * .86, Math.sin(a + .75) * r * .86); }
    else if (shape === 'claw') { ctx.lineTo(Math.cos(a) * r * .84, Math.sin(a) * r * .84); ctx.quadraticCurveTo(Math.cos(a + .35) * r * 1.25, Math.sin(a + .35) * r * 1.25, Math.cos(a + .75) * r * 1.02, Math.sin(a + .75) * r * 1.02); ctx.lineTo(Math.cos(a + .9) * r * .8, Math.sin(a + .9) * r * .8); }
    else { ctx.lineTo(Math.cos(a - .25) * r * .78, Math.sin(a - .25) * r * .78); ctx.quadraticCurveTo(Math.cos(a + .4) * r * 1.3, Math.sin(a + .4) * r * 1.3, Math.cos(a + 1.3) * r * .86, Math.sin(a + 1.3) * r * .86); }
  }
  ctx.closePath();
}
function drawTop(ctx, b, x, y, ang, { r = RAD, spin = 100, shield = 0, alpha = 1, tilt = 0, glow = 0 } = {}) {
  const shape = byId(D.rings, b.ring).shape;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(4, 7, r * 1.05, r * .9, 0, 0, TAU); ctx.fill();
  if (glow) { ctx.fillStyle = `rgba(255,180,60,${.25 * glow})`; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TAU); ctx.fill(); }
  if (tilt) ctx.scale(1 - Math.abs(tilt) * .14, 1);
  if (shield > 0) { ctx.strokeStyle = `rgba(120,230,255,${.45 + .3 * Math.sin(performance.now() / 90)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r * 1.38, 0, TAU); ctx.stroke(); }
  const blur = clamp(spin / 100, 0, 1);
  for (let k = 2; k >= 0; k--) {
    ctx.save(); ctx.rotate(ang - k * .22 * blur); ctx.globalAlpha = alpha * (k ? .22 * blur : 1);
    ringPath(ctx, shape, r * 1.08); ctx.fillStyle = shade(b.color, .62); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.stroke();
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
const pocketAt = a => AR.pockets.find(p => adiff(a, p.a) < p.w);
const onRail = a => a >= AR.rail.from && a <= AR.rail.to;
function drawArena(now) {
  const g = ctx.createRadialGradient(C0, C0, 10, C0, C0, R + 14); g.addColorStop(0, '#f3f6ff'); g.addColorStop(.75, '#c9d3f2'); g.addColorStop(1, '#8794c6');
  ctx.fillStyle = '#0c0f26'; ctx.beginPath(); ctx.arc(C0, C0, R + 20, 0, TAU); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C0, C0, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(80,95,160,.22)'; ctx.lineWidth = 2; for (const rr of [R * .33, R * .66]) { ctx.beginPath(); ctx.arc(C0, C0, rr, 0, TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(C0, C0); ctx.rotate(now / 4000); ctx.strokeStyle = 'rgba(255,138,42,.35)'; ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 28, i * TAU / 3, i * TAU / 3 + 1.4); ctx.stroke(); } ctx.restore();
  ctx.lineWidth = 10; ctx.strokeStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(C0, C0, R + 5, 0, TAU); ctx.stroke();
  // 회오리 레일: 벽 안쪽 톱니
  const a0 = AR.rail.from * Math.PI / 180, a1 = AR.rail.to * Math.PI / 180;
  ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(C0, C0, R - 4, a0, a1); ctx.stroke();
  ctx.fillStyle = '#e0a400'; const off = (now / 600) % 1;
  for (let a = a0 + off * .09; a < a1; a += .09) { ctx.save(); ctx.translate(C0 + Math.cos(a) * (R - 10), C0 + Math.sin(a) * (R - 10)); ctx.rotate(a); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); }
  for (const p of AR.pockets) {
    const a = p.a * Math.PI / 180, w = p.w * Math.PI / 180, x = p.type === 'xout';
    ctx.strokeStyle = '#0c0f26'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(C0, C0, R + 6, a - w, a + w); ctx.stroke();
    ctx.strokeStyle = x ? 'rgba(255,60,90,.5)' : 'rgba(255,138,42,.35)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(C0, C0, R - 2, a - w, a + w); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = x ? '#ff3c5a' : '#ff8a2a'; ctx.font = `${x ? 15 : 14}px Jua,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(x ? '슈퍼 아웃 3' : 'OUT 2', C0 + Math.cos(a) * (R - 30), C0 + Math.sin(a) * (R - 30));
  }
}

/* ---------- 경기 상태 ---------- */
let mode = 'menu', game = null, round = null, last = 0, shake = 0, parts = [], pops = [], banner = null, paused = false, hitstop = 0, slow = 0, zoom = null;
const human = side => game && (game.kind === 'duo' || (side === 0 && game.kind !== 'sim'));
const aiOf = side => side ? game.ai : game.ai0;
const START = [[-70, 95], [70, -95]];
function makeTop(b, side) {
  const s = statsOf(b), [x, y] = START[side];
  return { b, s, side, x, y, vx: 0, vy: 0, spin: 0, max: 100, ang: Math.random() * TAU, burst: 0, alive: true, fin: null, shield: 0, power: 0, gauge: 0, dashT: 0, dashCd: 0, cd: 0, trail: [], fly: 0, scale: 1, steer: null, aim: null, aiSkill: 0 };
}
function newRound() {
  const [b0, b1] = game.tops;
  round = { tops: [makeTop(b0, 0), makeTop(b1, 1)], t: 0, phase: 'aim', countT: -1, aimT: 0 };
  round.tops.forEach(t => { if (!human(t.side)) { const o = aiOf(t.side); t.aiSkill = rnd(o.skillDelay[0], o.skillDelay[1]); } });
  $('skillBtn').hidden = true; $('nextBtn').hidden = true; setHints('뒤로 <b>당겨서</b> 조준하고, <b>“슛!”</b>에 맞춰 손을 떼요', game.kind === 'duo' ? '뒤로 당겨서 조준, “슛!”에 손을 떼요' : '');
  banner = null; mode = 'battle'; $('app').classList.remove('menu'); hud();
}
function setHints(a, b = '') { $('hint').innerHTML = a; $('hint2').innerHTML = b; $('hint').hidden = !a; }
const SHOOT_AT = .6 * (D.countWords.length - 1);
function startCount() { if (round.countT < 0) { round.countT = 0; round.word = -1; } }
function launchAll() {
  const r = round; r.phase = 'fight'; r.t = 0; snd('whoosh'); snd('go');
  let msg = '';
  r.tops.forEach(t => {
    let p, dir;
    if (human(t.side)) {
      const a = t.aim;
      if (a && a.p > .05) { p = a.p; dir = Math.atan2(a.dy, a.dx); }
      else { p = .5; dir = Math.atan2(t.x, -t.y); }
      const dt = a && a.rel != null ? a.rel - SHOOT_AT : null;
      if (dt != null && dt > -.28 && dt < .22) { p = Math.min(1.08, p + .12); t.perfect = true; if (!msg || t.side === 0) msg = t.side && game.kind === 'duo' ? '2P 타이밍 완벽!' : '타이밍 완벽!'; }
      else if (dt != null && dt < -.7) { p *= .85; if (t.side === 0) msg = '조금 빨랐어요!'; }
    } else {
      const o = aiOf(t.side); p = rnd(o.power[0], o.power[1]); dir = Math.atan2(t.x, -t.y) + rnd(-.6, .6) + (Math.random() < o.aggro ? Math.atan2(-t.y, -t.x) - Math.atan2(t.x, -t.y) : 0) * .5;
    }
    t.max = 55 + 45 * Math.min(1, p) + (t.perfect ? 8 : 0); t.spin = t.max;
    const sp = 120 + 190 * Math.min(1, p); t.vx = Math.cos(dir) * sp; t.vy = Math.sin(dir) * sp;
    sparks(C0 + t.x, C0 + t.y, '#fff', 8);
  });
  banner = { t: 0, text: msg || '고!', small: !msg };
  setHints(game.kind === 'duo' ? '' : '화면을 <b>끌면</b> 팽이가 그쪽으로 기울어요', game.kind === 'duo' ? '끌어서 조종!' : '');
  $('skillBtn').hidden = false;
}

/* ---------- 효과 ---------- */
function sparks(x, y, col, n = 10, sp = 260) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, sp); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.25, .55), col, r: rnd(1.5, 3.5) }); } }
function pop(x, y, text, col = '#ffd84a', size = 30) { pops.push({ x, y, text, col, size, t: 0 }); }
function addGauge(t, v) { const was = t.gauge >= 100; t.gauge = Math.min(100, t.gauge + v); if (!was && t.gauge >= 100 && human(t.side)) snd('power'); }

/* ---------- 필살기 ---------- */
function useSkill(t) {
  if (!t || !t.alive || round.phase !== 'fight' || t.gauge < 100) return;
  t.gauge = 0; const o = round.tops[1 - t.side], k = t.s.skill;
  if (k === 'dash') { const dx = o.x - t.x, dy = o.y - t.y, d = Math.hypot(dx, dy) || 1; t.vx = dx / d * 330; t.vy = dy / d * 330; t.power = 1.2; snd('zap'); }
  if (k === 'shield') { t.shield = 4; snd('freeze'); }
  if (k === 'charge') { t.spin = Math.min(t.max + 10, t.spin + 32); snd('power'); }
  if (k === 'storm') { const dx = o.x - t.x, dy = o.y - t.y, d = Math.hypot(dx, dy) || 1; if (o.alive && d < 170) { const f = 260 * (1 - d / 220) / o.s.mass; o.vx += dx / d * f; o.vy += dy / d * f; } snd('boom'); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; parts.push({ x: C0 + t.x, y: C0 + t.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: .45, col: '#9ad6ff', r: 3 }); } }
  sparks(C0 + t.x, C0 + t.y, t.side ? '#ff9a7a' : '#9ad6ff', 18);
  const who = game.kind === 'duo' ? `${t.side + 1}P ` : t.side ? '상대 ' : '';
  banner = { t: 0, text: `${who}${D.skills[k].name}!`, small: !!t.side && game.kind !== 'duo' };
  shake = Math.max(shake, .25); slow = Math.max(slow, .25);
}

/* ---------- 물리 ---------- */
function finish(t, how) {
  if (!t.alive) return; t.alive = false; t.fin = how;
  if (how === 'burst') { snd('crack'); snd('boom', true); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + rnd(0, 1); parts.push({ x: C0 + t.x, y: C0 + t.y, vx: Math.cos(a) * 200 + t.vx * .4, vy: Math.sin(a) * 200 + t.vy * .4, life: 1.4, shard: true, col: i % 2 ? shade(t.b.color, .62) : t.b.color, rot: rnd(0, TAU), vr: rnd(-12, 12) }); } sparks(C0 + t.x, C0 + t.y, '#fff', 24, 360); }
  if (how === 'out' || how === 'xout') { snd('whoosh'); t.fly = 1; if (how === 'xout') sparks(C0 + t.x, C0 + t.y, '#ff3c5a', 26, 360); }
  if (how === 'spin') snd('thud');
  shake = .5; slow = 1.1; zoom = { x: C0 + t.x, y: C0 + t.y, t: 0 };
}
function stepTop(t, o, dt) {
  if (!t.alive) { if (t.fly > 0) { t.x += t.vx * dt; t.y += t.vy * dt; t.fly -= dt * 1.2; t.scale = 1 + (1 - t.fly) * .7; t.ang += .4; } return; }
  const k = clamp(t.spin / 100, 0, 1), v0 = Math.hypot(t.vx, t.vy), hx = v0 > 4 ? t.vx / v0 : Math.cos(t.ang), hy = v0 > 4 ? t.vy / v0 : Math.sin(t.ang);
  const thrust = t.s.mob * PH.mobAccel * k, w = t.s.mob * PH.turn * k;
  let ax = -AR.slope * t.x + hx * thrust - hy * w * v0, ay = -AR.slope * t.y + hy * thrust + hx * w * v0;
  // 조종: 손가락(또는 AI 목표) 쪽으로 기울이기
  if (t.steer) { const dx = t.steer.x - t.x, dy = t.steer.y - t.y, d = Math.hypot(dx, dy); if (d > 8) { const f = PH.steer * (.35 + .65 * k); ax += dx / d * f; ay += dy / d * f; t.spin -= PH.steerCost * dt; } }
  if (t.spin < PH.wobbleAt) { const ww = 70 * (1 - t.spin / PH.wobbleAt); ax += rnd(-ww, ww); ay += rnd(-ww, ww); }
  t.vx += ax * dt; t.vy += ay * dt; t.vx *= 1 - PH.drag * dt; t.vy *= 1 - PH.drag * dt;
  t.x += t.vx * dt; t.y += t.vy * dt;
  const sp = Math.hypot(t.vx, t.vy);
  t.spin -= dt * (PH.spinDecay / t.s.sta + sp * PH.moveDecay * t.s.fric);
  t.shield = Math.max(0, t.shield - dt); t.cd = Math.max(0, t.cd - dt); t.dashT = Math.max(0, t.dashT - dt); t.dashCd = Math.max(0, t.dashCd - dt); t.power = Math.max(0, t.power - dt);
  addGauge(t, PH.gaugeTime * dt);
  t.ang += Math.min(t.spin / 100 * 30, 26) * dt;
  if ((t.trail.length === 0 || Math.hypot(t.trail[t.trail.length - 1][0] - t.x, t.trail[t.trail.length - 1][1] - t.y) > 6)) { t.trail.push([t.x, t.y]); if (t.trail.length > 18) t.trail.shift(); }
  const r = Math.hypot(t.x, t.y);
  if (r > R - RAD - 2) {
    const nx = t.x / r, ny = t.y / r, vr = t.vx * nx + t.vy * ny, a = deg(t.x, t.y), pk = pocketAt(a);
    // 레일 대시: 톱니가 레일을 물면 벽을 따라 튀어나가요
    if (onRail(a) && t.s.gear > 0 && t.dashCd <= 0 && k > .15) {
      const dir = (t.x * t.vy - t.y * t.vx) >= 0 ? 1 : -1, tx = -ny * dir, ty = nx * dir, spd = Math.max(sp, AR.rail.boost * t.s.gear * (.55 + .45 * k));
      t.vx = tx * spd - nx * 20; t.vy = ty * spd - ny * 20; t.dashT = .45; t.dashCd = AR.rail.cool; t.power = .6;
      addGauge(t, PH.gaugeDash); snd('zap'); pop(C0 + t.x, C0 + t.y - 30, '대시!', '#ffd84a', 24); sparks(C0 + t.x, C0 + t.y, '#ffd84a', 12);
    }
    if (pk && vr > AR.outSpeed && r > R - RAD + 2) { finish(t, pk.type); return; }
    if (r > R - RAD) {
      if (vr > 0) { t.vx -= 1.5 * vr * nx; t.vy -= 1.5 * vr * ny; t.spin -= vr * .01; if (vr > 60) { snd('bounce'); sparks(C0 + nx * R, C0 + ny * R, '#ffd84a', 5); } }
      if (!pk) { t.x = nx * (R - RAD); t.y = ny * (R - RAD); }
      else if (r > R + RAD) { finish(t, pk.type); return; }
    }
  }
  if (t.spin <= 0) { t.spin = 0; finish(t, 'spin'); }
}
function collide(a, b) {
  if (!a.alive || !b.alive) return;
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, min = RAD * 2;
  if (d >= min) return;
  const nx = dx / d, ny = dy / d, ma = a.s.mass * (a.shield ? 1.6 : 1), mb = b.s.mass * (b.shield ? 1.6 : 1);
  const ov = min - d; a.x -= nx * ov * mb / (ma + mb); a.y -= ny * ov * mb / (ma + mb); b.x += nx * ov * ma / (ma + mb); b.y += ny * ov * ma / (ma + mb);
  const vrel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  const atkA = a.s.atk * (1 + a.power * .5), atkB = b.s.atk * (1 + b.power * .5);
  const K = PH.kick * (atkA * a.spin + atkB * b.spin) / 1000;
  const J = (vrel > 0 ? (1 + PH.restitution) * vrel / (1 / ma + 1 / mb) : 0) + K;
  a.vx -= J / ma * nx; a.vy -= J / ma * ny; b.vx += J / mb * nx; b.vy += J / mb * ny;
  if (a.cd > 0 || b.cd > 0) return;
  a.cd = b.cd = .16;
  const impact = Math.max(0, vrel) + K * .5;
  // 먼저 달려든 쪽(공격한 쪽)은 덜 아파요
  const va = a.vx * nx + a.vy * ny, vb = -(b.vx * nx + b.vy * ny), aggA = va > vb + 40 ? .4 : 1, aggB = vb > va + 40 ? .4 : 1;
  const hurt = (t, o, atk) => {
    const ratio = clamp(atk / (t.s.def * (t.shield ? 2 : 1)), .4, 1.8), dmg = (2 + impact * .05) * ratio * (.4 + o.spin / 100) * (t === a ? aggA : aggB);
    t.spin -= dmg * PH.hitSpin; t.burst += dmg * PH.hitBurst * clamp(1.4 - t.spin / t.max, .4, 1.4);
  };
  hurt(a, b, atkB); hurt(b, a, atkA);
  addGauge(a, PH.gaugeHit); addGauge(b, PH.gaugeHit);
  const cx = C0 + a.x + nx * RAD, cy = C0 + a.y + ny * RAD, big = impact > 150;
  sparks(cx, cy, '#ffe08a', Math.min(26, 6 + impact / 10));
  if (impact > 70) pop(cx, cy - 24, pick(D.hitWords), big ? '#ff5a3a' : '#ffd84a', big ? 40 : 28);
  snd(big ? 'crit' : 'hit'); shake = Math.min(.45, shake + impact / 800); if (big) hitstop = .07;
  if (a.burst >= 100) finish(a, 'burst'); if (b.burst >= 100) finish(b, 'burst');
  if (a.spin <= 0) finish(a, 'spin'); if (b.spin <= 0) finish(b, 'spin');
}
function aiThink(t, o, dt) {
  const A = aiOf(t.side);
  if (!t.alive) return;
  // 공격형은 상대 쪽으로, 수비형은 가운데로 기울여요
  if (A.aggro > 0 && o.alive && Math.random() < A.aggro * 3 * dt) t.steer = { x: o.x + o.vx * .2, y: o.y + o.vy * .2 };
  else if (A.aggro === 0 && Math.hypot(t.x, t.y) > 70) t.steer = { x: 0, y: 0 };
  else if (Math.random() < 1.2 * dt) t.steer = null;
  if (t.gauge >= 100) { t.aiSkill -= dt; if (t.aiSkill <= 0 && (t.s.skill !== 'storm' || Math.hypot(o.x - t.x, o.y - t.y) < 130) && (t.s.skill !== 'charge' || t.spin < 60)) { useSkill(t); t.aiSkill = rnd(A.skillDelay[0], A.skillDelay[1]); } }
}
function physics(dt) {
  const r = round, [a, b] = r.tops; r.t += dt;
  stepTop(a, b, dt); stepTop(b, a, dt); collide(a, b);
  if (r.t > D.rules.timeLimit && a.alive && b.alive) finish(a.spin < b.spin ? a : b, 'spin');
}

/* ---------- 라운드·경기 끝 ---------- */
function roundOver() {
  const r = round; r.phase = 'end'; $('skillBtn').hidden = true; $('skill2Btn').parentElement.classList.remove('on'); setHints('');
  const [a, b] = r.tops, duo = game.kind === 'duo';
  let text, sub = '';
  if (!a.alive && !b.alive) text = D.finishText.draw;
  else {
    const loser = a.alive ? b : a, win = 1 - loser.side, pts = D.rules.points[loser.fin];
    game.pts[win] += pts; text = D.finishText[loser.fin];
    sub = duo ? `${win + 1}P +${pts}점` : `${win === 0 ? '나' : '상대'} +${pts}점`;
    snd(win === 0 || duo ? 'goal' : 'bad');
  }
  banner = { t: 0, text, sub, hold: true }; hud();
  const done = game.pts.some(p => p >= D.rules.winPoints);
  setTimeout(() => { if (done) matchOver(game.pts[0] >= D.rules.winPoints); else { $('nextBtn').hidden = false; } }, done ? 1700 : 900);
}
function grantPart(force) {
  const left = lockedLeft(); if (!left.length) return null;
  const p = (force && left.find(x => x.id === force)) || pick(left); owned.add(p.id); store.set('spinParts', [...owned]); return p;
}
function matchOver(won) {
  mode = 'menu'; $('app').classList.add('menu');
  const G = game, opp = G.ai; let reward = null;
  if (G.kind === 'duo') { snd('win'); return showEnd('🎉', `${won ? '1P' : '2P'} 승리!`, `${G.pts[0]} : ${G.pts[1]}`, null, '한 판 더', () => { G.pts = [0, 0]; show(null); newRound(); }); }
  if (!won) { snd('lose'); return showEnd('💫', '아쉬워요!', `<b>${opp.name}</b>에게 ${G.pts[0]} : ${G.pts[1]}로 졌어요.<br>부품을 바꿔 보거나, “슛!” 타이밍을 노려 봐요!`, null, '다시 도전', () => { G.pts = [0, 0]; show(null); newRound(); }); }
  if (G.kind === 'free') { if (Math.random() < .5) reward = grantPart(); snd('level'); return showEnd('🎉', '승리!', `${opp.who}의 <b>${opp.name}</b>을(를) ${G.pts[0]} : ${G.pts[1]}로 이겼어요!`, reward, '다른 상대 고르기', () => openFree()); }
  G.idx++; Arcade.record('spinBest', G.idx);
  if (G.idx >= D.opponents.length) {
    store.set('spinChamp', (store.get('spinChamp', 0) || 0) + 1); reward = grantPart('gear'); snd('win');
    return showEnd('🏆', '우승!', `회오리 컵 챔피언이 되었어요!<br>우승 ${store.get('spinChamp', 1)}번`, reward, '대회 다시 나가기', startCup);
  }
  reward = grantPart(); snd('level');
  showEnd('🎉', '승리!', `${opp.who}의 <b>${opp.name}</b>을(를) ${G.pts[0]} : ${G.pts[1]}로 이겼어요!<br>다음 상대: ${D.opponents[G.idx].title}`, reward, '다음 경기', () => { show('bracketOv'); renderBracket(); });
}
function showEnd(e, t, txt, reward, btn, fn) {
  $('eEmoji').textContent = e; $('eTitle').textContent = t; $('eTxt').innerHTML = txt;
  $('eReward').hidden = !reward; if (reward) $('eReward').innerHTML = `🎁 새 부품 획득! <b>${reward.name}</b><br><small>${reward.desc}</small>`;
  $('eMain').textContent = btn; $('eMain').onclick = () => { snd('click'); fn(); }; show('endOv');
}

/* ---------- 화면 ---------- */
const OVS = ['titleOv', 'garageOv', 'bracketOv', 'endOv', 'pauseOv'];
function show(id) { OVS.forEach(o => { $(o).hidden = o !== id; }); if (id) $('app').classList.toggle('menu', id !== 'pauseOv'); }
const dots = n => '●'.repeat(Math.min(n, D.rules.winPoints)) + '○'.repeat(Math.max(0, D.rules.winPoints - n));
function hud() {
  const r = round; if (!r || !game) return; const [a, b] = r.tops;
  $('meName').textContent = game.kind === 'duo' ? `1P ${nameOf(a.b)}` : nameOf(a.b); $('opName').textContent = game.kind === 'duo' ? `2P ${nameOf(b.b)}` : b.b.name;
  $('mePts').textContent = dots(game.pts[0]); $('opPts').textContent = dots(game.pts[1]);
  $('meSpin').style.width = clamp(a.spin, 0, 100) + '%'; $('opSpin').style.width = clamp(b.spin, 0, 100) + '%';
  $('meBurst').style.width = clamp(a.burst, 0, 100) + '%'; $('opBurst').style.width = clamp(b.burst, 0, 100) + '%';
  [[a, 'skillBtn'], [b, 'skill2Btn']].forEach(([t, id]) => {
    const el = $(id), ready = t.gauge >= 100 && r.phase === 'fight' && t.alive;
    el.querySelector('.fill').style.width = t.gauge + '%'; el.classList.toggle('ready', ready); el.disabled = r.phase !== 'fight' || !t.alive;
    el.querySelector('.lab').textContent = ready ? `${D.skills[t.s.skill].name}!` : `필살기 ${Math.floor(t.gauge)}%`;
  });
}

/* ---------- 메뉴 ---------- */
function setGame(kind, extra = {}) { game = { kind, pts: [0, 0], idx: 0, ...extra }; $('app').classList.toggle('duo', kind === 'duo'); }
function startCup() { setGame('cup'); show('bracketOv'); renderBracket(); }
function oppGame(i) { const o = D.opponents[i]; game.ai = o; game.tops = [my, o]; }
function renderBracket() {
  $('bTitle').textContent = '회오리 컵 대회'; $('bSub').textContent = '이기면 새 부품을 받아요!'; $('fightBtn').hidden = false;
  $('bracket').innerHTML = D.opponents.map((o, i) => `<li class="${i < game.idx ? 'done' : i === game.idx ? 'now' : ''}"><span class="e">${o.emblem}</span><span>${o.title} · <b>${o.name}</b><small>${o.who} · ${byId(D.rings, o.ring).name}, ${byId(D.tips, o.tip).name}</small></span><span class="st">${i < game.idx ? '이김 ✓' : i === game.idx ? '다음!' : ''}</span></li>`).join('');
}
function pickList(title, sub, items, onPick) {
  $('bTitle').textContent = title; $('bSub').textContent = sub; $('fightBtn').hidden = true;
  $('bracket').innerHTML = items.map((o, i) => `<li class="pick" data-i="${i}"><span class="e">${o.emblem}</span><span><b>${o.name || nameOf(o)}</b><small>${o.who ? o.who + ' · ' : ''}${byId(D.rings, o.ring).name}, ${byId(D.tips, o.tip).name}</small></span><span class="st">고르기 ▶</span></li>`).join('');
  $('bracket').querySelectorAll('li').forEach(li => li.onclick = () => { snd('click'); onPick(items[+li.dataset.i]); });
  show('bracketOv');
}
function openFree() { setGame('free'); pickList('친선전', '아무 상대와 연습해요', D.opponents, o => { game.ai = o; game.tops = [my, o]; show(null); resize(); newRound(); }); }
function openDuo() {
  setGame('duo');
  pickList('둘이서 대결', '1P는 내 팽이, 2P(위쪽)가 팽이를 골라요', [{ ...my, name: '1P와 같은 팽이', emblem: my.emblem, color: '#e5533d' }, ...D.opponents], o => { game.ai = null; game.tops = [my, { ...o, name: o.name === '1P와 같은 팽이' ? nameOf(my) : o.name }]; show(null); resize(); newRound(); });
}
$('fightBtn').onclick = () => { snd('click'); game.pts = [0, 0]; oppGame(game.idx); show(null); resize(); newRound(); };

/* ---------- 조립소 ---------- */
const prev = $('prevCv'), pctx = prev.getContext('2d');
function renderGarage() {
  const rows = [['ring', '공격 날', D.rings], ['weight', '몸통', D.weights], ['tip', '축', D.tips], ['emblem', '무늬', D.emblems.map(([n, e]) => ({ id: e, name: `${e} ${n}` }))]];
  $('parts').innerHTML = rows.map(([k, lab, list]) => { const cur = list.find(x => x.id === my[k]) || list[0]; const n = list.filter(has).length; return `<div class="part" data-k="${k}"><button data-d="-1" aria-label="${lab} 이전">◀</button><div><span class="k">${lab} ${n}/${list.length}</span><b>${cur.name}</b><small>${cur.desc || ''}</small></div><button data-d="1" aria-label="${lab} 다음">▶</button></div>`; }).join('');
  $('parts').querySelectorAll('.part button').forEach(b => b.onclick = () => {
    const k = b.parentElement.dataset.k, list = (k === 'emblem' ? D.emblems.map(e => ({ id: e[1] })) : KINDS[k]).filter(has);
    const i = list.findIndex(x => x.id === my[k]); my[k] = list[(i + +b.dataset.d + list.length) % list.length].id; snd('swap'); renderGarage();
  });
  $('swatches').innerHTML = D.colors.map(c => `<button style="background:${c}" class="${c === my.color ? 'on' : ''}" data-c="${c}" aria-label="색 ${c}"></button>`).join('');
  $('swatches').querySelectorAll('button').forEach(b => b.onclick = () => { my.color = b.dataset.c; snd('select'); renderGarage(); });
  const s = statsOf(my), bars = [['공격', s.atk], ['방어', s.def], ['지구력', Math.round(s.sta * 6.5)], ['속도', Math.round(s.mob * 6)], ['레일', Math.round(s.gear * 7)]];
  $('stats').innerHTML = bars.map(([n, v]) => `<span>${n}</span><div class="sb"><i style="width:${clamp(v, 0, 10) * 10}%"></i></div>`).join('') + `<span>필살기</span><span>${D.skills[s.skill].name}: ${D.skills[s.skill].desc}</span>`;
  $('topName').textContent = nameOf(my);
  const left = lockedLeft().length; $('partCount').textContent = left ? `🔒 아직 못 얻은 부품 ${left}개. 경기에서 이기면 하나씩 받아요!` : '🎉 모든 부품을 모았어요!';
}
let garageBack = 'titleOv';
$('doneBtn').onclick = () => { store.set('spinTop', my); snd('level'); if (game && game.kind === 'cup' && game.idx < D.opponents.length && garageBack === 'bracketOv') { show('bracketOv'); renderBracket(); } else { show('titleOv'); title(); } };
const openGarage = from => () => { snd('click'); garageBack = from; renderGarage(); show('garageOv'); };
$('garageBtn').onclick = openGarage('titleOv'); $('bGarage').onclick = openGarage('bracketOv'); $('eGarage').onclick = () => openGarage(game && game.kind === 'cup' ? 'bracketOv' : 'titleOv')();
const home = () => { snd('click'); mode = 'menu'; round = null; game = null; $('app').classList.remove('duo'); title(); show('titleOv'); };
$('bHome').onclick = home; $('eHome').onclick = home;
$('goBtn').onclick = () => { snd('click'); startCup(); };
$('freeBtn').onclick = () => { snd('click'); openFree(); };
$('duoBtn').onclick = () => { snd('click'); openDuo(); };
function title() {
  const b = Arcade.best('spinBest'), c = store.get('spinChamp', 0);
  $('recTxt').textContent = (c ? `우승 ${c}번! 🏆 · ` : b ? `최고 기록: ${b}승 · ` : '') + `부품 ${[...D.rings, ...D.tips].filter(has).length + D.weights.length}/${D.rings.length + D.tips.length + D.weights.length}`;
}

/* ---------- 입력: 당겨서 발사, 끌어서 조종 ---------- */
const ptrs = new Map();
const world = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / S - C0, y: (e.clientY - r.top) / S - C0 }; };
function sideOf(p, e) { if (!game || game.kind !== 'duo') return 0; const r = $('stage').getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? 1 : 0; }
$('stage').addEventListener('pointerdown', e => {
  if (mode !== 'battle' || !round || paused) return; const p = world(e), side = sideOf(p, e), t = round.tops[side]; if (!human(side)) return;
  try { $('stage').setPointerCapture(e.pointerId); } catch (_) {}
  ptrs.set(e.pointerId, { side, sx: p.x, sy: p.y });
  if (round.phase === 'aim' && (!t.aim || t.aim.rel == null)) { t.aim = { dx: 0, dy: 0, p: 0, rel: null }; startCount(); }
  if (round.phase === 'fight') t.steer = p;
});
$('stage').addEventListener('pointermove', e => {
  const q = ptrs.get(e.pointerId); if (!q || !round) return; const p = world(e), t = round.tops[q.side];
  if (round.phase === 'aim' && t.aim && t.aim.rel == null) { const dx = q.sx - p.x, dy = q.sy - p.y; t.aim.dx = dx; t.aim.dy = dy; t.aim.p = clamp(Math.hypot(dx, dy) / 110, 0, 1); }
  if (round.phase === 'fight') t.steer = p;
});
const ptrUp = e => {
  const q = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!q || !round) return; const t = round.tops[q.side];
  if (round.phase === 'aim' && t.aim && t.aim.rel == null) { t.aim.rel = round.countT >= 0 ? round.countT : -9; snd('pop'); }
  if (round.phase === 'fight') t.steer = null;
};
$('stage').addEventListener('pointerup', ptrUp); $('stage').addEventListener('pointercancel', ptrUp);
$('skillBtn').onclick = () => round && useSkill(round.tops[0]);
$('skill2Btn').onclick = () => round && game.kind === 'duo' && useSkill(round.tops[1]);
$('nextBtn').onclick = () => { snd('click'); newRound(); };
$('menuBtn').onclick = () => { if (mode === 'battle') { paused = true; show('pauseOv'); } else home(); };
$('resumeBtn').onclick = () => { paused = false; show(null); $('app').classList.remove('menu'); last = performance.now(); };
$('quitBtn').onclick = () => { paused = false; home(); };
addEventListener('keydown', e => {
  if (e.code !== 'Space' && e.code !== 'Enter') return; if (!OVS.every(o => $(o).hidden) || !round) return; e.preventDefault();
  const t = round.tops[0];
  if (round.phase === 'aim') { if (round.countT < 0) { t.aim = { dx: -t.y, dy: t.x, p: .8, rel: null }; startCount(); } else if (t.aim && t.aim.rel == null) t.aim.rel = round.countT; }
  else if (round.phase === 'fight') useSkill(t); else if (!$('nextBtn').hidden) $('nextBtn').click();
});

/* ---------- 루프 ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  const lc = $('logoCv'); if (!$('titleOv').hidden && lc) { const l = lc.getContext('2d'); l.clearRect(0, 0, 200, 200); drawTop(l, my, 100, 100, now / 40, { r: 70 }); }
  if (!$('garageOv').hidden) { pctx.clearRect(0, 0, 220, 220); drawTop(pctx, my, 110, 110, now / 45, { r: 76 }); }
  if (mode !== 'battle' || !round) return;
  if (!paused) {
    const r = round, raw = dt;
    if (slow > 0) { slow -= raw; dt *= .3; }
    if (hitstop > 0) { hitstop -= raw; dt = 0; }
    if (r.phase === 'aim') {
      r.aimT += raw; if (r.aimT > 7) startCount();
      if (r.countT >= 0) {
        r.countT += raw; const w = Math.min(D.countWords.length - 1, Math.floor(r.countT / .6));
        if (w !== r.word) { r.word = w; snd(w === D.countWords.length - 1 ? 'go' : 'count'); }
        const allSet = r.tops.every(t => !human(t.side) || (t.aim && t.aim.rel != null));
        if (r.countT >= SHOOT_AT + .25 || (allSet && r.countT >= SHOOT_AT)) launchAll();
      }
    } else if (r.phase === 'fight') {
      if (game.ai) aiThink(r.tops[1], r.tops[0], dt);
      for (let i = 0; i < 4; i++) physics(dt / 4);
      if (!r.tops[0].alive || !r.tops[1].alive) roundOver();
    } else if (r.phase === 'end') { r.tops.forEach(t => stepTop(t, null, dt)); }
    parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; if (p.rot != null) p.rot += p.vr * dt; }); parts = parts.filter(p => p.life > 0);
    pops.forEach(p => { p.t += raw; }); pops = pops.filter(p => p.t < .8);
    shake = Math.max(0, shake - raw); if (banner) banner.t += raw; if (zoom) zoom.t += raw;
    hud();
  }
  draw(now);
}
function draw(now) {
  const r = round;
  ctx.setTransform(S * DPR, 0, 0, S * DPR, 0, 0); ctx.clearRect(0, 0, WW, WW);
  if (zoom && zoom.t < 1.6) { const z = 1 + .28 * Math.sin(Math.min(1, zoom.t / 1.6) * Math.PI); ctx.translate(zoom.x, zoom.y); ctx.scale(z, z); ctx.translate(-zoom.x, -zoom.y); }
  if (shake) ctx.translate(rnd(-1, 1) * shake * 14, rnd(-1, 1) * shake * 14);
  drawArena(now);
  // 꼬리
  for (const t of r.tops) if (t.alive && r.phase !== 'aim') { const col = t.side ? '255,90,90' : '79,176,255'; t.trail.forEach(([x, y], i) => { ctx.fillStyle = `rgba(${t.dashT > 0 ? '255,216,74' : col},${i / t.trail.length * .35})`; ctx.beginPath(); ctx.arc(C0 + x, C0 + y, RAD * (.3 + .5 * i / t.trail.length), 0, TAU); ctx.fill(); }); }
  for (const t of r.tops) {
    const x = C0 + t.x, y = C0 + t.y;
    if (r.phase === 'aim') {
      drawTop(ctx, t.b, x, y, t.ang, { spin: 0, alpha: .95 });
      const a = t.aim;
      if (human(t.side) && a && a.p > .05) {
        const ang = Math.atan2(a.dy, a.dx), len = 30 + 90 * a.p, col = a.p > .85 ? '#ff3c5a' : a.p > .5 ? '#ffb02a' : '#4fb0ff';
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.setLineDash([2, 12]); ctx.beginPath(); ctx.moveTo(RAD + 4, 0); ctx.lineTo(RAD + len, 0); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(RAD + len + 16, 0); ctx.lineTo(RAD + len, -10); ctx.lineTo(RAD + len, 10); ctx.fill(); ctx.restore();
        ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, RAD + 8, -Math.PI / 2, -Math.PI / 2 + TAU * a.p); ctx.stroke();
      } else if (human(t.side)) { ctx.strokeStyle = 'rgba(79,176,255,.6)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(x, y, RAD + 10 + 4 * Math.sin(now / 200), 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      continue;
    }
    if (!t.alive && t.fin === 'burst') continue;
    if (!t.alive && (t.fin === 'out' || t.fin === 'xout') && t.fly <= 0) continue;
    ctx.save(); if (t.scale !== 1) { ctx.translate(x, y); ctx.scale(t.scale, t.scale); ctx.translate(-x, -y); }
    drawTop(ctx, t.b, x, y, t.ang, { spin: t.alive ? t.spin : 0, shield: t.shield, glow: t.gauge >= 100 ? 1 : t.power, alpha: t.fly ? clamp(t.fly, 0, 1) : 1, tilt: t.alive && t.spin < PH.wobbleAt ? Math.sin(now / 60) * (1 - t.spin / PH.wobbleAt) : t.fin === 'spin' ? 1 : 0 });
    ctx.restore();
    if (t.alive) { ctx.fillStyle = t.side ? '#ff5a5a' : '#4fb0ff'; ctx.beginPath(); ctx.moveTo(x - 7, y - RAD - 16); ctx.lineTo(x + 7, y - RAD - 16); ctx.lineTo(x, y - RAD - 7); ctx.fill(); }
    if (t.steer && t.alive) { ctx.strokeStyle = t.side ? 'rgba(255,90,90,.35)' : 'rgba(79,176,255,.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C0 + t.steer.x, C0 + t.steer.y, 14, 0, TAU); ctx.stroke(); }
  }
  parts.forEach(p => {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    if (p.shard) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-13, -6); ctx.lineTo(15, -2); ctx.lineTo(4, 10); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
  });
  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const txt = (s, x, y, size, col = '#fff', rot = 0) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.font = `${size}px Jua,system-ui,sans-serif`; ctx.lineWidth = Math.max(4, size / 6); ctx.strokeStyle = '#121633'; ctx.strokeText(s, 0, 0); ctx.fillStyle = col; ctx.fillText(s, 0, 0); ctx.restore(); };
  pops.forEach(p => { const k = p.t < .12 ? p.t / .12 * 1.3 : 1.3 - Math.min(.3, (p.t - .12)); ctx.globalAlpha = clamp((.8 - p.t) * 3, 0, 1); txt(p.text, p.x, p.y - p.t * 30, p.size * k, p.col, -.12); });
  ctx.globalAlpha = 1;
  ctx.setTransform(S * DPR, 0, 0, S * DPR, 0, 0);
  const duoFlip = game && game.kind === 'duo';
  const big = (s, y, size, col) => { if (!duoFlip) return txt(s, C0, y, size, col); txt(s, C0, y + 60, size * .8, col); txt(s, C0, WW - y - 60, size * .8, col, Math.PI); };
  if (r.phase === 'aim' && r.countT >= 0 && r.word >= 0) { const w = D.countWords[r.word], f = (r.countT % .6) / .6; ctx.globalAlpha = 1 - f * .5; big(w, C0 - 10, (r.word === D.countWords.length - 1 ? 72 : 60) * (1.2 - f * .2), r.word === D.countWords.length - 1 ? '#ff3c5a' : '#ffd84a'); ctx.globalAlpha = 1; }
  else if (r.phase === 'aim') big('준비!', C0 - 10, 44, '#fff');
  else if (banner && (banner.hold || banner.t < 1.3)) {
    ctx.globalAlpha = banner.hold ? 1 : clamp((1.3 - banner.t) * 3, 0, 1);
    const pulse = 1 + .08 * Math.max(0, 1 - banner.t * 4);
    txt(banner.text, C0, C0 - (banner.sub ? 16 : 0), (banner.small ? 26 : 42) * pulse, banner.small ? '#fff' : '#ffd84a');
    if (banner.sub) txt(banner.sub, C0, C0 + 30, 24, '#fff');
    if (duoFlip && banner.hold) txt(banner.text, C0, 70, 26, '#ffd84a', Math.PI);
    ctx.globalAlpha = 1;
  }
}

/* ---------- 시작 ---------- */
title(); show('titleOv'); resize(); requestAnimationFrame(frame);
// 테스트용: 화면 없이 두 AI 팽이를 겨루게 해서 균형을 맞춰 봐요
function duel(A0, A1) {
  const keep = [game, round, mode]; game = { kind: 'sim', pts: [0, 0], ai0: A0, ai: A1, tops: [A0, A1] };
  newRound(); launchAll(); const dt = 1 / 60; let n = 0;
  while (round.tops.every(t => t.alive) && n++ < 75 * 60) { aiThink(round.tops[0], round.tops[1], dt); aiThink(round.tops[1], round.tops[0], dt); physics(dt); }
  const [a, b] = round.tops, res = { t: +round.t.toFixed(1), win: a.alive && !b.alive ? 0 : b.alive && !a.alive ? 1 : -1, fin: (a.alive ? b : a).fin };
  [game, round, mode] = keep; parts = []; pops = []; banner = null; slow = hitstop = 0; zoom = null; return res;
}
window.__spin = { get round() { return round; }, get game() { return game; }, statsOf, owned, duel };
});
