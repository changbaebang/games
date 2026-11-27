/* 대칭 데칼코마니 — 5학년 2학기 합동과 대칭
 * 도형 목록·색·단계는 data.json. 저장 키: symmetryStars, symmetryStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample } = Learn.U, C = D.colors, L = D.letters;
const wrap = s => `<div class="box">${s}</div>`;
const rad = d => d * Math.PI / 180;

/* ---------- 도형 도우미 ---------- */
const tf = (P, { rot = 0, flip = false, s = 1, ox = 0, oy = 0 } = {}) => { const c = Math.cos(rad(rot)), si = Math.sin(rad(rot)); return P.map(([x, y]) => { x = flip ? -x : x; return [(x * c - y * si) * s + ox, (x * si + y * c) * s + oy]; }); };
const poly = (P, fill = C.fill) => `<polygon points="${P.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="${C.edge}" stroke-width="3" stroke-linejoin="round"/>`;
function centered(P) { const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length; return P.map(([x, y]) => [x - cx, y - cy]); }
const BASES = [
  [[0, 0], [60, 0], [80, 40], [20, 55]], [[0, 0], [70, 0], [30, 50]], [[0, 0], [60, 0], [60, 20], [20, 20], [20, 50], [0, 50]],
  [[0, 0], [50, 0], [70, 30], [40, 60], [0, 40]], [[0, 0], [80, 0], [50, 45], [10, 30]]
];
function regular(n, r = 70, start = -90) { return Array.from({ length: n }, (_, i) => [Math.cos(rad(start + i * 360 / n)) * r, Math.sin(rad(start + i * 360 / n)) * r]); }
function shapePts(name) {
  if (name === '정삼각형') return regular(3); if (name === '정사각형') return regular(4, 70, 45); if (name === '정오각형') return regular(5); if (name === '정육각형') return regular(6, 70, 0);
  if (name === '직사각형') return [[-80, -45], [80, -45], [80, 45], [-80, 45]]; if (name === '마름모') return [[0, -75], [50, 0], [0, 75], [-50, 0]];
  if (name === '평행사변형') return [[-50, -45], [80, -45], [50, 45], [-80, 45]]; if (name === '이등변삼각형') return [[0, -70], [50, 60], [-50, 60]];
  if (name === '사다리꼴(등변)') return [[-40, -45], [40, -45], [75, 45], [-75, 45]];
  return null;
}
const cell = (inner, w = 170, h = 150) => `<svg viewBox="${-w / 2} ${-h / 2} ${w} ${h}" class="cell" role="img">${inner}</svg>`;

