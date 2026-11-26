/* 입체 공방 — 게임 동작
 * 단계 구성, 면 색, 전개도 글자, 쌓기나무 크기·개수 범위, 칭찬·결과 문구는 data.json 에서 읽어요.
 * 문제 종류(kind): count(면·모서리·꼭짓점) · parallel(평행한 면) · perp(수직인 면) · hidden(겨냥도)
 *                  isNet(전개도인가) · opposite(마주 보는 면) · stack(쌓기나무 개수) · views(위·앞·옆 모양)
 * 입체는 작은 3D 그리기(정사영 + 면 깊이 정렬)로 SVG 에 그려요. 끌면 돌아가요.
 * 저장(localStorage): solidStars {단계번호: 별}, solidStarTotal (목록 화면 '내 기록'용) */
(async () => {
const HERE = document.currentScript.src;
const $ = id => document.getElementById(id), snd = (...a) => window.Arcade && Arcade.play(...a);

let D;
try { const r = await fetch(new URL('data.json', HERE)); if (!r.ok) throw new Error(r.status); D = await r.json(); }
catch (e) {
  $('stages').innerHTML = '<p class="loaderr">게임 데이터(data.json)를 불러오지 못했어요.<br>인터넷 연결을 확인하거나, 컴퓨터에서는 웹 서버로 열어 주세요.</p>';
  console.error('data.json 불러오기 실패', e); return;
}
const STAGES = D.stages, QN = D.questionsPerStage, COLORS = D.colors, LAB = D.netLabels;

// ---------- 도구
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wpick = list => { let r = Math.random() * list.reduce((s, x) => s + (x.weight ?? 1), 0); for (const x of list) { r -= x.weight ?? 1; if (r <= 0) return x; } return list[list.length - 1]; };
const rad = d => d * Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
function numCh(ans, cands, unit, n = 4) {
  const out = [], seen = new Set([ans]);
  for (const v of cands) if (out.length < n - 1 && Number.isInteger(v) && v > 0 && !seen.has(v)) { seen.add(v); out.push(v); }
  for (let d = 1; out.length < n - 1; d++) for (const v of [ans + d, ans - d]) if (out.length < n - 1 && v > 0 && !seen.has(v)) { seen.add(v); out.push(v); }
  return shuffle([ans, ...out]).map(v => v + unit);
}
function shade(hex, f) { const n = parseInt(hex.slice(1), 16), c = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))); return `rgb(${c(16)},${c(8)},${c(0)})`; }

// ---------- 3D 그리기: 카메라(yaw: 세로축 회전, pitch: 위에서 내려다보는 각)
const cam = { yaw: -35, pitch: 28 };
function view(p) {
  const cy = Math.cos(rad(cam.yaw)), sy = Math.sin(rad(cam.yaw)), x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y = p[1];
  const cp = Math.cos(rad(cam.pitch)), sp = Math.sin(rad(cam.pitch)); return [x, y * cp - z * sp, y * sp + z * cp];
}
const SC = 60;   // 1칸 = 60px
// faces: {pts, fill, n(바깥 방향, 없으면 양면), stroke, dash, label, labelFill, first(맨 먼저 그림)}
// lines: {a, b, dash} · texts: {p, t, cls, size}
function draw3d(model) {
  const items = [];
  for (const f of model.faces) {
    if (f.n && view(f.n)[2] <= 1e-6 && !model.noCull) continue;
    const P = f.pts.map(view), z = f.first ? -1e9 : P.reduce((s, p) => s + p[2], 0) / P.length;
    items.push({ z, f, P });
  }
  items.sort((a, b) => a.z - b.z);
  const xy = p => `${(p[0] * SC).toFixed(1)},${(-p[1] * SC).toFixed(1)}`;
  let h = '';
  for (const { f, P } of items) {
    h += `<polygon points="${P.map(xy).join(' ')}" fill="${f.fill}" stroke="${f.stroke || '#22324f'}" stroke-width="${f.sw ?? 2}" stroke-linejoin="round"${f.dash ? ' stroke-dasharray="6 5"' : ''}/>`;
    if (f.label) { const c = P.reduce((s, p) => add(s, p), [0, 0, 0]).map(v => v / P.length); h += `<text class="face-lab" x="${(c[0] * SC).toFixed(1)}" y="${(-c[1] * SC).toFixed(1)}" style="font-size:${Math.round(SC * .42)}px" fill="${f.labelFill || '#22324f'}">${f.label}</text>`; }
  }
  for (const l of model.lines || []) { const a = view(l.a), b = view(l.b); h += `<line x1="${(a[0] * SC).toFixed(1)}" y1="${(-a[1] * SC).toFixed(1)}" x2="${(b[0] * SC).toFixed(1)}" y2="${(-b[1] * SC).toFixed(1)}" stroke="#22324f" stroke-width="3" stroke-linecap="round"${l.dash ? ' stroke-dasharray="7 6" opacity=".75"' : ''}/>`; }
  for (const t of model.texts || []) { const p = view(t.p); h += `<text class="${t.cls}" x="${(p[0] * SC).toFixed(1)}" y="${(-p[1] * SC).toFixed(1)}" style="font-size:${t.size || 22}px">${t.t}</text>`; }
  const R = model.radius * SC + 30;
  return `<svg class="${model.spin ? 'spin' : ''}" viewBox="${-R} ${-R} ${2 * R} ${2 * R}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="입체 그림">${h}</svg>`;
}

