/* 큰 수 은행 — 만, 억, 조 (4학년 1학기)
 * 공통 진행은 ../common/learn.js, 단계는 data.json
 * 저장 키: bignumStars, bignumStarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle, nums } = Learn.U;
const wrap = s => `<div class="box">${s}</div>`;
const eul = w => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '을' : '를'; };
const KD = '영일이삼사오육칠팔구', UNIT = ['', '만', '억', '조'], SUB = ['', '십', '백', '천'];
const groups = n => { const g = []; let x = n; do { g.push(x % 10000); x = Math.floor(x / 10000); } while (x > 0); return g; };   // 네 자리씩, 낮은 자리부터
// 한글로 읽기: 32507 → 삼만 이천오백칠
function readKo(n) {
  if (n === 0) return '영';
  const g4 = v => String(v).padStart(4, '0').split('').map((c, i) => { const d = +c, u = SUB[3 - i]; return d === 0 ? '' : (d === 1 && u ? '' : KD[d]) + u; }).join('');
  return groups(n).map((v, i) => v === 0 ? '' : (i === 1 && v === 1 ? '' : g4(v)) + UNIT[i]).reverse().filter(Boolean).join(' ');
}
// 숫자와 단위 섞어 쓰기: 325000070 → 3억 2500만 70
const mix = n => n === 0 ? '0' : groups(n).map((v, i) => v ? v + UNIT[i] : '').reverse().filter(Boolean).join(' ');
const PLACE = ['일', '십', '백', '천', '만', '십만', '백만', '천만', '억', '십억', '백억', '천억', '조'];
function randNum(d, zeroP = .3) { let s = String(ri(1, 9)); for (let i = 1; i < d; i++) s += Math.random() < zeroP ? '0' : ri(1, 9); return +s; }
const swapDigits = n => { const s = String(n).split(''); for (let k = 0; k < 20; k++) { const i = ri(1, s.length - 1), j = i - 1; if (s[i] !== s[j]) { [s[i], s[j]] = [s[j], s[i]]; return +s.join(''); } } return n + 1; };
const space4 = n => String(n).replace(/\B(?=(\d{4})+(?!\d))/g, '<i></i>');   // 네 자리마다 살짝 띄우기(눈으로 끊어 읽기)

/* ---------- 돈 그림 ---------- */
function moneySVG(m, c, h) {
  let s = '', x = 6, y = 6;
  const bill = (col, txt) => { const r = `<g transform="translate(${x} ${y})"><rect width="92" height="46" rx="5" fill="${col}" stroke="#2b2f45" stroke-width="1.5"/><circle cx="68" cy="23" r="13" fill="#fff" fill-opacity=".5"/><text class="bill" x="30" y="25">${txt}</text></g>`; x += 100; if (x > 330) { x = 6; y += 54; } return r; };
  for (let i = 0; i < m; i++) s += bill('#9fd49a', '10000');
  for (let i = 0; i < c; i++) s += bill('#9cc3f0', '1000');
  if (x !== 6) { x = 6; y += 54; }
  for (let i = 0; i < h; i++) { s += `<g transform="translate(${x + 20} ${y + 20})"><circle r="19" fill="#d8d8d8" stroke="#2b2f45" stroke-width="1.5"/><text class="coin" y="1">100</text></g>`; x += 44; if (x > 360) { x = 6; y += 44; } }
  return `<svg viewBox="0 0 410 ${y + 50}" class="money" role="img" aria-label="돈">${s}</svg>`;
}

function readQ(d) {
  const n = randNum(d), r = readKo(n);
  const alts = [n * 10, Math.floor(n / 10) || n + 7, swapDigits(n), n + 10 ** ri(0, d - 2) * ri(1, 3)].filter(v => v !== n && String(v).length >= d - 1);
  const opts = [...new Set([r, ...alts.map(readKo)])].filter(x => x !== r).slice(0, 3);
  return { ask: '이 수를 바르게 읽은 것은?', scene: wrap(`<div class="num">${space4(n)}</div>`), choices: shuffle([r, ...opts]), answer: r, small: true, cols: 1,
           rule: [`${mix(n)}`, `→ ${r}`, '오른쪽부터 네 자리씩 끊어 만·억·조를 붙여요'], hint: '오른쪽부터 네 자리씩 끊어 봐요 (만, 억, 조)', sig: 'r' + n };
}

