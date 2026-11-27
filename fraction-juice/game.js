/* 분수 주스 가게 — 5학년 1학기 약분과 통분, 분수의 덧셈과 뺄셈
 * 공통 진행은 ../common/learn.js, 주스·이야기·단계는 data.json. 저장 키: fraction5Stars, fraction5StarTotal */
Arcade.boot(D => {
const { ri, pick, shuffle } = Learn.U, C = D.colors;
const wrap = s => `<div class="box">${s}</div>`;
const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a / gcd(a, b) * b;
const fr = (n, d) => `<span class="fr"><i>${n}</i><i>${d}</i></span>`;
// 값(분자 n / 분모 d, 가분수 가능) → 기약분수·대분수 표시
function show(n, d, simplify = true) {
  if (simplify) { const g = gcd(n, d); n /= g; d /= g; }
  if (d === 1) return { label: String(n), value: String(n) };
  const w = Math.floor(n / d), r = n % d;
  return w ? { label: `<span class="mx">${w}${fr(r, d)}</span>`, value: `${w} ${r}/${d}` } : { label: fr(n, d), value: `${n}/${d}` };
}
const raw = (n, d) => ({ label: fr(n, d), value: `${n}/${d}` });
const valOf = v => { const m = String(v).match(/^(?:(\d+) )?(\d+)\/(\d+)$/); return m ? ((+m[1] || 0) * +m[3] + +m[2]) / +m[3] : +v; };
const uniq = a => a.filter((x, i) => x && a.findIndex(y => y && (y.value === x.value || Math.abs(valOf(y.value) - valOf(x.value)) < 1e-9)) === i);
const properPair = (dmax = 12) => { for (;;) { const d1 = ri(2, dmax), d2 = ri(2, dmax); if (d1 === d2 || d1 % d2 === 0 && Math.random() < .5) continue; const n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1); if (gcd(n1, d1) > 1 || gcd(n2, d2) > 1) continue; return [n1, d1, n2, d2]; } };

/* ---------- 주스 컵 그림: 분모만큼 눈금, 분자만큼 채움 ---------- */
function cups(list) {   // list: [[n, d, colorIndex], …]
  const W = 92, H = 150; let s = '';
  list.forEach(([n, d, c], i) => {
    const x = 16 + i * (W + 30), whole = Math.floor(n / d), part = n % d;
    for (let k = 0; k <= whole && (k < whole || part); k++) {
      const xx = x + k * 18, fillN = k < whole ? d : part, h = H * fillN / d;
      s += `<rect x="${xx}" y="${20 + H - h}" width="${W}" height="${h}" fill="${C.juice[c % 4]}" opacity="${k ? .55 : .9}"/>`;
      for (let j = 1; j < d; j++) s += `<line x1="${xx}" y1="${20 + H * j / d}" x2="${xx + 14}" y2="${20 + H * j / d}" stroke="${C.edge}" stroke-width="1.5"/>`;
      s += `<path d="M${xx} 20 V${20 + H} H${xx + W} V20" fill="none" stroke="${C.edge}" stroke-width="3"/>`;
    }
  });
  const w = 32 + list.length * (W + 30) + 30;
  return `<svg viewBox="0 0 ${w} ${H + 34}" class="cups" role="img">${s}</svg>`;
}

const GEN = {
  equivPick() {
    const d = ri(2, 6), n = ri(1, d - 1), k = ri(2, 4), ans = raw(n * k, d * k);
    const wrong = [raw(n + k, d + k), raw(n * k, d + k), raw(n * k + 1, d * k), raw(n, d * k)];
    return { ask: `${fr(n, d)} 와 <b>크기가 같은</b> 분수는?`, scene: wrap(cups([[n, d, 0]])), choices: shuffle(uniq([ans, ...wrong]).slice(0, 4)), answer: ans.value,
             rule: [`분모와 분자에 같은 수 ${k}를 곱해요`, `${fr(n, d)} = ${fr(n * k, d * k)}`, '분모·분자에 같은 수를 더하면 크기가 달라져요'], hint: '분모와 분자에 똑같이 곱했는지 보세요', sig: 'e' + n + d + k };
  },
  equivFill() {
    const d = ri(2, 8), n = ri(1, d - 1), k = ri(2, 5), top = Math.random() < .5;
    const v = top ? n * k : d * k;
    return { ask: '□ 안에 알맞은 수는?', scene: wrap(`<div class="eq">${fr(n, d)} = ${top ? fr('□', d * k) : fr(n * k, '□')}</div>`), choices: shuffle([...new Set([v, top ? n + k : d + k, v + 1, top ? n * (k + 1) : d * (k + 1)])]).slice(0, 4).map(String), answer: String(v), cols: 4,
             rule: [`${top ? `분모 ${d} → ${d * k}` : `분자 ${n} → ${n * k}`}: ×${k}`, `${top ? '분자' : '분모'}도 ×${k} → ${v}`], hint: '분모(또는 분자)가 몇 배가 되었는지 먼저 봐요', sig: 'f' + n + d + k + top };
  },
  reduce() {
    const d0 = ri(2, 9), n0 = ri(1, d0 - 1); if (gcd(n0, d0) > 1) return GEN.reduce();
    const k = ri(2, 6), n = n0 * k, d = d0 * k, g = gcd(n, d), half = gcd(n, d) % 2 === 0 && g !== 2 ? raw(n / 2, d / 2) : null;
    return { ask: `${fr(n, d)} 를 <b>기약분수</b>로 나타내면?`, scene: wrap(`<div class="eq">${fr(n, d)}</div>`), choices: shuffle(uniq([raw(n0, d0), half, raw(n0 + 1, d0), raw(n0, d0 + 1), raw(d0 - n0 || 1, d0)]).slice(0, 4)), answer: `${n0}/${d0}`,
             rule: [`${n}와 ${d}의 최대공약수는 ${g}`, `${fr(n, d)} = ${fr(`${n}÷${g}`, `${d}÷${g}`)} = ${fr(n0, d0)}`], hint: '분모와 분자의 최대공약수로 나눠요', sig: 'r' + n + d };
  },
  isLowest() {
    const make = ok => { for (;;) { const d = ri(4, 24), n = ri(1, d - 1); if ((gcd(n, d) === 1) === ok) return raw(n, d); } };
    const ans = make(true), opts = shuffle([ans, make(false), make(false), make(false)]);
    if (new Set(opts.map(o => o.value)).size < 4) return GEN.isLowest();
    return { ask: '<b>기약분수</b>는 어느 것일까요?', scene: wrap('<div class="emo">🧃</div>'), choices: opts, answer: ans.value,
             rule: ['기약분수: 분모와 분자의 공약수가 1뿐인 분수', `${ans.label} 는 더 약분할 수 없어요`], hint: '분모와 분자를 둘 다 나눌 수 있는 수(1 말고)가 있는지 보세요', sig: 'l' + opts.map(o => o.value).join() };
  },
  common() {
    const [n1, d1, n2, d2] = properPair(10), L = lcm(d1, d2), P = d1 * d2;
    const ans = { label: `(${fr(n1 * L / d1, L)}, ${fr(n2 * L / d2, L)})`, value: `${n1 * L / d1}/${L},${n2 * L / d2}/${L}` };
    const prod = { label: `(${fr(n1 * d2, P)}, ${fr(n2 * d1, P)})`, value: `${n1 * d2}/${P},${n2 * d1}/${P}` };
    const bad1 = { label: `(${fr(n1, L)}, ${fr(n2, L)})`, value: `${n1}/${L},${n2}/${L}` }, bad2 = { label: `(${fr(n1 * L / d1 + 1, L)}, ${fr(n2 * L / d2, L)})`, value: `${n1 * L / d1 + 1}/${L},${n2 * L / d2}/${L}` };
    return { ask: `(${fr(n1, d1)}, ${fr(n2, d2)}) 를 <b>최소공배수를 공통분모</b>로 통분하면?`, scene: wrap(cups([[n1, d1, 0], [n2, d2, 1]])), choices: shuffle(uniq([ans, P !== L ? prod : null, bad1, bad2])), answer: ans.value, small: true, cols: 1,
             rule: [`${d1}와 ${d2}의 최소공배수 = ${L}`, `${fr(n1, d1)} = ${fr(n1 * L / d1, L)}, ${fr(n2, d2)} = ${fr(n2 * L / d2, L)}`, P !== L ? `(두 분모의 곱 ${P}로 통분해도 되지만, 수가 커져요)` : '두 분모의 곱과 최소공배수가 같아요'], hint: '분모의 최소공배수를 먼저 구해요', sig: 'c' + n1 + d1 + n2 + d2 };
  },
  compare() {
    let a; do { a = properPair(12); } while (a[0] * a[3] === a[2] * a[1]);
    const [n1, d1, n2, d2] = a, L = lcm(d1, d2), x = raw(n1, d1), y = raw(n2, d2), big = n1 * L / d1 > n2 * L / d2 ? x : y;
    return { ask: '더 많은 주스는?', scene: wrap(`<div class="eq">${fr(n1, d1)} <span class="vs">vs</span> ${fr(n2, d2)}</div>`), choices: [x, y], answer: big.value, once: true,
             onReveal: sc => { sc.innerHTML = wrap(cups([[n1, d1, 0], [n2, d2, 1]])); },
             rule: [`통분: ${fr(n1 * L / d1, L)} 와 ${fr(n2 * L / d2, L)}`, `분자가 큰 ${big.label} 가 더 커요`], hint: '분모를 같게 통분한 뒤 분자를 비교해요', sig: 'p' + n1 + d1 + n2 + d2 };
  },
  add(g) {
    const [n1, d1, n2, d2] = properPair(g.mixed ? 8 : 10), w1 = g.mixed ? ri(1, 3) : 0, w2 = g.mixed ? ri(1, 3) : 0, L = lcm(d1, d2);
    const A = (w1 * d1 + n1) * L / d1, B = (w2 * d2 + n2) * L / d2, ans = show(A + B, L);
    const lab = (w, n, d) => w ? `<span class="mx">${w}${fr(n, d)}</span>` : fr(n, d);
    const wrong = [show(n1 + n2 + (w1 + w2) * (d1 + d2), d1 + d2), show(A + B + L / Math.min(d1, d2), L), show(A + B + 2, L), show(A + B - 1, L)];
    return { ask: '계산해 보세요', scene: wrap(`<div class="eq">${lab(w1, n1, d1)} + ${lab(w2, n2, d2)}</div>`), choices: shuffle(uniq([ans, ...wrong]).slice(0, 4)), answer: ans.value,
             rule: [`통분: ${fr(n1 * L / d1, L)} + ${fr(n2 * L / d2, L)}${g.mixed ? `, 자연수 ${w1} + ${w2} = ${w1 + w2}` : ''}`, `= ${show(A + B, L, false).label}${show(A + B, L).value !== show(A + B, L, false).value ? ` = ${ans.label}` : ''}`, '분모끼리 더하면 안 돼요! 통분 후 분자끼리'], hint: '분모를 같게 통분하고 분자끼리 더해요. 마지막에 약분·대분수로!', sig: 'a' + w1 + n1 + d1 + w2 + n2 + d2 };
  },
  sub(g) {
    let n1, d1, n2, d2, w1 = 0, w2 = 0, L, A, B;
    for (;;) {
      [n1, d1, n2, d2] = properPair(g.mixed ? 8 : 10); L = lcm(d1, d2);
      if (g.mixed) { w1 = ri(2, 5); w2 = ri(1, w1 - 1); }
      const borrowNeeded = n1 * L / d1 < n2 * L / d2;
      if (!g.mixed && borrowNeeded) continue;
      if (g.mixed && !!g.borrow !== borrowNeeded) continue;
      A = (w1 * d1 + n1) * L / d1; B = (w2 * d2 + n2) * L / d2; if (A > B) break;
    }
    const ans = show(A - B, L), lab = (w, n, d) => w ? `<span class="mx">${w}${fr(n, d)}</span>` : fr(n, d);
    const wrong = [show(Math.abs(n1 - n2) + (w1 - w2) * Math.abs(d1 - d2 || 1), Math.abs(d1 - d2) || 1), show(A - B + L, L), show(A - B + 1, L), show(Math.abs(n1 * L / d1 - n2 * L / d2) + (w1 - w2) * L, L)];
    return { ask: '계산해 보세요', scene: wrap(`<div class="eq">${lab(w1, n1, d1)} − ${lab(w2, n2, d2)}</div>`), choices: shuffle(uniq([ans, ...wrong]).slice(0, 4)), answer: ans.value,
             rule: [`통분: ${lab(w1, n1 * L / d1, L)} − ${lab(w2, n2 * L / d2, L)}`, ...(g.borrow ? [`분수끼리 뺄 수 없으면 자연수에서 1 을 받아내려요: ${lab(w1 - 1, n1 * L / d1 + L, L)}`] : []), `= ${ans.label}`], hint: g.borrow ? '빼는 분수가 더 크면 자연수 1 을 분수로 바꿔요' : '통분하고 분자끼리 빼요', sig: 's' + w1 + n1 + d1 + w2 + n2 + d2 };
  },
  story() {
    const s = pick(D.stories), [j1, e1] = pick(D.juices), [j2] = pick(D.juices.filter(j => j[0] !== j1));
    const q = s.op === '+' ? GEN.add({ mixed: Math.random() < .4 }) : GEN.sub({ mixed: Math.random() < .5 });
    const parts = q.scene.match(/<div class="eq">(.*) [+−] (.*)<\/div>/);
    q.ask = s.t.replace('{j1}', j1).replace('{j2}', j2).replace('{a}', parts[1]).replace('{b}', parts[2]);
    q.scene = wrap(`<div class="emo">${e1}</div>`); q.small = true; q.sig = 'y' + q.sig;
    q.rule = [`식: ${parts[1]} ${s.op === '+' ? '+' : '−'} ${parts[2]}`, ...q.rule];
    return q;
  }
};

Learn.run({ data: D, key: 'fraction5', gen: GEN });
});