// ---------- 직육면체
const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function boxModel(dims, colors, opts = {}) {
  const hd = dims.map(d => d / 2), faces = [], lines = [];
  const faceIdx = (k, s) => k * 2 + (s > 0 ? 0 : 1);   // 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
  for (let k = 0; k < 3; k++) for (const s of [1, -1]) {
    const u = (k + 1) % 3, v = (k + 2) % 3, c = mul(AX[k], s * hd[k]);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add(add(c, mul(AX[u], a * hd[u])), mul(AX[v], b * hd[v])));
    const n = mul(AX[k], s), lit = k === 1 ? 1 : k === 2 ? .94 : .87;   // 색 이름을 알아볼 수 있게 그늘은 약하게
    faces.push({ pts, n, fill: opts.ghost ? 'rgba(255,255,255,.55)' : shade(colors[faceIdx(k, s)], lit), sw: opts.ghost ? 0 : 2.4, stroke: opts.ghost ? 'none' : '#22324f', id: faceIdx(k, s) });
  }
  // 모서리: 축 k 방향, 나머지 두 축의 부호로 12개
  const edges = [];
  for (let k = 0; k < 3; k++) { const u = (k + 1) % 3, v = (k + 2) % 3;
    for (const su of [1, -1]) for (const sv of [1, -1]) {
      const base = add(mul(AX[u], su * hd[u]), mul(AX[v], sv * hd[v]));
      edges.push({ a: add(base, mul(AX[k], -hd[k])), b: add(base, mul(AX[k], hd[k])), f: [faceIdx(u, su), faceIdx(v, sv)] });
    } }
  return { faces, edges, radius: len(hd) + .2, spin: !opts.fixed };
}
const frontFacing = f => view(f.n)[2] > 1e-6;

