/* 각도 탐정 — 게임 동작
 * 단계 구성(문제 종류·각 범위), 칭찬·결과 문구, 보기 낱말은 data.json 에서 읽어요.
 * 문제 종류(kind): read(각도기 읽기) · make(각 그리기) · type(예각·직각·둔각) · estimate(어림) · compare(크기 비교)
 *                  sum · diff · straight(직선 180°) · right(직각 90°) · full(한 바퀴 360°)
 *                  triangle · quad · isosceles · triStraight · polySum · regular · polyMissing
 * 그림은 수학 좌표(위가 +y)로 만들고 SVG 로 바꿀 때 y 를 뒤집어요.
 * 저장(localStorage): angleStars {단계번호: 별}, angleStarTotal (목록 화면 '내 기록'용) */
(async () => {
const HERE = document.currentScript.src;
const $ = id => document.getElementById(id), snd = (...a) => window.Arcade && Arcade.play(...a);

let D;
try { const r = await fetch(new URL('data.json', HERE)); if (!r.ok) throw new Error(r.status); D = await r.json(); }
catch (e) {
  $('stages').innerHTML = '<p class="loaderr">게임 데이터(data.json)를 불러오지 못했어요.<br>인터넷 연결을 확인하거나, 컴퓨터에서는 웹 서버로 열어 주세요.</p>';
  console.error('data.json 불러오기 실패', e); return;
}
const STAGES = D.stages, QN = D.questionsPerStage, W = D.words;

// ---------- 도구
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wpick = list => { let r = Math.random() * list.reduce((s, x) => s + (x.weight ?? 1), 0); for (const x of list) { r -= x.weight ?? 1; if (r <= 0) return x; } return list[list.length - 1]; };
const r5 = (a, b, s = 5) => a + s * ri(0, Math.floor((b - a) / s));   // a~b 사이 s 의 배수 간격
const rad = d => d * Math.PI / 180, u = d => [Math.cos(rad(d)), Math.sin(rad(d))];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const norm = d => ((d % 360) + 360) % 360;
const dirOf = (a, b) => norm(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI);
const rot = (p, d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const deg = v => v + '°';
const O = [0, 0];
// 수 보기: 정답 + 헷갈리기 쉬운 후보(앞에 있을수록 우선)
function numCh(ans, cands, n = 4, ok = v => v > 0 && v < 1100) {
  const out = [], seen = new Set([ans]);
  for (const v of cands) if (out.length < n - 1 && Number.isInteger(v) && ok(v) && !seen.has(v)) { seen.add(v); out.push(v); }
  for (let d = 5; out.length < n - 1; d += 5) for (const v of [ans + d, ans - d]) if (out.length < n - 1 && ok(v) && !seen.has(v)) { seen.add(v); out.push(v); }
  return shuffle([ans, ...out]).map(deg);
}

// ---------- 그림 만들기 (수학 좌표 → SVG)
function Fig() {
  const parts = []; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const xy = p => { const x = p[0], y = -p[1]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); return [+x.toFixed(1), +y.toFixed(1)]; };
  const arcD = (v, a1, span, r) => { const [sx, sy] = xy(add(v, u(a1), r)), [ex, ey] = xy(add(v, u(a1 + span), r)); return [sx, sy, `A${r} ${r} 0 ${span > 180 ? 1 : 0} 0 ${ex} ${ey}`]; };
  const f = {
    xy, raw(s) { parts.push(s); },
    seg(a, b, cls, id) { const [ax, ay] = xy(a), [bx, by] = xy(b); parts.push(`<line${id ? ` id="${id}"` : ''} class="${cls}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`); },
    poly(pts, cls) { parts.push(`<polygon class="${cls}" points="${pts.map(p => xy(p).join(',')).join(' ')}"/>`); },
    dot(p, r = 5) { const [x, y] = xy(p); parts.push(`<circle class="vx" cx="${x}" cy="${y}" r="${r}"/>`); },
    text(p, t, cls, pad = 14) { const [x, y] = xy(p); xy([p[0] - pad, p[1] - pad]); xy([p[0] + pad, p[1] + pad]); parts.push(`<text class="${cls}" x="${x}" y="${y}">${t}</text>`); },
    // 꼭짓점 v 에서 방향 a1 부터 반시계로 span 만큼의 각 표시. q 이면 찾을 각(주황)
    angle(v, a1, span, r, label, q, square, at) {   // at: 글자를 놓을 방향(없으면 가운데)
      if (square) { const s = r * .5, p1 = add(v, u(a1), s), p2 = add(p1, u(a1 + 90), s), p3 = add(v, u(a1 + 90), s); parts.push(`<polyline class="sq" points="${[p1, p2, p3].map(p => xy(p).join(',')).join(' ')}"/>`); }
      else {
        const [vx, vy] = xy(v), [sx, sy, A] = arcD(v, a1, span, r);
        parts.push(`<path class="arcfill${q ? ' q' : ''}" d="M${vx} ${vy} L${sx} ${sy} ${A}Z"/><path class="arc${q ? ' q' : ''}" d="M${sx} ${sy} ${A}"/>`);
      }
      if (label != null) f.text(add(v, u(at ?? a1 + span / 2), r + 17 + Math.max(0, 45 - span) * .7), label, 'lab' + (q ? ' q' : ''));
    },
    // 반원 각도기: 안쪽(빨강) 눈금은 오른쪽이 0, 바깥쪽(파랑) 눈금은 왼쪽이 0
    protractor(R) {
      xy([-R, 0]); xy([R, R]);
      parts.push(`<g class="pro"><path class="pro-body" d="M${-R} 0 A${R} ${R} 0 0 1 ${R} 0 Z"/>`);
      for (let d = 0; d <= 180; d++) { const len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5; f.seg(add(O, u(d), R), add(O, u(d), R - len), 'pro-t' + (d % 10 ? '' : ' b')); }
      for (let d = 0; d <= 180; d += 10) { f.text(add(O, u(d), R - 25), 180 - d, 'pro-out', 0); f.text(add(O, u(d), R - 46), d, 'pro-in', 0); }
      parts.push('</g>');
    },
    arcPath(v, a1, span, r) { const [sx, sy, A] = arcD(v, a1, span, r); return `M${sx} ${sy} ${A}`; },
    svg(pad = 16, cls = '') { return `<svg class="${cls}" viewBox="${Math.floor(x0 - pad)} ${Math.floor(y0 - pad)} ${Math.ceil(x1 - x0 + 2 * pad)} ${Math.ceil(y1 - y0 + 2 * pad)}" preserveAspectRatio="xMidYMid meet" role="img">${parts.join('')}</svg>`; }
  };
  return f;
}
// 다각형: 각 꼭짓점의 안쪽 각 목록으로 볼록 다각형 만들기 (반시계 방향 꼭짓점). 마지막 두 변 길이는 닫히도록 계산
function genPoly(angles, tries = 300) {
  const n = angles.length, dirs = [0];
  for (let k = 1; k < n; k++) dirs.push(dirs[k - 1] + 180 - angles[k]);
  for (let t = 0; t < tries; t++) {
    const s = []; for (let k = 0; k < n - 2; k++) s.push(ri(120, 210));
    let w = [0, 0]; s.forEach((len, k) => { w = add(w, u(dirs[k]), len); }); w = [-w[0], -w[1]];
    const a = u(dirs[n - 2]), b = u(dirs[n - 1]), det = a[0] * b[1] - a[1] * b[0]; if (Math.abs(det) < 1e-6) continue;
    const sa = (w[0] * b[1] - w[1] * b[0]) / det, sb = (a[0] * w[1] - a[1] * w[0]) / det;
    if (sa < 80 || sb < 80 || sa > 320 || sb > 320) continue;
    const lens = [...s, sa, sb], pts = [[0, 0]];
    for (let k = 0; k < n - 1; k++) pts.push(add(pts[k], u(dirs[k]), lens[k]));
    return pts;
  }
  return null;
}
// 다각형 그리기: 각 표시(labels[i]: 숫자·'?'·null)
function drawPoly(f, pts, labels, qi, r = 28) {
  f.poly(pts, 'edge');
  pts.forEach((p, i) => {
    const nx = pts[(i + 1) % pts.length], pv = pts[(i - 1 + pts.length) % pts.length], a1 = dirOf(p, nx), span = norm(dirOf(p, pv) - a1);
    if (labels[i] !== null) f.angle(p, a1, span, r, labels[i], i === qi);
  });
  pts.forEach(p => f.dot(p, 4));
}
const rotAll = (pts, d) => pts.map(p => rot(p, d));

// ---------- 문제 만들기: {svg, ask, answer, choices, rule[], hint, kind}
const GEN = {
  read(g) {
    const t = r5(g.min, g.max, g.step), left = Math.random() < g.baseLeftChance, phi = left ? 180 - t : t, R = 175, f = Fig();
    f.protractor(R); f.seg(O, [left ? -(R + 34) : R + 34, 0], 'arm'); f.seg(O, add(O, u(phi), R + 34), 'arm');
    f.angle(O, left ? phi : 0, t, 34, null, true); f.dot(O);
    const line = left ? '변이 왼쪽 0에서 시작해요 → 바깥쪽(파란) 눈금을 읽어요' : '변이 오른쪽 0에서 시작해요 → 안쪽(빨간) 눈금을 읽어요';
    return { svg: f.svg(), ask: '각도기로 잰 <b>각</b>의 크기는?', answer: deg(t), choices: numCh(t, [180 - t, t + 10, t - 10, t + 5, t - 5], 4, v => v > 0 && v < 180),
             rule: [line, `각의 크기는 ${t}°`], hint: line, hl: left ? 'hl-out' : 'hl-in', sig: 'r' + t + left };
  },
  make(g) {
    let t; do { t = r5(g.min, g.max, g.step); } while (t === 90 && Math.random() < .6);
    const left = Math.random() < g.baseLeftChance, R = 175, L = R + 34, f = Fig(), start = t > 60 && t < 120 ? pick([30, 150]) : 90;
    f.protractor(R); xy3(f, L);
    f.seg(O, [left ? -L : L, 0], 'arm');
    f.seg(O, O, 'ghost', 'ghost');
    f.raw(`<path id="mkArc" class="arc q" d=""/>`);
    f.seg(O, add(O, u(start), L), 'arm free', 'freeArm');
    const [hx, hy] = f.xy(add(O, u(start), L)); f.raw(`<circle id="handle" class="handle" cx="${hx}" cy="${hy}" r="15"/>`); f.dot(O);
    const line = left ? `왼쪽 0에서 시작하니 바깥쪽(파란) 눈금 ${t}에 맞춰요` : `오른쪽 0에서 시작하니 안쪽(빨간) 눈금 ${t}에 맞춰요`;
    return { kind: 'make', svg: f.svg(16, 'make'), ask: `각도기를 보고 <b>${t}°</b>인 각을 만들어요<br><small style="font-size:.7em;color:var(--mute)">주황색 변을 끌어서 돌려요</small>`,
             answer: deg(t), target: t, left, step: g.step, R, L, phi: start, rule: [line], hint: line, hl: left ? 'hl-out' : 'hl-in', sig: 'm' + t + left };
  },
  type() {
    const r = Math.random(), t = r < .4 ? r5(20, 80) : r < .6 ? 90 : r5(100, 165), r0 = r5(0, 345, 15), f = Fig();
    f.seg(O, add(O, u(r0), 150), 'arm'); f.seg(O, add(O, u(r0 + t), 150), 'arm'); f.angle(O, r0, t, 36, null, true); f.dot(O);
    const ans = t < 90 ? W.acute : t === 90 ? W.right : W.obtuse;
    return { svg: f.svg(), ask: '이 각은 어떤 각일까요?', answer: ans, choices: [W.acute, W.right, W.obtuse], words: true,
             rule: [`이 각은 ${t}°예요.`, '90°보다 작으면 예각, 90°이면 직각, 90°보다 크면 둔각'], hint: '직각(90°)보다 큰지 작은지 견주어 봐요', sig: 'y' + t + r0 };
  },
  estimate() {
    const t = r5(20, 160, 10), r0 = r5(0, 345, 15), f = Fig();
    f.seg(O, add(O, u(r0), 150), 'arm'); f.seg(O, add(O, u(r0 + t), 150), 'arm'); f.angle(O, r0, t, 40, '?', true); f.dot(O);
    const others = shuffle([...Array(17).keys()].map(i => 10 + i * 10).filter(v => Math.abs(v - t) >= 30));
    const picked = []; for (const v of others) if (picked.length < 3 && picked.every(p => Math.abs(p - v) >= 20)) picked.push(v);
    return { svg: f.svg(), ask: '<b>?</b> 각의 크기와 가장 가까운 것은?', answer: deg(t), choices: shuffle([t, ...picked]).map(deg),
             rule: [`이 각은 ${t}°예요.`, '직각(90°)이나 그 절반(45°)과 견주면 어림하기 쉬워요'], hint: t === 90 ? '직각과 견주어 봐요' : `직각(90°)보다 ${t < 90 ? '작아요' : '커요'}`, sig: 'e' + t + r0 };
  },
  compare() {
    let a = r5(20, 150), b; if (Math.random() < .25) b = a; else do { b = r5(20, 150); } while (Math.abs(a - b) < 15);
    const f = Fig(), longA = a < b ? 160 : 70, longB = a < b ? 70 : 160;
    [[-180, a, longA, r5(-20, 20)], [180, b, longB, r5(-20, 20)]].forEach(([x, t, len, r0]) => {
      const v = [x, 0]; f.seg(v, add(v, u(r0), len), 'arm'); f.seg(v, add(v, u(r0 + t), len), 'arm'); f.angle(v, r0, t, 30, null, false); f.dot(v);
    });
    f.text([-180, -60], '왼쪽', 'cap'); f.text([180, -60], '오른쪽', 'cap');
    const ans = a === b ? W.same : a > b ? W.left : W.rightSide;
    return { svg: f.svg(), ask: '어느 각이 더 클까요?', answer: ans, choices: [W.left, W.rightSide, W.same], words: true,
             rule: [`왼쪽 ${a}°, 오른쪽 ${b}°`, '변의 길이가 아니라 두 변이 벌어진 정도가 각의 크기예요'], hint: '변이 길다고 각이 큰 게 아니에요. 얼마나 벌어졌는지 봐요', sig: 'c' + a + '-' + b };
  },
  sum() {
    let a, b; do { a = r5(25, 85); b = r5(25, 85); } while (a + b > 165);
    const r0 = r5(0, 345, 15), f = Fig();
    [0, a, a + b].forEach(d => f.seg(O, add(O, u(r0 + d), 160), 'arm'));
    const mid = (a + b) / 2, at = Math.abs(mid - a) < 12 ? r0 + mid + (b >= a ? 14 : -14) : r0 + mid;
    f.angle(O, r0, a + b, 90, '?', true, false, at); f.angle(O, r0, a, 42, deg(a)); f.angle(O, r0 + a, b, 42, deg(b)); f.dot(O);
    return { svg: f.svg(), ask: '큰 <b>?</b> 각의 크기는?', answer: deg(a + b), choices: numCh(a + b, [Math.abs(a - b), 180 - a - b, a + b + 10, a + b - 10]),
             rule: [`${a}° + ${b}° = ${a + b}°`], hint: '두 각을 합하면 돼요', sig: 's' + a + '-' + b };
  },
  diff() {
    const c = r5(80, 170), a = r5(25, c - 25), r0 = r5(0, 345, 15), f = Fig();
    [0, a, c].forEach(d => f.seg(O, add(O, u(r0 + d), 160), 'arm'));
    const at = Math.abs(c / 2 - a) < 12 ? r0 + c / 2 + (c / 2 >= a ? 14 : -14) : r0 + c / 2;
    f.angle(O, r0, c, 95, deg(c), false, false, at); f.angle(O, r0, a, 40, deg(a)); f.angle(O, r0 + a, c - a, 40, '?', true); f.dot(O);
    return { svg: f.svg(), ask: '<b>?</b> 각의 크기는?', answer: deg(c - a), choices: numCh(c - a, [c + a, a, c - a + 10, c - a - 10]),
             rule: [`${c}° − ${a}° = ${c - a}°`], hint: '전체 각에서 아는 각을 빼요', sig: 'd' + c + '-' + a };
  },
  straight() {
    const a = r5(25, 155), r0 = r5(-30, 30, 15), f = Fig(), ans = 180 - a;
    f.seg(add(O, u(r0), 170), add(O, u(r0 + 180), 170), 'arm'); f.seg(O, add(O, u(r0 + a), 160), 'arm');
    f.angle(O, r0, a, 44, deg(a)); f.angle(O, r0 + a, ans, 44, '?', true); f.dot(O);
    return { svg: f.svg(), ask: '<b>?</b> 각의 크기는?', answer: deg(ans), choices: numCh(ans, [360 - a, a, 90 - a, ans + 10, ans - 10]),
             rule: ['한 직선이 이루는 각은 180°', `180° − ${a}° = ${ans}°`], hint: '쭉 뻗은 직선이 이루는 각은 180°예요', sig: 't' + a + r0 };
  },
  right() {
    const a = r5(15, 75), r0 = r5(0, 345, 15), f = Fig(), ans = 90 - a;
    [0, a, 90].forEach(d => f.seg(O, add(O, u(r0 + d), 160), 'arm'));
    f.angle(O, r0, 90, 38, null, false, true); f.angle(O, r0, a, 62, deg(a)); f.angle(O, r0 + a, ans, 62, '?', true); f.dot(O);
    return { svg: f.svg(), ask: '<b>?</b> 각의 크기는?', answer: deg(ans), choices: numCh(ans, [180 - a, a, ans + 10, ans - 10]),
             rule: ['ㄴ 모양 표시는 직각, 90°예요', `90° − ${a}° = ${ans}°`], hint: '꼭짓점의 ㄴ 표시는 직각(90°)이에요', sig: 'g' + a + r0 };
  },
  full() {
    let a, b; do { a = r5(60, 150); b = r5(60, 150); } while (360 - a - b < 60);
    const r0 = r5(0, 345, 15), f = Fig(), ans = 360 - a - b;
    [0, a, a + b].forEach(d => f.seg(O, add(O, u(r0 + d), 150), 'arm'));
    f.angle(O, r0, a, 40, deg(a)); f.angle(O, r0 + a, b, 40, deg(b)); f.angle(O, r0 + a + b, ans, 40, '?', true); f.dot(O);
    return { svg: f.svg(), ask: '<b>?</b> 각의 크기는?', answer: deg(ans), choices: numCh(ans, [180 - a - b, a + b, ans + 10, ans - 10]),
             rule: ['한 점을 한 바퀴 도는 각은 360°', `360° − ${a}° − ${b}° = ${ans}°`], hint: '한 바퀴는 360°예요', sig: 'f' + a + '-' + b };
  },
  triangle() {
    let A, B, C; do { A = r5(30, 110); B = r5(30, 110); C = 180 - A - B; } while (C < 30 || C > 110);
    const bl = 220 * Math.sin(rad(B)) / Math.sin(rad(C));
    const pts = rotAll([[0, 0], [220, 0], add(O, u(A), bl)], r5(-15, 15)), ang = [A, B, C], qi = ri(0, 2), f = Fig();
    drawPoly(f, pts, ang.map((v, i) => i === qi ? '?' : deg(v)), qi);
    const known = ang.filter((_, i) => i !== qi), ans = ang[qi];
    return { svg: f.svg(), ask: '삼각형의 <b>?</b> 각의 크기는?', answer: deg(ans), choices: numCh(ans, [known[0] + known[1], 360 - known[0] - known[1], ans + 10, ans - 10]),
             rule: ['삼각형 세 각의 합은 180°', `180° − ${known[0]}° − ${known[1]}° = ${ans}°`], hint: '삼각형 세 각의 크기를 모두 더하면 180°예요', sig: 'T' + ang.join() + qi };
  },
  quad() {
    let ang, pts; do { const a = [r5(60, 140), r5(60, 140), r5(60, 140)]; a.push(360 - a[0] - a[1] - a[2]); ang = a; pts = a[3] >= 55 && a[3] <= 150 ? genPoly(a) : null; } while (!pts);
    pts = rotAll(pts, r5(-10, 10)); const qi = ri(0, 3), f = Fig();
    drawPoly(f, pts, ang.map((v, i) => i === qi ? '?' : deg(v)), qi);
    const known = ang.filter((_, i) => i !== qi), s = known.reduce((x, y) => x + y, 0), ans = ang[qi];
    return { svg: f.svg(), ask: '사각형의 <b>?</b> 각의 크기는?', answer: deg(ans), choices: numCh(ans, [s, 180 - (s - 180), 540 - s, ans + 10, ans - 10]),
             rule: ['사각형 네 각의 합은 360°', `360° − ${known.map(deg).join(' − ')} = ${ans}°`], hint: '사각형은 삼각형 2개로 나눌 수 있어요: 180° × 2 = 360°', sig: 'Q' + ang.join() + qi };
  },
  isosceles() {
    const A = r5(40, 140, 10), B = (180 - A) / 2, h = 110 * Math.tan(rad(B)), f = Fig(), base = Math.random() < .5 ? 0 : 1;
    const pts = [[0, 0], [220, 0], [110, h]];
    drawPoly(f, pts, [base === 0 ? '?' : null, base === 1 ? '?' : null, deg(A)], base);
    for (const [p, q] of [[pts[0], pts[2]], [pts[1], pts[2]]]) { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d = dirOf(p, q) + 90; f.seg(add(m, u(d), -9), add(m, u(d), 9), 'tick'); }
    return { svg: f.svg(), ask: '이등변삼각형의 <b>?</b> 각의 크기는?', answer: deg(B), choices: numCh(B, [180 - A, A, A / 2, B + 10, B - 10]),
             rule: ['이등변삼각형은 두 밑각의 크기가 같아요', `(180° − ${A}°) ÷ 2 = ${B}°`], hint: '빗금 표시가 있는 두 변의 길이가 같아요. 그러면 두 밑각도 같아요', sig: 'I' + A + base };
  },
  triStraight() {
    let A, B, C; do { A = r5(30, 90); B = r5(40, 110); C = 180 - A - B; } while (C < 30);
    const E = 180 - B, bl = 200 * Math.sin(rad(B)) / Math.sin(rad(C)), pts = [[0, 0], [200, 0], add(O, u(A), bl)], f = Fig();
    f.seg(pts[1], [290, 0], 'arm');
    drawPoly(f, pts, [deg(A), null, '?'], 2);
    f.angle(pts[1], 0, E, 34, deg(E));
    return { svg: f.svg(), ask: '삼각형의 <b>?</b> 각의 크기는?', answer: deg(C), choices: numCh(C, [B, 180 - E, E - A + 10, 180 - A, C + 10, C - 10]),
             rule: [`직선 위의 각: 180° − ${E}° = ${B}°`, `삼각형: 180° − ${A}° − ${B}° = ${C}°`], hint: '먼저 직선(180°)을 이용해 삼각형 안쪽의 각을 구해요', sig: 'X' + A + '-' + B };
  },
  polySum(g) {
    const n = pick(g.sides), name = W.polygonNames[n], f = Fig(), ans = 180 * (n - 2);
    const pts = [...Array(n).keys()].map(i => add(O, u(-90 + 180 / n + 360 / n * i + ri(-8, 8)), 140 + ri(-15, 15)));
    f.poly(pts, 'edge'); for (let k = 2; k < n - 1; k++) f.seg(pts[0], pts[k], 'split'); pts.forEach(p => f.dot(p, 4));
    return { svg: f.svg(), ask: `${name}의 모든 각의 크기를 더하면?`, answer: deg(ans), choices: numCh(ans, [180 * (n - 3), 180 * (n - 1), 180 * n, 360 * (n - 2)]),
             rule: [`한 꼭짓점에서 선을 그으면 삼각형 ${n - 2}개`, `180° × ${n - 2} = ${ans}°`], hint: '점선으로 나뉜 삼각형이 몇 개인지 세어 봐요', sig: 'P' + n + Math.random() };
  },
  regular(g) {
    const n = pick(g.sides), name = W.polygonNames[n], f = Fig(), sum = 180 * (n - 2), ans = sum / n, qi = ri(0, n - 1);
    const pts = [...Array(n).keys()].map(i => add(O, u(-90 + 180 / n + 360 / n * i), 130));
    drawPoly(f, pts, pts.map((_, i) => i === qi ? '?' : null), qi, 26);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d = dirOf(p, q) + 90; f.seg(add(m, u(d), -8), add(m, u(d), 8), 'tick'); }
    return { svg: f.svg(), ask: `정${name}의 한 각의 크기는?`, answer: deg(ans), choices: numCh(ans, [360 / n, sum, ans + 10, ans - 10]),
             rule: [`정${name}의 모든 각의 합: 180° × ${n - 2} = ${sum}°`, `${n}개의 각이 모두 같으니 ${sum}° ÷ ${n} = ${ans}°`], hint: '모든 각의 합을 먼저 구하고, 각의 개수로 나눠요', sig: 'R' + n };
  },
  polyMissing() {
    let ang, pts; do { const a = [0, 1, 2, 3].map(() => r5(85, 135)); a.push(540 - a.reduce((x, y) => x + y, 0)); ang = a; pts = a[4] >= 80 && a[4] <= 150 ? genPoly(a) : null; } while (!pts);
    const qi = ri(0, 4), f = Fig(); drawPoly(f, pts, ang.map((v, i) => i === qi ? '?' : deg(v)), qi, 26);
    const known = ang.filter((_, i) => i !== qi), s = known.reduce((x, y) => x + y, 0), ans = ang[qi];
    return { svg: f.svg(), ask: '오각형의 <b>?</b> 각의 크기는?', answer: deg(ans), choices: numCh(ans, [720 - s, 360 - s, ans + 10, ans - 10, ans + 20]),
             rule: ['오각형은 삼각형 3개로 나뉘어요: 180° × 3 = 540°', `540° − (${known.join(' + ')})° = ${ans}°`], hint: '오각형 다섯 각의 합은 180° × 3 이에요', sig: 'M' + ang.join() + qi };
  }
};
function xy3(f, L) { f.xy([-L - 10, 0]); f.xy([L + 10, 0]); f.xy([0, L + 10]); }

// ---------- 진행
let stage = 1, qi = 0, results = [], cur = null, tries = 0, locked = false, used = new Set();
let stars = store.get('angleStars', {}); if (!stars || typeof stars !== 'object') stars = {};
const S = () => STAGES[stage - 1];

function startStage(n) { stage = n; qi = 0; results = []; used = new Set(); $('stgName').textContent = `${n}단계 · ${S().short}`; show(null); nextQ(); }
function nextQ() {
  $('fb').hidden = true; locked = false; tries = 0;
  let q, g = 0; do { const k = wpick(S().kinds); q = GEN[k.kind](k); q.kind = q.kind || k.kind; } while (used.has(q.sig) && ++g < 30);
  used.add(q.sig); cur = q;
  $('ask').innerHTML = q.ask; $('scene').innerHTML = q.svg;
  const C = $('choices'); C.innerHTML = ''; C.className = 'choices';
  if (q.kind === 'make') {
    C.classList.add('one'); const b = document.createElement('button'); b.className = 'btn'; b.textContent = '다 만들었어요!'; b.onclick = checkMake; C.appendChild(b);
    setupMake();
  } else {
    if (q.choices.length === 3) C.classList.add('three');
    q.choices.forEach((t, i) => { const b = document.createElement('button'); b.className = 'ch' + (q.words ? ' sm' : ''); b.textContent = t; b.setAttribute('aria-label', `${i + 1}번 ${t}`); b.onclick = () => choose(t, b); C.appendChild(b); });
  }
  dots();
}
function dots() { const el = $('dots'); el.innerHTML = ''; for (let i = 0; i < QN; i++) { const d = document.createElement('i'); if (results[i]) d.className = results[i]; else if (i === qi) d.className = 'now'; el.appendChild(d); } }
function panel(cls, title, lines, btn, fn) {
  const fb = $('fb'); fb.className = 'fb' + (cls ? ' ' + cls : ''); fb.hidden = false;
  $('fbTitle').textContent = title; $('fbText').innerHTML = lines.map(l => `<span>${l}</span>`).join(''); $('nextBtn').textContent = btn; $('nextBtn').onclick = fn;
  $('nextBtn').focus({ preventScroll: true });
}
const nextLabel = () => qi < QN - 1 ? '다음 사건' : '결과 보기';
function hintFx() { if (cur.hl) { const p = $('scene').querySelector('.pro'); if (p) p.classList.add(cur.hl); } }
function reveal() {
  hintFx();
  const q = $('scene').querySelector('.lab.q'); if (q && /°$/.test(cur.answer)) { q.textContent = cur.answer; q.classList.add('ok'); }
}
// 맞힘(o) · 다시 해서 맞힘(f) · 틀림(x) 공통 처리
function judge(ok, btn) {
  tries++;
  if (ok) {
    locked = true; results[qi] = tries === 1 ? 'o' : 'f'; if (btn) btn.classList.add('right'); reveal(); snd(tries === 1 ? 'coin' : 'level');
    panel(tries === 1 ? '' : 'mid', tries === 1 ? pick(D.praise) : '고쳤어요! 잘했어요', cur.rule, nextLabel(), advance);
  } else if (tries === 1) {
    results[qi] = 'x'; if (btn) { btn.classList.add('wrong'); btn.disabled = true; } snd('bad'); hintFx();
    panel('bad', '다시 볼까요?', ['힌트: ' + cur.hint], cur.kind === 'make' ? '다시 돌려 보기' : '다시 고르기', () => { $('fb').hidden = true; });
  } else {
    locked = true; if (btn) btn.classList.add('wrong'); snd('bad'); reveal();
    $('choices').querySelectorAll('.ch').forEach(x => { if (x.textContent === cur.answer) x.classList.add('right'); });
    if (cur.kind === 'make') showGhost();
    panel('bad', '정답은 ' + cur.answer, cur.rule, nextLabel(), advance);
  }
  dots();
}
function choose(t, b) { if (locked || b.disabled) return; judge(t === cur.answer, b); }

// ---------- 각 그리기: 주황 변 끌기
function setArm(phi) {
  const q = cur, svg = $('scene').querySelector('svg'); q.phi = phi;
  const end = add(O, u(phi), q.L), x = end[0].toFixed(1), y = (-end[1]).toFixed(1);
  const arm = svg.querySelector('#freeArm'); arm.setAttribute('x2', x); arm.setAttribute('y2', y);
  const h = svg.querySelector('#handle'); h.setAttribute('cx', x); h.setAttribute('cy', y);
  const a1 = q.left ? phi : 0, span = q.left ? 180 - phi : phi;
  svg.querySelector('#mkArc').setAttribute('d', span > 0 ? Fig().arcPath(O, a1, span, 34) : '');
}
function setupMake() {
  const svg = $('scene').querySelector('svg'); let drag = false;
  const angleAt = e => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse()), x = p.x, y = -p.y;
    let a = y < 0 ? (x >= 0 ? 0 : 180) : Math.atan2(y, x) * 180 / Math.PI;
    return Math.max(0, Math.min(180, Math.round(a / cur.step) * cur.step));
  };
  const move = e => { if (!drag || locked) return; const a = angleAt(e); if (a !== cur.phi) { setArm(a); snd('tick'); } };
  svg.addEventListener('pointerdown', e => { if (locked) return; drag = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} move(e); });
  svg.addEventListener('pointermove', move);
  const end = () => { drag = false; }; svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  setArm(cur.phi);
}
function checkMake() {
  if (locked) return;
  const made = cur.left ? 180 - cur.phi : cur.phi; judge(made === cur.target, null);
  if (tries === 1 && made !== cur.target) $('fbText').insertAdjacentHTML('afterbegin', `<span>지금 만든 각은 ${made}°예요.</span>`);
}
function showGhost() {
  const svg = $('scene').querySelector('svg'), phi = cur.left ? 180 - cur.target : cur.target, end = add(O, u(phi), cur.L), g = svg.querySelector('#ghost');
  g.setAttribute('x2', end[0].toFixed(1)); g.setAttribute('y2', (-end[1]).toFixed(1));
}

