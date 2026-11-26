/* 규칙 기차 — 게임 동작
 * 단계 구성, 문제 종류와 범위, 색·모양·그림 목록, 칭찬 문구는 data.json 에서 읽어요.
 * 문제 종류(kind): repeat(반복 무늬) · two(색과 모양이 따로 바뀜) · skip(뛰어 세기)
 *                  calendar(달력) · table(곱셈표·덧셈표 조각) · grow(늘어나는 규칙)
 * 저장(localStorage): patternStars {단계번호: 별}, patternStarTotal (목록 화면 '내 기록'용) */
(async () => {
const HERE = document.currentScript.src;
const $ = id => document.getElementById(id), snd = (...a) => window.Arcade && Arcade.play(...a);

const ENGINE = `<svg viewBox="0 0 70 64" aria-hidden="true">
  <circle class="puff" cx="16" cy="4" r="5"/><circle class="puff p2" cx="16" cy="4" r="5"/><circle class="puff p3" cx="16" cy="4" r="5"/>
  <rect x="11" y="6" width="10" height="16" rx="2" fill="#2f5d8a"/>
  <rect x="4" y="20" width="40" height="26" rx="7" fill="#e2574c"/><rect x="4" y="29" width="40" height="4" fill="#b8443a"/>
  <rect x="40" y="6" width="27" height="40" rx="5" fill="#2f5d8a"/><rect x="45" y="12" width="17" height="13" rx="3" fill="#bfe9ff"/>
  <rect x="37" y="2" width="33" height="6" rx="3" fill="#24476a"/>
  <path d="M5 40 L-4 54 H13 Z" fill="#8a5a34"/>
  <g fill="#33404a"><circle cx="17" cy="53" r="8"/><circle cx="36" cy="53" r="8"/><circle cx="56" cy="53" r="8"/></g>
  <g fill="#c9ced6"><circle cx="17" cy="53" r="3"/><circle cx="36" cy="53" r="3"/><circle cx="56" cy="53" r="3"/></g></svg>`;
$('logo').innerHTML = ENGINE;

let D;
try { const r = await fetch(new URL('data.json', HERE)); if (!r.ok) throw new Error(r.status); D = await r.json(); }
catch (e) {
  $('stages').innerHTML = '<p class="loaderr">게임 데이터(data.json)를 불러오지 못했어요.<br>인터넷 연결을 확인하거나, 컴퓨터에서는 웹 서버로 열어 주세요.</p>';
  console.error('data.json 불러오기 실패', e); return;
}
const STAGES = D.stages, QN = D.questionsPerStage;

// ---------- 도구
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a.slice()).slice(0, n), range = n => [...Array(n).keys()];
const wpick = list => { let r = Math.random() * list.reduce((s, x) => s + (x.weight ?? 1), 0); for (const x of list) { r -= x.weight ?? 1; if (r <= 0) return x; } return list[list.length - 1]; };

// ---------- 칸에 싣는 것(토큰): shape(모양+색) · emo(그림) · num(수) · blocks(쌓은 블록)
const key = t => t.t === 'shape' ? `s${t.s}-${t.c}` : t.t === 'emo' ? 'e' + t.e : 'n' + t.v;
const num = v => ({ t: 'num', v });
function label(t) {
  if (t.t === 'shape') return `${D.colors[t.c].adj} ${D.shapes[t.s].name}`;
  if (t.t === 'emo') return t.e;
  if (t.t === 'blocks') return `블록 ${t.v}개`;
  return String(t.v);
}
function blocksSVG(t) {
  const B = 10, m = t.m; let r = '';
  for (let j = 0; j < t.k; j++) {
    const h = t.shape === 'stairs' ? j + 1 : t.k;
    for (let i = 0; i < h; i++) r += `<rect x="${j * B + .7}" y="${(m - 1 - i) * B + .7}" width="${B - 1.4}" height="${B - 1.4}" rx="1.6"/>`;
  }
  return `<svg viewBox="0 0 ${m * B} ${m * B}" aria-hidden="true"><g fill="#3d8bff">${r}</g></svg>`;
}
function tokHTML(t) {
  if (t.t === 'shape') return `<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="${D.colors[t.c].hex}">${D.shapes[t.s].svg}</g></svg>`;
  if (t.t === 'emo') return `<span class="emo" aria-hidden="true">${t.e}</span>`;
  if (t.t === 'blocks') return blocksSVG(t);
  const s = String(t.v); return `<span class="${s.length >= 4 ? 'n4' : s.length === 3 ? 'n3' : ''}">${s}</span>`;
}
// 서로 다른 모양·색(또는 그림) n개
function tokenPool(n) {
  if (n <= 4 && Math.random() < .4) return sample(pick(D.emojiSets), n).map(e => ({ t: 'emo', e }));
  const s = sample(range(D.shapes.length), n), c = sample(range(D.colors.length), n);
  return s.map((x, i) => ({ t: 'shape', s: x, c: c[i] }));
}
// 수 보기: 정답 + 헷갈리기 쉬운 후보(앞에 있을수록 우선)
function numChoices(ans, cands, n, ok = v => v > 0) {
  const out = [], seen = new Set([ans]);
  for (const v of cands) if (out.length < n - 1 && Number.isInteger(v) && ok(v) && !seen.has(v)) { seen.add(v); out.push(v); }
  for (let d = 1; out.length < n - 1; d++) for (const v of [ans + d, ans - d]) if (out.length < n - 1 && ok(v) && !seen.has(v)) { seen.add(v); out.push(v); }
  return shuffle([ans, ...out]).map(num);
}
const sign = d => d < 0 ? '−' + -d : '+' + d;

// ---------- 문제 만들기: 결과 {view, seq|cells, mi(빈칸 위치), answer, choices, ask, rule, hint}
const GEN = {
  repeat(g, n) {
    const unit = pick(g.units), letters = [...new Set(unit)], pool = tokenPool(Math.max(letters.length + 1, n));
    const map = {}; letters.forEach((L, i) => map[L] = pool[i]);
    const L = Math.max(ri(g.length[0], g.length[1]), unit.length * 2);
    const seq = range(L).map(i => map[unit[i % unit.length]]);
    const mi = g.missing === 'last' ? L - 1 : ri(unit.length, L - 1), ans = seq[mi];
    const inUnit = shuffle(letters.map(x => map[x]).filter(t => key(t) !== key(ans)));
    const extra = shuffle(pool.slice(letters.length));
    return { view: 'train', seq, mi, answer: ans, choices: shuffle([ans, ...[...inUnit, ...extra].slice(0, n - 1)]),
             ask: '<b>?</b> 칸에 올 것을 골라요', rule: `${[...unit].map(x => label(map[x])).join(' → ')} 순서로 되풀이돼요`,
             hint: { groups: unit.length }, sig: 'r' + unit + seq.map(key).join() + mi };
  },
  two(g, n) {
    let cl = pick(g.colorCycle), sl = pick(g.shapeCycle); if (cl === sl) sl = cl === 2 ? 3 : 2;
    const cols = sample(range(D.colors.length), cl), shs = sample(range(D.shapes.length), sl);
    const L = Math.max(ri(g.length[0], g.length[1]), Math.max(cl, sl) + 2);
    const seq = range(L).map(i => ({ t: 'shape', s: shs[i % sl], c: cols[i % cl] }));
    const mi = ri(Math.max(cl, sl), L - 1), ans = seq[mi];
    const oc = pick(cols.filter(c => c !== ans.c)), os = pick(shs.filter(s => s !== ans.s));
    const ch = [ans, { t: 'shape', s: ans.s, c: oc }, { t: 'shape', s: os, c: ans.c }, { t: 'shape', s: os, c: oc }].slice(0, n);
    return { view: 'train', seq, mi, answer: ans, choices: shuffle(ch), ask: '<b>?</b> 칸에 올 것을 골라요',
             rule: `색은 ${cols.map(c => D.colors[c].name).join(' → ')},<br>모양은 ${shs.map(s => D.shapes[s].name).join(' → ')} 순서로 따로따로 되풀이돼요`,
             hint: {}, sig: 't' + seq.map(key).join() + mi };
  },
  skip(g, n) {
    const step = pick(g.steps), L = ri(g.length[0], g.length[1]), down = Math.random() < g.downChance;
    const start = Math.round(ri(g.start[0], g.start[1]) / g.round) * g.round;
    const vals = range(L).map(i => start + i * step); if (down) vals.reverse();
    const mi = g.missing === 'last' ? L - 1 : ri(1, L - 1), ans = vals[mi], small = step >= 10 ? step / 10 : 1;
    const d = down ? -step : step;
    return { view: 'train', seq: vals.map(num), mi, answer: num(ans),
             choices: numChoices(ans, [ans + d, ans - d, ans + small, ans - small, ans + 2 * d], n, v => v >= 0),
             ask: '<b>?</b> 칸에 올 수는 무엇일까요?', rule: `${step}씩 ${down ? '작아져요' : '커져요'}`,
             hint: { gaps: vals.map((_, i) => i ? sign(d) : null) }, sig: 'k' + vals.join() + mi };
  },
  calendar(g, n) {
    const dow = ri(0, 6), days = pick([30, 31]), month = ri(1, 12), rows = Math.ceil((dow + days) / 7);
    const idx = d => d - 1 + dow, rowOf = d => Math.floor(idx(d) / 7);
    const t = ri(8, days - 1);
    const vert = Math.random() < .6 || !(rowOf(t - 1) === rowOf(t) || rowOf(t + 1) === rowOf(t));
    const cells = range(rows * 7).map(i => { const d = i - dow + 1; return d < 1 || d > days ? { empty: true } : { v: d, hide: Math.random() < .55 }; });
    const cell = d => d >= 1 && d <= days ? cells[idx(d)] : null;
    if (vert) {
      for (const d of [t - 1, t + 1]) if (cell(d) && rowOf(d) === rowOf(t)) cell(d).hide = true;
      const w = [t - 7, t + 7].filter(cell); const c = cell(pick(w)); c.hide = false;
    } else {
      for (const d of [t - 7, t + 7]) if (cell(d)) cell(d).hide = true;
      const w = [t - 1, t + 1].filter(d => cell(d) && rowOf(d) === rowOf(t)); cell(pick(w)).hide = false;
    }
    const mi = idx(t), hl = range(rows * 7).filter(i => i !== mi && !cells[i].empty && !cells[i].hide && (vert ? i % 7 === mi % 7 : Math.floor(i / 7) === Math.floor(mi / 7)));
    return { view: 'grid', cols: 7, title: `${month}월`, head: ['일', '월', '화', '수', '목', '금', '토'], cells, mi, answer: num(t),
             choices: numChoices(t, vert ? [t + 7, t - 7, t + 1, t - 1] : [t + 1, t - 1, t + 7, t - 7], n, v => v >= 1 && v <= days),
             ask: '달력의 <b>?</b> 에 들어갈 날짜는?', rule: vert ? '달력은 아래로 한 칸 내려가면 7씩 커져요' : '달력은 오른쪽으로 한 칸 가면 1씩 커져요',
             hint: { hl }, sig: 'c' + month + '-' + t + '-' + dow };
  },
  table(g, n) {
    const k = g.size, a = ri(g.rows[0], g.rows[1]), b = ri(g.cols[0], g.cols[1]), mul = g.op === 'x';
    const val = (r, c) => mul ? (a + r) * (b + c) : (a + r) + (b + c);
    const cells = []; for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) cells.push({ v: val(r, c), r, c });
    const mi = ri(1, k * k - 1), T = cells[mi], ans = T.v;
    const others = cells.filter(x => x.r !== T.r && x.c !== T.c); pick(others).hide = true;
    const nb = [[0, -1], [-1, 0], [0, 1], [1, 0]].map(([dr, dc]) => cells.find(x => x.r === T.r + dr && x.c === T.c + dc)).filter(Boolean).map(x => x.v);
    const rs = mul ? a + T.r : 1, cs = mul ? b + T.c : 1;
    return { view: 'grid', cols: k, title: mul ? '곱셈표의 한 부분' : '덧셈표의 한 부분', cells, mi, answer: num(ans),
             choices: numChoices(ans, [...shuffle(nb), ans + 1, ans - 1], n),
             ask: '표의 <b>?</b> 에 들어갈 수는?', rule: `이 가로줄은 오른쪽으로 ${rs}씩,<br>이 세로줄은 아래로 ${cs}씩 커져요`,
             hint: { hl: cells.map((x, i) => i !== mi && !x.hide && (x.r === T.r || x.c === T.c) ? i : -1).filter(i => i >= 0) }, sig: 'b' + g.op + a + '-' + b + '-' + mi };
  },
  grow(g, n) {
    let vals, toks, rule, hintText, gaps, cands, ask = '<b>?</b> 칸에 올 수는 무엇일까요?';
    if (g.type === 'plusUp') {
      const s = ri(1, 6), d0 = ri(1, 3), L = 5; vals = [s]; for (let i = 1; i < L; i++) vals.push(vals[i - 1] + d0 + i - 1);
      const diffs = vals.slice(1).map((v, i) => v - vals[i]), ans = vals[L - 1], prev = vals[L - 2];
      cands = [prev + diffs[L - 3], ans + 1, ans - 1, ans + diffs[L - 2]];
      rule = `늘어나는 수가 1씩 커져요: ${diffs.map(sign).join(', ')}`; gaps = [null, ...diffs.map(sign)];
      hintText = `늘어나는 수가 1씩 커져요: ${diffs.slice(0, -1).map(sign).join(', ')}, 그다음은?`;
    } else if (g.type === 'double') {
      const s = pick([1, 2, 3, 5]); vals = range(5).map(i => s * 2 ** i);
      const ans = vals[4], prev = vals[3]; cands = [prev + (prev - vals[2]), ans + 2, ans - 2, prev * 3];
      rule = hintText = '앞의 수를 2배 하면 다음 수가 돼요'; gaps = [null, '×2', '×2', '×2', '×2'];
    } else {
      const m = ri(3, 4), sq = g.type === 'square', f = k => sq ? k * k : k * (k + 1) / 2;
      vals = range(m + 1).map(i => f(i + 1));
      toks = range(m).map(i => ({ t: 'blocks', shape: g.type, k: i + 1, m, v: vals[i] }));
      const diffs = vals.slice(1).map((v, i) => v - vals[i]), ans = vals[m], prev = vals[m - 1];
      cands = [prev + diffs[m - 2], ans + 1, ans - 1, ans + m + 1];
      rule = sq ? `가로·세로가 한 칸씩 늘어나요: ${range(m + 1).map(i => `${i + 1}×${i + 1}`).join(', ')}`
                : `계단이 한 칸씩 높아져요. 블록이 ${diffs.map(sign).join(', ')} 늘어나요`;
      hintText = sq ? `가로·세로가 한 칸씩 늘어나요: ${range(m).map(i => `${i + 1}×${i + 1}`).join(', ')}, 그다음은?`
                    : `계단이 한 칸씩 높아져요. 블록이 ${diffs.slice(0, -1).map(sign).join(', ')} 늘어났어요. 그다음은?`;
      gaps = [null, ...diffs.map(sign)]; ask = '<b>?</b> 칸에는 블록이 몇 개일까요?';
    }
    const L = vals.length, ans = vals[L - 1];
    const seq = toks ? [...toks, num(ans)] : vals.map(num);
    return { view: 'train', seq, mi: L - 1, answer: num(ans), choices: numChoices(ans, cands, n), ask, rule, hintText,
             hint: { gaps, hideLast: true }, sig: 'g' + g.type + vals.join() };
  }
};