// ---------- 전개도 접기: 칸 목록 → 나무 구조(경첩) → 각 θ 로 접은 면들
function netTree(cells) {
  const key = c => c[0] + ',' + c[1], has = new Map(cells.map((c, i) => [key(c), i]));
  const deg = cells.map(c => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => has.has(key([c[0] + dx, c[1] + dy]))).length);
  const root = deg.indexOf(Math.max(...deg)), parent = Array(cells.length).fill(-1), order = [root], seen = new Set([root]);
  for (let q = 0; q < order.length; q++) { const c = cells[order[q]];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = has.get(key([c[0] + dx, c[1] + dy])); if (j != null && !seen.has(j)) { seen.add(j); parent[j] = order[q]; order.push(j); } } }
  return { root, parent, order };
}
function rodrigues(a, t) { const [x, y, z] = a, c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]]; }
const mApply = (M, p) => [dot(M[0], p), dot(M[1], p), dot(M[2], p)];
const mMul = (A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
// 전개도는 바닥(y=0)에 놓이고, 칸 (열, 행) → (x, z). 접으면 위(+y)로 올라와요
function foldNet(cells, tree, theta) {
  const T = Array(cells.length);
  T[tree.root] = { R: I3, t: [0, 0, 0] };
  for (const i of tree.order) { if (i === tree.root) continue;
    const p = tree.parent[i], pc = cells[p], cc = cells[i], o = [cc[0] - pc[0], 0, cc[1] - pc[1]];
    const h = [pc[0] + .5 + o[0] * .5, 0, pc[1] + .5 + o[2] * .5], a = cross(o, [0, 1, 0]);
    const Rh = rodrigues(a, theta), th = sub(h, mApply(Rh, h)), P = T[p];
    T[i] = { R: mMul(P.R, Rh), t: add(mApply(P.R, th), P.t) };
  }
  return cells.map((c, i) => { const pts = [[c[0], 0, c[1]], [c[0] + 1, 0, c[1]], [c[0] + 1, 0, c[1] + 1], [c[0], 0, c[1] + 1]].map(p => add(mApply(T[i].R, p), T[i].t));
    return { pts, center: mul(pts.reduce((s, p) => add(s, p), [0, 0, 0]), .25) }; });
}
// 정육면체 전개도인지: 접었을 때 ① 여섯 면이 모두 다른 자리 ② 종이에서 맞닿은 변은 접은 뒤에도 그대로 붙어 있어야 해요(2×2 묶음 등은 탈락)
function isCubeNet(cells) {
  const f = foldNet(cells, netTree(cells), Math.PI / 2);
  const k = p => p.map(v => Math.round(v * 100) || 0).join();   // -0.00 과 0.00 을 같게
  if (new Set(f.map(x => k(x.center))).size !== 6) return false;
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const [a, b] = [cells[i], cells[j]]; if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) continue;
    const ea = new Set(f[i].pts.map(k)), shared = f[j].pts.map(k).filter(p => ea.has(p)).length;
    if (shared < 2) return false;
  }
  return true;
}
function randomHexomino() {
  const key = c => c[0] + ',' + c[1], cells = [[0, 0]], set = new Set(['0,0']);
  while (cells.length < 6) { const c = pick(cells), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), n = [c[0] + dx, c[1] + dy]; if (!set.has(key(n))) { set.add(key(n)); cells.push(n); } }
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(c => [c[0] - mx, c[1] - my]);
}
function netModel(q, theta) {
  const faces = foldNet(q.cells, q.tree, theta), k = theta / (Math.PI / 2);
  const flatC = [q.w / 2, 0, q.h / 2], foldC = q.foldCenter || flatC, off = mul(add(mul(flatC, 1 - k), mul(foldC, k)), -1);
  return { faces: faces.map((f, i) => ({ pts: f.pts.map(p => add(p, off)), fill: q.fills ? q.fills[i] : '#ffe9a8', label: q.labels ? q.labels[i] : null, sw: 2.4 })),
           radius: (Math.max(q.w, q.h) / 2 * 1.05 + .3) * (1 - k) + 1.15 * k, noCull: true, spin: theta > 0 };   // 접힐수록 크게
}