const GEN = {
  congruent() {
    const B = centered(pick(BASES)), labs = ['가', '나', '다', '라'];
    const good = { rot: pick([90, 180, 270, 45]), flip: Math.random() < .4 };
    const bads = [{ s: 1.25, rot: ri(0, 3) * 90 }, { s: .78, rot: ri(0, 3) * 90 }, { warp: true }];
    const pos = ri(0, 3), figs = [];
    let bi = 0;
    for (let i = 0; i < 4; i++) {
      if (i === pos) figs.push(tf(B, good));
      else { const b = bads[bi++]; figs.push(b.warp ? tf(B.map(([x, y], k) => k === 1 ? [x + 18, y + 12] : [x, y]), { rot: ri(0, 3) * 90 }) : tf(B, b)); }
    }
    const s = `<div class="row"><div class="orig">${cell(poly(B, '#cfe6ff'))}<span>이 도형</span></div></div><div class="grid4">${figs.map((P, i) => `<div>${cell(poly(P))}<span>${labs[i]}</span></div>`).join('')}</div>`;
    return { ask: '왼쪽 위 도형과 <b>합동</b>인 도형은?', scene: wrap(s), choices: labs, answer: labs[pos], cols: 4,
             rule: ['합동: 모양과 크기가 같아서 포개었을 때 완전히 겹치는 두 도형', `${labs[pos]}: 돌리거나 뒤집으면 꼭 겹쳐요`, '크기만 다르거나 한 꼭짓점이 다르면 합동이 아니에요'], hint: '돌리거나 뒤집어서 겹쳐 본다고 상상해요', sig: 'c' + pos + good.rot + good.flip };
  },
  corrSide() { return corrQ('side'); },
  corrLen() { return corrQ('len'); },
  corrAngle() { return corrQ('angle'); },
  axes() {
    const sh = pick(D.shapes.filter(s => s[1] >= 0)), [name, n] = sh, P = shapePts(name);
    return { ask: `<b>${name}</b>의 대칭축은 몇 개일까요?`, scene: wrap(cell(poly(P), 200, 180)), choices: ['0개', '1개', '2개', '3개', '4개', '5개', '6개'].filter(c => Math.abs(+c[0] - n) <= 3).slice(0, 4).concat(n > 3 ? [] : []).slice(0, 4).includes(n + '개') ? ['0개', '1개', '2개', '3개', '4개', '5개', '6개'].filter(c => Math.abs(+c[0] - n) <= 2).slice(0, 4) : [n + '개', '1개', '2개', '0개'], answer: n + '개', cols: 4,
             onReveal: sc => { sc.innerHTML = wrap(cell(poly(P) + axesLines(name, n), 200, 180)); },
             rule: [`${name}: 대칭축 ${n}개`, n === 0 ? '어느 방향으로 접어도 겹치지 않아요' : '그 선을 따라 접으면 완전히 겹쳐요'], hint: '접어서 겹치는 선을 모두 찾아요', sig: 'x' + name };
  },
  isLine() {
    const pool = shuffle(D.shapes), yes = Math.random() < .5;
    const target = pool.find(s => yes ? s[1] !== 0 : s[1] === 0) || pool[0], others = pool.filter(s => s !== target && (yes ? s[1] === 0 : s[1] !== 0));
    if (!others.length) return GEN.isLine();
    const fill = shuffle(pool.filter(s => s !== target && !others.slice(0, 1).includes(s))).slice(0, 2);
    const opts = shuffle([target, others[0], ...fill]).slice(0, 4);
    const correct = opts.filter(s => yes ? s[1] !== 0 : s[1] === 0);
    if (correct.length !== 1) return GEN.isLine();
    return { ask: yes ? '<b>선대칭도형</b>인 것은?' : '<b>선대칭도형이 아닌</b> 것은?', scene: wrap(`<div class="grid4">${opts.map(s => `<div>${cell(s[1] === -1 ? `<circle r="60" fill="${C.fill}" stroke="${C.edge}" stroke-width="3"/>` : poly(shapePts(s[0])))}<span>${s[0]}</span></div>`).join('')}</div>`),
             choices: opts.map(s => s[0]), answer: correct[0][0], small: true, cols: 2,
             rule: ['선대칭도형: 한 직선을 따라 접었을 때 완전히 겹치는 도형', `${correct[0][0]}: 대칭축 ${correct[0][1] === -1 ? '무수히 많음' : correct[0][1] + '개'}`], hint: '반으로 접어 겹치는지 생각해 봐요', sig: 'l' + yes + opts.map(s => s[0]).join() };
  },
  isPoint() {
    const pool = shuffle(D.shapes), yes = Math.random() < .5, pick1 = pool.find(s => s[2] === yes), rest = pool.filter(s => s[2] !== yes).slice(0, 3), opts = shuffle([pick1, ...rest]);
    return { ask: yes ? '<b>점대칭도형</b>인 것은?' : '<b>점대칭도형이 아닌</b> 것은?', scene: wrap(`<div class="grid4">${opts.map(s => `<div>${cell(s[1] === -1 ? `<circle r="60" fill="${C.fill}" stroke="${C.edge}" stroke-width="3"/>` : poly(shapePts(s[0])))}<span>${s[0]}</span></div>`).join('')}</div>`),
             choices: opts.map(s => s[0]), answer: pick1[0], small: true, cols: 2,
             rule: ['점대칭도형: 한 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치는 도형', `${pick1[0]}: 점대칭${yes ? '이에요' : '이 아니에요'}`], hint: '도형을 거꾸로(180°) 돌려도 똑같아 보이나요?', sig: 'p' + yes + opts.map(s => s[0]).join() };
  },
  both() {
    const opts = sample(D.shapes, 4), ok = opts.filter(s => s[1] !== 0 && s[2]);
    if (ok.length !== 1) return GEN.both();
    return { ask: '<b>선대칭도형이면서 점대칭도형</b>인 것은?', scene: wrap(`<div class="grid4">${opts.map(s => `<div>${cell(s[1] === -1 ? `<circle r="60" fill="${C.fill}" stroke="${C.edge}" stroke-width="3"/>` : poly(shapePts(s[0])))}<span>${s[0]}</span></div>`).join('')}</div>`),
             choices: opts.map(s => s[0]), answer: ok[0][0], small: true, cols: 2,
             rule: opts.map(s => `${s[0]}: 선대칭 ${s[1] !== 0 ? 'O' : 'X'}, 점대칭 ${s[2] ? 'O' : 'X'}`), hint: '접어서도 겹치고, 180° 돌려도 겹쳐야 해요', sig: 'b' + opts.map(s => s[0]).join() };
  },
  paint(g) { return paintQ(g.mode); }
};
function axesLines(name, n) {
  const P = shapePts(name); if (!P || n <= 0) return '';
  const out = [], R = 95;
  if (name === '직사각형') return [0, 90].map(a => `<line x1="${Math.cos(rad(a)) * R}" y1="${Math.sin(rad(a)) * R}" x2="${-Math.cos(rad(a)) * R}" y2="${-Math.sin(rad(a)) * R}" class="ax"/>`).join('');
  if (name === '마름모') return [0, 90].map(a => `<line x1="${Math.cos(rad(a)) * R}" y1="${Math.sin(rad(a)) * R}" x2="${-Math.cos(rad(a)) * R}" y2="${-Math.sin(rad(a)) * R}" class="ax"/>`).join('');
  if (name === '이등변삼각형' || name === '사다리꼴(등변)') return `<line x1="0" y1="-90" x2="0" y2="80" class="ax"/>`;
  const start = name === '정사각형' ? 0 : name === '정육각형' ? 0 : -90;
  for (let i = 0; i < n; i++) { const a = start + i * 180 / n; out.push(`<line x1="${Math.cos(rad(a)) * R}" y1="${Math.sin(rad(a)) * R}" x2="${-Math.cos(rad(a)) * R}" y2="${-Math.sin(rad(a)) * R}" class="ax"/>`); }
  return out.join('');
}