// ---------- 그리기
function renderTrain(q) {
  const tr = document.createElement('div'); tr.className = 'train enter';
  const digits = Math.max(0, ...q.seq.filter(t => t.t === 'num').map(t => String(t.v).length));
  tr.dataset.min = digits >= 4 ? 56 : digits === 3 ? 48 : 42;
  tr.innerHTML = `<div class="engine">${ENGINE}<i class="rail"></i></div>` + q.seq.map((t, i) => i === q.mi
    ? `<div class="car q" data-i="${i}" aria-label="빈칸"><span class="qm">?</span><i class="rail"></i></div>`
    : `<div class="car" data-i="${i}" aria-label="${label(t)}">${tokHTML(t)}<i class="rail"></i></div>`).join('');
  return tr;
}
function renderGrid(q) {
  const g = document.createElement('div'); g.className = 'grid enter'; g.style.setProperty('--cols', q.cols);
  g.innerHTML = (q.title ? `<div class="mon">${q.title}</div>` : '') + (q.head ? q.head.map((x, i) => `<div class="h${i ? '' : ' sun'}">${x}</div>`).join('') : '')
    + q.cells.map((c, i) => c.empty ? '<div class="cell empty"></div>' : i === q.mi ? `<div class="cell q" data-i="${i}">?</div>`
      : c.hide ? `<div class="cell blank" data-i="${i}"></div>` : `<div class="cell" data-i="${i}">${c.v}</div>`).join('');
  return g;
}
function fit() {
  const sc = $('scene'), W = sc.clientWidth - 8, H = sc.clientHeight, tr = sc.querySelector('.train'), gr = sc.querySelector('.grid');
  if (tr) {
    const n = tr.children.length, gap = 7;
    const minCw = +tr.dataset.min || 42;
    let rows = 1, per = n, cw = Math.floor((W - gap * (n - 1)) / (n + .15));
    if (cw < minCw && n > 4) { rows = 2; per = Math.ceil(n / 2); cw = Math.floor((W - gap * (per - 1)) / (per + .15)); }
    cw = Math.max(30, Math.min(78, cw, Math.floor((H / rows - 70) / 1.05)));
    tr.style.setProperty('--cw', cw + 'px'); tr.style.width = Math.ceil(per * cw + cw * .15 + gap * (per - 1)) + 2 + 'px';
  }
  if (gr) {
    const cols = +gr.style.getPropertyValue('--cols'), cells = gr.querySelectorAll('.cell').length;
    const rows = cells / cols + (gr.querySelector('.h') ? .5 : 0) + (gr.querySelector('.mon') ? .7 : 0);
    const gw = Math.max(26, Math.min(cols > 4 ? 52 : 70, Math.floor((W - 28 - 4 * (cols - 1)) / cols), Math.floor((H - 34 - 4 * rows) / rows)));
    gr.style.setProperty('--gw', gw + 'px');
  }
}
addEventListener('resize', fit);
// 힌트: 되풀이 묶음 색칠(groups), 칸 사이 변화 표시(gaps), 표에서 같은 줄 강조(hl)
// revealed=false 이면 hideLast 문제의 마지막 변화는 '?'로 감춰요
function showHint(revealed) {
  const sc = $('scene'), h = cur.hint;
  if (h.groups) sc.querySelectorAll('.car').forEach(c => c.classList.add(Math.floor(c.dataset.i / h.groups) % 2 ? 'gb' : 'ga'));
  if (h.gaps) sc.querySelectorAll('.car').forEach(c => {
    let t = h.gaps[c.dataset.i]; if (!t) return;
    const hide = h.hideLast && +c.dataset.i === cur.mi && !revealed; if (hide) t = '?';
    let el = c.querySelector('.gap'); if (!el) { el = document.createElement('span'); c.appendChild(el); }
    el.className = 'gap' + (hide ? ' unk' : ''); el.textContent = t;
  });
  if (h.hl) h.hl.forEach(i => { const c = sc.querySelector(`.cell[data-i="${i}"]`); if (c) c.classList.add('hl'); });
}
// 빈칸에 정답을 넣고, 규칙 표시를 모두 보여 줘요
function fillAnswer() {
  const q = $('scene').querySelector('.q'); if (!q) return;
  q.classList.remove('q'); q.classList.add('filled'); q.innerHTML = tokHTML(cur.answer) + (q.classList.contains('car') ? '<i class="rail"></i>' : '');
  showHint(true);
}