// ---------- 쌓기나무
function randomHeights(g) {
  for (;;) {
    const C = ri(g.cols[0], g.cols[1]), R = ri(g.rows[0], g.rows[1]), target = ri(g.total[0], Math.min(g.total[1], C * R * g.maxHeight));
    const h = Array.from({ length: C }, () => Array(R).fill(0)); let n = 0, guard = 0;
    h[ri(0, C - 1)][ri(0, R - 1)] = 1; n = 1;
    while (n < target && ++guard < 500) {
      const i = ri(0, C - 1), j = ri(0, R - 1);
      const near = h[i][j] > 0 || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => h[i + a] && h[i + a][j + b] > 0);
      if (near && h[i][j] < g.maxHeight) { h[i][j]++; n++; }
    }
    // 모든 열·행이 쓰이도록(빈 줄이 있으면 다시)
    if (h.some(col => col.every(v => !v)) || [...Array(R).keys()].some(j => h.every(col => !col[j]))) continue;
    return { h, C, R, n, H: Math.max(...h.flat()) };
  }
}
function stackModel(s) {
  const { h, C, R, H } = s, faces = [], ox = (C - 1) / 2, oz = (R - 1) / 2, oy = H / 2, has = (i, l, j) => h[i] && j >= 0 && j < R && h[i][j] > l && l >= 0;
  const g = [[-C / 2 - .15, -oy, -R / 2 - .15], [C / 2 + .15, -oy, -R / 2 - .15], [C / 2 + .15, -oy, R / 2 + .15], [-C / 2 - .15, -oy, R / 2 + .15]];
  faces.push({ pts: g, fill: '#dfe9f3', stroke: '#b5c6d8', sw: 1.5, first: true });
  for (let i = 0; i < C; i++) for (let j = 0; j < R; j++) for (let l = 0; l < h[i][j]; l++) {
    const c = [i - ox, l + .5 - oy, j - oz];
    for (let k = 0; k < 3; k++) for (const sg of [1, -1]) {
      const d = [0, 0, 0]; d[k] = sg; if (has(i + d[0], l + d[1], j + d[2])) continue;
      const u = (k + 1) % 3, v = (k + 2) % 3, fc = add(c, mul(AX[k], sg * .5));
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add(add(fc, mul(AX[u], a * .5)), mul(AX[v], b * .5)));
      faces.push({ pts, n: d, fill: shade(D.cubeColor, k === 1 ? 1.05 : k === 2 ? .88 : .74), sw: 1.8 });
    }
  }
  return { faces, radius: Math.hypot(C / 2 + .4, H / 2 + .2, R / 2 + 1.2), spin: true, texts: [{ p: [0, -oy, R / 2 + .75], t: '앞 ▲', cls: 'front-lab', size: 22 }] };
}
// 본 모양: 칸 집합. 위(앞이 아래쪽), 앞(왼→오른쪽 = 열), 오른쪽 옆(왼쪽 = 앞)
function viewOf(s, dir) {
  const { h, C, R } = s, cells = new Set();
  if (dir === 'top') { for (let i = 0; i < C; i++) for (let j = 0; j < R; j++) if (h[i][j]) cells.add(i + ',' + j); return { w: C, hgt: R, cells }; }
  const cols = dir === 'front' ? [...Array(C).keys()].map(i => Math.max(...h[i])) : [...Array(R).keys()].reverse().map(j => Math.max(...h.map(col => col[j])));
  return colsView(cols);
}
function colsView(cols) { const H = Math.max(...cols), cells = new Set(); cols.forEach((v, x) => { for (let l = 0; l < v; l++) cells.add(x + ',' + (H - 1 - l)); }); return { w: cols.length, hgt: H, cells, cols }; }
const vkey = v => v.w + 'x' + v.hgt + ':' + [...v.cells].sort().join(';');
function viewSVG(v) {
  const s = 14, g = 2; let r = '';
  for (let y = 0; y < v.hgt; y++) for (let x = 0; x < v.w; x++) r += `<rect x="${x * (s + g)}" y="${y * (s + g)}" width="${s}" height="${s}" rx="2" fill="${v.cells.has(x + ',' + y) ? '#4d96ff' : '#e8eef5'}"/>`;
  return `<svg class="view" viewBox="-2 -2 ${v.w * (s + g) + 2} ${v.hgt * (s + g) + 2}" aria-hidden="true">${r}</svg>`;
}
function mutateView(v) {
  if (v.cols) { const cols = v.cols.slice(), i = ri(0, cols.length - 1); cols[i] = Math.max(cols[i] > 1 ? 1 : 0, cols[i] + pick([-1, 1])); if (cols[i] === 0 && cols.filter(Boolean).length < 2) cols[i] = 2; return colsView(cols); }
  const cells = new Set(v.cells), x = ri(0, v.w - 1), y = ri(0, v.hgt - 1), k = x + ',' + y;
  if (cells.has(k) && cells.size > 2) cells.delete(k); else cells.add(k);
  return { w: v.w, hgt: v.hgt, cells };
}

