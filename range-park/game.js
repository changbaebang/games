/* 어림 놀이공원 — 5학년 2학기 수의 범위와 어림하기
 * 놀이기구·이야기·단계는 data.json. 저장 키: rangeStars, rangeStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, sample, nums } = Learn.U;
const wrap = s => `<div class="box">${s}</div>`;
const TEST = { 이상: (x, a) => x >= a, 이하: (x, a) => x <= a, 초과: (x, a) => x > a, 미만: (x, a) => x < a };
const INCL = { 이상: true, 이하: true, 초과: false, 미만: false };
const PLACE = { 10: '십', 100: '백', 1000: '천', 10000: '만' };
const MODE = { up: '올림', down: '버림', half: '반올림' };
const jong = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const roundTo = (n, u, m) => m === 'up' ? Math.ceil(n / u) * u : m === 'down' ? Math.floor(n / u) * u : Math.round(n / u) * u;

/* ---------- 수직선 ---------- */
function lineSVG(lo, hi, a, b) {   // a,b: {v, incl, dir?}  — 범위 [a..b] 또는 한쪽 화살표
  const W = 360, x = v => 30 + (v - lo) / (hi - lo) * (W - 60), y = 60;
  let s = `<line x1="14" y1="${y}" x2="${W - 14}" y2="${y}" stroke="#2b2f45" stroke-width="3"/>`;
  for (let v = lo; v <= hi; v++) s += `<line x1="${x(v)}" y1="${y - 7}" x2="${x(v)}" y2="${y + 7}" stroke="#2b2f45" stroke-width="2"/><text class="tk" x="${x(v)}" y="${y + 26}">${v}</text>`;
  const x1 = a ? x(a.v) : 14, x2 = b ? x(b.v) : W - 14;
  s += `<line x1="${x1}" y1="${y - 22}" x2="${x2}" y2="${y - 22}" stroke="#e8642a" stroke-width="6" stroke-linecap="round"/>`;
  if (!a) s += `<path d="M${x1 + 10} ${y - 32} L${x1} ${y - 22} L${x1 + 10} ${y - 12}" fill="none" stroke="#e8642a" stroke-width="5"/>`;
  if (!b) s += `<path d="M${x2 - 10} ${y - 32} L${x2} ${y - 22} L${x2 - 10} ${y - 12}" fill="none" stroke="#e8642a" stroke-width="5"/>`;
  for (const p of [a, b]) if (p) s += `<line x1="${x(p.v)}" y1="${y - 22}" x2="${x(p.v)}" y2="${y}" stroke="#e8642a" stroke-width="2" stroke-dasharray="3 3"/><circle cx="${x(p.v)}" cy="${y - 22}" r="8" fill="${p.incl ? '#e8642a' : '#fff'}" stroke="#e8642a" stroke-width="3"/>`;
  return `<svg viewBox="0 0 ${W} 100" class="nl" role="img">${s}</svg>`;
}

