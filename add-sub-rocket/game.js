/* 셈셈 로켓 — 세 자리 수의 덧셈·뺄셈
 * 공통 진행은 ../common/learn.js, 세로셈 칸은 ../common/vcalc.js, 이야기 문제·단계는 data.json
 * 저장 키: addsubStars, addsubStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U, C = D.colors;
const PL = ['일', '십', '백', '천'];
const dg = n => String(n).split('').reverse().map(Number);       // 일의 자리부터
const carries = (a, b) => { let c = 0, n = 0; const x = dg(a), y = dg(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const s = (x[i] || 0) + (y[i] || 0) + c; c = s >= 10 ? 1 : 0; n += c; } return n; };
const borrows = (a, b) => { let c = 0, n = 0; const x = dg(a), y = dg(b); for (let i = 0; i < x.length; i++) { const s = x[i] - (y[i] || 0) - c; c = s < 0 ? 1 : 0; n += c; } return n; };
// 흔한 실수: 받아올림을 잊고 자리마다 더하기 / 뺄셈에서 자리마다 큰 수에서 작은 수 빼기
const noCarry = (a, b) => +dg(a).map((d, i) => (d + (dg(b)[i] || 0)) % 10).reverse().join('');
const flipSub = (a, b) => +dg(a).map((d, i) => Math.abs(d - (dg(b)[i] || 0))).reverse().join('');
const forgetBorrow = (a, b) => { const x = dg(a), y = dg(b); let c = 0; return +x.map((d, i) => { let s = d - (y[i] || 0) - c; c = 0; if (s < 0) { s += 10; } return s; }).reverse().join(''); };
const wrap = s => `<div class="box">${s}</div>`;
const fmt = n => n.toLocaleString('ko-KR');

// 세로셈 풀이 설명: 자리마다 한 줄
function steps(a, b, op) {
  const x = dg(a), y = dg(b), out = []; let c = 0;
  for (let i = 0; i < x.length; i++) {
    const p = PL[i] + '의 자리', yi = y[i] || 0;
    if (op === '+') { const s = x[i] + yi + c; out.push(`${p}: ${x[i]} + ${yi}${c ? ' + 1(올림)' : ''} = ${s}${s >= 10 ? ` → ${s - 10} 쓰고 1 올림` : ''}`); c = s >= 10 ? 1 : 0; }
    else { let t = x[i] - c, s = t - yi; out.push(`${p}: ${c ? `${x[i]}−1(빌려줌)=${t}, ` : ''}${s < 0 ? `${t}+10−${yi} = ${s + 10} (윗자리에서 10 빌림)` : `${t} − ${yi} = ${s}`}`); c = s < 0 ? 1 : 0; }
  }
  if (op === '+' && c) out.push('천의 자리: 올린 1');
  return out;
}

/* ---------- 백·십·일 모형 ---------- */
function blocksSVG(n) {
  const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10, U = 6;
  let s = '', x = 6;
  for (let i = 0; i < h; i++, x += U * 10 + 10) { s += `<rect x="${x}" y="6" width="${U * 10}" height="${U * 10}" fill="${C.hundred}" stroke="${C.edge}" stroke-width="1.5"/>`; for (let k = 1; k < 10; k++) s += `<path d="M${x + k * U} 6v${U * 10}M${x} ${6 + k * U}h${U * 10}" stroke="#fff" stroke-opacity=".45" stroke-width="1"/>`; }
  if (h) x += 4;
  for (let i = 0; i < t; i++, x += U + 4) { s += `<rect x="${x}" y="6" width="${U}" height="${U * 10}" fill="${C.ten}" stroke="${C.edge}" stroke-width="1.5"/>`; for (let k = 1; k < 10; k++) s += `<path d="M${x} ${6 + k * U}h${U}" stroke="#fff" stroke-opacity=".5"/>`; }
  if (t) x += 6;
  for (let i = 0; i < o; i++) { const cx = x + (i % 3) * (U + 3), cy = 6 + U * 10 - (Math.floor(i / 3) + 1) * (U + 3); s += `<rect x="${cx}" y="${cy}" width="${U}" height="${U}" fill="${C.one}" stroke="${C.edge}" stroke-width="1.2"/>`; }
  x += o ? 3 * (U + 3) + 6 : 6;
  return `<svg viewBox="0 0 ${Math.max(x, 120)} ${U * 10 + 12}" class="blk" role="img" aria-label="수 모형">${s}</svg><div class="legend"><span style="--c:${C.hundred}">백 모형 100</span><span style="--c:${C.ten}">십 모형 10</span><span style="--c:${C.one}">일 모형 1</span></div>`;
}