// ---------- 문제 만들기
const DIRS = { top: '위', front: '앞', side: '오른쪽 옆' };
const GEN = {
  count() {
    const cube = Math.random() < .4, dims = cube ? [2, 2, 2] : [ri(2, 4), ri(1, 2) + .5, ri(1, 3) + .5], what = pick(['면', '모서리', '꼭짓점']), ans = { 면: 6, 모서리: 12, 꼭짓점: 8 }[what];
    const name = cube ? '정육면체' : '직육면체', model = boxModel(dims, Array(6).fill('#9fd0ff'));
    return { model, ask: `이 ${name}의 <b>${what}</b>은 모두 몇 개일까요?`, answer: ans + '개', choices: ['4개', '6개', '8개', '12개'], tools: '끌어서 돌려 보세요',
             rule: [`${name}: 면 6개, 모서리 12개, 꼭짓점 8개`], hint: '돌려 보면서 뒤쪽까지 하나씩 세어 봐요', sig: 'c' + what + cube };
  },
  parallel() {
    const cols = shuffle(COLORS.slice()), dims = [ri(2, 3), ri(1, 2) + .5, ri(1, 2) + .5], model = boxModel(dims, cols.map(c => c.hex));
    const f = ri(0, 5), opp = f ^ 1, others = [0, 1, 2, 3, 4, 5].filter(i => i !== f && i !== opp);
    model.camHint = f;
    return { model, ask: `<b>${cols[f].name}</b> 면과 평행한 면은 무슨 색일까요?`, answer: cols[opp].name + ' 면', choices: shuffle([opp, ...shuffle(others).slice(0, 3)]).map(i => cols[i].name + ' 면'), words: true, tools: '끌어서 돌려 보세요',
             rule: [`서로 마주 보는 두 면은 평행해요`, `${cols[f].name} 면 ↔ ${cols[opp].name} 면`], hint: `${cols[f].name} 면의 반대쪽을 돌려서 찾아봐요`, sig: 'p' + f + cols.map(c => c.name).join() };
  },
  perp() {
    const cols = shuffle(COLORS.slice()), dims = [ri(2, 3), ri(1, 2) + .5, ri(1, 2) + .5], model = boxModel(dims, cols.map(c => c.hex)), f = ri(0, 5);
    return { model, ask: `<b>${cols[f].name}</b> 면과 수직인 면은 몇 개일까요?`, answer: '4개', choices: ['1개', '2개', '4개', '5개'], tools: '끌어서 돌려 보세요',
             rule: ['한 면과 맞닿은 이웃한 면은 모두 수직이에요', `${cols[f].name} 면과 수직인 면 4개 (마주 보는 ${cols[f ^ 1].name} 면만 평행)`], hint: `${cols[f].name} 면과 모서리로 맞닿은 면을 세어 봐요`, sig: 'q' + f + cols[0].name };
  },
  hidden() {
    const dims = [ri(2, 3) + .5, ri(1, 2) + .3, ri(1, 2) + .5], model = boxModel(dims, null, { ghost: true, fixed: true });
    const what = pick(['hiddenEdge', 'visibleEdge', 'hiddenVertex', 'visibleFace']);
    const ask = { hiddenEdge: '겨냥도에서 <b>보이지 않는 모서리</b>는 몇 개일까요?', visibleEdge: '겨냥도에서 <b>보이는 모서리</b>는 몇 개일까요?', hiddenVertex: '<b>보이지 않는 꼭짓점</b>은 몇 개일까요?', visibleFace: '겨냥도에서 <b>보이는 면</b>은 몇 개일까요?' }[what];
    return { model, what, ask, answer: null, tools: '보이지 않는 모서리는 점선으로 그려요',
             rule: ['겨냥도: 보이는 모서리는 실선, 보이지 않는 모서리는 점선', '보이는 모서리 9개, 보이지 않는 모서리 3개', '보이는 면 3개, 보이지 않는 꼭짓점 1개'], hint: '점선이 보이지 않는 모서리예요. 점선이 모이는 점은 보이지 않는 꼭짓점이에요', sig: 'h' + what + dims.join() };
  },
  isNet(g) {
    const want = Math.random() < g.validChance; let cells; do { cells = randomHexomino(); } while (isCubeNet(cells) !== want);
    const q = netQ(cells);
    return { ...q, ask: '이 전개도를 접으면 <b>정육면체</b>가 될까요?', answer: want ? '돼요' : '안 돼요', choices: ['돼요', '안 돼요'], words: true, tools: '',
             rule: want ? ['접으면 6개의 면이 겹치지 않고 정육면체가 돼요'] : ['접으면 겹치는 면이나 비는 곳이 생겨서 정육면체가 될 수 없어요'], hint: '머릿속으로 한 면씩 접어 봐요. 접어 보기 버튼도 눌러 봐요', sig: 'n' + cells.join(';') };
  },
  opposite() {
    let cells; do { cells = randomHexomino(); } while (!isCubeNet(cells));
    const q = netQ(cells), star = ri(0, 5), folded = foldNet(cells, q.tree, Math.PI / 2);
    let opp = 0, best = -1; folded.forEach((f, i) => { const d = len(sub(f.center, folded[star].center)); if (d > best) { best = d; opp = i; } });
    const labels = LAB.slice(); labels[star] = '★';
    q.labels = labels; q.fills = cells.map((_, i) => i === star ? '#ffd23f' : '#fff3d0');
    const others = shuffle([0, 1, 2, 3, 4, 5].filter(i => i !== star && i !== opp)).slice(0, 3);
    return { ...q, ask: '접었을 때 <b>★ 면과 마주 보는 면</b>은?', answer: labels[opp] + ' 면', choices: shuffle([opp, ...others]).map(i => labels[i] + ' 면'), words: true, tools: '',
             rule: [`★ 면과 ${labels[opp]} 면이 마주 봐요 (평행해요)`, '전개도에서 한 줄로 이어진 세 면이면 양 끝 면끼리 마주 봐요'], hint: '★ 면과 맞닿은 면 4개는 마주 볼 수 없어요. 남은 면을 찾아봐요', sig: 'o' + cells.join(';') + star };
  },
  stack(g) {
    const s = randomHeights(g), model = stackModel(s), list = s.h.flatMap(c => c).filter(Boolean);
    return { model, ask: '쌓기나무는 모두 몇 개일까요?', answer: s.n + '개', choices: numCh(s.n, [s.n - 1, s.n + 1, s.n - 2, s.n + 2], '개'), tools: '끌어서 돌려 보세요',
             rule: ['위에서 본 칸마다 쌓인 층수를 더해요', `${list.join(' + ')} = ${s.n}개`], hint: '뒤쪽이나 아래에 숨은 쌓기나무가 있는지 돌려서 봐요. 위층 아래에는 꼭 받쳐 주는 나무가 있어요', sig: 's' + JSON.stringify(s.h) };
  },
  views(g) {
    for (;;) {
      const s = randomHeights(g), dir = pick(['top', 'front', 'side']), ans = viewOf(s, dir), seen = new Set([vkey(ans)]), opts = [ans];
      for (const d of ['top', 'front', 'side']) { const v = viewOf(s, d); if (!seen.has(vkey(v)) && opts.length < 4) { seen.add(vkey(v)); opts.push(v); } }
      for (let t = 0; t < 40 && opts.length < 4; t++) { const v = mutateView(pick(opts)); if (!seen.has(vkey(v))) { seen.add(vkey(v)); opts.push(v); } }
      if (opts.length < 4) continue;
      const order = shuffle([0, 1, 2, 3]);
      return { model: stackModel(s), ask: `<b>${DIRS[dir]}</b>에서 본 모양은 어느 것일까요?`, pics: order.map(i => opts[i]), ansIdx: order.indexOf(0), answer: '#' + order.indexOf(0), tools: '끌어서 돌려 보세요',
               rule: [`${DIRS[dir]}에서 보면 각 줄에서 가장 높은 층까지 보여요`, dir === 'top' ? '위에서 보면 쌓기나무가 놓인 칸이 보여요 (앞이 아래쪽)' : dir === 'side' ? '오른쪽 옆에서 보면 앞쪽이 왼쪽에 보여요' : '앞에서 보면 왼쪽부터 각 열의 높이가 보여요'],
               hint: `돌려서 ${DIRS[dir]}에서 본 모습을 확인해 봐요`, sig: 'v' + dir + JSON.stringify(s.h) };
    }
  }
};
function netQ(cells) {
  const w = Math.max(...cells.map(c => c[0])) + 1, h = Math.max(...cells.map(c => c[1])) + 1, tree = netTree(cells);
  const folded = foldNet(cells, tree, Math.PI / 2), foldCenter = mul(folded.reduce((s, f) => add(s, f.center), [0, 0, 0]), 1 / 6);
  return { net: true, cells, tree, w, h, foldCenter, theta: 0 };
}

