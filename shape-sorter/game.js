/* 도형 분류소 — 삼각형·사각형·다각형 (4학년 2학기)
 * 공통 진행은 ../common/learn.js, 색·O/X 문장·단계는 data.json
 * 저장 키: shapesStars, shapesStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const rad = d => d * Math.PI / 180;

/* ---------- 그림 도우미 ---------- */
// 점들을 viewBox 안에 맞추기
function fit(pts, W = 320, H = 260, pad = 46) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1, k = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const ox = (W - w * k) / 2 - Math.min(...xs) * k, oy = (H - h * k) / 2 - Math.min(...ys) * k;
  return pts.map(([x, y]) => [x * k + ox, y * k + oy]);
}
const poly = (P, fill = C.fill) => `<polygon points="${P.map(p => p.join(',')).join(' ')}" fill="${fill}" stroke="${C.edge}" stroke-width="3.5" stroke-linejoin="round"/>`;
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
// 변 바깥쪽에 글자 놓기
function sideLabel(P, i, text, cls = 'dim') {
  const a = P[i], b = P[(i + 1) % P.length], m = mid(a, b), cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
  let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny); nx /= l; ny /= l; if ((m[0] - cx) * nx + (m[1] - cy) * ny < 0) { nx = -nx; ny = -ny; }
  return `<text class="${cls}" x="${m[0] + nx * 18}" y="${m[1] + ny * 18}">${text}</text>`;
}
// 같은 길이 표시(눈금 n개)
function ticks(P, i, n) {
  const a = P[i], b = P[(i + 1) % P.length], m = mid(a, b), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  let s = ''; for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 7; s += `<line x1="${m[0] + ux * o - nx * 8}" y1="${m[1] + uy * o - ny * 8}" x2="${m[0] + ux * o + nx * 8}" y2="${m[1] + uy * o + ny * 8}" stroke="${C.mark}" stroke-width="3"/>`; }
  return s;
}
// 꼭짓점 i 의 직각 표시 / 각도 글자
function corner(P, i, txt) {
  const p = P[i], a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length], u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]], lu = Math.hypot(...u), lv = Math.hypot(...v);
  const du = [u[0] / lu, u[1] / lu], dv = [v[0] / lv, v[1] / lv];
  if (txt === 'R') { const s = 14; return `<path d="M${p[0] + du[0] * s} ${p[1] + du[1] * s} L${p[0] + (du[0] + dv[0]) * s} ${p[1] + (du[1] + dv[1]) * s} L${p[0] + dv[0] * s} ${p[1] + dv[1] * s}" fill="none" stroke="${C.mark}" stroke-width="2.5"/>`; }
  const bx = du[0] + dv[0], by = du[1] + dv[1], bl = Math.hypot(bx, by) || 1, half = Math.acos(Math.max(-1, Math.min(1, du[0] * dv[0] + du[1] * dv[1]))) / 2, off = Math.max(30, Math.min(64, 17 / Math.sin(half)));
  return `<text class="ang" x="${p[0] + bx / bl * off}" y="${p[1] + by / bl * off}">${txt}</text>`;
}
// 평행 표시(화살표 n개)
function arrows(P, i, n, rev = false) {
  let a = P[i], b = P[(i + 1) % P.length]; if (rev) [a, b] = [b, a];
  const m = mid(a, b), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux;
  let s = ''; for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 9, x = m[0] + ux * o, y = m[1] + uy * o; s += `<path d="M${x - ux * 6 + nx * 6} ${y - uy * 6 + ny * 6} L${x} ${y} L${x - ux * 6 - nx * 6} ${y - uy * 6 - ny * 6}" fill="none" stroke="#3d74e5" stroke-width="3"/>`; }
  return s;
}
const svg = (inner, W = 320, H = 260) => `<svg viewBox="0 0 ${W} ${H}" class="fig" role="img">${inner}</svg>`;

/* ---------- 삼각형 만들기 ---------- */
function triFromSides(a, b, c) {      // 변 길이 a(BC) b(CA) c(AB)
  const x = (b * b + c * c - a * a) / (2 * c), y = -Math.sqrt(Math.max(1, b * b - x * x));
  return [[0, 0], [c, 0], [x, y]];
}
function triFromAngles(A, B) {          // 꼭짓점 A(0,0), B(1,0) 와 두 각
  const Cg = 180 - A - B, b = Math.sin(rad(B)) / Math.sin(rad(Cg));
  return [[0, 0], [1, 0], [b * Math.cos(rad(A)), -b * Math.sin(rad(A))]];
}
const rotate = (P, deg) => { const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)); return P.map(([x, y]) => [x * c - y * s, x * s + y * c]); };