/* ---------- 세로셈 문제 ---------- */
function vertical(a, b, op, title) {
  const v = VCalc.make({ a, b, op }), r = op === '+' ? a + b : a - b;
  return { ask: title || `${op === '+' ? '덧셈' : '뺄셈'}을 세로셈으로 해요<small>${fmt(a)} ${op === '+' ? '+' : '−'} ${fmt(b)}</small>`, render: sc => v.render(sc), _v: v,
           custom: { mount: (el, api) => v.mount(el, api) }, answerText: String(r),
           rule: [...steps(a, b, op), `답: ${r}`], hint: op === '+' ? '일의 자리부터! 더해서 10이 넘으면 위 칸을 눌러 1을 적어 두세요' : '일의 자리부터! 빼는 수가 더 크면 윗자리 숫자를 눌러 10을 빌려 와요',
           sig: op + a + '_' + b };
}
function pair3(test) { for (;;) { const a = ri(100, 999), b = ri(100, 999); if (test(a, b)) return [a, b]; } }

const GEN = {
  blocks() {
    const n = ri(1, 9) * 100 + ri(0, 9) * 10 + ri(1, 9), h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10;
    return { ask: '수 모형이 나타내는 수는?', scene: wrap(blocksSVG(n)),
             choices: nums(n, [h * 100 + o * 10 + t, t * 100 + h * 10 + o, n + 10, n - 1, n + 100], { ok: v => v > 0 && v < 1000 }), answer: String(n),
             rule: [`백 모형 ${h}개 = ${h * 100}`, `십 모형 ${t}개 = ${t * 10}`, `일 모형 ${o}개 = ${o}`, `${h * 100} + ${t * 10} + ${o} = ${n}`], hint: '큰 모형부터 세어 봐요', sig: 'b' + n };
  },
  digitValue() {
    let n; do { n = ri(102, 987); } while (new Set(String(n)).size < 3);
    const p = ri(0, 2), d = dg(n)[p];
    if (d === 0) return GEN.digitValue();
    const s = String(n).split('').map((c, i) => i === 2 - p ? `<u>${c}</u>` : c).join(''), v = d * 10 ** p;
    return { ask: `<b>${n}</b>에서 밑줄 친 숫자가 나타내는 값은?`, scene: wrap(`<div class="bignum">${s}</div>`),
             choices: nums(v, [d, d * 10, d * 100].filter(x => x !== v).concat([d * 1000]), { ok: x => x > 0 }), answer: String(v),
             rule: [`${d}는 ${PL[p]}의 자리 숫자`, `${d} × ${10 ** p} = ${v}`], hint: '오른쪽부터 일·십·백의 자리예요', sig: 'd' + n + p };
  },
  split() {
    const n = ri(1, 9) * 100 + ri(0, 9) * 10 + ri(0, 9), h = Math.floor(n / 100) * 100, t = Math.floor(n / 10) % 10 * 10, o = n % 10, hide = ri(0, 2), parts = [h, t, o];
    const shown = parts.map((x, i) => i === hide ? '<span class="q">□</span>' : x).join(' + ');
    return { ask: '□ 안에 알맞은 수는?', scene: wrap(`<div class="eq">${n} = ${shown}</div>`),
             choices: nums(parts[hide], [parts[hide] / 10 || 5, parts[hide] * 10 || 50, parts[hide] + 10, parts[hide] + 1].map(Math.round), { ok: x => x >= 0 }), answer: String(parts[hide]),
             rule: [`${n} = ${h} + ${t} + ${o}`], hint: '백의 자리, 십의 자리, 일의 자리로 나누어요', sig: 's' + n + hide };
  },
  addPlain() { const [a, b] = pair3((a, b) => carries(a, b) === 0 && a + b < 1000); return vertical(a, b, '+'); },
  subPlain() { const [a, b] = pair3((a, b) => a > b && borrows(a, b) === 0); return vertical(a, b, '-'); },
  addCarry(g) { const [a, b] = pair3((a, b) => carries(a, b) === g.carry && (a + b < 1000 || g.carry === 2 && Math.random() < .3)); return vertical(a, b, '+'); },
  subBorrow(g) {
    const [a, b] = g.zero ? pair3((a, b) => a > b && Math.floor(a / 10) % 10 === 0 && a % 10 < b % 10) : pair3((a, b) => a > b && borrows(a, b) === g.borrow);
    const q = vertical(a, b, '-'); if (g.zero) q.hint = '십의 자리가 0 이면 백의 자리에서 먼저 빌려 와요 (100 = 90 + 10)'; return q;
  },
  estimate() {
    const op = pick(['+', '-']), [a, b] = op === '+' ? pair3((a, b) => a + b < 1000 && Math.abs(a % 100 - 50) > 20 && Math.abs(b % 100 - 50) > 20) : pair3((a, b) => a - b > 150 && Math.abs(a % 100 - 50) > 20 && Math.abs(b % 100 - 50) > 20);
    const r100 = x => Math.round(x / 100) * 100, est = op === '+' ? r100(a) + r100(b) : r100(a) - r100(b);
    return { ask: `<b>${a} ${op === '+' ? '+' : '−'} ${b}</b> 를 어림하면 약 얼마?`, scene: wrap(`<div class="eq">${a} ${op === '+' ? '+' : '−'} ${b} ≈ <span class="q">?</span></div>`),
             choices: nums(est, [est + 100, est - 100, est + 200], { ok: x => x > 0, fmt: x => '약 ' + x }), answer: '약 ' + est,
             rule: [`${a} → 약 ${r100(a)}, ${b} → 약 ${r100(b)}`, `${r100(a)} ${op === '+' ? '+' : '−'} ${r100(b)} = ${est}`, `(정확한 값은 ${op === '+' ? a + b : a - b})`], hint: '각각 가장 가까운 몇백으로 바꾸어 계산해요', sig: 'e' + a + op + b };
  },
  story() {
    const s = pick(D.stories), [a, b] = s.op === '+' ? pair3((a, b) => a + b < 1000 && carries(a, b) >= 1) : pair3((a, b) => a > b + 50 && borrows(a, b) >= 1);
    const r = s.op === '+' ? a + b : a - b, wrong = s.op === '+' ? [noCarry(a, b), a - b, r + 10] : [flipSub(a, b), forgetBorrow(a, b), a + b, r - 10];
    return { ask: s.t.replace('{a}', a).replace('{b}', b), scene: wrap(`<div class="story">${s.e}</div>`),
             choices: nums(r, wrong, { ok: x => x > 0, fmt: x => x + s.unit }), answer: r + s.unit,
             rule: [`${s.op === '+' ? '모두 몇' : '남은 수·차이'} → ${s.op === '+' ? '덧셈' : '뺄셈'}`, `${a} ${s.op === '+' ? '+' : '−'} ${b} = ${r}`], hint: s.op === '+' ? '“모두”는 더하기!' : '“남은”, “더 많은”은 빼기!', sig: 'y' + s.t.slice(0, 6) + a };
  },
  missingDigit() {
    const op = pick(['+', '-']), [a, b] = op === '+' ? pair3((a, b) => a + b < 1000 && carries(a, b) >= 1) : pair3((a, b) => a > b && borrows(a, b) >= 1);
    const r = op === '+' ? a + b : a - b, which = pick(['a', 'b']), p = ri(0, 2), src = which === 'a' ? a : b, d = dg(src)[p];
    const hole = n => String(n).split('').map((c, i) => i === 2 - p ? '<span class="q">□</span>' : c).join('');
    return { ask: '□ 안에 알맞은 숫자는?', scene: wrap(`<div class="eq big">${which === 'a' ? hole(a) : a} ${op === '+' ? '+' : '−'} ${which === 'b' ? hole(b) : b} = ${r}</div>`),
             choices: nums(d, [(d + 1) % 10, (d + 9) % 10, (d + 2) % 10, (d + 8) % 10], { ok: x => x >= 0 && x <= 9 }), answer: String(d), cols: 4,
             rule: [`${a} ${op === '+' ? '+' : '−'} ${b} = ${r}`, `□ = ${d}`, op === '+' ? '받아올림이 있었는지 꼭 확인해요' : '받아내림이 있었는지 꼭 확인해요'], hint: '□ 가 있는 자리를 계산해 보고, 올림·내림을 따져요', sig: 'm' + a + op + b + which + p };
  },
  compare() {
    const e = () => { const op = pick(['+', '-']), [a, b] = op === '+' ? pair3((a, b) => a + b < 1000) : pair3((a, b) => a > b); return { s: `${a} ${op === '+' ? '+' : '−'} ${b}`, v: op === '+' ? a + b : a - b }; };
    let x, y; do { x = e(); y = e(); } while (x.v === y.v || Math.abs(x.v - y.v) > 120);
    const ans = x.v > y.v ? x.s : y.s;
    return { ask: '계산 결과가 더 큰 식은?', scene: wrap('<div class="story">⚖️</div>'), choices: [x.s, y.s], answer: ans, cols: 1, once: true,
             rule: [`${x.s} = ${x.v}`, `${y.s} = ${y.v}`], hint: '두 식을 각각 계산해서 비교해요', sig: 'c' + x.s + y.s };
  }
};
Learn.run({ data: D, key: 'addsub', gen: GEN });
});