// ---------- 화면
let stage = 1, qi = 0, results = [], cur = null, tries = 0, locked = false, used = new Set(), anim = 0;
let stars = store.get('solidStars', {}); if (!stars || typeof stars !== 'object') stars = {};
const S = () => STAGES[stage - 1];
function camFor(q) { if (q.net) { cam.yaw = 0; cam.pitch = 90; } else if (q.model && q.model.camHint != null) { cam.yaw = -35; cam.pitch = 28; } else { cam.yaw = q.kind === 'stack' || q.kind === 'views' ? -32 : -35; cam.pitch = q.kind === 'hidden' ? 22 : 30; } }
function paint() {
  const q = cur; let m;
  if (q.net) m = netModel(q, q.theta);
  else m = q.model;
  if (q.kind === 'hidden') {   // 겨냥도: 반투명 면 + 실선/점선 모서리 (지금 보이는지 계산)
    const ff = m.faces.map(frontFacing);
    m.lines = m.edges.map(e => ({ a: e.a, b: e.b, dash: !ff[e.f[0]] && !ff[e.f[1]] }));
  }
  $('scene').innerHTML = draw3d(m);
}
// 겨냥도 정답은 실제로 그려진 그림에서 세어요
function hiddenAnswer(q) {
  const ff = q.model.faces.map(frontFacing), he = q.model.edges.filter(e => !ff[e.f[0]] && !ff[e.f[1]]).length, vf = ff.filter(Boolean).length;
  const v = { hiddenEdge: he, visibleEdge: 12 - he, hiddenVertex: he === 3 ? 1 : 0, visibleFace: vf }[q.what];
  q.choices = numCh(v, q.what === 'hiddenEdge' ? [4, 2, 6] : q.what === 'visibleEdge' ? [12, 8, 6] : q.what === 'hiddenVertex' ? [2, 3, 4] : [2, 4, 6], '개');
  return v + '개';
}
function startStage(n) { stage = n; qi = 0; results = []; used = new Set(); $('stgName').textContent = `${n}단계 · ${S().short}`; show(null); nextQ(); }
function nextQ() {
  cancelAnimationFrame(anim); $('fb').hidden = true; locked = false; tries = 0;
  let q, g = 0; do { const k = wpick(S().kinds); q = GEN[k.kind](k); q.kind = k.kind; } while (used.has(q.sig) && ++g < 30);
  used.add(q.sig); cur = q; camFor(q);
  if (q.kind === 'hidden') q.answer = hiddenAnswer(q);
  $('ask').innerHTML = q.ask; paint();
  $('toolHint').textContent = q.tools || ''; $('resetBtn').hidden = !(q.model && q.model.spin); $('foldBtn').hidden = true; $('foldBtn').textContent = '접어 보기';
  const C = $('choices'); C.innerHTML = ''; C.className = 'choices' + (q.choices && q.choices.length === 2 ? '' : '');
  if (q.pics) q.pics.forEach((v, i) => { const b = document.createElement('button'); b.className = 'ch pic'; b.innerHTML = viewSVG(v); b.dataset.v = '#' + i; b.setAttribute('aria-label', `${i + 1}번 모양`); b.onclick = () => choose('#' + i, b); C.appendChild(b); });
  else q.choices.forEach((t, i) => { const b = document.createElement('button'); b.className = 'ch' + (q.words ? ' sm' : ''); b.textContent = t; b.dataset.v = t; b.setAttribute('aria-label', `${i + 1}번 ${t}`); b.onclick = () => choose(t, b); C.appendChild(b); });
  dots();
}
function dots() { const el = $('dots'); el.innerHTML = ''; for (let i = 0; i < QN; i++) { const d = document.createElement('i'); if (results[i]) d.className = results[i]; else if (i === qi) d.className = 'now'; el.appendChild(d); } }
function panel(cls, title, lines, btn, fn) {
  const fb = $('fb'); fb.className = 'fb' + (cls ? ' ' + cls : ''); fb.hidden = false;
  $('fbTitle').textContent = title; $('fbText').innerHTML = lines.map(l => `<span>${l}</span>`).join(''); $('nextBtn').textContent = btn; $('nextBtn').onclick = fn;
  $('nextBtn').focus({ preventScroll: true });
}
const nextLabel = () => qi < QN - 1 ? '다음 문제' : '결과 보기';
function choose(v, b) {
  if (locked || b.disabled) return;
  tries++;
  if (v === cur.answer) {
    locked = true; results[qi] = tries === 1 ? 'o' : 'f'; b.classList.add('right'); snd(tries === 1 ? 'coin' : 'level');
    panel(tries === 1 ? '' : 'mid', tries === 1 ? pick(D.praise) : '고쳤어요! 잘했어요', cur.rule, nextLabel(), advance);
    if (cur.net) fold(true);
  } else if (tries === 1 && cur.choices?.length !== 2) {
    results[qi] = 'x'; b.classList.add('wrong'); b.disabled = true; snd('bad');
    if (cur.net) $('foldBtn').hidden = false;
    panel('bad', '다시 볼까요?', ['힌트: ' + cur.hint], '다시 고르기', () => { $('fb').hidden = true; });
  } else {
    locked = true; results[qi] = 'x'; b.classList.add('wrong'); snd('bad');
    $('choices').querySelectorAll('.ch').forEach(x => { if (x.dataset.v === cur.answer) x.classList.add('right'); });
    panel('bad', '정답을 확인해요', cur.rule, nextLabel(), advance);
    if (cur.net) fold(true);
  }
  dots();
}
function advance() { $('fb').hidden = true; if (qi >= QN - 1) return endStage(); qi++; nextQ(); }

