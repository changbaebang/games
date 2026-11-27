/* 넓이 농장 — 문제 만들기와 그림
 * 공통 진행은 ../common/learn.js, 단계·색은 data.json
 * 모눈 한 칸 = 1 cm. 저장 키: areaStars, areaStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U, C = D.colors;
const CM = v => v + ' cm', CM2 = v => v + ' cm²';
const K = (x, y) => x + ',' + y;

// 붙어 있는 칸 n 개 (모눈 w×h 안)
function polyomino(n, w = 6, h = 5) {
  for (;;) {
    const cells = [[ri(1, w - 2), ri(1, h - 2)]], set = new Set([K(...cells[0])]);
    let guard = 0;
    while (cells.length < n && ++guard < 400) { const [x, y] = pick(cells), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !set.has(K(nx, ny))) { set.add(K(nx, ny)); cells.push([nx, ny]); } }
    if (cells.length === n) return { cells, set, w, h };
  }
}
const perimOf = p => p.cells.reduce((s, [x, y]) => s + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !p.set.has(K(x + dx, y + dy))).length, 0);
// 모눈 그림. opt.edges: 둘레 강조, opt.nums: 칸에 번호
function gridSVG(p, { edges = false, numbers = false } = {}) {
  const S = 40; let t = `<rect x="0" y="0" width="${p.w * S}" height="${p.h * S}" fill="${C.soil}"/>`;
  p.cells.forEach(([x, y], i) => { t += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${C.field}"/>`; if (numbers) t += `<text class="cn" x="${x * S + S / 2}" y="${y * S + S / 2}">${i + 1}</text>`; });
  for (let x = 0; x <= p.w; x++) t += `<line x1="${x * S}" y1="0" x2="${x * S}" y2="${p.h * S}" stroke="${C.grid}" stroke-width="1.5"/>`;
  for (let y = 0; y <= p.h; y++) t += `<line x1="0" y1="${y * S}" x2="${p.w * S}" y2="${y * S}" stroke="${C.grid}" stroke-width="1.5"/>`;
  for (const [x, y] of p.cells) for (const [dx, dy, x1, y1, x2, y2] of [[1, 0, 1, 0, 1, 1], [-1, 0, 0, 0, 0, 1], [0, 1, 0, 1, 1, 1], [0, -1, 0, 0, 1, 0]])
    if (!p.set.has(K(x + dx, y + dy))) t += `<line x1="${(x + x1) * S}" y1="${(y + y1) * S}" x2="${(x + x2) * S}" y2="${(y + y2) * S}" stroke="${edges ? C.mark : C.fieldEdge}" stroke-width="${edges ? 6 : 3.5}" stroke-linecap="round"/>`;
  t += `<g transform="translate(${p.w * S + 10},${p.h * S - S})"><rect width="${S}" height="${S}" fill="${C.field}" stroke="${C.fieldEdge}" stroke-width="2"/><text class="lg" x="${S / 2}" y="${S + 18}">1 cm²</text></g>`;
  return `<svg viewBox="-6 -6 ${p.w * S + S + 32} ${p.h * S + 34}" role="img">${t}</svg>`;
}
const wrap = s => `<div class="box">${s}</div>`;
// 가로·세로 길이를 적은 도형 (모눈 없이). pts 는 [x,y], labels 는 [{x,y,t}]
function figSVG(pts, labels, extra = '') {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), k = span / 300, px = 95 * k, py = 45 * k,
    x0 = Math.min(...xs) - px, y0 = Math.min(...ys) - py, w = Math.max(...xs) - x0 + px, h = Math.max(...ys) - y0 + py;   // 글자 크기를 도형 크기에 맞춰 늘 같은 비율로
  return `<svg viewBox="${x0} ${y0} ${w} ${h}" role="img" style="--fs:${(20 * k).toFixed(1)}px;--sw:${(4 * k).toFixed(1)}px"><polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${C.field}" stroke="${C.fieldEdge}" stroke-width="${(4 * k).toFixed(1)}" stroke-linejoin="round"/>${extra}${labels.map(l => `<text class="dim" x="${l.x}" y="${l.y}">${l.t}</text>`).join('')}</svg>`;
}

// 직접 만드는 직사각형: 왼쪽 위 모서리에서 끌거나 눌러서 가로×세로 정하기
function maker(target, isArea) {
  const GW = 10, GH = 7, S = 34; let w = 2, h = 2, box = null;
  const draw = () => {
    let t = `<rect width="${GW * S}" height="${GH * S}" fill="${C.soil}"/><rect width="${w * S}" height="${h * S}" fill="${C.field}" stroke="${C.fieldEdge}" stroke-width="4"/>`;
    for (let x = 0; x <= GW; x++) t += `<line x1="${x * S}" y1="0" x2="${x * S}" y2="${GH * S}" stroke="${C.grid}"/>`;
    for (let y = 0; y <= GH; y++) t += `<line x1="0" y1="${y * S}" x2="${GW * S}" y2="${y * S}" stroke="${C.grid}"/>`;
    t += `<circle cx="${w * S}" cy="${h * S}" r="13" fill="${C.mark}" stroke="#fff" stroke-width="3"/>`;
    t += `<text class="dim" x="${w * S / 2}" y="-8">가로 ${w} cm</text><text class="dim" x="${GW * S + 4}" y="${h * S / 2}" style="text-anchor:start">세로 ${h} cm</text>`;
    box.innerHTML = `<svg viewBox="-8 -30 ${GW * S + 120} ${GH * S + 40}" class="mk">${t}</svg>`;
  };
  return {
    render(sc) { sc.innerHTML = '<div class="box mkbox"></div>'; box = sc.firstChild; draw();
      let drag = false;
      const at = e => { const svg = box.querySelector('svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const nw = Math.max(1, Math.min(GW, Math.round(p.x / S))), nh = Math.max(1, Math.min(GH, Math.round(p.y / S))); if (nw !== w || nh !== h) { w = nw; h = nh; Arcade.play('tick'); draw(); } };
      box.addEventListener('pointerdown', e => { drag = true; try { box.setPointerCapture(e.pointerId); } catch (_) {} at(e); });
      box.addEventListener('pointermove', e => { if (drag) at(e); });
      box.addEventListener('pointerup', () => { drag = false; }); box.addEventListener('pointercancel', () => { drag = false; });
    },
    get w() { return w; }, get h() { return h; }, set(nw, nh) { w = nw; h = nh; draw(); }
  };
}

const GEN = {
  countArea(g) {
    const p = polyomino(ri(g.cells[0], g.cells[1])), n = p.cells.length;
    return { ask: '초록 밭의 넓이는?', scene: wrap(gridSVG(p)), choices: nums(n, [perimOf(p), n + 1, n - 1, n + 2], { fmt: CM2 }), answer: CM2(n),
             onHint: sc => { sc.innerHTML = wrap(gridSVG(p, { numbers: true })); }, onReveal: sc => { sc.innerHTML = wrap(gridSVG(p, { numbers: true })); },
             rule: [`1 cm² 짜리 칸이 ${n}개 → ${CM2(n)}`], hint: '초록 칸을 하나씩 세어 봐요. 한 칸이 1 cm² 예요', sig: 'a' + p.cells.join(';') };
  },
  countPerim(g) {
    const p = polyomino(ri(g.cells[0], g.cells[1])), n = perimOf(p);
    return { ask: '초록 밭의 둘레는?<small>모눈 한 칸의 변은 1 cm</small>', scene: wrap(gridSVG(p)), choices: nums(n, [p.cells.length, n + 2, n - 2, n + 1], { fmt: CM }), answer: CM(n),
             onHint: sc => { sc.innerHTML = wrap(gridSVG(p, { edges: true })); }, onReveal: sc => { sc.innerHTML = wrap(gridSVG(p, { edges: true })); },
             rule: [`가장자리 선이 ${n}칸 → ${CM(n)}`, '둘레는 칸 수가 아니라 가장자리 길이예요'], hint: '주황색 가장자리를 한 바퀴 돌며 변의 개수를 세어 봐요', sig: 'p' + p.cells.join(';') };
  },
  rectArea() {
    const w = ri(3, 12), h = ri(2, 9), A = w * h;
    return { ask: '직사각형 밭의 넓이는?', scene: wrap(figSVG([[0, 0], [w * 22, 0], [w * 22, h * 22], [0, h * 22]], [{ x: w * 11, y: -10, t: CM(w) }, { x: w * 22 + 30, y: h * 11 + 6, t: CM(h) }])),
             choices: nums(A, [2 * (w + h), w + h, A + w, A - h], { fmt: CM2 }), answer: CM2(A),
             rule: ['직사각형의 넓이 = 가로 × 세로', `${w} × ${h} = ${CM2(A)}`], hint: '가로 한 줄에 1 cm² 가 몇 개, 그런 줄이 몇 줄일까요?', sig: 'r' + w + h };
  },
  rectPerim() {
    const w = ri(3, 12), h = ri(2, 9), P = 2 * (w + h);
    return { ask: '직사각형 밭의 둘레는?', scene: wrap(figSVG([[0, 0], [w * 22, 0], [w * 22, h * 22], [0, h * 22]], [{ x: w * 11, y: -10, t: CM(w) }, { x: w * 22 + 30, y: h * 11 + 6, t: CM(h) }])),
             choices: nums(P, [w * h, w + h, P + 2, P - 2], { fmt: CM }), answer: CM(P),
             rule: ['직사각형의 둘레 = (가로 + 세로) × 2', `(${w} + ${h}) × 2 = ${CM(P)}`], hint: '가로 2개, 세로 2개를 모두 더해요', sig: 'q' + w + h };
  },
  squareSide() {
    const s = ri(3, 12), byArea = Math.random() < .5;
    return { ask: byArea ? `넓이가 ${CM2(s * s)}인 정사각형의 한 변은?` : `둘레가 ${CM(4 * s)}인 정사각형의 한 변은?`, scene: wrap(figSVG([[0, 0], [s * 20, 0], [s * 20, s * 20], [0, s * 20]], [{ x: s * 10, y: -10, t: '?' }])),
             choices: nums(s, byArea ? [s * 2, Math.round(s * s / 2), s + 1] : [s * 2, s + 2, s * 4 / 2 + 1], { fmt: CM }), answer: CM(s),
             rule: byArea ? [`정사각형 넓이 = 한 변 × 한 변`, `${s} × ${s} = ${s * s} 이니까 한 변은 ${CM(s)}`] : ['정사각형은 네 변의 길이가 같아요', `${4 * s} ÷ 4 = ${CM(s)}`],
             hint: byArea ? '같은 수를 두 번 곱해서 넓이가 되는 수를 찾아요' : '정사각형 둘레는 한 변 4개예요', sig: 's' + s + byArea };
  },
  makeArea() {
    const pairs = [[6], [8], [10], [12], [16], [18], [20], [24]].map(([a]) => a), A = pick(pairs), mk = maker(A, true);
    return { ask: `넓이가 <b>${CM2(A)}</b>인 직사각형 밭을 만들어요<small>주황 점을 끌어서 크기를 바꿔요</small>`, render: sc => mk.render(sc),
      custom: { mount(el, api) { el.innerHTML = '<button class="btn" id="mkOk">다 만들었어요!</button>'; el.querySelector('#mkOk').onclick = () => api.submit(mk.w * mk.h === A, `지금 밭은 ${mk.w} × ${mk.h} = ${CM2(mk.w * mk.h)} 예요.`); } },
      rule: [`가로 × 세로 = ${A} 이 되는 직사각형이면 모두 정답!`, divisors(A).map(([a, b]) => `${a}×${b}`).join(', ')], hint: `곱해서 ${A}가 되는 두 수를 찾아봐요`, sig: 'm' + A };
  },
  makePerim() {
    const P = pick([10, 12, 14, 16, 18, 20]), mk = maker(P, false);
    return { ask: `둘레가 <b>${CM(P)}</b>인 직사각형 밭을 만들어요<small>주황 점을 끌어서 크기를 바꿔요</small>`, render: sc => mk.render(sc),
      custom: { mount(el, api) { el.innerHTML = '<button class="btn" id="mkOk">다 만들었어요!</button>'; el.querySelector('#mkOk').onclick = () => api.submit(2 * (mk.w + mk.h) === P, `지금 밭의 둘레는 (${mk.w} + ${mk.h}) × 2 = ${CM(2 * (mk.w + mk.h))} 예요.`); } },
      rule: [`가로 + 세로 = ${P / 2} 이면 둘레가 ${CM(P)}`, '둘레가 같아도 넓이는 다를 수 있어요!'], hint: `둘레의 절반(${P / 2})이 가로 + 세로 예요`, sig: 'n' + P };
  },
  para() {
    const b = ri(4, 12), h = ri(3, 8), sl = ri(1, 3), s = h + ri(1, 2), k = 300 / Math.max(b + sl, h), A = b * h;   // 빗변은 높이보다 길게
    const pts = [[sl * k, 0], [(sl + b) * k, 0], [b * k, h * k], [0, h * k]];
    const extra = `<line x1="${sl * k}" y1="0" x2="${sl * k}" y2="${h * k}" stroke="${C.mark}" stroke-width="3" stroke-dasharray="7 5"/><rect x="${sl * k}" y="${h * k - 12}" width="12" height="12" fill="none" stroke="${C.mark}" stroke-width="2"/>`;
    return { ask: '평행사변형의 넓이는?', scene: wrap(figSVG(pts, [{ x: b * k / 2, y: h * k + 28, t: CM(b) }, { x: sl * k + 30, y: h * k / 2 + 6, t: CM(h) }, { x: (b + sl) * k + 26, y: h * k / 2 - 14, t: CM(s) }], extra)),
             choices: nums(A, [b * s, b + h, A / 2 % 1 ? A + 1 : A / 2, 2 * (b + s)], { fmt: CM2 }), answer: CM2(A),
             rule: ['평행사변형의 넓이 = 밑변 × 높이', `${b} × ${h} = ${CM2(A)}`, `빗변 ${CM(s)}는 넓이에 쓰지 않아요`], hint: '높이는 밑변과 직각(점선)인 길이예요. 비스듬한 변이 아니에요', sig: 'g' + b + h + sl };
  },
  tri() {
    let b, h; do { b = ri(4, 12); h = ri(3, 9); } while ((b * h) % 2);
    const top = ri(1, b - 1), k = 300 / Math.max(b, h), A = b * h / 2;
    const extra = `<line x1="${top * k}" y1="0" x2="${top * k}" y2="${h * k}" stroke="${C.mark}" stroke-width="3" stroke-dasharray="7 5"/><rect x="${top * k}" y="${h * k - 12}" width="12" height="12" fill="none" stroke="${C.mark}" stroke-width="2"/>`;
    return { ask: '삼각형의 넓이는?', scene: wrap(figSVG([[top * k, 0], [b * k, h * k], [0, h * k]], [{ x: b * k / 2, y: h * k + 28, t: CM(b) }, { x: top * k + 32, y: h * k / 2 + 6, t: CM(h) }], extra)),
             choices: nums(A, [b * h, b + h, A + h, 2 * A + 2], { fmt: CM2 }), answer: CM2(A),
             rule: ['삼각형의 넓이 = 밑변 × 높이 ÷ 2', `${b} × ${h} ÷ 2 = ${CM2(A)}`], hint: '같은 삼각형 두 개를 붙이면 평행사변형이 돼요. 그래서 ÷ 2!', sig: 't' + b + h + top };
  },
  rhombus() {
    let p, q; do { p = ri(4, 14); q = ri(3, 12); } while ((p * q) % 2 || p === q);
    const k = 300 / Math.max(p, q), A = p * q / 2, cx = p * k / 2, cy = q * k / 2;
    const pts = [[cx, 0], [p * k, cy], [cx, q * k], [0, cy]];
    const extra = `<line x1="0" y1="${cy}" x2="${p * k}" y2="${cy}" stroke="${C.mark}" stroke-width="3" stroke-dasharray="7 5"/><line x1="${cx}" y1="0" x2="${cx}" y2="${q * k}" stroke="${C.mark}" stroke-width="3" stroke-dasharray="7 5"/>`;
    return { ask: '마름모 밭의 넓이는?', scene: wrap(figSVG(pts, [{ x: p * k * .75, y: cy - 16, t: CM(p) }, { x: cx + 34, y: q * k * .75, t: CM(q) }], extra)),
             choices: nums(A, [p * q, p + q, A + p, 2 * (p + q)], { fmt: CM2 }), answer: CM2(A),
             onReveal: sc => { sc.innerHTML = wrap(figSVG(pts, [{ x: p * k * .75, y: cy - 16, t: CM(p) }, { x: cx + 34, y: q * k * .75, t: CM(q) }], extra + `<rect x="0" y="0" width="${p * k}" height="${q * k}" fill="none" stroke="${C.mark}" stroke-width="2" stroke-dasharray="4 4"/>`)); },
             rule: ['마름모의 넓이 = 한 대각선 × 다른 대각선 ÷ 2', `${p} × ${q} ÷ 2 = ${CM2(A)}`, '대각선으로 직사각형을 그리면 마름모는 그 절반!'], hint: '두 대각선을 가로·세로로 하는 직사각형의 절반이에요', sig: 'r' + p + q };
  },
  trapezoid() {
    let a, b, h; do { a = ri(2, 8); b = ri(a + 2, 14); h = ri(3, 8); } while (((a + b) * h) % 2);
    const off = ri(0, b - a), k = 300 / Math.max(b, h), A = (a + b) * h / 2;
    const pts = [[off * k, 0], [(off + a) * k, 0], [b * k, h * k], [0, h * k]];
    const extra = `<line x1="${(off + a / 2) * k}" y1="0" x2="${(off + a / 2) * k}" y2="${h * k}" stroke="${C.mark}" stroke-width="3" stroke-dasharray="7 5"/>`;
    return { ask: '사다리꼴 밭의 넓이는?', scene: wrap(figSVG(pts, [{ x: (off + a / 2) * k, y: -12, t: CM(a) }, { x: b * k / 2, y: h * k + 28, t: CM(b) }, { x: (off + a / 2) * k + 32, y: h * k / 2 + 6, t: CM(h) }], extra)),
             choices: nums(A, [(a + b) * h, a * b / 2 | 0, b * h, A + h], { fmt: CM2 }), answer: CM2(A),
             rule: ['사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2', `(${a} + ${b}) × ${h} ÷ 2 = ${CM2(A)}`, '똑같은 사다리꼴 두 개를 거꾸로 붙이면 평행사변형!'], hint: '윗변과 아랫변을 더한 다음 높이를 곱하고 반으로', sig: 'z' + a + b + h + off };
  },
  findHeight() {
    const kind = pick(['para', 'tri', 'trap']); let b, h, a = 0, A;
    if (kind === 'para') { b = ri(4, 12); h = ri(3, 9); A = b * h; }
    else if (kind === 'tri') { do { b = ri(4, 12); h = ri(3, 9); } while ((b * h) % 2); A = b * h / 2; }
    else { do { a = ri(2, 6); b = ri(a + 2, 12); h = ri(3, 8); } while (((a + b) * h) % 2); A = (a + b) * h / 2; }
    const name = { para: '평행사변형', tri: '삼각형', trap: '사다리꼴' }[kind];
    return { ask: `넓이가 <b>${CM2(A)}</b>인 ${name}${kind === 'trap' ? `(윗변 ${CM(a)}, 아랫변 ${CM(b)})` : `(밑변 ${CM(b)})`}의 <b>높이</b>는?`, scene: wrap('<div class="emo">📏</div>'),
             choices: nums(h, [h * 2, A / b | 0, h + 1, kind === 'tri' ? h / 2 | 0 : h - 1].filter(v => v > 0 && v !== h), { fmt: CM }), answer: CM(h),
             rule: kind === 'para' ? [`밑변 × 높이 = 넓이 → ${b} × □ = ${A}`, `□ = ${A} ÷ ${b} = ${h}`] : kind === 'tri' ? [`밑변 × 높이 ÷ 2 = 넓이 → ${b} × □ ÷ 2 = ${A}`, `□ = ${A} × 2 ÷ ${b} = ${h}`] : [`(${a} + ${b}) × □ ÷ 2 = ${A}`, `□ = ${A} × 2 ÷ ${a + b} = ${h}`],
             hint: '넓이 공식에 □를 넣어 거꾸로 계산해요', sig: 'h' + kind + b + h + a };
  },
  lShape() {
    const W = ri(6, 12), H = ri(5, 9), w = ri(2, W - 3), h = ri(2, H - 3), k = 300 / Math.max(W, H), A = W * H - w * h;
    const pts = [[0, 0], [(W - w) * k, 0], [(W - w) * k, h * k], [W * k, h * k], [W * k, H * k], [0, H * k]];
    const labels = [{ x: (W - w) * k / 2, y: -10, t: CM(W - w) }, { x: W * k / 2, y: H * k + 28, t: CM(W) }, { x: -32, y: H * k / 2 + 6, t: CM(H) }, { x: W * k + 30, y: (h + H) * k / 2 + 6, t: CM(H - h) }, { x: (W - w / 2) * k, y: h * k - 10, t: CM(w) }];
    return { ask: 'ㄴ자 모양 밭의 넓이는?', scene: wrap(figSVG(pts, labels)), choices: nums(A, [W * H, W * H + w * h, 2 * (W + H), A + w], { fmt: CM2 }), answer: CM2(A),
             onReveal: sc => { sc.innerHTML = wrap(figSVG(pts, labels, `<rect x="${(W - w) * k}" y="0" width="${w * k}" height="${h * k}" fill="none" stroke="${C.mark}" stroke-width="3" stroke-dasharray="8 6"/>`)); },
             rule: [`큰 직사각형 ${W} × ${H} = ${W * H} 에서`, `빈 부분 ${w} × ${h} = ${w * h} 를 빼요`, `${W * H} − ${w * h} = ${CM2(A)}`], hint: '빈 곳까지 채운 큰 직사각형을 생각하고, 빈 곳만큼 빼 봐요', sig: 'l' + W + H + w + h };
  }
};
function divisors(n) { const r = []; for (let a = 1; a <= n; a++) if (n % a === 0 && a <= 10 && n / a <= 7) r.push([a, n / a]); return r; }

Learn.run({ data: D, key: 'area', gen: GEN });
});
