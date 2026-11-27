/* 선과 각 놀이터 — 3학년 1학기 평면도형
 * 선분·반직선·직선, 각, 직각, 직각삼각형·직사각형·정사각형
 * 공통 진행은 ../common/learn.js, 색·글자·O/X·단계는 data.json. 저장 키: planeStars, planeStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample, nums } = Learn.U, C = D.colors, L = D.letters;
const wrap = s => `<div class="box">${s}</div>`;
const W = 340, H = 260, rad = d => d * Math.PI / 180;
const svg = (inner, w = W, h = H) => `<svg viewBox="0 0 ${w} ${h}" class="fig" role="img"><defs><clipPath id="cp"><rect width="${w}" height="${h}" rx="18"/></clipPath></defs><g clip-path="url(#cp)">${inner}</g></svg>`;
const dot = (x, y, lab, dx = 0, dy = -20) => `<circle cx="${x}" cy="${y}" r="6" fill="${C.pt}"/>${lab ? `<text class="pl" x="${x + dx}" y="${y + dy}">${lab}</text>` : ''}`;
const seg = (x1, y1, x2, y2, col = C.line, w = 4) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;

/* ---------- 선 그리기 ---------- */
function lineFig(type, a, b, ang) {     // type: seg | rayAB | rayBA | line,  a·b 글자
  const cx = W / 2, cy = H / 2, d = 70, ux = Math.cos(rad(ang)), uy = Math.sin(rad(ang)), far = 400;
  const A = [cx - ux * d, cy - uy * d], B = [cx + ux * d, cy + uy * d];
  let s = '';
  if (type === 'seg') s += seg(...A, ...B);
  if (type === 'rayAB') s += seg(...A, cx + ux * far, cy + uy * far);
  if (type === 'rayBA') s += seg(...B, cx - ux * far, cy - uy * far);
  if (type === 'line') s += seg(cx - ux * far, cy - uy * far, cx + ux * far, cy + uy * far);
  const ox = -uy * 24, oy = ux * 24;
  return svg(s + dot(...A, a, ox, oy) + dot(...B, b, ox, oy));
}
const LINE_NAME = (type, a, b) => ({ seg: `선분 ${a}${b}`, rayAB: `반직선 ${a}${b}`, rayBA: `반직선 ${b}${a}`, line: `직선 ${a}${b}` })[type];

/* ---------- 각 그리기 ---------- */
function angleFig(deg, rot, labels, mark = false) {   // labels: [변 끝1, 꼭짓점, 변 끝2]
  const vx = deg > 100 ? 170 : 120, vy = 190, r1 = 115, a1 = rad(rot), a2 = rad(rot - deg);
  const P1 = [vx + Math.cos(a1) * r1, vy + Math.sin(a1) * r1], P2 = [vx + Math.cos(a2) * r1, vy + Math.sin(a2) * r1];
  let s = seg(vx, vy, P1[0] + Math.cos(a1) * 200, P1[1] + Math.sin(a1) * 200) + seg(vx, vy, P2[0] + Math.cos(a2) * 200, P2[1] + Math.sin(a2) * 200);
  if (mark) s += `<path d="M${vx + Math.cos(a1) * 34} ${vy + Math.sin(a1) * 34} A34 34 0 0 0 ${vx + Math.cos(a2) * 34} ${vy + Math.sin(a2) * 34}" fill="none" stroke="${C.mark}" stroke-width="3"/>`;
  const off = (a, k = 22) => [Math.cos(a + Math.PI / 2) * k, Math.sin(a + Math.PI / 2) * k];
  s += dot(...P1, labels[0], ...off(a1)) + dot(vx, vy, labels[1], -18, 18) + dot(...P2, labels[2], ...off(a2, -22));
  return svg(s);
}