// ---------- 진행
let stage = 1, qi = 0, results = [], cur = null, tries = 0, locked = false, used = new Set();
let stars = store.get('patternStars', {}); if (!stars || typeof stars !== 'object') stars = {};
const S = () => STAGES[stage - 1];

function startStage(n) {
  stage = n; qi = 0; results = []; used = new Set();
  $('stgName').textContent = `${n}단계 · ${S().short}`; show(null); nextQ();
}
function nextQ() {
  $('fb').hidden = true; locked = false; tries = 0;
  let q, g = 0; do { const k = wpick(S().kinds); q = GEN[k.kind](k, S().choices); } while (used.has(q.sig) && ++g < 30);
  used.add(q.sig); cur = q;
  $('ask').innerHTML = q.ask;
  const sc = $('scene'); sc.innerHTML = ''; const el = q.view === 'grid' ? renderGrid(q) : renderTrain(q); sc.appendChild(el); fit();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter')));
  const C = $('choices'); C.innerHTML = '';
  q.choices.forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'ch'; b.innerHTML = tokHTML(t); b.setAttribute('aria-label', `${i + 1}번 ${label(t)}`);
    b.onclick = () => choose(t, b); C.appendChild(b);
  });
  dots();
}
function dots() {
  const el = $('dots'); el.innerHTML = '';
  for (let i = 0; i < QN; i++) { const d = document.createElement('i'); if (results[i]) d.className = results[i]; else if (i === qi) d.className = 'now'; el.appendChild(d); }
}
function panel(cls, title, text, btn, fn) {
  const fb = $('fb'); fb.className = 'fb' + (cls ? ' ' + cls : ''); fb.hidden = false;
  $('fbTitle').textContent = title; $('fbText').innerHTML = text; $('nextBtn').textContent = btn; $('nextBtn').onclick = fn;
  $('nextBtn').focus({ preventScroll: true });
}
const nextLabel = () => qi < QN - 1 ? '다음 기차' : '결과 보기';
function choose(t, b) {
  if (locked || b.disabled) return;
  tries++;
  if (key(t) === key(cur.answer)) {
    locked = true; results[qi] = tries === 1 ? 'o' : 'f'; b.classList.add('right'); fillAnswer(); snd(tries === 1 ? 'coin' : 'level');
    panel(tries === 1 ? '' : 'mid', tries === 1 ? pick(D.praise) : '고쳤어요! 잘했어요', `<span>${cur.rule}</span>`, nextLabel(), advance);
  } else if (tries === 1) {
    results[qi] = 'x'; b.classList.add('wrong'); b.disabled = true; snd('bad'); showHint();
    panel('bad', '다시 볼까요?', `<span>힌트: ${cur.hintText || cur.rule}</span>`, '다시 고르기', () => { $('fb').hidden = true; });
  } else {
    locked = true; b.classList.add('wrong'); snd('bad'); fillAnswer();
    $('choices').querySelectorAll('.ch').forEach((x, i) => { if (key(cur.choices[i]) === key(cur.answer)) x.classList.add('right'); });
    panel('bad', '정답은 이거예요', `<span>${cur.rule}</span>`, nextLabel(), advance);
  }
  dots();
}
function advance() {
  $('fb').hidden = true;
  if (qi >= QN - 1) return endStage();
  qi++; snd('whoosh');
  const el = $('scene').firstElementChild; if (el) el.classList.add('go');
  setTimeout(nextQ, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380);
}
addEventListener('keydown', e => {
  if (!$('fb').hidden && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); $('nextBtn').click(); return; }
  const k = +e.key; if ($('fb').hidden && $('titleOv').hidden && $('endOv').hidden && k >= 1 && k <= 4) { const b = $('choices').children[k - 1]; if (b) b.click(); }
});

