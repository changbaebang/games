/* 그래프 마을 — 문제 만들기와 그림
 * 공통 진행은 ../common/learn.js, 단계·주제·색은 data.json
 * 저장 키: graphStars, graphStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample, nums } = Learn.U, C = D.colors;
const UN = (v, u) => /^[a-z]/i.test(u) ? `${v} ${u}` : v + u;          // 5 cm, 12명, 15℃
const wrap = s => `<div class="box">${s}</div>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const eul = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '을' : '를'; };
const eun = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '은' : '는'; };
const ga = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; };
// 주제에서 n 개 항목 고르기 (원래 순서 유지)
const topicItems = (t, n) => { const idx = sample(t.items.map((_, i) => i), Math.min(n, t.items.length)).sort((a, b) => a - b); return idx.map(i => t.items[i]); };
// 서로 다른 값 n 개 (가장 큰 값이 하나뿐)
function distinct(n, lo, hi) { for (;;) { const v = Array.from({ length: n }, () => ri(lo, hi)); const m = Math.max(...v), mi = Math.min(...v); if (v.filter(x => x === m).length === 1 && v.filter(x => x === mi).length === 1 && new Set(v).size >= n - 1) return v; } }

/* ---------- 표 ---------- */
function tableHTML(t, items, vals, { hide = -1, total = true, hideTotal = false } = {}) {
  const sum = vals.reduce((a, b) => a + b, 0);
  const head = items.map(([n, e]) => `<th><span class="em">${e}</span>${esc(n)}</th>`).join('') + (total ? '<th>합계</th>' : '');
  const row = vals.map((v, i) => `<td${i === hide ? ' class="q"' : ''}>${i === hide ? '?' : v}</td>`).join('') + (total ? `<td class="${hideTotal ? 'q' : 'sum'}">${hideTotal ? '?' : sum}</td>` : '');
  return `<div class="tbwrap"><div class="cap">${esc(t.title)}</div><table class="tb"><tr><th class="rh">${esc(t.what)}</th>${head}</tr><tr><th class="rh">학생 수<br><small>(${t.unit})</small></th>${row}</tr></table></div>`;
}