/* ---------- 도형 점 ---------- */
function shapeFig(kind, marks = true, lens = null) {
  let P;
  const sx = ri(0, 1);
  if (kind === '직각삼각형') P = sx ? [[60, 210], [260, 210], [60, 60]] : [[80, 210], [280, 210], [280, 70]];
  else if (kind === '직사각형') P = [[50, 70], [290, 70], [290, 200], [50, 200]];
  else if (kind === '정사각형') P = [[95, 50], [255, 50], [255, 210], [95, 210]];
  else if (kind === '삼각형') P = [[60, 210], [280, 210], [180, 60]];
  else if (kind === '사각형') P = [[60, 80], [280, 50], [260, 210], [80, 200]];
  else P = [[70, 60], [300, 60], [250, 200], [20, 200]];              // 평행사변형(직각 없음)
  let s = `<polygon points="${P.map(p => p.join(',')).join(' ')}" fill="${C.fill}" stroke="${C.line}" stroke-width="4" stroke-linejoin="round"/>`;
  if (marks) P.forEach((p, i) => { const a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length], u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]], dotp = u[0] * v[0] + u[1] * v[1];
    if (Math.abs(dotp) < 1) { const lu = Math.hypot(...u), lv = Math.hypot(...v), k = 16; s += `<path d="M${p[0] + u[0] / lu * k} ${p[1] + u[1] / lu * k} L${p[0] + (u[0] / lu + v[0] / lv) * k} ${p[1] + (u[1] / lu + v[1] / lv) * k} L${p[0] + v[0] / lv * k} ${p[1] + v[1] / lv * k}" fill="none" stroke="${C.mark}" stroke-width="3"/>`; } });
  if (lens) lens.forEach(([i, t]) => { const a = P[i], b = P[(i + 1) % P.length], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], cx = P.reduce((q, p) => q + p[0], 0) / P.length, cy = P.reduce((q, p) => q + p[1], 0) / P.length; const dx = m[0] - cx, dy = m[1] - cy, l = Math.hypot(dx, dy) || 1; s += `<text class="len" x="${m[0] + dx / l * 20}" y="${m[1] + dy / l * 20}">${t}</text>`; });
  return svg(s);
}