// ---------- 단계 끝
function endStage() {
  const ok = results.filter(r => r === 'o').length, fixed = results.filter(r => r === 'f').length;
  const s = D.starThresholds.filter(n => ok >= n).length;
  stars[stage] = Math.max(stars[stage] || 0, s); store.set('patternStars', stars);
  store.set('patternStarTotal', Object.values(stars).reduce((a, b) => a + b, 0));
  $('eStars').innerHTML = '★'.repeat(s) + '<span style="color:#dde8d6;text-shadow:none">' + '★'.repeat(3 - s) + '</span>';
  $('eTitle').textContent = D.endTitles[s];
  $('eTxt').textContent = `${stage}단계 · ${S().name}\n기차 ${QN}대 중 ${ok}대는 한 번에 맞혔어요` + (fixed ? `\n${fixed}대는 다시 골라서 맞혔어요` : '') + (s < 3 ? `\n별 3개는 ${QN}대 모두 한 번에!` : '');
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
    b.innerHTML = `<span class="no">${n}</span><span class="nm">${st.name}${st.challenge ? '<span class="tagc">도전</span>' : ''}<small>${st.sub}</small></span><span class="st">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></span>`;
    b.onclick = () => { snd('click'); startStage(n); }; el.appendChild(b);
  });
}
renderStages();
})();