/* ---------- 그림그래프 ---------- */
function picSVG(t, vals, big, { hi = [] } = {}) {
  const small = big / 10, RH = 50, LW = 104, W = 450, H = vals.length * RH + 58;
  let s = `<rect x="1" y="1" width="${W - 2}" height="${vals.length * RH}" fill="#fff" stroke="${C.axis}" stroke-width="2" rx="6"/><line x1="${LW}" y1="1" x2="${LW}" y2="${vals.length * RH}" stroke="${C.axis}" stroke-width="2"/>`;
  vals.forEach((v, i) => {
    const y = i * RH, nb = Math.floor(v / big), ns = Math.round((v % big) / small);
    if (i) s += `<line x1="1" y1="${y}" x2="${W - 1}" y2="${y}" stroke="${C.grid}" stroke-width="2"/>`;
    if (hi.includes(i)) s += `<rect x="3" y="${y + 3}" width="${W - 6}" height="${RH - 6}" fill="#ffe8b0" rx="4"/>`;
    s += `<text class="lb" x="${LW / 2}" y="${y + RH / 2}">${esc(t.items[i])}</text>`;
    let x = LW + 10;
    for (let k = 0; k < nb; k++, x += 36) s += `<text class="ic big" x="${x}" y="${y + RH / 2}">${t.icon}</text>`;
    for (let k = 0; k < ns; k++, x += 22) s += `<text class="ic sm" x="${x}" y="${y + RH / 2 + 4}">${t.icon}</text>`;
  });
  const ly = vals.length * RH + 30;
  s += `<text class="ic big" x="${W - 250}" y="${ly}">${t.icon}</text><text class="lg" x="${W - 212}" y="${ly}">${UN(big, t.unit)}</text><text class="ic sm" x="${W - 120}" y="${ly + 3}">${t.icon}</text><text class="lg" x="${W - 96}" y="${ly}">${UN(small, t.unit)}</text>`;
  return `<div class="cap">${esc(t.title)}</div><svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
}
function picData(g) {
  const t = pick(D.pictureTopics), big = g.hundred ? 100 : 10, unitV = big / 10;
  const vals = distinct(4, 11, 49).map(v => (v % 10 === 0 ? v + 3 : v) * unitV);   // 큰 그림·작은 그림이 둘 다 나오게
  return { t, vals, big };
}
const picRule = (t, v, big) => { const nb = Math.floor(v / big), ns = (v % big) / (big / 10); return `큰 그림 ${nb}개(${UN(nb * big, t.unit)}) + 작은 그림 ${ns}개(${UN(v % big, t.unit)}) = ${UN(v, t.unit)}`; };

/* ---------- 막대그래프 ---------- */
const BW = 360, X0 = 50, Y0 = 228, PH = 196;
function barSVG(t, items, vals, { step = 1, n = 10, every = 5, hi = [], guide = -1, make = false } = {}) {
  const U = PH / n, cw = (BW - X0 - 8) / items.length, bw = Math.min(46, cw * .56);
  let s = '';
  for (let k = 0; k <= n; k++) { const y = Y0 - k * U; s += `<line x1="${X0}" y1="${y}" x2="${BW - 6}" y2="${y}" stroke="${C.grid}" stroke-width="${k % every ? 1 : 2}"/>`; if (k % every === 0) s += `<text class="tk" x="${X0 - 8}" y="${y}">${k * step}</text>`; }
  items.forEach(([nm, em], i) => {
    const cx = X0 + cw * i + cw / 2, v = vals[i], h = v / step * U, on = hi.includes(i);
    if (make) s += `<rect class="col" data-i="${i}" x="${cx - cw / 2 + 2}" y="${Y0 - PH}" width="${cw - 4}" height="${PH}" fill="${C.empty}" opacity=".55"/>`;
    if (h > 0) s += `<rect x="${cx - bw / 2}" y="${Y0 - h}" width="${bw}" height="${h}" fill="${on ? C.hi : C.bar}" stroke="${on ? '#b8441c' : C.barEdge}" stroke-width="2.5"/>`;
    if (make) s += `<circle cx="${cx}" cy="${Y0 - h}" r="9" fill="${C.hi}" stroke="#fff" stroke-width="3"/>`;
    if (i === guide) s += `<line x1="${X0}" y1="${Y0 - h}" x2="${cx}" y2="${Y0 - h}" stroke="${C.hi}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
    s += `<text class="em" x="${cx}" y="${Y0 + 22}">${em}</text><text class="xl" x="${cx}" y="${Y0 + 42}">${esc(nm)}</text>`;
  });
  s += `<line x1="${X0}" y1="${Y0 - PH - 6}" x2="${X0}" y2="${Y0}" stroke="${C.axis}" stroke-width="2.5"/><line x1="${X0}" y1="${Y0}" x2="${BW - 6}" y2="${Y0}" stroke="${C.axis}" stroke-width="2.5"/><text class="tk" x="${X0 - 8}" y="${Y0 - PH - 14}">(${t.unit})</text>`;
  return `<div class="cap">${esc(t.title)}</div><svg viewBox="0 0 ${BW} ${Y0 + 52}" role="img"${make ? ' class="mk"' : ''}>${s}</svg>`;
}
function barData(g, n = 5) {
  const t = pick(D.topics), items = topicItems(t, Math.min(n, t.items.length)), step = g.big ? pick([5, 10]) : pick([1, 1, 2, 5]);
  const ticks = distinct(items.length, 1, 10); return { t, items, step, vals: ticks.map(k => k * step), ticks };
}