const GEN = {
  lineName() {
    const [a, b] = sample(L.slice(0, 5), 2), type = pick(['seg', 'rayAB', 'rayBA', 'line', 'rayAB']), ang = ri(-30, 30);
    const ans = LINE_NAME(type, a, b), opts = [`선분 ${a}${b}`, `반직선 ${a}${b}`, `반직선 ${b}${a}`, `직선 ${a}${b}`];
    const why = { seg: '두 점을 곧게 이은 선 → 선분', rayAB: `점 ${a}에서 시작해 점 ${b} 쪽으로 끝없이 늘어나요 → 반직선 ${a}${b}`, rayBA: `점 ${b}에서 시작해 점 ${a} 쪽으로 늘어나요 → 반직선 ${b}${a}`, line: '양쪽으로 끝없이 늘어나요 → 직선' }[type];
    return { ask: '이 선의 이름은?', scene: wrap(lineFig(type, a, b, ang)), choices: opts, answer: ans, small: true,
             rule: [why, '반직선은 시작하는 점을 먼저 읽어요'], hint: '선의 끝이 점에서 멈추는지, 화면 끝까지 늘어나는지 보세요', sig: 'n' + type + a + b + ang };
  },
  lineKind() {
    const q = pick([['양쪽 끝이 있어서 길이를 잴 수 있는 곧은 선은?', '선분'], ['한 점에서 시작해 한쪽으로 끝없이 늘어나는 곧은 선은?', '반직선'], ['양쪽으로 끝없이 늘어나는 곧은 선은?', '직선']]);
    return { ask: q[0], scene: wrap(`<div class="emo">📏</div>`), choices: ['선분', '반직선', '직선'], answer: q[1],
             rule: ['선분: 두 점을 곧게 이은 선', '반직선: 한 점에서 한쪽으로 끝없이', '직선: 양쪽으로 끝없이'], hint: '끝이 몇 개인지 생각해 봐요', sig: 'k' + q[1] };
  },
  angleName() {
    const [x, v, y] = sample(L, 3), deg = ri(40, 140), rot = ri(-10, 10), askV = Math.random() < .35;
    if (askV) return { ask: '이 각의 <b>꼭짓점</b>은?', scene: wrap(angleFig(deg, rot, [x, v, y], true)), choices: shuffle([`점 ${x}`, `점 ${v}`, `점 ${y}`]), answer: `점 ${v}`,
                       rule: [`두 변이 만나는 점 ${v}가 꼭짓점`], hint: '두 반직선이 시작하는 점을 찾아요', sig: 'v' + x + v + y };
    const ans = `각 ${x}${v}${y}`, opts = shuffle([ans, `각 ${v}${x}${y}`, `각 ${x}${y}${v}`, `각 ${y}${x}${v}`]);
    return { ask: '이 각을 읽으면?', scene: wrap(angleFig(deg, rot, [x, v, y], true)), choices: opts, answer: opts.includes(ans) ? ans : ans, small: true,
             rule: [`꼭짓점 ${v}를 가운데에 써요`, `각 ${x}${v}${y} 또는 각 ${y}${v}${x}`], hint: '꼭짓점은 가운데에 읽어요', sig: 'a' + x + v + y };
  },
  angleCount() {
    const k = pick([['삼각형', 3], ['사각형', 4], ['오각형', 5], ['육각형', 6], ['원', 0]]);
    let s;
    if (k[1] === 0) s = svg(`<circle cx="170" cy="130" r="95" fill="${C.fill}" stroke="${C.line}" stroke-width="4"/>`);
    else { const n = k[1], P = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2 + (n === 4 ? Math.PI / 4 : 0); return [170 + Math.cos(a) * 100, 135 + Math.sin(a) * 100]; }); s = svg(`<polygon points="${P.map(p => p.join(',')).join(' ')}" fill="${C.fill}" stroke="${C.line}" stroke-width="4" stroke-linejoin="round"/>`); }
    return { ask: '이 도형에는 각이 몇 개 있을까요?', scene: wrap(s), choices: nums(k[1], [k[1] + 1, k[1] - 1, k[1] + 2, 1], { ok: v => v >= 0, fmt: v => v + '개' }), answer: k[1] + '개',
             rule: [k[1] ? `꼭짓점이 ${k[1]}개 → 각도 ${k[1]}개` : '원은 곧은 선이 없어서 각이 없어요'], hint: '두 곧은 선이 만나는 꼭짓점을 세어요', sig: 'c' + k[0] };
  },
  notAngle() {
    // 4개 중 각이 아닌 것: 굽은 선, 만나지 않는 선, 선분 하나
    const bad = pick(['curve', 'gap', 'round']), labs = ['가', '나', '다', '라'], pos = ri(0, 3);
    const tile = (kind, i) => {
      const ox = (i % 2) * 170, oy = Math.floor(i / 2) * 130;
      let s = `<rect x="${ox + 6}" y="${oy + 6}" width="158" height="118" rx="12" fill="#fff" stroke="#dbe4f3"/>`;
      if (kind === 'ok') { const d = ri(35, 115), vx = ox + 50; s += seg(vx, oy + 100, ox + 150, oy + 100) + seg(vx, oy + 100, vx + Math.cos(rad(-d)) * 75, oy + 100 + Math.sin(rad(-d)) * 75); }
      if (kind === 'curve') s += `<path d="M${ox + 30} ${oy + 100} L${ox + 150} ${oy + 100} M${ox + 30} ${oy + 100} Q${ox + 60} ${oy + 20} ${ox + 130} ${oy + 30}" fill="none" stroke="${C.line}" stroke-width="4"/>`;
      if (kind === 'gap') s += seg(ox + 40, oy + 100, ox + 150, oy + 100) + seg(ox + 28, oy + 88, ox + 90, oy + 20);
      if (kind === 'round') s += `<path d="M${ox + 30} ${oy + 100} Q${ox + 90} ${oy + 20} ${ox + 150} ${oy + 100}" fill="none" stroke="${C.line}" stroke-width="4"/>`;
      return s + `<text class="pl" x="${ox + 22}" y="${oy + 24}">${labs[i]}</text>`;
    };
    const s = [0, 1, 2, 3].map(i => tile(i === pos ? bad : 'ok', i)).join('');
    const why = { curve: '굽은 선이 있어요', gap: '두 선이 한 점에서 만나지 않아요', round: '곧은 선이 아니라 둥글게 굽은 선이에요' }[bad];
    return { ask: '<b>각이 아닌</b> 것은?', scene: wrap(svg(s, 340, 262)), choices: labs, answer: labs[pos], cols: 4,
             rule: [`${labs[pos]}: ${why}`, '각: 한 점에서 그은 두 반직선으로 이루어진 도형'], hint: '곧은 선 두 개가 한 점에서 시작하는지 보세요', sig: 'x' + bad + pos };
  },
  rightPick() {
    const labs = ['가', '나', '다', '라'], pos = ri(0, 3), degs = [0, 1, 2, 3].map(i => i === pos ? 90 : pick([55, 65, 75, 105, 115, 125, 135]));
    const s = degs.map((d, i) => { const ox = (i % 2) * 170, oy = Math.floor(i / 2) * 130, rot = ri(-20, 20), vx = ox + 40, vy = oy + 100;
      return `<rect x="${ox + 6}" y="${oy + 6}" width="158" height="118" rx="12" fill="#fff" stroke="#dbe4f3"/>` + seg(vx, vy, vx + Math.cos(rad(rot)) * 110, vy + Math.sin(rad(rot)) * 110) + seg(vx, vy, vx + Math.cos(rad(rot - d)) * 80, vy + Math.sin(rad(rot - d)) * 80) + `<text class="pl" x="${ox + 140}" y="${oy + 24}">${labs[i]}</text>`; }).join('');
    return { ask: '<b>직각</b>은 어느 것일까요?', scene: wrap(svg(s, 340, 262)), choices: labs, answer: labs[pos], cols: 4,
             rule: ['종이를 반듯하게 두 번 접어 만든 각과 꼭 맞는 각이 직각', `${labs[pos]}가 직각이에요`], hint: '공책 모서리처럼 반듯한 각을 찾아요', sig: 'r' + degs.join() };
  },
  rightCount() {
    const k = pick([['직사각형', 4], ['정사각형', 4], ['직각삼각형', 1], ['삼각형', 0], ['사각형', 0], ['평행사변형', 0]]);
    return { ask: '이 도형에서 <b>직각</b>은 몇 개일까요?', scene: wrap(shapeFig(k[0], false)), choices: ['0개', '1개', '2개', '4개'], answer: k[1] + '개', cols: 4,
             onReveal: sc => { sc.innerHTML = wrap(shapeFig(k[0], true)); },
             rule: [`${k[0]}: 직각 ${k[1]}개`], hint: '삼각자의 직각 부분을 대 본다고 생각해요', sig: 'q' + k[0] };
  },
  shapeName() {
    const k = pick(['직각삼각형', '직사각형', '정사각형', '직사각형', '정사각형']);
    const lens = k === '직사각형' ? [[0, `${ri(7, 12)} cm`], [1, `${ri(3, 6)} cm`]] : k === '정사각형' ? (n => [[0, `${n} cm`], [1, `${n} cm`], [2, `${n} cm`], [3, `${n} cm`]])(ri(3, 9)) : null;
    const why = { 직각삼각형: '한 각이 직각인 삼각형', 직사각형: '네 각이 모두 직각인 사각형', 정사각형: '네 각이 모두 직각이고 네 변의 길이가 모두 같은 사각형' };
    return { ask: '가장 알맞은 이름은?', scene: wrap(shapeFig(k, true, lens)), choices: ['직각삼각형', '직사각형', '정사각형'], answer: k,
             rule: [`${k}: ${why[k]}`, ...(k === '정사각형' ? ['정사각형도 직사각형이지만, 더 알맞은 이름은 정사각형!'] : [])], hint: '직각 표시와 변의 길이를 모두 보세요', sig: 's' + k + JSON.stringify(lens) };
  },
  shapeFact() {
    const q = pick([['직사각형의 네 각은 모두 무슨 각일까요?', '직각', ['직각', '예각', '둔각']], ['직각삼각형에서 직각은 몇 개?', '1개', ['1개', '2개', '3개']], ['정사각형의 네 변의 길이는?', '모두 같아요', ['모두 같아요', '마주 보는 변만 같아요', '모두 달라요']], ['직사각형에서 길이가 같은 변은?', '마주 보는 변끼리', ['마주 보는 변끼리', '이웃한 변끼리', '모두 같아요']]]);
    return { ask: q[0], scene: wrap('<div class="emo">📐</div>'), choices: q[2], answer: q[1], small: true, cols: 1,
             rule: ['직사각형: 네 각이 직각, 마주 보는 변의 길이가 같아요', '정사각형: 네 각이 직각, 네 변의 길이가 모두 같아요', '직각삼각형: 한 각이 직각'], hint: '도형을 떠올려 각과 변을 살펴봐요', sig: 'f' + q[0] };
  },
  perimeter() {
    const sq = Math.random() < .4, a = ri(3, 12), b = sq ? a : ri(2, 9), t = 2 * (a + b);
    if (!sq && a === b) return GEN.perimeter();
    return { ask: `${sq ? '정사각형' : '직사각형'}의 <b>네 변의 길이의 합</b>은?`, scene: wrap(shapeFig(sq ? '정사각형' : '직사각형', true, sq ? [[0, `${a} cm`]] : [[0, `${a} cm`], [1, `${b} cm`]])),
             choices: nums(t, [a + b, a * b, t + 2, sq ? 2 * a : 2 * a + b], { ok: v => v > 0 && v !== t, fmt: v => v + ' cm' }), answer: t + ' cm',
             rule: sq ? ['정사각형은 네 변이 모두 같아요', `${a} × 4 = ${t} cm`] : ['직사각형은 마주 보는 변의 길이가 같아요', `${a} + ${b} + ${a} + ${b} = ${t} cm`], hint: '보이지 않는 변의 길이도 알 수 있어요', sig: 'p' + sq + a + b };
  },
  fromPerimeter() {
    const a = ri(3, 12), t = 4 * a;
    return { ask: `네 변의 길이의 합이 <b>${t} cm</b> 인 정사각형의 한 변은?`, scene: wrap(shapeFig('정사각형', true, [[0, '? cm']])),
             choices: nums(a, [t / 2, t - 4, a + 2, 2 * a], { ok: v => v > 0 && v !== a, fmt: v => v + ' cm' }), answer: a + ' cm',
             rule: ['정사각형은 네 변이 모두 같아요', `${t} ÷ 4 = ${a} cm`], hint: '네 변이 똑같으니 4로 나눠요', sig: 'z' + a };
  },
  bigSquare() {
    const w = ri(8, 15), h = ri(3, w - 2);
    return { ask: `가로 ${w} cm, 세로 ${h} cm 직사각형 종이를 잘라 <b>가장 큰 정사각형</b>을 만들면 한 변은?`, scene: wrap(shapeFig('직사각형', true, [[0, `${w} cm`], [1, `${h} cm`]])),
             choices: nums(h, [w, w - h, w + h], { ok: v => v > 0 && v !== h, fmt: v => v + ' cm' }), answer: h + ' cm',
             rule: ['짧은 변의 길이만큼 정사각형을 만들 수 있어요', `→ 한 변 ${h} cm`], hint: '종이를 접어 정사각형을 만든다고 생각해요', sig: 'b' + w + h };
  },
  countLines() {
    const n = ri(3, 5), kind = pick(['선분', '직선']), cnt = n * (n - 1) / 2;
    const P = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2 + .3; return [170 + Math.cos(a) * 90, 130 + Math.sin(a) * 90]; });
    return { ask: `점 ${n}개 중 2개를 골라 그을 수 있는 <b>${kind}</b>은 모두 몇 개일까요?<small>(세 점은 한 직선 위에 있지 않아요)</small>`, scene: wrap(svg(P.map((p, i) => dot(...p, L[i], 0, -20)).join(''))),
             choices: nums(cnt, [n, cnt + 1, n * (n - 1), cnt - 1], { ok: v => v > 0 && v !== cnt, fmt: v => v + '개' }), answer: cnt + '개',
             onReveal: sc => { let s = ''; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) s += seg(...P[i], ...P[j], C.mark, 2.5); sc.innerHTML = wrap(svg(s + P.map((p, i) => dot(...p, L[i], 0, -20)).join(''))); },
             rule: [`점 두 개를 고르는 방법을 빠짐없이 세요`, `${n}개 점 → ${cnt}개`], hint: `점 ${L[0]}에서 그을 수 있는 것부터 차례로 세어요`, sig: 'l' + n + kind };
  },
  countSquares() {
    const g = ri(2, 3), total = g === 2 ? 5 : 14;
    let s = ''; const S = 180 / g, x0 = 80, y0 = 40;
    for (let i = 0; i <= g; i++) s += seg(x0, y0 + i * S, x0 + 180, y0 + i * S, C.line, 3) + seg(x0 + i * S, y0, x0 + i * S, y0 + 180, C.line, 3);
    return { ask: '그림에서 찾을 수 있는 크고 작은 <b>정사각형</b>은 모두 몇 개일까요?', scene: wrap(svg(s)),
             choices: nums(total, [g * g, total + 1, total - 1, g * g + 2], { ok: v => v > 0 && v !== total, fmt: v => v + '개' }), answer: total + '개',
             rule: g === 2 ? ['작은 정사각형 4개', '큰 정사각형 1개', '모두 5개'] : ['작은 것 9개', '중간(2칸×2칸) 4개', '큰 것 1개', '모두 14개'], hint: '작은 것, 중간 것, 큰 것을 나눠서 세어요', sig: 'g' + g };
  },
  ox() {
    const [t, ok, why] = pick(D.facts);
    return { ask: 'O 일까요, X 일까요?', scene: wrap(`<div class="fact">${t}</div>`), choices: ['⭕ 맞아요', '❌ 틀려요'], answer: ok ? '⭕ 맞아요' : '❌ 틀려요', once: true,
             rule: [why], hint: '그림을 떠올려 봐요', sig: 'o' + t };
  }
};

Learn.run({ data: D, key: 'plane', gen: GEN });
});