function advance() { $('fb').hidden = true; if (qi >= QN - 1) return endStage(); qi++; nextQ(); }
addEventListener('keydown', e => {
  if (!$('fb').hidden && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); $('nextBtn').click(); return; }
  const k = +e.key; if ($('fb').hidden && $('titleOv').hidden && $('endOv').hidden && k >= 1 && k <= 4) { const b = $('choices').querySelectorAll('.ch')[k - 1]; if (b) b.click(); }
});

// ---------- 단계 끝
function endStage() {
  const ok = results.filter(r => r === 'o').length, fixed = results.filter(r => r === 'f').length;
  const s = D.starThresholds.filter(n => ok >= n).length;
  stars[stage] = Math.max(stars[stage] || 0, s); store.set('angleStars', stars);
  store.set('angleStarTotal', Object.values(stars).reduce((a, b) => a + b, 0));
  $('eStars').innerHTML = '★'.repeat(s) + '<span style="color:#e6dfcc;text-shadow:none">' + '★'.repeat(3 - s) + '</span>';
  $('eTitle').textContent = D.endTitles[s];
  $('eTxt').textContent = `${stage}단계 · ${S().name}\n사건 ${QN}개 중 ${ok}개는 한 번에 풀었어요` + (fixed ? `\n${fixed}개는 다시 해서 풀었어요` : '') + (s < 3 ? `\n별 3개는 ${QN}개 모두 한 번에!` : '');
  $('nextStageBtn').hidden = stage >= STAGES.length || s === 0; $('nextStageBtn').textContent = `${stage + 1}단계로`;
  show('endOv'); snd(s >= 2 ? 'win' : s === 1 ? 'level' : 'lose');
  ($('nextStageBtn').hidden ? $('againBtn') : $('nextStageBtn')).focus();
}
$('nextStageBtn').onclick = () => startStage(stage + 1);
$('againBtn').onclick = () => startStage(stage);
$('pickBtn').onclick = () => { renderStages(); show('titleOv'); };
$('menuBtn').onclick = () => { $('fb').hidden = true; renderStages(); show('titleOv'); };
function show(id) { for (const o of ['titleOv', 'endOv']) $(o).hidden = o !== id; }
function renderStages() {
  const el = $('stages'); el.innerHTML = ''; const next = STAGES.findIndex((_, i) => !stars[i + 1]);
  STAGES.forEach((st, i) => {
    const n = i + 1, s = stars[n] || 0, b = document.createElement('button'); b.className = 'stage' + (i === next ? ' next' : '');
    b.innerHTML = `<span class="no">${n}</span><span class="nm">${st.name}${st.challenge ? '<span class="tagc">도전</span>' : ''}<small>${st.sub}${st.grade ? ' · ' + st.grade : ''}</small></span><span class="st">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></span>`;
    b.onclick = () => { snd('click'); startStage(n); }; el.appendChild(b);
  });
}
renderStages();
})();