/* ---------- 합동인 두 삼각형/사각형의 대응 ---------- */
function corrQ(kind) {
  const n = pick([3, 4]), base = n === 3 ? [[0, 0], [110, 0], [30, -70]] : [[0, 0], [110, 0], [95, -60], [15, -75]];
  const A = base.map(([x, y]) => [x - 140, y + 40]), rot = pick([180, 0]), flip = rot === 0;
  const Bp = tf(base.map(([x, y]) => [x - 55, y + 35]), { rot, flip }).map(([x, y]) => [x + 85, y]);
  const la = L.slice(0, n), lb = L.slice(n, 2 * n);
  // 대응 관계: A[i] ↔ B[i]
  const lens = base.map((p, i) => Math.round(Math.hypot(base[(i + 1) % n][0] - p[0], base[(i + 1) % n][1] - p[1]) / 10));
  const angs = base.map((p, i) => { const a = base[(i + n - 1) % n], b = base[(i + 1) % n]; const u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]]; return Math.round(Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)) * 180 / Math.PI / 5) * 5; });
  const fixA = angs.reduce((s, x) => s + x, 0), target = n === 3 ? 180 : 360; angs[0] += target - fixA;
  const lab = (P, ls) => P.map((p, i) => { const c = P.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]); const dx = p[0] - c[0], dy = p[1] - c[1], d = Math.hypot(dx, dy); return `<text class="pl" x="${p[0] + dx / d * 16}" y="${p[1] + dy / d * 16}">${ls[i]}</text>`; }).join('');
  const k = ri(0, n - 1), sideA = la[k] + la[(k + 1) % n], sideB = lb[k] + lb[(k + 1) % n];
  let extra = '', ask, choices, answer, rule;
  if (kind === 'side') { ask = `두 도형은 합동이에요. 변 <b>${sideA}</b>의 대응변은?`; const opts = shuffle([sideB, ...[1, 2, 3].map(j => lb[(k + j) % n] + lb[(k + j + 1) % n])].filter((x, i, a) => a.indexOf(x) === i)).slice(0, 4); choices = opts.map(x => '변 ' + x); answer = '변 ' + sideB; rule = [`점 ${la[k]}↔${lb[k]}, 점 ${la[(k + 1) % n]}↔${lb[(k + 1) % n]} 이 대응점`, `→ 변 ${sideB}`]; }
  if (kind === 'len') { const m = (P, i) => [(P[i][0] + P[(i + 1) % n][0]) / 2, (P[i][1] + P[(i + 1) % n][1]) / 2]; const mm = m(A, k); extra = `<text class="ln" x="${mm[0]}" y="${mm[1] + 14}">${lens[k]} cm</text>`; ask = `두 도형은 합동이에요. 변 <b>${sideB}</b>의 길이는?`; choices = [...new Set([lens[k], ...lens.filter((_, i) => i !== k), lens[k] + 1])].slice(0, 4).map(v => v + ' cm'); if (choices.length < 3) choices.push(lens[k] + 2 + ' cm'); answer = lens[k] + ' cm'; rule = [`변 ${sideB}의 대응변은 변 ${sideA}`, '합동인 도형은 대응변의 길이가 같아요', `→ ${lens[k]} cm`]; }
  if (kind === 'angle') { extra = `<text class="ln" x="${A[k][0] + (k === 0 ? 26 : k === 1 ? -26 : 0)}" y="${A[k][1] + (k < 2 ? -12 : 26)}">${angs[k]}°</text>`; ask = `두 도형은 합동이에요. 각 <b>${lb[(k + n - 1) % n]}${lb[k]}${lb[(k + 1) % n]}</b>의 크기는?`; choices = [...new Set([angs[k], ...angs.filter((_, i) => i !== k), 180 - angs[k]])].filter(v => v > 0).slice(0, 4).map(v => v + '°'); answer = angs[k] + '°'; rule = [`각 ${lb[(k + n - 1) % n]}${lb[k]}${lb[(k + 1) % n]}의 대응각은 각 ${la[(k + n - 1) % n]}${la[k]}${la[(k + 1) % n]}`, '합동인 도형은 대응각의 크기가 같아요', `→ ${angs[k]}°`]; }
  const s = `<svg viewBox="-200 -110 400 200" class="pair" role="img">${poly(A, '#cfe6ff')}${poly(Bp)}${lab(A, la)}${lab(Bp, lb)}${extra}</svg>`;
  return { ask, scene: wrap(s), choices: shuffle(choices), answer, cols: 2, rule, hint: '두 도형을 포갰을 때 겹치는 꼭짓점끼리 짝지어요', sig: kind + n + rot + k };
}