// ---------- 전개도 접기 애니메이션 (카메라도 함께 기울여요)
function fold(to) {
  const q = cur; if (!q.net) return; cancelAnimationFrame(anim);
  const t0 = performance.now(), from = q.theta, target = to ? Math.PI / 2 : 0, y0 = cam.yaw, p0 = cam.pitch, y1 = to ? -35 : 0, p1 = to ? 32 : 90, ms = 1500;
  $('foldBtn').hidden = false; $('foldBtn').textContent = to ? '다시 펼치기' : '접어 보기'; $('resetBtn').hidden = true;
  const step = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    q.theta = from + (target - from) * e; cam.yaw = y0 + (y1 - y0) * e; cam.pitch = p0 + (p1 - p0) * e; paint();
    if (k < 1) anim = requestAnimationFrame(step); else if (to) $('toolHint').textContent = '끌어서 돌려 보세요'; };
  anim = requestAnimationFrame(step); snd('whoosh');
}
$('foldBtn').onclick = () => fold(cur.theta < .01);
$('resetBtn').onclick = () => { camFor(cur); paint(); };

// ---------- 끌어서 돌리기
let drag = null;
$('scene').addEventListener('pointerdown', e => {
  const q = cur; if (!q) return; const spin = q.net ? q.theta > 1.5 : q.model && q.model.spin; if (!spin) return;
  drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; try { $('scene').setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
});
$('scene').addEventListener('pointermove', e => {
  if (!drag) return; cam.yaw = drag.yaw + (e.clientX - drag.x) * .6; cam.pitch = Math.max(-10, Math.min(89, drag.pitch + (e.clientY - drag.y) * .45)); paint();
});
for (const ev of ['pointerup', 'pointercancel']) $('scene').addEventListener(ev, () => { drag = null; });
addEventListener('keydown', e => {
  if (!$('fb').hidden && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); $('nextBtn').click(); return; }
  const k = +e.key; if ($('fb').hidden && $('titleOv').hidden && $('endOv').hidden && k >= 1 && k <= 4) { const b = $('choices').querySelectorAll('.ch')[k - 1]; if (b) b.click(); }
  if ($('fb').hidden && cur && /^Arrow/.test(e.code) && (cur.model?.spin || cur.theta > 1.5)) { e.preventDefault(); cam.yaw += e.code === 'ArrowLeft' ? -15 : e.code === 'ArrowRight' ? 15 : 0; cam.pitch = Math.max(-10, Math.min(89, cam.pitch + (e.code === 'ArrowUp' ? -10 : e.code === 'ArrowDown' ? 10 : 0))); paint(); }
});