const GEN = {
  triSide() {
    const t = pick(['정', '이등변', '이등변', '부등변']);
    let s; if (t === '정') { const v = ri(4, 9); s = [v, v, v]; } else if (t === '이등변') { const v = ri(5, 9), w = pick([3, 4, 6, 7, 8, 10, 11].filter(x => x !== v && x < 2 * v)); s = shuffle([v, v, w]); } else { do { s = [ri(4, 11), ri(4, 11), ri(4, 11)]; } while (new Set(s).size < 3 || Math.max(...s) * 2 >= s[0] + s[1] + s[2]); }
    const P = fit(rotate(triFromSides(s[0], s[1], s[2]), ri(-15, 15))), labels = [s[2], s[0], s[1]];
    const ans = t === '정' ? '정삼각형' : t === '이등변' ? '이등변삼각형' : '세 변이 모두 달라요';
    return { ask: '가장 알맞은 이름은?', scene: wrap(svg(poly(P) + labels.map((v, i) => sideLabel(P, i, v + ' cm')).join(''))),
             choices: ['정삼각형', '이등변삼각형', '세 변이 모두 달라요'], answer: ans, small: true, cols: 1,
             rule: [t === '정' ? '세 변의 길이가 모두 같아요 → 정삼각형 (이등변삼각형이기도 해요)' : t === '이등변' ? '두 변의 길이가 같아요 → 이등변삼각형' : '같은 길이의 변이 없어요'], hint: '길이가 같은 변이 몇 개인지 세어 봐요', sig: 's' + s.join() };
  },
  isoSide() {
    const v = ri(5, 12), w = ri(3, 2 * v - 2), P = fit(triFromSides(w, v, v)), total = 2 * v + w;
    return { ask: `이등변삼각형이에요. <b>세 변의 길이의 합</b>은?`, scene: wrap(svg(poly(P) + sideLabel(P, 0, v + ' cm') + sideLabel(P, 1, w + ' cm') + ticks(P, 0, 1) + ticks(P, 2, 1))),
             choices: nums(total, [v + w, 2 * w + v, total + 1, 3 * v], { ok: x => x > 0 && x !== total, fmt: x => x + ' cm' }), answer: total + ' cm',
             rule: ['표시가 같은 두 변의 길이가 같아요', `${v} + ${v} + ${w} = ${total} cm`], hint: '같은 표시가 있는 변은 길이가 같아요', sig: 'i' + v + w };
  },
  triAngle() {
    const t = pick(['예각', '직각', '둔각']);
    let A, B, Cc; for (;;) { A = ri(25, 110); B = ri(25, 110); Cc = 180 - A - B; const m = Math.max(A, B, Cc); if (Cc < 20) continue; if (t === '예각' && m < 85) break; if (t === '둔각' && m > 98 && m < 140) break; if (t === '직각') { A = 90; B = ri(25, 65); Cc = 90 - B; break; } }
    const ang = shuffle([A, B, Cc]), P = fit(rotate(triFromAngles(ang[0], ang[1]), ri(-10, 10)));
    const marks = [ang[0], ang[1], ang[2]].map((v, i) => corner(P, i, v === 90 ? 'R' : v + '°')).join('');
    return { ask: '각으로 분류하면?', scene: wrap(svg(poly(P) + marks)), choices: ['예각삼각형', '직각삼각형', '둔각삼각형'], answer: t + '삼각형',
             rule: [`세 각: ${ang.join('°, ')}°`, t === '예각' ? '세 각이 모두 예각(90°보다 작음)' : t === '직각' ? '한 각이 직각(90°)' : '한 각이 둔각(90°보다 큼)'], hint: '가장 큰 각이 90° 보다 작은지, 같은지, 큰지 보세요', sig: 'a' + ang.join() };
  },
  isoAngle() {
    const top = ri(2, 14) * 10, base = (180 - top) / 2, askTop = Math.random() < .4;
    const Q = fit([[0, 0], [2 * Math.sin(rad(top / 2)), 0], [Math.sin(rad(top / 2)), -Math.cos(rad(top / 2))]]);
    const ans = askTop ? top : base;
    const marks = askTop ? corner(Q, 0, base + '°') + corner(Q, 2, '?') : corner(Q, 2, top + '°') + corner(Q, 1, '?');
    return { ask: `이등변삼각형이에요. <b>?</b> 의 각도는?`, scene: wrap(svg(poly(Q) + ticks(Q, 1, 1) + ticks(Q, 2, 1) + marks)),
             choices: nums(ans, [180 - ans, ans + 10, ans - 10, askTop ? base : top], { ok: v => v > 0 && v < 180 && v !== ans, fmt: v => v + '°' }), answer: ans + '°',
             rule: ['이등변삼각형은 두 밑각의 크기가 같아요', '삼각형의 세 각의 합은 180°', askTop ? `180 − ${base} − ${base} = ${top}°` : `(180 − ${top}) ÷ 2 = ${base}°`], hint: '같은 길이의 두 변 아래 두 각은 크기가 같아요', sig: 'q' + top + askTop };
  },
  perp() { return lineQ('perp'); },
  para() { return lineQ('para'); },
  paraCount() {
    const k = pick(['사다리꼴', '평행사변형', '직사각형', '오각형', '정육각형']), n = { 사다리꼴: 1, 평행사변형: 2, 직사각형: 2, 오각형: 0, 정육각형: 3 }[k];
    const P = fit(shapePts(k));
    return { ask: '이 도형에서 <b>평행한 변</b>은 몇 쌍일까요?', scene: wrap(svg(poly(P, '#e7efff'))), choices: ['0쌍', '1쌍', '2쌍', '3쌍'], answer: n + '쌍', cols: 4,
             rule: [`${k}: 평행한 변 ${n}쌍`], hint: '마주 보는 변을 길게 늘여도 만나지 않으면 평행!', sig: 'c' + k };
  },
  quadName() {
    const k = pick(['사다리꼴', '평행사변형', '마름모', '직사각형', '정사각형']), base = shapePts(k), P = fit(rotate(base, k === '정사각형' || k === '직사각형' ? pick([0, 0, 15]) : ri(-8, 8)));
    let m = '';
    if (k === '사다리꼴') m = arrows(P, 0, 1) + arrows(P, 2, 1, true);
    if (k === '평행사변형') m = arrows(P, 0, 1) + arrows(P, 2, 1, true) + arrows(P, 1, 2) + arrows(P, 3, 2, true);
    if (k === '마름모') m = [0, 1, 2, 3].map(i => ticks(P, i, 1)).join('');
    if (k === '직사각형') m = [0, 1, 2, 3].map(i => corner(P, i, 'R')).join('') + ticks(P, 0, 1) + ticks(P, 2, 1) + ticks(P, 1, 2) + ticks(P, 3, 2);
    if (k === '정사각형') m = [0, 1, 2, 3].map(i => corner(P, i, 'R') + ticks(P, i, 1)).join('');
    const why = { 사다리꼴: '평행한 변이 한 쌍', 평행사변형: '마주 보는 두 쌍의 변이 평행', 마름모: '네 변의 길이가 모두 같아요', 직사각형: '네 각이 모두 직각', 정사각형: '네 각이 직각이고 네 변이 모두 같아요' };
    return { ask: '표시를 보고 <b>가장 알맞은</b> 이름은?', scene: wrap(svg(poly(P) + m)), choices: ['사다리꼴', '평행사변형', '마름모', '직사각형', '정사각형'], answer: k, small: true, cols: 2,
             rule: [`${k}: ${why[k]}`, '→ 화살표는 평행, 눈금은 같은 길이, ㄴ 표시는 직각'], hint: '화살표(평행), 눈금(같은 길이), 직각 표시를 모두 살펴봐요', sig: 'n' + k + ri(0, 3) };
  },
  ox() {
    const [t, ok, why] = pick(D.facts);
    return { ask: 'O 일까요, X 일까요?', scene: wrap(`<div class="fact">${t}</div>`), choices: ['⭕ 맞아요', '❌ 틀려요'], answer: ok ? '⭕ 맞아요' : '❌ 틀려요', once: true,
             rule: [(ok ? '맞아요! ' : '틀려요. ') + why], hint: '도형의 뜻을 떠올려 봐요', sig: 'x' + t };
  },
  polyName() {
    const [n, name] = pick(D.polygons.slice(2)), reg = Math.random() < .5;
    const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2, r = reg ? 1 : 1 + (i % 2 ? .25 : -.1) * (i % 3 ? 1 : -1); return [Math.cos(a) * r, Math.sin(a) * r]; });
    const P = fit(pts), ans = reg ? '정' + name : name;
    const others = D.polygons.filter(p => p[0] !== n && Math.abs(p[0] - n) <= 2).map(p => (reg ? '정' : '') + p[1]);
    return { ask: '이 도형의 이름은?', scene: wrap(svg(poly(P, '#e3f5e1') + (reg ? P.map((_, i) => ticks(P, i, 1)).join('') : ''))), choices: shuffle([ans, reg ? name : '정' + name, ...others.slice(0, 2)]), answer: ans, small: true,
             rule: [`변이 ${n}개 → ${name}`, reg ? '변의 길이와 각의 크기가 모두 같으면 정다각형' : '변의 길이가 모두 같지 않으면 “정”을 붙이지 않아요'], hint: '변의 수를 세고, 길이가 모두 같은지 보세요', sig: 'g' + n + reg };
  },
  diagonals() {
    const [n, name] = pick(D.polygons.slice(1, 5)), d = n * (n - 3) / 2;
    const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; }), P = fit(pts);
    let s = poly(P, '#e3f5e1'); for (let j = 2; j < n - 1; j++) s += `<line x1="${P[0][0]}" y1="${P[0][1]}" x2="${P[j][0]}" y2="${P[j][1]}" stroke="${C.mark}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
    return { ask: `<b>${name}</b>의 대각선은 모두 몇 개일까요?<small>점선은 한 꼭짓점에서 그은 대각선</small>`, scene: wrap(svg(s)), choices: nums(d, [n, d + 1, d - 1, n * (n - 3)], { ok: v => v > 0 && v !== d, fmt: v => v + '개' }), answer: d + '개',
             rule: ['대각선: 서로 이웃하지 않는 두 꼭짓점을 이은 선분', `한 꼭짓점에서 ${n - 3}개씩, ${n} × ${n - 3} ÷ 2 = ${d}개`], hint: '한 꼭짓점에서 그을 수 있는 대각선 수를 먼저 세어요', sig: 'd' + n };
  }
};

/* ---------- 사각형·다각형 점 ---------- */
function shapePts(k) {
  if (k === '정사각형') return [[0, 0], [1, 0], [1, 1], [0, 1]];
  if (k === '직사각형') { const h = pick([.5, .6, .7]); return [[0, 0], [1, 0], [1, h], [0, h]]; }
  if (k === '마름모') { const p = 1, q = pick([.55, .65, .75]); return [[0, -q], [p, 0], [0, q], [-p, 0]]; }
  if (k === '평행사변형') { const s = pick([.3, .4]), h = pick([.5, .6]); return [[s, 0], [1 + s, 0], [1, h], [0, h]]; }
  if (k === '사다리꼴') { const a = pick([.2, .3]), b = pick([.6, .7]), h = pick([.5, .6]); return [[a, 0], [b, 0], [1, h], [0, h]]; }
  if (k === '오각형') return [[.5, 0], [1, .35], [.85, 1], [.2, .95], [0, .4]];
  return Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
}

/* ---------- 수직·평행 직선 ---------- */
function lineQ(mode) {
  const names = ['가', '나', '다', '라'], base = ri(-35, 35), angs = [base, base + 90, base + (mode === 'perp' ? ri(35, 60) * pick([1, -1]) : 0), base + ri(30, 60) * pick([1, -1])];
  // 0: 기준, 1: 수직, 2: 평행(또는 아무), 3: 아무 — 평행 문제면 2 가 평행
  const order = shuffle([1, 2, 3]), lines = [0, ...order], W = 320, H = 280, cx = 160, cy = 140;
  const offs = { 0: [0, -40], 1: [30, 10], 2: [0, 50], 3: [-40, 20] };
  if (mode === 'para') offs[2] = [0, 60];
  let s = '';
  lines.forEach((li, idx) => {
    const a = rad(angs[li]), [ox, oy] = offs[li], dx = Math.cos(a), dy = Math.sin(a), L = 170;
    const x1 = cx + ox - dx * L, y1 = cy + oy - dy * L, x2 = cx + ox + dx * L, y2 = cy + oy + dy * L;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.line[idx]}" stroke-width="4" stroke-linecap="round"/>`;
    const lx = clampN(cx + ox + dx * 120, 18, W - 18), ly = clampN(cy + oy + dy * 120, 18, H - 18);
    s += `<circle cx="${lx}" cy="${ly}" r="14" fill="#fff" stroke="${C.line[idx]}" stroke-width="3"/><text class="ln" x="${lx}" y="${ly}">${names[idx]}</text>`;
  });
  const target = mode === 'perp' ? 1 : 2, ans = names[lines.indexOf(target)];
  return { ask: `직선 <b>가</b>와 ${mode === 'perp' ? '<b>수직</b>인' : '<b>평행</b>한'} 직선은?`, scene: wrap(`<svg viewBox="0 0 ${W} ${H}" class="fig" role="img"><defs><clipPath id="cl"><rect width="${W}" height="${H}" rx="18"/></clipPath></defs><g clip-path="url(#cl)">${s}</g></svg>`),
           choices: names.slice(1).map(n => '직선 ' + n), answer: '직선 ' + ans, cols: 3,
           rule: [mode === 'perp' ? '두 직선이 만나서 직각(90°)을 이루면 서로 수직' : '아무리 늘여도 만나지 않는 두 직선은 평행', `→ 직선 ${ans}`], hint: mode === 'perp' ? '삼각자의 직각을 대 보듯 생각해요' : '기울어진 방향이 똑같은 직선을 찾아요', sig: mode + base + order.join('') };
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

Learn.run({ data: D, key: 'shapes', gen: GEN });
});