/* ---------- 칸 칠해 대칭 무늬 완성 ---------- */
function paintQ(mode) {
  const N = 8, half = new Set(), target = new Set(), mine = new Set();
  const k = ri(6, 11);
  while (half.size < k) { const r = ri(0, N - 1), c = ri(0, N / 2 - 1); half.add(r * N + c); }
  if (mode === 'point') { half.clear(); while (half.size < k) { const r = ri(0, N / 2 - 1), c = ri(0, N - 1); half.add(r * N + c); } }
  for (const i of half) { const r = Math.floor(i / N), c = i % N; target.add(mode === 'line' ? r * N + (N - 1 - c) : (N - 1 - r) * N + (N - 1 - c)); }
  let box = null, api = null;
  const given = i => half.has(i), editable = i => { const r = Math.floor(i / N), c = i % N; return mode === 'line' ? c >= N / 2 : r >= N / 2; };
  const draw = (bad = []) => {
    const S = 36; let s = '';
    for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), c = i % N, on = given(i) || mine.has(i); s += `<rect class="${editable(i) ? 'ed' : ''}" data-i="${i}" x="${c * S}" y="${r * S}" width="${S}" height="${S}" fill="${given(i) ? C.paint : mine.has(i) ? (bad.includes(i) ? '#f05a5a' : '#c9a7f5') : '#fff'}" stroke="${C.grid}" stroke-width="1.5"/>`; }
    s += mode === 'line' ? `<line x1="${N / 2 * S}" y1="-8" x2="${N / 2 * S}" y2="${N * S + 8}" class="axl"/>` : `<circle cx="${N / 2 * S}" cy="${N / 2 * S}" r="6" fill="${C.axis}"/>`;
    box.innerHTML = `<svg viewBox="-10 -10 ${N * 36 + 20} ${N * 36 + 20}" class="pgrid" role="img">${s}</svg>`;
    box.querySelectorAll('rect.ed').forEach(r => r.onclick = () => { if (api && api.locked) return; const i = +r.dataset.i; mine.has(i) ? mine.delete(i) : mine.add(i); Arcade.play('tick'); draw(); });
  };
  return { ask: mode === 'line' ? '주황 <b>대칭축</b>을 따라 접으면 겹치도록 오른쪽 칸을 칠해요' : '주황 점을 중심으로 <b>180°</b> 돌리면 겹치도록 아래쪽 칸을 칠해요',
           render(sc) { sc.innerHTML = '<div class="box"><div class="pbox"></div></div>'; box = sc.querySelector('.pbox'); draw(); },
           _target: target, _mine: mine, _draw: () => draw(),
           custom: { mount(el, a) { api = a; el.innerHTML = '<button class="btn" id="doneBtn">다 칠했어요!</button>'; el.querySelector('#doneBtn').onclick = () => {
             if (api.locked) return; const missing = [...target].filter(i => !mine.has(i)), extra = [...mine].filter(i => !target.has(i));
             if (!missing.length && !extra.length) return api.submit(true);
             draw(extra); api.submit(false, `${missing.length ? `빠진 칸 ${missing.length}개` : ''}${missing.length && extra.length ? ', ' : ''}${extra.length ? `잘못 칠한 칸 ${extra.length}개` : ''}가 있어요.`); }; } },
           rule: mode === 'line' ? ['대칭축에서 같은 거리만큼 반대쪽에 칠해요', '왼쪽 끝 칸 ↔ 오른쪽 끝 칸'] : ['대칭의 중심을 지나 같은 거리만큼 반대쪽에 칠해요', '왼쪽 위 칸 ↔ 오른쪽 아래 칸'],
           hint: mode === 'line' ? '대칭축에서 몇 칸 떨어져 있는지 세어 반대쪽에 똑같이!' : '위아래도 바뀌고 왼쪽 오른쪽도 바뀌어요', sig: mode + [...half].sort().join('.') };
}

Learn.run({ data: D, key: 'symmetry', gen: GEN });
});