const GEN = {
  makeMan() {
    const kind = ri(0, 3);
    const Q = [
      ['9000보다 □ 큰 수가 10000 이에요', 1000, [100, 10, 10000]],
      ['9900보다 □ 큰 수가 10000 이에요', 100, [1000, 10, 900]],
      ['9990보다 □ 큰 수가 10000 이에요', 10, [100, 1, 1000]],
      ['9999보다 □ 큰 수가 10000 이에요', 1, [10, 100, 9]]
    ][kind];
    return { ask: '□ 안에 알맞은 수는?', scene: wrap(`<div class="eq">${Q[0].replace('□', '<span class="q">□</span>')}</div>`), choices: nums(Q[1], Q[2]), answer: String(Q[1]), cols: 4,
             rule: ['10000 은 9000 보다 1000, 9900 보다 100, 9990 보다 10, 9999 보다 1 큰 수', '10000 = 만(일만)'], hint: '10000 에서 빼 봐요', sig: 'm' + kind };
  },
  money() {
    const m = ri(1, 4), c = ri(0, 6), h = ri(0, 8), t = m * 10000 + c * 1000 + h * 100;
    return { ask: '모두 얼마일까요?', scene: wrap(moneySVG(m, c, h)), choices: nums(t, [m * 1000 + c * 100 + h * 10, t + 1000, t - 100, m * 10000 + c * 100 + h * 1000].filter(v => v > 0), { fmt: v => v.toLocaleString('ko-KR') + '원' }), answer: t.toLocaleString('ko-KR') + '원',
             rule: [`만 원 ${m}장 = ${m * 10000}원`, `천 원 ${c}장 = ${c * 1000}원`, `백 원 ${h}개 = ${h * 100}원`, `모두 ${t}원 (${readKo(t)} 원)`], hint: '만 원짜리부터 차례로 세어요', sig: 'y' + t };
  },
  readNum(g) { return readQ(g.digits); },
  writeNum(g) {
    const n = randNum(g.digits), r = readKo(n), wrong = [n * 10, Math.floor(n / 10), swapDigits(n), n + 10 ** ri(1, g.digits - 2)].filter(v => v !== n && v > 0);
    return { ask: `<b>${r}</b>${eul(r)} 숫자로 쓰면?`, scene: wrap('<div class="emoji">🏦</div>'), choices: nums(n, wrong, { fmt: v => String(v) }), answer: String(n), small: true, cols: 1,
             rule: [`${r} → ${mix(n)}`, `→ ${n}`, '빈 자리에는 0 을 꼭 써요'], hint: '만·억·조 앞의 수를 네 자리씩 써요. 비는 자리는 0!', sig: 'w' + n };
  },
  placeDigit() {
    let n; do { n = randNum(8, .1); } while (new Set(String(n)).size < 6);
    const p = ri(4, 7), d = Math.floor(n / 10 ** p) % 10, others = [...new Set(String(n).split('').map(Number))].filter(x => x !== d);
    return { ask: `<b>${PLACE[p]}의 자리</b> 숫자는?`, scene: wrap(`<div class="num">${n}</div><div class="mini">${mix(n)}</div>`), choices: nums(d, shuffle(others), { ok: v => v >= 0 && v <= 9 }), answer: String(d), cols: 4,
             rule: [`${n}: 오른쪽부터 일, 십, 백, 천, 만, 십만, 백만, 천만`, `${PLACE[p]}의 자리 숫자는 ${d}`], hint: '오른쪽 끝이 일의 자리예요. 다섯 번째가 만!', sig: 'd' + n + p };
  },
  placeValue() {
    let n; do { n = randNum(8, .15); } while (new Set(String(n)).size < 7);
    const s = String(n), p = ri(3, 7), d = +s[s.length - 1 - p];
    if (d === 0) return GEN.placeValue();
    const v = d * 10 ** p, shown = s.split('').map((c, i) => i === s.length - 1 - p ? `<u>${c}</u>` : c).join('');
    const alt = [p - 1, p + 1, p - 2, p + 2].filter(k => k >= 0 && k !== p).map(k => d * 10 ** k);
    return { ask: '밑줄 친 숫자가 나타내는 값은?', scene: wrap(`<div class="num">${shown}</div>`), choices: nums(v, alt, { fmt: readKo }), answer: readKo(v), small: true,
             rule: [`${d}는 ${PLACE[p]}의 자리 숫자`, `→ ${mix(v)} (${readKo(v)})`], hint: '오른쪽부터 자리를 세어 봐요', sig: 'v' + n + p };
  },
  zeros() {
    const d = ri(1, 9), unit = pick([[4, '만'], [5, '십만'], [6, '백만'], [7, '천만'], [8, '억'], [12, '조']]), k = unit[0];
    return { ask: `<b>${KD[d]}${unit[1]}</b>${eul(unit[1])} 숫자로 쓰면 0 은 몇 개?`, scene: wrap(`<div class="num">${d}<span class="z">0…0</span></div>`),
             choices: nums(k, [k + 1, k - 1, k + 4, k - 4], { ok: v => v > 0 }), answer: String(k), cols: 4,
             rule: [`${KD[d]}${unit[1]} = ${d}${'0'.repeat(k)}`, '만은 0 이 4개, 억은 8개, 조는 12개'], hint: '만 = 10000 (0 이 4개). 억은 만의 만 배!', sig: 'z' + d + k };
  },
  skip(g) {
    const step = g.big ? pick([10 ** 8, 10 ** 9, 10 ** 12]) : pick([10000, 100000, 1000000, 10000000]), start = randNum(g.big ? 11 : 8, .4), seq = [0, 1, 2, 3, 4].map(i => start + step * i), hole = ri(1, 4);
    const shown = seq.map((v, i) => i === hole ? '<span class="q">?</span>' : mix(v)).join('<b>→</b>');
    return { ask: `<b>${mix(step)}</b>씩 뛰어 세었어요. ? 에 알맞은 수는?`, scene: wrap(`<div class="seq">${shown}</div>`),
             choices: nums(seq[hole], [seq[hole] + step / 10, seq[hole] + step * 10, seq[hole] - step / 10, seq[hole] + step].filter(v => v > 0), { fmt: mix }), answer: mix(seq[hole]), small: true,
             rule: [`${mix(step)}씩 커지면 ${PLACE[String(step).length - 1]}의 자리 숫자가 1씩 커져요`, `? = ${mix(seq[hole])}`], hint: `${PLACE[String(step).length - 1]}의 자리를 보세요`, sig: 'k' + start + step + hole };
  },
  skipStep() {
    const step = pick([10000, 100000, 1000000, 10000000, 100000000]), start = randNum(9, .4), seq = [0, 1, 2, 3].map(i => start + step * i);
    return { ask: '얼마씩 뛰어 세었을까요?', scene: wrap(`<div class="seq">${seq.map(mix).join('<b>→</b>')}</div>`),
             choices: nums(step, [step / 10, step * 10, step / 100].filter(v => v >= 1), { fmt: readKo }), answer: readKo(step), small: true,
             rule: [`${PLACE[String(step).length - 1]}의 자리 숫자가 1씩 커져요`, `→ ${readKo(step)}씩`], hint: '어느 자리 숫자가 바뀌는지 보세요', sig: 'p' + start + step };
  },
  compare() {
    const d = ri(7, 11), a = randNum(d, .2); let b;
    const k = ri(0, 2); b = k === 0 ? swapDigits(a) : k === 1 ? a + 10 ** ri(1, d - 3) * pick([1, -1]) : randNum(d + pick([0, 1, -1]), .2);
    if (a === b) return GEN.compare();
    const big = Math.max(a, b);
    return { ask: '더 큰 수는?', scene: wrap('<div class="emoji">⚖️</div>'), choices: [String(a), String(b)], answer: String(big), cols: 1, once: true,
             rule: [`${mix(a)}`, `${mix(b)}`, String(a).length !== String(b).length ? '자릿수가 많은 쪽이 더 커요' : '높은 자리부터 차례로 비교해요'], hint: '먼저 자릿수를 세고, 같으면 높은 자리부터 비교해요', sig: 'c' + a + b };
  },
  cards() {
    let ds; do { ds = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5); } while (!ds.includes(0) && Math.random() < .5);
    const big = Math.random() < .55, sorted = [...ds].sort((x, y) => big ? y - x : x - y);
    let ans = sorted.slice();
    if (!big && ans[0] === 0) { const i = ans.findIndex(x => x); [ans[0], ans[i]] = [ans[i], ans[0]]; }
    const A = +ans.join(''), wrong = [+sorted.join(''), swapDigits(A), +[...ans.slice(0, 3), ans[4], ans[3]].join('')].filter(v => v !== A && String(v).length === 5);
    const extra = big ? A - 10 ** ri(0, 3) * 1 : A + 10;
    return { ask: `숫자 카드를 한 번씩 써서 <b>가장 ${big ? '큰' : '작은'} 다섯 자리 수</b>를 만들면?`, scene: wrap(`<div class="cards">${ds.map(d => `<span>${d}</span>`).join('')}</div>`),
             choices: nums(A, [...wrong, extra], { ok: v => String(v).length === 5 && v !== A }), answer: String(A),
             rule: [big ? '큰 숫자부터 높은 자리에 놓아요' : '작은 숫자부터 높은 자리에, 단 0 은 맨 앞에 올 수 없어요', `→ ${A}`], hint: big ? '가장 큰 숫자를 만의 자리에!' : '0 은 만의 자리에 놓을 수 없어요', sig: 'a' + ds.join('') + big };
  }
};

Learn.run({ data: D, key: 'bignum', gen: GEN });
});