const GEN = {
  ride(g) {
    const [nm, e] = pick(D.rides), t = pick(g.types), a = ri(11, 15) * 10, kids = sample(D.kids, 4);
    const ok = TEST[t], low = t === '이상' || t === '초과';
    // 기준과 같은 키를 꼭 한 명 넣어 포함/불포함을 확인해요
    let hs; do { hs = shuffle([a, a + ri(1, 9) * (low ? 1 : -1), a + ri(1, 9) * (low ? -1 : 1), a + ri(10, 20) * (low ? -1 : 1)]); } while (hs.filter(h => ok(h, a)).length !== (INCL[t] ? 2 : 1));
    const pass = kids.filter((_, i) => ok(hs[i], a)), ans = pass.join(', ');
    const opts = [ans, kids.filter((_, i) => !ok(hs[i], a)).join(', '), kids.filter((_, i) => low ? hs[i] > a : hs[i] < a).join(', ') || kids[0], kids.filter((_, i) => low ? hs[i] >= a - 5 : hs[i] <= a + 5).join(', ')];
    return { ask: `${e} <b>${nm}</b>${jong(nm) ? '은' : '는'} 키가 <b>${a} cm ${t}</b>${jong(t) ? '이어야' : '여야'} 탈 수 있어요. 탈 수 있는 친구를 모두 고르면?`, scene: wrap(`<div class="kids">${kids.map((k, i) => `<div><span>${k}</span><b>${hs[i]} cm</b></div>`).join('')}</div>`),
             choices: shuffle([...new Set(opts)]), answer: ans, cols: 1, small: true,
             rule: [`${a} ${t}: ${a}${INCL[t] ? '을(를) 포함해요' : '은(는) 포함하지 않아요'}`, `→ ${pass.map(k => `${k}(${hs[kids.indexOf(k)]})`).join(', ')}`], hint: `${a} cm 인 친구가 탈 수 있는지부터 생각해요`, sig: 'r' + t + a + hs.join() };
  },
  pickIn(g) {
    const t = pick(g.types), a = ri(20, 80), ok = TEST[t];
    let opts; do { opts = shuffle([a, a + ri(1, 6), a - ri(1, 6), a + ri(7, 15) * (Math.random() < .5 ? 1 : -1)]); } while (new Set(opts).size < 4 || opts.filter(x => ok(x, a)).length < 1);
    const want = opts.filter(x => ok(x, a)).length === 1 ? 'in' : 'out', ans = want === 'in' ? opts.find(x => ok(x, a)) : opts.find(x => !ok(x, a));
    if (opts.filter(x => want === 'in' ? ok(x, a) : !ok(x, a)).length !== 1) return GEN.pickIn(g);
    return { ask: want === 'in' ? `<b>${a} ${t}</b>인 수는?` : `<b>${a} ${t}</b>인 수가 <b>아닌</b> 것은?`, scene: wrap(`<div class="big">${a} ${t}</div>`), choices: opts.map(String), answer: String(ans), cols: 4,
             rule: [`${t}: ${a}${INCL[t] ? '을 포함하고' : '을 포함하지 않고'} ${t === '이상' || t === '초과' ? '더 큰 수' : '더 작은 수'}`, `→ ${ans}`], hint: `${a} 와 같은 수를 조심해요`, sig: 'p' + t + a + opts.join() };
  },
  lineRead() {
    const lo = ri(10, 40), hi = lo + 10, kind = ri(0, 2);
    let a = null, b = null, ans;
    const ta = pick(['이상', '초과']), tb = pick(['이하', '미만']);
    if (kind === 0) { a = { v: lo + ri(2, 4), incl: ta === '이상' }; b = { v: lo + ri(6, 8), incl: tb === '이하' }; ans = `${a.v} ${ta} ${b.v} ${tb}`; }
    else if (kind === 1) { a = { v: lo + ri(3, 7), incl: ta === '이상' }; ans = `${a.v} ${ta}`; }
    else { b = { v: lo + ri(3, 7), incl: tb === '이하' }; ans = `${b.v} ${tb}`; }
    const flip = s => s.replace(/이상|초과|이하|미만/g, m => ({ 이상: '초과', 초과: '이상', 이하: '미만', 미만: '이하' })[m]);
    const swapDir = s => s.replace(/이상|초과|이하|미만/g, m => ({ 이상: '이하', 초과: '미만', 이하: '이상', 미만: '초과' })[m]);
    const opts = [...new Set([ans, flip(ans), swapDir(ans), kind === 0 ? ans.replace(/(\d+) (이상|초과) (\d+) (이하|미만)/, (m, x, p, y, q) => `${x} ${flip(p)} ${y} ${q}`) : flip(swapDir(ans))])];
    return { ask: '수직선에 나타낸 수의 범위는?', scene: wrap(lineSVG(lo, hi, a, b)), choices: shuffle(opts), answer: ans, cols: 1, small: true,
             rule: ['● 는 그 수를 포함(이상·이하), ○ 는 포함하지 않음(초과·미만)', `→ ${ans}`], hint: '동그라미가 칠해져 있는지 비어 있는지 보세요', sig: 'l' + ans };
  },
  count() {
    const a = ri(10, 50), b = a + ri(4, 12), ta = pick(['이상', '초과']), tb = pick(['이하', '미만']);
    const n = (b - a + 1) - (ta === '초과' ? 1 : 0) - (tb === '미만' ? 1 : 0);
    return { ask: `<b>${a} ${ta} ${b} ${tb}</b>인 자연수는 모두 몇 개일까요?`, scene: wrap(lineSVG(a - 2, a - 2 + 10 > b + 2 ? a + 8 : b + 2 > a + 18 ? a + 18 : b + 2, { v: a, incl: ta === '이상' }, { v: Math.min(b, a + 18), incl: tb === '이하' })),
             choices: nums(n, [n + 1, n - 1, b - a, b - a + 1].filter(v => v !== n), { ok: v => v > 0, fmt: v => v + '개' }), answer: n + '개',
             rule: [`${ta === '이상' ? a : a + 1} 부터 ${tb === '이하' ? b : b - 1} 까지`, `${(tb === '이하' ? b : b - 1)} − ${(ta === '이상' ? a : a + 1)} + 1 = ${n}개`], hint: '양 끝 수가 들어가는지 먼저 정해요', sig: 'c' + a + b + ta + tb };
  },
  round(g) {
    const u = pick([10, 100, 1000]), n = ri(u + 1, u * 99) + (u === 10 ? ri(100, 900) : 0);
    if (n % u === 0) return GEN.round(g);
    const m = g.mode, ans = roundTo(n, u, m), others = ['up', 'down', 'half'].map(k => roundTo(n, u, k)).concat([roundTo(n, u * 10, m), u >= 100 ? roundTo(n, u / 10, m) : ans + u]).filter(v => v !== ans);
    return { ask: `<b>${n}</b>를 <b>${MODE[m]}</b>하여 <b>${PLACE[u]}의 자리까지</b> 나타내면?`, scene: wrap(`<div class="big">${String(n).split('').map((c, i, a) => a.length - 1 - i < String(u).length - 1 ? `<span class="lowd">${c}</span>` : c).join('')}</div>`),
             choices: nums(ans, others, { ok: v => v > 0 }), answer: String(ans),
             rule: [m === 'up' ? `${PLACE[u]}의 자리 아래 수가 있으면 ${PLACE[u]}의 자리 숫자를 1 올려요` : m === 'down' ? `${PLACE[u]}의 자리 아래 수를 모두 0 으로 버려요` : `${PLACE[u]}의 자리 바로 아래 숫자가 ${Math.floor(n % u / (u / 10)) }${Math.floor(n % u / (u / 10)) >= 5 ? ' → 5 이상이라 올려요' : ' → 4 이하라 버려요'}`, `→ ${ans}`], hint: `${PLACE[u]}의 자리 아래(색이 다른 숫자)를 보세요`, sig: 'o' + m + n + u };
  },
  roundsTo() {
    const u = pick([10, 100]), t = ri(2, 9) * u * (u === 10 ? 10 : 1) + (u === 10 ? ri(1, 9) * 10 : 0), ok = [t - u / 2, t + u / 2 - 1], inside = ri(ok[0], ok[1]);
    const outs = shuffle([t - u / 2 - 1, t + u / 2, t - u + 1, t + u - 1].filter(v => v < ok[0] || v > ok[1])).slice(0, 3);
    return { ask: `반올림하여 ${PLACE[u]}의 자리까지 나타내면 <b>${t}</b>가 되는 수는?`, scene: wrap(`<div class="big">→ ${t}</div>`), choices: shuffle([inside, ...outs]).map(String), answer: String(inside), cols: 4,
             rule: [`반올림해서 ${t}이 되는 수: ${ok[0]} 이상 ${ok[1]} 이하 (${ok[0]} 이상 ${ok[1] + 1} 미만)`], hint: `${t} 보다 조금 작은 수와 조금 큰 수를 모두 생각해요`, sig: 't' + t + inside };
  },
  story() {
    const s = pick(D.roundStories);
    let n, u, ans, rule;
    if (s.mode === 'down1000') { n = ri(1200, 9800); if (n % 1000 === 0) n += 230; ans = Math.floor(n / 1000) * 1000; rule = ['1000원이 안 되는 돈은 바꿀 수 없어요 → 버림', `${n} → ${ans}원`]; }
    else { u = ri(4, 12); n = ri(30, 200); if (n % u === 0) n++; ans = s.mode === 'up' ? Math.ceil(n / u) : Math.floor(n / u); rule = [s.mode === 'up' ? '남는 것도 담아야(태워야) 하니 하나 더 → 올림' : '모자라는 것은 만들 수 없어요 → 버림', `${n} ÷ ${u} = ${Math.floor(n / u)} … ${n % u} → ${ans}${s.unitWord}`]; }
    const alt = s.mode === 'up' ? ans - 1 : s.mode === 'down' ? ans + 1 : ans + 1000;
    return { ask: s.t.replace('{n}', n).replace('{u}', u), scene: wrap(`<div class="emo">${s.mode === 'up' ? '📦' : '🎀'}</div>`), choices: nums(ans, [alt, s.mode === 'down1000' ? Math.round(n / 1000) * 1000 + (Math.round(n / 1000) * 1000 === ans ? 1000 : 0) : ans + 2, s.mode === 'down1000' ? n : ans * 2].filter(v => v !== ans), { ok: v => v > 0, fmt: v => v + s.unitWord }), answer: ans + s.unitWord, small: true,
             rule, hint: '남는 것을 어떻게 해야 할지 생각해 봐요 — 올림? 버림?', sig: 's' + s.mode + n + u };
  }
};

Learn.run({ data: D, key: 'range', gen: GEN });
});