// ---------- 단계 끝
function endStage() {
  const ok = results.filter(r => r === 'o').length, fixed = results.filter(r => r === 'f').length;
  const s = D.starThresholds.filter(n => ok >= n).length;
  stars[stage] = Math.max(stars[stage] || 0, s); store.set('solidStars', stars);
  store.set('solidStarTotal', Object.values(stars).reduce((a, b) => a + b, 0));
  $('eStars').innerHTML = '★'.repeat(s) + '<span style="color:#d9e6f2;text-shadow:none">' + '★'.repeat(3 - s) + '</span>';
  $('eTitle').textContent = D.endTitles[s];
  $('eTxt').textContent = `${stage}단계 · ${S().name}\n${QN}문제 중 ${ok}개는 한 번에 맞혔어요` + (fixed ? `\n${fixed}개는 다시 골라서 맞혔어요` : '') + (s < 3 ? `\n별 3개는 ${QN}개 모두 한 번에!` : '');
  $('nextStageBtn').hidden = stage >= STAGES.length || s === 0; $('nextStageBtn').textContent = `${stage + 1}단계로`;
  show('endOv'); snd(s >= 2 ? 'win' : s === 1 ? 'level' : 'lose');
  ($('nextStageBtn').hidden ? $('againBtn') : $('nextStageBtn')).focus();
}
$('nextStageBtn').onclick = () => startStage(stage + 1);
$('againBtn').onclick = () => startStage(stage);
$('pickBtn').onclick = () => { renderStages(); show('titleOv'); };
$('menuBtn').onclick = () => { $('fb').hidden = true; cancelAnimationFrame(anim); renderStages(); show('titleOv'); };
function show(id) { for (const o of ['titleOv', 'endOv']) $(o).hidden = o !== id; }
function renderStages() {
  const el = $('stages'); el.innerHTML = ''; const next = STAGES.findIndex((_, i) => !stars[i + 1]);
  STAGES.forEach((st, i) => {
    const n = i + 1, s = stars[n] || 0, b = document.createElement('button'); b.className = 'stage' + (i === next ? ' next' : '');
    b.innerHTML = `<span class="no">${n}</span><span class="nm">${st.name}<small>${st.sub}${st.grade ? ' · ' + st.grade : ''}</small></span><span class="st">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></span>`;
    b.onclick = () => { snd('click'); startStage(n); }; el.appendChild(b);
  });
}
renderStages();
})();