/* ---------- 꺾은선그래프 ---------- */
const LW0 = 50, LY0 = 222, LPH = 190, LWW = 370;
function lineData(onlyMid) {
  const t = pick(D.lineTopics.filter(x => !onlyMid || x.mid)), base = pick(t.base), tick = pick(t.tick), n = t.xs.length;
  let k;
  for (;;) {
    k = [t.up ? ri(0, 3) : ri(2, 7)];
    for (let i = 1; i < n; i++) k.push(t.up ? k[i - 1] + ri(0, 3) : k[i - 1] + ri(-3, 3));
    if (Math.min(...k) < 0 || Math.max(...k) > 10) continue;
    const d = k.slice(1).map((v, i) => Math.abs(v - k[i])), m = Math.max(...d);
    if (m > 0 && d.filter(x => x === m).length === 1 && d.filter(x => x > 0).length >= 2) break;
  }
  return { t, base, tick, k, vals: k.map(v => base + v * tick) };
}
function lineSVG(L, { hi = [], seg = -1, mid = -1, guide = -1 } = {}) {
  const { t, base, tick, k } = L, n = t.xs.length, U = LPH / 10, cw = (LWW - LW0 - 10) / n, X = i => LW0 + cw * i + cw / 2, Y = v => LY0 - v * U;
  let s = '';
  for (let j = 0; j <= 10; j++) { s += `<line x1="${LW0}" y1="${Y(j)}" x2="${LWW - 6}" y2="${Y(j)}" stroke="${C.grid}" stroke-width="${j % 2 ? 1 : 2}"/>`; if (j % 2 === 0) s += `<text class="tk" x="${LW0 - 8}" y="${Y(j)}">${base + j * tick}</text>`; }
  for (let i = 0; i < n; i++) s += `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(10)}" stroke="${C.grid}" stroke-width="1"/>`;
  if (seg >= 0) s += `<line x1="${X(seg)}" y1="${Y(k[seg])}" x2="${X(seg + 1)}" y2="${Y(k[seg + 1])}" stroke="${C.hi}" stroke-width="10" stroke-linecap="round" opacity=".45"/>`;
  s += `<polyline points="${k.map((v, i) => X(i) + ',' + Y(v)).join(' ')}" fill="none" stroke="${C.line}" stroke-width="3.5" stroke-linejoin="round"/>`;
  k.forEach((v, i) => { s += `<circle cx="${X(i)}" cy="${Y(v)}" r="${hi.includes(i) ? 8 : 5.5}" fill="${hi.includes(i) ? C.hi : '#fff'}" stroke="${C.line}" stroke-width="3"/>`; s += `<text class="xl" x="${X(i)}" y="${LY0 + 22}">${esc(t.xs[i])}</text>`; });
  if (guide >= 0) s += `<line x1="${LW0}" y1="${Y(k[guide])}" x2="${X(guide)}" y2="${Y(k[guide])}" stroke="${C.hi}" stroke-width="2.5" stroke-dasharray="6 5"/>`;
  if (mid >= 0) { const xm = (X(mid) + X(mid + 1)) / 2, vm = (k[mid] + k[mid + 1]) / 2; s += `<line x1="${xm}" y1="${Y(0)}" x2="${xm}" y2="${Y(vm)}" stroke="${C.hi}" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="${xm}" cy="${Y(vm)}" r="7" fill="${C.hi}"/>`; }
  s += `<line x1="${LW0}" y1="${Y(10) - 6}" x2="${LW0}" y2="${LY0}" stroke="${C.axis}" stroke-width="2.5"/><line x1="${LW0}" y1="${LY0}" x2="${LWW - 6}" y2="${LY0}" stroke="${C.axis}" stroke-width="2.5"/><text class="tk" x="${LW0 - 8}" y="${Y(10) - 16}">(${t.unit})</text>`;
  if (base > 0) s += `<path d="M${LW0 - 7} ${LY0 - 8} l7 -5 l0 0 l7 5 M${LW0 - 7} ${LY0 - 14} l7 -5 l7 5" fill="none" stroke="${C.axis}" stroke-width="2"/><rect x="${LW0 - 2}" y="${LY0 - 15}" width="4" height="6" fill="#fff"/>`;   // 물결선: 0부터 시작하지 않아요
  return `<div class="cap">${esc(t.title)}</div><svg viewBox="0 0 ${LWW} ${LY0 + 34}" role="img">${s}</svg>`;
}
const waveNote = L => L.base > 0 ? `물결선(≈)은 ${L.base}보다 작은 부분을 줄였다는 뜻이에요` : null;

/* ---------- 막대 그리기(직접 조작) ---------- */
function barMaker(t, items, target) {
  const vals = items.map(() => 0); let box = null;
  const draw = () => { box.innerHTML = barSVG(t, items, vals, { step: 1, n: 8, every: 1, make: true }); };
  return {
    vals,
    render(sc) {
      sc.innerHTML = `<div class="box mkbox">${tableHTML(t, items, target, { total: false })}<div class="mkchart"></div></div>`; box = sc.querySelector('.mkchart'); draw();
      let drag = -1;
      const at = (e, first) => {
        const svg = box.querySelector('svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const cw = (BW - X0 - 8) / items.length, i = first ? Math.floor((p.x - X0) / cw) : drag; if (i < 0 || i >= items.length) return -1;
        const v = Math.max(0, Math.min(8, Math.round((Y0 - p.y) / (PH / 8)))); if (v !== vals[i]) { vals[i] = v; Arcade.play('tick'); draw(); } return i;
      };
      box.addEventListener('pointerdown', e => { drag = at(e, true); if (drag >= 0) try { box.setPointerCapture(e.pointerId); } catch (_) {} });
      box.addEventListener('pointermove', e => { if (drag >= 0) at(e, false); });
      const up = () => { drag = -1; }; box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    }
  };
}

const GEN = {
  tally() {
    const t = pick(D.topics), items = topicItems(t, ri(3, 4)), kids = sample(D.names, ri(10, 14)), ch = kids.map(() => pick(items));
    items.forEach((it, i) => { if (!ch.includes(it)) ch[i] = it; });   // 모든 항목이 한 번은 나오게
    const tgt = pick(items), n = ch.filter(c => c === tgt).length;
    const cards = hi => `<div class="kids">${kids.map((k, i) => `<div class="kid${hi && ch[i] === tgt ? ' on' : ''}"><span>${ch[i][1]}</span>${esc(k)}</div>`).join('')}</div>`;
    return { ask: `${esc(t.title)} 조사<br><b>${tgt[1]} ${esc(tgt[0])}</b>${eul(tgt[0])} 고른 친구는 몇 명?`, scene: wrap(cards(false)),
             choices: nums(n, [n + 1, n - 1, n + 2], { fmt: v => v + '명' }), answer: n + '명',
             onHint: sc => { sc.innerHTML = wrap(cards(true)); }, onReveal: sc => { sc.innerHTML = wrap(cards(true)); },
             rule: [`${tgt[1]} 카드를 세면 ${n}장 → ${n}명`, '빠뜨리거나 두 번 세지 않게 표시하며 세요'], hint: `${tgt[1]} 그림만 찾아 하나씩 세어 봐요`, sig: 't' + kids.join() + tgt[0] };
  },
  tableMissing() {
    const t = pick(D.topics), items = topicItems(t, 4), vals = items.map(() => ri(2, 9)), h = ri(0, 3), sum = vals.reduce((a, b) => a + b, 0), others = sum - vals[h];
    return { ask: `표에서 <b>${esc(items[h][0])}</b>${eul(items[h][0])} 고른 학생은 몇 명?`, scene: wrap(tableHTML(t, items, vals, { hide: h })),
             choices: nums(vals[h], [sum, others, vals[h] + 1, vals[h] - 1], { fmt: v => v + '명' }), answer: vals[h] + '명',
             rule: ['합계에서 나머지를 모두 빼요', `${sum} − ${others} = ${vals[h]}명`], hint: `합계 ${sum}명에서 나머지 학생 수를 빼 봐요`, sig: 'm' + vals.join() + h };
  },
  tableTotal() {
    const t = pick(D.topics), items = topicItems(t, ri(4, 5)), vals = items.map(() => ri(1, 9)), sum = vals.reduce((a, b) => a + b, 0);
    return { ask: '조사한 학생은 모두 몇 명?', scene: wrap(tableHTML(t, items, vals, { hideTotal: true })),
             choices: nums(sum, [sum + 1, sum - 1, sum + 10, sum - 2], { fmt: v => v + '명' }), answer: sum + '명',
             rule: ['합계 = 모두 더한 수', `${vals.join(' + ')} = ${sum}명`], hint: '표의 수를 모두 더해요. 10 을 먼저 만들면 쉬워요', sig: 'T' + vals.join() };
  },
  picRead(g) {
    const { t, vals, big } = picData(g), i = ri(0, 3), v = vals[i], nb = Math.floor(v / big), ns = (v % big) / (big / 10);
    return { ask: `<b>${esc(t.items[i])}</b>의 ${t.q}${eun(t.q)}?`, scene: wrap(picSVG(t, vals, big)),
             choices: nums(v, [(nb + ns) * (big / 10), ns * big + nb * (big / 10), v + big, v - big / 10], { fmt: x => UN(x, t.unit) }), answer: UN(v, t.unit),
             onHint: sc => { sc.innerHTML = wrap(picSVG(t, vals, big, { hi: [i] })); },
             rule: [picRule(t, v, big)], hint: `큰 그림은 ${UN(big, t.unit)}, 작은 그림은 ${UN(big / 10, t.unit)}이에요`, sig: 'p' + vals.join() + i };
  },
  picMost() {
    const { t, vals, big } = picData({}), most = Math.random() < .6, v = most ? Math.max(...vals) : Math.min(...vals), i = vals.indexOf(v);
    return { ask: `${t.q}${ga(t.q)} 가장 ${most ? '많은' : '적은'} ${t.what}${eun(t.what)}?`, scene: wrap(picSVG(t, vals, big)),
             choices: [...t.items], answer: t.items[i], small: true,
             onReveal: sc => { sc.innerHTML = wrap(picSVG(t, vals, big, { hi: [i] })); },
             rule: [`큰 그림이 ${most ? '가장 많은' : '가장 적은'} 줄을 먼저 보고, 같으면 작은 그림을 비교해요`, `${t.items[i]}: ${UN(v, t.unit)}`], hint: '큰 그림 개수부터 비교해 봐요', sig: 'M' + vals.join() + most };
  },
  picDiff() {
    const { t, vals, big } = picData({}); let a, b; do { a = ri(0, 3); b = ri(0, 3); } while (vals[a] <= vals[b]);
    const d = vals[a] - vals[b];
    return { ask: `<b>${esc(t.items[a])}</b>${eun(t.items[a])} <b>${esc(t.items[b])}</b>보다 몇 ${t.unit} 더 많을까?`, scene: wrap(picSVG(t, vals, big)),
             choices: nums(d, [vals[a] + vals[b], d + 10, d - 1, d + 1], { fmt: x => UN(x, t.unit) }), answer: UN(d, t.unit),
             onHint: sc => { sc.innerHTML = wrap(picSVG(t, vals, big, { hi: [a, b] })); },
             rule: [`${t.items[a]} ${UN(vals[a], t.unit)} − ${t.items[b]} ${UN(vals[b], t.unit)} = ${UN(d, t.unit)}`], hint: '두 줄의 수를 먼저 읽고 빼요', sig: 'D' + vals.join() + a + b };
  },
  barRead(g) {
    const B = barData(g), i = ri(0, B.items.length - 1), v = B.vals[i];
    const opt = { step: B.step };
    return { ask: `<b>${esc(B.items[i][0])}</b>${eul(B.items[i][0])} 고른 학생은 몇 명?`, scene: wrap(barSVG(B.t, B.items, B.vals, opt)),
             choices: nums(v, [B.ticks[i], v + B.step, v - B.step, v + 1], { fmt: x => x + '명' }), answer: v + '명',
             onHint: sc => { sc.innerHTML = wrap(barSVG(B.t, B.items, B.vals, { ...opt, hi: [i], guide: i })); },
             rule: [`눈금 한 칸 = ${B.step}명`, `막대가 ${B.ticks[i]}칸 → ${B.ticks[i]} × ${B.step} = ${v}명`], hint: `먼저 눈금 한 칸이 몇 명인지 알아봐요 (0과 ${5 * B.step} 사이가 5칸)`, sig: 'b' + B.vals.join() + i };
  },
  barDiff(g) {
    const B = barData(g); let a, b; do { a = ri(0, B.items.length - 1); b = ri(0, B.items.length - 1); } while (B.vals[a] <= B.vals[b]);
    const d = B.vals[a] - B.vals[b], dt = B.ticks[a] - B.ticks[b];
    return { ask: `<b>${esc(B.items[a][0])}</b>${eun(B.items[a][0])} <b>${esc(B.items[b][0])}</b>보다 몇 명 더 많을까?`, scene: wrap(barSVG(B.t, B.items, B.vals, { step: B.step })),
             choices: nums(d, [dt, B.vals[a] + B.vals[b], d + B.step, d - B.step], { fmt: x => x + '명' }), answer: d + '명',
             onHint: sc => { sc.innerHTML = wrap(barSVG(B.t, B.items, B.vals, { step: B.step, hi: [a, b] })); },
             rule: [`막대 길이 차이 ${dt}칸 × ${B.step}명 = ${d}명`, `(${B.vals[a]} − ${B.vals[b]} = ${d})`], hint: '두 막대의 길이가 몇 칸 차이 나는지 세어 봐요', sig: 'd' + B.vals.join() + a + b };
  },
  barMost() {
    const B = barData({}), most = Math.random() < .6, v = most ? Math.max(...B.vals) : Math.min(...B.vals), i = B.vals.indexOf(v), names = B.items.map(x => x[0]), others = shuffle(names.filter((_, j) => j !== i)).slice(0, 3);
    return { ask: `가장 ${most ? '많은' : '적은'} 학생이 고른 ${B.t.what}${eun(B.t.what)}?`, scene: wrap(barSVG(B.t, B.items, B.vals, { step: B.step })),
             choices: names.filter((n, j) => j === i || others.includes(n)), answer: names[i], small: true,
             onReveal: sc => { sc.innerHTML = wrap(barSVG(B.t, B.items, B.vals, { step: B.step, hi: [i] })); },
             rule: [`막대가 가장 ${most ? '긴' : '짧은'} 것이 가장 ${most ? '많아요' : '적어요'}`, `${names[i]}: ${v}명`], hint: `막대가 가장 ${most ? '긴' : '짧은'} 것을 찾아요`, sig: 'B' + B.vals.join() + most };
  },
  barTick() {
    const B = barData({ big: Math.random() < .4 }), labels = { step: B.step };
    return { ask: '세로 눈금 한 칸은 몇 명을 나타낼까?', scene: wrap(barSVG(B.t, B.items, B.vals, labels)),
             choices: [1, 2, 5, 10].map(x => x + '명'), answer: B.step + '명', cols: 4,
             rule: [`0 부터 ${5 * B.step} 까지가 5칸`, `${5 * B.step} ÷ 5 = ${B.step}명`], hint: '글자가 적힌 두 눈금 사이가 몇 칸인지 세어 봐요', sig: 'k' + B.vals.join() };
  },
  barMake() {
    const t = pick(D.topics), items = topicItems(t, 4), target = distinct(4, 1, 8), mk = barMaker(t, items, target);
    return { ask: '표를 보고 막대그래프를 완성해요<small>막대를 위아래로 끌거나 눌러서 높이를 맞춰요</small>', render: sc => mk.render(sc), _mk: mk, _target: target, _items: items,
      custom: { mount(el, api) { el.innerHTML = '<button class="btn" id="mkOk">다 그렸어요!</button>'; el.querySelector('#mkOk').onclick = () => {
        const wrong = items.filter((_, i) => mk.vals[i] !== target[i]).map(x => x[0]);
        api.submit(!wrong.length, wrong.length ? `${wrong.join(', ')} 막대를 다시 봐요.` : ''); }; } },
      rule: ['눈금 한 칸 = 1명', items.map((x, i) => `${x[0]} ${target[i]}칸`).join(', ')], hint: '표의 수만큼 0 에서부터 눈금 칸을 세어 올라가요', sig: 'K' + target.join() };
  },
  lineRead() {
    const L = lineData(), i = ri(0, L.k.length - 1), v = L.vals[i], u = L.t.unit;
    return { ask: `<b>${esc(L.t.xs[i])}</b>의 ${L.t.y}${eun(L.t.y)}?`, scene: wrap(lineSVG(L)),
             choices: nums(v, [L.k[i], v + L.tick, v - L.tick, L.vals[(i + 1) % L.k.length]], { fmt: x => UN(x, u), ok: x => x >= 0 }), answer: UN(v, u),
             onHint: sc => { sc.innerHTML = wrap(lineSVG(L, { hi: [i], guide: i })); },
             rule: [`세로 눈금 한 칸 = ${UN(L.tick, u)}`, `${L.t.xs[i]}의 점에서 왼쪽으로 가면 ${UN(v, u)}`, waveNote(L)].filter(Boolean), hint: '점에서 옆으로 선을 그어 세로 눈금을 읽어요. 한 칸이 얼마인지 먼저!', sig: 'l' + L.vals.join() + i };
  },
  lineChange() {
    const L = lineData(); let i; do { i = ri(0, L.k.length - 2); } while (L.k[i] === L.k[i + 1]);
    const a = L.vals[i], b = L.vals[i + 1], d = Math.abs(b - a), u = L.t.unit, up = b > a;
    return { ask: `<b>${esc(L.t.xs[i])}</b>에서 <b>${esc(L.t.xs[i + 1])}</b> 사이에 ${L.t.y}${ga(L.t.y)} 얼마나 ${up ? '늘었을까' : '줄었을까'}?`, scene: wrap(lineSVG(L)),
             choices: nums(d, [Math.abs(L.k[i + 1] - L.k[i]), a, b, d + L.tick], { fmt: x => UN(x, u) }), answer: UN(d, u),
             onHint: sc => { sc.innerHTML = wrap(lineSVG(L, { seg: i, hi: [i, i + 1] })); },
             rule: [`${UN(Math.max(a, b), u)} − ${UN(Math.min(a, b), u)} = ${UN(d, u)}`, `선이 ${up ? '올라가면 늘어난' : '내려가면 줄어든'} 거예요`], hint: '두 점의 값을 각각 읽고 빼요', sig: 'c' + L.vals.join() + i };
  },
  lineSteep() {
    const L = lineData(), d = L.k.slice(1).map((v, i) => Math.abs(v - L.k[i])), i = d.indexOf(Math.max(...d)), segs = L.k.slice(1).map((_, j) => `${L.t.xs[j]}~${L.t.xs[j + 1]}`);
    const others = shuffle(segs.filter((_, j) => j !== i)).slice(0, 3);
    return { ask: `${L.t.y}${ga(L.t.y)} 가장 많이 변한 때는?`, scene: wrap(lineSVG(L)), choices: shuffle([segs[i], ...others]), answer: segs[i], small: true,
             onReveal: sc => { sc.innerHTML = wrap(lineSVG(L, { seg: i })); },
             rule: ['선이 가장 많이 기울어진 곳이 가장 많이 변한 때예요', `${segs[i]}: ${UN(Math.abs(L.vals[i + 1] - L.vals[i]), L.t.unit)} 변했어요`], hint: '선분이 가장 가파른 곳을 찾아요', sig: 's' + L.vals.join() };
  },
  lineMid() {
    let L, i; do { L = lineData(true); i = ri(0, L.k.length - 2); } while ((L.vals[i] + L.vals[i + 1]) % 2 || L.vals[i] === L.vals[i + 1]);
    const m = (L.vals[i] + L.vals[i + 1]) / 2, u = L.t.unit, x = L.t.xs[i], y = L.t.xs[i + 1];
    return { ask: `<b>${esc(x)}</b>와 <b>${esc(y)}</b>의 한가운데 때, ${L.t.y}${eun(L.t.y)} 약 얼마였을까?`, scene: wrap(lineSVG(L)),
             choices: nums(m, [L.vals[i], L.vals[i + 1], m + L.tick, L.vals[i] + L.vals[i + 1]], { fmt: v => UN(v, u), ok: v => v >= 0, key: v => String(v) }), answer: UN(m, u),
             onHint: sc => { sc.innerHTML = wrap(lineSVG(L, { mid: i })); }, onReveal: sc => { sc.innerHTML = wrap(lineSVG(L, { mid: i })); },
             rule: ['꺾은선그래프는 조사하지 않은 중간 값도 어림할 수 있어요', `${UN(L.vals[i], u)}와 ${UN(L.vals[i + 1], u)}의 가운데 → ${UN(m, u)}`], hint: '두 점을 잇는 선의 한가운데 높이를 읽어요', sig: 'h' + L.vals.join() + i };
  },
  whichGraph() {
    const w = pick(D.whichGraph), why = { 막대그래프: '여러 가지의 많고 적음을 비교할 때는 막대그래프', 꺾은선그래프: '시간에 따라 변하는 모습은 꺾은선그래프', 그림그래프: '수량을 그림으로 한눈에 보여 줄 때는 그림그래프' };
    return { ask: `<b>${esc(w.q)}</b>에 가장 알맞은 그래프는?`, scene: wrap('<div class="three"><div><b>📊</b>막대그래프</div><div><b>📈</b>꺾은선그래프</div><div><b>🍎</b>그림그래프</div></div>'),
             choices: ['막대그래프', '꺾은선그래프', '그림그래프'], answer: w.a, small: true, cols: 1,
             rule: [why[w.a]], hint: '시간에 따라 변하는지, 여러 가지를 비교하는지 생각해 봐요', sig: 'w' + w.q };
  }
};
Learn.run({ data: D, key: 'graph', gen: GEN });
});
